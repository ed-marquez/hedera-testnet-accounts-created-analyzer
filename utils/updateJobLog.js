import { BigQuery } from "@google-cloud/bigquery";
import { v4 as uuidv4 } from "uuid";
import config from "../config.js";
import logger from "./logger.js";

const bigquery = new BigQuery({
	projectId: config.PROJECT_ID,
	keyFilename: "./keys/bq-key.json",
});

/**
 * Logs a job run to the BigQuery job_log table.
 *
 * @param {Object} params
 * @param {String} params.startTime - UNIX timestamp in nanoseconds (as string)
 * @param {String} params.endTime - UNIX timestamp in nanoseconds (as string)
 * @param {String} params.status - "success" | "error" | etc.
 * @param {String} [params.message] - Optional error or info message
 */
export async function updateJobLogfn({ startTime, endTime, status, message = null }) {
	const dataset = bigquery.dataset(config.DATASET_ID);
	const table = dataset.table(config.TABLES.JOB_LOG);

	const now = new Date();

	const row = {
		job_id: uuidv4(),
		start_time_ns: startTime,
		end_time_ns: endTime,
		start_time_iso: new Date(Number(startTime) / 1_000_000),
		end_time_iso: new Date(Number(endTime) / 1_000_000),
		status,
		message,
		logged_at: now,
	};

	try {
		await table.insert([row]);
		logger.success(`📒 Job log updated (status: ${status})`);
	} catch (error) {
		logger.error(`❌ Failed to update job log: ${error.message}`);
	}
}
