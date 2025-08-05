// RADIUS Service: Handles authentication, accounting, and CoA triggers
import { QueryTypes, Op } from "sequelize";
import { sequelize } from "../config/database";
import { User, UserSession, Plan } from "../models";
import dgram from "dgram";
// @ts-ignore
import radius from "node-radius";

export class RadiusService {
  private static readonly RADIUS_SECRET =
    process.env.RADIUS_SECRET || "testing123";
  private static readonly COA_PORT = parseInt(process.env.COA_PORT || "3799");

  // Add user credentials to RADIUS tables
  static async addUserCredentials(
    username: string,
    password: string,
    plan: any,
    deviceCount: number,
    sessionId: number
  ) {
    try {
      // Clear existing credentials for this user
      await this.removeUserCredentials(username);

      // Add password check
      await sequelize.query(
        `INSERT INTO radius_check (username, attribute, op, value, user_session_id) 
         VALUES (:username, 'Cleartext-Password', ':=', :password, :sessionId)`,
        {
          replacements: { username, password, sessionId },
          type: QueryTypes.INSERT,
        }
      );

      // Add simultaneous use limit (device count)
      await sequelize.query(
        `INSERT INTO radius_check (username, attribute, op, value, user_session_id) 
         VALUES (:username, 'Simultaneous-Use', ':=', :deviceCount, :sessionId)`,
        {
          replacements: {
            username,
            deviceCount: deviceCount.toString(),
            sessionId,
          },
          type: QueryTypes.INSERT,
        }
      );

      // Add session timeout (plan duration in seconds)
      const sessionTimeout = plan.durationHours * 3600;
      await sequelize.query(
        `INSERT INTO radius_reply (username, attribute, op, value, user_session_id) 
         VALUES (:username, 'Session-Timeout', '=', :timeout, :sessionId)`,
        {
          replacements: {
            username,
            timeout: sessionTimeout.toString(),
            sessionId,
          },
          type: QueryTypes.INSERT,
        }
      );

      // Add bandwidth limits if specified
      if (plan.bandwidth_limit) {
        const [downloadLimit, uploadLimit] = plan.bandwidth_limit.split("/");

        // Download limit (Mikrotik-Rate-Limit format: "upload/download")
        await sequelize.query(
          `INSERT INTO radius_reply (username, attribute, op, value, user_session_id) 
           VALUES (:username, 'Mikrotik-Rate-Limit', '=', :rateLimit, :sessionId)`,
          {
            replacements: {
              username,
              rateLimit: `${uploadLimit}/${downloadLimit}`,
              sessionId,
            },
            type: QueryTypes.INSERT,
          }
        );
      }

      // Add to user group for additional policies
      await sequelize.query(
        `INSERT INTO radius_usergroup (username, groupname, priority) 
         VALUES (:username, :groupname, 1)`,
        {
          replacements: {
            username,
            groupname: `plan_${plan.id}`,
          },
          type: QueryTypes.INSERT,
        }
      );

      return { success: true };
    } catch (error) {
      console.error("Error adding RADIUS credentials:", error);
      throw error;
    }
  }

  // Remove user credentials from RADIUS tables
  static async removeUserCredentials(username: string) {
    try {
      await sequelize.query(
        `DELETE FROM radius_check WHERE username = :username`,
        {
          replacements: { username },
          type: QueryTypes.DELETE,
        }
      );

      await sequelize.query(
        `DELETE FROM radius_reply WHERE username = :username`,
        {
          replacements: { username },
          type: QueryTypes.DELETE,
        }
      );

      await sequelize.query(
        `DELETE FROM radius_usergroup WHERE username = :username`,
        {
          replacements: { username },
          type: QueryTypes.DELETE,
        }
      );

      return { success: true };
    } catch (error) {
      console.error("Error removing RADIUS credentials:", error);
      throw error;
    }
  }

