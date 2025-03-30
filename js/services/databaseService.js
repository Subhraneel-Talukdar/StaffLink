const mysql = require('mysql2/promise');
const dbConfig = require('../config/database');

class DatabaseService {
    constructor() {
        this.pool = mysql.createPool(dbConfig);
    }

    // Employee Operations
    async createEmployee(employeeData) {
        const connection = await this.pool.getConnection();
        try {
            await connection.beginTransaction();

            // Insert into Employees table
            const [result] = await connection.execute(
                `INSERT INTO Employees (EmployeeID, PasswordHash, Designation, DepartmentID, IsAdmin, DateOfJoining)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    employeeData.id,
                    employeeData.passwordHash,
                    employeeData.designation,
                    employeeData.departmentId,
                    employeeData.isAdmin,
                    new Date()
                ]
            );

            // If bank details are provided, insert them
            if (employeeData.bankDetails) {
                await connection.execute(
                    `INSERT INTO BankDetails (EmployeeID, IFSCCode, AccountNo, BankName, BranchName)
                     VALUES (?, ?, ?, ?, ?)`,
                    [
                        employeeData.id,
                        employeeData.bankDetails.ifscCode,
                        employeeData.bankDetails.accountNo,
                        employeeData.bankDetails.bankName,
                        employeeData.bankDetails.branchName
                    ]
                );
            }

            await connection.commit();
            return result.insertId;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    async getEmployeeById(employeeId) {
        const [rows] = await this.pool.execute(
            `SELECT e.*, d.DeptName, b.*
             FROM Employees e
             LEFT JOIN Departments d ON e.DepartmentID = d.DeptID
             LEFT JOIN BankDetails b ON e.EmployeeID = b.EmployeeID
             WHERE e.EmployeeID = ?`,
            [employeeId]
        );
        return rows[0];
    }

    async verifyEmployeeCredentials(employeeId, passwordHash) {
        const [rows] = await this.pool.execute(
            `SELECT EmployeeID, PasswordHash, Designation, DepartmentID, IsAdmin
             FROM Employees
             WHERE EmployeeID = ? AND PasswordHash = ?`,
            [employeeId, passwordHash]
        );
        return rows[0];
    }

    // Department Operations
    async getDepartments() {
        const [rows] = await this.pool.execute('SELECT * FROM Departments');
        return rows;
    }

    async getDepartmentById(deptId) {
        const [rows] = await this.pool.execute(
            'SELECT * FROM Departments WHERE DeptID = ?',
            [deptId]
        );
        return rows[0];
    }

    // Attendance Operations
    async recordAttendance(employeeId, entryTime) {
        const [result] = await this.pool.execute(
            `INSERT INTO Attendance (EmployeeID, EntryTime, Date)
             VALUES (?, ?, CURDATE())`,
            [employeeId, entryTime]
        );
        return result.insertId;
    }

    async updateAttendance(attendanceId, exitTime) {
        const [result] = await this.pool.execute(
            `UPDATE Attendance
             SET ExitTime = ?
             WHERE AttendanceID = ?`,
            [exitTime, attendanceId]
        );
        return result.affectedRows > 0;
    }

    // Salary Operations
    async getEmployeeSalary(employeeId, monthYear) {
        const [rows] = await this.pool.execute(
            `SELECT s.*, p.PaymentDate, p.TransactionID
             FROM Salary s
             LEFT JOIN Payments p ON s.SalaryID = p.SalaryID
             WHERE s.EmployeeID = ? AND s.MonthYear = ?`,
            [employeeId, monthYear]
        );
        return rows[0];
    }

    async createSalaryRecord(salaryData) {
        const [result] = await this.pool.execute(
            `INSERT INTO Salary (EmployeeID, BaseSalary, Deductions, Incentives, MonthYear)
             VALUES (?, ?, ?, ?, ?)`,
            [
                salaryData.employeeId,
                salaryData.baseSalary,
                salaryData.deductions,
                salaryData.incentives,
                salaryData.monthYear
            ]
        );
        return result.insertId;
    }

    async recordPayment(salaryId, transactionId) {
        const [result] = await this.pool.execute(
            `INSERT INTO Payments (SalaryID, PaymentDate, TransactionID)
             VALUES (?, CURDATE(), ?)`,
            [salaryId, transactionId]
        );
        return result.insertId;
    }

    // Bank Details Operations
    async updateBankDetails(employeeId, bankDetails) {
        const [result] = await this.pool.execute(
            `UPDATE BankDetails
             SET IFSCCode = ?, AccountNo = ?, BankName = ?, BranchName = ?
             WHERE EmployeeID = ?`,
            [
                bankDetails.ifscCode,
                bankDetails.accountNo,
                bankDetails.bankName,
                bankDetails.branchName,
                employeeId
            ]
        );
        return result.affectedRows > 0;
    }

    // Close database connection pool
    async close() {
        await this.pool.end();
    }
}

// Create and export a singleton instance
const databaseService = new DatabaseService();
module.exports = databaseService; 