import { executeQueryFn } from "./utils/executeQuery.js";
import { dbOperationsFn } from "./utils/dbOperations.js";
import { queryAndWriteFn } from "./utils/queryAndWriteToDb.js";
import { updateJobLogfn } from "./utils/updateJobLog.js";
import enrichNewAccountsFn from "./utils/enrichNewAccounts.js";
import enrichTransactionHistoryFn from "./utils/enrichTransactionHistory.js";
import { GET_ACCOUNTS_QUERY } from "./queries/getNewAccounts.js";
import { GET_TX_HISTORY_QUERY } from "./queries/getTxHistory.js";
import config from "./config.js";
import logger from "./utils/logger.js";

async function getNewAccountsFn(startTime, endTime, limit, offset) {
	const variables = { startTime, endTime }; // No pagination needed for this query
	const data = await executeQueryFn(GET_ACCOUNTS_QUERY, variables);
	return data.transaction || [];
}

async function getTxHistoryFn(startTime, endTime, limit, offset) {
	// Fetch account IDs from new_accounts table to pass to the activity query
	const bigquery = new (await import("@google-cloud/bigquery")).BigQuery({
		projectId: config.PROJECT_ID,
		keyFilename: "./keys/bq-key.json",
	});
	const [rows] = await bigquery.dataset(config.DATASET_ID).table(config.TABLES.NEW_ACCOUNTS).getRows();
	const accountIds = [...new Set(rows.map((row) => row.entity_id))];

	if (accountIds.length === 0) {
		logger.warn("⚠️ No account IDs found for transaction history query.");
		return [];
	}

	const variables = { startTime, endTime, limit, offset, accountIds };
	const data = await executeQueryFn(GET_TX_HISTORY_QUERY, variables);
	return data.transaction || [];
}

async function main() {
	logger.info("🚀 Starting Hedera data pipeline");

	const { startTime, endTime, isInitial } = await dbOperationsFn();
	logger.info(`📅 Time Window: ${startTime} → ${endTime} | Initial Pull: ${isInitial}`);

	// Step 1: Get and enrich new accounts
	const rawAccounts = await getNewAccountsFn(startTime, endTime);
	const enrichedAccounts = await enrichNewAccountsFn(rawAccounts, startTime, endTime);

	// Write enriched accounts to BigQuery
	const dataset = new (await import("@google-cloud/bigquery")).BigQuery({
		projectId: config.PROJECT_ID,
		keyFilename: "./keys/bq-key.json",
	}).dataset(config.DATASET_ID);

	await dataset.table(config.TABLES.NEW_ACCOUNTS).insert(enrichedAccounts);
	logger.success("✅ New accounts written to BigQuery");

	// Step 2: Get and enrich transaction history with pagination
	await queryAndWriteFn(getTxHistoryFn, config.TABLES.TX_HISTORY, startTime, endTime, enrichTransactionHistoryFn);
	logger.success("✅ Transaction history written to BigQuery");

	// Step 3: Log the job run
	await updateJobLogfn({ startTime, endTime, status: "success" });
	logger.info("📒 Job log updated");

	logger.success("🎉 ETL job complete");
}

main().catch((err) => {
	logger.error(`❌ Job failed: ${err.message}`);
	process.exit(1);
});
