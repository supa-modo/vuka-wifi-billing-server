import { Router } from "express";

import authRoutes from "./auth";
import planRoutes from "./plans";
import radiusRoutes from "./radius";
import paymentRoutes from "./payments";

const router = Router();

router.use("/auth", authRoutes);
router.use("/plans", planRoutes);
router.use("/radius", radiusRoutes);
router.use("/payments", paymentRoutes);

router.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    service: "VukaWiFi API",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

// API documentation endpoint
router.get("/docs", (req, res) => {
  res.json({
    message: "VukaWiFi Billing System API Documentation",
    version: "1.0.0",
    endpoints: {
      paymentPlans: {
        base: "/payment-plans",
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
        description: "Manage WiFi billing plans",
      },
      payments: {
        base: "/payments",
        methods: ["POST", "GET"],
        description: "Initiate and track M-Pesa payments",
      },
      wifi: {
        base: "/wifi",
        methods: ["POST", "GET"],
        description: "WiFi login and MAC address access",
      },
      adminPayments: {
        base: "/admin/payments",
        methods: ["GET"],
        description: "Admin: List and view payments",
      },
      adminSms: {
        base: "/admin/sms",
        methods: ["GET", "POST"],
        description: "Admin: List and retry SMS logs",
      },
      adminRouter: {
        base: "/admin/router",
        methods: ["GET", "POST"],
        description: "Admin: Router and WiFi credential management",
      },
      // More endpoints will be added here
    },
    authentication: {
      type: "Bearer Token (JWT)",
      header: "Authorization: Bearer <token>",
      adminEndpoints: [
        "POST /payment-plans",
        "PUT /payment-plans/:id",
        "DELETE /payment-plans/:id",
        "PATCH /payment-plans/:id/toggle",
        "PATCH /payment-plans/:id/set-popular",
        "GET /admin/payments",
        "GET /admin/sms",
        "GET /admin/router",
      ],
    },
  });
});

export default router;
