import { readFile, writeFile } from "fs/promises";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

export async function analyzeTransactions() {
	const today = new Date().toISOString().split("T")[0];

	// Define __dirname manually for ES modules
	const __filename = fileURLToPath(import.meta.url);
	const __dirname = path.dirname(__filename);

	// Define directories
	const transactionsDir = path.join(__dirname, "../transactions");
	const summaryOutputDir = path.join(__dirname, "../transactions_summary_output");
	const jsonFilePath = path.join(transactionsDir, `${today}-transactions.json`);
	const csvFilePath = path.join(summaryOutputDir, `${today}-transactions_summary.csv`);

	// Ensure the summary output directory exists
	if (!fs.existsSync(summaryOutputDir)) {
		fs.mkdirSync(summaryOutputDir, { recursive: true });
	}

	try {
		// Read and parse JSON file
		const data = await readFile(jsonFilePath, "utf8");
		const transactions = JSON.parse(data);
		const totalTransactions = transactions.length;

		// Group transactions by YYYY-MM
		const transactionsByMonth = {};
		const uniqueTransactionsByMonth = {};
		const uniqueTransactionIds = new Set();

		transactions.forEach((tx) => {
			const timestamp = parseFloat(tx.consensus_timestamp);
			const date = new Date(timestamp * 1000);
			const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

			transactionsByMonth[yearMonth] = (transactionsByMonth[yearMonth] || 0) + 1;

			if (!uniqueTransactionIds.has(tx.transaction_id)) {
				uniqueTransactionIds.add(tx.transaction_id);
				uniqueTransactionsByMonth[yearMonth] = (uniqueTransactionsByMonth[yearMonth] || 0) + 1;
			}
		});

		const totalUniqueTransactions = uniqueTransactionIds.size;

		console.log(`\nTotal Transactions: ${totalTransactions}`);
		console.table(transactionsByMonth);
		console.log(`\nTotal Unique Transactions: ${totalUniqueTransactions}`);
		console.table(uniqueTransactionsByMonth);

		// Prepare CSV content
		let csvContent = `Metric,Value\nTotal Transactions,${totalTransactions}\nTotal Unique Transactions,${totalUniqueTransactions}\n\nMonth,Total Transactions,Unique Transactions\n`;
		Object.keys(transactionsByMonth)
			.sort()
			.forEach((month) => {
				csvContent += `${month},${transactionsByMonth[month] || 0},${uniqueTransactionsByMonth[month] || 0}\n`;
			});

		// Write CSV file
		await writeFile(csvFilePath, csvContent, "utf8");
		console.log(`\nResults exported to: ${csvFilePath}`);
	} catch (error) {
		console.error("Error:", error);
	}
}
