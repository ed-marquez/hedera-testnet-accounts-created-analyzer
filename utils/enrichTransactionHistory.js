import logger from "./logger.js";

const transactionTypeMap = {
	7: { name: "contractCall", service: "Smart Contract" },
	8: { name: "contractCreateInstance", service: "Smart Contract" },
	9: { name: "contractUpdateInstance", service: "Smart Contract" },
	10: { name: "cryptoAddLiveHash", service: "Crypto" },
	11: { name: "cryptoCreateAccount", service: "Crypto" },
	12: { name: "cryptoDelete", service: "Crypto" },
	13: { name: "cryptoDeleteLiveHash", service: "Crypto" },
	14: { name: "cryptoTransfer", service: "Crypto" },
	15: { name: "cryptoUpdateAccount", service: "Crypto" },
	16: { name: "fileAppend", service: "File" },
	17: { name: "fileCreate", service: "File" },
	18: { name: "fileDelete", service: "File" },
	19: { name: "fileUpdate", service: "File" },
	20: { name: "systemDelete", service: "System" },
	21: { name: "systemUndelete", service: "System" },
	22: { name: "contractDeleteInstance", service: "Smart Contract" },
	23: { name: "freeze", service: "Network" },
	24: { name: "consensusCreateTopic", service: "Consensus" },
	25: { name: "consensusUpdateTopic", service: "Consensus" },
	26: { name: "consensusDeleteTopic", service: "Consensus" },
	27: { name: "consensusSubmitMessage", service: "Consensus" },
	28: { name: "uncheckedSubmit", service: "System" },
	29: { name: "tokenCreation", service: "Token" },
	31: { name: "tokenFreeze", service: "Token" },
	32: { name: "tokenUnfreeze", service: "Token" },
	33: { name: "tokenGrantKyc", service: "Token" },
	34: { name: "tokenRevokeKyc", service: "Token" },
	35: { name: "tokenDelete", service: "Token" },
	36: { name: "tokenUpdate", service: "Token" },
	37: { name: "tokenMint", service: "Token" },
	38: { name: "tokenBurn", service: "Token" },
	39: { name: "tokenWipe", service: "Token" },
	40: { name: "tokenAssociate", service: "Token" },
	41: { name: "tokenDissociate", service: "Token" },
	42: { name: "scheduleCreate", service: "Schedule" },
	43: { name: "scheduleDelete", service: "Schedule" },
	44: { name: "scheduleSign", service: "Schedule" },
	45: { name: "tokenFeeScheduleUpdate", service: "Token" },
	46: { name: "tokenPause", service: "Token" },
	47: { name: "tokenUnpause", service: "Token" },
	48: { name: "cryptoApproveAllowance", service: "Crypto" },
	49: { name: "cryptoDeleteAllowance", service: "Crypto" },
	50: { name: "ethereumTransaction", service: "Ethereum" },
	51: { name: "node_stake_update", service: "Network" },
	52: { name: "util_prng", service: "Utility" },
	53: { name: "token_update_nfts", service: "Token" },
	54: { name: "nodeCreate", service: "Network" },
	55: { name: "nodeUpdate", service: "Network" },
	56: { name: "nodeDelete", service: "Network" },
	57: { name: "tokenReject", service: "Token" },
	58: { name: "tokenAirdrop", service: "Token" },
	59: { name: "tokenCancelAirdrop", service: "Token" },
	60: { name: "tokenClaimAirdrop", service: "Token" },
	65: { name: "state_signature_transaction", service: "Network" },
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
