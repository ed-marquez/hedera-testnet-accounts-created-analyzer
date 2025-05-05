# Hedera Testnet Analyzer

## 🎯 Goal

Automate the extraction, enrichment, and storage of Hedera Testnet account and transaction data using GraphQL. Store results in Google BigQuery and visualize them via Google Looker Studio. The application runs weekly via GitHub Actions.

## 🔁 Core Flow

1. **Determine time window**:

   - If the dataset does not exist, create it and the required tables in BigQuery.
   - If the job log table is empty → use fixed initial start time: Feb 1, 2024.
   - If the job log has entries → use the most recent job’s end time.

2. **Query new account creations** (type 11, nonce 1).

   - Output includes `id`, `consensus_timestamp`, and account data.

3. **Enrich new account data**:

   - Use `id` list from new accounts to fetch parent transactions (type 14, nonce 0).
   - Extract the **initial transfer amount** (in tinybar) from these parent transactions.
   - Add:
     - `initial_transfer_amount`
     - `creation_method` (mapped as follows):
       - `10000000000` → `"Faucet"`
       - `100000000000` → `"Portal"`
       - Any other → `"Unknown"`

4. **Query transaction history** for all known accounts in the DB.

5. **Write data to BigQuery**:
   - Append `new_accounts` table with enriched rows.
   - Append `transaction_history` table.
   - Update `job_log` with the current run’s metadata.

## 🧱 Tech Stack

- **Node.js** (modular, ES Modules)
- **BigQuery** (data warehouse)
- **GraphQL** (data source)
- **Looker Studio** (visualization)
- **GitHub Actions** (weekly job scheduler)

## 🗃️ BigQuery Tables

- `new_accounts`: Includes account info, initial transfer amount, and creation method
- `transaction_history`: All transactions tied to known accounts
- `job_log`: Records job run start time, end time, and status

## ⏱️ Schedule

- GitHub Actions workflow triggers **weekly**
- Uses service account key + cron scheduling

## 📁 Folder Structure

```
/hedera-testnet-accounts-created-analyzer
├── index.js
│ # Entry point of the application.
│ # - Orchestrates the ETL flow:
│ # 1. Determines the time window and sets up the database if needed
│ # 2. Queries new accounts and transaction history
│ # 3. Enriches new accounts with creation method
│ # 4. Writes all data to BigQuery
│ # 5. Updates the job log table with execution metadata
│
├── config.js
│ # Central configuration file for project-wide constants:
│ # - Dataset and table names
│ # - Default timestamps for the initial pull
│ # - GraphQL API endpoint and pagination size
│
├── /schemas
│ ├── newAccountsSchema.js
│ │ # BigQuery table schema definition for the 'new_accounts' table:
│ │ # - Stores enriched account creation data including transfer amount and creation method
│ ├── txHistorySchema.js
│ │ # BigQuery schema for the 'transaction_history' table:
│ │ # - Stores all transactions related to known testnet accounts
│ └── jobLogSchema.js
│ # BigQuery schema for the 'job_log' table:
│ # - Records metadata for each job run (start time, end time, status)
│
├── /queries
│ ├── getNewAccounts.js
│ │ # GraphQL query builder and executor for fetching new account creation transactions:
│ │ # - Specifically targets child transactions (type 11, nonce 1)
│ │ # - Returns account details and transaction IDs
│ ├── getAccCreationMethod.js
│ │ # GraphQL query for identifying parent transfer transactions (type 14, nonce 0):
│ │ # - Uses transaction IDs from getNewAccounts.js to match on consensus timestamp
│ │ # - Fetches the maximum transferred amount for each parent transaction
│ │ # - Helps classify account creation method:
│ │ # 10000000000 tinybar → Faucet (100 HBAR)
│ │ # 100000000000 tinybar → Portal (1000 HBAR)
│ └── getTxHistory.js
│ # GraphQL query for pulling transaction history of accounts in the database:
│ # - Only pulls transactions within the current time window
│
├── /utils
│ ├── dbOperations.js
│ │ # Utility for BigQuery setup and time window logic:
│ │ # - Creates dataset and tables if missing
│ │ # - Determines if this is the initial or subsequent pull
│ │ # - Returns appropriate start and end time for querying
│ │
│ ├── queryAndWriteToDb.js
│ │ # Reusable utility to run GraphQL queries and write results to BigQuery:
│ │ # - Supports pagination (offset + limit)
│ │ # - Can be used for both new accounts and transaction history
│ │
│ ├── enrichNewAccounts.js
│ │ # Enriches new account data with parent transfer info:
│ │ # - Joins parent transfer data using consensus timestamp
│ │ # - Adds:
│ │ # - `initial_transfer_amount`
│ │ # - `creation_method` ("Faucet", "Portal", or "Unknown")
│ │
│ ├── enrichTransactionHistory.js
│ │ # Adds text columns to transaction history rows
│ │ # Text columns identify the transaction type name and Hedera service used
│ │
│ ├── updateJobLog.js
│ │ # Appends a record to the 'job_log' table:
│ │ # - Records start time, end time, and status ("success", "error", etc.)
│ │
│ └── logger.js
│ # Central logging utility for consistent console output:
│ # - Supports `info`, `warn`, `error`, `success` levels with timestamps and color
│ # - Used across all modules for structured, readable logs
│
├── /keys
│   # This folder is used to temporarily store the BigQuery credentials JSON
│   # GitHub Actions writes the contents of the `BQ_KEY_JSON` secret here at runtime
│   # `/keys/bq-key.json` included in `.gitignore` file
│
├── .gitignore
│
├── /github
│   └── /workflows
│       └── weekly-job.yml
│           # GitHub Actions workflow file
│           # - Runs weekly via cron
│           # - Installs dependencies
│           # - Writes service key
│           # - Executes `node index.js`
```
