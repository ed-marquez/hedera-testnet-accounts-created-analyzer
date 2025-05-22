# Hedera Testnet Analyzer

## 🎯 Goal

Automate the extraction, enrichment, and storage of Hedera Testnet account and transaction data using GraphQL. Store results in Google BigQuery and visualize them via Google Looker Studio. Two separate pipelines now run via scheduled GitHub Actions. The accounts pipeline is already active and keeps the `new_accounts` table current each day.

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

4. **Query transaction history** for all accounts stored in `new_accounts`.

5. **Write data to BigQuery**:
   - Append `new_accounts` table with enriched rows.
   - Append `transaction_history` table.
   - Update the appropriate job log table with the current run’s metadata.

## 🧱 Tech Stack

- **Node.js** (modular, ES Modules)
- **BigQuery** (data warehouse)
- **GraphQL** (data source)
- **Looker Studio** (visualization)
- **GitHub Actions** (scheduled jobs)

## 🗃️ BigQuery Tables

- `new_accounts`: Includes account info, initial transfer amount, and creation method
- `transaction_history`: All transactions tied to known accounts
- `job_log_accounts`: Records account pipeline job runs
- `job_log_transactions`: Records transaction pipeline job runs

## ⏱️ Schedule

- **Accounts pipeline** runs daily at 10:00 AM UTC via GitHub Actions (already running)
- **Transactions pipeline** runs every 2 hours until caught up, then switches to a daily schedule
- Both use service account keys and cron scheduling

## 📁 Folder Structure

```
/hedera-testnet-accounts-created-analyzer
├── index_accounts.js
│ # Entry point for the accounts pipeline
├── index_transactions.js
│ # Entry point for the transactions pipeline
│ # (uses accounts from `new_accounts`)
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
│ ├── jobLogAccountsSchema.js
│ │ # Schema for the account pipeline job log table
│ └── jobLogTransactionsSchema.js
│   # Schema for the transaction pipeline job log table
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
│ │ # Appends a record to the correct job log table:
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
│       ├── accounts-job.yml
│       │ # Runs the accounts pipeline
│       └── transactions-job.yml
│         # Runs the transactions pipeline
```
