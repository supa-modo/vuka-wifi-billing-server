import { Request, Response } from 'express';
import RadiusService from '../services/radiusService';

export async function authenticate(req: Request, res: Response) {
  const { username, password } = req.body;
  const result = await RadiusService.authenticate(username, password);
  res.json(result);
}

export async function accounting(req: Request, res: Response) {
  const data = req.body;
  const result = await RadiusService.accounting(data);
  res.json(result);
}

export async function coa(req: Request, res: Response) {
  const { username, sessionId, action, params } = req.body;
  const result = await RadiusService.sendCoA(username, sessionId, action, params);
  res.json(result);
} 