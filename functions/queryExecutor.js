import fs from "fs/promises";
import path from "path";

function formatTimestamp(timestamp) {
	const date = new Date(parseInt(timestamp) / 1000000); // Convert nanoseconds to milliseconds
	return date.toISOString().replace(/[:.]/g, "-").slice(0, 16); // Gets YYYY-MM-DD-HH-MM
}

export async function executeQuery(query, variables) {
	try {
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

		// Create directories if they don't exist
		await fs.mkdir(path.join(process.cwd(), "transactions", "json"), { recursive: true });
		await fs.mkdir(path.join(process.cwd(), "transactions", "csv"), { recursive: true });

		// Format start and end times
		const startFormatted = formatTimestamp(variables.startTime);
		const endFormatted = formatTimestamp(variables.endTime);

		// Create filename with readable dates
		const filename = `${startFormatted}_to_${endFormatted}`;

		await fs.writeFile(path.join(process.cwd(), "transactions", "json", `${filename}.json`), JSON.stringify(data, null, 2));

		// Convert to CSV and save
		if (data.data?.transaction) {
			const headers = Object.keys(data.data.transaction[0]).join(",");
			const csvData = [headers, ...data.data.transaction.map((tx) => Object.values(tx).join(","))].join("\n");

			await fs.writeFile(path.join(process.cwd(), "transactions", "csv", `${filename}.csv`), csvData);
		}

		return data;
	} catch (error) {
		console.error("Query Execution Error:", error);
		throw error;
	}
}

export async function executeQueryWithPagination(query, variables, batchSize = 50000) {
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

// export async function executeQuery(query, variables) {
// 	try {
// 		const response = await fetch("https://testnet.hedera.api.hgraph.io/v1/graphql", {
// 			method: "POST",
// 			headers: {
// 				"Content-Type": "application/json",
// 				"x-api-key": process.env.HGRAPH_API_KEY,
// 			},
// 			body: JSON.stringify({
// 				query,
// 				variables, // Add the variables to the request body
// 			}),
// 		});

// 		const data = await response.json();

// 		// Create directories if they don't exist
// 		await fs.mkdir(path.join(process.cwd(), "transactions", "json"), { recursive: true });
// 		await fs.mkdir(path.join(process.cwd(), "transactions", "csv"), { recursive: true });

// 		// Save JSON with timestamp for unique filename
// 		const timestamp = new Date().getTime();
// 		const filename = `${timestamp}_${variables.startTime}_${variables.endTime}`;

// 		await fs.writeFile(path.join(process.cwd(), "transactions", "json", `${filename}.json`), JSON.stringify(data, null, 2));

// 		// Convert to CSV and save
// 		if (data.data?.transaction) {
// 			const headers = Object.keys(data.data.transaction[0]).join(",");
// 			const csvData = [headers, ...data.data.transaction.map((tx) => Object.values(tx).join(","))].join("\n");

// 			await fs.writeFile(path.join(process.cwd(), "transactions", "csv", `${filename}.csv`), csvData);
// 		}

// 		return data;
// 	} catch (error) {
// 		console.error("Query Execution Error:", error);
// 		throw error;
// 	}
// }
