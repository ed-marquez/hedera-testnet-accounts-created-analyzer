import { BigQuery } from "@google-cloud/bigquery";
import config from "../config.js";
import newAccountsSchema from "../schemas/newAccountsSchema.js";
import txHistorySchema from "../schemas/txHistorySchema.js";
import jobLogSchema from "../schemas/jobLogSchema.js";
import logger from "./logger.js";

const bigquery = new BigQuery({
	projectId: config.PROJECT_ID,
	keyFilename: "./keys/bq-key.json",
});

async function ensureDataset() {
	const [datasets] = await bigquery.getDatasets();
	const exists = datasets.some((ds) => ds.id === config.DATASET_ID);

	if (!exists) {
		logger.info(`📁 Creating dataset '${config.DATASET_ID}'...`);
		await bigquery.createDataset(config.DATASET_ID, { location: config.BQ_LOCATION });
	}
}

async function ensureTable(tableName, schema) {
	const dataset = bigquery.dataset(config.DATASET_ID);
	const [tables] = await dataset.getTables();
	const exists = tables.some((t) => t.id === tableName);

	if (!exists) {
		logger.info(`📄 Creating table '${tableName}'...`);
		await dataset.createTable(tableName, { schema });
	}
}

/**
 * Returns the latest `end_time_ns` from the job_log table
 * or null if this is the first run.
 */
async function getLastJobTimestampNs() {
	const table = bigquery.dataset(config.DATASET_ID).table(config.TABLES.JOB_LOG);

	try {
		const [rows] = await table.getRows({
			maxResults: 1,
			orderBy: "end_time_ns desc",
		});

		return rows[0]?.end_time_ns || null;
	} catch (err) {
		logger.warn("⚠️ Unable to query job log table. Assuming initial run.");
		return null;
	}
}

/**
 * Ensures the BigQuery dataset and tables exist,
 * then returns time window and run type (initial vs subsequent).
 */
export async function dbOperationsFn() {
	logger.info("🔧 Verifying BigQuery dataset and tables...");

	await ensureDataset();

	await Promise.all([
		await ensureTable(config.TABLES.NEW_ACCOUNTS, newAccountsSchema),
		await ensureTable(config.TABLES.TX_HISTORY, txHistorySchema),
		await ensureTable(config.TABLES.JOB_LOG, jobLogSchema),
	]);

	// Add a short delay to allow BigQuery to stabilize after potential table creation
	logger.info("⏳ Allowing BigQuery a moment to prepare tables...");
	await new Promise((resolve) => setTimeout(resolve, 5000)); // 5-second delay

	const endTime = config.DEFAULT_END_TIMESTAMP();

	let startTime;
	let isInitial = false;

	const lastEndTime = await getLastJobTimestampNs();
	if (!lastEndTime) {
		startTime = config.INITIAL_START_TIMESTAMP;
		isInitial = true;
		logger.info(`🕒 No previous job found. Using default start: ${startTime}`);
	} else {
		startTime = lastEndTime;
		logger.info(`🕒 Resuming from last end time: ${startTime}`);
	}

	logger.info(`📅 Time window: ${startTime} → ${endTime}`);

	return {
		startTime,
		endTime,
		isInitial,
	};
}
