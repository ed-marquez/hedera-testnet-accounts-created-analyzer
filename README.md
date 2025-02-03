# Hedera Testnet Accounts Analyzer

This repository fetches transaction data from the **Hedera Testnet Mirror Node API**, processes it, and generates a summary CSV.

## 📂 Folder Structure

```
/hedera-testnet-accounts-created-analyzer
│── index.js                          # Main entry point
│── /functions
│   ├── fetchAndSaveTransactions.js    # Fetches transactions and saves JSON
│   ├── countAndAnalyzeTransactions.js # Analyzes transactions and exports CSV
│── /transactions                      # Stores raw transactions JSON files
│── /transactions_summary_output        # Stores transaction summary CSV files
```

## 🧑🏻‍💻 Try It in GitPod

[![Open in Gitpod](https://gitpod.io/button/open-in-gitpod.svg)](https://gitpod.io/?autostart=true#https://github.com/ed-marquez/hedera-testnet-accounts-created-analyzer)

## ⬇️ Run It Locally

### **1️⃣ Clone the Repository**

```sh
git clone https://github.com/ed-marquez/hedera-testnet-accounts-created-analyzer.git
cd hedera-testnet-accounts-created-analyzer
```

### **2️⃣ Install Dependencies**

```sh
npm install
```

> Ensure you have **Node.js 18+** installed.

### **3️⃣ Run the Script**

```sh
node index.js
```

## 📊 Output Files

- **Transactions Data:** Stored in `/transactions/YYYY-MM-DD-transactions.json`
- **Summary Report:** Stored in `/transactions_summary_output/YYYY-MM-DD-transactions_summary.csv`

## 🛠️ Process Overview

1. **Fetch Transactions**

   - Retrieves transactions from Hedera Testnet.
   - Saves the data in the `/transactions` folder.

2. **Analyze Transactions**
   - Counts total transactions.
   - Counts unique transactions by `transaction_id`.
   - Groups transactions by `YYYY-MM`.
   - Outputs a CSV report in `/transactions_summary_output`.

---
