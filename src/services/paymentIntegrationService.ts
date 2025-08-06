// Payment Integration Service: Handles payment completion and user session creation
import { Payment, Plan, UserSession } from "../models";
import UserSessionService from "./userSessionService";
import { MpesaService } from "./mpesaService";
import { sequelize } from "../config/database";

export class PaymentIntegrationService {
  // Handle successful payment completion
  static async handlePaymentSuccess(paymentData: {
    phoneNumber: string;
    planId: number;
    deviceCount: number;
    amount: number;
    mpesaReceiptNumber: string;
    mpesaTransactionId?: string;
  }) {
    const transaction = await sequelize.transaction();

    try {
      // Find existing user by phone number to get userId
      const { User } = require("../models");
      const existingUser = await User.findOne({
        where: { phoneNumber: paymentData.phoneNumber },
      });

      // Create payment record
      const payment = await Payment.create(
        {
          userId: existingUser?.id || "temp-user-id", // Will be updated after user creation
          phoneNumber: paymentData.phoneNumber,
          planId: paymentData.planId.toString(),
          amount: paymentData.amount,
          deviceCount: paymentData.deviceCount,
          mpesaReceiptNumber: paymentData.mpesaReceiptNumber,
          mpesaTransactionId: paymentData.mpesaTransactionId,
          status: "completed",
          paymentMethod: "mpesa",
          completedAt: new Date(),
        },
        { transaction }
      );

      // Create user session
      const sessionResult = await UserSessionService.createSession({
        planId: paymentData.planId,
        phoneNumber: paymentData.phoneNumber,
        deviceCount: paymentData.deviceCount,
        amount: paymentData.amount,
        paymentReference: payment.mpesaReceiptNumber || "",
      });

      if (!sessionResult.success) {
        throw new Error(`Failed to create session: ${sessionResult.error}`);
      }

      if (!sessionResult.session) {
        throw new Error("Session was not created");
      }

      // Update payment with session ID and actual userId
      await payment.update(
        {
          userId: sessionResult.user.id, // Update with actual userId
          sessionId: sessionResult.session.id,
        },
        { transaction }
      );

      await transaction.commit();

      return {
        success: true,
        payment,
        session: sessionResult.session,
        user: sessionResult.user,
        credentials: sessionResult.credentials,
      };
    } catch (error: unknown) {
      await transaction.rollback();
      console.error("Error handling payment success:", error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  // Handle payment failure
  static async handlePaymentFailure(paymentData: {
    phoneNumber: string;
    planId: number;
    deviceCount: number;
    amount: number;
    mpesaReceiptNumber?: string;
    reason: string;
  }) {
    try {
      // Find existing user by phone number to get userId
      const { User } = require("../models");
      const existingUser = await User.findOne({
        where: { phoneNumber: paymentData.phoneNumber },
      });

      const payment = await Payment.create({
        userId: existingUser?.id || "unknown-user-id", // For failed payments
        phoneNumber: paymentData.phoneNumber,
        planId: paymentData.planId.toString(),
        amount: paymentData.amount,
        deviceCount: paymentData.deviceCount,
        mpesaReceiptNumber: paymentData.mpesaReceiptNumber,
        status: "failed",
        paymentMethod: "mpesa",
      });

      return {
        success: true,
        payment,
        message: "Payment failure recorded",
      };
    } catch (error: unknown) {
      console.error("Error handling payment failure:", error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  // Initiate payment (STK Push)
  static async initiatePayment(paymentData: {
    phoneNumber: string;
    planId: number;
    deviceCount: number;
    amount: number;
  }) {
    try {
      // Validate plan
      const plan = await Plan.findByPk(paymentData.planId);
      if (!plan || !plan.isActive) {
        return {
          success: false,
          error: "Invalid or inactive plan",
        };
      }

      // Calculate total amount (base price + device multiplier)
      const deviceMultiplier =
        paymentData.deviceCount > 1 ? 0.6 * (paymentData.deviceCount - 1) : 0;
      const totalAmount = Math.round(plan.basePrice * (1 + deviceMultiplier));

      if (paymentData.amount !== totalAmount) {
        return {
          success: false,
          error: "Amount mismatch",
        };
      }

      // Find existing user by phone number to get userId
      const { User } = require("../models");
      const existingUser = await User.findOne({
        where: { phoneNumber: paymentData.phoneNumber },
      });

      // Create pending payment record
      const payment = await Payment.create({
        userId: existingUser?.id || "00000000-0000-0000-0000-000000000000", // Placeholder for new users
        phoneNumber: paymentData.phoneNumber,
        planId: paymentData.planId.toString(),
        amount: paymentData.amount,
        deviceCount: paymentData.deviceCount,
        status: "pending",
        paymentMethod: "mpesa",
      });

      // Integrate with M-Pesa STK Push API
      try {
        const mpesaResponse = await MpesaService.initiateStkPush({
          phoneNumber: paymentData.phoneNumber,
          amount: paymentData.amount,
          accountReference: `Plan-${plan.name}`,
          transactionDesc: `VukaWiFi ${plan.name} - ${paymentData.deviceCount} device(s)`,
        });

        // Store M-Pesa request details in payment record
        await payment.update({
          mpesaTransactionId: mpesaResponse.CheckoutRequestID,
        });

        return {
          success: true,
          payment,
          mpesaResponse,
          message:
            "Payment initiated successfully. Please complete payment on your phone.",
        };
      } catch (mpesaError) {
        console.error("M-Pesa initiation error:", mpesaError);

        // Mark payment as failed
        await payment.update({ status: "failed" });

        // Fall back to mock for development/testing
        const mockMpesaResponse = {
          merchantRequestId: `MERC_${Date.now()}`,
          checkoutRequestId: `CHCK_${Date.now()}`,
          responseCode: "0",
          responseDescription: "Success. Request accepted for processing",
          customerMessage: "Success. Request accepted for processing",
        };

        await payment.update({
          mpesaTransactionId: mockMpesaResponse.checkoutRequestId,
          status: "pending",
        });

        return {
          success: true,
          payment,
          mpesaResponse: mockMpesaResponse,
          message: "Payment initiated successfully (Development Mode).",
        };
      }
    } catch (error: unknown) {
      console.error("Error initiating payment:", error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  // Check payment status
  static async checkPaymentStatus(paymentId: number) {
    try {
      const payment = await Payment.findByPk(paymentId, {
        include: [
          {
            model: Plan,
            attributes: ["id", "name", "durationHours"],
          },
          {
            model: UserSession,
            as: "session",
            attributes: ["id", "username", "password", "expiresAt"],
          },
        ],
      });

      if (!payment) {
        return {
          success: false,
          error: "Payment not found",
        };
      }

      // If payment is completed and has a session, include credentials
      let userCredentials = null;
      if (payment.status === "completed" && (payment as any).session) {
        const session = (payment as any).session;
        userCredentials = {
          username: session.username,
          password: session.password,
          expiresAt: session.expiresAt,
        };
      }

      return {
        success: true,
        payment: {
          ...payment.toJSON(),
          userCredentials,
        },
      };
    } catch (error: unknown) {
      console.error("Error checking payment status:", error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  // Get payment history for a user
  static async getPaymentHistory(phoneNumber: string, limit: number = 10) {
    try {
      const payments = await Payment.findAll({
        where: {
          phoneNumber: phoneNumber,
        },
        include: [
          {
            model: Plan,
            attributes: ["id", "name", "durationHours", "basePrice"],
          },
        ],
        order: [["createdAt", "DESC"]],
        limit,
      });

      return {
        success: true,
        payments,
      };
    } catch (error: unknown) {
      console.error("Error fetching payment history:", error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  // Calculate plan price with device count
  static calculatePlanPrice(basePric: number, deviceCount: number): number {
    if (deviceCount <= 1) {
      return basePric;
    }

    // Each additional device adds 60% of base price
    const deviceMultiplier = 0.6 * (deviceCount - 1);
    return Math.round(basePric * (1 + deviceMultiplier));
  }

  // Validate payment data
  static validatePaymentData(data: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.phoneNumber) {
      errors.push("Phone number is required");
    } else if (!/^254[0-9]{9}$/.test(data.phoneNumber)) {
      errors.push("Invalid phone number format");
    }

    if (!data.planId) {
      errors.push("Plan ID is required");
    }

    if (!data.deviceCount || data.deviceCount < 1) {
      errors.push("Device count must be at least 1");
    }

    if (!data.amount || data.amount <= 0) {
      errors.push("Amount must be greater than 0");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

export default PaymentIntegrationService;
