export default [
	{ name: "job_id", type: "STRING", mode: "REQUIRED" },
	{ name: "start_time_ns", type: "STRING", mode: "REQUIRED" },
	{ name: "end_time_ns", type: "STRING", mode: "REQUIRED" },
	{ name: "start_time_iso", type: "TIMESTAMP", mode: "NULLABLE" },
	{ name: "end_time_iso", type: "TIMESTAMP", mode: "NULLABLE" },
	{ name: "status", type: "STRING", mode: "REQUIRED" }, // e.g., "success", "error"
	{ name: "message", type: "STRING", mode: "NULLABLE" },
	{ name: "logged_at", type: "TIMESTAMP", mode: "NULLABLE" },
];
