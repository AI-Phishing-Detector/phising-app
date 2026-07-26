export interface LoginRequest {
  email: string;
  sifre: string;
}

export interface RegisterRequest {
  ad_soyad: string;
  email: string;
  sifre: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface AuthResponse {
  status: string;
  message: string;
}

export interface LoginResponse extends AuthResponse {
  ad_soyad: string;
}

export type RegisterResponse = AuthResponse;
export type ForgotPasswordResponse = AuthResponse;
