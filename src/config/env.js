import dotenv from 'dotenv';
dotenv.config();
const rawPort = process.env.PORT;
export const env = {
    port: rawPort ? (!isNaN(Number(rawPort)) ? Number(rawPort) : rawPort) : 5000,
    mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/coursellm',
    jwtSecret: process.env.JWT_SECRET || 'coursellm_dev_jwt_secret_change_me',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
    adminEmail: (process.env.ADMIN_EMAIL || 'admin@coursellm.com').toLowerCase(),
    adminPassword: process.env.ADMIN_PASSWORD || 'admin',
    adminName: process.env.ADMIN_NAME || 'Coursellm Admin',
    clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:3000',
    paymentProvider: (process.env.PAYMENT_PROVIDER || 'razorpay').toLowerCase(),
    razorpayKeyId: process.env.RAZORPAY_KEY_ID || '',
    razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || '',
    razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || '',
};
