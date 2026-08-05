import math
import ipaddress
import unicodedata
import difflib
from pathlib import Path
from typing import Any
from collections import Counter
from urllib.parse import urlparse, parse_qsl

import joblib
import pandas as pd
import tldextract

BASE_DIR = Path(__file__).resolve().parent
MODEL_DIR = BASE_DIR / "model_artifacts"
MODEL_PATH = MODEL_DIR / "phishing_detection_model.pkl"
TLD_EXTRACTOR = tldextract.TLDExtract(cache_dir=None, suffix_list_urls=())

PHISHING_CLASS = 1
SAFE_CLASS = 0
PHISHING_THRESHOLD = 0.50

EXCLUDED_FEATURE_COLUMNS = {
    "alt_dizin_sayisi",
    "alt_alan_adi_sayisi",
    "https_var_mi",
    "kisaltma_servisi_mi",
    "url_uzunlugu",
    "alan_adi_uzunlugu",
    "alan_adi_uzantisi",
    "soru_isareti_sayisi",
    "esittir_sayisi",
}

TRUSTED_TLDS = {
    "com", "net", "org", "gov", "edu", "mil", "co", "io",
    "me", "tv", "info", "biz", "tr", "uk", "de", "fr", "us",
    "com.tr", "co.uk", "com.au"
}

POPULAR_BRANDS = {
    "google", "paypal", "netflix", "microsoft", "apple", "amazon",
    "facebook", "instagram", "twitter", "linkedin", "yahoo", "live",
    "outlook", "dropbox", "github", "steam", "spotify", "binance",
    "coinbase", "americanexpress", "youtube", "tiktok", "whatsapp",
    "trendyol", "hepsiburada", "turkiye"
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

def clean_url(url: str) -> str:
    url = url.strip()
    if not url.lower().startswith(('http://', 'https://')):
        url = 'http://' + url
    return url.replace("://www.", "://").replace("://WWW.", "://")

def calculate_entropy(text: str) -> float:
    if not text:
        return 0.0
    probabilities = [count / len(text) for count in Counter(text).values()]
    return -sum(p * math.log2(p) for p in probabilities)

def count_suspicious_words(url: str) -> int:
    url_lower = url.lower()
    return sum(url_lower.count(word) for word in SUSPICIOUS_WORDS)

def count_special_chars(url: str) -> int:
    parsed = urlparse(url)
    lexical_target = f"{parsed.hostname or ''}{parsed.path}{parsed.fragment}"
    special_chars = "-_%@~#$;!*(),^|{}[]"
    return sum(1 for char in lexical_target if char in special_chars)

def count_digits(url: str) -> int:
    return sum(1 for char in url if char.isdigit())

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

    host = hostname.strip("[]")
    if ":" in host and host.count(":") <= 1:
        host = host.split(':')[0]

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
        if 0.70 <= similarity < 1.0:
            return 1
    return 0

def extract_features(url: str) -> dict[str, Any]:
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

    if not url or not str(url).strip():
        return default_features

    try:
        cleaned_url = clean_url(url)
        parsed_url = urlparse(cleaned_url)
        hostname = parsed_url.hostname or ""

        extracted = TLD_EXTRACTOR(cleaned_url)
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


def load_artifact(path: Path) -> Any:
    if not path.is_file():
        raise RuntimeError(f"Model dosyası bulunamadı: {path.name}")
    try:
        return joblib.load(path)
    except Exception as error:
        raise RuntimeError(f"Model dosyası yüklenemedi: {path.name}") from error


model = load_artifact(MODEL_PATH)


def analyze_url(url: str) -> dict[str, Any]:
    raw_features = extract_features(url)
    model_features = dict(raw_features)

    for column in EXCLUDED_FEATURE_COLUMNS:
        model_features.pop(column, None)

    feature_frame = pd.DataFrame([model_features])
    probabilities = model.predict_proba(feature_frame)[0]

    probability_by_class = {
        int(class_name): float(probability)
        for class_name, probability in zip(model.classes_, probabilities)
    }

    raw_phishing_probability = probability_by_class.get(PHISHING_CLASS, 0.0) * 100

    # Modelin eğitim kümesindeki barındırma-platformu yanlılığını dengele:
    # yalnızca sade kök alan adlarında birebir marka eşleşmesini güvenli kabul et;
    # marka yazım taklitlerini ise yüksek güvenli phishing sinyali olarak uygula.
    cleaned_url = clean_url(url)
    extracted = TLD_EXTRACTOR(cleaned_url)
    normalized_domain = normalize_text(extracted.domain.lower())
    is_plain_trusted_brand = (
        normalized_domain in POPULAR_BRANDS
        and extracted.suffix.lower() in TRUSTED_TLDS
        and not extracted.subdomain
        and raw_features.get("alan_adinda_tire_var_mi", 0) == 0
        and raw_features.get("supheli_kelime_sayisi", 0) == 0
    )

    calibration = "none"
    calibrated_probability = raw_phishing_probability
    if is_plain_trusted_brand:
        calibrated_probability = min(calibrated_probability, 5.0)
        calibration = "trusted_brand_root"
    elif raw_features.get("marka_taklidi_var_mi", 0) == 1:
        calibrated_probability = max(calibrated_probability, 95.0)
        calibration = "brand_spoof"

    phishing_probability = round(calibrated_probability, 2)
    safe_probability = round(100.0 - phishing_probability, 2)

    is_phishing = phishing_probability >= (PHISHING_THRESHOLD * 100)

    return {
        "verdict": "dangerous" if is_phishing else "safe",
        "riskScore": phishing_probability,
        "title": "Şüpheli bağlantı" if is_phishing else "Güvenli bağlantı",
        "message": (
            "Bu bağlantıda oltalama saldırısıyla ilişkili olabilecek şüpheli özellikler bulundu."
            if is_phishing
            else "Bu bağlantıda model tarafından belirlenen yüksek riskli bir işarete rastlanmadı."
        ),
        "details": {
            "phishingProbability": phishing_probability,
            "safeProbability": safe_probability,
            "rawModelPhishingProbability": round(raw_phishing_probability, 2),
            "calibration": calibration,
            "entropy": round(float(raw_features.get("entropi", 0)), 3),
        },
        "features": raw_features,
    }