  // Authenticate user (called by RADIUS or REST endpoint)
  static async authenticate(username: string, password: string) {
    try {
      const result = await sequelize.query(
        `SELECT rc.username, rc.value as password, us.expires_at, us.status, u.is_active
         FROM radius_check rc
         JOIN user_sessions us ON rc.user_session_id = us.id
         JOIN users u ON us.user_id = u.id
         WHERE rc.username = :username 
         AND rc.attribute = 'Cleartext-Password'
         AND us.status = 'active'
         AND us.expires_at > NOW()
         AND u.is_active = true`,
        {
          replacements: { username },
          type: QueryTypes.SELECT,
        }
      );

      if (result.length === 0) {
        return {
          success: false,
          message: "User not found or session expired",
          code: "Access-Reject",
        };
      }

      const user = result[0] as any;
      if (user.password !== password) {
        return {
          success: false,
          message: "Invalid password",
          code: "Access-Reject",
        };
      }

      return {
        success: true,
        message: "Authentication successful",
        code: "Access-Accept",
        user: {
          username: user.username,
          expiresAt: user.expires_at,
        },
      };
    } catch (error) {
      console.error("RADIUS authentication error:", error);
      return {
        success: false,
        message: "Authentication failed",
        code: "Access-Reject",
      };
    }
  }

  // Accounting (start/stop/interim)
  static async accounting(data: any) {
    try {
      const {
        username,
        sessionId,
        nasIpAddress,
        acctstatus,
        acctSessionTime,
        acctInputOctets,
        acctOutputOctets,
        callingStationId,
        nasPortId,
      } = data;

      switch (acctstatus) {
        case "Start":
          await this.handleAccountingStart(data);
          break;
        case "Stop":
          await this.handleAccountingStop(data);
          break;
        case "Interim-Update":
          await this.handleAccountingUpdate(data);
          break;
      }

      return { success: true };
    } catch (error: unknown) {
      console.error("RADIUS accounting error:", error);
      return { success: false, error: (error as Error).message };
    }
  }

  // Handle accounting start
  private static async handleAccountingStart(data: any) {
    const { username, sessionId, nasIpAddress, callingStationId, nasPortId } =
      data;

    await sequelize.query(
      `INSERT INTO radius_accounting 
       (acctsessionid, username, nasipaddress, acctstarttime, acctupdatetime, 
        callingstationid, nasportid, acctinputoctets, acctoutputoctets, acctsessiontime)
       VALUES (:sessionId, :username, :nasIpAddress, NOW(), NOW(), 
               :callingStationId, :nasPortId, 0, 0, 0)`,
      {
        replacements: {
          sessionId,
          username,
          nasIpAddress,
          callingStationId: callingStationId || "",
          nasPortId: nasPortId || "",
        },
        type: QueryTypes.INSERT,
      }
    );

    // Update user session with device MAC address
    if (callingStationId) {
      await sequelize.query(
        `UPDATE user_sessions 
         SET device_mac_addresses = array_append(COALESCE(device_mac_addresses, '{}'), :macAddress),
             last_activity = NOW()
         WHERE radius_username = :username`,
        {
          replacements: {
            username,
            macAddress: callingStationId,
          },
          type: QueryTypes.UPDATE,
        }
      );
    }
  }

  // Handle accounting stop
  private static async handleAccountingStop(data: any) {
    const {
      username,
      sessionId,
      acctSessionTime,
      acctInputOctets,
      acctOutputOctets,
      acctTerminateCause,
    } = data;

    await sequelize.query(
      `UPDATE radius_accounting 
       SET acctstoptime = NOW(), 
           acctsessiontime = :sessionTime,
           acctinputoctets = :inputOctets,
           acctoutputoctets = :outputOctets,
           acctterminatecause = :terminateCause
       WHERE acctsessionid = :sessionId AND username = :username`,
      {
        replacements: {
          sessionId,
          username,
          sessionTime: acctSessionTime || 0,
          inputOctets: acctInputOctets || 0,
          outputOctets: acctOutputOctets || 0,
          terminateCause: acctTerminateCause || "User-Request",
        },
        type: QueryTypes.UPDATE,
      }
    );

    // Update user session data usage
    const totalMB = Math.round(
      ((parseInt(acctInputOctets) || 0) + (parseInt(acctOutputOctets) || 0)) /
        1024 /
        1024
    );

    await sequelize.query(
      `UPDATE user_sessions 
       SET data_usage_mb = :dataUsage,
           bytes_in = :inputOctets,
           bytes_out = :outputOctets,
           last_activity = NOW()
       WHERE radius_username = :username`,
      {
        replacements: {
          username,
          dataUsage: totalMB,
          inputOctets: acctInputOctets || 0,
          outputOctets: acctOutputOctets || 0,
        },
        type: QueryTypes.UPDATE,
      }
    );
  }

