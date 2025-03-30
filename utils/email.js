const nodemailer = require('nodemailer');

// Create a transporter using Gmail
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD // Use App Password for Gmail
    }
});

// Function to send company tokens via email
async function sendCompanyTokens(recipientEmail, recipientName, tokenAmount) {
    try {
        const mailOptions = {
            from: process.env.GMAIL_USER,
            to: recipientEmail,
            subject: 'Company Tokens Awarded',
            html: `
                <h2>Congratulations ${recipientName}!</h2>
                <p>You have been awarded ${tokenAmount} company tokens.</p>
                <p>These tokens can be used for various company benefits and rewards.</p>
                <p>Please log in to your dashboard to view and manage your tokens.</p>
                <br>
                <p>Best regards,</p>
                <p>Company Management</p>
            `
        };

        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.error('Error sending email:', error);
        return false;
    }
}

module.exports = {
    sendCompanyTokens
}; 