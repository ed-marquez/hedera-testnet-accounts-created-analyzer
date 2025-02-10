// index.js
import "dotenv/config";
import { setupDatabase } from "./db/setup.js";
import { GET_ACCOUNT_CREATE_TXS_QUERY } from "./queries/getAccountCreateTxs.js";
import { GET_ACCOUNT_ACTIVITY_QUERY } from "./queries/getAccountActivity.js";
import { executeQuery, executeQueryWithPagination } from "./functions/queryExecutor.js";

async function getLastExecutionTimestamp(db) {
	const result = await db.get("SELECT last_timestamp FROM last_execution ORDER BY execution_time DESC LIMIT 1");
	return result?.last_timestamp || "1706812520644859297"; // Default to Feb 1, 2024
}

async function updateLastExecutionTimestamp(db, timestamp) {
	await db.run("INSERT INTO last_execution (last_timestamp) VALUES (?)", timestamp);
}

async function saveAccountCreateTxs(db, transactions) {
	const stmt = await db.prepare(`
    INSERT OR IGNORE INTO account_create_transactions 
    (consensus_timestamp, id, type, nonce, entity_id) 
    VALUES (?, ?, ?, ?, ?)
  `);

	for (const tx of transactions) {
		await stmt.run([tx.consensus_timestamp, tx.id, tx.type, tx.nonce, tx.entity_id]);
	}
	await stmt.finalize();
}

async function saveAccountActivity(db, transactions) {
	const stmt = await db.prepare(`
        INSERT OR IGNORE INTO account_activity 
        (consensus_timestamp, id, type, result, payer_account_id) 
        VALUES (?, ?, ?, ?, ?)
    `);

	for (const tx of transactions) {
		await stmt.run([tx.consensus_timestamp, tx.id, tx.type, tx.result, tx.payer_account_id]);
	}
	await stmt.finalize();
}

async function main() {
	try {
		const db = await setupDatabase();
		const startTime = await getLastExecutionTimestamp(db);
		const currentTime = Date.now() * 1000000; // Convert to nanoseconds

		// Get new accounts created
		const accountCreateTxsResult = await executeQuery(GET_ACCOUNT_CREATE_TXS_QUERY, {
			startTime,
			endTime: currentTime.toString(),
		});

		await saveAccountCreateTxs(db, accountCreateTxsResult.data.transaction);

		// Get all entity_ids from created accounts
		const accountIds = accountCreateTxsResult.data.transaction.map((tx) => tx.entity_id.toString());

		// Get activity for these accounts
		if (accountIds.length > 0) {
			const activityResult = await executeQueryWithPagination(GET_ACCOUNT_ACTIVITY_QUERY, {
				accountIds,
				startTime,
				endTime: currentTime.toString(),
			});

			await saveAccountActivity(db, activityResult.data.transaction);
		}

		// Update last execution timestamp
		await updateLastExecutionTimestamp(db, currentTime.toString());

		// Generate reports
		const activeAccounts = await db.all(`
      SELECT payer_account_id, COUNT(*) as tx_count 
      FROM account_activity 
      WHERE strftime('%Y-%m', datetime(substr(consensus_timestamp, 1, 10), 'unixepoch')) = strftime('%Y-%m', 'now')
      GROUP BY payer_account_id 
      HAVING tx_count >= 2
    `);

		console.log("Active Accounts Report:", activeAccounts);
	} catch (error) {
		console.error("Main Error:", error);
	}
}

// // Set up cron job to run weekly
// import cron from "node-cron";
// cron.schedule("0 0 * * 0", () => {
// 	console.log("Running weekly update...");
// 	main();
// });

// Initial execution
main();
