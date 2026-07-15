"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";

type BackendResponse = {
  url: string;
  durum: string;
  analiz_verileri?: Record<string, unknown>;
};

type ScanState = "idle" | "loading" | "success" | "error";
type InfoTopic = "phishing" | "protection" | "workflow";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
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
      "Kullanıcı URL'yi web arayüzüne girer. Frontend bu URL'yi backend API'ye gönderir. Backend URL özelliklerini çıkarır ve yapay zeka modeli hazır olduğunda sonucu modele sorarak kullanıcıya döndürür.",
    items: [
      "URL frontend üzerinden alınır.",
      "Backend tarafında analiz edilir.",
      "Sonuç ekranda kullanıcıya gösterilir.",
    ],
  },
};

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
      });

      if (!response.ok) {
        throw new Error("Backend isteği başarısız oldu.");
      }

      const data = (await response.json()) as BackendResponse;
      setResult(data);
      setStatus("success");
    } catch {
      setStatus("error");
      setError(
        "Backend bağlantısı kurulamadı. FastAPI sunucusunun http://localhost:8000 adresinde çalıştığından emin olun.",
      );
    }
  }

  const selectedInfo = infoContent[activeTopic];

  return (
    <main className="min-h-screen bg-white text-black lg:flex">
      <aside className="bg-black px-5 py-7 text-white lg:min-h-screen lg:w-[20%] lg:px-5">
        <p className="text-xs uppercase tracking-[0.35em] text-white/45">Bilgi paneli</p>
        <h2 className="mt-3 text-xl font-semibold tracking-tight">Phishing Rehberi</h2>

        <nav className="mt-7 space-y-3">
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
        <nav className="flex items-center justify-between border-b border-black/10 pb-5">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-black/50">AI PHISHING DETECTOR</p>
            <h1 className="mt-2 text-2xl font-semibold">Web URL Tarama Paneli</h1>
          </div>
          <a
            href="#scan"
            className="rounded-full border border-black bg-black px-5 py-2 text-sm font-medium text-white transition hover:bg-white hover:text-black"
          >
            URL Tara
          </a>
        </nav>

        <div className="grid flex-1 gap-8 py-12 xl:grid-cols-[1fr_1fr] xl:items-center">
          <div>
            <p className="mb-4 inline-flex rounded-full border border-black/15 px-4 py-2 text-sm text-black/70">
              Oltalama bağlantılarını erken fark etmek için hızlı web arayüzü
            </p>
            <h2 className="max-w-3xl text-5xl font-semibold tracking-tight md:text-7xl">
              Lütfen linki yapıştırın.
            </h2>
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

          <div id="scan" className="w-full max-w-[620px] justify-self-start xl:-ml-8 rounded-[2rem] border border-black/10 bg-black p-3 shadow-2xl shadow-black/15">
            <div className="rounded-[1.5rem] bg-white p-6">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-semibold">URL Analizi</h3>
                  
                </div>
                <span className="rounded-full border border-black/15 px-3 py-1 text-xs font-medium">API</span>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <label className="block text-sm font-medium" htmlFor="url">
                  Taranacak URL
                </label>
                <input
                  id="url"
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  placeholder="https://example.com/login"
                  className="w-full rounded-2xl border border-black/15 px-4 py-4 text-base outline-none transition placeholder:text-black/35 focus:border-black focus:ring-4 focus:ring-black/10"
                />
                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="w-full rounded-2xl bg-black px-5 py-4 font-semibold text-white transition hover:bg-black/80 disabled:cursor-not-allowed disabled:bg-black/50"
                >
                  {status === "loading" ? "Taranıyor..." : "Bağlantıyı Tara"}
                </button>
              </form>

              {status === "error" && (
                <section className="mt-6 rounded-3xl border border-black/10 bg-black/[0.04] p-5">
                  <p className="text-sm text-black/50">Bağlantı hatası</p>
                  <h4 className="mt-1 text-xl font-semibold">Sonuç alınamadı</h4>
                  <p className="mt-3 text-sm leading-6 text-black/65">{error}</p>
                </section>
              )}

              {status === "success" && result && (
                <section className="mt-6 rounded-3xl border border-black/10 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm text-black/50">Backend sonucu</p>
                      <h4 className="mt-1 text-2xl font-semibold">URL analiz edildi</h4>
                    </div>
                    <div className="rounded-full bg-black px-4 py-2 text-sm font-bold text-white">Başarılı</div>
                  </div>

                  <div className="mt-5 space-y-3 text-sm">
                    <div className="rounded-2xl bg-black/[0.04] px-4 py-3">
                      <p className="font-medium">Taranan URL</p>
                      <p className="mt-1 break-all text-black/65">{result.url}</p>
                    </div>
                    <div className="rounded-2xl bg-black/[0.04] px-4 py-3">
                      <p className="font-medium">Durum</p>
                      <p className="mt-1 text-black/65">{result.durum}</p>
                    </div>
                  </div>

                  {result.analiz_verileri && (
                    <details className="mt-4 rounded-2xl border border-black/10 p-4 text-sm">
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
      </section>
    </main>
  );
}
















