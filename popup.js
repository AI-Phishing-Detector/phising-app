const BACKEND_API_URL = "https://phishing-detector-backend-production.up.railway.app/api/v1/scan-url";

// Popup açıldığında aktif sekmenin durumunu sorgula
document.addEventListener("DOMContentLoaded", () => {
  const statusBox = document.getElementById("statusBox");
  const shieldToggle = document.getElementById("shieldToggle");

  // Kalkan durumunu yerel depolamadan yükle
  chrome.storage.local.get(["shieldActive"], (res) => {
    const isShieldActive = res.shieldActive !== false; // varsayılan true
    shieldToggle.checked = isShieldActive;

    if (!isShieldActive) {
      renderNeutralStatus(statusBox, "Kalkan Devre Dışı", "Oltalama koruması kapatıldı.");
      return;
    }

    // Kalkan aktifse sekme durumunu sorgula
    loadCurrentTabStatus(statusBox);
  });

  // Kalkan butonu değiştiğinde kaydet ve durumu güncelle
  shieldToggle.addEventListener("change", (e) => {
    const isActive = e.target.checked;
    chrome.storage.local.set({ shieldActive: isActive }, () => {
      if (isActive) {
        loadCurrentTabStatus(statusBox);
      } else {
        renderNeutralStatus(statusBox, "Kalkan Devre Dışı", "Oltalama koruması kapatıldı.");
      }
    });
  });
});

// Aktif sekme analizini background.js'ten sorgulayan yardımcı fonksiyon
function loadCurrentTabStatus(statusBox) {
  statusBox.innerHTML = `
    <div class="status-loading">
      <div class="spinner"></div>
      <p>Sayfa durumu kontrol ediliyor...</p>
    </div>
  `;

  chrome.runtime.sendMessage({ action: "getCurrentTabScan" }, (response) => {
    if (!response || response.error) {
      renderNeutralStatus(statusBox, "Sistem Sayfası", "Tarama aktif değil.");
      return;
    }

    const { result } = response;
    if (!result) {
      renderNeutralStatus(statusBox, "Tarama Gerekli Değil", "Bu adres güvenlik taramasından muaf tutuluyor.");
      return;
    }

    renderScanStatus(statusBox, result);
  });
}

// Arayüzde nötr (muaf/sistem) durumunu çiz
function renderNeutralStatus(container, title, description) {
  container.innerHTML = `
    <div class="status-card status-neutral">
      <div class="status-icon">🛡️</div>
      <div class="status-title">${title}</div>
      <div class="status-score" style="font-size: 11px; text-align: center;">${description}</div>
    </div>
  `;
}

// Arayüzde API tarama sonucunu çiz
function renderScanStatus(container, data) {
  const isDangerous = data.verdict === "dangerous";
  const icon = isDangerous ? "🚨" : "✅";
  const statusClass = isDangerous ? "status-danger" : "status-safe";
  const title = isDangerous ? "Şüpheli / Zararlı URL!" : "Güvenli Bağlantı";
  const scoreText = `%${data.riskScore.toFixed(2)} Risk`;

  container.innerHTML = `
    <div class="status-card ${statusClass}">
      <div class="status-icon">${icon}</div>
      <div class="status-title">${title}</div>
      <div class="status-score">${scoreText}</div>
    </div>
  `;
}

// Manuel URL Sorgulama Düğmesi
document.getElementById("btnScan").addEventListener("click", async () => {
  const inputUrl = document.getElementById("manualUrl").value.trim();
  const manualResult = document.getElementById("manualResult");
  const btnScan = document.getElementById("btnScan");

  if (!inputUrl) {
    showManualResult(manualResult, "Lütfen bir URL adresi girin.", "danger");
    return;
  }

  // URL şeması yoksa otomatik http:// ekle
  let formattedUrl = inputUrl;
  if (!inputUrl.startsWith("http://") && !inputUrl.startsWith("https://")) {
    formattedUrl = "http://" + inputUrl;
  }

  try {
    new URL(formattedUrl);
  } catch (e) {
    showManualResult(manualResult, "Geçersiz URL formatı yazdınız.", "danger");
    return;
  }

  // Yükleniyor durumunu göster
  btnScan.disabled = true;
  btnScan.textContent = "Taranıyor...";
  manualResult.classList.add("hidden");

  try {
    const response = await fetch(BACKEND_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: formattedUrl })
    });

    if (!response.ok) {
      throw new Error(`Sunucu Hatası: ${response.status}`);
    }

    const data = await response.json();
    const isDangerous = data.verdict === "dangerous";
    const resultText = isDangerous 
      ? `🚨 ŞÜPHELİ SİTE (Risk: %${data.riskScore.toFixed(2)})`
      : `✅ GÜVENLİ SİTE (Risk: %${data.riskScore.toFixed(2)})`;
    
    showManualResult(manualResult, resultText, isDangerous ? "danger" : "success");
  } catch (error) {
    showManualResult(manualResult, `Bağlantı hatası: Sunucuya ulaşılamadı.`, "danger");
  } finally {
    btnScan.disabled = false;
    btnScan.textContent = "Analiz Et";
  }
});

// Arama sonucunu pop-up içinde gösteren yardımcı fonksiyon
function showManualResult(element, text, type) {
  element.textContent = text;
  element.className = `manual-result ${type}`;
  element.classList.remove("hidden");
}