  // Handle accounting update
  private static async handleAccountingUpdate(data: any) {
    const {
      username,
      sessionId,
      acctSessionTime,
      acctInputOctets,
      acctOutputOctets,
    } = data;

    await sequelize.query(
      `UPDATE radius_accounting 
       SET acctupdatetime = NOW(),
           acctsessiontime = :sessionTime,
           acctinputoctets = :inputOctets,
           acctoutputoctets = :outputOctets
       WHERE acctsessionid = :sessionId AND username = :username`,
      {
        replacements: {
          sessionId,
          username,
          sessionTime: acctSessionTime || 0,
          inputOctets: acctInputOctets || 0,
          outputOctets: acctOutputOctets || 0,
        },
        type: QueryTypes.UPDATE,
      }
    );

    // Update user session
    const totalMB = Math.round(
      ((parseInt(acctInputOctets) || 0) + (parseInt(acctOutputOctets) || 0)) /
        1024 /
        1024
    );

    await sequelize.query(
      `UPDATE user_sessions 
       SET data_usage_mb = :dataUsage,
           bytes_in = :inputOctets,
           bytes_out = :outputOctets,
           last_activity = NOW()
       WHERE radius_username = :username`,
      {
        replacements: {
          username,
          dataUsage: totalMB,
          inputOctets: acctInputOctets || 0,
          outputOctets: acctOutputOctets || 0,
        },
        type: QueryTypes.UPDATE,
      }
    );
  }

  // CoA (Change of Authorization) - disconnect or update session
  static async sendCoA(
    username: string,
    sessionId: string,
    action: "disconnect" | "update" | "bandwidth" | "timeout",
    params?: any
  ) {
    try {
      switch (action) {
        case "disconnect":
          return await this.disconnectUser(
            username,
            params?.reason || "Admin-Request"
          );

        case "update":
        case "bandwidth":
          return await this.updateUserSession(username, sessionId, params);

        case "timeout":
          return await this.updateSessionTimeout(
            username,
            sessionId,
            params?.timeout
          );

        default:
          return { success: false, message: `Unknown CoA action: ${action}` };
      }
    } catch (error: unknown) {
      console.error("CoA error:", error);
      return { success: false, error: (error as Error).message };
    }
  }

  // Send CoA disconnect to NAS (proper RADIUS implementation)
  static async disconnectUser(
    username: string,
    reason: string = "Admin-Request"
  ) {
    try {
      // Get active sessions for this user
      const sessions = await sequelize.query(
        `SELECT ra.acctsessionid, ra.nasipaddress, ra.callingstationid, ra.nasportid
         FROM radius_accounting ra
         WHERE ra.username = :username AND ra.acctstoptime IS NULL`,
        {
          replacements: { username },
          type: QueryTypes.SELECT,
        }
      );

      if (sessions.length === 0) {
        return { success: false, message: "No active sessions found" };
      }

      const results = [];
      for (const session of sessions as any[]) {
        const result = await this.sendCoADisconnect(
          session.nasipaddress,
          session.acctsessionid,
          username,
          session.callingstationid,
          session.nasportid,
          reason
        );
        results.push(result);
      }

      const successCount = results.filter((r) => r.success).length;
      return {
        success: successCount > 0,
        disconnectedSessions: successCount,
        totalSessions: sessions.length,
        results,
      };
    } catch (error: unknown) {
      console.error("Error disconnecting user:", error);
      return { success: false, error: (error as Error).message };
    }
  }

