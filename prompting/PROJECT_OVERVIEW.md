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

## 📁 Folder Structure

- See [`./FOLDER_STRUCTURE.MD`](FOLDER_STRUCTURE.md)

## 🗃️ BigQuery Tables

- `new_accounts`: Includes account info, initial transfer amount, and creation method
- `transaction_history`: All transactions tied to known accounts
- `job_log`: Records job run start time, end time, and status

## ⏱️ Schedule

- GitHub Actions workflow triggers **weekly**
- Uses service account key + cron scheduling
