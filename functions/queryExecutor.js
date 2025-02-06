import fs from "fs/promises";
import path from "path";

export async function executeQuery(query, filename) {
	try {
		const response = await fetch("https://testnet.hedera.api.hgraph.io/v1/graphql", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-api-key": process.env.HGRAPH_API_KEY,
			},
			body: JSON.stringify({ query }),
		});

		const data = await response.json();

		// Create directories if they don't exist
		await fs.mkdir(path.join(process.cwd(), "transactions", "json"), { recursive: true });
		await fs.mkdir(path.join(process.cwd(), "transactions", "csv"), { recursive: true });

		// Save JSON
		await fs.writeFile(path.join(process.cwd(), "transactions", "json", `${filename}.json`), JSON.stringify(data, null, 2));

		// Convert to CSV and save (basic implementation - you might want to enhance this)
		if (data.data.transaction) {
			const csvData = data.data.transaction.map((tx) => Object.values(tx).join(",")).join("\n");

			await fs.writeFile(path.join(process.cwd(), "transactions", "csv", `${filename}.csv`), csvData);
		}

		return data;
	} catch (error) {
		console.error("Error:", error);
		throw error;
	}
}
