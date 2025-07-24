import { DataTypes, Model, Optional, Op } from "sequelize";
import { sequelize } from "../config/database";

// UserSession attributes interface
interface UserSessionAttributes {
  id: string;
  userId: string;
  planId: string;
  deviceCount: number;
  username: string; // RADIUS username
  password: string; // RADIUS password
  nasIp?: string;
  sessionStart: Date;
  sessionEnd?: Date;
  expiresAt: Date;
  bytesIn: number;
  bytesOut: number;
  status: "active" | "expired" | "terminated";
  paymentReference?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Optional attributes for creation
interface UserSessionCreationAttributes
  extends Optional<
    UserSessionAttributes,
    | "id"
    | "sessionEnd"
    | "nasIp"
    | "bytesIn"
    | "bytesOut"
    | "paymentReference"
    | "createdAt"
    | "updatedAt"
  > {}

// UserSession model class
class UserSession
  extends Model<UserSessionAttributes, UserSessionCreationAttributes>
  implements UserSessionAttributes
{
  public id!: string;
  public userId!: string;
  public planId!: string;
  public deviceCount!: number;
  public username!: string;
  public password!: string;
  public nasIp?: string;
  public sessionStart!: Date;
  public sessionEnd?: Date;
  public expiresAt!: Date;
  public bytesIn!: number;
  public bytesOut!: number;
  public status!: "active" | "expired" | "terminated";
  public paymentReference?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Instance methods
  public isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  public getDurationMinutes(): number {
    const end = this.sessionEnd || new Date();
    return Math.floor(
      (end.getTime() - this.sessionStart.getTime()) / (1000 * 60)
    );
  }

  public getTotalBytes(): number {
    return this.bytesIn + this.bytesOut;
  }

  public async terminate(): Promise<void> {
    this.status = "terminated";
    this.sessionEnd = new Date();
    await this.save();
  }

  public toJSON(): object {
    const values = Object.assign({}, this.get()) as any;
    // Add computed fields
    values.isExpired = this.isExpired();
    values.durationMinutes = this.getDurationMinutes();
    values.totalBytes = this.getTotalBytes();
    return values;
  }

  // Static methods
  static async findActiveByUser(userId: string): Promise<UserSession[]> {
    return this.findAll({
      where: {
        userId,
        status: "active",
      },
      order: [["sessionStart", "DESC"]],
    });
  }

  static async findActiveByUsername(username: string): Promise<UserSession[]> {
    return this.findAll({
      where: {
        username,
        status: "active",
      },
      order: [["sessionStart", "DESC"]],
    });
  }

  static async findExpiredSessions(): Promise<UserSession[]> {
    return this.findAll({
      where: {
        status: "active",
        expiresAt: {
          [Op.lt]: new Date(),
        },
      },
    });
  }

  static async generateCredentials(
    phoneNumber: string
  ): Promise<{ username: string; password: string }> {
    // Use phone number as username and generate a simple password
    const username = phoneNumber;
    const password = Math.random().toString(36).substring(2, 10); // 8-character random password
    return { username, password };
  }
}

// Initialize the model
UserSession.init(
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
    deviceCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      validate: {
        min: 1,
        max: 10,
      },
    },
    username: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    password: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    nasIp: {
      type: DataTypes.STRING(15),
      allowNull: true,
    },
    sessionStart: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    sessionEnd: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    bytesIn: {
      type: DataTypes.BIGINT,
      allowNull: false,
      defaultValue: 0,
    },
    bytesOut: {
      type: DataTypes.BIGINT,
      allowNull: false,
      defaultValue: 0,
    },
    status: {
      type: DataTypes.ENUM("active", "expired", "terminated"),
      allowNull: false,
      defaultValue: "active",
    },
    paymentReference: {
      type: DataTypes.STRING(100),
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
    modelName: "UserSession",
    tableName: "user_sessions",
    timestamps: true,
    indexes: [
      {
        fields: ["userId"],
      },
      {
        fields: ["planId"],
      },
      {
        fields: ["status"],
      },
      {
        fields: ["expiresAt"],
      },
      {
        fields: ["username"],
      },
    ],
  }
);

export default UserSession;
export { UserSession };
export type { UserSessionAttributes, UserSessionCreationAttributes };
