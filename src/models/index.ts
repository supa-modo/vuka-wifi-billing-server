import { sequelize } from "../config/database";

// Import models in dependency order
import Admin from "./Admin";
import Plan from "./Plan";
import User from "./User";
import UserSession from "./UserSession";
import Payment from "./Payment";

// Set up model associations
User.hasMany(UserSession, { foreignKey: 'userId', as: 'sessions' });
UserSession.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Plan.hasMany(UserSession, { foreignKey: 'planId', as: 'sessions' });
UserSession.belongsTo(Plan, { foreignKey: 'planId', as: 'plan' });

User.hasMany(Payment, { foreignKey: 'userId', as: 'payments' });
Payment.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Plan.hasMany(Payment, { foreignKey: 'planId', as: 'payments' });
Payment.belongsTo(Plan, { foreignKey: 'planId', as: 'plan' });

UserSession.hasOne(Payment, { foreignKey: 'sessionId', as: 'payment' });
Payment.belongsTo(UserSession, { foreignKey: 'sessionId', as: 'session' });

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
          name: "1 Hour",
          description: "Perfect for quick browsing and social media",
          basePrice: 10,
          durationHours: 1,
          maxDevices: 3,
          isActive: true,
          isPopular: false,
          features: [
            "High-speed internet",
            "Up to 3 devices",
            "Social media access",
            "Email & browsing + more"
          ],
        },
        {
          name: "1 Day",
          description: "Great for a full day of work or entertainment",
          basePrice: 50,
          durationHours: 24,
          maxDevices: 5,
          isActive: true,
          isPopular: true,
          features: [
            "High-speed internet",
            "Up to 5 devices",
            "Streaming & downloads",
            "Video calls",
            "24/7 support + more"
          ],
        },
        {
          name: "1 Week",
          description: "Ideal for extended stays and remote work",
          basePrice: 200,
          durationHours: 168, // 7 days
          maxDevices: 5,
          isActive: true,
          isPopular: false,
          features: [
            "High-speed internet",
            "Up to 5 devices",
            "Unlimited browsing",
            "Priority support",
            "File sharing + more"
          ],
        },
        {
          name: "1 Month",
          description: "Best value for long-term internet access",
          basePrice: 500,
          durationHours: 720, // 30 days
          maxDevices: 8,
          isActive: true,
          isPopular: false,
          features: [
            "Ultra high-speed internet",
            "Up to 8 devices",
            "Premium support",
            "Cloud backup access",
            "Business tools + more"
          ],
        }
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
export type { UserSessionAttributes, UserSessionCreationAttributes } from "./UserSession";
export type { PaymentAttributes, PaymentCreationAttributes } from "./Payment";

export default {
  sequelize,
  Admin,
  syncDatabase,
  initializeDatabase,
};
