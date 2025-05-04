import config from "../config.js";
import logger from "./logger.js";

/**
 * Executes a raw GraphQL query with the given variables.
 * Handles API key and error reporting.
 */
export async function executeQueryFn(query, variables) {
	try {
		logger.debug(`Executing GraphQL query with variables: ${JSON.stringify(variables)}`);

		const response = await fetch(config.GRAPHQL_ENDPOINT, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-api-key": process.env.GRAPHQL_API_KEY,
			},
			body: JSON.stringify({ query, variables }),
		});

		const json = await response.json();

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		if (json.errors) {
			logger.error(`GraphQL errors: ${JSON.stringify(json.errors)}`);
			throw new Error(`GraphQL query failed: ${json.errors[0].message}`);
		}

		if (!json.data) {
			logger.warn("Query returned no data");
			return null;
		}

		logger.debug(`Query returned ${Object.keys(json.data).length} top-level fields`);
		return json.data;
	} catch (error) {
		logger.error(`Query execution failed: ${error.message}`);
		throw error;
	}
}
