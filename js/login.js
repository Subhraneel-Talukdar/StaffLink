// DOM Elements
const loginForm = document.getElementById('loginForm');
const twoFactorAuth = document.getElementById('twoFactorAuth');
const otpInputs = document.querySelectorAll('.otp-inputs input');
const togglePassword = document.querySelector('.toggle-password');
const passwordInput = document.getElementById('password');
const verifyOTPButton = document.getElementById('verifyOTP');
const resendOTPButton = document.getElementById('resendOTP');

// State Management
let currentUser = null;
let otpTimer = null;

// Password Toggle
togglePassword.addEventListener('click', () => {
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordInput.setAttribute('type', type);
    togglePassword.classList.toggle('fa-eye');
    togglePassword.classList.toggle('fa-eye-slash');
});

// OTP Input Handling
otpInputs.forEach((input, index) => {
    input.addEventListener('input', (e) => {
        const value = e.target.value;
        if (value.length === 1 && index < otpInputs.length - 1) {
            otpInputs[index + 1].focus();
        }
    });

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !value && index > 0) {
            otpInputs[index - 1].focus();
        }
    });
});

// Form Validation
const validateForm = (formData) => {
    const errors = {};
    
    if (!formData.employeeId) {
        errors.employeeId = 'Employee ID is required';
    } else if (!/^[A-Z0-9]{6,}$/.test(formData.employeeId)) {
        errors.employeeId = 'Invalid Employee ID format';
    }
    
    if (!formData.password) {
        errors.password = 'Password is required';
    } else if (formData.password.length < 8) {
        errors.password = 'Password must be at least 8 characters';
    }
    
    return errors;
};

// Show Error Message
const showError = (input, message) => {
    const formGroup = input.closest('.form-group');
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    formGroup.classList.add('error');
    formGroup.appendChild(errorDiv);
};

// Clear Error Message
const clearError = (input) => {
    const formGroup = input.closest('.form-group');
    formGroup.classList.remove('error');
    const errorDiv = formGroup.querySelector('.error-message');
    if (errorDiv) {
        errorDiv.remove();
    }
};

// Simulate API Call
const simulateApiCall = (data) => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            // Simulate successful login for demo
            if (data.employeeId === 'EMP001' && data.password === 'password123') {
                resolve({
                    success: true,
                    user: {
                        id: 'EMP001',
                        name: 'John Doe',
                        role: 'admin',
                        department: 'IT'
                    }
                });
            } else {
                reject({
                    success: false,
                    message: 'Invalid credentials'
                });
            }
        }, 1000);
    });
};

// Generate OTP
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Start OTP Timer
const startOTPTimer = () => {
    let timeLeft = 60;
    resendOTPButton.disabled = true;
    
    if (otpTimer) clearInterval(otpTimer);
    
    otpTimer = setInterval(() => {
        timeLeft--;
        resendOTPButton.textContent = `Resend Code (${timeLeft}s)`;
        
        if (timeLeft <= 0) {
            clearInterval(otpTimer);
            resendOTPButton.disabled = false;
            resendOTPButton.textContent = 'Resend Code';
        }
    }, 1000);
};

// Security Constants
const SALT_ROUNDS = 12;
const WEB3_SALT_LENGTH = 32;
const HASH_ALGORITHM = 'bcrypt';

// Web3 Password Security
class Web3PasswordSecurity {
    constructor() {
        this.web3 = new Web3(Web3.givenProvider || 'ws://localhost:8545');
        this.contract = null;
        this.initializeContract();
    }

    async initializeContract() {
        // In production, this would be your deployed contract address
        const contractAddress = '0x...'; // Your deployed contract address
        const contractABI = [
            // Your contract ABI here
            {
                "inputs": [
                    {
                        "internalType": "string",
                        "name": "password",
                        "type": "string"
                    }
                ],
                "name": "hashPassword",
                "outputs": [
                    {
                        "internalType": "string",
                        "name": "",
                        "type": "string"
                    }
                ],
                "stateMutability": "view",
                "type": "function"
            }
        ];

        this.contract = new this.web3.eth.Contract(contractABI, contractAddress);
    }

    // Generate Web3 salt
    generateWeb3Salt() {
        return this.web3.utils.randomHex(WEB3_SALT_LENGTH);
    }

    // Generate bcrypt salt
    generateBcryptSalt() {
        return bcrypt.genSaltSync(SALT_ROUNDS);
    }

