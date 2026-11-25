import { jwtDecode } from 'jwt-decode';
import type { AppJwtPayload } from '../types/auth/auth.types';

// A assinatura e a autorização continuam sendo verificadas pelo backend.
export function readValidJwt(token: string): AppJwtPayload | null {
  try {
    const payload = jwtDecode<AppJwtPayload>(token);
    return typeof payload.exp === 'number' &&
      Number.isFinite(payload.exp) &&
      payload.exp * 1000 > Date.now()
      ? payload
      : null;
  } catch {
    return null;
  }
}
