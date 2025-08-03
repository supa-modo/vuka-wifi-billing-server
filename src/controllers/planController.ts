import { Request, Response } from "express";
import { Plan } from "../models";

// GET /api/v1/plans - Get all active plans
export async function getPlans(req: Request, res: Response) {
  try {
    const activeOnly = req.query.activeOnly === "true";

    if (activeOnly) {
      const plans = await Plan.findActive();
      return res.json({
        success: true,
        data: plans,
        message: "Active plans retrieved successfully",
      });
    }

    const plans = await Plan.findAll({
      order: [
        ["isPopular", "DESC"],
        ["basePrice", "ASC"],
      ],
    });

    res.json({
      success: true,
      data: plans,
      message: "Plans retrieved successfully",
    });
  } catch (error) {
    console.error("Error fetching plans:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch plans",
      message: "An error occurred while retrieving plans",
    });
  }
}

// GET /api/v1/plans/:id - Get a specific plan
export async function getPlan(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const plan = await Plan.findByPk(id);

    if (!plan) {
      return res.status(404).json({
        success: false,
        error: "Plan not found",
        message: "The requested plan could not be found",
      });
    }

    res.json({
      success: true,
      data: plan,
      message: "Plan retrieved successfully",
    });
  } catch (error) {
    console.error("Error fetching plan:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch plan",
      message: "An error occurred while retrieving the plan",
    });
  }
}

// POST /api/v1/plans/:id/calculate-price - Calculate price for multiple devices
export async function calculatePlanPrice(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { deviceCount = 1 } = req.body;

    if (!deviceCount || deviceCount < 1) {
      return res.status(400).json({
        success: false,
        error: "Invalid device count",
        message: "Device count must be at least 1",
      });
    }

    const plan = await Plan.findByPk(id);
    if (!plan) {
      return res.status(404).json({
        success: false,
        error: "Plan not found",
        message: "The requested plan could not be found",
      });
    }

    if (deviceCount > plan.maxDevices) {
      return res.status(400).json({
        success: false,
        error: "Device count exceeds limit",
        message: `This plan supports a maximum of ${plan.maxDevices} devices`,
      });
    }

    const calculatedPrice = plan.calculatePrice(deviceCount);

    res.json({
      success: true,
      data: {
        planId: plan.id,
        planName: plan.name,
        basePrice: plan.basePrice,
        deviceCount,
        calculatedPrice,
        maxDevices: plan.maxDevices,
      },
      message: "Price calculated successfully",
    });
  } catch (error) {
    console.error("Error calculating plan price:", error);
    res.status(500).json({
      success: false,
      error: "Failed to calculate price",
      message: "An error occurred while calculating the plan price",
    });
  }
}

// POST /api/v1/plans - Create a new plan (Admin only)
export async function createPlan(req: Request, res: Response) {
  try {
    const {
      name,
      description,
      basePrice,
      durationHours,
      bandwidthLimit,
      maxDevices,
      features,
      isPopular,
    } = req.body;

    if (!name || !basePrice || !durationHours || !features) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields",
        message: "Name, base price, duration hours, and features are required",
      });
    }

    const plan = await Plan.create({
      name,
      description,
      basePrice: parseFloat(basePrice),
      durationHours: parseInt(durationHours),
      bandwidthLimit,
      maxDevices: maxDevices || 1,
      features: Array.isArray(features) ? features : [],
      isPopular: isPopular || false,
    });

    res.status(201).json({
      success: true,
      data: plan,
      message: "Plan created successfully",
    });
  } catch (error) {
    console.error("Error creating plan:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create plan",
      message: "An error occurred while creating the plan",
    });
  }
}

// PUT /api/v1/plans/:id - Update a plan (Admin only)
export async function updatePlan(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const updateData = req.body;

    console.log("Updating plan:", id, "with data:", updateData);

    const plan = await Plan.findByPk(id);
    if (!plan) {
      return res.status(404).json({
        success: false,
        error: "Plan not found",
        message: "The requested plan could not be found",
      });
    }

    // Update the plan with the new data
    await plan.update(updateData);

    // Reload the plan to get the updated data
    await plan.reload();

    res.json({
      success: true,
      data: plan,
      message: "Plan updated successfully",
    });
  } catch (error) {
    console.error("Error updating plan:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update plan",
      message: "An error occurred while updating the plan",
    });
  }
}

// DELETE /api/v1/plans/:id - Delete a plan (Admin only)
export async function deletePlan(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const plan = await Plan.findByPk(id);
    if (!plan) {
      return res.status(404).json({
        success: false,
        error: "Plan not found",
        message: "The requested plan could not be found",
      });
    }

    await plan.destroy();

    res.json({
      success: true,
      message: "Plan deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting plan:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete plan",
      message: "An error occurred while deleting the plan",
    });
  }
}

// PATCH /api/v1/plans/:id/toggle - Toggle plan active status (Admin only)
export async function togglePlanStatus(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const plan = await Plan.findByPk(id);
    if (!plan) {
      return res.status(404).json({
        success: false,
        error: "Plan not found",
        message: "The requested plan could not be found",
      });
    }

    plan.isActive = !plan.isActive;
    await plan.save();

    res.json({
      success: true,
      data: plan,
      message: `Plan ${
        plan.isActive ? "activated" : "deactivated"
      } successfully`,
    });
  } catch (error) {
    console.error("Error toggling plan status:", error);
    res.status(500).json({
      success: false,
      error: "Failed to toggle plan status",
      message: "An error occurred while updating the plan status",
    });
  }
}

// PATCH /api/v1/plans/:id/set-popular - Set plan as popular (Admin only)
export async function setPlanPopular(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { isPopular } = req.body;

    const plan = await Plan.findByPk(id);
    if (!plan) {
      return res.status(404).json({
        success: false,
        error: "Plan not found",
        message: "The requested plan could not be found",
      });
    }

    // If setting as popular, unset others
    if (isPopular) {
      await Plan.update({ isPopular: false }, { where: {} });
    }

    plan.isPopular = isPopular;
    await plan.save();

    res.json({
      success: true,
      data: plan,
      message: `Plan popularity updated successfully`,
    });
  } catch (error) {
    console.error("Error setting plan popularity:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update plan popularity",
      message: "An error occurred while updating the plan popularity",
    });
  }
}
