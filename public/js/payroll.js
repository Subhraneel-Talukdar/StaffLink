// Load payroll records from the server
async function loadPayroll() {
    try {
        const response = await fetch('/api/payroll');
        if (!response.ok) throw new Error('Failed to fetch payroll records');
        const records = await response.json();
        displayPayroll(records);
        updatePayrollStats(records);
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('payrollTableBody').innerHTML = `
            <tr><td colspan="6" class="error-message">Failed to load payroll data</td></tr>
        `;
    }
}

// Display payroll records in the table
function displayPayroll(records) {
    const tableBody = document.getElementById('payrollTableBody');
    if (!records || records.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6">No payroll records found</td></tr>';
        return;
    }

    tableBody.innerHTML = records.map(record => `
        <tr>
            <td>${record.employee_name}</td>
            <td>${record.department}</td>
            <td>$${record.basic_salary.toLocaleString()}</td>
            <td>$${record.allowances.toLocaleString()}</td>
            <td>$${record.deductions.toLocaleString()}</td>
            <td>$${record.net_pay.toLocaleString()}</td>
        </tr>
    `).join('');
}

// Update payroll statistics
function updatePayrollStats(records) {
    const totalPayroll = records.reduce((sum, record) => sum + record.net_pay, 0);
    const pendingPayments = records.filter(record => record.status === 'Pending').length;
    const processedPayments = records.filter(record => record.status === 'Processed').length;
    const avgSalary = totalPayroll / records.length;

    document.getElementById('totalPayroll').textContent = `$${totalPayroll.toLocaleString()}`;
    document.getElementById('pendingPayments').textContent = pendingPayments;
    document.getElementById('processedPayments').textContent = processedPayments;
    document.getElementById('avgSalary').textContent = `$${Math.round(avgSalary).toLocaleString()}`;
}

// Show process payroll modal
function showProcessPayrollModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h2>Process Payroll</h2>
            <form id="processPayrollForm" onsubmit="processPayroll(event)">
                <div class="form-group">
                    <label for="month">Month</label>
                    <select id="month" name="month" required>
                        ${generateMonthOptions()}
                    </select>
                </div>
                <div class="form-group">
                    <label for="year">Year</label>
                    <select id="year" name="year" required>
                        ${generateYearOptions()}
                    </select>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
                    <button type="submit" class="btn-primary">Process Payroll</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
}

// Generate month options
function generateMonthOptions() {
    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const currentMonth = new Date().getMonth();
    
    return months.map((month, index) => `
        <option value="${index + 1}" ${index === currentMonth ? 'selected' : ''}>
            ${month}
        </option>
    `).join('');
}

// Generate year options
function generateYearOptions() {
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
    
    return years.map(year => `
        <option value="${year}" ${year === currentYear ? 'selected' : ''}>
            ${year}
        </option>
    `).join('');
}

// Process payroll
async function processPayroll(event) {
    event.preventDefault();
    const form = event.target;
    const payrollData = {
        month: form.month.value,
        year: form.year.value
    };

    try {
        const response = await fetch('/api/payroll/process', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payrollData)
        });

        if (!response.ok) throw new Error('Failed to process payroll');
        
        closeModal();
        loadPayroll();
        showNotification('Payroll processed successfully', 'success');
    } catch (error) {
        console.error('Error:', error);
        showNotification('Failed to process payroll', 'error');
    }
}

// Export payslips
async function exportPayslips() {
    try {
        const response = await fetch('/api/payroll/export', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) throw new Error('Failed to export payslips');
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'payslips.pdf';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
        
        showNotification('Payslips exported successfully', 'success');
    } catch (error) {
        console.error('Error:', error);
        showNotification('Failed to export payslips', 'error');
    }
}

// Close modal
function closeModal() {
    const modal = document.querySelector('.modal');
    if (modal) {
        modal.remove();
    }
}

// Show notification
function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Initialize when the page loads
document.addEventListener('DOMContentLoaded', () => {
    loadPayroll();
    
    // Add event listeners for buttons
    const processButton = document.querySelector('.action-btn');
    const exportButton = document.querySelector('.action-btn:nth-child(2)');
    
    if (processButton) {
        processButton.addEventListener('click', showProcessPayrollModal);
    }
    
    if (exportButton) {
        exportButton.addEventListener('click', exportPayslips);
    }
}); 