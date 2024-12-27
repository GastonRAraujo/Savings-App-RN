-- 1. create DB
-- sqlite3 mySQLiteDB.db

-- 2. create table
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

-- 3. insert data
INSERT INTO Expenses(name, amountUSD, amountARS, date)
VALUES('Expenses', 1000, 1000000, '2024-01-01');

INSERT INTO Income(name, amountUSD, amountARS, date)
VALUES('Income', 2000, 2000000, '2024-01-01');

INSERT INTO GrossIncome(amountUSD, amountARS, date)
VALUES(2000, 2000000, '2024-01-01');

INSERT INTO Portfolio(symbol, amount, ppcARS, ppcUSD, lastPriceARS, lastPriceUSD, date)
VALUES('AAPL', 10, 1000, 100, 2000, 200, '2024-01-01');

INSERT INTO PortfolioValue(priceUSD, priceARS, date)
VALUES(2000, 2000000, '2024-01-01');

INSERT INTO Operations(numero, fecha, tipo, simbolo, cantidad, priceARS, priceUSD)
VALUES(1, '2024-01-01', 'BUY', 'AAPL', 10, 1000, 100);

-- 4. select data
SELECT * FROM Expenses;
SELECT * FROM Income;
SELECT * FROM GrossIncome;
SELECT * FROM Portfolio;
SELECT * FROM PortfolioValue;
SELECT * FROM Operations;

-- 5 delete data
DELETE FROM Expenses WHERE id = 1;
DELETE FROM Income WHERE id = 1;
DELETE FROM GrossIncome WHERE id = 1;
DELETE FROM Portfolio WHERE id = 1;
DELETE FROM PortfolioValue WHERE id = 1;
DELETE FROM Operations WHERE id = 1;

-- 5. exit db
.quit
