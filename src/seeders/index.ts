import { Admin, Plan } from "../models";
import { config } from "../config";

/**
 * Comprehensive database seeder for VukaWiFi Billing System
 * Creates admin users and payment plans with realistic data
 */

export async function seedDatabase(): Promise<void> {
  try {
    console.log("🌱 Starting database seeding...");

    // Create admin users
    await seedAdminUsers();

    // Create payment plans
    await seedPaymentPlans();

    console.log("✅ Database seeding completed successfully!");
  } catch (error) {
    console.error("❌ Database seeding failed:", error);
    throw error;
  }
}

/**
 * Seed admin users
 */
async function seedAdminUsers(): Promise<void> {
  console.log("👤 Seeding admin users...");

  const adminUsers = [
    {
      email: config.admin.email,
      password: "admin1234",
      firstName: config.admin.firstName,
      lastName: config.admin.lastName,
      role: "super_admin" as const,
    },
    {
      email: "manager@vukawifi.online",
      password: "manager123",
      firstName: "WiFi",
      lastName: "Manager",
      role: "admin" as const,
    },
    {
      email: "support@vukawifi.online",
      password: "support123",
      firstName: "Customer",
      lastName: "Support",
      role: "admin" as const,
    },
  ];

  for (const adminData of adminUsers) {
    const existingAdmin = await Admin.findByEmail(adminData.email);
    if (!existingAdmin) {
      // Password will be automatically hashed by model hooks
      await Admin.create(adminData);

      console.log(`✅ Created admin user: ${adminData.email}`);
    } else {
      console.log(`⏭️  Admin user already exists: ${adminData.email}`);
    }
  }
}

/**
 * Seed payment plans with realistic data
 */
async function seedPaymentPlans(): Promise<void> {
  console.log("💳 Seeding payment plans...");

  const plans = [
    {
      name: "Power Hour",
      description: "Perfect for quick browsing and social media",
      basePrice: 10,
      durationHours: 2,
      bandwidthLimit: "3M/1M",
      maxDevices: 3,
      isActive: true,
      isPopular: false,
      features: [
        "3 Mbps internet speed",
        "Up to 3 devices supported",
        "Unlimited Internet, Youtube + more",
      ],
    },
    {
      name: "Mega Hour",
      description: "Great for extended browsing sessions",
      basePrice: 20,
      durationHours: 3,
      bandwidthLimit: "5M/2M",
      maxDevices: 3,
      isActive: true,
      isPopular: false,
      features: [
        "5 Mbps internet speed",
        "Up to 3 devices supported",
        "Unlimited Internet, Youtube + more",
      ],
    },
    {
      name: "Standard Day",
      description: "Great for work and entertainment all day long",
      basePrice: 35,
      durationHours: 24,
      bandwidthLimit: "5M/2M",
      maxDevices: 5,
      isActive: true,
      isPopular: true,
      features: [
        "5 Mbps internet speed",
        "Up to 5 devices supported",
        "24/7 customer support + more",
      ],
    },
    {
      name: "Premium Week",
      description: "Ultimate experience for heavy users and families",
      basePrice: 300,
      durationHours: 168,
      bandwidthLimit: "10M/5M",
      maxDevices: 5,
      isActive: true,
      isPopular: false,
      features: [
        "10+ Mbps premium internet speed",
        "Up to 5 devices supported",
        "Priority support + more",
      ],
    },
    {
      name: "Business Hour",
      description: "Professional grade for business meetings",
      basePrice: 25,
      durationHours: 4,
      bandwidthLimit: "8M/4M",
      maxDevices: 3,
      isActive: true,
      isPopular: false,
      features: [
        "8 Mbps guaranteed speed",
        "Video conference optimized",
        "Business priority + more",
      ],
    },
    {
      name: "Student Special",
      description: "Budget-friendly option for students",
      basePrice: 15,
      durationHours: 6,
      bandwidthLimit: "4M/2M",
      maxDevices: 2,
      isActive: true,
      isPopular: false,
      features: [
        "4 Mbps internet speed",
        "Research & study friendly",
        "Educational content access + more",
      ],
    },
    {
      name: "Unlimited Monthly",
      description: "Best value for long-term users",
      basePrice: 1200,
      durationHours: 720, // 30 days
      bandwidthLimit: "15M/8M",
      maxDevices: 10,
      isActive: true,
      isPopular: false,
      features: [
        "15+ Mbps premium speed",
        "Up to 10 devices supported",
        "Unlimited usage + more",
      ],
    },
    {
      name: "Express 30min",
      description: "Quick access for urgent needs",
      basePrice: 5,
      durationHours: 0.5,
      bandwidthLimit: "2M/1M",
      maxDevices: 1,
      isActive: false, // Disabled by default
      isPopular: false,
      features: ["2 Mbps speed", "Single device only", "Quick access + more"],
    },
  ];

  // Check if plans already exist
  const existingPlans = await Plan.findAll();

  if (existingPlans.length === 0) {
    await Plan.bulkCreate(plans);
    console.log(`✅ Created ${plans.length} payment plans`);
  } else {
    console.log(
      `⏭️  Payment plans already exist (${existingPlans.length} plans found)`
    );

    // Update existing plans if needed
    for (const planData of plans) {
      const existingPlan = existingPlans.find((p) => p.name === planData.name);
      if (existingPlan) {
        await existingPlan.update(planData);
        console.log(`🔄 Updated plan: ${planData.name}`);
      }
    }
  }
}

/**
 * Reset database with fresh seed data
 */
export async function resetAndSeedDatabase(): Promise<void> {
  try {
    console.log("🗑️  Resetting database...");

    // Clear existing data
    await Admin.destroy({ where: {} });
    await Plan.destroy({ where: {} });

    console.log("✅ Database cleared");

    // Reseed with fresh data
    await seedDatabase();
  } catch (error) {
    console.error("❌ Database reset failed:", error);
    throw error;
  }
}

/**
 * Individual seeder functions for testing
 */
export { seedAdminUsers, seedPaymentPlans };

export default {
  seedDatabase,
  resetAndSeedDatabase,
  seedAdminUsers,
  seedPaymentPlans,
};
