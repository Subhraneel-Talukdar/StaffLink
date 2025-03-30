// Load performance data from the server
async function loadPerformance() {
    try {
        const [reviews, deptPerformance, trends] = await Promise.all([
            fetch('/api/performance').then(res => res.json()),
            fetch('/api/department-performance').then(res => res.json()),
            fetch('/api/performance-trends').then(res => res.json())
        ]);

        displayPerformance(reviews);
        updatePerformanceStats(reviews);
        displayDepartmentPerformance(deptPerformance);
        displayPerformanceTrends(trends);
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('performanceTableBody').innerHTML = `
            <tr><td colspan="6" class="error-message">Failed to load performance data</td></tr>
        `;
    }
}

// Display performance reviews in the table
function displayPerformance(reviews) {
    const tableBody = document.getElementById('performanceTableBody');
    if (!reviews || reviews.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6">No performance reviews found</td></tr>';
        return;
    }

    tableBody.innerHTML = reviews.map(review => `
        <tr>
            <td>${review.employee_name}</td>
            <td>${review.review_period}</td>
            <td>${review.reviewer}</td>
            <td>${review.score}/5</td>
            <td>${review.comments}</td>
            <td>
                <div class="actions">
                    <button class="action-icon" onclick="editReview('${review.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-icon" onclick="viewReview('${review.id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Update performance statistics
function updatePerformanceStats(reviews) {
    const total = reviews.length;
    const avgScore = reviews.reduce((sum, review) => sum + review.score, 0) / total;
    const topPerformers = reviews.filter(review => review.score >= 4.5).length;
    const pendingReviews = reviews.filter(review => review.status === 'Pending').length;
    const completedReviews = reviews.filter(review => review.status === 'Completed').length;

    document.getElementById('avgScore').textContent = `${Math.round(avgScore * 20)}%`;
    document.getElementById('topPerformers').textContent = topPerformers;
    document.getElementById('pendingReviews').textContent = pendingReviews;
    document.getElementById('completedReviews').textContent = completedReviews;
}

// Display department performance chart
function displayDepartmentPerformance(data) {
    const ctx = document.getElementById('deptPerformanceChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(d => d.department),
            datasets: [{
                label: 'Average Score',
                data: data.map(d => d.average_score),
                backgroundColor: 'rgba(54, 162, 235, 0.5)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 5
                }
            }
        }
    });
}

// Display performance trends chart
function displayPerformanceTrends(data) {
    const ctx = document.getElementById('performanceTrendsChart').getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(d => d.review_period),
            datasets: [{
                label: 'Average Score',
                data: data.map(d => d.average_score),
                fill: false,
                borderColor: 'rgba(75, 192, 192, 1)',
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 5
                }
            }
        }
    });
}

// Show new evaluation modal
function showNewEvaluationModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h2>New Performance Evaluation</h2>
            <form id="evaluationForm" onsubmit="submitEvaluation(event)">
                <div class="form-group">
                    <label for="employee">Employee</label>
                    <select id="employee" name="employee_id" required>
                        <!-- Will be populated with employee list -->
                    </select>
                </div>
                <div class="form-group">
                    <label for="score">Score (1-5)</label>
                    <input type="number" id="score" name="score" min="1" max="5" step="0.1" required>
                </div>
                <div class="form-group">
                    <label for="comments">Comments</label>
                    <textarea id="comments" name="comments" rows="4" required></textarea>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
                    <button type="submit" class="btn-primary">Submit Evaluation</button>
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

// Submit evaluation
async function submitEvaluation(event) {
    event.preventDefault();
    const form = event.target;
    const evaluationData = {
        employee_id: form.employee_id.value,
        score: parseFloat(form.score.value),
        comments: form.comments.value
    };

    try {
        const response = await fetch('/api/performance', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(evaluationData)
        });

        if (!response.ok) throw new Error('Failed to submit evaluation');
        
        closeModal();
        loadPerformance();
        showNotification('Evaluation submitted successfully', 'success');
    } catch (error) {
        console.error('Error:', error);
        showNotification('Failed to submit evaluation', 'error');
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
    loadPerformance();
    
    // Add event listener for the "New Evaluation" button
    const newEvalButton = document.querySelector('.action-btn');
    if (newEvalButton) {
        newEvalButton.addEventListener('click', showNewEvaluationModal);
    }
}); 