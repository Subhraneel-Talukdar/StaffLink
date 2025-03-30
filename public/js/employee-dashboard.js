document.addEventListener('DOMContentLoaded', () => {
    // Initialize employee dashboard
    initializeEmployeeDashboard();
});

function initializeEmployeeDashboard() {
    // Load initial data
    loadEmployeeProfile();
    loadPayrollData();
    loadPerformanceData();
    loadTokenData();

    // Setup event listeners
    setupEventListeners();
}

function setupEventListeners() {
    // Month selector for payroll
    const monthSelector = document.querySelector('#payrollMonth');
    if (monthSelector) {
        monthSelector.addEventListener('change', loadPayrollData);
    }

    // Send tokens form
    const sendTokensForm = document.querySelector('#sendTokensForm');
    if (sendTokensForm) {
        sendTokensForm.addEventListener('submit', handleSendTokens);
    }

    // Request leave form
    const requestLeaveForm = document.querySelector('#requestLeaveForm');
    if (requestLeaveForm) {
        requestLeaveForm.addEventListener('submit', handleLeaveRequest);
    }
}

async function loadEmployeeProfile() {
    try {
        const response = await fetch('/api/employee/profile');
        if (!response.ok) throw new Error('Failed to load profile');
        const profile = await response.json();
        updateEmployeeProfile(profile);
    } catch (error) {
        showError('Failed to load profile');
    }
}

function updateEmployeeProfile(profile) {
    // Update profile information
    document.querySelector('.employee-name').textContent = profile.fullName;
    document.querySelector('.employee-title').textContent = profile.department;
    document.querySelector('.employee-avatar').src = profile.profilePicture || '/images/default-avatar.png';

    // Update stats
    document.querySelector('#currentSalary').textContent = profile.salary;
    document.querySelector('#tokenBalance').textContent = profile.tokenBalance;
    document.querySelector('#workingHours').textContent = profile.workingHours;
    document.querySelector('#leaveBalance').textContent = profile.leaveBalance;
}

async function loadPayrollData() {
    try {
        const month = document.querySelector('#payrollMonth').value;
        const response = await fetch(`/api/employee/payroll?month=${month}`);
        if (!response.ok) throw new Error('Failed to load payroll data');
        const data = await response.json();
        updatePayrollDetails(data);
    } catch (error) {
        showError('Failed to load payroll data');
    }
}

function updatePayrollDetails(data) {
    // Update salary information
    document.querySelector('#baseSalary').textContent = data.baseSalary;
    document.querySelector('#bonus').textContent = data.bonus || 0;
    document.querySelector('#deductions').textContent = data.deductions || 0;
    document.querySelector('#netSalary').textContent = data.netSalary;

    // Update incentives
    const incentivesList = document.querySelector('#incentivesList');
    if (incentivesList) {
        incentivesList.innerHTML = data.incentives.map(incentive => `
            <div class="incentive-item">
                <div class="incentive-info">
                    <span class="incentive-name">${incentive.name}</span>
                    <span class="incentive-amount">${incentive.amount}</span>
                </div>
                <span class="incentive-date">${new Date(incentive.date).toLocaleDateString()}</span>
            </div>
        `).join('');
    }
}

async function loadPerformanceData() {
    try {
        const response = await fetch('/api/employee/performance');
        if (!response.ok) throw new Error('Failed to load performance data');
        const data = await response.json();
        updatePerformanceDetails(data);
    } catch (error) {
        showError('Failed to load performance data');
    }
}

function updatePerformanceDetails(data) {
    // Update performance metrics
    document.querySelector('#totalWorkingHours').textContent = data.workingHours;
    document.querySelector('#totalLeaveDays').textContent = data.leaveDays;
    document.querySelector('#totalAbsentDays').textContent = data.absentDays;
    document.querySelector('#totalOvertimeHours').textContent = data.overtimeHours;

    // Update leave history
    const leaveHistory = document.querySelector('#leaveHistory');
    if (leaveHistory) {
        leaveHistory.innerHTML = data.leaveHistory.map(leave => `
            <div class="leave-item">
                <div class="leave-info">
                    <span class="leave-type">${leave.type}</span>
                    <span class="leave-duration">${leave.startDate} - ${leave.endDate}</span>
                </div>
                <span class="leave-status ${leave.status}">${leave.status}</span>
            </div>
        `).join('');
    }
}

async function loadTokenData() {
    try {
        const response = await fetch('/api/employee/tokens');
        if (!response.ok) throw new Error('Failed to load token data');
        const data = await response.json();
        updateTokenDetails(data);
    } catch (error) {
        showError('Failed to load token data');
    }
}

function updateTokenDetails(data) {
    // Update token balance
    document.querySelector('#tokenBalance').textContent = data.balance;

    // Update token transactions
    const transactionsList = document.querySelector('#tokenTransactions');
    if (transactionsList) {
        transactionsList.innerHTML = data.transactions.map(transaction => `
            <div class="transaction-item">
                <div class="transaction-info">
                    <span class="transaction-type ${transaction.type}">${transaction.type}</span>
                    <span class="transaction-amount">${transaction.amount}</span>
                </div>
                <span class="transaction-date">${new Date(transaction.date).toLocaleDateString()}</span>
            </div>
        `).join('');
    }
}

// Event Handlers
async function handleSendTokens(e) {
    e.preventDefault();
    const form = e.target;
    const recipientId = form.querySelector('#recipientId').value;
    const amount = form.querySelector('#tokenAmount').value;

    try {
        const response = await fetch('/api/tokens/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ recipientId, amount })
        });

        if (!response.ok) throw new Error('Failed to send tokens');
        
        showSuccess('Tokens sent successfully');
        loadTokenData();
        form.reset();
    } catch (error) {
        showError('Failed to send tokens');
    }
}

async function handleLeaveRequest(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const data = {
        type: formData.get('leaveType'),
        startDate: formData.get('startDate'),
        endDate: formData.get('endDate'),
        reason: formData.get('reason')
    };

    try {
        const response = await fetch('/api/employee/leave/request', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) throw new Error('Failed to submit leave request');
        
        showSuccess('Leave request submitted successfully');
        loadPerformanceData();
        form.reset();
    } catch (error) {
        showError('Failed to submit leave request');
    }
}

// Utility Functions
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = `
        <i class="fas fa-exclamation-circle"></i>
        <span>${message}</span>
    `;
    document.querySelector('.dashboard-content').prepend(errorDiv);
    setTimeout(() => errorDiv.remove(), 5000);
}

function showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.innerHTML = `
        <i class="fas fa-check-circle"></i>
        <span>${message}</span>
    `;
    document.querySelector('.dashboard-content').prepend(successDiv);
    setTimeout(() => successDiv.remove(), 5000);
} 