  // Update user session (bandwidth, attributes)
  static async updateUserSession(
    username: string,
    sessionId: string,
    params: {
      bandwidth?: string; // e.g., "1M/2M" (upload/download)
      sessionTimeout?: number;
      idleTimeout?: number;
    }
  ) {
    try {
      // Get active sessions for this user
      const sessions = await sequelize.query(
        `SELECT ra.acctsessionid, ra.nasipaddress, ra.callingstationid, ra.nasportid
         FROM radius_accounting ra
         WHERE ra.username = :username AND ra.acctstoptime IS NULL`,
        {
          replacements: { username },
          type: QueryTypes.SELECT,
        }
      );

      if (sessions.length === 0) {
        return { success: false, message: "No active sessions found" };
      }

      const results = [];
      for (const session of sessions as any[]) {
        const result = await this.sendCoAUpdate(
          session.nasipaddress,
          session.acctsessionid,
          username,
          session.callingstationid,
          session.nasportid,
          params
        );
        results.push(result);
      }

      const successCount = results.filter((r) => r.success).length;
      return {
        success: successCount > 0,
        updatedSessions: successCount,
        totalSessions: sessions.length,
        results,
      };
    } catch (error: unknown) {
      console.error("Error updating user session:", error);
      return { success: false, error: (error as Error).message };
    }
  }

  // Update session timeout
  static async updateSessionTimeout(
    username: string,
    sessionId: string,
    timeoutSeconds: number
  ) {
    return await this.updateUserSession(username, sessionId, {
      sessionTimeout: timeoutSeconds,
    });
  }

  // Send proper RADIUS CoA Disconnect packet
  private static async sendCoADisconnect(
    nasIpAddress: string,
    sessionId: string,
    username: string,
    callingStationId: string,
    nasPortId: string,
    reason: string
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    return new Promise((resolve) => {
      try {
        // Create CoA Disconnect-Request packet
        const packet = radius.encode({
          code: "Disconnect-Request",
          secret: this.RADIUS_SECRET,
          identifier: Math.floor(Math.random() * 256),
          attributes: [
            ["User-Name", username],
            ["Acct-Session-Id", sessionId],
            ["NAS-IP-Address", nasIpAddress],
            ["Calling-Station-Id", callingStationId || ""],
            ["NAS-Port-Id", nasPortId || ""],
            ["Acct-Terminate-Cause", reason],
          ],
        });

        const client = dgram.createSocket("udp4");

        // Set timeout for response
        const timeout = setTimeout(() => {
          client.close();
          resolve({ success: false, error: "CoA request timeout" });
        }, 5000);

        // Listen for response
        client.on("message", (msg) => {
          clearTimeout(timeout);
          client.close();

          try {
            const response = radius.decode({
              packet: msg,
              secret: this.RADIUS_SECRET,
            });

            if (response.code === "CoA-ACK") {
              console.log(
                `✅ CoA Disconnect successful for ${username} on ${nasIpAddress}`
              );
              resolve({
                success: true,
                message: "Session disconnected successfully",
              });
            } else {
              console.log(
                `❌ CoA Disconnect failed for ${username} on ${nasIpAddress}: ${response.code}`
              );
              resolve({
                success: false,
                error: `CoA failed: ${response.code}`,
              });
            }
          } catch (error) {
            console.error("Error decoding CoA response:", error);
            resolve({ success: false, error: "Invalid CoA response" });
          }
        });

        // Send CoA packet
        client.send(
          packet,
          0,
          packet.length,
          this.COA_PORT,
          nasIpAddress,
          (error) => {
            if (error) {
              clearTimeout(timeout);
              client.close();
              console.error(`CoA send error for ${nasIpAddress}:`, error);
              resolve({ success: false, error: error.message });
            } else {
              console.log(
                `📡 CoA Disconnect sent to ${nasIpAddress} for session ${sessionId}`
              );
            }
          }
        );
      } catch (error: any) {
        console.error("CoA Disconnect error:", error);
        resolve({ success: false, error: error.message });
      }
    });
  }

