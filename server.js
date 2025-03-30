require('dotenv').config();
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const sqlite3 = require('sqlite3').verbose();

const app = express();

// Create SQLite database connection
const db = new sqlite3.Database('./data/employee.db', (err) => {
    if (err) {
        console.error('Error connecting to the database:', err);
        return;
    }
    console.log('Connected to SQLite database');
    
    // Create tables if they don't exist
    db.serialize(() => {
        db.run(`
            CREATE TABLE IF NOT EXISTS employees (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                department TEXT NOT NULL,
                position TEXT NOT NULL,
                status TEXT DEFAULT 'Active',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        db.run(`
            CREATE TABLE IF NOT EXISTS departments (
                id TEXT PRIMARY KEY,
                name TEXT UNIQUE NOT NULL,
                head TEXT,
                total_employees INTEGER DEFAULT 0
            )
        `);

        // New tables
        db.run(`
            CREATE TABLE IF NOT EXISTS attendance (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                employee_id TEXT,
                date DATE,
                check_in TIME,
                check_out TIME,
                status TEXT,
                FOREIGN KEY (employee_id) REFERENCES employees(id)
            )
        `);

        db.run(`
            CREATE TABLE IF NOT EXISTS payroll (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                employee_id TEXT,
                month INTEGER,
                year INTEGER,
                basic_salary DECIMAL(10,2),
                allowances DECIMAL(10,2),
                deductions DECIMAL(10,2),
                net_pay DECIMAL(10,2),
                status TEXT DEFAULT 'Pending',
                FOREIGN KEY (employee_id) REFERENCES employees(id)
            )
        `);

        db.run(`
            CREATE TABLE IF NOT EXISTS performance (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                employee_id TEXT,
                review_period TEXT,
                score INTEGER,
                rating TEXT,
                comments TEXT,
                status TEXT DEFAULT 'Pending',
                FOREIGN KEY (employee_id) REFERENCES employees(id)
            )
        `);

        // Check if employees table is empty
        db.get('SELECT COUNT(*) as count FROM employees', [], (err, row) => {
            if (err) {
                console.error('Error checking employees:', err);
                return;
            }

            if (row.count === 0) {
                // Insert sample data
                const employees = [
                    ['EMP001', 'John Doe', 'john.doe@company.com', 'Engineering', 'Senior Developer', 'Active'],
                    ['EMP002', 'Jane Smith', 'jane.smith@company.com', 'HR', 'HR Manager', 'Active'],
                    ['EMP003', 'Mike Wilson', 'mike.wilson@company.com', 'Sales', 'Sales Executive', 'Active'],
                    ['EMP004', 'Sarah Brown', 'sarah.brown@company.com', 'Marketing', 'Marketing Lead', 'On Leave'],
                    ['EMP005', 'Tom Harris', 'tom.harris@company.com', 'Engineering', 'Software Engineer', 'Active']
                ];

                const departments = [
                    ['DEP001', 'Engineering', 'John Doe', 2],
                    ['DEP002', 'HR', 'Jane Smith', 1],
                    ['DEP003', 'Sales', 'Mike Wilson', 1],
                    ['DEP004', 'Marketing', 'Sarah Brown', 1]
                ];

                const employeeStmt = db.prepare('INSERT INTO employees (id, name, email, department, position, status) VALUES (?, ?, ?, ?, ?, ?)');
                const departmentStmt = db.prepare('INSERT INTO departments (id, name, head, total_employees) VALUES (?, ?, ?, ?)');

                employees.forEach(emp => employeeStmt.run(emp));
                departments.forEach(dept => departmentStmt.run(dept));

                employeeStmt.finalize();
                departmentStmt.finalize();

                console.log('Sample data inserted');
            }
        });

        // Insert sample data for departments
        db.run(`
            INSERT OR IGNORE INTO departments (id, name, head, total_employees) VALUES
            ('D001', 'Engineering', 'John Doe', 25),
            ('D002', 'Human Resources', 'Jane Smith', 10),
            ('D003', 'Finance', 'Mike Johnson', 15),
            ('D004', 'Marketing', 'Sarah Wilson', 20),
            ('D005', 'Sales', 'Tom Brown', 30)
        `);

        // Insert sample attendance records
        db.run(`
            INSERT OR IGNORE INTO attendance (employee_id, date, check_in, check_out, status) VALUES
            ('EMP001', date('now'), '09:00:00', '17:00:00', 'Present'),
            ('EMP002', date('now'), '08:45:00', '17:30:00', 'Present'),
            ('EMP003', date('now'), '09:15:00', '17:00:00', 'Late'),
            ('EMP004', date('now'), NULL, NULL, 'Absent'),
            ('EMP005', date('now'), '09:00:00', '17:00:00', 'Present')
        `);

        // Insert sample payroll records
        db.run(`
            INSERT OR IGNORE INTO payroll (employee_id, month, year, basic_salary, allowances, deductions, net_pay, status) VALUES
            ('EMP001', strftime('%m', 'now'), strftime('%Y', 'now'), 5000.00, 1000.00, 500.00, 5500.00, 'Processed'),
            ('EMP002', strftime('%m', 'now'), strftime('%Y', 'now'), 4500.00, 800.00, 400.00, 4900.00, 'Processed'),
            ('EMP003', strftime('%m', 'now'), strftime('%Y', 'now'), 4000.00, 600.00, 300.00, 4300.00, 'Pending'),
            ('EMP004', strftime('%m', 'now'), strftime('%Y', 'now'), 4800.00, 900.00, 450.00, 5250.00, 'Processed'),
            ('EMP005', strftime('%m', 'now'), strftime('%Y', 'now'), 4200.00, 700.00, 350.00, 4550.00, 'Processed')
        `);

        // Insert sample performance records
        db.run(`
            INSERT OR IGNORE INTO performance (employee_id, review_period, score, rating, comments, status) VALUES
            ('EMP001', 'Q1 2024', 95, 'Excellent', 'Outstanding performance in all areas', 'Completed'),
            ('EMP002', 'Q1 2024', 88, 'Good', 'Strong leadership and communication skills', 'Completed'),
            ('EMP003', 'Q1 2024', 75, 'Satisfactory', 'Areas for improvement in time management', 'Completed'),
            ('EMP004', 'Q1 2024', 92, 'Excellent', 'Exceptional project management skills', 'Completed'),
            ('EMP005', 'Q1 2024', 85, 'Good', 'Consistent performance and good team player', 'Completed')
        `);
    });
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));
app.use('/pages', express.static(path.join(__dirname, 'public', 'pages')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/salary-tokens', require('./routes/salary-tokens'));
app.use('/api/creds', require('./routes/creds'));

// API Routes
app.get('/api/employees', (req, res) => {
    db.all('SELECT * FROM employees', [], (err, rows) => {
        if (err) {
            console.error('Error fetching employees:', err);
            res.status(500).json({ error: 'Error fetching employees' });
            return;
        }
        res.json(rows);
    });
});

app.post('/api/employees', (req, res) => {
    const { name, email, department, position } = req.body;
    const id = 'EMP' + String(Date.now()).slice(-6);
    
    db.run(
        'INSERT INTO employees (id, name, email, department, position) VALUES (?, ?, ?, ?, ?)',
        [id, name, email, department, position],
        function(err) {
            if (err) {
                console.error('Error adding employee:', err);
                res.status(500).json({ error: 'Error adding employee' });
                return;
            }
            res.status(201).json({ 
                id, 
                name, 
                email, 
                department, 
                position, 
                status: 'Active' 
            });
        }
    );
});

// Page Routes - Serve HTML files
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin-dashboard.html'));
});

app.get('/pages/employees.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'pages', 'employees.html'));
});

app.get('/pages/departments.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'pages', 'departments.html'));
});

app.get('/pages/attendance.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'pages', 'attendance.html'));
});

app.get('/pages/payroll.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'pages', 'payroll.html'));
});

app.get('/pages/performance.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'pages', 'performance.html'));
});

app.get('/pages/settings.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'pages', 'settings.html'));
});

// API Routes for departments
app.get('/api/departments', (req, res) => {
    db.all('SELECT * FROM departments', [], (err, rows) => {
        if (err) {
            console.error('Error fetching departments:', err);
            res.status(500).json({ error: 'Error fetching departments' });
            return;
        }
        res.json(rows);
    });
});

// API Routes for attendance
app.get('/api/attendance', (req, res) => {
    db.all(`
        SELECT a.*, e.name as employee_name, e.department 
        FROM attendance a 
        JOIN employees e ON a.employee_id = e.id 
        WHERE a.date = date('now')
    `, [], (err, rows) => {
        if (err) {
            console.error('Error fetching attendance:', err);
            res.status(500).json({ error: 'Error fetching attendance' });
            return;
        }
        res.json(rows);
    });
});

// API Routes for payroll
app.get('/api/payroll', (req, res) => {
    db.all(`
        SELECT p.*, e.name as employee_name, e.department 
        FROM payroll p 
        JOIN employees e ON p.employee_id = e.id 
        WHERE p.month = strftime('%m', 'now') 
        AND p.year = strftime('%Y', 'now')
    `, [], (err, rows) => {
        if (err) {
            console.error('Error fetching payroll:', err);
            res.status(500).json({ error: 'Error fetching payroll' });
            return;
        }
        res.json(rows);
    });
});

// API Routes for performance
app.get('/api/performance', (req, res) => {
    const query = `
        SELECT p.*, e.name as employee_name, d.name as department_name
        FROM performance p
        JOIN employees e ON p.employee_id = e.id
        JOIN departments d ON e.department_id = d.id
        ORDER BY p.review_date DESC
    `;
    db.all(query, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// API Route for department performance
app.get('/api/department-performance', (req, res) => {
    const query = `
        SELECT d.name as department, AVG(p.score) as average_score
        FROM performance p
        JOIN employees e ON p.employee_id = e.id
        JOIN departments d ON e.department_id = d.id
        GROUP BY d.id, d.name
        ORDER BY average_score DESC
    `;
    db.all(query, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// API Route for performance trends
app.get('/api/performance-trends', (req, res) => {
    const query = `
        SELECT 
            strftime('%Y-%m', review_date) as review_period,
            AVG(score) as average_score
        FROM performance
        GROUP BY review_period
        ORDER BY review_period DESC
        LIMIT 12
    `;
    db.all(query, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

app.post('/api/performance', (req, res) => {
    const { employee_id, score, comments } = req.body;
    const query = `
        INSERT INTO performance (employee_id, score, comments, review_date, status)
        VALUES (?, ?, ?, date('now'), 'Completed')
    `;
    db.run(query, [employee_id, score, comments], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({
            id: this.lastID,
            message: 'Performance evaluation added successfully'
        });
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// Update the port configuration
const PORT = process.env.PORT || 5500;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}); 