    // Hash password with multiple layers
    async hashPassword(password) {
        try {
            // Layer 1: Generate Web3 salt
            const web3Salt = this.generateWeb3Salt();
            
            // Layer 2: Generate bcrypt salt
            const bcryptSalt = this.generateBcryptSalt();
            
            // Layer 3: Initial bcrypt hash
            let hash = bcrypt.hashSync(password, bcryptSalt);
            
            // Layer 4: Add Web3 salt
            hash = this.web3.utils.soliditySha3(hash + web3Salt);
            
            // Layer 5: Add timestamp component
            hash = this.web3.utils.soliditySha3(hash + Date.now().toString());
            
            // Layer 6: Add random entropy
            hash = this.web3.utils.soliditySha3(hash + this.web3.utils.randomHex(32));
            
            // Layer 7: Add blockchain block hash
            const blockHash = await this.getLatestBlockHash();
            hash = this.web3.utils.soliditySha3(hash + blockHash);
            
            // Layer 8: Add transaction hash
            const txHash = await this.getLatestTransactionHash();
            hash = this.web3.utils.soliditySha3(hash + txHash);
            
            // Layer 9: Add network difficulty
            const difficulty = await this.getNetworkDifficulty();
            hash = this.web3.utils.soliditySha3(hash + difficulty);
            
            // Layer 10: Add gas price
            const gasPrice = await this.getGasPrice();
            hash = this.web3.utils.soliditySha3(hash + gasPrice);
            
            // Layer 11: Add block number
            const blockNumber = await this.getBlockNumber();
            hash = this.web3.utils.soliditySha3(hash + blockNumber);
            
            // Layer 12: Final transformation with contract
            hash = await this.contract.methods.hashPassword(hash).call();
            
            // Store salt information for verification
            const saltInfo = {
                web3Salt,
                bcryptSalt,
                timestamp: Date.now(),
                blockHash,
                txHash,
                difficulty,
                gasPrice,
                blockNumber
            };
            
            return {
                hash,
                saltInfo
            };
        } catch (error) {
            console.error('Password hashing error:', error);
            throw new Error('Failed to hash password');
        }
    }

    // Verify password
    async verifyPassword(password, storedHash, saltInfo) {
        try {
            // Recreate hash with stored salt information
            let hash = bcrypt.hashSync(password, saltInfo.bcryptSalt);
            hash = this.web3.utils.soliditySha3(hash + saltInfo.web3Salt);
            hash = this.web3.utils.soliditySha3(hash + saltInfo.timestamp.toString());
            hash = this.web3.utils.soliditySha3(hash + saltInfo.blockHash);
            hash = this.web3.utils.soliditySha3(hash + saltInfo.txHash);
            hash = this.web3.utils.soliditySha3(hash + saltInfo.difficulty);
            hash = this.web3.utils.soliditySha3(hash + saltInfo.gasPrice);
            hash = this.web3.utils.soliditySha3(hash + saltInfo.blockNumber);
            hash = await this.contract.methods.hashPassword(hash).call();
            
            return hash === storedHash;
        } catch (error) {
            console.error('Password verification error:', error);
            throw new Error('Failed to verify password');
        }
    }

    // Get latest block hash
    async getLatestBlockHash() {
        const block = await this.web3.eth.getBlock('latest');
        return block.hash;
    }

    // Get latest transaction hash
    async getLatestTransactionHash() {
        const block = await this.web3.eth.getBlock('latest');
        return block.transactions[0];
    }

    // Get network difficulty
    async getNetworkDifficulty() {
        const block = await this.web3.eth.getBlock('latest');
        return block.difficulty;
    }

    // Get current gas price
    async getGasPrice() {
        return await this.web3.eth.getGasPrice();
    }

    // Get current block number
    async getBlockNumber() {
        return await this.web3.eth.getBlockNumber();
    }
}

// Initialize password security
const passwordSecurity = new Web3PasswordSecurity();

// Import database service
const databaseService = require('./services/databaseService');

// Handle Login Form Submit
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Clear previous errors
    document.querySelectorAll('.error-message').forEach(error => error.remove());
    document.querySelectorAll('.form-group').forEach(group => group.classList.remove('error'));
    
    const formData = {
        employeeId: document.getElementById('employeeId').value,
        password: passwordInput.value
    };
    
    // Validate form
    const errors = validateForm(formData);
    if (Object.keys(errors).length > 0) {
        Object.entries(errors).forEach(([field, message]) => {
            const input = document.getElementById(field);
            showError(input, message);
        });
        return;
    }
    
    // Show loading state
    const submitButton = loginForm.querySelector('button[type="submit"]');
    submitButton.classList.add('loading');
    submitButton.disabled = true;
    
    try {
        // Get employee from database
        const employee = await databaseService.getEmployeeById(formData.employeeId);
        
        if (employee) {
            // Hash password for verification
            const { hash } = await passwordSecurity.hashPassword(formData.password);
            
            // Verify credentials
            const verifiedEmployee = await databaseService.verifyEmployeeCredentials(
                formData.employeeId,
                hash
            );
            
            if (verifiedEmployee) {
                currentUser = {
                    id: verifiedEmployee.EmployeeID,
                    name: employee.Designation,
                    role: verifiedEmployee.IsAdmin ? 'admin' : 'employee',
                    department: employee.DeptName
                };
                
                // Show 2FA section
                loginForm.classList.add('hidden');
                twoFactorAuth.classList.remove('hidden');
                
                // Generate and send OTP (simulated)
                const otp = generateOTP();
                console.log('OTP:', otp); // In production, this would be sent via SMS/email
                
                // Start OTP timer
                startOTPTimer();
            } else {
                throw new Error('Invalid credentials');
            }
        } else {
            throw new Error('Invalid credentials');
        }
    } catch (error) {
        showError(passwordInput, error.message);
    } finally {
        submitButton.classList.remove('loading');
        submitButton.disabled = false;
    }
});

