document.addEventListener('DOMContentLoaded', function() {
    // Initialize dashboard
    loadEmployees();
    setupEventListeners();

    // Load employees data
    async function loadEmployees() {
        try {
            const response = await fetch('/api/admin/employees', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });

            const data = await response.json();

            if (data.success) {
                updateEmployeesTable(data.data);
                updateDepartmentFilter(data.data);
            } else {
                showError('Failed to load employees');
            }
        } catch (error) {
            console.error('Error loading employees:', error);
            showError('Error loading employees');
        }
    }

    // Update employees table
    function updateEmployeesTable(employees) {
        const tbody = document.getElementById('employeesTableBody');
        if (!tbody) return;

        tbody.innerHTML = employees.map(employee => `
            <tr>
                <td>${employee.id}</td>
                <td>
                    <div class="employee-info">
                        <img src="${employee.profilePicture || '/images/default-avatar.png'}" alt="Profile" class="employee-avatar">
                        <div>
                            <div class="employee-name">${employee.fullName}</div>
                            <div class="employee-title">${employee.department}</div>
                        </div>
                    </div>
                </td>
                <td>${employee.department}</td>
                <td>${employee.email}</td>
                <td>
                    <span class="status-badge ${employee.isActive ? 'active' : 'inactive'}">
                        ${employee.isActive ? 'Active' : 'Inactive'}
                    </span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button onclick="editEmployee(${employee.id})" class="btn-icon" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="viewEmployee(${employee.id})" class="btn-icon" title="View">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button onclick="deleteEmployee(${employee.id})" class="btn-icon delete" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    // Update department filter
    function updateDepartmentFilter(employees) {
        const departments = [...new Set(employees.map(emp => emp.department))];
        const departmentFilter = document.getElementById('departmentFilter');
        if (!departmentFilter) return;

        departmentFilter.innerHTML = `
            <option value="">All Departments</option>
            ${departments.map(dept => `
                <option value="${dept}">${dept}</option>
            `).join('')}
        `;
    }

    // Setup event listeners
    function setupEventListeners() {
        // Department filter
        const departmentFilter = document.getElementById('departmentFilter');
        if (departmentFilter) {
            departmentFilter.addEventListener('change', filterEmployees);
        }

        // Status filter
        const statusFilter = document.getElementById('statusFilter');
        if (statusFilter) {
            statusFilter.addEventListener('change', filterEmployees);
        }

        // Search input
        const searchInput = document.querySelector('.search-bar input');
        if (searchInput) {
            searchInput.addEventListener('input', filterEmployees);
        }

        // Add Employee button
        const addEmployeeBtn = document.querySelector('.btn.primary');
        if (addEmployeeBtn) {
            addEmployeeBtn.addEventListener('click', () => {
                window.location.href = '/create-account?type=employee';
            });
        }
    }

    // Filter employees
    function filterEmployees() {
        const department = document.getElementById('departmentFilter').value.toLowerCase();
        const status = document.getElementById('statusFilter').value.toLowerCase();
        const searchTerm = document.querySelector('.search-bar input').value.toLowerCase();

        const rows = document.querySelectorAll('#employeesTableBody tr');
        
        rows.forEach(row => {
            const employeeDepartment = row.children[2].textContent.toLowerCase();
            const employeeStatus = row.querySelector('.status-badge').textContent.toLowerCase();
            const employeeData = row.textContent.toLowerCase();

            const departmentMatch = !department || employeeDepartment === department;
            const statusMatch = !status || employeeStatus === status;
            const searchMatch = !searchTerm || employeeData.includes(searchTerm);

            row.style.display = departmentMatch && statusMatch && searchMatch ? '' : 'none';
        });
    }

    // Error handling
    function showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        
        const container = document.querySelector('.dashboard-content');
        container.insertBefore(errorDiv, container.firstChild);
        
        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
    }
});

// Employee actions
function editEmployee(id) {
    // Implement edit employee functionality
    console.log('Edit employee:', id);
}

function viewEmployee(id) {
    // Implement view employee functionality
    console.log('View employee:', id);
}

function deleteEmployee(id) {
    if (confirm('Are you sure you want to delete this employee?')) {
        fetch(`/api/admin/employees/${id}`, {
            method: 'DELETE',
            credentials: 'include'
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Reload employees list
                loadEmployees();
            } else {
                showError(data.message || 'Failed to delete employee');
            }
        })
        .catch(error => {
            console.error('Error deleting employee:', error);
            showError('Error deleting employee');
        });
    }
} 