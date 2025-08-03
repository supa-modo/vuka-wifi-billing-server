import { Request, Response } from "express";
import jwt, { SignOptions } from "jsonwebtoken";
import { Admin } from "../models";
import { config } from "../config";
import * as twoFactorService from "../services/twoFactorService";

function signToken(admin: any) {
  const payload = {
    id: admin.id,
    email: admin.email,
    role: admin.role,
  };
  return jwt.sign(
    payload,
    config.jwt.secret as jwt.Secret,
    {
      expiresIn: config.jwt.expiresIn as string,
    } as SignOptions
  );
}

export async function login(req: Request, res: Response) {
  const { email, password, twoFactorCode } = req.body;
  const admin = await Admin.findByEmail(email);
  if (!admin || !(await admin.validatePassword(password))) {
    return res.status(401).json({
      success: false,
      error: "Invalid email or password",
    });
  }
  if (!admin.isActive) {
    return res.status(403).json({
      success: false,
      error: "Admin account is inactive",
    });
  }
  // If 2FA is enabled, require code
  if (admin.twoFactorEnabled) {
    if (!twoFactorCode) {
      return res.status(200).json({
        success: false,
        requires2FA: true,
        message: "Two-factor authentication code required",
      });
    }
    if (!admin.twoFactorSecret || typeof admin.twoFactorSecret !== "string") {
      return res.status(400).json({
        success: false,
        error:
          "Two-factor authentication is not properly set up for this account.",
      });
    }
    const valid2FA = twoFactorService.verifyToken(
      admin.twoFactorSecret,
      twoFactorCode
    );
    if (!valid2FA) {
      return res.status(401).json({
        success: false,
        error: "Invalid two-factor authentication code",
      });
    }
  }
  admin.lastLogin = new Date();
  await admin.save();
  const token = signToken(admin);
  res.json({
    success: true,
    data: {
      token,
      admin: admin.toJSON(),
    },
  });
}

export async function setup2FA(req: Request, res: Response) {
  const { email } = req.body;
  const admin = await Admin.findByEmail(email);
  if (!admin) return res.status(404).json({ error: "Admin not found" });
  const result = await twoFactorService.generateSecret(admin);
  res.json(result);
}

export async function enable2FA(req: Request, res: Response) {
  const { email, token } = req.body;
  const admin = await Admin.findByEmail(email);
  if (!admin) return res.status(404).json({ error: "Admin not found" });
  const enabled = await twoFactorService.enable2FA(admin, token);
  if (!enabled) return res.status(400).json({ error: "Invalid 2FA code" });
  res.json({ message: "Two-factor authentication enabled" });
}

export async function disable2FA(req: Request, res: Response) {
  const { email } = req.body;
  const admin = await Admin.findByEmail(email);
  if (!admin) return res.status(404).json({ error: "Admin not found" });
  await twoFactorService.disable2FA(admin);
  res.json({ message: "Two-factor authentication disabled" });
}

export async function get2FAStatus(req: Request, res: Response) {
  const { email } = req.query;
  const admin = await Admin.findByEmail(email as string);
  if (!admin) return res.status(404).json({ error: "Admin not found" });
  res.json(twoFactorService.get2FAStatus(admin));
}

// POST /auth/reset-request
export async function resetRequest(req: Request, res: Response) {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }
  const admin = await Admin.findByEmail(email);
  if (!admin) {
    // For security, do not reveal if email exists
    return res.json({
      message: "If the email exists, a reset link will be sent.",
    });
  }
  const { token, expires } = await Admin.generatePasswordReset(admin);
  const resetUrl = `${config.app.url}/admin/reset-password?token=${token}`;
  // TODO: Send email here. For now, log to console for dev.
  console.log(`Password reset link for ${admin.email}: ${resetUrl}`);
  res.json({ message: "If the email exists, a reset link will be sent." });
}

// POST /auth/reset-confirm
export async function resetConfirm(req: Request, res: Response) {
  const { token, password } = req.body;
  if (!token || !password) {
    return res
      .status(400)
      .json({ error: "Token and new password are required" });
  }
  const admin = await Admin.findOne({ where: { passwordResetToken: token } });
  if (
    !admin ||
    !admin.passwordResetExpires ||
    admin.passwordResetExpires < new Date()
  ) {
    return res.status(400).json({ error: "Invalid or expired reset token" });
  }
  admin.password = password;
  admin.passwordResetToken = undefined;
  admin.passwordResetExpires = undefined;
  await admin.save();
  res.json({ message: "Password has been reset successfully" });
}
