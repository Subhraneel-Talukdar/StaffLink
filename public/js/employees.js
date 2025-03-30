// Load employees from the server
async function loadEmployees() {
    try {
        const response = await fetch('/api/employees');
        if (!response.ok) throw new Error('Failed to fetch employees');
        const employees = await response.json();
        displayEmployees(employees);
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('employeeTableBody').innerHTML = `
            <tr><td colspan="6" class="error-message">Failed to load employee data</td></tr>
        `;
    }
}

// Display employees in the table
function displayEmployees(employees) {
    const tableBody = document.getElementById('employeeTableBody');
    if (!employees || employees.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6">No employees found</td></tr>';
        return;
    }

    tableBody.innerHTML = employees.map(emp => `
        <tr>
            <td>${emp.id}</td>
            <td>${emp.name}</td>
            <td>${emp.department}</td>
            <td>${emp.position}</td>
            <td><span class="status ${emp.status.toLowerCase()}">${emp.status}</span></td>
            <td>
                <div class="actions">
                    <button class="action-icon" onclick="editEmployee('${emp.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-icon" onclick="viewEmployee('${emp.id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Initialize when the page loads
document.addEventListener('DOMContentLoaded', loadEmployees); 