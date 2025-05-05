import dotenv from "dotenv";
dotenv.config();

const DEFAULT_START_TIMESTAMP = "1706745600000000000"; // Thursday, February 1, 2024
const DEFAULT_PAGE_SIZE = 10000;
const DEFAULT_OFFSET = 0;
const DEFAULT_BQ_LOCATION = "US";

// Utility to get current time in nanoseconds
const getCurrentUnixTimestampNs = () => {
	const nowMs = Date.now(); // milliseconds
	return (BigInt(nowMs) * 1_000_000n).toString(); // convert to nanoseconds
};

export default {
	// GraphQL endpoint for Hedera testnet
	GRAPHQL_ENDPOINT: process.env.GRAPHQL_ENDPOINT,
	GRAPHQL_API_KEY: process.env.GRAPHQL_API_KEY,

	// BigQuery setup
	PROJECT_ID: process.env.PROJECT_ID, // Must be set in your environment
	DATASET_ID: process.env.DATASET_ID, // Must be set in your environment
	BQ_LOCATION: DEFAULT_BQ_LOCATION,

	SNAPSHOT_DATASET: process.env.SNAPSHOT_DATASET || "snapshots",
	SNAPSHOT_RETENTION_DAYS: process.env.SNAPSHOT_RETENTION_DAYS || 21,

	// Table names
	TABLES: {
		NEW_ACCOUNTS: "new_accounts",
		TX_HISTORY: "transaction_history",
		JOB_LOG: "job_log",
	},

	// Time window defaults (in nanoseconds)
	INITIAL_START_TIMESTAMP: process.env.START_TIME || DEFAULT_START_TIMESTAMP,
	DEFAULT_END_TIMESTAMP: process.env.END_TIME || getCurrentUnixTimestampNs(),

	// Pagination
	PAGE_SIZE: parseInt(process.env.PAGE_SIZE, 10) || DEFAULT_PAGE_SIZE,
	OFFSET: parseInt(process.env.OFFSET, 10) || DEFAULT_OFFSET,

	// Optional logging control
	LOG_LEVEL: process.env.LOG_LEVEL || "debug",
};
