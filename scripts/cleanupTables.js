// scripts/cleanupTables.js

import { BigQuery } from "@google-cloud/bigquery";
import config from "../config.js";
import logger from "../utils/logger.js";

const bigquery = new BigQuery({
	projectId: config.PROJECT_ID,
	keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS || "./keys/bq-key.json",
});

const tables = [config.TABLES.NEW_ACCOUNTS, config.TABLES.TX_HISTORY, config.TABLES.JOB_LOG];

async function deleteTableData(tableName) {
	const query = `DELETE FROM \`${config.PROJECT_ID}.${config.DATASET_ID}.${tableName}\` WHERE 1=1`;

	try {
		logger.info(`🧹 Deleting data from table: ${tableName}`);

		// Execute delete query
		const [job] = await bigquery.createQueryJob({ query });

		// Wait for the job to complete
		await job.getQueryResults();

		// Verify the table is empty
		const [countJob] = await bigquery.createQueryJob({
			query: `SELECT COUNT(*) as count FROM \`${config.PROJECT_ID}.${config.DATASET_ID}.${tableName}\``,
		});
		const [countRows] = await countJob.getQueryResults();

		if (countRows[0].count === 0) {
			logger.success(`✅ Table '${tableName}' cleaned successfully`);
		} else {
			throw new Error(`Table still contains ${countRows[0].count} rows after delete`);
		}
	} catch (err) {
		logger.error(`❌ Failed to clean '${tableName}': ${err.message}`);
		throw err; // Re-throw to stop the process
	}
}

async function runCleanup() {
	try {
		logger.info("🚧 Starting table cleanup...");

		// Verify BigQuery connection
		const [datasets] = await bigquery.getDatasets();
		const datasetExists = datasets.some((ds) => ds.id === config.DATASET_ID);

		if (!datasetExists) {
			throw new Error(`Dataset '${config.DATASET_ID}' not found`);
		}

		// Clean each table
		for (const table of tables) {
			await deleteTableData(table);
		}

		// Final verification
		for (const table of tables) {
			const [countJob] = await bigquery.createQueryJob({
				query: `SELECT COUNT(*) as count FROM \`${config.PROJECT_ID}.${config.DATASET_ID}.${table}\``,
			});
			const [countRows] = await countJob.getQueryResults();
			if (countRows[0].count > 0) {
				throw new Error(`Table '${table}' still contains ${countRows[0].count} rows after cleanup`);
			}
		}

		logger.success("🎉 All tables cleaned successfully.");
	} catch (err) {
		logger.error(`❌ Cleanup failed: ${err.message}`);
		process.exit(1);
	}
}

// Run the cleanup
runCleanup();
