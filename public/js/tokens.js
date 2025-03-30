document.addEventListener('DOMContentLoaded', function() {
    // Initialize token section
    initializeTokenSection();

    // Event listeners for token actions
    document.getElementById('transferTokensBtn').addEventListener('click', showTransferModal);
    document.getElementById('setupPrepaidBtn').addEventListener('click', showPrepaidModal);
    document.getElementById('purchaseTokensBtn').addEventListener('click', showPurchaseModal);
    
    // Form submissions
    document.getElementById('transferForm').addEventListener('submit', handleTransfer);
    document.getElementById('prepaidForm').addEventListener('submit', handlePrepaid);
    document.getElementById('purchaseForm').addEventListener('submit', handlePurchase);
    
    // Close modal buttons
    document.querySelectorAll('.close-modal').forEach(button => {
        button.addEventListener('click', closeModals);
    });

    // Admin-specific initialization
    if (isAdmin()) {
        document.querySelector('.admin-section').style.display = 'block';
        document.getElementById('distributeTokensBtn').addEventListener('click', handleDistribution);
        loadTokenStats();
    }
});

// Initialize token section
async function initializeTokenSection() {
    try {
        const response = await fetch('/api/token/balance');
        const data = await response.json();
        
        if (data.success) {
            updateBalanceDisplay(data.data);
            await loadEmployeeList();
        }
    } catch (error) {
        console.error('Error initializing token section:', error);
        showError('Failed to load token information');
    }
}

// Update balance display
function updateBalanceDisplay(tokenData) {
    document.getElementById('tokenBalance').textContent = tokenData.balance.toFixed(2);
    document.getElementById('prepaidBalance').textContent = tokenData.prepaid_balance.toFixed(2);
    document.getElementById('postpaidBalance').textContent = tokenData.postpaid_balance.toFixed(2);
}

// Load employee list for transfer modal
async function loadEmployeeList() {
    try {
        const response = await fetch('/api/employees/list');
        const data = await response.json();
        
        if (data.success) {
            const select = document.querySelector('select[name="recipient_id"]');
            select.innerHTML = data.employees.map(emp => 
                `<option value="${emp.id}">${emp.full_name}</option>`
            ).join('');
        }
    } catch (error) {
        console.error('Error loading employee list:', error);
        showError('Failed to load employee list');
    }
}

// Modal handlers
function showTransferModal() {
    document.getElementById('transferModal').classList.add('active');
}

function showPrepaidModal() {
    document.getElementById('prepaidModal').classList.add('active');
    updateMaxPrepaid();
}

function showPurchaseModal() {
    document.getElementById('purchaseModal').classList.add('active');
}

function closeModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('active');
    });
}

// Update max prepaid amount
async function updateMaxPrepaid() {
    try {
        const response = await fetch('/api/employees/current');
        const data = await response.json();
        
        if (data.success) {
            const maxPrepaid = (data.employee.salary * 0.2).toFixed(2);
            document.getElementById('maxPrepaid').textContent = maxPrepaid;
        }
    } catch (error) {
        console.error('Error getting max prepaid amount:', error);
    }
}

// Form handlers
async function handleTransfer(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    try {
        const response = await fetch('/api/token/transfer', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                recipient_id: formData.get('recipient_id'),
                amount: parseFloat(formData.get('amount'))
            })
        });

        const data = await response.json();
        
        if (data.success) {
            showSuccess('Transfer successful');
            closeModals();
            initializeTokenSection();
        } else {
            showError(data.message);
        }
    } catch (error) {
        console.error('Error during transfer:', error);
        showError('Transfer failed');
    }
}

async function handlePrepaid(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    try {
        const response = await fetch('/api/token/prepaid', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                amount: parseFloat(formData.get('amount'))
            })
        });

        const data = await response.json();
        
        if (data.success) {
            showSuccess('Prepaid setup successful');
            closeModals();
            initializeTokenSection();
        } else {
            showError(data.message);
        }
    } catch (error) {
        console.error('Error setting up prepaid:', error);
        showError('Prepaid setup failed');
    }
}

async function handlePurchase(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    try {
        const response = await fetch('/api/token/purchase', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                amount: parseFloat(formData.get('amount')),
                payment_type: formData.get('payment_type')
            })
        });

        const data = await response.json();
        
        if (data.success) {
            showSuccess('Purchase successful');
            closeModals();
            initializeTokenSection();
        } else {
            showError(data.message);
        }
    } catch (error) {
        console.error('Error during purchase:', error);
        showError('Purchase failed');
    }
}

// Admin functions
async function handleDistribution() {
    try {
        const response = await fetch('/api/token/distribute', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();
        
        if (data.success) {
            showSuccess('Tokens distributed successfully');
            loadTokenStats();
        } else {
            showError(data.message);
        }
    } catch (error) {
        console.error('Error distributing tokens:', error);
        showError('Token distribution failed');
    }
}

async function loadTokenStats() {
    try {
        const response = await fetch('/api/token/stats');
        const data = await response.json();
        
        if (data.success) {
            const tbody = document.getElementById('tokenStatsBody');
            tbody.innerHTML = data.data.map(stat => `
                <tr>
                    <td>${stat.full_name}</td>
                    <td>${stat.balance.toFixed(2)}</td>
                    <td>${stat.prepaid_balance.toFixed(2)}</td>
                    <td>${stat.postpaid_balance.toFixed(2)}</td>
                    <td>${new Date(stat.last_distribution).toLocaleDateString()}</td>
                    <td>${(stat.salary * 0.01 * 100).toFixed(2)}</td>
                </tr>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading token stats:', error);
        showError('Failed to load token statistics');
    }
}

// Utility functions
function isAdmin() {
    // This should be replaced with actual admin check logic
    return document.body.hasAttribute('data-is-admin');
}

function showSuccess(message) {
    // Implement your success message display logic
    alert(message); // Replace with better UI
}

function showError(message) {
    // Implement your error message display logic
    alert(message); // Replace with better UI
} 