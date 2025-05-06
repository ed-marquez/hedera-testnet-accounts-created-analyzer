import { BigQuery } from "@google-cloud/bigquery";
import config from "../config.js";
import newAccountsSchema from "../schemas/newAccountsSchema.js";
import txHistorySchema from "../schemas/txHistorySchema.js";
import jobLogSchema from "../schemas/jobLogSchema.js";
import logger from "./logger.js";

const bigquery = new BigQuery({
	projectId: config.PROJECT_ID,
	// keyFilename: "./keys/bq-key.json",
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

		const newTable = dataset.table(tableName);
		await waitForTableAvailability(newTable); // wait until table is available

		if (newTable) {
			logger.success(`✅ Table '${tableName}' created and ready`);
		} else {
			logger.error(`❌ Failed to create table '${tableName}'`);
		}
		return newTable;
	} else {
		logger.info(`📂 Table '${tableName}' already exists — skipping creation`);
	}
}

async function waitForTableAvailability(table, retries = 5, delayMs = 1000) {
	for (let i = 0; i < retries; i++) {
		try {
			const [metadata] = await table.getMetadata();
			if (metadata && metadata.tableReference) {
				return true;
			}
		} catch (err) {
			if (err.code === 404) {
				logger.info(`⏳ Waiting for table '${table.id}' to become available (attempt ${i + 1}/${retries})...`);
				await new Promise((res) => setTimeout(res, delayMs));
			} else {
				throw err; // other error, rethrow
			}
		}
	}
	throw new Error(`Timeout: Table '${table.id}' did not become available.`);
}

/**
 * Returns the latest successful job's `end_time_ns` from the job_log table
 * or null if this is the first run.
 */
async function getLastSuccessfulJobTimestampNs() {
	const query = `
		SELECT end_time_ns
		FROM \`${config.PROJECT_ID}.${config.DATASET_ID}.${config.TABLES.JOB_LOG}\`
		WHERE status = 'success'
		ORDER BY end_time_ns DESC
		LIMIT 1
	`;

	try {
		const [job] = await bigquery.createQueryJob({ query });
		const [rows] = await job.getQueryResults();

		if (rows.length === 0) {
			return null;
		}

		return rows[0].end_time_ns;
	} catch (err) {
		logger.warn("⚠️ Failed to query job_log for last successful job.");
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
	await new Promise((resolve) => setTimeout(resolve, 5000)); // A few seconds delay

	let startTime;
	let isInitial = false;

	const lastJobEndTime = await getLastSuccessfulJobTimestampNs();

	if (!lastJobEndTime) {
		isInitial = true;
		startTime = config.INITIAL_START_TIMESTAMP;
		logger.info(`🕒 No previous job found. Using default start: ${startTime}`);
	} else {
		startTime = lastJobEndTime;
		logger.info(`🕒 Resuming from last end time: ${startTime}`);
	}
	// Calculate the end time for the new job
	const endTime = (BigInt(startTime) + BigInt(config.WINDOW_SIZE_NS)).toString();

	// Cap endTime at the current time (in nanoseconds)
	const nowNs = config.getCurrentUnixTimestampNs ? config.getCurrentUnixTimestampNs() : (BigInt(Date.now()) * 1_000_000n).toString();
	if (BigInt(endTime) > BigInt(nowNs)) {
		logger.info(`⏳ Capping endTime to current time: ${nowNs}`);
		endTime = nowNs;
	}
	return {
		startTime,
		endTime,
		isInitial,
	};
}