// Handle OTP Verification
verifyOTPButton.addEventListener('click', () => {
    const otp = Array.from(otpInputs).map(input => input.value).join('');
    
    if (otp.length !== 6) {
        alert('Please enter a valid 6-digit OTP');
        return;
    }
    
    // Simulate OTP verification
    if (otp === '123456') { // For demo purposes
        // Store user session
        localStorage.setItem('user', JSON.stringify(currentUser));
        
        // Redirect based on role
        const redirectUrl = currentUser.role === 'admin' ? 'admin/dashboard.html' : 'employee/dashboard.html';
        window.location.href = redirectUrl;
    } else {
        alert('Invalid OTP. Please try again.');
    }
});

// Handle Resend OTP
resendOTPButton.addEventListener('click', () => {
    if (resendOTPButton.disabled) return;
    
    // Generate new OTP
    const otp = generateOTP();
    console.log('New OTP:', otp); // In production, this would be sent via SMS/email
    
    // Reset OTP inputs
    otpInputs.forEach(input => input.value = '');
    otpInputs[0].focus();
    
    // Restart timer
    startOTPTimer();
});

// Remember Me Functionality
const rememberCheckbox = document.getElementById('remember');
const savedEmployeeId = localStorage.getItem('rememberedEmployeeId');

if (savedEmployeeId) {
    document.getElementById('employeeId').value = savedEmployeeId;
    rememberCheckbox.checked = true;
}

rememberCheckbox.addEventListener('change', (e) => {
    if (e.target.checked) {
        localStorage.setItem('rememberedEmployeeId', document.getElementById('employeeId').value);
    } else {
        localStorage.removeItem('rememberedEmployeeId');
    }
});

// Forgot Password Link
document.querySelector('.forgot-password').addEventListener('click', (e) => {
    e.preventDefault();
    alert('Password reset link will be sent to your registered email address.');
    // In production, this would trigger a password reset flow
});

// Account Creation Elements
const createEmployeeBtn = document.getElementById('createEmployeeBtn');
const createAdminBtn = document.getElementById('createAdminBtn');
const createEmployeeModal = document.getElementById('createEmployeeModal');
const createAdminModal = document.getElementById('createAdminModal');
const createEmployeeForm = document.getElementById('createEmployeeForm');
const createAdminForm = document.getElementById('createAdminForm');

// Admin Code (in production, this would be stored securely)
const ADMIN_CODE = 'ADMIN123';

// Modal Management
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        // Reset form when opening modal
        const form = modal.querySelector('form');
        if (form) {
            form.reset();
            clearErrors(form);
        }
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
    }
}

// Close modals when clicking outside
window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        closeModal(e.target.id);
    }
});

// Close modals when clicking close button
document.querySelectorAll('.close-modal').forEach(btn => {
    btn.addEventListener('click', () => {
        const modal = btn.closest('.modal');
        if (modal) {
            closeModal(modal.id);
        }
    });
});

// Event Listeners for Account Creation Buttons
document.getElementById('createEmployeeBtn').addEventListener('click', () => {
    openModal('createEmployeeModal');
});

document.getElementById('createAdminBtn').addEventListener('click', () => {
    openModal('createAdminModal');
});

// Form Validation
function validateCreateAccountForm(formData, isAdmin = false) {
    const errors = {};
    
    if (!formData.fullName) {
        errors.fullName = 'Full name is required';
    }
    
    if (!formData.email) {
        errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        errors.email = 'Invalid email format';
    }
    
    if (isAdmin && formData.adminCode !== ADMIN_CODE) {
        errors.adminCode = 'Invalid admin code';
    }
    
    if (!formData.password) {
        errors.password = 'Password is required';
    } else if (formData.password.length < 8) {
        errors.password = 'Password must be at least 8 characters';
    }
    
    if (formData.password !== formData.confirmPassword) {
        errors.confirmPassword = 'Passwords do not match';
    }
    
    return errors;
}

