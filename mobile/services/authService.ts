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

function isAuthResponse(value: unknown): value is AuthResponse {
  if (!value || typeof value !== "object") {
    return false;
  }

  const response = value as Partial<AuthResponse>;

  return (
    typeof response.status === "string" && typeof response.message === "string"
  );
}

function isLoginResponse(value: unknown): value is LoginResponse {
  if (!isAuthResponse(value)) {
    return false;
  }

  return typeof (value as Partial<LoginResponse>).ad_soyad === "string";
}

async function getErrorMessage(response: Response) {
  try {
    const errorBody = (await response.json()) as {
      detail?: string;
    };

    if (typeof errorBody.detail === "string") {
      return errorBody.detail;
    }
  } catch {
    // Sunucu JSON hata cevabı vermediyse genel mesaj kullanılır.
  }

  return `Sunucu isteği tamamlayamadı. Hata kodu: ${response.status}`;
}

async function postRequest<TRequest, TResponse>(
  endpoint: string,
  payload: TRequest,
  validateResponse: (value: unknown) => value is TResponse,
): Promise<TResponse> {
  if (!API_BASE_URL) {
    throw new Error(
      "Backend adresi bulunamadı. EXPO_PUBLIC_API_URL ayarını kontrol edin.",
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
      const errorMessage = await getErrorMessage(response);
      throw new Error(errorMessage);
    }

    const responseBody: unknown = await response.json();

    if (!validateResponse(responseBody)) {
      throw new Error("Sunucudan beklenmeyen bir cevap geldi.");
    }

    return responseBody;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Sunucu 15 saniye içinde cevap vermedi.");
    }

    if (error instanceof TypeError) {
      throw new Error(
        "Backend sunucusuna ulaşılamadı. İnternet veya sunucu bağlantısını kontrol edin.",
      );
    }

    if (error instanceof Error) {
      throw error;
    }

    throw new Error("İşlem sırasında beklenmeyen bir sorun oluştu.");
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
  return postRequest("/api/v1/forgot-password", payload, isAuthResponse);
}
