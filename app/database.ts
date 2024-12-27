import { SQLiteDatabase } from "expo-sqlite";
import iolService from "../services/IolService";

export async function loadDatabase(db: SQLiteDatabase) {
  await db.execAsync(`
  PRAGMA journal_mode = 'wal';
  CREATE TABLE IF NOT EXISTS Expenses(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    amountUSD REAL NOT NULL,
    amountARS REAL NOT NULL,
    date TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS Income(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    amountUSD REAL NOT NULL,
    amountARS REAL NOT NULL,
    date TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS GrossIncome(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    amountUSD REAL NOT NULL,
    amountARS REAL NOT NULL,
    date TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS Portfolio(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol TEXT NOT NULL,
    description TEXT NOT NULL,
    type TEXT NOT NULL,
    amount REAL NOT NULL,
    ppcARS REAL NOT NULL,
    ppcUSD REAL NOT NULL,
    lastPriceARS REAL NOT NULL,
    lastPriceUSD REAL NOT NULL,
    date TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS PortfolioValue(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    priceUSD REAL NOT NULL,
    priceARS REAL NOT NULL,
    date TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS Operations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  numero INTEGER,
  fecha TEXT,
  tipo TEXT,
  simbolo TEXT,
  cantidad REAL,
  priceARS REAL,
  priceUSD REAL
);
  `);
  console.log("Database loaded");

};


//////////////////////////////////////////////////////////////
// 2) Check if the Portfolio table is empty
//////////////////////////////////////////////////////////////
export async function isPortfolioEmpty(db: any): Promise<boolean> {
  const result = await db.getFirstAsync(
    "SELECT COUNT(*) AS count FROM Portfolio"
  );
  return result.count === 0;
}

//////////////////////////////////////////////////////////////
// 3) Populate the Portfolio table if it’s empty
//////////////////////////////////////////////////////////////
export async function populatePortfolioTable(db: any) {
  try {
    // Fetch the portfolio from the IOL service
    const portfolioData = await iolService.getPortfolio();
    // Insert each item
    for (const item of portfolioData) {
      await db.runAsync(
        `INSERT INTO Portfolio (symbol, description, type, ppcARS, ppcUSD, amount, lastPriceARS, lastPriceUSD, date)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          item.symbol,
          item.description,
          item.type,
          item.ppcARS,
          item.ppcUSD,
          item.amount,
          item.ppcARS,
          item.ppcUSD,
          new Date().toISOString(),
        ]
      );
    }
    console.log("Portfolio table populated successfully.");
  } catch (error) {
    console.error("Error populating portfolio table:", error);
  }
}

//////////////////////////////////////////////////////////////
// 4) Initialize the Portfolio (create if empty)
//////////////////////////////////////////////////////////////
export async function initializePortfolio(db: any) {
  try {
    const empty = await isPortfolioEmpty(db);
    if (empty) {
      await populatePortfolioTable(db);
    }
  } catch (error) {
    console.error("Error initializing portfolio:", error);
    throw error;
  }
}
