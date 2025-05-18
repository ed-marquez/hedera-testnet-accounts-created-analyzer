import { GET_ACCOUNT_METHOD_QUERY } from "../queries/getAccCreationMethod.js";
import { executeQueryFn } from "./executeQuery.js";
import logger from "./logger.js";

function mapAmountToCreationMethod(amount) {
	switch (amount) {
		case 10000000000:
			return "Faucet";
		case 100000000000:
		case 1000000000000:
			return "Portal";
		default:
			return "Unknown";
	}
}

// Convert nanosecond timestamp to ISO8601
function nsToISO8601(ns) {
	const ms = Number(BigInt(ns) / 1_000_000n);
	return new Date(ms).toISOString();
}

export default async function enrichNewAccountsFn(newAccounts, startTime, endTime) {
	logger.info(`🔗 Enriching ${newAccounts.length} accounts with creation method...`);

	const txIdList = [...new Set(newAccounts.map((acc) => acc.id))]; // Get unique transaction IDs from the new_accounts table

	if (txIdList.length === 0) {
		logger.warn("⚠️ No transaction IDs provided. Skipping enrichment.");
		return newAccounts;
	}

	// Execute GraphQL query manually
	const variables = {
		startTime,
		endTime,
		txIdList,
	};

	const result = await executeQueryFn(GET_ACCOUNT_METHOD_QUERY, variables);
	const parentTxs = result?.transaction || [];

	const enriched = newAccounts.map((account) => {
		const match = parentTxs.find((p) => p.consensus_timestamp === account.consensus_timestamp);
		const amountTinybar = match?.crypto_transfer_aggregate?.aggregate?.max?.amount ?? 0;

		return {
			...account,
			consensus_timestamp: account.consensus_timestamp.toString(),
			consensus_timestamp_iso8601: nsToISO8601(account.consensus_timestamp),
			entity_id: parseInt(account.entity_id, 10),
			initial_transfer_amount: amountTinybar,
			creation_method: mapAmountToCreationMethod(amountTinybar),
			created_at: new Date().toISOString(),
		};
	});

	logger.success(`✅ Enriched ${enriched.length} accounts`);
	return enriched;
}
