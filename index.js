import "dotenv/config";
import { ACCOUNT_CREATE_COUNT_QUERY } from "./queries/accountCreateCount.js";
import { NEW_TESTNET_ACCOUNTS_QUERY } from "./queries/newTestnetAccounts.js";
import { executeQuery } from "./functions/queryExecutor.js";

async function main() {
	try {
		// Execute account create count query
		const countResult = await executeQuery(ACCOUNT_CREATE_COUNT_QUERY, "account-create-count");
		console.log("Account Create Count:", countResult.data.transaction_aggregate.aggregate.count);

		// Execute new testnet accounts query
		const accountsResult = await executeQuery(NEW_TESTNET_ACCOUNTS_QUERY, "new-testnet-accounts");
		console.log("New Testnet Accounts:", accountsResult.data.transaction.length);
	} catch (error) {
		console.error("Main Error:", error);
	}
}

main();
