import speakeasy from "speakeasy";
import qrcode from "qrcode";
import { Admin } from "../models";

export async function generateSecret(admin: any) {
  const secret = speakeasy.generateSecret({
    name: `VukaWiFi Admin (${admin.email})`,
  });
  admin.twoFactorSecret = secret.base32;
  await admin.save();
  const otpauthUrl = secret.otpauth_url;
  if (!otpauthUrl) {
    throw new Error("Failed to generate OTP Auth URL for 2FA.");
  }
  const qrCodeDataURL = await qrcode.toDataURL(otpauthUrl);
  return { secret: secret.base32, otpauthUrl, qrCodeDataURL };
}

export function verifyToken(secret: string, token: string) {
  return speakeasy.totp.verify({
    secret,
    encoding: "base32",
    token,
    window: 1,
  });
}

export async function enable2FA(admin: any, token: string) {
  if (!admin.twoFactorSecret) return false;
  const isValid = verifyToken(admin.twoFactorSecret, token);
  if (isValid) {
    admin.twoFactorEnabled = true;
    await admin.save();
    return true;
  }
  return false;
}

export async function disable2FA(admin: any) {
  admin.twoFactorEnabled = false;
  admin.twoFactorSecret = null;
  await admin.save();
}

export function get2FAStatus(admin: any) {
  return {
    enabled: !!admin.twoFactorEnabled,
    hasSecret: !!admin.twoFactorSecret,
  };
}
