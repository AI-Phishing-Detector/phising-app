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
      throw new Error(getHttpErrorMessage(response.status));
    }

    const responseBody: unknown = await response.json();

    if (!isScanResult(responseBody)) {
      throw new Error(
        "Sunucudan beklenmeyen bir analiz sonucu geldi. Lütfen tekrar deneyin.",
      );
    }

    return {
      verdict: responseBody.verdict,
      riskScore: responseBody.riskScore,
      title: responseBody.title,
      message: responseBody.message,
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(
        "Sunucu zamanında cevap vermedi. Lütfen daha sonra tekrar deneyin.",
      );
    }

    if (error instanceof TypeError) {
      throw new Error(
        "Sunucuya ulaşılamadı. İnternet veya sunucu bağlantısını kontrol edin.",
      );
    }

    if (error instanceof Error) {
      throw error;
    }

    throw new Error(
      "Tarama sırasında beklenmeyen bir sorun oluştu. Lütfen tekrar deneyin.",
    );
  } finally {
    clearTimeout(timeoutId);
  }
}