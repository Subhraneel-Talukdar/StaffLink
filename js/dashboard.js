// DOM Elements
const sidebarLinks = document.querySelectorAll('.sidebar-nav a');
const dashboardSections = document.querySelectorAll('.dashboard-section');
const logoutBtn = document.getElementById('logoutBtn');
const addTaskBtn = document.getElementById('addTaskBtn');
const addEventBtn = document.getElementById('addEventBtn');
const uploadDocBtn = document.getElementById('uploadDocBtn');
const modals = document.querySelectorAll('.modal');
const closeModalBtns = document.querySelectorAll('.close-modal');

// State Management
let currentUser = JSON.parse(localStorage.getItem('user'));
let tasks = [];
let events = [];
let documents = [];
let messages = [];

// Navigation
function navigateToSection(sectionId) {
    // Update active section
    dashboardSections.forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(sectionId).classList.add('active');

    // Update active sidebar link
    sidebarLinks.forEach(link => {
        link.parentElement.classList.remove('active');
    });
    document.querySelector(`[href="#${sectionId}"]`).parentElement.classList.add('active');
}

// Initialize Charts
function initializeCharts() {
    // Work Hours Chart
    const workHoursCtx = document.getElementById('workHoursChart').getContext('2d');
    new Chart(workHoursCtx, {
        type: 'line',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [{
                label: 'Work Hours',
                data: [160, 165, 168, 170, 165, 168],
                borderColor: '#4A90E2',
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });

    // Performance Chart
    const performanceCtx = document.getElementById('performanceChart').getContext('2d');
    new Chart(performanceCtx, {
        type: 'doughnut',
        data: {
            labels: ['Tasks Completed', 'Tasks Pending'],
            datasets: [{
                data: [75, 25],
                backgroundColor: ['#4CAF50', '#FFC107']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });

    // Salary Chart
    const salaryCtx = document.getElementById('salaryChart').getContext('2d');
    new Chart(salaryCtx, {
        type: 'bar',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [{
                label: 'Salary',
                data: [4500, 4500, 4500, 4500, 4500, 4500],
                backgroundColor: '#4A90E2'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });

    // Performance Trend Chart
    const performanceTrendCtx = document.getElementById('performanceTrendChart').getContext('2d');
    new Chart(performanceTrendCtx, {
        type: 'line',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [{
                label: 'Performance Rating',
                data: [4.2, 4.3, 4.5, 4.4, 4.6, 4.5],
                borderColor: '#4CAF50',
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

// Task Management
function initializeTasks() {
    const taskLists = {
        todo: document.getElementById('todoList'),
        inProgress: document.getElementById('inProgressList'),
        completed: document.getElementById('completedList')
    };

    // Add drag and drop functionality
    Object.values(taskLists).forEach(list => {
        list.addEventListener('dragover', e => {
            e.preventDefault();
            const draggingTask = document.querySelector('.dragging');
            const afterElement = getDragAfterElement(list, e.clientY);
            const task = document.querySelector('.dragging');
            
            if (afterElement) {
                list.insertBefore(task, afterElement);
            } else {
                list.appendChild(task);
            }
        });
    });

    // Handle task creation
    document.querySelector('#addTaskModal form').addEventListener('submit', e => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const task = {
            id: Date.now(),
            title: formData.get('title'),
            description: formData.get('description'),
            dueDate: formData.get('dueDate'),
            priority: formData.get('priority'),
            status: 'todo'
        };

        tasks.push(task);
        renderTask(task);
        closeModal('addTaskModal');
        e.target.reset();
    });
}

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.task-item:not(.dragging)')];
    
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        
        if (offset < 0 && offset > closest.offset) {
            return { offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function renderTask(task) {
    const taskElement = document.createElement('div');
    taskElement.className = 'task-item';
    taskElement.draggable = true;
    taskElement.dataset.id = task.id;

    taskElement.innerHTML = `
        <div class="task-header">
            <input type="checkbox" ${task.status === 'completed' ? 'checked' : ''}>
            <h4>${task.title}</h4>
        </div>
        <p class="task-description">${task.description}</p>
        <div class="task-meta">
            <span class="task-due">Due: ${new Date(task.dueDate).toLocaleDateString()}</span>
            <span class="task-priority ${task.priority}">${task.priority}</span>
        </div>
    `;

    // Add drag events
    taskElement.addEventListener('dragstart', () => {
        taskElement.classList.add('dragging');
    });

    taskElement.addEventListener('dragend', () => {
        taskElement.classList.remove('dragging');
    });

    // Add checkbox event
    const checkbox = taskElement.querySelector('input[type="checkbox"]');
    checkbox.addEventListener('change', () => {
        task.status = checkbox.checked ? 'completed' : 'todo';
        updateTaskStatus(task);
    });

    // Add to appropriate list
    const list = document.getElementById(`${task.status}List`);
    list.appendChild(taskElement);
}

function updateTaskStatus(task) {
    const taskElement = document.querySelector(`[data-id="${task.id}"]`);
    const newList = document.getElementById(`${task.status}List`);
    newList.appendChild(taskElement);
}

// Event Management
function initializeEvents() {
    const plannerGrid = document.querySelector('.planner-grid-cells');
    const timeSlots = document.querySelectorAll('.time-slot');
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    // Generate grid cells
    timeSlots.forEach(timeSlot => {
        days.forEach(day => {
            const cell = document.createElement('div');
            cell.className = 'grid-cell';
            cell.dataset.time = timeSlot.textContent;
            cell.dataset.day = day;
            plannerGrid.appendChild(cell);
        });
    });

    // Handle event creation
    document.querySelector('#addEventModal form').addEventListener('submit', e => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const event = {
            id: Date.now(),
            title: formData.get('title'),
            date: formData.get('date'),
            time: formData.get('time'),
            description: formData.get('description')
        };

        events.push(event);
        renderEvent(event);
        closeModal('addEventModal');
        e.target.reset();
    });
}

function renderEvent(event) {
    const dayIndex = new Date(event.date).getDay();
    const cell = document.querySelector(`[data-time="${event.time}"][data-day="${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayIndex]}"]`);
    
    const eventElement = document.createElement('div');
    eventElement.className = 'event-item';
    eventElement.innerHTML = `
        <h4>${event.title}</h4>
        <p>${event.description}</p>
    `;

    cell.appendChild(eventElement);
}

// Document Management
function initializeDocuments() {
    document.querySelector('#uploadDocModal form').addEventListener('submit', e => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const document = {
            id: Date.now(),
            title: formData.get('title'),
            file: formData.get('file'),
            category: formData.get('category'),
            date: new Date().toLocaleDateString()
        };

        documents.push(document);
        renderDocument(document);
        closeModal('uploadDocModal');
        e.target.reset();
    });
}

function renderDocument(document) {
    const documentsGrid = document.querySelector('.documents-grid');
    const documentElement = document.createElement('div');
    documentElement.className = 'document-card';
    documentElement.innerHTML = `
        <div class="document-icon">
            <i class="fas fa-file-${getFileIcon(document.category)}"></i>
        </div>
        <div class="document-info">
            <h4>${document.title}</h4>
            <p>${formatFileSize(document.file.size)}</p>
            <span class="document-date">${document.date}</span>
        </div>
        <div class="document-actions">
            <button class="btn text">
                <i class="fas fa-download"></i>
            </button>
            <button class="btn text">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;

    documentsGrid.appendChild(documentElement);
}

function getFileIcon(category) {
    const icons = {
        report: 'alt',
        contract: 'signature',
        other: 'file'
    };
    return icons[category] || 'file';
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Message Management
function initializeMessages() {
    const messageItems = document.querySelectorAll('.message-item');
    const messageInput = document.querySelector('.messages-input input');
    const sendButton = document.querySelector('.messages-input button');

    messageItems.forEach(item => {
        item.addEventListener('click', () => {
            messageItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            // Load chat history
            loadChatHistory(item.dataset.userId);
        });
    });

    sendButton.addEventListener('click', () => {
        const message = messageInput.value.trim();
        if (message) {
            sendMessage(message);
            messageInput.value = '';
        }
    });

    messageInput.addEventListener('keypress', e => {
        if (e.key === 'Enter') {
            sendButton.click();
        }
    });
}

function loadChatHistory(userId) {
    const chatContainer = document.querySelector('.messages-chat');
    chatContainer.innerHTML = ''; // Clear existing messages

    // Simulate loading chat history
    const history = messages.filter(m => m.userId === userId);
    history.forEach(message => {
        renderMessage(message);
    });
}

function sendMessage(message) {
    const activeChat = document.querySelector('.message-item.active');
    if (!activeChat) return;

    const messageData = {
        id: Date.now(),
        text: message,
        userId: activeChat.dataset.userId,
        timestamp: new Date().toLocaleTimeString(),
        sent: true
    };

    messages.push(messageData);
    renderMessage(messageData);
}

function renderMessage(message) {
    const chatContainer = document.querySelector('.messages-chat');
    const messageElement = document.createElement('div');
    messageElement.className = `message ${message.sent ? 'sent' : 'received'}`;
    messageElement.innerHTML = `
        <p>${message.text}</p>
        <span class="message-time">${message.timestamp}</span>
    `;

    chatContainer.appendChild(messageElement);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Modal Management
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.add('active');
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.remove('active');
}

// Event Listeners
sidebarLinks.forEach(link => {
    link.addEventListener('click', e => {
        e.preventDefault();
        const sectionId = link.getAttribute('href').substring(1);
        navigateToSection(sectionId);
    });
});

addTaskBtn.addEventListener('click', () => openModal('addTaskModal'));
addEventBtn.addEventListener('click', () => openModal('addEventModal'));
uploadDocBtn.addEventListener('click', () => openModal('uploadDocModal'));

closeModalBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const modal = btn.closest('.modal');
        modal.classList.remove('active');
    });
});

logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('user');
    window.location.href = '../login.html';
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    if (!currentUser) {
        window.location.href = '../login.html';
        return;
    }

    initializeCharts();
    initializeTasks();
    initializeEvents();
    initializeDocuments();
    initializeMessages();
    navigateToSection('overview');
}); 