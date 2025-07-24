import { Router } from "express";
import { authenticate, accounting, coa } from "../controllers/radiusController";

const router = Router();

router.post("/authenticate", authenticate);
router.post("/accounting", accounting);
router.post("/coa", coa);

export default router;
