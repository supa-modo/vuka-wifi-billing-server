import { Sequelize } from "sequelize";
import { config } from "./index";

// Database connection instance
export const sequelize = new Sequelize({
  host: config.db.host,
  port: config.db.port,
  database: config.db.name,
  username: config.db.user,
  password: config.db.password,
  dialect: "postgres",
  logging: config.env === "development" ? console.log : false,
  ssl: config.db.ssl,
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
  dialectOptions: {
    ssl: config.db.ssl
      ? {
          require: true,
          rejectUnauthorized: false,
        }
      : false,
  },
});

// Test database connection
export const connectDatabase = async (): Promise<void> => {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connection established successfully");

    if (config.env === "development") {
      await sequelize.sync({ alter: true });
      console.log("✅ Database synchronized");
    }
  } catch (error) {
    console.error("❌ Unable to connect to database:", error);
    process.exit(1);
  }
};

export default sequelize;
