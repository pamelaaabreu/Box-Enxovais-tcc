export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  name?: string;
  email?: string;
  role?: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  terms: boolean;
}

export interface AppJwtPayload {
  userId?: number;
  role?: string;
  exp?: number;
  iat?: number;
  iss?: string;
  sub?: string;
}
