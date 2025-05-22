import { executeQueryFn } from "./utils/executeQuery.js";
import { dbOperationsFn } from "./utils/dbOperations.js";
import { queryAndWriteFn } from "./utils/queryAndWriteToDb.js";
import { updateJobLogfn } from "./utils/updateJobLog.js";
import enrichTransactionHistoryFn from "./utils/enrichTransactionHistory.js";
import { GET_TX_HISTORY_QUERY } from "./queries/getTxHistory.js";
import { createSnapshotBeforeWriteFn, pruneSnapshotsFn, restoreFromLatestSnapshotFn } from "./utils/bqSnapshotUtils.js";
import { validateTimestampsAcrossTablesFn } from "./utils/validateTimestamps.js";

import config from "./config.js";
import logger from "./utils/logger.js";

// Guard: only run under TRANSACTIONS mode
if (config.PIPELINE_TARGET !== "TRANSACTIONS") {
	console.error("→ Wrong pipeline target; expected TRANSACTIONS");
	process.exit(1);
}

async function getTxHistoryFn(startTime, endTime, limit, offset) {
	// Fetch account IDs from new_accounts table to pass to the activity query
	const bigquery = new (await import("@google-cloud/bigquery")).BigQuery({
		projectId: config.PROJECT_ID,
		// keyFilename: "./keys/bq-key.json",
	});
	const [rows] = await bigquery.dataset(config.DATASET_ID).table(config.TABLES.NEW_ACCOUNTS).getRows(); // Get rows from the new_accounts table
	const accountIds = [...new Set(rows.map((row) => row.entity_id))]; // Get unique account IDs from the new_accounts table

	if (accountIds.length === 0) {
		logger.warn("⚠️ No account IDs found for transaction history query.");
		return [];
	}

	const variables = { startTime, endTime, limit, offset, accountIds };
	const data = await executeQueryFn(GET_TX_HISTORY_QUERY, variables);
	return data.transaction || [];
}

// Accounts are provided by the daily accounts job in the `new_accounts` table
async function main() {
        logger.info(`🚀 Starting transactions pipeline\n`);
	const tablesForPipeline = [config.TABLES.TX_HISTORY, config.TABLES.JOB_LOG];

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

		// Step 2: Paginated fetch + enrich + write of transaction history
		const countTxAdded = await queryAndWriteFn(getTxHistoryFn, config.TABLES.TX_HISTORY, startTime, endTime, enrichTransactionHistoryFn);
		logger.success(`✅ Transaction history written to BigQuery\n`);

		// Step 3: Validate timestamp ranges across tables if not initial pull
		if (!isInitial) {
			const isValid = await validateTimestampsAcrossTablesFn(endTime);
			if (!isValid) {
				throw new Error("Timestamp validation failed. One or more tables contain data outside known job ranges.");
			}
		}

		// Step 4: Log the job run
		await updateJobLogfn({ startTime, endTime, status: "success", count_txs_added: countTxAdded });
		logger.info(`📒 Job log updated (Transactions added: ${countTxAdded})\n`);

		// Step 5: Prune old BigQuery table snapshots if not initial pull
		if (!isInitial) {
			for (const table of tablesForPipeline) {
				await pruneSnapshotsFn(table);
			}
		}

		logger.success(`🎉 Transactions pipeline complete`);
	} catch (err) {
		logger.error(`❌ Transactions pipeline failed: ${err.message}`);

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
