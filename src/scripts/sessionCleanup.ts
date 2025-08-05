#!/usr/bin/env node

// Session Cleanup Script: Handles expired sessions and cleanup tasks
// This script should be run as a cron job every 5-10 minutes

import { sequelize } from "../config/database";
import UserSessionService from "../services/userSessionService";
import RadiusService from "../services/radiusService";

async function runSessionCleanup() {
  console.log(`[${new Date().toISOString()}] Starting session cleanup...`);

  try {
    // Connect to database
    await sequelize.authenticate();
    console.log("Database connection established.");

    // 1. Expire expired sessions
    console.log("Checking for expired sessions...");
    const expiredResult = await UserSessionService.expireExpiredSessions();

    if (expiredResult.success) {
      console.log(`Expired ${expiredResult.expiredCount} sessions.`);
    } else {
      console.error("Error expiring sessions:", expiredResult.error);
    }

    // 2. Clean up orphaned RADIUS records
    console.log("Cleaning up orphaned RADIUS records...");
    await cleanupOrphanedRadiusRecords();

    // 3. Update session data usage from RADIUS accounting
    console.log("Updating session data usage...");
    await updateSessionDataUsage();

    // 4. Log session statistics
    const stats = await UserSessionService.getSessionStatistics();
    if (stats.success && stats.statistics) {
      console.log("Current session statistics:", {
        active: stats.statistics.activeSessions,
        today: stats.statistics.sessionsToday,
        thisWeek: stats.statistics.sessionsThisWeek,
      });
    }

    console.log(
      `[${new Date().toISOString()}] Session cleanup completed successfully.`
    );
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] Session cleanup failed:`,
      error
    );
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Clean up orphaned RADIUS records (records without valid sessions)
async function cleanupOrphanedRadiusRecords() {
  try {
    // Clean up radius_check records for non-existent sessions
    await sequelize.query(`
      DELETE FROM radius_check 
      WHERE user_session_id NOT IN (
        SELECT id FROM user_sessions WHERE status = 'active'
      )
    `);

    // Clean up radius_reply records for non-existent sessions
    await sequelize.query(`
      DELETE FROM radius_reply 
      WHERE user_session_id NOT IN (
        SELECT id FROM user_sessions WHERE status = 'active'
      )
    `);

    // Clean up old accounting records (older than 30 days)
    await sequelize.query(`
      DELETE FROM radius_accounting 
      WHERE acctstoptime < NOW() - INTERVAL '30 days'
    `);

    // Clean up old post-auth records (older than 7 days)
    await sequelize.query(`
      DELETE FROM radius_postauth 
      WHERE authdate < NOW() - INTERVAL '7 days'
    `);

    console.log("Orphaned RADIUS records cleaned up.");
  } catch (error) {
    console.error("Error cleaning up orphaned RADIUS records:", error);
  }
}

// Update session data usage from RADIUS accounting
async function updateSessionDataUsage() {
  try {
    await sequelize.query(`
      UPDATE user_sessions 
      SET 
        data_usage_mb = COALESCE((
          SELECT ROUND((SUM(acctinputoctets) + SUM(acctoutputoctets)) / 1024.0 / 1024.0)
          FROM radius_accounting 
          WHERE username = user_sessions.radius_username
          AND acctstarttime >= user_sessions.session_start
        ), 0),
        last_activity = COALESCE((
          SELECT MAX(acctupdatetime)
          FROM radius_accounting 
          WHERE username = user_sessions.radius_username
          AND acctstoptime IS NULL
        ), last_activity)
      WHERE status = 'active'
      AND radius_username IS NOT NULL
    `);

    console.log("Session data usage updated from RADIUS accounting.");
  } catch (error) {
    console.error("Error updating session data usage:", error);
  }
}

// Run the cleanup if this script is executed directly
if (require.main === module) {
  runSessionCleanup()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("Fatal error:", error);
      process.exit(1);
    });
}

export { runSessionCleanup };
