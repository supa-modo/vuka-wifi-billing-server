import { Admin } from "../models/Admin";

declare global {
  namespace Express {
    interface Request {
      user?: Admin;
    }
  }
}

export {};
