import logger from "./logger.js";

const transactionTypeMap = {
	0: { name: "ContractCall", service: "Smart Contract" },
	1: { name: "ContractCreate", service: "Smart Contract" },
	2: { name: "ContractUpdate", service: "Smart Contract" },
	3: { name: "ContractDelete", service: "Smart Contract" },
	8: { name: "CryptoCreate", service: "Crypto" },
	9: { name: "CryptoDelete", service: "Crypto" },
	10: { name: "CryptoTransfer", service: "Crypto" },
	11: { name: "AccountCreate", service: "Crypto" },
	12: { name: "SystemDelete", service: "System" },
	13: { name: "SystemUndelete", service: "System" },
	14: { name: "CryptoTransfer", service: "Crypto" },
	17: { name: "FileCreate", service: "File" },
	18: { name: "FileAppend", service: "File" },
	19: { name: "FileUpdate", service: "File" },
	20: { name: "FileDelete", service: "File" },
	22: { name: "ConsensusSubmitMessage", service: "Consensus" },
	24: { name: "TokenCreate", service: "Token" },
	25: { name: "TokenDelete", service: "Token" },
	26: { name: "TokenUpdate", service: "Token" },
	27: { name: "TokenMint", service: "Token" },
	28: { name: "TokenBurn", service: "Token" },
	29: { name: "TokenWipe", service: "Token" },
	31: { name: "TokenAssociate", service: "Token" },
	32: { name: "TokenDissociate", service: "Token" },
	33: { name: "TokenFeeScheduleUpdate", service: "Token" },
	35: { name: "ScheduleCreate", service: "Schedule" },
	36: { name: "ScheduleDelete", service: "Schedule" },
	37: { name: "ScheduleSign", service: "Schedule" },
	// Add more types as needed
};

/**
 * Adds `transaction_type_name` and `hedera_service` to each transaction row.
 *
 * @param {Array<Object>} transactions - Raw rows from getTxHistory query
 * @returns {Array<Object>} Enriched rows with additional type metadata
 */
export default function enrichTransactionHistoryFn(transactions) {
	logger.info(`🧠 Enriching ${transactions.length} transaction history records...`);

	return transactions.map((tx) => {
		const typeInfo = transactionTypeMap[tx.type] || {};
		return {
			...tx,
			transaction_type_name: typeInfo.name || "Unknown",
			hedera_service: typeInfo.service || "Unknown",
		};
	});
}
