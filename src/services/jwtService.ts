import jwt, { SignOptions } from "jsonwebtoken";
import { config } from "../config";

const jwtSecret: string = config.jwt.secret as string;

export function signJwt(payload: object, options?: SignOptions) {
  const signOptions: SignOptions = options ? { ...options } : {};
  if (config.jwt.expiresIn) {
    signOptions.expiresIn = config.jwt.expiresIn as SignOptions["expiresIn"];
  }
  return jwt.sign(payload, jwtSecret, signOptions);
}

export function verifyJwt(token: string) {
  try {
    return jwt.verify(token, jwtSecret);
  } catch (err) {
    return null;
  }
}
