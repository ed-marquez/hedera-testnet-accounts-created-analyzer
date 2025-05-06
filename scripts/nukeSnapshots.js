import { BigQuery } from "@google-cloud/bigquery";
import readline from "readline";
import config from "../config.js";
import logger from "../utils/logger.js";

// Ensure snapshot dataset is configured
if (!config.SNAPSHOT_DATASET) {
	logger.error("❌ SNAPSHOT_DATASET is not configured in config.js. Exiting.");
	process.exit(1);
}

const bigquery = new BigQuery({
	projectId: config.PROJECT_ID,
	// keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS || "./keys/bq-key.json",
});

// Create interface for user confirmation
const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
});

async function deleteSnapshotTable(snapshotTable) {
	try {
		logger.info(`🗑️ Attempting to delete snapshot: ${snapshotTable.id}`);
		await snapshotTable.delete();
		logger.success(`✅ Snapshot '${snapshotTable.id}' deleted successfully`);
	} catch (err) {
		logger.error(`❌ Failed to delete snapshot '${snapshotTable.id}': ${err.message}`);
		throw err; // Re-throw to stop the process if deletion fails
	}
}

async function runSnapshotCleanup() {
	const snapshotDatasetId = config.SNAPSHOT_DATASET;
	logger.info(`🚧 Starting snapshot cleanup for dataset: ${snapshotDatasetId}...`);

	try {
		// Verify BigQuery snapshot dataset exists
		const dataset = bigquery.dataset(snapshotDatasetId);
		const [datasetExists] = await dataset.exists();

		if (!datasetExists) {
			logger.warn(`Snapshot dataset '${snapshotDatasetId}' not found. Nothing to clean.`);
			return;
		}

		// Get all tables/snapshots in the dataset
		const [tables] = await dataset.getTables();

		// Filter for actual snapshot tables
		const snapshotsToDelete = tables.filter((table) => table.metadata?.type === "SNAPSHOT");

		if (snapshotsToDelete.length === 0) {
			logger.info(`✅ No snapshot tables found in dataset '${snapshotDatasetId}'.`);
			return;
		}

		logger.warn("🚨 The following snapshot tables will be permanently deleted:");
		snapshotsToDelete.forEach((snap) => logger.warn(`   - ${config.PROJECT_ID}:${snapshotDatasetId}.${snap.id}`));

		// Delete each snapshot table
		for (const snapshot of snapshotsToDelete) {
			await deleteSnapshotTable(snapshot);
		}

		logger.success(`🎉 All snapshot tables in dataset '${snapshotDatasetId}' deleted successfully.`);
	} catch (err) {
		logger.error(`❌ Snapshot cleanup failed: ${err.message}`);
		process.exit(1);
	}
}

// Ask for confirmation before running
logger.warn(`🚨 This script will permanently delete ALL snapshot tables in dataset: ${config.SNAPSHOT_DATASET}`);

rl.question("❓ Are you sure you want to continue? (yes/no): ", (answer) => {
	if (answer.toLowerCase() === "yes") {
		runSnapshotCleanup().finally(() => rl.close());
	} else {
		logger.info("🛑 Snapshot cleanup cancelled by user.");
		rl.close();
		process.exit(0);
	}
});
