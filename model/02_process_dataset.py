import os
import re
import time
import ipaddress
import unicodedata
import difflib
from urllib.parse import urlparse, parse_qsl
import pandas as pd
import tldextract
import math
import json
from collections import Counter


# =====================================================================
# ÖZELLİK ÇIKARIM AYARLARI VE LİSTELERİ
# =====================================================================

# Güvenilir ve yaygın kullanılan alan adı uzantıları (Beyaz Liste)
TRUSTED_TLDS = {
    "com", "net", "org", "gov", "edu", "mil", "co", "io", 
    "me", "tv", "info", "biz", "tr", "uk", "de", "fr", "us"
}

# Oltalama saldırılarında en çok taklit edilen popüler markalar
POPULAR_BRANDS = {
    "google", "paypal", "netflix", "microsoft", "apple", "amazon", 
    "facebook", "instagram", "twitter", "linkedin", "yahoo", "live", 
    "outlook", "dropbox", "github", "steam", "spotify", "binance", 
    "coinbase", "americanexpress"
}

# Popüler link kısaltma servislerinin alan adları
SHORTENERS = {
    "bit.ly", "tinyurl.com", "t.co", "rebrand.ly", "is.gd", 
    "goo.gl", "bit.do", "lnkd.in", "db.tt", "qr.ae", 
    "adf.ly", "ow.ly", "ity.im", "q.gs", "po.st", "bc.vc", 
    "twitthis.com", "u.to", "j.mp", "buzurl.com", "cutt.us", 
    "u.bb", "yourls.org", "x.co", "prettylinkpro.com", 
    "scrnch.me", "filoops.info", "short.to", "moourl.com", 
    "1url.com", "urlx.org", "tr.im", "link.zip.net",
    "qrco.de", "ead.me"
}

# Oltalama ile ilişkili şüpheli kelimeler
SUSPICIOUS_WORDS = {
    'login', 'verify', 'secure', 'signin', 'bank', 'account', 
    'update', 'free', 'bonus', 'ebayisapi', 'webscr', 'pay', 
    'confirm', 'live', 'office', 'service', 'portal', 'submit', 
    'recover', 'validation', 'alert', 'safe'
}

def calculate_entropy(text: str) -> float:
    """
    Shannon entropy score representing randomness or complexity of characters in the text.
    Metindeki karakterlerin rastgeleliğini veya karmaşıklığını temsil eden Shannon entropi skoru.
    """
    if not text:
        return 0.0
    probabilities = [count / len(text) for count in Counter(text).values()]
    return -sum(p * math.log2(p) for p in probabilities)

def count_suspicious_words(url: str) -> int:
    """
    Count of phishing-related keywords in the URL.
    URL içindeki oltalama (phishing) ile ilişkili şüpheli kelimelerin sayısı.
    """
    url_lower = url.lower()
    return sum(url_lower.count(word) for word in SUSPICIOUS_WORDS)

def count_special_chars(url: str) -> int:
    """
    Count of special characters (-_%@=~) commonly used in malicious URLs.
    Kötü amaçlı URL'lerde yaygın olarak kullanılan özel karakterlerin (-_%@=~) sayısı.
    """
    special_chars = "-_%@=~#&$+;!*(),^|{}[]"
    return sum(1 for char in url if char in special_chars)

def count_digits(url: str) -> int:
    """
    Total number of numeric characters in the URL.
    URL içindeki toplam sayısal karakter (rakam) sayısı.
    """
    return sum(1 for char in url if char.isdigit())

# =====================================================================
# YARDIMCI GÜVENLİK VE ÖZELLİK ÇIKARMA FONKSİYONLARI
# =====================================================================

def clean_url(url: str) -> str:
    """
    Cleans leading/trailing whitespaces of the URL and prepends a scheme (http/https) if missing.
    URL'nin başındaki boşlukları temizler ve şema (http/https) yoksa ekler.
    """
    url = url.strip()
    if not url.lower().startswith(('http://', 'https://')):
        url = 'http://' + url
    url = url.replace("://www.", "://").replace("://WWW.", "://")
    return url

def max_consecutive_chars(text: str) -> int:
    """
    Bir metindeki ardışık tekrar eden en uzun aynı karakter diziliminin uzunluğunu bulur.
    """
    if not text:
        return 0
    max_count = 1
    current_count = 1
    for i in range(1, len(text)):
        if text[i] == text[i-1]:
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
    """
    Normalizes accented/Turkish characters (e.g., ö -> o, ğ -> g, ü -> u) to their English equivalents.
    ö -> o, ğ -> g, ü -> u gibi Türkçe/aksanlı karakterleri İngilizce karşılıklarına çevirir.
    """
    if not text:
        return ""
    return "".join(
        c for c in unicodedata.normalize('NFD', text)
        if unicodedata.category(c) != 'Mn'
    )

