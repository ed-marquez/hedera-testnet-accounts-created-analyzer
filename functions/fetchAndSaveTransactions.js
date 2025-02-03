console.clear();
import fetch from "node-fetch";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url"; // Required for __dirname in ES modules

export async function fetchAndSaveTransactions() {
	const network = "testnet";
	const accountId = "0.0.2"; // Account ID to fetch transactions for
	const limit = 100; // Number of transactions to fetch per request
	const txType = "CRYPTOCREATEACCOUNT"; // Transaction type to filter by
	const result = "success"; // Transaction result to filter by
	const startTime = toUnixTimestamp(new Date("2024-02-01T18:35:20.6448Z")); // Last Testnet reset in 2024
	const today = new Date().toISOString().split("T")[0];

	// Manually define __dirname for ES Modules
	const __filename = fileURLToPath(import.meta.url);
	const __dirname = path.dirname(__filename);

	// Define transactions directory
	const transactionsDir = path.resolve(__dirname, "../transactions");

	// Ensure the 'transactions' directory exists
	if (!fs.existsSync(transactionsDir)) {
		fs.mkdirSync(transactionsDir, { recursive: true });
	}

	// Fetch transactions and save to file
	let url = formUrl(network, accountId, limit, txType, result, startTime);
	let allTransactions = [];
	let totalTransactions = 0;

	while (url) {
		try {
			const response = await fetch(url);
			if (!response.ok) {
				throw new Error(`Error fetching data: ${response.statusText}`);
			}

			const data = await response.json();
			const transactions = data.transactions;

			// Append transactions to the array
			if (transactions && transactions.length > 0) {
				allTransactions = allTransactions.concat(transactions);
				totalTransactions += transactions.length;
			}

			// Get next page URL if available
			const nextLink = data.links?.next;
			url = nextLink ? `https://${network}.mirrornode.hedera.com${nextLink}` : null;
		} catch (error) {
			console.error("Error fetching transactions:", error);
			break;
		}
	}

	console.log(`Total transactions fetched: ${totalTransactions}`);

	// Save transactions JSON file
	const filePath = path.join(transactionsDir, `${today}-transactions.json`);
	fs.writeFileSync(filePath, JSON.stringify(allTransactions, null, 2));
	console.log(`All transactions saved to ${filePath}`);
}

// ========================================================================
// HELPER FUNCTIONS
// ========================================================================

// Convert a date to a Unix timestamp in seconds
function toUnixTimestamp(date) {
	return Math.floor(date.getTime() / 1000);
}

// Form the Hedera Mirror Node URL dynamically
function formUrl(network, accountId, limit, txType, result, startTime) {
	const baseUrl = `https://${network}.mirrornode.hedera.com/`;
	const endpoint = `api/v1/transactions`;
	const accountQueryParam = `account.id=eq:${accountId}`;
	const limitQueryParam = `limit=${limit}`;
	const txTypeQueryParam = `transactiontype=${txType}`;
	const resultQueryParam = `result=${result}`;
	const timestampQueryParam = `timestamp=gte:${startTime}`;

	return `${baseUrl}${endpoint}?${accountQueryParam}&${limitQueryParam}&${txTypeQueryParam}&${resultQueryParam}&${timestampQueryParam}`;
}
