export default [
	{ name: "consensus_timestamp", type: "STRING", mode: "REQUIRED" },
	{ name: "consensus_timestamp_iso8601", type: "TIMESTAMP", mode: "REQUIRED" },
	{ name: "id", type: "STRING", mode: "REQUIRED" },
	{ name: "payer_account_id", type: "INTEGER", mode: "REQUIRED" },
	{ name: "type", type: "INTEGER", mode: "REQUIRED" },
	{ name: "result", type: "INTEGER", mode: "REQUIRED" },
	{ name: "transaction_type_name", type: "STRING", mode: "NULLABLE" }, // e.g., "CryptoTransfer"
	{ name: "hedera_service", type: "STRING", mode: "NULLABLE" }, // e.g., "Crypto", "Token"
	{ name: "inserted_at", type: "TIMESTAMP", mode: "NULLABLE" },
];
