// functions/queryExecutor.js
import fs from "fs/promises";
import path from "path";

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
				variables, // Add the variables to the request body
			}),
		});

		const data = await response.json();

		// Create directories if they don't exist
		await fs.mkdir(path.join(process.cwd(), "transactions", "json"), { recursive: true });
		await fs.mkdir(path.join(process.cwd(), "transactions", "csv"), { recursive: true });

		// Save JSON with timestamp for unique filename
		const timestamp = new Date().getTime();
		const filename = `${timestamp}_${variables.startTime}_${variables.endTime}`;

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
