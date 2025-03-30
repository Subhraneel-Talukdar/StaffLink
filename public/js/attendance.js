// Load attendance records from the server
async function loadAttendance() {
    try {
        const response = await fetch('/api/attendance');
        if (!response.ok) throw new Error('Failed to fetch attendance records');
        const records = await response.json();
        displayAttendance(records);
        updateAttendanceStats(records);
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('attendanceTableBody').innerHTML = `
            <tr><td colspan="5" class="error-message">Failed to load attendance data</td></tr>
        `;
    }
}

// Display attendance records in the table
function displayAttendance(records) {
    const tableBody = document.getElementById('attendanceTableBody');
    if (!records || records.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5">No attendance records found</td></tr>';
        return;
    }

    tableBody.innerHTML = records.map(record => `
        <tr>
            <td>${record.employee_name}</td>
            <td>${new Date(record.date).toLocaleDateString()}</td>
            <td>${record.check_in || 'Not checked in'}</td>
            <td>${record.check_out || 'Not checked out'}</td>
            <td><span class="status ${record.status.toLowerCase()}">${record.status}</span></td>
        </tr>
    `).join('');
}

// Update attendance statistics
function updateAttendanceStats(records) {
    const total = records.length;
    const present = records.filter(r => r.status === 'Present').length;
    const absent = records.filter(r => r.status === 'Absent').length;
    const late = records.filter(r => r.status === 'Late').length;
    const attendanceRate = (present / total) * 100;

    document.getElementById('presentCount').textContent = present;
    document.getElementById('absentCount').textContent = absent;
    document.getElementById('lateCount').textContent = late;
    document.querySelector('.stat-change.positive span').textContent = `${Math.round(attendanceRate)}% Attendance Rate`;
}

// Show mark attendance modal
function showMarkAttendanceModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h2>Mark Attendance</h2>
            <form id="markAttendanceForm" onsubmit="markAttendance(event)">
                <div class="form-group">
                    <label for="employee">Employee</label>
                    <select id="employee" name="employee_id" required>
                        <!-- Will be populated with employee list -->
                    </select>
                </div>
                <div class="form-group">
                    <label for="status">Status</label>
                    <select id="status" name="status" required>
                        <option value="Present">Present</option>
                        <option value="Absent">Absent</option>
                        <option value="Late">Late</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="check_in">Check In Time</label>
                    <input type="time" id="check_in" name="check_in">
                </div>
                <div class="form-group">
                    <label for="check_out">Check Out Time</label>
                    <input type="time" id="check_out" name="check_out">
                </div>
                <div class="form-actions">
                    <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
                    <button type="submit" class="btn-primary">Mark Attendance</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
    loadEmployeeList();
}

// Load employee list for the dropdown
async function loadEmployeeList() {
    try {
        const response = await fetch('/api/employees');
        if (!response.ok) throw new Error('Failed to fetch employees');
        const employees = await response.json();
        
        const select = document.getElementById('employee');
        select.innerHTML = employees.map(emp => `
            <option value="${emp.id}">${emp.name}</option>
        `).join('');
    } catch (error) {
        console.error('Error:', error);
        showNotification('Failed to load employee list', 'error');
    }
}

// Mark attendance
async function markAttendance(event) {
    event.preventDefault();
    const form = event.target;
    const attendanceData = {
        employee_id: form.employee_id.value,
        status: form.status.value,
        check_in: form.check_in.value,
        check_out: form.check_out.value
    };

    try {
        const response = await fetch('/api/attendance', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(attendanceData)
        });

        if (!response.ok) throw new Error('Failed to mark attendance');
        
        closeModal();
        loadAttendance();
        showNotification('Attendance marked successfully', 'success');
    } catch (error) {
        console.error('Error:', error);
        showNotification('Failed to mark attendance', 'error');
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
    loadAttendance();
    
    // Add event listener for the "Mark Attendance" button
    const markButton = document.querySelector('.action-btn');
    if (markButton) {
        markButton.addEventListener('click', showMarkAttendanceModal);
    }
}); 