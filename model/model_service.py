import difflib
import ipaddress
import math
import os
import unicodedata
from collections import Counter
from functools import lru_cache
from pathlib import Path
from typing import Any
from urllib.parse import parse_qsl, urlparse

import joblib
import pandas as pd
import tldextract
from dotenv import load_dotenv


# Ortam değişkenlerini .env dosyasından yükler.
load_dotenv()


BASE_DIR = Path(__file__).resolve().parent
MODEL_DIR = BASE_DIR / "model_artifacts"
MODEL_PATH = MODEL_DIR / "phishing_detection_model.pkl"

PHISHING_CLASS = 1
SAFE_CLASS = 0


def get_phishing_threshold() -> float:
    """
    Model sonucunun zararlı sayılacağı sınırı ortam değişkeninden alır.

    Örnek:
    PHISHING_THRESHOLD=0.30
    """

    raw_threshold = os.getenv("PHISHING_THRESHOLD", "0.50")

    try:
        threshold = float(raw_threshold)
    except ValueError as error:
        raise RuntimeError(
            "PHISHING_THRESHOLD sayısal bir değer olmalıdır."
        ) from error

    if not 0.0 <= threshold <= 1.0:
        raise RuntimeError(
            "PHISHING_THRESHOLD 0 ile 1 arasında olmalıdır."
        )

    return threshold


PHISHING_THRESHOLD = get_phishing_threshold()


# Modelin eğitiminde kullanılmayan alanlar.
EXCLUDED_FEATURE_COLUMNS = {
    "alt_dizin_sayisi",
    "alt_alan_adi_sayisi",
    "https_var_mi",
    "kisaltma_servisi_mi",
    "url_uzunlugu",
    "alan_adi_uzunlugu",
    "alan_adi_uzantisi",
}


TRUSTED_TLDS = {
    "com", "net", "org", "gov", "edu", "mil", "co", "io",
    "me", "tv", "info", "biz", "tr", "uk", "de", "fr", "us",
}


POPULAR_BRANDS = {
    "google", "paypal", "netflix", "microsoft", "apple", "amazon",
    "facebook", "instagram", "twitter", "linkedin", "yahoo", "live",
    "outlook", "dropbox", "github", "steam", "spotify", "binance",
    "coinbase", "americanexpress",
}


SHORTENERS = {
    "bit.ly", "tinyurl.com", "t.co", "rebrand.ly", "is.gd", "goo.gl",
    "bit.do", "lnkd.in", "db.tt", "qr.ae", "adf.ly", "ow.ly", "ity.im",
    "q.gs", "po.st", "bc.vc", "twitthis.com", "u.to", "j.mp",
    "buzurl.com", "cutt.us", "u.bb", "yourls.org", "x.co",
    "prettylinkpro.com", "scrnch.me", "filoops.info", "short.to",
    "moourl.com", "1url.com", "urlx.org", "tr.im", "link.zip.net",
    "qrco.de", "ead.me",
}


SUSPICIOUS_WORDS = {
    "login", "verify", "secure", "signin", "bank", "account",
    "update", "free", "bonus", "ebayisapi", "webscr", "pay",
    "confirm", "live", "office", "service", "portal", "submit",
    "recover", "validation", "alert", "safe",
}


# Railway gibi ortamlarda dışarıdan TLD listesi indirmeye çalışmasını engeller.
TLD_EXTRACTOR = tldextract.TLDExtract(suffix_list_urls=())


def clean_url(url: str) -> str:
    url = url.strip()

    if not url.lower().startswith(("http://", "https://")):
        url = "http://" + url

    return url.replace("://www.", "://").replace("://WWW.", "://")


def calculate_entropy(text: str) -> float:
    if not text:
        return 0.0

    probabilities = [
        count / len(text)
        for count in Counter(text).values()
    ]

    return -sum(
        probability * math.log2(probability)
        for probability in probabilities
    )


def count_suspicious_words(url: str) -> int:
    url_lower = url.lower()

    return sum(
        url_lower.count(word)
        for word in SUSPICIOUS_WORDS
    )


