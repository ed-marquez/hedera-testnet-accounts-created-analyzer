import { executeQueryFn } from "./utils/executeQuery.js";
import { dbOperationsFn } from "./utils/dbOperations.js";
import { queryAndWriteFn } from "./utils/queryAndWriteToDb.js";
import { updateJobLogfn } from "./utils/updateJobLog.js";
import enrichNewAccountsFn from "./utils/enrichNewAccounts.js";
import { GET_ACCOUNTS_QUERY } from "./queries/getNewAccounts.js";
import { createSnapshotBeforeWriteFn, pruneSnapshotsFn, restoreFromLatestSnapshotFn } from "./utils/bqSnapshotUtils.js";
import { validateTimestampsAcrossTablesFn } from "./utils/validateTimestamps.js";

import config from "./config.js";
import logger from "./utils/logger.js";

// Guard: only run under ACCOUNTS mode
if (config.PIPELINE_TARGET !== "ACCOUNTS") {
	console.error("→ Wrong pipeline target; expected ACCOUNTS");
	process.exit(1);
}

async function getNewAccountsFn(startTime, endTime, limit, offset) {
	const variables = { startTime, endTime, limit, offset };
	const data = await executeQueryFn(GET_ACCOUNTS_QUERY, variables);
	return data.transaction || [];
}

async function main() {
	logger.info(`🚀 Starting Hedera data pipeline\n`);
	const tablesForPipeline = [config.TABLES.NEW_ACCOUNTS, config.TABLES.JOB_LOG];

	const { startTime, endTime, isInitial } = await dbOperationsFn();

	// Convert timestamps to formatted date strings
	const startDateFormatted = new Date(Number(BigInt(startTime) / 1_000_000n)).toDateString();
	const endDateFormatted = new Date(Number(BigInt(endTime) / 1_000_000n)).toDateString();
	console.log(`\n`);
	logger.info(`📅 Dates Window: ${startDateFormatted} → ${endDateFormatted}`);
	logger.info(`⏰ Timestamps Window: ${startTime} → ${endTime}`);
	logger.info(`1️⃣ Is Initial Pull: ${isInitial}`);
	console.log(`\n`);

	let snapshotRowDetails = {};

	try {
		// Step 0: Create pre-job snapshots if not initial pull
		if (!isInitial) {
			// Create snapshots for all tables
			for (const table of tablesForPipeline) {
				const { baseRowCount, snapshotRowCount } = await createSnapshotBeforeWriteFn(table);
				snapshotRowDetails[table] = { baseRowCount, snapshotRowCount };
			}
			// Check for mismatched row counts between base table and snapshot
			const mismatched = Object.entries(snapshotRowDetails)
				.filter(([tbl, counts]) => tbl !== config.TABLES.JOB_LOG && counts.baseRowCount !== counts.snapshotRowCount)
				.map(([tbl]) => tbl);
			if (mismatched.length) {
				logger.error(`❌ Aborting job: row count mismatch in base table & snapshot(s) for ${mismatched.join(", ")}`);
				process.exit(1);
			}
		} else {
			logger.info("ℹ️ Initial run detected; skipping snapshots");
		}
		console.log(`\n`);

		// Step 1: Paginated fetch + enrich + write of new accounts
		const countNewAccountsAdded = await queryAndWriteFn(getNewAccountsFn, config.TABLES.NEW_ACCOUNTS, startTime, endTime, (batch) =>
			enrichNewAccountsFn(batch, startTime, endTime)
		);
		logger.success(`✅ New accounts written to BigQuery\n`);

		// Step 3: Validate timestamp ranges across tables if not initial pull
		if (!isInitial) {
			const isValid = await validateTimestampsAcrossTablesFn(endTime);
			if (!isValid) {
				throw new Error("Timestamp validation failed. One or more tables contain data outside known job ranges.");
			}
		}

		// Step 4: Log the job run
		await updateJobLogfn({ startTime, endTime, status: "success", count_accounts_added: countNewAccountsAdded });
		logger.info(`📒 Job log updated (Accounts added: ${countNewAccountsAdded}\n`);

		// Step 5: Prune old BigQuery table snapshots if not initial pull
		if (!isInitial) {
			for (const table of tablesForPipeline) {
				await pruneSnapshotsFn(table);
			}
		}

		logger.success(`🎉 Accounts pipeline complete`);
	} catch (err) {
		logger.error(`❌ Accounts pipeline failed: ${err.message}`);

		// Restore tables (excluding job_log) from most recent snapshot if not initial pull
		if (!isInitial) {
			const tablesToRestore = tablesForPipeline.filter(
				(tableName) =>
					tableName !== config.TABLES.JOB_LOG &&
					snapshotRowDetails[tableName] &&
					snapshotRowDetails[tableName].baseRowCount === snapshotRowDetails[tableName].snapshotRowCount
			);
			for (const table of tablesToRestore) {
				await restoreFromLatestSnapshotFn(table);
			}
			// Warn for tables not restored
			const notRestored = tablesForPipeline.filter(
				(tableName) =>
					tableName !== config.TABLES.JOB_LOG &&
					(!snapshotRowDetails[tableName] || snapshotRowDetails[tableName].baseRowCount !== snapshotRowDetails[tableName].snapshotRowCount)
			);
			for (const table of notRestored) {
				logger.warn(`⚠️ Skipped restoring ${table} due to row count mismatch between base and snapshot.`);
			}
		}
		// Log failure
		await updateJobLogfn({ startTime, endTime, status: "error", message: err.message });

		process.exit(1);
	}
}

main().catch((err) => {
	logger.error(`❌ Job failed: ${err.message}`);
	process.exit(1);
});
