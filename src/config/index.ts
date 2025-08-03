import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Validate required environment variables
const requiredEnvVars = [
  "NODE_ENV",
  "PORT",
  "DB_HOST",
  "DB_NAME",
  "DB_USER",
  "DB_PASSWORD",
  "JWT_SECRET",
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Required environment variable ${envVar} is not set`);
  }
}

export const config = {
  // Server configuration
  env: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT || "5000", 10),
  apiVersion: process.env.API_VERSION || "v1",

  // Database configuration
  db: {
    host: process.env.DB_HOST!,
    port: parseInt(process.env.DB_PORT || "5432", 10),
    name: process.env.DB_NAME!,
    user: process.env.DB_USER!,
    password: process.env.DB_PASSWORD!,
    ssl: process.env.DB_SSL === "true",
  },

  // Redis configuration
  redis: {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379", 10),
    password: process.env.REDIS_PASSWORD || "",
    db: parseInt(process.env.REDIS_DB || "0", 10),
  },

  // JWT configuration
  jwt: {
    secret: process.env.JWT_SECRET!,
    expiresIn: process.env.JWT_EXPIRES_IN || "24h",
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  },

  // Admin configuration
  admin: {
    email: process.env.ADMIN_EMAIL || "admin@vukawifi.com",
    password: process.env.ADMIN_PASSWORD || "admin1234",
    firstName: process.env.ADMIN_FIRST_NAME || "System",
    lastName: process.env.ADMIN_LAST_NAME || "Administrator",
  },

  // M-Pesa configuration
  mpesa: {
    consumerKey: process.env.MPESA_CONSUMER_KEY || "",
    consumerSecret: process.env.MPESA_CONSUMER_SECRET || "",
    businessShortCode: process.env.MPESA_BUSINESS_SHORT_CODE || "174379",
    passkey: process.env.MPESA_LIPA_NA_MPESA_PASSKEY || "",
    callbackUrl: process.env.MPESA_CALLBACK_URL || "",
    environment: process.env.MPESA_ENVIRONMENT || "sandbox",
  },

  // SMS configuration
  sms: {
    provider: process.env.SMS_PROVIDER || "africas_talking",
    africasTalking: {
      username: process.env.AFRICAS_TALKING_USERNAME || "",
      apiKey: process.env.AFRICAS_TALKING_API_KEY || "",
    },
    senderId: process.env.SMS_SENDER_ID || "VukaWiFi",
  },

  // Router configuration
  router: {
    host: process.env.ROUTER_HOST || "192.168.1.1",
    username: process.env.ROUTER_USERNAME || "admin",
    password: process.env.ROUTER_PASSWORD || "",
    apiPort: parseInt(process.env.ROUTER_API_PORT || "8728", 10),
  },

  // WiFi configuration
  wifi: {
    ssid: process.env.WIFI_SSID || "VukaWiFi_Guest",
    defaultBandwidthDown: process.env.WIFI_DEFAULT_BANDWIDTH_DOWNLOAD || "10M",
    defaultBandwidthUp: process.env.WIFI_DEFAULT_BANDWIDTH_UPLOAD || "5M",
  },

  // Application configuration
  app: {
    name: process.env.APP_NAME || "VukaWiFi",
    url: process.env.APP_URL || "https://vukawifi.com" || "https://vuka-wifi.vercel.app/",
    corsOrigins: process.env.CORS_ORIGINS?.split(",") || [
      "http://localhost:3000",
      "http://localhost:5173",
      "https://vuka-wifi.vercel.app/",
      "https://vukawifi.online",
    ],
    maxDevicesPerPlan: parseInt(process.env.MAX_DEVICES_PER_PLAN || "5", 10),
  },

  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || "info",
    file: process.env.LOG_FILE || "logs/app.log",
  },

  // File upload configuration
  upload: {
    maxFileSize: process.env.MAX_FILE_SIZE || "5MB",
    path: process.env.UPLOAD_PATH || "uploads/",
  },
};

export default config;
