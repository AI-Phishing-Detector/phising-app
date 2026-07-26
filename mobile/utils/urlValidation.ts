export const MAX_URL_LENGTH = 2048;

export type UrlValidationResult =
  | {
      isValid: true;
      cleanedUrl: string;
    }
  | {
      isValid: false;
      error: string;
    };

export function validateUrl(value: string): UrlValidationResult {
  const cleanedUrl = value.trim();

  if (!cleanedUrl) {
    return {
      isValid: false,
      error: "Lütfen bir bağlantı girin.",
    };
  }

  if (cleanedUrl.length > MAX_URL_LENGTH) {
    return {
      isValid: false,
      error: `Bağlantı en fazla ${MAX_URL_LENGTH} karakter olabilir.`,
    };
  }

  if (/\s/.test(cleanedUrl)) {
    return {
      isValid: false,
      error: "Bağlantının içinde boşluk bulunamaz.",
    };
  }

  if (!/^https?:\/\//i.test(cleanedUrl)) {
    return {
      isValid: false,
      error: "Bağlantı http:// veya https:// ile başlamalıdır.",
    };
  }

  try {
    const parsedUrl = new URL(cleanedUrl);

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return {
        isValid: false,
        error: "Yalnızca HTTP ve HTTPS bağlantıları taranabilir.",
      };
    }

    if (!parsedUrl.hostname) {
      return {
        isValid: false,
        error: "Bağlantıda geçerli bir alan adı bulunamadı.",
      };
    }

    if (
      parsedUrl.hostname.startsWith(".") ||
      parsedUrl.hostname.endsWith(".") ||
      parsedUrl.hostname.includes("..")
    ) {
      return {
        isValid: false,
        error: "Bağlantının alan adı geçerli değil.",
      };
    }

    return {
      isValid: true,
      cleanedUrl,
    };
  } catch {
    return {
      isValid: false,
      error: "Geçerli bir bağlantı girin.",
    };
  }
}
