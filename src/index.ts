import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
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
  app.use(
    cors({
      origin: env.clientOrigin,
      credentials: true,
    })
  );

  // Webhooks need the raw body for signature verification.
  app.use('/api/webhooks', express.raw({ type: 'application/json' }), webhookRouter);

  app.use(express.json({ limit: '2mb' }));
  app.use(morgan('dev'));
  app.use('/uploads', express.static(UPLOADS_ROOT));

  setupSwagger(app);

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'coursellm-api', phase: 4, payments: 'razorpay' });
  });

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

  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    const message = err instanceof Error ? err.message : 'Internal server error.';
    const isUpload =
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      String((err as { code?: string }).code || '').startsWith('LIMIT_');
    res.status(isUpload ? 400 : 500).json({ message });
  });

  app.listen(env.port, () => {
    console.log(`API listening on http://localhost:${env.port}`);
    console.log(`Swagger UI at http://localhost:${env.port}/api/docs`);
    console.log(`Uploads folder: ${path.join(UPLOADS_ROOT)}`);
  });
}

main().catch((error) => {
  console.error('Failed to start API', error);
  process.exit(1);
});
