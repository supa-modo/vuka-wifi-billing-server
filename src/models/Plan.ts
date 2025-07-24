import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/database";

// Plan attributes interface
interface PlanAttributes {
  id: string;
  name: string;
  description?: string;
  basePrice: number;
  durationHours: number;
  bandwidthLimit?: string; // e.g., "5M/2M"
  maxDevices: number;
  isActive: boolean;
  isPopular: boolean;
  features: string[]; // JSON array of features
  createdAt: Date;
  updatedAt: Date;
}

// Optional attributes for creation
interface PlanCreationAttributes
  extends Optional<
    PlanAttributes,
    | "id"
    | "description"
    | "bandwidthLimit"
    | "isActive"
    | "isPopular"
    | "createdAt"
    | "updatedAt"
  > {}

// Plan model class
class Plan
  extends Model<PlanAttributes, PlanCreationAttributes>
  implements PlanAttributes
{
  public id!: string;
  public name!: string;
  public description?: string;
  public basePrice!: number;
  public durationHours!: number;
  public bandwidthLimit?: string;
  public maxDevices!: number;
  public isActive!: boolean;
  public isPopular!: boolean;
  public features!: string[];
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Instance methods
  public calculatePrice(deviceCount: number = 1): number {
    if (deviceCount <= 1) return this.basePrice;
    // Pricing logic: 60% increase for each additional device
    return Math.round(this.basePrice * (1 + 0.6 * (deviceCount - 1)));
  }

  public getDurationDisplay(): string {
    if (this.durationHours < 24) {
      return `${this.durationHours} Hour${this.durationHours > 1 ? "s" : ""}`;
    } else if (this.durationHours < 168) {
      const days = Math.round(this.durationHours / 24);
      return `${days} Day${days > 1 ? "s" : ""}`;
    } else if (this.durationHours < 720) {
      const weeks = Math.round(this.durationHours / 168);
      return `${weeks} Week${weeks > 1 ? "s" : ""}`;
    } else {
      const months = Math.round(this.durationHours / 720);
      return `${months} Month${months > 1 ? "s" : ""}`;
    }
  }

  public toJSON(): object {
    const values = Object.assign({}, this.get()) as any;
    // Add computed fields
    values.durationDisplay = this.getDurationDisplay();
    values.price = this.basePrice; // Base price for compatibility
    return values;
  }

  // Static methods
  static async findActive(): Promise<Plan[]> {
    return this.findAll({
      where: { isActive: true },
      order: [
        ["isPopular", "DESC"],
        ["basePrice", "ASC"],
      ],
    });
  }

  static async findById(id: string): Promise<Plan | null> {
    return this.findByPk(id);
  }
}

// Initialize the model
Plan.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        len: [1, 100],
        notEmpty: true,
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    basePrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0,
      },
    },
    durationHours: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
      },
    },
    bandwidthLimit: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: "Format: download/upload e.g., '10M/5M'",
    },
    maxDevices: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      validate: {
        min: 1,
        max: 10,
      },
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    isPopular: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    features: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
      validate: {
        isArrayValidator(value: any) {
          if (!Array.isArray(value)) {
            throw new Error("Features must be an array");
          }
        },
      },
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
    modelName: "Plan",
    tableName: "plans",
    timestamps: true,
    indexes: [
      {
        fields: ["isActive"],
      },
      {
        fields: ["isPopular"],
      },
      {
        fields: ["basePrice"],
      },
    ],
  }
);

export default Plan;
export { Plan };
export type { PlanAttributes, PlanCreationAttributes };
