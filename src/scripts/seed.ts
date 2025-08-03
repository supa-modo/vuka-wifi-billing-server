#!/usr/bin/env ts-node

import { connectDatabase } from "../config/database";
import { initializeDatabase } from "../models";
import { seedDatabase, resetAndSeedDatabase } from "../seeders";

/**
 * Database seeding CLI script
 * Usage:
 *   npm run seed           - Run normal seeding
 *   npm run seed:reset     - Reset and reseed database
 *   npm run seed:force     - Force reset and reseed
 */

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || "seed";

  try {
    console.log("🚀 Starting database seeding script...");

    // Connect to database
    await connectDatabase();
    console.log("✅ Connected to database");

    // Initialize models (but skip the basic seeding)
    console.log("✅ Database models initialized");

    switch (command) {
      case "seed":
        console.log("📦 Running normal database seeding...");
        await seedDatabase();
        break;

      case "reset":
      case "force":
        console.log("🔄 Resetting and reseeding database...");
        await resetAndSeedDatabase();
        break;

      default:
        console.log("❓ Unknown command:", command);
        console.log("Available commands: seed, reset, force");
        process.exit(1);
    }

    console.log("🎉 Seeding completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
}

// Run if script is executed directly
if (require.main === module) {
  main();
}

export { main };
