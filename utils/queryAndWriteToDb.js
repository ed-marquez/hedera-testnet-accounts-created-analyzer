import { BigQuery } from "@google-cloud/bigquery";
import config from "../config.js";
import logger from "./logger.js";

const bigquery = new BigQuery({
	projectId: config.PROJECT_ID,
	keyFilename: "./keys/bq-key.json",
});

/**
 * Writes a batch of data to BigQuery
 */
async function writeToBigQueryFn(table, data) {
	try {
		if (!data || data.length === 0) {
			logger.warn("No data to write to BigQuery");
			return 0;
		}

		await table.insert(data);
		logger.success(`✅ Inserted ${data.length} rows`);
		return data.length;
	} catch (error) {
		logger.error(`Failed to write to BigQuery: ${error.message}`);
		throw error;
	}
}

/**
 * Enriches a batch of data using the provided enrichment function
 */
async function enrichBatchFn(batch, enrichFn) {
	if (!enrichFn) return batch;

	logger.info("🧠 Enriching batch...");
	const enrichedBatch = await enrichFn(batch);
	logger.debug(`Enriched ${enrichedBatch.length} records`);
	return enrichedBatch;
}

/**
 * Fetches a single page of data using the provided query function
 */
async function fetchPageFn(queryFn, startTime, endTime, limit, offset) {
	logger.info(`📦 Fetching page (limit=${limit}, offset=${offset})...`);
	const batch = await queryFn(startTime, endTime, limit, offset);

	if (!batch || batch.length === 0) {
		logger.info("✅ No more results.");
		return null;
	}

	logger.debug(`Retrieved ${batch.length} records`);
	return batch;
}

/**
 * Run a GraphQL query in paginated batches and write the results to BigQuery.
 */
export async function queryAndWriteFn(queryFn, targetTable, startTime, endTime, enrichFn = null) {
	const dataset = bigquery.dataset(config.DATASET_ID);
	const table = dataset.table(targetTable);

	let offset = config.OFFSET;
	const limit = config.PAGE_SIZE;
	let totalInserted = 0;
	let page = 1;

	logger.info(`📡 Starting data pipeline for table: ${targetTable}`);
	logger.info(`Time window: ${startTime} → ${endTime}`);

	try {
		let hasMoreData = true;
		while (hasMoreData) {
			const batch = await fetchPageFn(queryFn, startTime, endTime, limit, offset);
			if (!batch || batch.length === 0) {
				hasMoreData = false;
				continue;
			}

			const enrichedBatch = await enrichBatchFn(batch, enrichFn);
			const inserted = await writeToBigQueryFn(table, enrichedBatch);
			totalInserted += inserted;

			offset += limit;
			page++;
		}

		logger.info(`🎯 Pipeline complete. Total rows inserted: ${totalInserted}`);
		return totalInserted;
	} catch (error) {
		logger.error(`❌ Pipeline failed: ${error.message}`);
		throw error;
	}
}
