import { BigQuery } from "@google-cloud/bigquery";
import config from "../config.js";
import logger from "./logger.js";

const bigquery = new BigQuery({
	projectId: config.PROJECT_ID,
	// keyFilename: "./keys/bq-key.json",
});

async function getTableTimestampRange(tableName) {
	const query = `
		SELECT
			MIN(CAST(consensus_timestamp AS INT64)) as min_ts,
			MAX(CAST(consensus_timestamp AS INT64)) as max_ts
		FROM \`${config.PROJECT_ID}.${config.DATASET_ID}.${tableName}\`
	`;
	const [job] = await bigquery.createQueryJob({ query });
	const [rows] = await job.getQueryResults();
	return rows[0];
}

// MAX(CAST(end_time_ns AS INT64)) as max_ts
async function getJobLogSuccessRange() {
	const query = `
		SELECT
			MIN(CAST(start_time_ns AS INT64)) as min_ts,
		FROM \`${config.PROJECT_ID}.${config.DATASET_ID}.${config.TABLES.JOB_LOG}\`
		WHERE status = 'success'
	`;
	const [job] = await bigquery.createQueryJob({ query });
	const [rows] = await job.getQueryResults();
	return rows[0];
}

export async function validateTimestampsAcrossTablesFn(currentJobEndtimeStr) {
	logger.info("🔍 Validating timestamp ranges in cumulative tables...");

	const jobRange = await getJobLogSuccessRange();
	if (!jobRange.min_ts || !currentJobEndtimeStr) {
		logger.warn("⚠️ No successful jobs found to validate against.");
		return true;
	}
	const jobRangeMinTs = BigInt(jobRange.min_ts);
	const currentJobEndtimeBigInt = BigInt(currentJobEndtimeStr);

	const tables = [config.TABLES.NEW_ACCOUNTS, config.TABLES.TX_HISTORY];
	let isValid = true;

	for (const table of tables) {
		const tableRange = await getTableTimestampRange(table);
		const tableRangeMinTs = BigInt(tableRange.min_ts);
		const tableRangeMaxTs = BigInt(tableRange.max_ts);

		if (tableRangeMinTs < jobRangeMinTs || tableRangeMaxTs > currentJobEndtimeBigInt) {
			logger.error(
				`❌ Timestamp out of bounds in '${table}': [${tableRange.min_ts}, ${tableRange.max_ts}] vs [${jobRange.min_ts}, ${currentJobEndtimeBigInt}]`
			);
			isValid = false;
		} else {
			logger.success(`✅ '${table}' timestamps are valid: [${tableRange.min_ts}, ${tableRange.max_ts}]`);
		}
	}

	return isValid;
}