// Show Error Message
function showError(input, message) {
    const formGroup = input.closest('.form-group');
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    formGroup.classList.add('error');
    formGroup.appendChild(errorDiv);
}

// Clear Error Messages
function clearErrors(form) {
    form.querySelectorAll('.error-message').forEach(error => error.remove());
    form.querySelectorAll('.form-group').forEach(group => group.classList.remove('error'));
}

// Generate Employee ID
function generateEmployeeId() {
    const prefix = 'EMP';
    const timestamp = Date.now().toString().slice(-4);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}${timestamp}${random}`;
}

// Handle Employee Account Creation
createEmployeeForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors(createEmployeeForm);
    
    const formData = new FormData(createEmployeeForm);
    const data = {
        fullName: formData.get('fullName'),
        email: formData.get('email'),
        department: formData.get('department'),
        password: formData.get('password'),
        confirmPassword: formData.get('confirmPassword')
    };
    
    const errors = validateCreateAccountForm(data);
    if (Object.keys(errors).length > 0) {
        Object.entries(errors).forEach(([field, message]) => {
            const input = createEmployeeForm.querySelector(`[name="${field}"]`);
            showError(input, message);
        });
        return;
    }
    
    const submitButton = createEmployeeForm.querySelector('button[type="submit"]');
    submitButton.classList.add('loading');
    submitButton.disabled = true;
    
    try {
        // Hash password with Web3 security
        const { hash, saltInfo } = await passwordSecurity.hashPassword(data.password);
        
        // Get department ID
        const departments = await databaseService.getDepartments();
        const department = departments.find(d => d.DeptName === data.department);
        
        if (!department) {
            throw new Error('Invalid department');
        }
        
        // Create employee account
        const employeeData = {
            id: generateEmployeeId(),
            passwordHash: hash,
            designation: data.fullName,
            departmentId: department.DeptID,
            isAdmin: false,
            saltInfo
        };
        
        // Store in database
        await databaseService.createEmployee(employeeData);
        
        // Show success message
        const successMessage = document.createElement('div');
        successMessage.className = 'success-message';
        successMessage.textContent = 'Account created successfully! You can now login.';
        createEmployeeForm.appendChild(successMessage);
        
        // Reset form and close modal after delay
        setTimeout(() => {
            createEmployeeForm.reset();
            successMessage.remove();
            closeModal('createEmployeeModal');
        }, 2000);
    } catch (error) {
        showError(createEmployeeForm.querySelector('input[name="email"]'), 'Failed to create account. Please try again.');
    } finally {
        submitButton.classList.remove('loading');
        submitButton.disabled = false;
    }
});

// Handle Admin Account Creation
createAdminForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors(createAdminForm);
    
    const formData = new FormData(createAdminForm);
    const data = {
        fullName: formData.get('fullName'),
        email: formData.get('email'),
        adminCode: formData.get('adminCode'),
        password: formData.get('password'),
        confirmPassword: formData.get('confirmPassword')
    };
    
    const errors = validateCreateAccountForm(data, true);
    if (Object.keys(errors).length > 0) {
        Object.entries(errors).forEach(([field, message]) => {
            const input = createAdminForm.querySelector(`[name="${field}"]`);
            showError(input, message);
        });
        return;
    }
    
    const submitButton = createAdminForm.querySelector('button[type="submit"]');
    submitButton.classList.add('loading');
    submitButton.disabled = true;
    
    try {
        // Hash password with Web3 security
        const { hash, saltInfo } = await passwordSecurity.hashPassword(data.password);
        
        // Create admin account
        const adminData = {
            id: 'ADM' + Date.now().toString().slice(-4),
            passwordHash: hash,
            designation: data.fullName,
            departmentId: 1, // Assuming 1 is the admin department ID
            isAdmin: true,
            saltInfo
        };
        
        // Store in database
        await databaseService.createEmployee(adminData);
        
        // Show success message
        const successMessage = document.createElement('div');
        successMessage.className = 'success-message';
        successMessage.textContent = 'Admin account created successfully! You can now login.';
        createAdminForm.appendChild(successMessage);
        
        // Reset form and close modal after delay
        setTimeout(() => {
            createAdminForm.reset();
            successMessage.remove();
            closeModal('createAdminModal');
        }, 2000);
    } catch (error) {
        showError(createAdminForm.querySelector('input[name="email"]'), 'Failed to create account. Please try again.');
    } finally {
        submitButton.classList.remove('loading');
        submitButton.disabled = false;
    }
}); 