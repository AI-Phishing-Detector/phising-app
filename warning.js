// URL'den parametreleri ayıkla (url, risk, entropy)
const params = new URLSearchParams(window.location.search);
const blockedUrl = params.get("url") || "http://unknown-url.com";
const riskScore = params.get("risk") || "0";
const entropy = params.get("entropy") || "0";

// HTML elemanlarını güncelle
document.getElementById("blockedUrl").textContent = blockedUrl;
document.getElementById("riskScore").textContent = `%${parseFloat(riskScore).toFixed(2)} Risk Skoru`;

// Sayfa yüklenir yüklenmez yerleşik tarayıcı uyarısı (confirm alert) göster
window.addEventListener("DOMContentLoaded", () => {
  // Çok kısa gecikmeyle (sayfa render olabilsin diye) alert tetikle
  setTimeout(() => {
    const message = `🛡️ AI Phishing Shield Engellemesi!\n\nZiyaret etmek istediğiniz site oltalama (phishing) tehlikesi içermektedir.\n\nRisk Skoru: %${parseFloat(riskScore).toFixed(2)}\nAdres: ${blockedUrl}\n\nYine de devam etmek istiyor musunuz?`;
    
    const proceed = confirm(message);
    if (proceed) {
      handleProceed();
    } else {
      handleSafety();
    }
  }, 150);
});

// Güvenli bölgeye yönlendiren fonksiyon
function handleSafety() {
  if (window.history.length > 2) {
    window.history.go(-2); // Yönlendirmeden önceki sayfaya geri git
  } else {
    window.location.href = "https://www.google.com";
  }
}

// Whitelist'e ekleyip geçişe izin veren fonksiyon
function handleProceed() {
  try {
    const urlObj = new URL(blockedUrl);
    const hostname = urlObj.hostname;

    chrome.storage.local.get(["whitelist"], (result) => {
      const whitelist = result.whitelist || [];
      if (!whitelist.includes(hostname)) {
        whitelist.push(hostname);
      }
      
      chrome.storage.local.set({ whitelist: whitelist }, () => {
        window.location.href = blockedUrl;
      });
    });
  } catch (e) {
    window.location.href = blockedUrl;
  }
}

// Arayüzdeki butonlara tıklanırsa çalışacak yedek tetikleyiciler
document.getElementById("btnSafety").addEventListener("click", handleSafety);
document.getElementById("btnProceed").addEventListener("click", handleProceed);
