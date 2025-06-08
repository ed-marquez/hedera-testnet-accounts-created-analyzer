import dotenv from "dotenv";
dotenv.config();

const DEFAULT_START_TIMESTAMP = "1735689600000000000"; // 2025 YTD: WEDNESDAY JANUARY 1, 2025
const DEFAULT_WINDOW_SIZE_NS = String(24 * 60 * 60 * 1_000_000_000); // 24 hours in nanoseconds
const DEFAULT_PAGE_SIZE = 10000;
const DEFAULT_OFFSET = 0;
const DEFAULT_BQ_LOCATION = "US";
const TARGET = process.env.PIPELINE_TARGET || "ACCOUNTS"; // or "TRANSACTIONS"

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
	SNAPSHOT_RETENTION_DAYS: process.env.SNAPSHOT_RETENTION_DAYS || 0.125,

	PIPELINE_TARGET: TARGET,

	// Table names
	TABLES: {
		// table names for each pipeline target
		NEW_ACCOUNTS: "new_accounts",
		TX_HISTORY: "transaction_history",
		// job log tables for each pipeline target
		JOB_LOG_ACCOUNTS: "job_log_accounts",
		JOB_LOG_TRANSACTIONS: "job_log_transactions",
		// dynamic alias — code continues to read from TABLES.JOB_LOG:
		JOB_LOG: TARGET === "ACCOUNTS" ? "job_log_accounts" : "job_log_transactions",
	},

	// Time window defaults (in nanoseconds)
	INITIAL_START_TIMESTAMP: process.env.START_TIME || DEFAULT_START_TIMESTAMP,
	WINDOW_SIZE_NS: process.env.WINDOW_SIZE_NS || DEFAULT_WINDOW_SIZE_NS,
	getCurrentUnixTimestampNs,

	// Pagination
	PAGE_SIZE: parseInt(process.env.PAGE_SIZE, 10) || DEFAULT_PAGE_SIZE,
	OFFSET: parseInt(process.env.OFFSET, 10) || DEFAULT_OFFSET,

	// Optional logging control
	LOG_LEVEL: process.env.LOG_LEVEL || "debug",
};
