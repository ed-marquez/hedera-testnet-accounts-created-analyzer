// testQuery.js
import "dotenv/config";

const GET_ACCOUNT_CREATE_TXS_QUERY = `
query getAccountCreateTxs($startTime: bigint!, $endTime: bigint!) {
  transaction(
    where: {
      payer_account_id: {_eq: "2"},
      result: {_eq: "22"},
      consensus_timestamp: {_gte: $startTime, _lte: $endTime},
      type: {_eq: "11"},
      nonce: {_gte: 1},
      id: {_neq: "0.0.2@1706812511.019092963"}
    }
    order_by: {consensus_timestamp: asc}
  ) {
    entity_id
  }
}`;

const GET_ACCOUNT_ACTIVITY_QUERY = `
query getAccountActivity($accountIds: [bigint!], $startTime: bigint!, $endTime: bigint!, $limit: Int!, $offset: Int!) {
  transaction(
    where: {
      payer_account_id: {_in: $accountIds},
      consensus_timestamp: {_gte: $startTime, _lte: $endTime},
      nonce: {_eq: 0}
    }
    limit: $limit
    offset: $offset
  ) {
    consensus_timestamp
  }
}`;

async function executeQuery(query, variables) {
	const response = await fetch("https://testnet.hedera.api.hgraph.io/v1/graphql", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"x-api-key": process.env.HGRAPH_API_KEY,
		},
		body: JSON.stringify({
			query,
			variables,
		}),
	});

	const data = await response.json();
	console.log("Query Response:", JSON.stringify(data, null, 2)); // Debug log
	return data;
}

async function executeQueryWithPagination(query, variables, batchSize = 50000) {
	let allResults = [];
	let offset = 0;
	let hasMore = true;

	while (hasMore) {
		try {
			const response = await fetch("https://testnet.hedera.api.hgraph.io/v1/graphql", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-api-key": process.env.HGRAPH_API_KEY,
				},
				body: JSON.stringify({
					query,
					variables: {
						...variables,
						limit: batchSize,
						offset: offset,
					},
				}),
			});

			const data = await response.json();

			if (data.data?.transaction) {
				const transactions = data.data.transaction;
				allResults = [...allResults, ...transactions];

				// If we got fewer results than the batch size, we've reached the end
				if (transactions.length < batchSize) {
					hasMore = false;
				} else {
					offset += batchSize;
				}

				// Add delay between requests to avoid rate limiting
				await new Promise((resolve) => setTimeout(resolve, 1000));
			} else {
				hasMore = false;
			}
		} catch (error) {
			console.error(`Error in batch starting at offset ${offset}:`, error);
			throw error;
		}
	}

	return { data: { transaction: allResults } };
}

async function main() {
	try {
		const startTime = "1706812520644859297"; // Feb 1, 2024
		const currentTime = Date.now() * 1000000; // Current time in nanoseconds

		// Get all created accounts
		const accountsResult = await executeQuery(GET_ACCOUNT_CREATE_TXS_QUERY, {
			startTime,
			endTime: currentTime.toString(),
		});

		if (!accountsResult.data?.transaction) {
			console.error("First query error:", accountsResult);
			return;
		}

		const accountIds = accountsResult.data.transaction.map((tx) => tx.entity_id.toString());
		console.log(`Found ${accountIds.length} created accounts`);
		console.log("Account IDs:", accountIds); // Debug log

		// Get transaction count for these accounts
		const activityResult = await executeQueryWithPagination(GET_ACCOUNT_ACTIVITY_QUERY, {
			accountIds,
			startTime,
			endTime: currentTime.toString(),
		});

		if (!activityResult.data?.transaction) {
			console.error("Second query error:", activityResult);
			return;
		}

		console.log(`Total transactions with nonce=0: ${activityResult.data.transaction.length}`);
	} catch (error) {
		console.error("Error:", error);
	}
}

main();
