// Database Configuration
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '', // In production, use environment variables
    database: 'employee_management',
    port: 3306,
    connectionLimit: 10,
    waitForConnections: true,
    queueLimit: 0
};

// Export configuration
module.exports = dbConfig; 