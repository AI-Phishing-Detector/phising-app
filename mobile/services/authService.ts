import type {
  AuthResponse,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
} from "../types/auth";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, "");
const REQUEST_TIMEOUT_MS = 15_000;

type AuthEndpoint =
  | "/api/v1/login"
  | "/api/v1/register"
  | "/api/v1/forgot-password";

/**
 * Backend'in teknik hata ayrıntılarının kullanıcı arayüzüne
 * doğrudan gönderilmesini engeller.
 */
class UserFacingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserFacingError";
  }
}

function isAuthResponse(value: unknown): value is AuthResponse {
  if (!value || typeof value !== "object") {
    return false;
  }

  const response = value as Partial<AuthResponse>;

  return (
    typeof response.status === "string" &&
    typeof response.message === "string"
  );
}

function isLoginResponse(value: unknown): value is LoginResponse {
  if (!isAuthResponse(value)) {
    return false;
  }

  return typeof (value as Partial<LoginResponse>).ad_soyad === "string";
}

function getHttpErrorMessage(
  status: number,
  endpoint: AuthEndpoint,
): string {
  if (
    endpoint === "/api/v1/login" &&
    (status === 400 || status === 401)
  ) {
    return "E-posta veya şifre hatalı.";
  }

  if (
    endpoint === "/api/v1/register" &&
    (status === 400 || status === 409)
  ) {
    return "Bu e-posta adresiyle zaten kayıt olunmuş olabilir.";
  }

  if (endpoint === "/api/v1/forgot-password" && status === 404) {
    return "Bu e-posta adresine ait bir hesap bulunamadı.";
  }

  if (status === 400 || status === 422) {
    return "Lütfen girdiğiniz bilgileri kontrol edip tekrar deneyin.";
  }

  if (status === 429) {
    return "Çok fazla istek gönderildi. Lütfen biraz bekleyip tekrar deneyin.";
  }

  if (status >= 500) {
    return "Sunucuda bir sorun oluştu. Lütfen daha sonra tekrar deneyin.";
  }

  return "İşlem tamamlanamadı. Lütfen tekrar deneyin.";
}

async function postRequest<TRequest, TResponse>(
  endpoint: AuthEndpoint,
  payload: TRequest,
  validateResponse: (value: unknown) => value is TResponse,
): Promise<TResponse> {
  if (!API_BASE_URL) {
    throw new UserFacingError(
      "Hesap servisi kullanıma hazır değil. Lütfen daha sonra tekrar deneyin.",
    );
  }

  const controller = new AbortController();

  const timeoutId = setTimeout(() => {
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new UserFacingError(
        getHttpErrorMessage(response.status, endpoint),
      );
    }

    const responseBody: unknown = await response.json();

    if (!validateResponse(responseBody)) {
      throw new UserFacingError(
        "Sunucu cevabı işlenemedi. Lütfen tekrar deneyin.",
      );
    }

    return responseBody;
  } catch (error) {
    if (error instanceof UserFacingError) {
      throw error;
    }

    if (error instanceof Error && error.name === "AbortError") {
      throw new UserFacingError(
        "Sunucu zamanında cevap vermedi. Lütfen daha sonra tekrar deneyin.",
      );
    }

    if (error instanceof TypeError) {
      throw new UserFacingError(
        "Sunucuya ulaşılamadı. İnternet veya sunucu bağlantısını kontrol edin.",
      );
    }

    // JSON ayrıştırma ve diğer teknik hatalar kullanıcıya gösterilmez.
    throw new UserFacingError(
      "İşlem sırasında bir sorun oluştu. Lütfen tekrar deneyin.",
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

export function loginUser(payload: LoginRequest): Promise<LoginResponse> {
  return postRequest("/api/v1/login", payload, isLoginResponse);
}

export function registerUser(
  payload: RegisterRequest,
): Promise<RegisterResponse> {
  return postRequest("/api/v1/register", payload, isAuthResponse);
}

export function forgotPassword(
  payload: ForgotPasswordRequest,
): Promise<ForgotPasswordResponse> {
  return postRequest(
    "/api/v1/forgot-password",
    payload,
    isAuthResponse,
  );
}