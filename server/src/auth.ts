import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import { prisma } from './db.js';

const SECRET = process.env.JWT_SECRET || 'dev-secret';

export interface AuthedRequest extends Request {
  userId?: string;
}

export function signToken(userId: string): string {
  return jwt.sign({ uid: userId }, SECRET, { expiresIn: '30d' });
}

/**
 * Requires a valid Bearer token AND that the user still exists in the DB.
 * A token for a deleted user (e.g. after a dev re-seed) returns 401 so the
 * client clears the session and returns to login — never a 500.
 */
export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing token' });
  try {
    const payload = jwt.verify(token, SECRET) as { uid: string };
    const user = await prisma.user.findUnique({ where: { id: payload.uid }, select: { id: true } });
    if (!user) return res.status(401).json({ error: 'Session expired — please sign in again' });
    req.userId = payload.uid;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
