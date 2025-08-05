// User Session Service: Handles user creation and session management
import { Op } from "sequelize";
import { User, UserSession, Plan, Payment } from "../models";
import RadiusService from "./radiusService";

// Utility functions
function generateUsername(): string {
  const prefix = "User";
  const randomNum = Math.floor(Math.random() * 90000) + 10000; // 5-digit number
  return `${prefix}${randomNum}`;
}

function generateRandomPassword(length: number = 8): string {
  const charset = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}

export class UserSessionService {
  // Create new session after successful payment
  static async createSession(paymentData: {
    userId?: number;
    planId: number;
    phoneNumber: string;
    deviceCount: number;
    amount: number;
    paymentReference: string;
  }) {
    try {
      // Find or create user
      let user = await User.findOne({
        where: { phoneNumber: paymentData.phoneNumber },
      });

      if (!user) {
        // Create new user
        const username = generateUsername();
        user = await User.create({
          phoneNumber: paymentData.phoneNumber,
          username: username,
          passwordHash: "temp", // Will be updated with RADIUS password
          email: undefined,
          isActive: true,
        });
      }

      // Get plan details
      const plan = await Plan.findByPk(paymentData.planId);
      if (!plan) {
        throw new Error("Plan not found");
      }

      // Terminate any existing active sessions for this user
      await this.terminateUserSessions(user.id, "New-Session");

      // Calculate session expiry
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + plan.durationHours);

      // Generate RADIUS credentials
      const radiusUsername = user.username;
      const radiusPassword = generateRandomPassword(8);

      // Create user session
      const session = await UserSession.create({
        userId: user.id,
        planId: paymentData.planId.toString(),
        deviceCount: paymentData.deviceCount,
        username: radiusUsername,
        password: radiusPassword,
        expiresAt: expiresAt,
        paymentReference: paymentData.paymentReference,
        status: "active",
        sessionStart: new Date(),
      });

      // Add RADIUS credentials
      // Note: Converting UUID to hash for compatibility with integer sessionId
      const sessionIdHash = session.id
        ? session.id.replace(/-/g, "").substring(0, 8)
        : "0";
      const sessionIdInt = parseInt(sessionIdHash, 16) || 0;

      await RadiusService.addUserCredentials(
        radiusUsername,
        radiusPassword,
        plan,
        paymentData.deviceCount,
        sessionIdInt
      );

      // Update user's last login
      await user.update({
        lastLogin: new Date(),
      });

      return {
        success: true,
        session,
        user,
        credentials: {
          username: radiusUsername,
          password: radiusPassword,
          validUntil: expiresAt,
        },
      };
    } catch (error: unknown) {
      console.error("Error creating session:", error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  // Terminate all active sessions for a user
  static async terminateUserSessions(
    userId: string,
    reason: string = "User-Request"
  ) {
    try {
      const activeSessions = await UserSession.findAll({
        where: {
          userId: userId,
          status: "active",
        },
      });

      for (const session of activeSessions) {
        await this.terminateSession(session.id, reason);
      }

      return {
        success: true,
        terminatedCount: activeSessions.length,
      };
    } catch (error: unknown) {
      console.error("Error terminating user sessions:", error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  // Get active sessions with device information
  static async getActiveSessions(filters: any = {}) {
    try {
      const whereClause: any = {
        status: "active",
        expiresAt: {
          [Op.gt]: new Date(),
        },
      };

      // Apply filters
      if (filters.planId) {
        whereClause.planId = filters.planId;
      }

      const sessions = await UserSession.findAll({
        where: whereClause,
        include: [
          {
            model: User,
            attributes: ["id", "phoneNumber", "username"],
          },
          {
            model: Plan,
            attributes: ["id", "name", "bandwidth_limit", "durationHours"],
          },
        ],
        order: [["sessionStart", "DESC"]],
      });

      // Get RADIUS accounting data for each session
      const sessionsWithAccounting = await Promise.all(
        sessions.map(async (session) => {
          const accounting = await RadiusService.getSessionAccounting(
            session.username
          );
          return {
            ...session.toJSON(),
            accounting,
            activeDevices: accounting.filter((acc: any) => !acc.acctstoptime)
              .length,
          };
        })
      );

      return {
        success: true,
        sessions: sessionsWithAccounting,
      };
    } catch (error: unknown) {
      console.error("Error fetching active sessions:", error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  // Get all sessions (active and inactive) for admin dashboard
  static async getAllSessions(filters: any = {}) {
    try {
      const whereClause: any = {};

      // Apply filters
      if (filters.status) {
        whereClause.status = filters.status;
      }
      if (filters.planId) {
        whereClause.planId = filters.planId;
      }
      if (filters.userId) {
        whereClause.userId = filters.userId;
      }

      const sessions = await UserSession.findAll({
        where: whereClause,
        include: [
          {
            model: User,
            attributes: ["id", "phoneNumber", "username", "createdAt"],
          },
          {
            model: Plan,
            attributes: [
              "id",
              "name",
              "bandwidth_limit",
              "durationHours",
              "basePrice",
            ],
          },
        ],
        order: [["createdAt", "DESC"]],
        limit: filters.limit || 100,
        offset: filters.offset || 0,
      });

      // Get accounting data for sessions
      const sessionsWithData = await Promise.all(
        sessions.map(async (session) => {
          const accounting = await RadiusService.getSessionAccounting(
            session.username
          );
          return {
            ...session.toJSON(),
            totalDataUsageMB:
              Math.round(
                ((session.bytesIn + session.bytesOut) / (1024 * 1024)) * 100
              ) / 100,
            activeDevices: accounting.filter((acc: any) => !acc.acctstoptime)
              .length,
            lastActivity: session.updatedAt,
          };
        })
      );

      return {
        success: true,
        sessions: sessionsWithData,
        totalCount: await UserSession.count({ where: whereClause }),
      };
    } catch (error: unknown) {
      console.error("Error fetching all sessions:", error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  // Terminate session
  static async terminateSession(
    sessionId: string,
    reason: string = "Admin-Request"
  ) {
    try {
      const session = await UserSession.findByPk(sessionId);
      if (!session) {
        throw new Error("Session not found");
      }

      // Send CoA disconnect to RADIUS
      await RadiusService.disconnectUser(session.username, reason);

      // Update session status
      await session.update({
        status: "terminated",
        sessionEnd: new Date(),
      });

      // Remove RADIUS credentials
      await RadiusService.removeUserCredentials(session.username);

      return {
        success: true,
        message: "Session terminated successfully",
      };
    } catch (error: unknown) {
      console.error("Error terminating session:", error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  // Bulk terminate sessions
  static async bulkTerminateSessions(
    sessionIds: string[],
    reason: string = "Admin-Request"
  ) {
    try {
      const results = [];

      for (const sessionId of sessionIds) {
        const result = await this.terminateSession(sessionId, reason);
        results.push({ sessionId, ...result });
      }

      const successCount = results.filter((r) => r.success).length;
      const failCount = results.filter((r) => !r.success).length;

      return {
        success: true,
        message: `Terminated ${successCount} sessions. ${failCount} failed.`,
        results,
      };
    } catch (error: unknown) {
      console.error("Error bulk terminating sessions:", error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  // Handle session expiry (called by cron job)
  static async expireExpiredSessions() {
    try {
      const expiredSessions = await UserSession.findAll({
        where: {
          status: "active",
          expiresAt: {
            [Op.lt]: new Date(),
          },
        },
      });

      const results = [];
      for (const session of expiredSessions) {
        const result = await this.terminateSession(
          session.id,
          "Session-Timeout"
        );
        results.push(result);
      }

      return {
        success: true,
        expiredCount: expiredSessions.length,
        results,
      };
    } catch (error: unknown) {
      console.error("Error expiring sessions:", error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  // Get session statistics for dashboard
  static async getSessionStatistics() {
    try {
      const stats = await Promise.all([
        // Total active sessions
        UserSession.count({
          where: {
            status: "active",
            expiresAt: { [Op.gt]: new Date() },
          },
        }),

        // Total sessions today
        UserSession.count({
          where: {
            createdAt: { [Op.gte]: new Date(new Date().setHours(0, 0, 0, 0)) },
          },
        }),

        // Total sessions this week
        UserSession.count({
          where: {
            createdAt: {
              [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            },
          },
        }),

        // Sessions by plan
        UserSession.findAll({
          where: {
            status: "active",
            expiresAt: { [Op.gt]: new Date() },
          },
          include: [
            {
              model: Plan,
              attributes: ["id", "name"],
            },
          ],
        }),
      ]);

      // Process sessions by plan
      const sessionsByPlan = stats[3].reduce((acc: any, session: any) => {
        const planName = session.Plan?.name || "Unknown";
        acc[planName] = (acc[planName] || 0) + 1;
        return acc;
      }, {});

      return {
        success: true,
        statistics: {
          activeSessions: stats[0],
          sessionsToday: stats[1],
          sessionsThisWeek: stats[2],
          sessionsByPlan,
        },
      };
    } catch (error: unknown) {
      console.error("Error fetching session statistics:", error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  // Authenticate user for WiFi login
  static async authenticateUser(username: string, password: string) {
    try {
      const result = await RadiusService.authenticate(username, password);

      if (result.success) {
        // Last activity is tracked by updatedAt automatically when session is modified
        // Could add specific lastActivity field to model if needed
      }

      return result;
    } catch (error: unknown) {
      console.error("Error authenticating user:", error);
      return {
        success: false,
        message: "Authentication failed",
        code: "Access-Reject",
      };
    }
  }

  // Get user session by phone number
  static async getUserSessionByPhone(phoneNumber: string) {
    try {
      const user = await User.findOne({
        where: { phoneNumber: phoneNumber },
      });

      if (!user) {
        return {
          success: false,
          message: "User not found",
        };
      }

      const activeSession = await UserSession.findOne({
        where: {
          userId: user.id,
          status: "active",
          expiresAt: { [Op.gt]: new Date() },
        },
        include: [
          {
            model: Plan,
            attributes: ["id", "name", "bandwidth_limit", "durationHours"],
          },
        ],
        order: [["createdAt", "DESC"]],
      });

      return {
        success: true,
        user,
        session: activeSession,
      };
    } catch (error: unknown) {
      console.error("Error fetching user session:", error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }
}

export default UserSessionService;
