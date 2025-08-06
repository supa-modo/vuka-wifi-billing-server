import { Request, Response } from "express";
import { Payment, Plan, User } from "../models";
import { PaymentIntegrationService } from "../services/paymentIntegrationService";
import { MpesaService } from "../services/mpesaService";
import { Op } from "sequelize";

// Get all payments with pagination and filtering
export async function getPayments(req: Request, res: Response) {
  try {
    const {
      limit = 100,
      offset = 0,
      status,
      gateway,
      startDate,
      endDate,
      phone,
    } = req.query;

    const whereClause: any = {};

    // Add filters
    if (status) {
      whereClause.status = status;
    }
    if (gateway) {
      whereClause.paymentMethod = gateway === "M-Pesa" ? "mpesa" : gateway;
    }
    if (phone) {
      whereClause.phoneNumber = { [Op.like]: `%${phone}%` };
    }
    if (startDate && endDate) {
      whereClause.createdAt = {
        [Op.between]: [
          new Date(startDate as string),
          new Date(endDate as string),
        ],
      };
    }

    const payments = await Payment.findAll({
      where: whereClause,
      include: [
        {
          model: Plan,
          as: "plan",
          attributes: ["id", "name", "durationHours", "basePrice"],
        },
        {
          model: User,
          as: "user",
          attributes: ["id", "username", "email"],
        },
      ],
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });

    const totalCount = await Payment.count({ where: whereClause });

    res.json({
      success: true,
      payments,
      pagination: {
        total: totalCount,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        hasMore:
          totalCount > parseInt(offset as string) + parseInt(limit as string),
      },
    });
  } catch (error: unknown) {
    console.error("Error fetching payments:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch payments",
      error: (error as Error).message,
    });
  }
}

// Get single payment by ID
export async function getPayment(req: Request, res: Response) {
  try {
    const { paymentId } = req.params;

    const payment = await Payment.findByPk(paymentId, {
      include: [
        {
          model: Plan,
          as: "plan",
          attributes: ["id", "name", "durationHours", "basePrice"],
        },
        {
          model: User,
          as: "user",
          attributes: ["id", "username", "email", "phoneNumber"],
        },
      ],
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    res.json({
      success: true,
      payment,
    });
  } catch (error: unknown) {
    console.error("Error fetching payment:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch payment",
      error: (error as Error).message,
    });
  }
}

// Get payments by phone number
export async function getPaymentsByPhone(req: Request, res: Response) {
  try {
    const { phoneNumber } = req.params;
    const { limit = 10 } = req.query;

    const payments = await Payment.findAll({
      where: { phoneNumber },
      include: [
        {
          model: Plan,
          as: "plan",
          attributes: ["id", "name", "durationHours", "basePrice"],
        },
      ],
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit as string),
    });

    res.json({
      success: true,
      payments,
    });
  } catch (error: unknown) {
    console.error("Error fetching payments by phone:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch payments",
      error: (error as Error).message,
    });
  }
}

// Initiate payment (STK Push)
export async function initiatePayment(req: Request, res: Response) {
  try {
    const { phoneNumber, planId, deviceCount, amount } = req.body;

    // Validate input
    const validation = PaymentIntegrationService.validatePaymentData({
      phoneNumber,
      planId,
      deviceCount,
      amount,
    });

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment data",
        errors: validation.errors,
      });
    }

    // Initiate payment through PaymentIntegrationService
    const result = await PaymentIntegrationService.initiatePayment({
      phoneNumber,
      planId: parseInt(planId),
      deviceCount: parseInt(deviceCount),
      amount: parseFloat(amount),
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error,
      });
    }

    res.json({
      success: true,
      message: "Payment initiated successfully",
      payment: result.payment,
      mpesaResponse: result.mpesaResponse,
    });
  } catch (error: unknown) {
    console.error("Error initiating payment:", error);
    res.status(500).json({
      success: false,
      message: "Failed to initiate payment",
      error: (error as Error).message,
    });
  }
}

// Check payment status
export async function checkPaymentStatus(req: Request, res: Response) {
  try {
    const { paymentId } = req.params;

    const result = await PaymentIntegrationService.checkPaymentStatus(
      parseInt(paymentId)
    );

    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: result.error,
      });
    }

    res.json({
      success: true,
      payment: result.payment,
    });
  } catch (error: unknown) {
    console.error("Error checking payment status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to check payment status",
      error: (error as Error).message,
    });
  }
}

