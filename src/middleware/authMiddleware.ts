import { Request, Response, NextFunction } from "express";
import { verifyJwt } from "../services/jwtService";
import { Admin } from "../models";

export async function authenticateAdmin(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ error: "Missing or invalid Authorization header" });
  }
  const token = authHeader.split(" ")[1];
  const payload = verifyJwt(token);
  if (!payload || typeof payload !== "object" || !payload.id) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
  const admin = await Admin.findByPk(payload.id);
  if (!admin || !admin.isActive) {
    return res.status(401).json({ error: "Admin not found or inactive" });
  }
  req.user = admin;
  next();
}

// Export as authMiddleware for convenience
export const authMiddleware = authenticateAdmin;
