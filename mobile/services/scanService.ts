import type { ScanResult } from "../types/scan";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, "");
const REQUEST_TIMEOUT_MS = 15_000;

/**
 * Yalnızca uygulama tarafından güvenli hâle getirilen mesajların
 * kullanıcı arayüzüne ulaşmasını sağlar.
 */
export class UserFacingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserFacingError";
  }
}

function isScanResult(value: unknown): value is ScanResult {
  if (!value || typeof value !== "object") {
    return false;
  }

  const result = value as Partial<ScanResult>;

  return (
    (result.verdict === "safe" || result.verdict === "dangerous") &&
    typeof result.riskScore === "number" &&
    Number.isFinite(result.riskScore) &&
    result.riskScore >= 0 &&
    result.riskScore <= 100 &&
    typeof result.title === "string" &&
    typeof result.message === "string"
  );
}

function getHttpErrorMessage(status: number): string {
  if (status === 400 || status === 422) {
    return "Lütfen geçerli bir URL girin.";
  }

  if (status === 429) {
    return "Çok fazla tarama isteği gönderildi. Lütfen biraz bekleyip tekrar deneyin.";
  }

  if (status >= 500) {
    return "Sunucuda bir sorun oluştu. Lütfen daha sonra tekrar deneyin.";
  }

  return "Tarama isteği tamamlanamadı. Lütfen tekrar deneyin.";
}

export async function scanUrl(url: string): Promise<ScanResult> {
  if (!API_BASE_URL) {
    throw new UserFacingError(
      "Tarama servisi kullanıma hazır değil. Lütfen daha sonra tekrar deneyin.",
    );
  }

  const controller = new AbortController();

  const timeoutId = setTimeout(() => {
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/scan-url`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new UserFacingError(getHttpErrorMessage(response.status));
    }

    const responseBody: unknown = await response.json();

    if (!isScanResult(responseBody)) {
      throw new UserFacingError(
        "Tarama sonucu görüntülenemedi. Lütfen tekrar deneyin.",
      );
    }

    return {
      verdict: responseBody.verdict,
      riskScore: responseBody.riskScore,
      title: responseBody.title,
      message: responseBody.message,
    };
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

    // SyntaxError ve diğer teknik hataların arayüze sızması engellenir.
    throw new UserFacingError(
      "Tarama sırasında bir sorun oluştu. Lütfen tekrar deneyin.",
    );
  } finally {
    clearTimeout(timeoutId);
  }
}