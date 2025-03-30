// Load departments from the server
async function loadDepartments() {
    try {
        const response = await fetch('/api/departments');
        if (!response.ok) throw new Error('Failed to fetch departments');
        const departments = await response.json();
        displayDepartments(departments);
        updateDepartmentStats(departments);
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('departmentTableBody').innerHTML = `
            <tr><td colspan="5" class="error-message">Failed to load department data</td></tr>
        `;
    }
}

// Display departments in the table
function displayDepartments(departments) {
    const tableBody = document.getElementById('departmentTableBody');
    if (!departments || departments.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5">No departments found</td></tr>';
        return;
    }

    tableBody.innerHTML = departments.map(dept => `
        <tr>
            <td>${dept.id}</td>
            <td>${dept.name}</td>
            <td>${dept.head}</td>
            <td>${dept.total_employees}</td>
            <td>
                <div class="actions">
                    <button class="action-icon" onclick="editDepartment('${dept.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-icon" onclick="viewDepartment('${dept.id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Update department statistics
function updateDepartmentStats(departments) {
    const totalEmployees = departments.reduce((sum, dept) => sum + dept.total_employees, 0);
    const totalDepartments = departments.length;
    const avgEmployeesPerDept = totalEmployees / totalDepartments;

    document.getElementById('totalDepartments').textContent = totalDepartments;
    document.getElementById('totalEmployees').textContent = totalEmployees;
    document.getElementById('avgEmployees').textContent = Math.round(avgEmployeesPerDept);
}

// Show add department modal
function showAddDepartmentModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h2>Add New Department</h2>
            <form id="addDepartmentForm" onsubmit="addDepartment(event)">
                <div class="form-group">
                    <label for="name">Department Name</label>
                    <input type="text" id="name" name="name" required>
                </div>
                <div class="form-group">
                    <label for="head">Department Head</label>
                    <input type="text" id="head" name="head" required>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
                    <button type="submit" class="btn-primary">Add Department</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
}

// Add new department
async function addDepartment(event) {
    event.preventDefault();
    const form = event.target;
    const departmentData = {
        name: form.name.value,
        head: form.head.value
    };

    try {
        const response = await fetch('/api/departments', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(departmentData)
        });

        if (!response.ok) throw new Error('Failed to add department');
        
        closeModal();
        loadDepartments();
        showNotification('Department added successfully', 'success');
    } catch (error) {
        console.error('Error:', error);
        showNotification('Failed to add department', 'error');
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
    loadDepartments();
    
    // Add event listener for the "Add New Department" button
    const addButton = document.querySelector('.action-btn');
    if (addButton) {
        addButton.addEventListener('click', showAddDepartmentModal);
    }
}); 