import os
import time
import math
import ipaddress
import unicodedata
import difflib
from urllib.parse import urlparse, parse_qsl
from collections import Counter

import pandas as pd
import tldextract
import joblib
import uvicorn
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

# =====================================================================
# 1. SABİTLER VE AYARLAR
# =====================================================================

# Modelin şüphecilik seviyesi (0.0 - 1.0). 0.50 standarttır. 
# Siber güvenlik için 0.30 önerilir (Düşük baraj = Yüksek Güvenlik)
PHISHING_THRESHOLD = 0.30

# Özellik Çıkarım Listeleri (Arkadaşının tanımladığı sabitler)
TRUSTED_TLDS = {
    "com", "net", "org", "gov", "edu", "mil", "co", "io",
    "me", "tv", "info", "biz", "tr", "uk", "de", "fr", "us"
}

POPULAR_BRANDS = {
    "google", "paypal", "netflix", "microsoft", "apple", "amazon",
    "facebook", "instagram", "twitter", "linkedin", "yahoo", "live",
    "outlook", "dropbox", "github", "steam", "spotify", "binance",
    "coinbase", "americanexpress"
}

SHORTENERS = {
    "bit.ly", "tinyurl.com", "t.co", "rebrand.ly", "is.gd", "goo.gl",
    "bit.do", "lnkd.in", "db.tt", "qr.ae", "adf.ly", "ow.ly", "ity.im",
    "q.gs", "po.st", "bc.vc", "twitthis.com", "u.to", "j.mp", "buzurl.com",
    "cutt.us", "u.bb", "yourls.org", "x.co", "prettylinkpro.com", "scrnch.me",
    "filoops.info", "short.to", "moourl.com", "1url.com", "urlx.org",
    "tr.im", "link.zip.net", "qrco.de", "ead.me"
}

SUSPICIOUS_WORDS = {
    'login', 'verify', 'secure', 'signin', 'bank', 'account',
    'update', 'free', 'bonus', 'ebayisapi', 'webscr', 'pay',
    'confirm', 'live', 'office', 'service', 'portal', 'submit',
    'recover', 'validation', 'alert', 'safe'
}


# =====================================================================
# 2. ÖZELLİK ÇIKARIM FONKSİYONLARI (Feature Extraction)
# =====================================================================
# Not: Arkadaşının orijinal mantığına sadık kalınarak mimari düzeltmeler yapıldı.

def calculate_entropy(text: str) -> float:
    if not text:
        return 0.0
    probabilities = [count / len(text) for count in Counter(text).values()]
    return -sum(p * math.log2(p) for p in probabilities)


def count_suspicious_words(url: str) -> int:
    url_lower = url.lower()
    return sum(url_lower.count(word) for word in SUSPICIOUS_WORDS)


def count_special_chars(url: str) -> int:
    special_chars = "-_%@=~#&$+;!*(),^|{}[]"
    return sum(1 for char in url if char in special_chars)


def count_digits(url: str) -> int:
    return sum(1 for char in url if char.isdigit())


def clean_url(url: str) -> str:
    url = url.strip()
    if not url.lower().startswith(('http://', 'https://')):
        url = 'http://' + url

    # Veri standardizasyonu (Sızıntı Önleme)
    url = url.replace("://www.", "://").replace("://WWW.", "://")
    return url


def max_consecutive_chars(text: str) -> int:
    if not text:
        return 0
    max_count = 1
    current_count = 1
    for i in range(1, len(text)):
        if text[i] == text[i - 1]:
            current_count += 1
            if current_count > max_count:
                max_count = current_count
        else:
            current_count = 1
    return max_count


def is_ip_address(hostname: str) -> int:
    if not hostname:
        return 0
    host = hostname.split(':')[0]
    try:
        ipaddress.ip_address(host)
        return 1
    except ValueError:
        return 0


def normalize_text(text: str) -> str:
    if not text:
        return ""
    return "".join(
        c for c in unicodedata.normalize('NFD', text)
        if unicodedata.category(c) != 'Mn'
    )


def check_brand_spoofing(url: str, domain: str) -> int:
    url_lower = url.lower()
    domain_lower = domain.lower() if domain else ""

    normalized_domain = normalize_text(domain_lower)
    normalized_url = normalize_text(url_lower)

    homoglyphs = {'0': 'o', '1': 'l', '3': 'e', '4': 'a', '5': 's', '8': 'b', '9': 'g'}
    for char, replacement in homoglyphs.items():
        normalized_domain = normalized_domain.replace(char, replacement)
        normalized_url = normalized_url.replace(char, replacement)

    for brand in POPULAR_BRANDS:
        if brand in normalized_url or brand in normalized_domain:
            if domain_lower != brand:
                return 1
        similarity = difflib.SequenceMatcher(None, normalized_domain, brand).ratio()
        if 0.80 <= similarity < 1.0:
            return 1
    return 0


