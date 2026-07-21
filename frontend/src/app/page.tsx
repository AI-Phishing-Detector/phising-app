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
type AuthMode = "login" | "register" | "forgot" | "profile" | null;
type PageView = "home" | "history";
type StoredUser = { name: string; email: string; password: string };

type ResultView = {
  variant: ResultVariant;
  title: string;
  badge: string;
  description: string;
};

type ScanHistoryItem = {
  url: string;
  variant: ResultVariant;
  label: string;
  date: string;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const REQUEST_TIMEOUT_MS = 15000;
const infoTopics: InfoTopic[] = ["phishing", "protection", "workflow"];
const USER_STORAGE_PREFIX = "phishing-user:";

function getUserStorageKey(email: string) {
  return `${USER_STORAGE_PREFIX}${email.trim().toLowerCase()}`;
}

function readStoredUser(email: string): StoredUser | null {
  if (typeof window === "undefined") return null;

  const storedUser = window.localStorage.getItem(getUserStorageKey(email));

  if (!storedUser) return null;

  try {
    return JSON.parse(storedUser) as StoredUser;
  } catch {
    return null;
  }
}

function saveStoredUser(user: StoredUser) {
  window.localStorage.setItem(getUserStorageKey(user.email), JSON.stringify(user));
}

function getPasswordStrength(password: string) {
  let score = 0;

  if (password.length >= 8) score += 25;
  if (/[A-ZÇĞİÖŞÜ]/.test(password)) score += 25;
  if (/[0-9]/.test(password)) score += 25;
  if (/[^A-Za-zÇĞİÖŞÜçğıöşü0-9]/.test(password)) score += 25;

  if (score >= 75) {
    return { score, label: "Güçlü şifre", bar: "bg-green-500", text: "text-green-700" };
  }

  if (score >= 50) {
    return { score, label: "Orta güvenlik", bar: "bg-yellow-500", text: "text-yellow-700" };
  }

  return { score, label: "Zayıf şifre", bar: "bg-red-500", text: "text-red-700" };
}


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
    items: [
      "URL frontend üzerinden alınır.",
      "Backend tarafında analiz edilir.",
      "Sonuç ekranda kullanıcıya gösterilir.",
    ],
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
  const [authMode, setAuthMode] = useState<AuthMode>(null);
  const [pageView, setPageView] = useState<PageView>("home");
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [authNotice, setAuthNotice] = useState("");
  const [showRegisterPrompt, setShowRegisterPrompt] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isNewPasswordVisible, setIsNewPasswordVisible] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [scanHistory, setScanHistory] = useState<ScanHistoryItem[]>([]);

  function clearAuthFields() {
    setUserName("");
    setUserEmail("");
    setPassword("");
    setConfirmPassword("");
    setNewPassword("");
    setResetEmail("");
    setIsPasswordVisible(false);
    setIsNewPasswordVisible(false);
  }

  function openAuth(mode: Exclude<AuthMode, null>) {
    setAuthMode(mode);
    setPageView("home");
    setAuthNotice("");
    setShowRegisterPrompt(false);
    setIsProfileMenuOpen(false);

    if (mode === "profile") {
      setNewPassword("");
      setIsNewPasswordVisible(false);
      return;
    }

    clearAuthFields();
  }

  function handleAuthSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedEmail = userEmail.trim().toLowerCase();

    if (authMode === "forgot") {
      const userForReset = readStoredUser(resetEmail);

      if (!userForReset) {
        setAuthNotice("");
        setShowRegisterPrompt(true);
        setUserEmail(resetEmail.trim().toLowerCase());
        return;
      }

      setAuthNotice("Şifre sıfırlama kodu Gmail adresinize gönderildi. Backend hazır olduğunda bu işlem gerçek e-posta servisine bağlanacak.");
      return;
    }

    if (authMode === "profile") {
      if (!newPassword) {
        setAuthNotice("Lütfen yeni şifrenizi yazın.");
        return;
      }

      const currentUser = readStoredUser(userEmail);

      if (getPasswordStrength(newPassword).score < 50) {
        setAuthNotice("Yeni şifre güvenliği düşük. En az 8 karakter, büyük harf, sayı veya özel karakter kullanın.");
        return;
      }

      if (currentUser) {
        saveStoredUser({ ...currentUser, password: newPassword });
      }

      setPassword(newPassword);
      setNewPassword("");
      setAuthNotice("Şifreniz güncellendi.");
      return;
    }

    if (authMode === "register") {
      if (!userName.trim()) {
        setAuthNotice("Lütfen ad soyad bilginizi yazın.");
        return;
      }

      if (password !== confirmPassword) {
        setAuthNotice("Şifreler eşleşmiyor. Lütfen şifrenizi tekrar kontrol edin.");
        return;
      }

      if (getPasswordStrength(password).score < 50) {
        setAuthNotice("Şifre güvenliği düşük. En az 8 karakter, büyük harf, sayı veya özel karakter kullanın.");
        return;
      }

      if (readStoredUser(normalizedEmail)) {
        setAuthNotice("Bu Gmail adresiyle zaten kayıt olunmuş. Lütfen giriş yapın.");
        return;
      }

      saveStoredUser({ name: userName.trim(), email: normalizedEmail, password });
      setIsLoggedIn(true);
      setUserEmail(normalizedEmail);
      setAuthMode(null);
      setPageView("home");
      setPassword("");
      setConfirmPassword("");
      setNewPassword("");
      setResetEmail("");
      setAuthNotice("");
      return;
    }

    const storedUser = readStoredUser(normalizedEmail);

    if (!storedUser) {
      setAuthNotice("");
      setShowRegisterPrompt(true);
      return;
    }

    if (storedUser.password !== password) {
      setShowRegisterPrompt(false);
      setAuthNotice("Şifre yanlış. Lütfen tekrar deneyin.");
      return;
    }

    setIsLoggedIn(true);
    setUserName(storedUser.name);
    setUserEmail(storedUser.email);
    setAuthMode(null);
    setPageView("home");
    setPassword("");
    setConfirmPassword("");
    setNewPassword("");
    setResetEmail("");
    setAuthNotice("");
  }

  function handleLogout() {
    setIsLoggedIn(false);
    setIsProfileMenuOpen(false);
    setPageView("home");
    setAuthMode(null);
    clearAuthFields();
    setAuthNotice("");
    setShowRegisterPrompt(false);
  }

  function goToRegisterFromPrompt() {
    setShowRegisterPrompt(false);
    setAuthNotice("");
    setUserName("");
    setUserEmail("");
    setPassword("");
    setConfirmPassword("");
    setResetEmail("");
    setAuthMode("register");
  }

  function closeRegisterPrompt() {
    setShowRegisterPrompt(false);
    setAuthNotice("");
    setPassword("");
  }

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
      const nextResultView = getResultView(data);

      setResult(data);
      setStatus("success");
      setScanHistory((history) => [
        {
          url: data.url ?? trimmedUrl,
          variant: nextResultView.variant,
          label: nextResultView.title,
          date: new Date().toLocaleDateString("tr-TR"),
        },
        ...history,
      ]);
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
  const passwordStrength = getPasswordStrength(password);
  const newPasswordStrength = getPasswordStrength(newPassword);
  const resultView = useMemo(() => (result ? getResultView(result) : null), [result]);
  const resultClasses = resultView ? getResultClasses(resultView.variant) : null;

  const historyStats = useMemo(() => {
    const total = scanHistory.length;
    const danger = scanHistory.filter((item) => item.variant === "danger").length;
    const safe = scanHistory.filter((item) => item.variant === "safe").length;
    const neutral = scanHistory.filter((item) => item.variant === "neutral").length;
    const max = Math.max(total, danger, safe, neutral, 1);

    return { total, danger, safe, neutral, max };
  }, [scanHistory]);

  const dashboardBars = [
    { label: "Toplam", value: historyStats.total, className: "bg-black" },
    { label: "Zararlı", value: historyStats.danger, className: "bg-red-600" },
    { label: "Güvenli", value: historyStats.safe, className: "bg-green-600" },
    { label: "Beklemede", value: historyStats.neutral, className: "bg-zinc-500" },
  ];

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
        <nav className="flex items-center justify-between border-b border-black/10 pb-5">
          <button
            type="button"
            onClick={() => {
              setPageView("home");
              setAuthMode(null);
            }}
            className="text-left"
          >
            <p className="text-sm uppercase tracking-[0.35em] text-black/50">AI PHISHING DETECTOR</p>
            <h1 className="mt-2 text-2xl font-semibold">Web URL Tarama Paneli</h1>
            {(authMode || pageView !== "home") && (
              <span className="mt-4 inline-flex h-9 w-9 items-center justify-center rounded-full border border-black/15 text-xl leading-none transition hover:bg-black hover:text-white" aria-label="Ana sayfaya dön">
                ‹
              </span>
            )}
          </button>

          {isLoggedIn ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsProfileMenuOpen((isOpen) => !isOpen)}
                className="rounded-full border border-black bg-black px-5 py-2 text-sm font-medium text-white transition hover:bg-white hover:text-black"
              >
                Profilim
              </button>

              {isProfileMenuOpen && (
                <div className="absolute right-0 z-10 mt-3 w-48 rounded-2xl border border-black/10 bg-white p-2 shadow-xl">
                  <button
                    type="button"
                    onClick={() => {
                      openAuth("profile");
                      setIsProfileMenuOpen(false);
                    }}
                    className="w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-black hover:text-white"
                  >
                    Profilim
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPageView("history");
                      setAuthMode(null);
                      setIsProfileMenuOpen(false);
                    }}
                    className="w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-black hover:text-white"
                  >
                    Geçmişim
                  </button>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-black hover:text-white"
                  >
                    Çıkış yap
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => openAuth("login")}
                className="rounded-full border border-black bg-white px-5 py-2 text-sm font-medium text-black transition hover:bg-black hover:text-white"
              >
                Giriş Yap
              </button>
              <button
                type="button"
                onClick={() => openAuth("register")}
                className="rounded-full border border-black bg-black px-5 py-2 text-sm font-medium text-white transition hover:bg-white hover:text-black"
              >
                Kayıt Ol
              </button>
            </div>
          )}
        </nav>

        {authMode ? (
          <section className="flex flex-1 items-center justify-center py-12">
            <div className={`w-full ${authMode === "profile" ? "max-w-2xl" : "max-w-md"} rounded-[2rem] border border-black/10 bg-white p-8 shadow-2xl shadow-black/10`}>
              <h2 className="text-3xl font-semibold">
                {authMode === "login" && "Giriş Yap"}
                {authMode === "register" && "Kayıt Ol"}
                {authMode === "forgot" && "Şifremi Unuttum"}
                {authMode === "profile" && "Profilim"}
              </h2>
              {authMode !== "profile" && (
                <p className="mt-3 text-sm leading-6 text-black/60">
                  {authMode === "forgot"
                    ? "Gmail adresinizi girin; şifre sıfırlama kodu gönderme akışı backend hazır olduğunda aktifleşecek."
                    : authMode === "register"
                      ? "Kayıtlı değilseniz giriş yapmak için önce kayıt olunuz."
                      : "Hesabınıza giriş yaptıktan sonra profil menüsünden geçmiş taramalarınıza ve kişisel istatistiklerinize ulaşabilirsiniz."}
                </p>
              )}

              <form id="auth-form" key={authMode} onSubmit={handleAuthSubmit} autoComplete="off" className="mt-6 space-y-4">
                {authMode === "register" && (
                  <>
                    <label className="block text-sm font-medium" htmlFor="name">
                      Ad Soyad
                    </label>
                    <input
                      id="name"
                      name="full-name-field"
                      type="text"
                      autoComplete="off"
                      required
                      value={userName}
                      onChange={(event) => setUserName(event.target.value)}
                      placeholder="Adınız Soyadınız"
                      className="w-full rounded-2xl border border-black/15 px-4 py-4 text-sm outline-none transition placeholder:text-black/35 focus:border-black focus:ring-4 focus:ring-black/10"
                    />
                  </>
                )}

                {(authMode === "login" || authMode === "register") && (
                  <>
                    <label className="block text-sm font-medium" htmlFor="email">
                      Gmail
                    </label>
                    <input
                      id="email"
                      name="email-field"
                      type="email"
                      autoComplete="off"
                      required
                      value={userEmail}
                      onChange={(event) => setUserEmail(event.target.value)}
                      placeholder="ornek@gmail.com"
                      className="w-full rounded-2xl border border-black/15 px-4 py-4 text-sm outline-none transition placeholder:text-black/35 focus:border-black focus:ring-4 focus:ring-black/10"
                    />

                    <label className="block text-sm font-medium" htmlFor="password">
                      Şifre
                    </label>
                    <div className="relative">
                      <input
                        id="password"
                        name="password-field"
                        type={isPasswordVisible ? "text" : "password"}
                        autoComplete="new-password"
                        required
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="Şifrenizi yazın"
                        className="w-full rounded-2xl border border-black/15 px-4 py-4 pr-20 text-sm outline-none transition placeholder:text-black/35 focus:border-black focus:ring-4 focus:ring-black/10"
                      />
                      <button
                        type="button"
                        onClick={() => setIsPasswordVisible((isVisible) => !isVisible)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-black/60"
                        aria-label={isPasswordVisible ? "Şifreyi gizle" : "Şifreyi göster"}
                      >
                        {isPasswordVisible ? "Gizle" : "Göster"}
                      </button>
                    </div>
                  </>
                )}

                {authMode === "register" && (
                  <div className="space-y-4">
                    {password && (
                      <div>
                        <div className="h-2 overflow-hidden rounded-full bg-black/10">
                          <div className={`h-full rounded-full transition-all ${passwordStrength.bar}`} style={{ width: `${passwordStrength.score}%` }} />
                        </div>
                        <p className={`mt-2 text-xs ${passwordStrength.text}`}>{passwordStrength.label}</p>
                      </div>
                    )}

                    <label className="block text-sm font-medium" htmlFor="confirm-password">
                      Şifrenizi onaylayın
                    </label>
                    <input
                      id="confirm-password"
                      name="confirm-password-field"
                      type={isPasswordVisible ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      placeholder="Şifrenizi tekrar yazın"
                      className="w-full rounded-2xl border border-black/15 px-4 py-4 text-sm outline-none transition placeholder:text-black/35 focus:border-black focus:ring-4 focus:ring-black/10"
                    />
                  </div>
                )}

                {authMode === "forgot" && (
                  <>
                    <label className="block text-sm font-medium" htmlFor="reset-email">
                      Gmail
                    </label>
                    <input
                      id="reset-email"
                      name="reset-email-field"
                      type="email"
                      autoComplete="off"
                      required
                      value={resetEmail}
                      onChange={(event) => setResetEmail(event.target.value)}
                      placeholder="ornek@gmail.com"
                      className="w-full rounded-2xl border border-black/15 px-4 py-4 text-sm outline-none transition placeholder:text-black/35 focus:border-black focus:ring-4 focus:ring-black/10"
                    />
                  </>
                )}

                {authMode === "profile" && (
                  <div className="space-y-4">
                    <div className="rounded-3xl border border-black/10 bg-white p-5 text-black shadow-sm">
                      <p className="text-xs uppercase tracking-[0.25em] text-black/40">Profil bilgileri</p>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl border border-black/10 bg-black/[0.03] p-4">
                          <p className="text-xs text-black/45">Ad Soyad</p>
                          <p className="mt-1 text-base font-semibold">{userName || "Ad Soyad"}</p>
                        </div>
                        <div className="rounded-2xl border border-black/10 bg-black/[0.03] p-4">
                          <p className="text-xs text-black/45">E-posta</p>
                          <p className="mt-1 break-all text-base font-semibold">{userEmail || "ornek@gmail.com"}</p>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-3xl border border-black/10 bg-white p-5">
                      <p className="text-xs uppercase tracking-[0.25em] text-black/40">Şifre değiştirme</p>
                      <label className="mt-4 block text-sm font-medium" htmlFor="new-password">
                        Yeni şifre
                      </label>
                    <div className="relative">
                      <input
                        id="new-password"
                        name="new-password-field"
                        type={isNewPasswordVisible ? "text" : "password"}
                        autoComplete="new-password"
                        value={newPassword}
                        onChange={(event) => setNewPassword(event.target.value)}
                        placeholder="Yeni şifrenizi yazın"
                        className="w-full rounded-2xl border border-black/15 px-4 py-4 pr-20 text-sm outline-none transition placeholder:text-black/35 focus:border-black focus:ring-4 focus:ring-black/10"
                      />
                      <button
                        type="button"
                        onClick={() => setIsNewPasswordVisible((isVisible) => !isVisible)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-black/60"
                        aria-label={isNewPasswordVisible ? "Yeni şifreyi gizle" : "Yeni şifreyi göster"}
                      >
                        {isNewPasswordVisible ? "Gizle" : "Göster"}
                      </button>
                    </div>
                    {newPassword && (
                      <>
                        <div className="h-2 overflow-hidden rounded-full bg-black/10">
                          <div className={`h-full rounded-full transition-all ${newPasswordStrength.bar}`} style={{ width: `${newPasswordStrength.score}%` }} />
                        </div>
                        <p className={`text-xs ${newPasswordStrength.text}`}>{newPasswordStrength.label}</p>
                      </>
                    )}
                    </div>
                  </div>
                )}

                <button type="submit" className="w-full rounded-2xl bg-black px-5 py-4 font-semibold text-white transition hover:bg-black/80">
                  {authMode === "forgot" ? "Gmail'e kod gönder" : authMode === "profile" ? "Şifreyi değiştir" : authMode === "register" ? "Kayıt Ol" : "Giriş Yap"}
                </button>
              </form>

              {authMode === "login" && (
                <button
                  type="button"
                  onClick={() => openAuth("forgot")}
                  className="mt-4 text-sm font-medium text-black underline underline-offset-4"
                >
                  Şifremi unuttum
                </button>
              )}

              {showRegisterPrompt && (
                <div aria-live="assertive" className="mt-4 rounded-2xl border border-black/10 bg-black/[0.04] p-4 text-sm leading-6 text-black/75">
                  <p className="font-medium text-black">Lütfen önce kayıt olunuz.</p>
                  <p className="mt-1 text-xs text-black/60">Bu Gmail adresiyle kayıtlı kullanıcı bulunamadı.</p>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={goToRegisterFromPrompt}
                      className="rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white transition hover:bg-black/80"
                    >
                      Kayıt ol
                    </button>
                    <button
                      type="button"
                      onClick={closeRegisterPrompt}
                      className="rounded-xl border border-black/15 bg-white px-4 py-3 text-sm font-semibold text-black transition hover:bg-black hover:text-white"
                    >
                      Vazgeç
                    </button>
                  </div>
                </div>
              )}

              {authNotice && (
                <p aria-live="polite" className="mt-4 rounded-2xl bg-black/[0.04] px-4 py-3 text-xs leading-5 text-black/65">
                  {authNotice}
                </p>
              )}
            </div>
          </section>
        ) : pageView === "history" ? (
          <section className="flex-1 py-10">
            <div className="mb-8">
              <p className="text-xs uppercase tracking-[0.3em] text-black/40">Kişisel dashboard</p>
              <h2 className="mt-3 text-4xl font-semibold">Geçmiş taramalarım</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-black/60">
                Bu alan giriş yapan kullanıcının geçmiş URL analizlerini ve zararlı/güvenli dağılımını gösterir.
              </p>
            </div>

            <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
              <section className="rounded-[2rem] border border-black/10 bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-semibold">Tarama grafiği</h3>
                    <p className="mt-2 text-sm text-black/55">URL tarama sonuçlarının sütun grafiği görünümü.</p>
                  </div>
                  <span className="rounded-full bg-black px-3 py-1 text-xs font-semibold text-white">{historyStats.total} toplam</span>
                </div>

                <div className="mt-7 rounded-3xl border border-black/10 bg-black/[0.02] p-5">
                  <div className="flex h-56 items-end gap-4 border-b border-l border-black/15 px-3 pb-3">
                    {dashboardBars.map((bar) => {
                      const barHeight = bar.value === 0 ? 8 : Math.max((bar.value / historyStats.max) * 100, 12);

                      return (
                        <div key={bar.label} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                          <span className="text-sm font-semibold text-black">{bar.value}</span>
                          <div className="flex h-40 w-full items-end justify-center">
                            <div
                              className={`w-full max-w-14 rounded-t-2xl ${bar.className} shadow-sm transition-all`}
                              style={{ height: `${barHeight}%` }}
                              aria-label={`${bar.label}: ${bar.value}`}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-3 grid grid-cols-4 gap-4 px-3 text-center text-xs font-medium text-black/60">
                    {dashboardBars.map((bar) => (
                      <span key={bar.label}>{bar.label}</span>
                    ))}
                  </div>
                </div>
              </section>

              <section className="rounded-[2rem] border border-black/10 bg-white p-6 shadow-sm">
                <h3 className="text-xl font-semibold">Son taramalar</h3>
                {scanHistory.length ? (
                  <div className="mt-5 space-y-3">
                    {scanHistory.map((item) => (
                      <article key={`${item.url}-${item.date}`} className="rounded-2xl border border-black/10 p-4">
                        <div className="flex items-center justify-between gap-4">
                          <p className="break-all text-sm font-medium">{item.url}</p>
                          <span
                            className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold text-white ${
                              item.variant === "danger" ? "bg-red-600" : item.variant === "safe" ? "bg-green-600" : "bg-black"
                            }`}
                          >
                            {item.label}
                          </span>
                        </div>
                        <p className="mt-2 text-xs text-black/50">{item.date}</p>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="mt-5 rounded-2xl bg-black/[0.04] p-4 text-sm text-black/60">
                    Henüz kayıtlı tarama yok. Ana ekrandan URL taradığınızda sonuçlar burada listelenecek.
                  </p>
                )}
              </section>
            </div>
          </section>
        ) : (
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
                <div className="mb-6 flex items-center justify-between">
                  <h3 className="text-2xl font-semibold">URL Analizi</h3>
                  <span className="rounded-full border border-black/15 px-3 py-1 text-xs font-medium">API</span>
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
                  <button
                    type="submit"
                    disabled={status === "loading"}
                    className="w-full rounded-2xl bg-black px-5 py-4 font-semibold text-white transition hover:bg-black/80 disabled:cursor-not-allowed disabled:bg-black/50"
                  >
                    {status === "loading" ? "Taranıyor..." : "Bağlantıyı Tara"}
                  </button>
                </form>

                {status === "error" && (
                  <section id="scan-error" aria-live="assertive" className="mt-6 rounded-3xl border border-red-200 bg-red-50 p-5">
                    <p className="text-sm text-red-700">Bağlantı hatası</p>
                    <h4 className="mt-1 text-xl font-semibold text-red-950">Sonuç alınamadı</h4>
                    <p className="mt-3 text-sm leading-6 text-red-800">{error}</p>
                  </section>
                )}

                {status === "success" && result && resultView && resultClasses && (
                  <section aria-live="polite" className={`mt-6 rounded-3xl border p-5 ${resultClasses.section}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className={`text-sm ${resultClasses.subText}`}>Analiz sonucu</p>
                        <h4 className={`mt-1 text-2xl font-semibold ${resultClasses.text}`}>{resultView.title}</h4>
                      </div>
                      <div className={`rounded-full px-4 py-2 text-sm font-bold ${resultClasses.badge}`}>{resultView.badge}</div>
                    </div>

                    <p className={`mt-4 text-sm leading-6 ${resultClasses.subText}`}>{resultView.description}</p>

                    <div className="mt-5 rounded-2xl bg-white/70 px-4 py-3 text-sm">
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
        )}
      </section>
    </main>
  );
}









