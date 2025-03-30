document.addEventListener('DOMContentLoaded', function() {
    const employeeForm = document.getElementById('employeeForm');
    const adminForm = document.getElementById('adminForm');
    const messageContainer = document.createElement('div');
    messageContainer.className = 'message';
    document.querySelector('.form-container').insertBefore(messageContainer, employeeForm);

    function showMessage(message, type) {
        messageContainer.textContent = message;
        messageContainer.className = `message ${type}-message`;
        messageContainer.style.display = 'block';
        setTimeout(() => {
            messageContainer.style.display = 'none';
        }, 5000);
    }

    // Handle employee form submission
    employeeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = employeeForm.querySelector('.submit-btn');
        
        try {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Creating Account...';

            const formData = new FormData(employeeForm);
            const data = {
                fullName: formData.get('fullName'),
                email: formData.get('email'),
                password: formData.get('password'),
                department: formData.get('department'),
                isAdmin: false
            };

            // Validate password match
            if (data.password !== formData.get('confirmPassword')) {
                throw new Error('Passwords do not match');
            }

            const response = await fetch('/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (response.ok) {
                showMessage('Account created successfully! Redirecting to login...', 'success');
                setTimeout(() => {
                    window.location.href = '/login';
                }, 2000);
            } else {
                throw new Error(result.message || 'Failed to create account');
            }
        } catch (error) {
            showMessage(error.message, 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Create Employee Account';
        }
    });

    // Handle admin form submission
    adminForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = adminForm.querySelector('.submit-btn');
        
        try {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Creating Account...';

            const formData = new FormData(adminForm);
            const data = {
                fullName: formData.get('fullName'),
                email: formData.get('email'),
                password: formData.get('password'),
                adminCode: formData.get('adminCode'),
                department: 'Administration',
                isAdmin: true
            };

            // Validate password match
            if (data.password !== formData.get('confirmPassword')) {
                throw new Error('Passwords do not match');
            }

            const response = await fetch('/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (response.ok) {
                showMessage('Admin account created successfully! Redirecting to login...', 'success');
                setTimeout(() => {
                    window.location.href = '/login';
                }, 2000);
            } else {
                throw new Error(result.message || 'Failed to create admin account');
            }
        } catch (error) {
            showMessage(error.message, 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Create Admin Account';
        }
    });
});
