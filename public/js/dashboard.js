document.addEventListener('DOMContentLoaded', async () => {
    // Initialize glow effects
    initializeGlowEffects();
    
    // Initialize dashboard
    await initializeDashboard();
    
    // Setup event listeners
    setupEventListeners();
    
    // Initialize charts
    initializeCharts();
    
    // Load recent activity
    loadRecentActivity();

    // Add animation indices to nav items
    document.querySelectorAll('.sidebar-nav li').forEach((item, index) => {
        item.style.setProperty('--item-index', index);
        });
    });

function initializeGlowEffects() {
    const cards = document.querySelectorAll('.stat-card, .chart-card');
    
    cards.forEach(card => {
        card.addEventListener('mousemove', e => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            card.style.setProperty('--mouse-x', `${x}px`);
            card.style.setProperty('--mouse-y', `${y}px`);
        });
    });
}

async function initializeDashboard() {
    try {
        // Sample data for demonstration
        const stats = {
            totalEmployees: 150,
            employeeGrowth: 12,
            presentToday: 142,
            attendanceRate: 95,
            totalDepartments: 6,
            activeDepartments: 6,
            pendingLeaves: 8
        };
        
        // Update dashboard stats with animation
        animateStats(stats);
        
    } catch (error) {
        showError('Failed to load dashboard data');
    }
}

function animateStats(stats) {
    // Animate total employees
    animateValue('totalEmployees', 0, stats.totalEmployees, 1500);
    document.getElementById('employeeGrowth').textContent = `${stats.employeeGrowth}%`;
    
    // Animate present today
    animateValue('presentToday', 0, stats.presentToday, 1500);
    document.getElementById('attendanceRate').textContent = `${stats.attendanceRate}%`;
    
    // Animate departments
    animateValue('totalDepartments', 0, stats.totalDepartments, 1500);
    document.getElementById('activeDepartments').textContent = stats.activeDepartments;
    
    // Animate leave requests
    animateValue('pendingLeaves', 0, stats.pendingLeaves, 1500);
}

function animateValue(id, start, end, duration) {
    const obj = document.getElementById(id);
    const range = end - start;
    const minTimer = 50;
    const stepTime = Math.abs(Math.floor(duration / range));
    const startTime = new Date().getTime();
    const endTime = startTime + duration;
    let timer;

    function run() {
        const now = new Date().getTime();
        const remaining = Math.max((endTime - now) / duration, 0);
        const value = Math.round(end - (remaining * range));
        obj.textContent = value;
        if (value === end) {
            clearInterval(timer);
        }
    }

    timer = setInterval(run, stepTime);
    run();
}

function setupEventListeners() {
    // Period toggle for charts
    document.querySelectorAll('.chart-period').forEach(button => {
        button.addEventListener('click', function() {
            const parent = this.closest('.chart-card');
            parent.querySelectorAll('.chart-period').forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            // Update charts based on selected period
            initializeCharts();
        });
    });

    // Navigation
    document.querySelectorAll('.sidebar-nav a').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            
            // Navigate to the appropriate page
            switch(targetId) {
                case 'overview':
                    window.location.href = '/admin-dashboard.html';
                    break;
                case 'employees':
                    window.location.href = '/pages/employees.html';
                    break;
                case 'departments':
                    window.location.href = '/pages/departments.html';
                    break;
                case 'attendance':
                    window.location.href = '/pages/attendance.html';
                    break;
                case 'payroll':
                    window.location.href = '/pages/payroll.html';
                    break;
                case 'performance':
                    window.location.href = '/pages/performance.html';
                    break;
                case 'settings':
                    window.location.href = '/pages/settings.html';
                    break;
                default:
                    console.warn('Unknown route:', targetId);
            }
            
            // Update active states
            document.querySelectorAll('.sidebar-nav li').forEach(li => li.classList.remove('active'));
            this.parentElement.classList.add('active');
        });
    });

    // Logout handler
    document.getElementById('logoutBtn')?.addEventListener('click', () => {
        // Add any logout cleanup here (e.g., clearing session)
        window.location.href = '/login.html';
    });
}

function initializeCharts() {
    updateAttendanceChart();
    updateDepartmentChart();
    updatePerformanceChart();
}

function updateAttendanceChart() {
    const ctx = document.getElementById('attendanceChart').getContext('2d');
    
    const data = {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [{
            label: 'Present',
            data: [145, 142, 147, 140, 143, 138, 135],
            borderColor: '#4CAF50',
            backgroundColor: 'rgba(76, 175, 80, 0.1)',
            tension: 0.4,
            fill: true
        }, {
            label: 'Absent',
            data: [5, 8, 3, 10, 7, 12, 15],
            borderColor: '#FF5252',
            backgroundColor: 'rgba(255, 82, 82, 0.1)',
            tension: 0.4,
            fill: true
        }]
    };

    new Chart(ctx, {
        type: 'line',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#94a3b8'
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#94a3b8'
                    }
                }
            },
            plugins: {
                legend: {
                    labels: {
                        color: '#94a3b8'
                    }
                }
            }
        }
    });
}

