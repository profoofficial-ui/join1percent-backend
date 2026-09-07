import { Router } from 'express';
import {
  completeCheckout,
  createCheckoutOrder,
  failCheckoutOrder,
  listMyOrders,
  razorpayWebhook,
  verifyCheckoutPayment,
} from '../controllers/checkoutController.js';
import { optionalAuth } from '../middleware/optionalAuth.js';
import { requireAuth } from '../middleware/auth.js';

const checkoutRouter = Router();
checkoutRouter.post('/complete', optionalAuth, completeCheckout);
checkoutRouter.post('/create-order', optionalAuth, createCheckoutOrder);
checkoutRouter.post('/verify', optionalAuth, verifyCheckoutPayment);
checkoutRouter.post('/fail', optionalAuth, failCheckoutOrder);

const ordersRouter = Router();
ordersRouter.get('/mine', requireAuth, listMyOrders);

const webhookRouter = Router();
webhookRouter.post('/razorpay', razorpayWebhook);

export { checkoutRouter, ordersRouter, webhookRouter };
