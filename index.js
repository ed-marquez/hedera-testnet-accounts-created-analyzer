import { fetchAndSaveTransactions } from "./functions/fetchAndSaveTransactions.js";
import { analyzeTransactions } from "./functions/countAndAnalyzeTransactions.js";

async function main() {
	await fetchAndSaveTransactions();
	await analyzeTransactions();
}

main();
