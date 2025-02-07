// db/setup.js
import sqlite3 from "sqlite3";
import { open } from "sqlite";

export async function setupDatabase() {
	const db = await open({
		filename: "./database.sqlite",
		driver: sqlite3.Database,
	});

	// Create tables
	await db.exec(`
    CREATE TABLE IF NOT EXISTS account_create_transactions (
      consensus_timestamp TEXT PRIMARY KEY,
      id TEXT,
      type INTEGER,
      nonce INTEGER,
      entity_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS account_activity (
      consensus_timestamp TEXT PRIMARY KEY,
      id TEXT,
      type INTEGER,
      result INTEGER,
      payer_account_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS last_execution (
      id INTEGER PRIMARY KEY,
      last_timestamp TEXT,
      execution_time DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

	return db;
}
