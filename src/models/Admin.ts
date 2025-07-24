import { DataTypes, Model, Optional } from "sequelize";
import bcrypt from "bcrypt";
import { sequelize } from "../config/database";
import crypto from "crypto";

// Admin attributes interface
interface AdminAttributes {
  id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: "admin" | "super_admin";
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  twoFactorEnabled?: boolean;
  twoFactorSecret?: string | null;
}

// Optional attributes for creation
interface AdminCreationAttributes
  extends Optional<
    AdminAttributes,
    "id" | "isActive" | "lastLogin" | "createdAt" | "updatedAt"
  > {}

// Admin model class
class Admin
  extends Model<AdminAttributes, AdminCreationAttributes>
  implements AdminAttributes
{
  public id!: string;
  public email!: string;
  public password!: string;
  public firstName!: string;
  public lastName!: string;
  public role!: "admin" | "super_admin";
  public isActive!: boolean;
  public lastLogin?: Date;
  public passwordResetToken?: string;
  public passwordResetExpires?: Date;
  public twoFactorEnabled?: boolean;
  public twoFactorSecret?: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Instance methods
  public async validatePassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.password);
  }

  public getFullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  public toJSON(): object {
    const values = Object.assign({}, this.get()) as any;
    delete values.password;
    delete values.passwordResetToken;
    delete values.passwordResetExpires;
    return values;
  }

  // Static methods
  static async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  static async findByEmail(email: string): Promise<Admin | null> {
    return this.findOne({
      where: { email: email.toLowerCase() },
    });
  }

  static async generatePasswordReset(
    admin: Admin
  ): Promise<{ token: string; expires: Date }> {
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 1000 * 60 * 30); // 30 minutes expiry
    admin.passwordResetToken = token;
    admin.passwordResetExpires = expires;
    await admin.save();
    return { token, expires };
  }
}

// Initialize the model
Admin.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
        len: [3, 255],
      },
      set(value: string) {
        this.setDataValue("email", value.toLowerCase());
      },
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        len: [6, 255],
      },
    },
    firstName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        len: [1, 100],
        notEmpty: true,
      },
    },
    lastName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        len: [1, 100],
        notEmpty: true,
      },
    },
    role: {
      type: DataTypes.ENUM("admin", "super_admin"),
      allowNull: false,
      defaultValue: "admin",
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    lastLogin: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    passwordResetToken: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    passwordResetExpires: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    twoFactorEnabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    twoFactorSecret: {
      type: DataTypes.STRING(255),
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
    modelName: "Admin",
    tableName: "admins",
    timestamps: true,
    hooks: {
      beforeCreate: async (admin: Admin) => {
        admin.password = await Admin.hashPassword(admin.password);
      },
      beforeUpdate: async (admin: Admin) => {
        if (admin.changed("password")) {
          admin.password = await Admin.hashPassword(admin.password);
        }
      },
    },
    indexes: [
      {
        unique: true,
        fields: ["email"],
      },
      {
        fields: ["role"],
      },
      {
        fields: ["isActive"],
      },
    ],
  }
);

export default Admin;
export { Admin };
export type { AdminAttributes, AdminCreationAttributes };