function updateDepartmentChart() {
    const ctx = document.getElementById('departmentChart').getContext('2d');
    
    const data = {
        labels: ['IT', 'HR', 'Finance', 'Marketing', 'Operations'],
        datasets: [{
            data: [45, 25, 30, 35, 20],
            backgroundColor: [
                '#4CAF50',
                '#2196F3',
                '#FFC107',
                '#9C27B0',
                '#FF5252'
            ],
            borderWidth: 0,
            borderRadius: 4
        }]
    };

    new Chart(ctx, {
        type: 'doughnut',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '75%',
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });

    // Update legend
    updateDepartmentLegend(data);
}

function updateDepartmentLegend(data) {
    const legend = document.getElementById('deptChartLegend');
    const colors = data.datasets[0].backgroundColor;
    
    legend.innerHTML = data.labels.map((label, index) => `
        <div class="legend-item">
            <span class="legend-color" style="background: ${colors[index]}"></span>
            <span>${label}</span>
            <span>${data.datasets[0].data[index]} employees</span>
                </div>
    `).join('');
}

function updatePerformanceChart() {
    const ctx = document.getElementById('performanceChart').getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(33, 150, 243, 0.2)');
    gradient.addColorStop(1, 'rgba(33, 150, 243, 0)');

    const data = {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [{
            label: 'Average Performance Score',
            data: [85, 88, 82, 90, 87, 92],
            backgroundColor: gradient,
            borderColor: '#2196F3',
            borderWidth: 2,
            borderRadius: 4,
            barThickness: 16
        }]
    };

    new Chart(ctx, {
        type: 'bar',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        callback: value => value + '%',
                        color: '#94a3b8'
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#94a3b8'
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

async function loadRecentActivity() {
    // Sample activity data
    const activities = [
        {
            type: 'login',
            employeeName: 'John Doe',
            timestamp: new Date(Date.now() - 1000 * 60 * 5)
        },
        {
            type: 'update',
            employeeName: 'Jane Smith',
            timestamp: new Date(Date.now() - 1000 * 60 * 15)
        },
        {
            type: 'leave',
            employeeName: 'Mike Johnson',
            timestamp: new Date(Date.now() - 1000 * 60 * 30)
        },
        {
            type: 'attendance',
            employeeName: 'Sarah Wilson',
            timestamp: new Date(Date.now() - 1000 * 60 * 45)
        }
    ];

    const activityList = document.getElementById('recentActivities');
    activityList.innerHTML = activities.map(activity => `
        <div class="activity-item">
            <i class="${getActivityIcon(activity.type)}"></i>
            <div class="activity-info">
                <p>${activity.employeeName} ${getActivityText(activity.type)}</p>
                <span>${formatActivityTime(activity.timestamp)}</span>
                    </div>
                </div>
    `).join('');
}

function getActivityIcon(type) {
    const icons = {
        login: 'fas fa-sign-in-alt',
        logout: 'fas fa-sign-out-alt',
        update: 'fas fa-user-edit',
        leave: 'fas fa-calendar-alt',
        attendance: 'fas fa-clock',
        performance: 'fas fa-chart-line',
        payroll: 'fas fa-money-bill-wave',
        department: 'fas fa-building'
    };
    return icons[type] || 'fas fa-info-circle';
}

function getActivityText(type) {
    const texts = {
        login: 'logged in',
        logout: 'logged out',
        update: 'updated their profile',
        leave: 'requested leave',
        attendance: 'marked attendance',
        performance: 'completed performance review',
        payroll: 'processed payroll',
        department: 'changed department'
    };
    return texts[type] || 'performed an action';
}

function formatActivityTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000); // difference in seconds
    
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    return date.toLocaleDateString();
}

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = `
        <i class="fas fa-exclamation-circle"></i>
        <span>${message}</span>
    `;
    document.body.appendChild(errorDiv);
    setTimeout(() => errorDiv.remove(), 5000);
}

