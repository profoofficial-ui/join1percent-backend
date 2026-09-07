import mongoose from 'mongoose';
import { env } from './env.js';
function maskMongoUri(uri) {
    try {
        return uri.replace(/(mongodb(?:\+srv)?:\/\/[^:]+:)([^@]+)(@.+)/, '$1******$3');
    }
    catch {
        return '***';
    }
}
export async function connectDb() {
    mongoose.set('strictQuery', true);
    try {
        await mongoose.connect(env.mongoUri);
        console.log(`MongoDB connected: ${maskMongoUri(env.mongoUri)}`);
    }
    catch (error) {
        console.error(`MongoDB connection failed (${maskMongoUri(env.mongoUri)}):`, error);
        console.error('Troubleshooting: Ensure MONGODB_URI in your .env or cPanel Environment Variables is pointing to a reachable database (e.g. MongoDB Atlas) and that MongoDB Atlas Network Access allows 0.0.0.0/0.');
        throw error;
    }
}
