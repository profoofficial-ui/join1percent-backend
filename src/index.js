import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import mongoose from 'mongoose';
import { connectDb } from './config/db.js';
import { env } from './config/env.js';
import { reportCatalogueCounts, seedAdmin, seedFaqs, seedBundlesAndCourses, seedInstructors, seedTestimonials } from './seed.js';
import { backfillMissingCommissions, repairSponsorCodesFromOrders } from './services/commission.js';
import { UPLOADS_ROOT } from './middleware/upload.js';
import authRoutes from './routes/auth.js';
import courseRoutes from './routes/courses.js';
import adminCourseRoutes from './routes/adminCourses.js';
import adminUploadRoutes from './routes/adminUploads.js';
import bundleRoutes from './routes/bundles.js';
import adminBundleRoutes from './routes/adminBundles.js';
import { checkoutRouter, ordersRouter, webhookRouter } from './routes/checkout.js';
import adminRoutes from './routes/admin.js';
import settingsRoutes from './routes/settings.js';
import faqsRoutes from './routes/faqs.js';
import instructorRoutes from './routes/instructors.js';
import testimonialRoutes from './routes/testimonials.js';
import leadsRoutes from './routes/leads.js';
import { kycRouter, supportRouter, walletRouter, commissionRouter } from './routes/accountOps.js';
import myCoursesRouter from './routes/myCourses.js';
import { setupSwagger } from './docs/swagger.js';
async function main() {
    await connectDb();
    await seedAdmin();
    await seedFaqs();
    await seedBundlesAndCourses();
    await seedInstructors();
    await seedTestimonials();
    await reportCatalogueCounts();
    const repairedSponsors = await repairSponsorCodesFromOrders();
    if (repairedSponsors > 0) {
        console.log(`Repaired sponsor codes on ${repairedSponsors} user(s).`);
    }
    const backfilled = await backfillMissingCommissions();
    if (backfilled > 0) {
        console.log(`Backfilled commissions for ${backfilled} paid order(s).`);
    }
    const app = express();
    app.set('trust proxy', true);
    const configuredOrigins = (env.clientOrigin || '')
        .split(',')
        .map((s) => s.trim().replace(/\/$/, ''))
        .filter(Boolean);

    const defaultOrigins = [
        'https://join1percent.in',
        'https://www.join1percent.in',
        'http://localhost:3000',
        'http://localhost:5173',
    ];

    const allowedOrigins = Array.from(new Set([...defaultOrigins, ...configuredOrigins]));

    app.use(cors({
        origin: (origin, callback) => {
            if (!origin) return callback(null, true);

            if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
                return callback(null, true);
            }

            try {
                const url = new URL(origin);
                if (url.hostname === 'join1percent.in' || url.hostname.endsWith('.join1percent.in') || url.hostname === 'localhost') {
                    return callback(null, true);
                }
            } catch {
                // ignore
            }

            return callback(null, false);
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    }));
    // Webhooks need the raw body for signature verification.
    app.use('/api/webhooks', express.raw({ type: 'application/json' }), webhookRouter);
    app.use(express.json({ limit: '2mb' }));
    app.use(morgan('dev'));
    app.use('/uploads', express.static(UPLOADS_ROOT));
    setupSwagger(app);
    const getHealth = (_req, res) => {
        const isDbConnected = mongoose.connection.readyState === 1;
        res.status(isDbConnected ? 200 : 503).json({
            ok: isDbConnected,
            service: 'coursellm-api',
            database: isDbConnected ? 'connected' : 'disconnected',
            uptimeSeconds: Math.floor(process.uptime()),
            timestamp: new Date().toISOString(),
            phase: 4,
            payments: 'razorpay',
        });
    };
    app.get('/', (_req, res) => {
        res.json({
            name: 'coursellm-backend',
            status: 'online',
            health: '/api/health',
            docs: '/api/docs',
        });
    });
    app.get('/health', getHealth);
    app.get('/api/health', getHealth);
    app.use('/api/auth', authRoutes);
    app.use('/api/settings', settingsRoutes);
    app.use('/api/faqs', faqsRoutes);
    app.use('/api/instructors', instructorRoutes);
    app.use('/api/testimonials', testimonialRoutes);
    app.use('/api/leads', leadsRoutes);
    app.use('/api/courses', courseRoutes);
    app.use('/api/admin/courses', adminCourseRoutes);
    app.use('/api/admin/uploads', adminUploadRoutes);
    app.use('/api/bundles', bundleRoutes);
    app.use('/api/admin/bundles', adminBundleRoutes);
    app.use('/api/checkout', checkoutRouter);
    app.use('/api/orders', ordersRouter);
    app.use('/api/kyc', kycRouter);
    app.use('/api/support', supportRouter);
    app.use('/api/wallet', walletRouter);
    app.use('/api/commission', commissionRouter);
    app.use('/api/my-courses', myCoursesRouter);
    app.use('/api/admin', adminRoutes);
    app.use((err, _req, res, _next) => {
        console.error(err);
        const message = err instanceof Error ? err.message : 'Internal server error.';
        const isUpload = typeof err === 'object' &&
            err !== null &&
            'code' in err &&
            String(err.code || '').startsWith('LIMIT_');
        res.status(isUpload ? 400 : 500).json({ message });
    });
    app.listen(env.port, () => {
        const listenTarget = typeof env.port === 'number' ? `http://localhost:${env.port}` : String(env.port);
        console.log(`API listening on ${listenTarget}`);
        console.log(`Swagger UI at ${typeof env.port === 'number' ? `http://localhost:${env.port}/api/docs` : '/api/docs'}`);
        console.log(`Uploads folder: ${path.join(UPLOADS_ROOT)}`);
    });
}
main().catch((error) => {
    console.error('Failed to start API', error);
    process.exit(1);
});