def check_brand_spoofing(url: str, domain: str) -> int:
    """
    Checks if popular brands are mentioned in the URL when the main domain does not belong to that brand (Typosquatting/Brand Spoofing).
    Türkçe karakter taklitlerini (goögle) ve yazım hatalarını (goggle) yakalar.
    
    Checks if popular brands are mentioned in the URL when the main domain does not belong to that brand (Typosquatting/Brand Spoofing).
    Catches Turkish character impersonations (goögle) and spelling errors (goggle).
    """
    url_lower = url.lower()
    domain_lower = domain.lower() if domain else ""
    
    # 1. Adım: Unicode normalizasyonu (goögle -> google)
    normalized_domain = normalize_text(domain_lower)
    normalized_url = normalize_text(url_lower)
    
    # 2. Adım: Homoglyph (rakam-harf benzerliği) dönüşümü (0 -> o, 1 -> l vb.)
    homoglyphs = {
        '0': 'o', '1': 'l', '3': 'e', '4': 'a', '5': 's', '8': 'b', '9': 'g'
    }
    for char, replacement in homoglyphs.items():
        normalized_domain = normalized_domain.replace(char, replacement)
        normalized_url = normalized_url.replace(char, replacement)

    # 3. Adım: Benzerlik ve Taklit Taraması
    for brand in POPULAR_BRANDS:
        # Marka adı temizlenmiş URL'de veya domainde geçiyor mu?
        if brand in normalized_url or brand in normalized_domain:
            if domain_lower != brand:
                return 1
                
        # Metin benzerliğini ölç (Örn: goggle vs google)
        similarity = difflib.SequenceMatcher(None, normalized_domain, brand).ratio()
        if 0.80 <= similarity < 1.0:
            return 1
            
    return 0