  // Send proper RADIUS CoA Update packet
  private static async sendCoAUpdate(
    nasIpAddress: string,
    sessionId: string,
    username: string,
    callingStationId: string,
    nasPortId: string,
    params: {
      bandwidth?: string;
      sessionTimeout?: number;
      idleTimeout?: number;
    }
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    return new Promise((resolve) => {
      try {
        // Build attributes for CoA Request
        const attributes: any[] = [
          ["User-Name", username],
          ["Acct-Session-Id", sessionId],
          ["NAS-IP-Address", nasIpAddress],
          ["Calling-Station-Id", callingStationId || ""],
          ["NAS-Port-Id", nasPortId || ""],
        ];

        // Add bandwidth limit if specified (MikroTik format)
        if (params.bandwidth) {
          attributes.push(["Mikrotik-Rate-Limit", params.bandwidth]);
        }

        // Add session timeout if specified
        if (params.sessionTimeout) {
          attributes.push(["Session-Timeout", params.sessionTimeout]);
        }

        // Add idle timeout if specified
        if (params.idleTimeout) {
          attributes.push(["Idle-Timeout", params.idleTimeout]);
        }

        // Create CoA Request packet
        const packet = radius.encode({
          code: "CoA-Request",
          secret: this.RADIUS_SECRET,
          identifier: Math.floor(Math.random() * 256),
          attributes: attributes,
        });

        const client = dgram.createSocket("udp4");

        // Set timeout for response
        const timeout = setTimeout(() => {
          client.close();
          resolve({ success: false, error: "CoA request timeout" });
        }, 5000);

        // Listen for response
        client.on("message", (msg) => {
          clearTimeout(timeout);
          client.close();

          try {
            const response = radius.decode({
              packet: msg,
              secret: this.RADIUS_SECRET,
            });

            if (response.code === "CoA-ACK") {
              console.log(
                `✅ CoA Update successful for ${username} on ${nasIpAddress}`
              );
              resolve({
                success: true,
                message: "Session updated successfully",
              });
            } else {
              console.log(
                `❌ CoA Update failed for ${username} on ${nasIpAddress}: ${response.code}`
              );
              resolve({
                success: false,
                error: `CoA failed: ${response.code}`,
              });
            }
          } catch (error) {
            console.error("Error decoding CoA response:", error);
            resolve({ success: false, error: "Invalid CoA response" });
          }
        });

        // Send CoA packet
        client.send(
          packet,
          0,
          packet.length,
          this.COA_PORT,
          nasIpAddress,
          (error) => {
            if (error) {
              clearTimeout(timeout);
              client.close();
              console.error(`CoA send error for ${nasIpAddress}:`, error);
              resolve({ success: false, error: error.message });
            } else {
              console.log(
                `📡 CoA Update sent to ${nasIpAddress} for session ${sessionId}`
              );
            }
          }
        );
      } catch (error: any) {
        console.error("CoA Update error:", error);
        resolve({ success: false, error: error.message });
      }
    });
  }

  // Get session accounting data
  static async getSessionAccounting(username: string) {
    try {
      const result = await sequelize.query(
        `SELECT acctsessionid, acctstarttime, acctupdatetime, acctstoptime,
                acctsessiontime, acctinputoctets, acctoutputoctets, 
                callingstationid, nasipaddress, acctterminatecause
         FROM radius_accounting 
         WHERE username = :username 
         ORDER BY acctstarttime DESC`,
        {
          replacements: { username },
          type: QueryTypes.SELECT,
        }
      );

      return result;
    } catch (error) {
      console.error("Error fetching session accounting:", error);
      return [];
    }
  }

  // Get all active RADIUS sessions
  static async getActiveSessions() {
    try {
      const result = await sequelize.query(
        `SELECT ra.username, ra.acctsessionid, ra.acctstarttime, ra.acctupdatetime,
                ra.acctsessiontime, ra.acctinputoctets, ra.acctoutputoctets,
                ra.callingstationid, ra.nasipaddress,
                us.device_count, us.expires_at,
                u.phoneNumber, p.name as plan_name, p.bandwidth_limit
         FROM radius_accounting ra
         JOIN user_sessions us ON ra.username = us.radius_username
         JOIN users u ON us.user_id = u.id
         JOIN plans p ON us.planId = p.id
         WHERE ra.acctstoptime IS NULL
         ORDER BY ra.acctstarttime DESC`,
        {
          type: QueryTypes.SELECT,
        }
      );

      return result;
    } catch (error) {
      console.error("Error fetching active sessions:", error);
      return [];
    }
  }
}

export default RadiusService;
