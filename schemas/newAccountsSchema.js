export default [
	{ name: "consensus_timestamp", type: "STRING", mode: "REQUIRED" },
	{ name: "consensus_timestamp_iso8601", type: "TIMESTAMP", mode: "REQUIRED" },
	{ name: "id", type: "STRING", mode: "REQUIRED" }, // transaction id
	{ name: "entity_id", type: "INTEGER", mode: "REQUIRED" },
	{ name: "initial_transfer_amount", type: "INTEGER", mode: "REQUIRED" },
	{ name: "creation_method", type: "STRING", mode: "NULLABLE" }, // e.g., "Faucet", "Portal"
	{ name: "created_at", type: "TIMESTAMP", mode: "NULLABLE" },
];