def extract_features(url: str) -> dict:
    default_features = {
        'url_uzunlugu': 0, 'alan_adi_uzunlugu': 0, 'ip_adresi_var_mi': 0,
        'nokta_sayisi': 0, 'tire_sayisi': 0, 'et_isareti_sayisi': 0,
        'soru_isareti_sayisi': 0, 'esittir_sayisi': 0, 'alt_dizin_sayisi': 0,
        'https_var_mi': 0, 'alt_alan_adi_sayisi': 0, 'marka_taklidi_var_mi': 0,
        'supheli_tld_var_mi': 0, 'kisaltma_servisi_mi': 0, 'alan_adinda_tire_var_mi': 0,
        'alan_adinda_http_var_mi': 0, 'parametre_sayisi': 0, 'supheli_kelime_sayisi': 0,
        'alan_adi_uzantisi': '', 'ozel_karakter_sayisi': 0, 'rakam_sayisi': 0,
        'ardisik_karakter_sayisi': 0, 'entropi': 0.0
    }

    if not url:
        return default_features

    try:
        cleaned_url = clean_url(url)
        parsed_url = urlparse(cleaned_url)
        hostname = parsed_url.hostname or ""

        extracted = tldextract.extract(cleaned_url)
        domain = extracted.domain
        subdomain = extracted.subdomain
        suffix = extracted.suffix

        url_path = parsed_url.path + parsed_url.query

        return {
            'url_uzunlugu': len(cleaned_url),
            'alan_adi_uzunlugu': len(hostname),
            'ip_adresi_var_mi': is_ip_address(hostname),
            'nokta_sayisi': cleaned_url.count('.'),
            'tire_sayisi': cleaned_url.count('-'),
            'et_isareti_sayisi': cleaned_url.count('@'),
            'soru_isareti_sayisi': cleaned_url.count('?'),
            'esittir_sayisi': cleaned_url.count('='),
            'alt_dizin_sayisi': url_path.count('/'),
            'https_var_mi': 1 if cleaned_url.lower().startswith('https://') else 0,
            'alt_alan_adi_sayisi': len(subdomain.split('.')) if subdomain else 0,
            'marka_taklidi_var_mi': check_brand_spoofing(cleaned_url, domain),
            'supheli_tld_var_mi': 0 if suffix.lower() in TRUSTED_TLDS else 1,
            'kisaltma_servisi_mi': 1 if f"{domain}.{suffix}".lower() in SHORTENERS else 0,
            'alan_adinda_tire_var_mi': 1 if "-" in domain else 0,
            'alan_adinda_http_var_mi': 1 if "http" in hostname.lower() or "https" in hostname.lower() else 0,
            'parametre_sayisi': len(parse_qsl(parsed_url.query)),
            'supheli_kelime_sayisi': count_suspicious_words(cleaned_url),
            'alan_adi_uzantisi': suffix.lower() if suffix else "",
            'ozel_karakter_sayisi': count_special_chars(cleaned_url),
            'rakam_sayisi': count_digits(cleaned_url),
            'ardisik_karakter_sayisi': max_consecutive_chars(hostname),
            'entropi': calculate_entropy(cleaned_url)
        }
    except Exception:
        return default_features


# =====================================================================
# 3. FASTAPI UYGULAMASI VE MODEL YÜKLEME
# =====================================================================

app = FastAPI(title="Phishing Detection API", description="Yapay Zeka Destekli Oltalama Tespiti")

print("Yapay Zeka Modeli Yükleniyor...")
try:
    model = joblib.load("phishing_detection_model.pkl")
    print("Model Başarıyla Yüklendi! 🚀")
except Exception as e:
    print(f"HATA: Model yüklenemedi! Lütfen 'phishing_detection_model.pkl' dosyasını kontrol edin. Detay: {e}")
    model = None


class URLInput(BaseModel):
    url: str


@app.post("/predict")
def predict_phishing(data: URLInput):
    if model is None:
        raise HTTPException(status_code=500, detail="Sunucu Hatası: Yapay zeka modeli aktif değil.")

    try:
        target_url = data.url

        # 1. Özellikleri Çıkar
        features_dict = extract_features(target_url)
        df = pd.DataFrame([features_dict])

        # 2. Modelin ezber yapmasını engellemek için sildiğimiz özellikleri (Data Leakage) API'de de siliyoruz
        drop_columns = [
            'alt_dizin_sayisi', 'alt_alan_adi_sayisi',
            'https_var_mi', 'kisaltma_servisi_mi',
            'url_uzunlugu', 'alan_adi_uzunlugu', 'alan_adi_uzantisi'
        ]
        df_for_model = df.drop(columns=[col for col in drop_columns if col in df.columns])

        # 3. Modele Sor (Predict Proba)
        probabilities = model.predict_proba(df_for_model)[0]
        phishing_prob = probabilities[1]

        # 4. Karar Mekanizması (Eşik Değeri)
        is_phishing = bool(phishing_prob >= PHISHING_THRESHOLD)
        confidence = float(phishing_prob if is_phishing else probabilities[0])

        return {
            "url": target_url,
            "is_phishing": is_phishing,
            "confidence_score": round(confidence, 4),
            "phishing_probability": round(phishing_prob, 4),
            "threshold_used": PHISHING_THRESHOLD,
            "features_analyzed": features_dict
        }

    except Exception as e:
        # Sunucunun çökmesini engellemek için Hata Yönetimi
        raise HTTPException(status_code=500, detail=f"İşlem sırasında beklenmeyen bir hata oluştu: {str(e)}")


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)