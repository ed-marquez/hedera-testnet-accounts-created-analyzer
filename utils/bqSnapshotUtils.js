import { BigQuery } from "@google-cloud/bigquery";
import config from "../config.js";
import logger from "./logger.js";

const bigquery = new BigQuery({
	projectId: config.PROJECT_ID,
	keyFilename: "./keys/bq-key.json",
});

/**
 * Ensures the snapshot dataset exists. Creates it if missing.
 */
async function ensureSnapshotDataset() {
	const [datasets] = await bigquery.getDatasets();
	const exists = datasets.some((ds) => ds.id === config.SNAPSHOT_DATASET);

	if (!exists) {
		logger.info(`📁 Creating snapshot dataset '${config.SNAPSHOT_DATASET}'...`);
		await bigquery.createDataset(config.SNAPSHOT_DATASET, { location: config.BQ_LOCATION });
		logger.success(`✅ Snapshot dataset '${config.SNAPSHOT_DATASET}' created.`);
	}
}

/**
 * Generates a snapshot table name with a timestamp suffix.
 */
function generateSnapshotName(baseTableName) {
	const timestamp = new Date()
		.toISOString()
		.replace(/[-:T.]/g, "")
		.slice(0, 14);
	return `${baseTableName}_snapshot_${timestamp}`;
}

// /**
//  * Creates a snapshot of the specified table.
//  */
// export async function createSnapshotBeforeWriteFn(baseTableName) {
// 	await ensureSnapshotDataset();

// 	const snapshotTableName = generateSnapshotName(baseTableName);
// 	const baseTable = `${config.DATASET_ID}.${baseTableName}`;
// 	const snapshotTable = `${config.SNAPSHOT_DATASET}.${snapshotTableName}`;

// 	const expirationDate = new Date();
// 	expirationDate.setDate(expirationDate.getDate() + config.SNAPSHOT_RETENTION_DAYS);
// 	const expirationTimestamp = expirationDate.toISOString().split(".")[0];

// 	const query = `
// 		CREATE SNAPSHOT TABLE \`${config.PROJECT_ID}.${snapshotTable}\`
// 		CLONE \`${config.PROJECT_ID}.${baseTable}\`
// 		OPTIONS (
// 			expiration_timestamp = TIMESTAMP "${expirationTimestamp}"
// 		)
// 	`;

// 	try {
// 		await bigquery.query({ query });
// 		logger.info(`✅ Snapshot created: ${snapshotTable}`);
// 	} catch (error) {
// 		logger.error(`❌ Failed to create snapshot for ${baseTableName}: ${error.message}`);
// 		throw error;
// 	}
// }

export async function createSnapshotBeforeWriteFn(baseTableName) {
	await ensureSnapshotDataset();

	const baseTablePath = `${config.DATASET_ID}.${baseTableName}`;
	const fullBaseTableId = `${config.PROJECT_ID}.${baseTablePath}`;

	const snapshotTableName = generateSnapshotName(baseTableName);
	const snapshotTablePath = `${config.SNAPSHOT_DATASET}.${snapshotTableName}`;
	const fullSnapshotTableId = `${config.PROJECT_ID}.${snapshotTablePath}`;

	try {
		// Check base table row count BEFORE creating snapshot
		// before CREATE SNAPSHOT …
		const countSql = `
		   SELECT COUNT(*) AS cnt
		   FROM \`${fullBaseTableId}\`
		 `;
		const [rows] = await bigquery.query({ query: countSql });
		const baseRowCount = Number(rows[0].cnt);
		logger.info(`🔎 Base table ${baseTableName} has ${baseRowCount} rows (by COUNT(*))`);

		const expirationDate = new Date();
		expirationDate.setDate(expirationDate.getDate() + parseInt(config.SNAPSHOT_RETENTION_DAYS, 10));
		const expirationTimestamp = expirationDate.toISOString().split(".")[0];

		const query = `
			CREATE SNAPSHOT TABLE \`${fullSnapshotTableId}\`
			CLONE \`${fullBaseTableId}\`
			OPTIONS (
				expiration_timestamp = TIMESTAMP "${expirationTimestamp}"
			)
		`;

		await bigquery.query({ query });
		logger.info(`✅ Snapshot created: ${snapshotTablePath}`);

		// Check snapshot row count AFTER creation
		const snapshotTable = bigquery.dataset(config.SNAPSHOT_DATASET).table(snapshotTableName);
		const [snapshotMetadata] = await snapshotTable.getMetadata();
		const snapshotRowCount = snapshotMetadata.numRows || "0";
		logger.info(`ℹ️ Snapshot ${snapshotTablePath} contains ${snapshotRowCount} rows.`);

		if (parseInt(snapshotRowCount, 10) === 0 && parseInt(baseRowCount, 10) > 0) {
			// Only warn if snapshot is empty BUT base table was not
			logger.warn(`⚠️ Snapshot ${snapshotTablePath} is empty, but base table ${baseTablePath} had ${baseRowCount} rows just before snapshot!`);
		} else if (parseInt(snapshotRowCount, 10) === 0) {
			logger.warn(`⚠️ Snapshot ${snapshotTablePath} was created empty (base table reported 0 rows before creation).`);
		}
		return snapshotRowCount;
	} catch (error) {
		logger.error(`❌ Failed to create snapshot for ${baseTableName}: ${error.message}`);
		// Optionally check if base table existed if error occurs
		try {
			const [exists] = await bigquery.dataset(config.DATASET_ID).table(baseTableName).exists();
			if (!exists) {
				logger.error(`   Base table ${baseTablePath} does not exist.`);
			}
		} catch (checkError) {
			logger.error(`   Could not check existence of base table ${baseTablePath}: ${checkError.message}`);
		}
		throw error;
	}
}

