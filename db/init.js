const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    // Create users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        fullName TEXT NOT NULL,
        department TEXT,
        phone TEXT,
        role TEXT NOT NULL CHECK(role IN ('admin', 'employee')),
        salary DECIMAL(10,2) DEFAULT 0.00,
        tokenBalance INTEGER DEFAULT 0,
        tokenAllowance INTEGER DEFAULT 0,
        profilePicture TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Create salary transactions table
    db.run(`CREATE TABLE IF NOT EXISTS salary_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('credit', 'debit')),
        description TEXT,
        transactionDate DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id)
    )`);

    // Create token transactions table
    db.run(`CREATE TABLE IF NOT EXISTS token_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fromUserId INTEGER,
        toUserId INTEGER,
        amount INTEGER NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('buy', 'sell', 'transfer', 'allowance')),
        rate DECIMAL(10,2),
        status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'completed', 'cancelled')),
        transactionDate DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (fromUserId) REFERENCES users(id),
        FOREIGN KEY (toUserId) REFERENCES users(id)
    )`);

    // Create token rates table
    db.run(`CREATE TABLE IF NOT EXISTS token_rates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        rate DECIMAL(10,2) NOT NULL,
        effectiveDate DATETIME DEFAULT CURRENT_TIMESTAMP,
        isActive BOOLEAN DEFAULT 1
    )`);

    // Insert default token rate
    db.run(`INSERT OR IGNORE INTO token_rates (rate) VALUES (10.00)`);

    // Create default admin account with 10 tokens
    db.run(`INSERT OR IGNORE INTO users (email, password, fullName, role, tokenBalance, salary) 
            VALUES (?, ?, ?, 'admin', 10, 0.00)`,
        ['admin@company.com', '$2b$10$YourHashedPasswordHere', 'Admin User']
    );
});

module.exports = db; 