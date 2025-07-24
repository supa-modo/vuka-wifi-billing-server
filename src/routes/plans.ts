import { Router } from "express";
import {
  getPlans,
  getPlan,
  calculatePlanPrice,
  createPlan,
  updatePlan,
  deletePlan,
  togglePlanStatus,
  setPlanPopular,
} from "../controllers/planController";
import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();

// Public routes - available to all users
router.get("/", getPlans);
router.get("/:id", getPlan);
router.post("/:id/calculate-price", calculatePlanPrice);

// Protected routes - require admin authentication
router.post("/", authMiddleware, createPlan);
router.put("/:id", authMiddleware, updatePlan);
router.delete("/:id", authMiddleware, deletePlan);
router.patch("/:id/toggle", authMiddleware, togglePlanStatus);
router.patch("/:id/set-popular", authMiddleware, setPlanPopular);

export default router;
