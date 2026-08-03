const BACKEND_API_URL = "https://phishing-detector-backend-production.up.railway.app/api/v1/scan-url";

// Taramadan muaf tutulacak güvenli veya yerel adresler
const EXCLUDED_DOMAINS = [
  "localhost",
  "127.0.0.1",
  "chrome-extension",
  "chrome",
  "phishing-detector-backend-production.up.railway.app",
  "phishing-tespit.vercel.app",
  "vercel.app",
  "railway.app"
];

// Ziyaret edilen sitenin taranıp taranmayacağını kontrol eder
function shouldScan(urlStr) {
  if (!urlStr) return false;
  try {
    const url = new URL(urlStr);
    // Sadece HTTP ve HTTPS protokollerini tara
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return false;
    }
    // Muaf tutulan alan adlarını kontrol et
    return !EXCLUDED_DOMAINS.some(domain => url.hostname.includes(domain));
  } catch (e) {
    return false;
  }
}

// Bir alan adının beyaz listede (whitelist) olup olmadığını kontrol eder
async function isWhitelisted(hostname) {
  return new Promise((resolve) => {
    chrome.storage.local.get(["whitelist"], (result) => {
      const whitelist = result.whitelist || [];
      resolve(whitelist.includes(hostname));
    });
  });
}

// Ziyaret edilmek istenen sayfaları tarar
chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  // Sadece ana penceredeki (frameId === 0) yönlendirmeleri denetle
  if (details.frameId !== 0) return;

  // Kalkanın aktif olup olmadığını kontrol et
  const isShieldActive = await new Promise((resolve) => {
    chrome.storage.local.get(["shieldActive"], (res) => {
      resolve(res.shieldActive !== false); // varsayılan true
    });
  });

  if (!isShieldActive) {
    console.log("[Shield] Kalkan devre dışı, tarama pas geçildi.");
    return;
  }

  const url = details.url;
  if (!shouldScan(url)) return;

  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname;

    // Eğer site beyaz listedeyse geçişe izin ver
    const whitelisted = await isWhitelisted(hostname);
    if (whitelisted) {
      console.log(`[Shield] ${hostname} beyaz listede, geçişe izin verildi.`);
      return;
    }

    // Backend API'ye tarama isteği gönder
    const response = await fetch(BACKEND_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: url })
    });

    if (!response.ok) {
      console.warn(`[Shield] API isteği başarısız oldu. Durum: ${response.status}`);
      return;
    }

    const result = await response.json();
    console.log(`[Shield] Analiz sonucu:`, result);

    // Sonucu popup'ın okuyabilmesi için depolamaya kaydet
    chrome.storage.local.set({ [hostname]: result });

    // Eğer sonuç tehlikeli ise engelle ve uyarı ekranına yönlendir
    if (result.verdict === "dangerous") {
      const warningUrl = chrome.runtime.getURL(
        `warning.html?url=${encodeURIComponent(url)}&risk=${result.riskScore}&entropy=${result.details.entropy}`
      );
      chrome.tabs.update(details.tabId, { url: warningUrl });
    }
  } catch (error) {
    console.error("[Shield] Tarama sırasında bir hata oluştu:", error);
  }
});

// Sekme değiştiğinde popup'ın güncel veriyi okuması için tetikleyici mesaj dinleyici
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "getCurrentTabScan") {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (tabs.length === 0) {
        sendResponse({ error: "Sekme bulunamadı" });
        return;
      }
      try {
        const url = tabs[0].url;
        const parsedUrl = new URL(url);
        const hostname = parsedUrl.hostname;

        chrome.storage.local.get([hostname], (result) => {
          sendResponse({ result: result[hostname] || null, url: url });
        });
      } catch (e) {
        sendResponse({ error: "Geçersiz URL" });
      }
    });
    return true; // Asenkron yanıt için true döndürülmeli
  }
});
