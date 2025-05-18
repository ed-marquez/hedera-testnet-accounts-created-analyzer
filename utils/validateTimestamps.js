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
			MIN(CAST(start_time_ns AS INT64)) as min_ts
		FROM \`${config.PROJECT_ID}.${config.DATASET_ID}.${config.TABLES.JOB_LOG}\`
		WHERE status = 'success'
	`;
	const [job] = await bigquery.createQueryJob({ query });
	const [rows] = await job.getQueryResults();
	return rows[0];
}

export async function validateTimestampsAcrossTablesFn(currentJobEndtimeStr) {
	logger.info("🔍 Validating timestamp range for pipeline…");

	// Determine which data table to check based on the pipeline target
	const tableToCheck = config.PIPELINE_TARGET === "ACCOUNTS" ? config.TABLES.NEW_ACCOUNTS : config.TABLES.TX_HISTORY;

	// 1️⃣ Fetch the last successful job’s start_time_ns
	const jobRange = await getJobLogSuccessRange();
	if (!jobRange.min_ts || !currentJobEndtimeStr) {
		logger.warn("⚠️ No successful jobs found to validate against.");
		return true;
	}
	const jobMinTs = BigInt(jobRange.min_ts);
	const jobEndTs = BigInt(currentJobEndtimeStr);

	let isValid = true;

	// 2️⃣ Fetch the min/max consensus_timestamp from the data table
	const tableRange = await getTableTimestampRange(tableToCheck);
	if (!tableRange?.min_ts || !tableRange?.max_ts) {
		logger.warn(`⚠️ No rows found in ${tableToCheck} to validate.`);
		return true;
	}
	const tableMinTs = BigInt(tableRange.min_ts);
	const tableMaxTs = BigInt(tableRange.max_ts);

	// 3️⃣ Assert that the table’s timestamps fall within [jobMinTs, jobEndTs]
	if (tableMinTs < jobMinTs || tableMaxTs > jobEndTs) {
		logger.error(
			`❌ Timestamp out of bounds in '${tableToCheck}': [${tableRange.min_ts}, ${tableRange.max_ts}] vs [${jobRange.min_ts}, ${currentJobEndtimeStr}]`
		);
		isValid = false;
	} else {
		logger.success(`✅ '${tableToCheck}' timestamps are valid: [${tableRange.min_ts}, ${tableRange.max_ts}]`);
	}

	return isValid;
}
