/// <reference path="./types/express.d.ts" />
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { config } from "./config";
import { connectDatabase } from "./config/database";
import { initializeDatabase } from "./models";

// Create Express application
const app = express();

// Security middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// CORS configuration
app.use(
  cors({
    origin: true, // Allow all origins temporarily
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-api-key"],
  })
);

// CORS debugging middleware
app.use((req, res, next) => {
  console.log(`[CORS Debug] ${req.method} ${req.path}`);
  console.log(`[CORS Debug] Origin: ${req.headers.origin}`);
  console.log(`[CORS Debug] User-Agent: ${req.headers["user-agent"]}`);

  // Add CORS headers manually for debugging
  res.header("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.header("Access-Control-Allow-Credentials", "true");
  res.header(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, PATCH, OPTIONS"
  );
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, x-api-key"
  );

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  next();
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 100 requests per windowMs
  message: {
    error: "Too many requests from this IP, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/", limiter);

// Payment endpoint rate limiting (more strict)
const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit payment requests
  message: {
    error: "Too many payment requests, please try again later.",
  },
});
app.use("/api/*/payments/", paymentLimiter);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Logging middleware
if (config.env === "development") {
  app.use(morgan("combined"));
} else {
  app.use(morgan("combined"));
}

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    environment: config.env,
    version: "1.0.0",
  });
});

// CORS test endpoint
app.get("/cors-test", (req, res) => {
  res.status(200).json({
    message: "CORS is working!",
    origin: req.headers.origin,
    timestamp: new Date().toISOString(),
  });
});

app.get("/api", (req, res) => {
  res.json({
    message: "VukaWiFi Billing System API",
    version: "1.0.0",
    environment: config.env,
    endpoints: {
      health: "/health",
      api: `/api/${config.apiVersion}`,
      docs: `/api/${config.apiVersion}/docs`,
    },
  });
});

// Router setup
import apiRoutes from "./routes";
app.use(`/api/${config.apiVersion}`, apiRoutes);

// Error handling middleware
app.use(
  (
    error: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error("Error:", error);

    // Handle specific error types
    if (error.name === "ValidationError") {
      return res.status(400).json({
        error: "Validation Error",
        message: error.message,
        details: error.errors || [],
      });
    }

    if (error.name === "UnauthorizedError") {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Invalid or missing authentication token",
      });
    }

    if (error.name === "SequelizeValidationError") {
      return res.status(400).json({
        error: "Database Validation Error",
        message: error.message,
        details:
          error.errors?.map((e: any) => ({
            field: e.path,
            message: e.message,
          })) || [],
      });
    }

    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({
        error: "Duplicate Entry",
        message: "A record with this information already exists",
        field: error.errors?.[0]?.path || "unknown",
      });
    }

    // Default error
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      error:
        config.env === "development"
          ? error.name || "Internal Server Error"
          : "Internal Server Error",
      message:
        config.env === "development" ? error.message : "Something went wrong",
      ...(config.env === "development" && { stack: error.stack }),
    });
  }
);

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    error: "Not Found",
    message: `Route ${req.originalUrl} not found`,
    availableEndpoints: {
      health: "/health",
      api: `/api/${config.apiVersion}`,
    },
  });
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("SIGINT received, shutting down gracefully");
  process.exit(0);
});

// Start server
const startServer = async (): Promise<void> => {
  try {
    // Connect to database
    await connectDatabase();

    // Initialize database with default data
    await initializeDatabase();

    // Start HTTP server
    app.listen(config.port, () => {
      console.log(`
🚀 VukaWiFi Billing System Backend Started Successfully!

📊 Server Information:
   • Environment: ${config.env}
   • Port: ${config.port}
   • API Version: ${config.apiVersion}
   • Database: Connected ✅

🌐 Available Endpoints:
   • Health Check: http://localhost:${config.port}/health
   • API Base: http://localhost:${config.port}/api/${config.apiVersion}
   • API Info: http://localhost:${config.port}/api

🔐 Default Admin Credentials:
   • Email: admin@vukawifi.online
   • Password: admin123

⚡ Ready to accept requests!
      `);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  process.exit(1);
});

// Start the server
if (require.main === module) {
  startServer();
}

export default app;