// Enhanced mock data
const mockData = {
    employees: [
        { id: 'EMP001', name: 'John Doe', email: 'john.doe@company.com', department: 'Engineering', position: 'Senior Developer', salary: 85000, status: 'Active' },
        { id: 'EMP002', name: 'Jane Smith', email: 'jane.smith@company.com', department: 'HR', position: 'HR Manager', salary: 75000, status: 'Active' },
        { id: 'EMP003', name: 'Mike Wilson', email: 'mike.wilson@company.com', department: 'Sales', position: 'Sales Executive', salary: 65000, status: 'Active' },
        { id: 'EMP004', name: 'Sarah Brown', email: 'sarah.brown@company.com', department: 'Marketing', position: 'Marketing Lead', salary: 70000, status: 'On Leave' },
        { id: 'EMP005', name: 'Tom Harris', email: 'tom.harris@company.com', department: 'Engineering', position: 'Software Engineer', salary: 72000, status: 'Active' }
    ],
    departments: [
        { id: 'DEP001', name: 'Engineering', head: 'John Doe', totalEmployees: 25, budget: 2500000, status: 'Active' },
        { id: 'DEP002', name: 'Human Resources', head: 'Jane Smith', totalEmployees: 10, budget: 800000, status: 'Active' },
        { id: 'DEP003', name: 'Sales', head: 'Mike Wilson', totalEmployees: 15, budget: 1200000, status: 'Active' },
        { id: 'DEP004', name: 'Marketing', head: 'Sarah Brown', totalEmployees: 12, budget: 1000000, status: 'Active' }
    ],
    attendance: {
        stats: {
            presentToday: 142,
            absentToday: 8,
            onLeave: 5,
            lateArrivals: 3
        },
        records: [
            { id: 'EMP001', name: 'John Doe', department: 'Engineering', date: '2024-01-15', checkIn: '09:00', checkOut: '17:00', status: 'Present' },
            { id: 'EMP002', name: 'Jane Smith', department: 'HR', date: '2024-01-15', checkIn: '08:45', checkOut: '17:15', status: 'Present' },
            { id: 'EMP003', name: 'Mike Wilson', department: 'Sales', date: '2024-01-15', checkIn: '09:30', checkOut: '17:30', status: 'Late' },
            { id: 'EMP004', name: 'Sarah Brown', department: 'Marketing', date: '2024-01-15', checkIn: '--:--', checkOut: '--:--', status: 'Absent' }
        ]
    }
};

// Employee Management Functions
function showAddEmployeeModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close">&times;</span>
            <h2>Add New Employee</h2>
            <form id="addEmployeeForm">
                <div class="form-group">
                    <label for="fullName">Full Name</label>
                    <input type="text" id="fullName" required>
                </div>
                <div class="form-group">
                    <label for="email">Email</label>
                    <input type="email" id="email" required>
                </div>
                <div class="form-group">
                    <label for="department">Department</label>
                    <select id="department" required>
                        <option value="">Select Department</option>
                        ${mockData.departments.map(dept => 
                            `<option value="${dept.name}">${dept.name}</option>`
                        ).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label for="position">Position</label>
                    <input type="text" id="position" required>
                </div>
                <div class="form-group">
                    <label for="salary">Salary</label>
                    <input type="number" id="salary" required>
                </div>
                <button type="submit" class="btn-primary">Add Employee</button>
            </form>
        </div>
    `;
    document.body.appendChild(modal);

    // Close modal functionality
    const closeBtn = modal.querySelector('.close');
    closeBtn.onclick = () => modal.remove();

    // Form submission
    const form = modal.querySelector('#addEmployeeForm');
    form.onsubmit = (e) => {
        e.preventDefault();
        const newEmployee = {
            id: `EMP${String(mockData.employees.length + 1).padStart(3, '0')}`,
            name: form.fullName.value,
            email: form.email.value,
            department: form.department.value,
            position: form.position.value,
            salary: parseInt(form.salary.value),
            status: 'Active'
        };
        mockData.employees.push(newEmployee);
        modal.remove();
        loadEmployeesPage(); // Refresh the page
    };
}

// Search functionality
function setupSearch(tableId, data, renderFunction) {
    const searchInput = document.querySelector('.search-bar input');
    if (!searchInput) return;

    searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
        const filteredData = data.filter(item => 
            Object.values(item).some(value => 
                String(value).toLowerCase().includes(searchTerm)
            )
        );
        renderFunction(filteredData);
    });
}

// Updated loadEmployeesPage function with search functionality
async function loadEmployeesPage() {
    const mainContent = document.querySelector('.dashboard-main');
    try {
        const renderEmployeeTable = (employees) => {
            const tableBody = document.getElementById('employeeTableBody');
            if (!tableBody) return;

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
        };

        mainContent.innerHTML = `
            <h1>Employee Management</h1>
            <div class="action-bar">
                <button class="action-btn" onclick="showAddEmployeeModal()">
                    <i class="fas fa-user-plus"></i>
                    Add New Employee
                </button>
                <div class="search-bar">
                    <i class="fas fa-search"></i>
                    <input type="text" placeholder="Search employees...">
            </div>
        </div>
            <div class="employee-list">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Name</th>
                            <th>Department</th>
                            <th>Position</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="employeeTableBody"></tbody>
                </table>
        </div>
    `;

        renderEmployeeTable(mockData.employees);
        setupSearch('employeeTableBody', mockData.employees, renderEmployeeTable);

                } catch (error) {
        mainContent.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-circle"></i>
                <p>Failed to load employee data. Please try again later.</p>
            </div>
        `;
    }
} 