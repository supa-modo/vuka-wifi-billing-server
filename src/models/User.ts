import { DataTypes, Model, Optional } from "sequelize";
import bcrypt from "bcrypt";
import { sequelize } from "../config/database";

// User attributes interface
interface UserAttributes {
  id: string;
  phoneNumber: string;
  username: string; // Usually same as phone number
  passwordHash: string;
  email?: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  lastLogin?: Date;
  totalSpent: number;
}

// Optional attributes for creation
interface UserCreationAttributes
  extends Optional<
    UserAttributes,
    | "id"
    | "email"
    | "createdAt"
    | "updatedAt"
    | "isActive"
    | "lastLogin"
    | "totalSpent"
  > {}

// User model class
class User
  extends Model<UserAttributes, UserCreationAttributes>
  implements UserAttributes
{
  public id!: string;
  public phoneNumber!: string;
  public username!: string;
  public passwordHash!: string;
  public email?: string;
  public isActive!: boolean;
  public lastLogin?: Date;
  public totalSpent!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Instance methods
  public async validatePassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.passwordHash);
  }

  public toJSON(): object {
    const values = Object.assign({}, this.get()) as any;
    delete values.passwordHash;
    return values;
  }

  // Static methods
  static async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  static async findByPhoneNumber(phoneNumber: string): Promise<User | null> {
    return this.findOne({
      where: { phoneNumber },
    });
  }

  static async findByUsername(username: string): Promise<User | null> {
    return this.findOne({
      where: { username },
    });
  }

  static async createUser(data: {
    phoneNumber: string;
    password: string;
    email?: string;
  }): Promise<User> {
    const passwordHash = await this.hashPassword(data.password);
    return this.create({
      phoneNumber: data.phoneNumber,
      username: data.phoneNumber, // Default username to phone number
      passwordHash,
      email: data.email,
    });
  }
}

// Initialize the model
User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    phoneNumber: {
      type: DataTypes.STRING(15),
      allowNull: false,
      unique: true,
      validate: {
        len: [10, 15],
        is: /^[0-9+]+$/,
      },
    },
    username: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      validate: {
        len: [3, 50],
      },
    },
    passwordHash: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: true,
      validate: {
        isEmail: true,
      },
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
    totalSpent: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.0,
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
    modelName: "User",
    tableName: "users",
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ["phoneNumber"],
      },
      {
        unique: true,
        fields: ["username"],
      },
      {
        fields: ["isActive"],
      },
    ],
  }
);

export default User;
export { User };
export type { UserAttributes, UserCreationAttributes };
