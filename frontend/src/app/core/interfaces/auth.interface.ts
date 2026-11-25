// Credenciais enviadas no login.
export interface LoginCredentials {
  email: string;
  password: string;
}

// Resposta recebida após autenticação.
export interface LoginResponse {
  token: string;
  name?: string;
  email?: string;
  role?: string;
}

// Dados enviados durante o cadastro.
export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  terms: boolean;
}

// Informações contidas no JWT.
export interface AppJwtPayload {
  userId?: number;
  role?: string;
  exp?: number;
  iat?: number;
  iss?: string;
  sub?: string;
}
