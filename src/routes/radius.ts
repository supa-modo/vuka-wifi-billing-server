import { Router } from "express";
import {
  authenticate,
  accounting,
  coa,
  getActiveSessions,
  disconnectUser,
  getSessionAccounting,
  testRadius,
  updateUserBandwidth,
  extendUserSession,
} from "../controllers/radiusController";

const router = Router();

// RADIUS protocol endpoints
router.post("/authenticate", authenticate);
router.post("/accounting", accounting);
router.post("/coa", coa);

// Admin management endpoints - Active Sessions
router.get("/sessions/active", getActiveSessions);
router.get("/accounting/:username", getSessionAccounting);

// Admin management endpoints - CoA Actions
router.post("/disconnect/:username", disconnectUser);
router.post("/bandwidth/:username", updateUserBandwidth);
router.post("/extend/:username", extendUserSession);

// Legacy disconnect endpoint (for backwards compatibility)
router.post("/disconnect", disconnectUser);

// Testing endpoint
router.get("/test", testRadius);

export default router;