def extract_features(url: str) -> dict:
    """
    Extracts cybersecurity features from the URL and returns a dictionary.
    URL'den siber güvenlik özelliklerini çıkarıp sözlük olarak döndürür.
    """
    default_features = {
        'url_uzunlugu': 0,
        'alan_adi_uzunlugu': 0,
        'ip_adresi_var_mi': 0,
        'nokta_sayisi': 0,
        'tire_sayisi': 0,
        'et_isareti_sayisi': 0,
        'soru_isareti_sayisi': 0,
        'esittir_sayisi': 0,
        'alt_dizin_sayisi': 0,
        'https_var_mi': 0,
        'alt_alan_adi_sayisi': 0,
        'marka_taklidi_var_mi': 0,
        'supheli_tld_var_mi': 0,
        'kisaltma_servisi_mi': 0,
        'alan_adinda_tire_var_mi': 0,
        'alan_adinda_http_var_mi': 0,
        'parametre_sayisi': 0,
        'supheli_kelime_sayisi': 0,
        'alan_adi_uzantisi': '',
        'ozel_karakter_sayisi': 0,
        'rakam_sayisi': 0,
        'ardisik_karakter_sayisi': 0,
        'entropi': 0.0
    }

    if not url or not str(url).strip():
        return default_features
        
    try:
        cleaned_url = clean_url(url)
        parsed_url = urlparse(cleaned_url)
        hostname = parsed_url.hostname or ""
        
        extracted = tldextract.extract(cleaned_url)
        domain = extracted.domain
        subdomain = extracted.subdomain
        suffix = extracted.suffix
        
        # Metinsel (Lexical) Özellikler
        url_length = len(cleaned_url)
        hostname_length = len(hostname)
        ip_in_url = is_ip_address(hostname)
        count_dots = cleaned_url.count('.')
        count_hyphens = cleaned_url.count('-')
        count_at = cleaned_url.count('@')
        count_question = cleaned_url.count('?')
        count_equal = cleaned_url.count('=')
        url_path = parsed_url.path + parsed_url.query
        count_slash = url_path.count('/')
        
        is_https = 1 if cleaned_url.lower().startswith('https://') else 0
        
        # Alan Adı (Domain) Analizi
        subdomain_count = len(subdomain.split('.')) if subdomain else 0
        brand_spoofing = check_brand_spoofing(cleaned_url, domain)
        has_suspicious_tld = 0 if suffix.lower() in TRUSTED_TLDS else 1
        
        # Yeni özellikler
        registered_domain = f"{domain}.{suffix}".lower()
        shortening_service = 1 if registered_domain in SHORTENERS else 0
        prefix_suffix = 1 if "-" in domain else 0
        https_token = 1 if "http" in hostname.lower() or "https" in hostname.lower() else 0
        
        return {
            'url_uzunlugu': url_length,
            'alan_adi_uzunlugu': hostname_length,
            'ip_adresi_var_mi': ip_in_url,
            'nokta_sayisi': count_dots,
            'tire_sayisi': count_hyphens,
            'et_isareti_sayisi': count_at,
            'soru_isareti_sayisi': count_question,
            'esittir_sayisi': count_equal,
            'alt_dizin_sayisi': count_slash,
            'https_var_mi': is_https,
            'alt_alan_adi_sayisi': subdomain_count,
            'marka_taklidi_var_mi': brand_spoofing,
            'supheli_tld_var_mi': has_suspicious_tld,
            'kisaltma_servisi_mi': shortening_service,
            'alan_adinda_tire_var_mi': prefix_suffix,
            'alan_adinda_http_var_mi': https_token,
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
# VERİ SETİ TOPLU İŞLEME VE RAPORLAMA FONKSİYONU
# =====================================================================

def process_csv(input_filename: str, output_filename: str):
    """
    Reads the given raw CSV file, extracts features of the URLs inside, and saves them as a new CSV file.
    
    Verilen ham CSV dosyasını okur, içindeki URL'lerin özelliklerini çıkarır
    ve yeni bir CSV dosyası olarak kaydeder.
    """
    if not os.path.exists(input_filename):
        print(f"Hata: '{input_filename}' dosyası bulunamadı!")
        print("Lütfen veri seti dosyanızı bu klasöre kopyalayıp tekrar deneyin.")
        return
        
    print(f"'{input_filename}' okunuyor...")
    df = pd.read_csv(input_filename)
    
    url_column = None
    for col in df.columns:
        if col.lower() == 'url':
            url_column = col
            break
            
    if not url_column:
        print("Hata: CSV dosyasında 'url' veya 'URL' adında bir sütun bulunamadı!")
        print(f"Mevcut sütunlar: {list(df.columns)}")
        return
        
    total_rows = len(df)
    print(f"Toplam {total_rows} adet URL işlenecek...")
    
    start_time = time.time()
    feature_list = []
    
    for i, url in enumerate(df[url_column]):
        processed_count = i + 1
        
        # Özellik çıkarımını yap
        features = extract_features(url)
        
        # Orijinal URL'yi de en başa ekleyelim
        row_data = {'url': url}
        row_data.update(features)
        
        feature_list.append(row_data)
        
        # Her 10000 satırda bir detaylı konsol logu yazdır
        if processed_count % 10000 == 0 or processed_count == total_rows:
            elapsed_time = time.time() - start_time
            remaining_count = total_rows - processed_count
            
            avg_time_per_url = elapsed_time / processed_count
            estimated_remaining_time = avg_time_per_url * remaining_count
            
            minutes_passed = elapsed_time / 60
            minutes_remaining = estimated_remaining_time / 60
            percentage = (processed_count / total_rows) * 100
            
            print("=" * 50)
            print(f"İlerleme: %{percentage:.1f} ({processed_count}/{total_rows})")
            print(f"  - Tarandı: {processed_count} site")
            print(f"  - Kalan: {remaining_count} site")
            print(f"  - Geçen Süre: {minutes_passed:.2f} dakika")
            print(f"  - Tahmini Kalan Süre: {minutes_remaining:.2f} dakika")
            print("=" * 50)
            
    df_features = pd.DataFrame(feature_list)

    # Girdi dosyasının etiket sütununu akıllı olarak bul
    target_cols = ['status', 'label', 'class', 'result', 'is_phishing', 'type']
    label_column = next((col for col in df.columns if col.lower() in target_cols), None)

    if not label_column:
        # Bulamazsa yine de fallback olarak 2. sütunu al ama uyar
        label_column = df.columns[1]
        print(f"Uyarı: Beklenen etiket isimleri bulunamadı, {label_column} sütunu kullanılıyor.")

    df_features.insert(1, 'is_phishing', df[label_column])
    print(f"Hedef etiket olan '{label_column}' sütunu, 'is_phishing' adıyla ikinci sıraya eklendi.")
        
    df_features.to_csv(output_filename, index=False)
    
    total_elapsed_time = (time.time() - start_time) / 60
    print(f"\nİşlem tamamlandı! Toplam süre: {total_elapsed_time:.2f} dakika.")
    print(f"Yeni veri seti kaydedildi: '{output_filename}'")

# =====================================================================
# ANA GİRİŞ NOKTASI (RUN)
# =====================================================================

if __name__ == "__main__":
    input_file = "01_clean_raw_urls.csv"
    output_file = "02_features_extracted.csv"
    
    # WHOIS sorguları tamamen kaldırıldı
    process_csv(input_file, output_file)
