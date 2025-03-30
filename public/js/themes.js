// Theme management
const themes = {
    light: {
        primary: '#4a90e2',
        secondary: '#f5f6fa',
        text: '#2d3436',
        border: '#dfe6e9',
        success: '#00b894',
        warning: '#fdcb6e',
        danger: '#d63031',
        background: '#f5f6fa',
        card: '#ffffff'
    },
    dark: {
        primary: '#6c5ce7',
        secondary: '#2d3436',
        text: '#dfe6e9',
        border: '#636e72',
        success: '#00b894',
        warning: '#fdcb6e',
        danger: '#d63031',
        background: '#1e272e',
        card: '#2d3436'
    },
    blue: {
        primary: '#0984e3',
        secondary: '#e3f2fd',
        text: '#2d3436',
        border: '#b2bec3',
        success: '#00b894',
        warning: '#fdcb6e',
        danger: '#d63031',
        background: '#e3f2fd',
        card: '#ffffff'
    },
    green: {
        primary: '#00b894',
        secondary: '#e8f5e9',
        text: '#2d3436',
        border: '#b2bec3',
        success: '#00b894',
        warning: '#fdcb6e',
        danger: '#d63031',
        background: '#e8f5e9',
        card: '#ffffff'
    }
};

// Apply theme to CSS variables
function applyTheme(themeName) {
    const theme = themes[themeName];
    const root = document.documentElement;

    root.style.setProperty('--primary-color', theme.primary);
    root.style.setProperty('--secondary-color', theme.secondary);
    root.style.setProperty('--text-color', theme.text);
    root.style.setProperty('--border-color', theme.border);
    root.style.setProperty('--success-color', theme.success);
    root.style.setProperty('--warning-color', theme.warning);
    root.style.setProperty('--danger-color', theme.danger);
    root.style.setProperty('--background-color', theme.background);
    root.style.setProperty('--card-background', theme.card);

    // Update Chart.js colors if charts exist
    updateChartColors(theme);
}

// Update Chart.js colors
function updateChartColors(theme) {
    const charts = Chart.instances;
    charts.forEach(chart => {
        const config = chart.config;
        if (config.type === 'line') {
            config.data.datasets.forEach(dataset => {
                if (dataset.label === 'Present') {
                    dataset.borderColor = theme.success;
                } else if (dataset.label === 'Absent') {
                    dataset.borderColor = theme.danger;
                }
            });
        } else if (config.type === 'doughnut' || config.type === 'pie') {
            config.data.datasets.forEach(dataset => {
                dataset.backgroundColor = [
                    theme.primary,
                    theme.success,
                    theme.warning,
                    theme.danger,
                    theme.secondary
                ];
            });
        } else if (config.type === 'bar') {
            config.data.datasets.forEach(dataset => {
                dataset.backgroundColor = theme.primary;
            });
        }
        chart.update();
    });
}

// Initialize theme from localStorage or default to light
document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    applyTheme(savedTheme);
});

// Theme change handler
document.getElementById('themeSelect')?.addEventListener('change', (e) => {
    const theme = e.target.value;
    applyTheme(theme);
    localStorage.setItem('theme', theme);
}); 