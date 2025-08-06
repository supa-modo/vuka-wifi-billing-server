import { Router } from "express";
import {
  getPayments,
  getPayment,
  getPaymentsByPhone,
  initiatePayment,
  checkPaymentStatus,
  mpesaCallback,
  updatePaymentStatus,
  getPaymentStats,
} from "../controllers/paymentController";
import { authenticateAdmin } from "../middleware/authMiddleware";

const router = Router();

// Public routes (no authentication required)
router.post("/initiate", initiatePayment);
router.post("/mpesa/callback", mpesaCallback);
router.get("/:paymentId/status", checkPaymentStatus);

// Protected routes (authentication required)
router.use(authenticateAdmin);

// Admin payment management
router.get("/", getPayments);
router.get("/stats", getPaymentStats);
router.get("/:paymentId", getPayment);
router.get("/phone/:phoneNumber", getPaymentsByPhone);
router.put("/:paymentId/status", updatePaymentStatus);

export default router;
