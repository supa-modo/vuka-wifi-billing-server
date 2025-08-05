import { Request, Response } from "express";
import RadiusService from "../services/radiusService";
import UserSessionService from "../services/userSessionService";

// RADIUS Authentication endpoint
export async function authenticate(req: Request, res: Response) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Username and password are required",
        code: "Access-Reject",
      });
    }

    const result = await RadiusService.authenticate(username, password);

    // Log authentication attempt
    console.log(
      `RADIUS Auth attempt: ${username} - ${
        result.success ? "SUCCESS" : "FAILED"
      }`
    );

    res.json(result);
  } catch (error) {
    console.error("RADIUS authentication error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      code: "Access-Reject",
    });
  }
}

// RADIUS Accounting endpoint
export async function accounting(req: Request, res: Response) {
  try {
    const data = req.body;

    // Validate required fields
    if (!data.username) {
      return res.status(400).json({
        success: false,
        message: "Username is required for accounting",
      });
    }

    const result = await RadiusService.accounting(data);

    // Log accounting data
    console.log(
      `RADIUS Accounting: ${data.username} - ${data.acctstatus || "Unknown"}`
    );

    res.json(result);
  } catch (error) {
    console.error("RADIUS accounting error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

// Change of Authorization (CoA) endpoint
export async function coa(req: Request, res: Response) {
  try {
    const { username, sessionId, action, params } = req.body;

    if (!username || !action) {
      return res.status(400).json({
        success: false,
        message: "Username and action are required",
      });
    }

    const result = await RadiusService.sendCoA(
      username,
      sessionId,
      action,
      params
    );

    // Log CoA action
    console.log(
      `RADIUS CoA: ${username} - ${action} - ${
        result.success ? "SUCCESS" : "FAILED"
      }`
    );

    res.json(result);
  } catch (error) {
    console.error("RADIUS CoA error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

// Disconnect specific user session
export async function disconnectUser(req: Request, res: Response) {
  try {
    const { username } = req.params;
    const { reason } = req.body;

    if (!username) {
      return res.status(400).json({
        success: false,
        message: "Username is required",
      });
    }

    const result = await RadiusService.disconnectUser(username, reason);

    console.log(
      `Admin disconnected user: ${username} - ${
        result.success ? "SUCCESS" : "FAILED"
      }`
    );

    res.json(result);
  } catch (error) {
    console.error("Disconnect user error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

// Update user bandwidth
export async function updateUserBandwidth(req: Request, res: Response) {
  try {
    const { username } = req.params;
    const { bandwidth } = req.body;

    if (!username || !bandwidth) {
      return res.status(400).json({
        success: false,
        message: "Username and bandwidth are required",
      });
    }

    const result = await RadiusService.sendCoA(username, "", "bandwidth", {
      bandwidth,
    });

    console.log(
      `Admin updated bandwidth for: ${username} to ${bandwidth} - ${
        result.success ? "SUCCESS" : "FAILED"
      }`
    );

    res.json(result);
  } catch (error) {
    console.error("Update bandwidth error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

// Extend user session timeout
export async function extendUserSession(req: Request, res: Response) {
  try {
    const { username } = req.params;
    const { timeoutSeconds } = req.body;

    if (!username || !timeoutSeconds) {
      return res.status(400).json({
        success: false,
        message: "Username and timeout are required",
      });
    }

    const result = await RadiusService.sendCoA(username, "", "timeout", {
      timeout: timeoutSeconds,
    });

    console.log(
      `Admin extended session for: ${username} by ${timeoutSeconds}s - ${
        result.success ? "SUCCESS" : "FAILED"
      }`
    );

    res.json(result);
  } catch (error) {
    console.error("Extend session error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

// Get active RADIUS sessions
export async function getActiveSessions(req: Request, res: Response) {
  try {
    const filters = req.query;
    const result = await UserSessionService.getActiveSessions(filters);
    res.json(result);
  } catch (error) {
    console.error("Error fetching active sessions:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

// Get session accounting data
export async function getSessionAccounting(req: Request, res: Response) {
  try {
    const { username } = req.params;

    if (!username) {
      return res.status(400).json({
        success: false,
        message: "Username is required",
      });
    }

    const accounting = await RadiusService.getSessionAccounting(username);

    res.json({
      success: true,
      accounting,
    });
  } catch (error) {
    console.error("Error fetching session accounting:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

// Test RADIUS connectivity
export async function testRadius(req: Request, res: Response) {
  try {
    // Test with a known test user
    const testResult = await RadiusService.authenticate("testuser", "testpass");

    res.json({
      success: true,
      message: "RADIUS connectivity test completed",
      testResult,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    console.error("RADIUS test error:", error);
    res.status(500).json({
      success: false,
      message: "RADIUS test failed",
      error: (error as Error).message,
    });
  }
}
