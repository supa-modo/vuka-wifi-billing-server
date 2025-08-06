import { DataTypes, Model, Optional, Op } from "sequelize";
import { sequelize } from "../config/database";

// Payment attributes interface
interface PaymentAttributes {
  id: string;
  userId: string;
  planId: string;
  sessionId?: string;
  amount: number;
  deviceCount: number;
  phoneNumber: string;
  mpesaReceiptNumber?: string;
  mpesaTransactionId?: string;
  status: "pending" | "completed" | "failed" | "cancelled";
  paymentMethod: string;
  createdAt: Date;
  completedAt?: Date;
  updatedAt: Date;
}

// Optional attributes for creation
interface PaymentCreationAttributes
  extends Optional<
    PaymentAttributes,
    | "id"
    | "sessionId"
    | "mpesaReceiptNumber"
    | "mpesaTransactionId"
    | "completedAt"
    | "createdAt"
    | "updatedAt"
  > {}

// Payment model class
class Payment
  extends Model<PaymentAttributes, PaymentCreationAttributes>
  implements PaymentAttributes
{
  public id!: string;
  public userId!: string;
  public planId!: string;
  public sessionId?: string;
  public amount!: number;
  public deviceCount!: number;
  public phoneNumber!: string;
  public mpesaReceiptNumber?: string;
  public mpesaTransactionId?: string;
  public status!: "pending" | "completed" | "failed" | "cancelled";
  public paymentMethod!: string;
  public completedAt?: Date;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Instance methods
  public isPending(): boolean {
    return this.status === "pending";
  }

  public isCompleted(): boolean {
    return this.status === "completed";
  }

  public isFailed(): boolean {
    return this.status === "failed";
  }

  public async markCompleted(
    mpesaReceiptNumber: string,
    mpesaTransactionId?: string
  ): Promise<void> {
    this.status = "completed";
    this.completedAt = new Date();
    this.mpesaReceiptNumber = mpesaReceiptNumber;
    if (mpesaTransactionId) {
      this.mpesaTransactionId = mpesaTransactionId;
    }
    await this.save();
  }

  public async markFailed(): Promise<void> {
    this.status = "failed";
    await this.save();
  }

  public async markCancelled(): Promise<void> {
    this.status = "cancelled";
    await this.save();
  }

  public toJSON(): object {
    const values = Object.assign({}, this.get()) as any;
    // Add computed fields
    values.isPending = this.isPending();
    values.isCompleted = this.isCompleted();
    values.isFailed = this.isFailed();
    return values;
  }

  // Static methods
  static async findByUser(userId: string): Promise<Payment[]> {
    return this.findAll({
      where: { userId },
      order: [["createdAt", "DESC"]],
    });
  }

  static async findByPhoneNumber(phoneNumber: string): Promise<Payment[]> {
    return this.findAll({
      where: { phoneNumber },
      order: [["createdAt", "DESC"]],
    });
  }

  static async findPendingPayments(): Promise<Payment[]> {
    return this.findAll({
      where: { status: "pending" },
      order: [["createdAt", "ASC"]],
    });
  }

  static async findByMpesaReceipt(
    receiptNumber: string
  ): Promise<Payment | null> {
    return this.findOne({
      where: { mpesaReceiptNumber: receiptNumber },
    });
  }

  static async getTotalRevenue(): Promise<number> {
    const result = await this.sum("amount", {
      where: { status: "completed" },
    });
    return result || 0;
  }

  static async getRevenueByDateRange(
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    const result = await this.sum("amount", {
      where: {
        status: "completed",
        completedAt: {
          [Op.between]: [startDate, endDate],
        },
      },
    });
    return result || 0;
  }
}

// Initialize the model
Payment.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "users",
        key: "id",
      },
    },
    planId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "plans",
        key: "id",
      },
    },
    sessionId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "user_sessions",
        key: "id",
      },
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0,
      },
    },
    deviceCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      validate: {
        min: 1,
      },
    },
    phoneNumber: {
      type: DataTypes.STRING(15),
      allowNull: false,
      validate: {
        len: [10, 15],
      },
    },
    mpesaReceiptNumber: {
      type: DataTypes.STRING(50),
      allowNull: true,
      unique: true,
    },
    mpesaTransactionId: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM("pending", "completed", "failed", "cancelled"),
      allowNull: false,
      defaultValue: "pending",
    },
    paymentMethod: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "mpesa",
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    modelName: "Payment",
    tableName: "payments",
    timestamps: true,
    indexes: [
      {
        fields: ["userId"],
      },
      {
        fields: ["planId"],
      },
      {
        fields: ["sessionId"],
      },
      {
        fields: ["status"],
      },
      {
        fields: ["phoneNumber"],
      },
      {
        unique: true,
        fields: ["mpesaReceiptNumber"],
        where: {
          mpesaReceiptNumber: {
            [Op.ne]: null,
          },
        },
      },
      {
        fields: ["completedAt"],
      },
    ],
  }
);

// Associations are defined in models/index.ts

export default Payment;
export { Payment };
export type { PaymentAttributes, PaymentCreationAttributes };