def count_special_chars(url: str) -> int:
    special_chars = "-_%@=~#&$+;!*(),^|{}[]"

    return sum(
        1
        for char in url
        if char in special_chars
    )


def count_digits(url: str) -> int:
    return sum(1 for char in url if char.isdigit())


def max_consecutive_chars(text: str) -> int:
    if not text:
        return 0

    max_count = 1
    current_count = 1

    for index in range(1, len(text)):
        if text[index] == text[index - 1]:
            current_count += 1
            max_count = max(max_count, current_count)
        else:
            current_count = 1

    return max_count


def is_ip_address(hostname: str) -> int:
    if not hostname:
        return 0

    host = hostname.strip("[]")

    try:
        ipaddress.ip_address(host)
        return 1
    except ValueError:
        return 0


def normalize_text(text: str) -> str:
    if not text:
        return ""

    return "".join(
        character
        for character in unicodedata.normalize("NFD", text)
        if unicodedata.category(character) != "Mn"
    )


def check_brand_spoofing(url: str, domain: str) -> int:
    url_lower = url.lower()
    domain_lower = domain.lower() if domain else ""

    normalized_domain = normalize_text(domain_lower)
    normalized_url = normalize_text(url_lower)

    homoglyphs = {
        "0": "o",
        "1": "l",
        "3": "e",
        "4": "a",
        "5": "s",
        "8": "b",
        "9": "g",
    }

    for character, replacement in homoglyphs.items():
        normalized_domain = normalized_domain.replace(
            character,
            replacement,
        )
        normalized_url = normalized_url.replace(
            character,
            replacement,
        )

    for brand in POPULAR_BRANDS:
        if brand in normalized_url or brand in normalized_domain:
            if domain_lower != brand:
                return 1

        similarity = difflib.SequenceMatcher(
            None,
            normalized_domain,
            brand,
        ).ratio()

        if 0.80 <= similarity < 1.0:
            return 1

    return 0


def get_default_features() -> dict[str, Any]:
    return {
        "url_uzunlugu": 0,
        "alan_adi_uzunlugu": 0,
        "ip_adresi_var_mi": 0,
        "nokta_sayisi": 0,
        "tire_sayisi": 0,
        "et_isareti_sayisi": 0,
        "soru_isareti_sayisi": 0,
        "esittir_sayisi": 0,
        "alt_dizin_sayisi": 0,
        "https_var_mi": 0,
        "alt_alan_adi_sayisi": 0,
        "marka_taklidi_var_mi": 0,
        "supheli_tld_var_mi": 0,
        "kisaltma_servisi_mi": 0,
        "alan_adinda_tire_var_mi": 0,
        "alan_adinda_http_var_mi": 0,
        "parametre_sayisi": 0,
        "supheli_kelime_sayisi": 0,
        "alan_adi_uzantisi": "",
        "ozel_karakter_sayisi": 0,
        "rakam_sayisi": 0,
        "ardisik_karakter_sayisi": 0,
        "entropi": 0.0,
    }


