"use client";

import Image from "next/image";
import type { FormEvent } from "react";
import { useMemo, useState } from "react";

type BackendResponse = {
  url?: string;
  durum?: string;
  status?: string;
  prediction?: string;
  result?: string;
  message?: string;
  risk_score?: number;
  riskScore?: number;
  analiz_verileri?: Record<string, unknown>;
};

type ScanState = "idle" | "loading" | "success" | "error";
type ResultVariant = "safe" | "danger" | "neutral";
type InfoTopic = "phishing" | "protection" | "workflow";

type ResultView = {
  variant: ResultVariant;
  title: string;
  badge: string;
  description: string;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const REQUEST_TIMEOUT_MS = 15000;
const infoTopics: InfoTopic[] = ["phishing", "protection", "workflow"];

const infoContent: Record<InfoTopic, { title: string; text: string; items: string[] }> = {
  phishing: {
    title: "Phishing nedir?",
    text:
      "Phishing, saldırganların gerçek kurumları taklit eden sahte bağlantılar veya web sayfaları kullanarak kullanıcıları kandırmasıdır. Amaç; şifre, kart bilgisi, hesap bilgisi veya kişisel verileri ele geçirmektir.",
    items: [
      "Sahte giriş ekranları kullanılabilir.",
      "Linkler gerçek siteye benzer görünebilir.",
      "Kullanıcıdan acil işlem yapması istenebilir.",
    ],
  },
  protection: {
    title: "Nasıl korunulur?",
    text:
      "Şüpheli bir bağlantıya tıklamadan önce alan adı dikkatlice kontrol edilmeli, bilinmeyen kaynaklardan gelen formlara bilgi girilmemeli ve bağlantı güvenilir değilse analiz edilmelidir.",
    items: [
      "Alan adında harf değişimi veya garip karakter var mı kontrol edin.",
      "SMS, e-posta veya sosyal medya üzerinden gelen linklere dikkat edin.",
      "Şifre veya kart bilgisi isteyen sayfalarda ekstra dikkatli olun.",
    ],
  },
  workflow: {
    title: "Sistem nasıl çalışır?",
    text:
      "Kullanıcı URL adresini web arayüzüne girer. Frontend bu adresi backend API'ye gönderir. Backend URL özelliklerini çıkarır ve yapay zeka modeli hazır olduğunda sonucu kullanıcıya döndürür.",
    items: ["URL frontend üzerinden alınır.", "Backend tarafında analiz edilir.", "Sonuç ekranda kullanıcıya gösterilir."],
  },
};

function getErrorMessage(statusCode: number) {
  if (statusCode === 400) {
    return "Hata 400: Geçersiz URL girdiniz. Lütfen https://example.com formatında geçerli bir bağlantı yazın.";
  }

  if (statusCode === 422) {
    return "Hata 422: URL formatı doğrulanamadı. Lütfen https://example.com formatında geçerli bir bağlantı yazın.";
  }

  if (statusCode === 404) {
    return "Hata 404: Tarama servisi bulunamadı. Backend endpoint adresi kontrol edilmeli.";
  }

  if (statusCode >= 500) {
    return "Hata 500: Sunucu analizi tamamlayamadı. Lütfen birkaç dakika sonra tekrar deneyin.";
  }

  return `Hata ${statusCode}: URL tarama isteği tamamlanamadı. Lütfen tekrar deneyin.`;
}

function getResultView(result: BackendResponse): ResultView {
  const rawStatus = `${result.prediction ?? ""} ${result.result ?? ""} ${result.status ?? ""} ${result.durum ?? ""}`.toLowerCase();
  const riskScore = result.risk_score ?? result.riskScore;

  const isDanger =
    rawStatus.includes("phishing") ||
    rawStatus.includes("zararlı") ||
    rawStatus.includes("tehlikeli") ||
    rawStatus.includes("danger") ||
    rawStatus.includes("malicious") ||
    (typeof riskScore === "number" && riskScore >= 50);

  const isSafe =
    rawStatus.includes("safe") ||
    rawStatus.includes("güvenli") ||
    rawStatus.includes("guvenli") ||
    rawStatus.includes("benign") ||
    (typeof riskScore === "number" && riskScore < 50);

  if (isDanger) {
    return {
      variant: "danger",
      title: "Zararlı / Şüpheli URL",
      badge: typeof riskScore === "number" ? `%${riskScore} risk` : "Riskli",
      description: result.message ?? result.durum ?? "Bu bağlantı phishing riski taşıyor. Bilgi girmeden önce dikkatli olun.",
    };
  }

  if (isSafe) {
    return {
      variant: "safe",
      title: "Güvenli URL",
      badge: typeof riskScore === "number" ? `%${riskScore} risk` : "Güvenli",
      description: result.message ?? result.durum ?? "Bu bağlantı backend analizine göre güvenli görünüyor.",
    };
  }

  return {
    variant: "neutral",
    title: "URL analiz edildi",
    badge: "Analiz tamamlandı",
    description:
      result.message ??
      result.durum ??
      "Backend URL özelliklerini çıkardı. Yapay zeka sonucu geldiğinde güvenli veya zararlı durumu burada gösterilecek.",
  };
}

function getResultClasses(variant: ResultVariant) {
  if (variant === "danger") {
    return {
      section: "border-red-200 bg-red-50",
      badge: "bg-red-600 text-white",
      text: "text-red-900",
      subText: "text-red-700",
    };
  }

  if (variant === "safe") {
    return {
      section: "border-green-200 bg-green-50",
      badge: "bg-green-600 text-white",
      text: "text-green-900",
      subText: "text-green-700",
    };
  }

  return {
    section: "border-black/10 bg-black/[0.04]",
    badge: "bg-black text-white",
    text: "text-black",
    subText: "text-black/65",
  };
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<ScanState>("idle");
  const [result, setResult] = useState<BackendResponse | null>(null);
  const [error, setError] = useState("");
  const [activeTopic, setActiveTopic] = useState<InfoTopic>("phishing");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedUrl = url.trim();

    if (!trimmedUrl) {
      setStatus("error");
      setError("Lütfen taranacak bir URL girin.");
      setResult(null);
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    setStatus("loading");
    setError("");
    setResult(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/scan-url`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: trimmedUrl }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(getErrorMessage(response.status));
      }

      const data = (await response.json()) as BackendResponse;

      setResult(data);
      setStatus("success");
    } catch (requestError) {
      setStatus("error");

      if (requestError instanceof DOMException && requestError.name === "AbortError") {
        setError("Timeout: Sunucu 15 saniye içinde cevap vermedi. Lütfen daha sonra tekrar deneyin.");
        return;
      }

      if (requestError instanceof TypeError) {
        setError(
          "Failed to fetch: Backend sunucusuna ulaşılamadı. FastAPI servisinin açık olduğundan ve http://localhost:8000 adresinde çalıştığından emin olun.",
        );
        return;
      }

      if (requestError instanceof Error) {
        setError(requestError.message);
        return;
      }

      setError("Ağ bağlantısı kurulamadı. Backend sunucusunun http://localhost:8000 adresinde çalıştığından emin olun.");
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  const selectedInfo = infoContent[activeTopic];
  const resultView = useMemo(() => (result ? getResultView(result) : null), [result]);
  const resultClasses = resultView ? getResultClasses(resultView.variant) : null;

  return (
    <main className="min-h-screen bg-white text-black lg:flex">
      <aside className="bg-black px-5 py-7 text-white lg:min-h-screen lg:w-[20%] lg:px-5">
        <p className="text-xs uppercase tracking-[0.35em] text-white/45">Bilgi paneli</p>
        <h2 className="mt-3 text-xl font-semibold tracking-tight">Phishing Rehberi</h2>

        <nav className="mt-7 space-y-3" aria-label="Phishing bilgi başlıkları">
          {infoTopics.map((topicKey) => (
            <button
              key={topicKey}
              type="button"
              onClick={() => setActiveTopic(topicKey)}
              className={`w-full cursor-pointer rounded-2xl border px-3 py-3 text-left text-xs font-medium transition ${
                activeTopic === topicKey
                  ? "border-white bg-white text-black"
                  : "border-white/20 text-white hover:border-white hover:bg-white/10"
              }`}
            >
              {infoContent[topicKey].title}
            </button>
          ))}
        </nav>

        <section key={activeTopic} className="mt-7 rounded-2xl border border-white/15 bg-white/5 p-4">
          <h3 className="text-lg font-semibold">{selectedInfo.title}</h3>
          <p className="mt-3 text-xs leading-6 text-white/70">{selectedInfo.text}</p>
          <ul className="mt-5 space-y-3">
            {selectedInfo.items.map((item) => (
              <li key={item} className="rounded-2xl border border-white/10 bg-black px-3 py-2 text-xs text-white/75">
                {item}
              </li>
            ))}
          </ul>
        </section>
      </aside>

      <section className="flex min-h-screen flex-1 flex-col px-6 py-8 lg:px-10">
        <nav className="border-b border-black/10 pb-5">
          <p className="text-sm uppercase tracking-[0.35em] text-black/50">AI PHISHING DETECTOR</p>
          <h1 className="mt-2 text-2xl font-semibold">Web URL Tarama Paneli</h1>
        </nav>

        <div className="grid flex-1 gap-8 py-10 xl:grid-cols-[1fr_1fr] xl:items-center">
          <div>
            <p className="mb-4 inline-flex rounded-full border border-black/15 px-4 py-2 text-sm text-black/70">
              Oltalama bağlantılarını erken fark etmek için hızlı web arayüzü
            </p>
            <h2 className="max-w-3xl text-5xl font-semibold tracking-tight md:text-7xl">Lütfen linki yapıştırın.</h2>
            <div className="mt-8 max-w-xl rounded-[2rem] border border-black/10 bg-white p-3 shadow-sm">
              <Image
                src="/phishing-illustration.svg"
                alt="Phishing saldırılarına karşı güvenli bağlantı analizi illüstrasyonu"
                width={720}
                height={420}
                className="h-auto w-full rounded-[1.5rem]"
                priority
              />
            </div>
          </div>

          <div id="scan" className="w-full max-w-[620px] justify-self-start rounded-[2rem] border border-black/10 bg-black p-3 shadow-2xl shadow-black/15 xl:-ml-8">
            <div className="rounded-[1.5rem] bg-white p-6">
              <div className="mb-8 flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-2xl font-semibold">URL Analizi</h3>
                  <p className="mt-2 text-sm text-black/55">Linki girin ve backend sonucunu görüntüleyin.</p>
                </div>
                <span className="rounded-full border border-black/10 px-3 py-1 text-xs font-medium text-black/70">API</span>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <label className="block text-sm font-medium" htmlFor="url">
                  Taranacak URL
                </label>
                <input
                  id="url"
                  type="url"
                  required
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  placeholder="https://example.com/login"
                  aria-invalid={status === "error"}
                  aria-describedby={status === "error" ? "scan-error" : undefined}
                  className="w-full rounded-2xl border border-black/15 px-4 py-4 text-base outline-none transition placeholder:text-black/35 focus:border-black focus:ring-4 focus:ring-black/10"
                />

                <button type="submit" disabled={status === "loading"} className="w-full rounded-2xl bg-black px-5 py-4 font-semibold text-white transition hover:bg-black/80 disabled:cursor-not-allowed disabled:bg-black/45">
                  {status === "loading" ? "Taranıyor..." : "Bağlantıyı Tara"}
                </button>
              </form>

              <div aria-live="polite" className="mt-6">
                {status === "error" && (
                  <section id="scan-error" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800">
                    <p className="font-semibold">Sonuç alınamadı</p>
                    <p className="mt-2 text-sm leading-6">{error}</p>
                  </section>
                )}

                {status === "success" && result && resultView && resultClasses && (
                  <section className={`rounded-2xl border p-4 ${resultClasses.section}`}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h4 className={`text-lg font-semibold ${resultClasses.text}`}>{resultView.title}</h4>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${resultClasses.badge}`}>{resultView.badge}</span>
                    </div>
                    <p className={`mt-3 text-sm leading-6 ${resultClasses.subText}`}>{resultView.description}</p>

                    <div className="mt-4 rounded-2xl border border-black/10 bg-white/70 p-4 text-sm">
                      <p className="font-medium">Taranan URL</p>
                      <p className="mt-1 break-all text-black/65">{result.url ?? url}</p>
                    </div>

                    {result.analiz_verileri && (
                      <details className="mt-4 rounded-2xl border border-black/10 bg-white/70 p-4 text-sm">
                        <summary className="cursor-pointer font-medium">Çıkarılan URL özelliklerini göster</summary>
                        <pre className="mt-4 max-h-72 overflow-auto whitespace-pre-wrap rounded-2xl bg-black p-4 text-xs leading-5 text-white">
                          {JSON.stringify(result.analiz_verileri, null, 2)}
                        </pre>
                      </details>
                    )}
                  </section>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}