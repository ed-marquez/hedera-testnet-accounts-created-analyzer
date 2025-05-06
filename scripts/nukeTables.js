// scripts/cleanupTables.js

import { BigQuery } from "@google-cloud/bigquery";
import readline from "readline";
import config from "../config.js";
import logger from "../utils/logger.js";

const bigquery = new BigQuery({
	projectId: config.PROJECT_ID,
	// keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS || "./keys/bq-key.json",
});

const tablesToDelete = [config.TABLES.NEW_ACCOUNTS, config.TABLES.TX_HISTORY, config.TABLES.JOB_LOG];

// Create interface for user confirmation
const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
});

async function deleteTable(tableName) {
	const dataset = bigquery.dataset(config.DATASET_ID);
	const table = dataset.table(tableName);

	try {
		logger.info(`🗑️ Attempting to delete table: ${tableName}`);
		const [exists] = await table.exists();
		if (exists) {
			await table.delete();
			logger.success(`✅ Table '${tableName}' deleted successfully`);
		} else {
			logger.warn(`⚠️ Table '${tableName}' does not exist, skipping deletion.`);
		}
	} catch (err) {
		logger.error(`❌ Failed to delete table '${tableName}': ${err.message}`);
		throw err; // Re-throw to stop the process if deletion fails
	}
}

async function runCleanup() {
	try {
		logger.info("🚧 Starting table cleanup...");

		// Verify BigQuery dataset exists
		const [datasets] = await bigquery.getDatasets();
		const datasetExists = datasets.some((ds) => ds.id === config.DATASET_ID);

		if (!datasetExists) {
			logger.warn(`Dataset '${config.DATASET_ID}' not found. Nothing to clean.`);
			return;
		}

		// Delete each table
		for (const table of tablesToDelete) {
			await deleteTable(table);
		}

		logger.success("🎉 All specified tables deleted successfully.");
	} catch (err) {
		logger.error(`❌ Cleanup failed: ${err.message}`);
		process.exit(1);
	}
}

// Ask for confirmation before running
logger.warn("🚨 This script will permanently delete the following tables:");
tablesToDelete.forEach((table) => logger.warn(`   - ${config.PROJECT_ID}:${config.DATASET_ID}.${table}`));

rl.question("❓ Are you sure you want to continue? (yes/no): ", (answer) => {
	if (answer.toLowerCase() === "yes") {
		runCleanup().finally(() => rl.close());
	} else {
		logger.info("🛑 Cleanup cancelled by user.");
		rl.close();
		process.exit(0);
	}
});
