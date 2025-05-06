import { BigQuery } from "@google-cloud/bigquery";
import { v4 as uuidv4 } from "uuid";
import config from "../config.js";
import logger from "./logger.js";

const bigquery = new BigQuery({
	projectId: config.PROJECT_ID,
	// keyFilename: "./keys/bq-key.json",
});

/**
 * Logs a job run to the BigQuery job_log table.
 *
 * @param {Object} params
 * @param {String} params.startTime - UNIX timestamp in nanoseconds (as string)
 * @param {String} params.endTime - UNIX timestamp in nanoseconds (as string)
 * @param {String} params.status - "success" | "error" | etc.
 * @param {String} [params.message] - Optional error or info message
 * @param {Number} [params.count_accounts_added] - Number of accounts added
 * @param {Number} [params.count_txs_added] - Number of transactions added
 */
export async function updateJobLogfn({ startTime, endTime, status, message = null, count_accounts_added = null, count_txs_added = null }) {
	const dataset = bigquery.dataset(config.DATASET_ID);
	const table = dataset.table(config.TABLES.JOB_LOG);

	const now = new Date();
	const jobId = uuidv4(); // Generate Job ID once

	// Handle potential BigInt conversion errors gracefully
	let startTimeIso = null;
	let endTimeIso = null;
	try {
		if (startTime) startTimeIso = new Date(Number(BigInt(startTime) / 1_000_000n));
		if (endTime) endTimeIso = new Date(Number(BigInt(endTime) / 1_000_000n));
	} catch (e) {
		logger.warn(`⚠️ Could not convert start/end timestamps to ISO for job log entry ${jobId}: ${e.message}`);
	}

	const row = {
		job_id: jobId,
		start_time_ns: startTime,
		end_time_ns: endTime,
		start_time_iso: startTimeIso,
		end_time_iso: endTimeIso,
		status,
		message,
		count_accounts_added,
		count_txs_added,
		logged_at: now,
	};

	try {
		await table.insert([row]);
		logger.info(`📒 Job log updated (status: ${status}, job_id: ${jobId})`);
	} catch (error) {
		logger.error(`❌ Failed to update job log (job_id: ${jobId}): ${error.message}`);
		if (error.errors) {
			logger.error("   BigQuery Insert Errors:", JSON.stringify(error.errors, null, 2));
		}
	}
}
