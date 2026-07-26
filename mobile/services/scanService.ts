import type { ScanResult } from "../types/scan";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, "");

const REQUEST_TIMEOUT_MS = 15_000;

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

export async function scanUrl(url: string): Promise<ScanResult> {
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
    const response = await fetch(`${API_BASE_URL}/api/v1/scan-url`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorMessage = await getErrorMessage(response);
      throw new Error(errorMessage);
    }

    const responseBody: unknown = await response.json();

    if (!isScanResult(responseBody)) {
      throw new Error("Sunucudan beklenmeyen bir analiz sonucu geldi.");
    }

    return {
      verdict: responseBody.verdict,
      riskScore: responseBody.riskScore,
      title: responseBody.title,
      message: responseBody.message,
    };
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

    throw new Error("Tarama sırasında beklenmeyen bir sorun oluştu.");
  } finally {
    clearTimeout(timeoutId);
  }
}
