-- 1. create DB
-- sqlite3 mySQLiteDB.db

-- 2. create table
CREATE TABLE IF NOT EXISTS Savings(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    amount REAL NOT NULL,
    date TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS Expenses(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    amount REAL NOT NULL,
    date TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS GrossIncome(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
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
-- 3. insert data
INSERT INTO Savings(name, amount, date) VALUES('Savings', 1000, '2024-01-01');
INSERT INTO Expenses(name, amount, date) VALUES('Expenses', 500, '2024-01-01');
INSERT INTO Income(name, amountUSD, date) VALUES('Income', 2000, 2000000, '2024-01-01');

-- 4. select data
SELECT * FROM Savings;
SELECT * FROM Expenses;
SELECT * FROM Income;

-- 5. exit db
.quit