import { sequelize } from "../config/database";

// Import models in dependency order
import Admin from "./Admin";
import Plan from "./Plan";
import User from "./User";
import UserSession from "./UserSession";
import Payment from "./Payment";

// Set up model associations
User.hasMany(UserSession, { foreignKey: "userId", as: "sessions" });
UserSession.belongsTo(User, { foreignKey: "userId", as: "user" });

Plan.hasMany(UserSession, { foreignKey: "planId", as: "sessions" });
UserSession.belongsTo(Plan, { foreignKey: "planId", as: "plan" });

User.hasMany(Payment, { foreignKey: "userId", as: "payments" });
Payment.belongsTo(User, { foreignKey: "userId", as: "user" });

Plan.hasMany(Payment, { foreignKey: "planId", as: "payments" });
Payment.belongsTo(Plan, { foreignKey: "planId", as: "plan" });

UserSession.hasOne(Payment, { foreignKey: "sessionId", as: "payment" });
Payment.belongsTo(UserSession, { foreignKey: "sessionId", as: "session" });

// Export all models
export { Admin } from "./Admin";
export { Plan } from "./Plan";
export { User } from "./User";
export { UserSession } from "./UserSession";
export { Payment } from "./Payment";
export { sequelize } from "../config/database";

// Export a function to sync all models
export const syncDatabase = async (force: boolean = false): Promise<void> => {
  try {
    await sequelize.sync({ force, alter: !force });
    console.log("✅ All models synchronized successfully");
  } catch (error) {
    console.error("❌ Database synchronization failed:", error);
    throw error;
  }
};

// Export a function to initialize all models with sample data
export const initializeDatabase = async (): Promise<void> => {
  try {
    // Create default admin user if it doesn't exist
    const adminExists = await Admin.findByEmail("admin@vukawifi.com");
    if (!adminExists) {
      await Admin.create({
        email: "admin@vukawifi.com",
        password: "admin123",
        firstName: "System",
        lastName: "Administrator",
        role: "super_admin",
      });
      console.log("✅ Default admin user created");
    }

    // Create default payment plans if they don't exist
    const planExists = await Plan.findOne();
    if (!planExists) {
      await Plan.bulkCreate([
        {
          name: "2 Hours",
          description: "Perfect for quick browsing and social media",
          basePrice: 10,
          durationHours: 2,
          bandwidthLimit: "3M/1M",
          maxDevices: 3,
          isActive: true,
          isPopular: false,
          features: [
            "3 Mbps internet speed",
            "Up to 3 devices",
            "Social media access",
            "Email & browsing + more",
          ],
        },
        {
          name: "3 Hours",
          description: "Great for extended browsing sessions",
          basePrice: 20,
          durationHours: 3,
          bandwidthLimit: "3M/1M",
          maxDevices: 3,
          isActive: true,
          isPopular: false,
          features: [
            "3 Mbps internet speed",
            "Up to 3 devices",
            "Streaming & downloads",
            "Video calls + more",
          ],
        },
        {
          name: "1 Day",
          description: "Full day of high-speed internet access",
          basePrice: 35,
          durationHours: 24,
          bandwidthLimit: "5M/2M",
          maxDevices: 5,
          isActive: true,
          isPopular: true,
          features: [
            "5 Mbps internet speed",
            "Up to 5 devices",
            "HD video streaming",
            "24/7 support + more",
          ],
        },
        {
          name: "1 Week",
          description: "Best value for extended stays and remote work",
          basePrice: 300,
          durationHours: 168, // 7 days
          bandwidthLimit: "10M/5M",
          maxDevices: 5,
          isActive: true,
          isPopular: false,
          features: [
            "10+ Mbps internet speed",
            "Up to 5 devices",
            "Unlimited browsing",
            "Priority support + more",
          ],
        },
      ]);
      console.log("✅ Default payment plans created");
    }

    console.log("✅ Database initialization completed");
  } catch (error) {
    console.error("❌ Database initialization failed:", error);
    throw error;
  }
};

export type { AdminAttributes, AdminCreationAttributes } from "./Admin";
export type { PlanAttributes, PlanCreationAttributes } from "./Plan";
export type { UserAttributes, UserCreationAttributes } from "./User";
export type {
  UserSessionAttributes,
  UserSessionCreationAttributes,
} from "./UserSession";
export type { PaymentAttributes, PaymentCreationAttributes } from "./Payment";

export default {
  sequelize,
  Admin,
  syncDatabase,
  initializeDatabase,
};