def extract_features(url: str) -> dict[str, Any]:
    default_features = get_default_features()

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
        registered_domain = (
            f"{domain}.{suffix}".lower()
            if suffix
            else domain.lower()
        )

        return {
            "url_uzunlugu": len(cleaned_url),
            "alan_adi_uzunlugu": len(hostname),
            "ip_adresi_var_mi": is_ip_address(hostname),
            "nokta_sayisi": cleaned_url.count("."),
            "tire_sayisi": cleaned_url.count("-"),
            "et_isareti_sayisi": cleaned_url.count("@"),
            "soru_isareti_sayisi": cleaned_url.count("?"),
            "esittir_sayisi": cleaned_url.count("="),
            "alt_dizin_sayisi": url_path.count("/"),
            "https_var_mi": (
                1
                if cleaned_url.lower().startswith("https://")
                else 0
            ),
            "alt_alan_adi_sayisi": (
                len(subdomain.split("."))
                if subdomain
                else 0
            ),
            "marka_taklidi_var_mi": check_brand_spoofing(
                cleaned_url,
                domain,
            ),
            "supheli_tld_var_mi": (
                0
                if suffix.lower() in TRUSTED_TLDS
                else 1
            ),
            "kisaltma_servisi_mi": (
                1
                if registered_domain in SHORTENERS
                else 0
            ),
            "alan_adinda_tire_var_mi": (
                1
                if "-" in domain
                else 0
            ),
            "alan_adinda_http_var_mi": (
                1
                if "http" in hostname.lower()
                else 0
            ),
            "parametre_sayisi": len(parse_qsl(parsed_url.query)),
            "supheli_kelime_sayisi": count_suspicious_words(
                cleaned_url
            ),
            "alan_adi_uzantisi": suffix.lower() if suffix else "",
            "ozel_karakter_sayisi": count_special_chars(cleaned_url),
            "rakam_sayisi": count_digits(cleaned_url),
            "ardisik_karakter_sayisi": max_consecutive_chars(
                hostname
            ),
            "entropi": calculate_entropy(cleaned_url),
        }

    except Exception:
        return default_features


def load_artifact(path: Path) -> Any:
    if not path.is_file():
        raise RuntimeError(
            f"Model dosyası bulunamadı: {path.name}"
        )

    try:
        return joblib.load(path)
    except Exception as error:
        raise RuntimeError(
            f"Model dosyası yüklenemedi: {path.name}"
        ) from error


@lru_cache(maxsize=1)
def get_model() -> Any:
    """
    Modeli yalnızca ilk tarama isteğinde yükler.

    Böylece model dosyasında sorun olsa bile uygulamanın diğer
    endpointleri çalışmaya devam edebilir.
    """

    return load_artifact(MODEL_PATH)


def create_feature_frame(
    trained_model: Any,
    model_features: dict[str, Any],
) -> pd.DataFrame:
    expected_features = list(
        getattr(
            trained_model,
            "feature_names_in_",
            model_features.keys(),
        )
    )

    missing_features = [
        feature_name
        for feature_name in expected_features
        if feature_name not in model_features
    ]

    if missing_features:
        missing_text = ", ".join(missing_features)

        raise RuntimeError(
            f"Model için gerekli özellikler eksik: {missing_text}"
        )

    ordered_features = {
        feature_name: model_features[feature_name]
        for feature_name in expected_features
    }

    return pd.DataFrame(
        [ordered_features],
        columns=expected_features,
    )


def analyze_url(url: str) -> dict[str, Any]:
    trained_model = get_model()

    raw_features = extract_features(url)
    model_features = dict(raw_features)

    for column in EXCLUDED_FEATURE_COLUMNS:
        model_features.pop(column, None)

    feature_frame = create_feature_frame(
        trained_model,
        model_features,
    )

    probabilities = trained_model.predict_proba(feature_frame)[0]

    probability_by_class = {
        int(class_name): float(probability)
        for class_name, probability in zip(
            trained_model.classes_,
            probabilities,
        )
    }

    phishing_probability = round(
        probability_by_class.get(PHISHING_CLASS, 0.0) * 100,
        2,
    )

    safe_probability = round(
        probability_by_class.get(SAFE_CLASS, 0.0) * 100,
        2,
    )

    is_phishing = (
        phishing_probability
        >= PHISHING_THRESHOLD * 100
    )

    return {
        "verdict": "dangerous" if is_phishing else "safe",
        "riskScore": phishing_probability,
        "title": (
            "Şüpheli bağlantı"
            if is_phishing
            else "Güvenli bağlantı"
        ),
        "message": (
            "Bu bağlantıda oltalama saldırısıyla ilişkili "
            "olabilecek şüpheli özellikler bulundu."
            if is_phishing
            else
            "Bu bağlantıda model tarafından belirlenen yüksek "
            "riskli bir işarete rastlanmadı."
        ),
        "details": {
            "phishingProbability": phishing_probability,
            "safeProbability": safe_probability,
            "entropy": round(
                float(raw_features.get("entropi", 0.0)),
                3,
            ),
        },
        "features": raw_features,
    }