/**
 * Restores the most recent snapshot of the specified table.
 */
/**
 * Restores the most recent snapshot of a table using DROP + CLONE to avoid write issues.
 */
export async function restoreFromLatestSnapshotFn(baseTableName) {
	const [snapshots] = await bigquery.dataset(config.SNAPSHOT_DATASET).getTables();

	const snapshotTables = snapshots
		.filter((table) => table.metadata.type === "SNAPSHOT" && table.id.startsWith(`${baseTableName}_snapshot_`))
		.sort((a, b) => (a.metadata.creationTime < b.metadata.creationTime ? 1 : -1));

	if (snapshotTables.length === 0) {
		logger.warn(`⚠️ No snapshots found for ${baseTableName}`);
		return;
	}

	const latestSnapshot = snapshotTables[0];
	const snapshotTableId = `${config.PROJECT_ID}.${config.SNAPSHOT_DATASET}.${latestSnapshot.id}`;
	const restoredTableId = `${config.PROJECT_ID}.${config.DATASET_ID}.${baseTableName}`;

	const dropQuery = `DROP TABLE IF EXISTS \`${restoredTableId}\``;
	const cloneQuery = `
		CREATE TABLE \`${restoredTableId}\`
		CLONE \`${snapshotTableId}\`
	`;

	try {
		logger.info(`🧹 Dropping table '${baseTableName}' before restore...`);
		await bigquery.query({ query: dropQuery });

		logger.info(`♻️ Cloning snapshot '${latestSnapshot.id}' into '${baseTableName}'...`);
		await bigquery.query({ query: cloneQuery });

		logger.success(`🔄 Restored '${baseTableName}' from snapshot: ${latestSnapshot.id}`);
	} catch (error) {
		logger.error(`❌ Failed to restore '${baseTableName}' from snapshot: ${error.message}`);
		throw error;
	}
}

/**
 * Deletes snapshots older than the retention period.
 */
export async function pruneSnapshotsFn(baseTableName) {
	const [snapshots] = await bigquery.dataset(config.SNAPSHOT_DATASET).getTables();
	const now = Date.now();
	const retentionMillis = config.SNAPSHOT_RETENTION_DAYS * 24 * 60 * 60 * 1000;

	const oldSnapshots = snapshots.filter((table) => {
		return (
			table.metadata.type === "SNAPSHOT" &&
			table.id.startsWith(`${baseTableName}_snapshot_`) &&
			now - parseInt(table.metadata.creationTime) > retentionMillis
		);
	});

	for (const snapshot of oldSnapshots) {
		try {
			await snapshot.delete();
			logger.info(`🗑️ Deleted old snapshot: ${snapshot.id}`);
		} catch (error) {
			logger.error(`❌ Failed to delete snapshot ${snapshot.id}: ${error.message}`);
		}
	}
}
