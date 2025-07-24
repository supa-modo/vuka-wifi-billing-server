import { Router } from "express";
import { login, resetRequest, resetConfirm, setup2FA, enable2FA, disable2FA, get2FAStatus } from "../controllers/authController";

const router = Router();

router.post("/login", login);
router.post("/reset-request", resetRequest);
router.post("/reset-confirm", resetConfirm);
router.post("/2fa/setup", setup2FA);
router.post("/2fa/enable", enable2FA);
router.post("/2fa/disable", disable2FA);
router.get("/2fa/status", get2FAStatus);

export default router;