// M-Pesa callback handler
export async function mpesaCallback(req: Request, res: Response) {
  try {
    console.log("M-Pesa callback received:", JSON.stringify(req.body, null, 2));

    const { Body } = req.body;

    if (!Body || !Body.stkCallback) {
      return res.status(400).json({
        success: false,
        message: "Invalid callback format",
      });
    }

    const { stkCallback } = Body;
    const {
      MerchantRequestID,
      CheckoutRequestID,
      ResultCode,
      ResultDesc,
      CallbackMetadata,
    } = stkCallback;

    // Find the pending payment by merchant request ID or checkout request ID
    const payment = await Payment.findOne({
      where: {
        status: "pending",
        // You might need to store these IDs in the payment record during initiation
      },
    });

    if (ResultCode === 0) {
      // Payment successful
      const metadata = CallbackMetadata?.Item || [];
      const mpesaReceiptNumber = metadata.find(
        (item: any) => item.Name === "MpesaReceiptNumber"
      )?.Value;
      const amount = metadata.find(
        (item: any) => item.Name === "Amount"
      )?.Value;
      const phoneNumber = metadata.find(
        (item: any) => item.Name === "PhoneNumber"
      )?.Value;

      if (payment) {
        // Handle successful payment
        const result = await PaymentIntegrationService.handlePaymentSuccess({
          phoneNumber: payment.phoneNumber,
          planId: parseInt(payment.planId),
          deviceCount: payment.deviceCount,
          amount: payment.amount,
          mpesaReceiptNumber: mpesaReceiptNumber || CheckoutRequestID,
          mpesaTransactionId: CheckoutRequestID,
        });

        console.log("Payment success handled:", result);
      }
    } else {
      // Payment failed
      if (payment) {
        const result = await PaymentIntegrationService.handlePaymentFailure({
          phoneNumber: payment.phoneNumber,
          planId: parseInt(payment.planId),
          deviceCount: payment.deviceCount,
          amount: payment.amount,
          reason: ResultDesc || "Payment failed",
        });

        console.log("Payment failure handled:", result);
      }
    }

    res.json({
      success: true,
      message: "Callback processed successfully",
    });
  } catch (error: unknown) {
    console.error("Error processing M-Pesa callback:", error);
    res.status(500).json({
      success: false,
      message: "Failed to process callback",
      error: (error as Error).message,
    });
  }
}

// Update payment status (admin action)
export async function updatePaymentStatus(req: Request, res: Response) {
  try {
    const { paymentId } = req.params;
    const { status, reason } = req.body;

    const payment = await Payment.findByPk(paymentId);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    if (status === "completed" && payment.status === "pending") {
      await payment.markCompleted("ADMIN_MANUAL", "ADMIN_COMPLETION");
    } else if (status === "failed") {
      await payment.markFailed();
    } else if (status === "cancelled") {
      await payment.markCancelled();
    }

    res.json({
      success: true,
      message: "Payment status updated successfully",
      payment,
    });
  } catch (error: unknown) {
    console.error("Error updating payment status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update payment status",
      error: (error as Error).message,
    });
  }
}

// Get payment statistics
export async function getPaymentStats(req: Request, res: Response) {
  try {
    const totalRevenue = await Payment.getTotalRevenue();

    const completedCount = await Payment.count({
      where: { status: "completed" },
    });

    const pendingCount = await Payment.count({
      where: { status: "pending" },
    });

    const failedCount = await Payment.count({
      where: { status: "failed" },
    });

    const today = new Date();
    const startOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
    const endOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() + 1
    );

    const todayRevenue = await Payment.sum("amount", {
      where: {
        status: "completed",
        completedAt: {
          [Op.between]: [startOfDay, endOfDay],
        },
      },
    });

    res.json({
      success: true,
      stats: {
        totalRevenue: totalRevenue || 0,
        completedCount,
        pendingCount,
        failedCount,
        todayRevenue: todayRevenue || 0,
      },
    });
  } catch (error: unknown) {
    console.error("Error fetching payment stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch payment statistics",
      error: (error as Error).message,
    });
  }
}
