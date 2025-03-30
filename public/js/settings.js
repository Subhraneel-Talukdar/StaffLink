// Load user settings from the server
async function loadSettings() {
    try {
        const response = await fetch('/api/settings');
        if (!response.ok) throw new Error('Failed to fetch settings');
        const settings = await response.json();
        displaySettings(settings);
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('settingsForm').innerHTML = `
            <div class="error-message">Failed to load settings</div>
        `;
    }
}

// Display settings in the form
function displaySettings(settings) {
    const form = document.getElementById('settingsForm');
    form.innerHTML = `
        <div class="settings-section">
            <h3>Profile Settings</h3>
            <div class="form-group">
                <label for="email">Email Notifications</label>
                <input type="checkbox" id="email" name="email_notifications" 
                    ${settings.email_notifications ? 'checked' : ''}>
            </div>
            <div class="form-group">
                <label for="theme">Theme</label>
                <select id="theme" name="theme">
                    <option value="light" ${settings.theme === 'light' ? 'selected' : ''}>Light</option>
                    <option value="dark" ${settings.theme === 'dark' ? 'selected' : ''}>Dark</option>
                </select>
            </div>
        </div>
        <div class="settings-section">
            <h3>Security Settings</h3>
            <div class="form-group">
                <label for="2fa">Two-Factor Authentication</label>
                <input type="checkbox" id="2fa" name="two_factor_auth" 
                    ${settings.two_factor_auth ? 'checked' : ''}>
            </div>
        </div>
        <button type="submit" class="btn-primary">Save Changes</button>
    `;

    // Add event listener for form submission
    form.addEventListener('submit', saveSettings);
}

// Save settings to the server
async function saveSettings(event) {
    event.preventDefault();
    const form = event.target;
    const settings = {
        email_notifications: form.email_notifications.checked,
        theme: form.theme.value,
        two_factor_auth: form.two_factor_auth.checked
    };

    try {
        const response = await fetch('/api/settings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(settings)
        });

        if (!response.ok) throw new Error('Failed to save settings');
        
        // Show success message
        const message = document.createElement('div');
        message.className = 'success-message';
        message.textContent = 'Settings saved successfully';
        form.appendChild(message);
        
        // Remove message after 3 seconds
        setTimeout(() => message.remove(), 3000);
    } catch (error) {
        console.error('Error:', error);
        const message = document.createElement('div');
        message.className = 'error-message';
        message.textContent = 'Failed to save settings';
        form.appendChild(message);
    }
}

// Initialize when the page loads
document.addEventListener('DOMContentLoaded', loadSettings); 