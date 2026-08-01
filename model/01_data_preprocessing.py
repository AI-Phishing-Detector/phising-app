import pandas as pd
from urllib.parse import urlparse

MAX_URLS_PER_DOMAIN = 100


def extract_domain(url: str) -> str:
    """
    Verilen URL'den ana alan adını (domain) çıkarır.
    Format hatası varsa 'unknown' döndürür.
    """
    try:
        # Gelen veriyi string'e çevirip kontrol ediyoruz
        url_str = str(url).strip()
        if not url_str.startswith(("http://", "https://")):
            url_str = "http://" + url_str

        return urlparse(url_str).hostname or "unknown"
    except Exception:  # Clean Code: Sadece 'except:' kullanmaktan kaçınılmalıdır
        return "unknown"


def preprocess_data(input_filepath: str, output_filepath: str) -> None:
    """
    Ham veri setini okur, boşlukları/kopyaları siler ve
    veri sızıntısını önlemek için domain başına URL sayısını dengeler.
    """
    print(f"'{input_filepath}' dosyası okunuyor...")
    df = pd.read_csv(input_filepath)

    initial_count = len(df)
    print(f"Başlangıç satır sayısı: {initial_count}")

    # 1. Boş ve tamamen aynı olan (duplicate) satırları sil
    df = df.dropna(subset=["url"])
    df = df.drop_duplicates(subset=["url"])
    print(f"Birebir kopya URL'ler silindikten sonra: {len(df)} ({initial_count - len(df)} satır elendi)")

    # 2. Domain bazlı dengeleme (Veri sızıntısını/bias önleme)
    df["domain_temp"] = df["url"].apply(extract_domain)
    df = df.groupby("domain_temp").head(MAX_URLS_PER_DOMAIN).reset_index(drop=True)
    df = df.drop(columns=["domain_temp"])

    cleaned_count = len(df)
    print(f"Domain dengelemesi sonrası temiz satır sayısı: {cleaned_count}")
    print(f"Toplam elenen gereksiz satır: {initial_count - cleaned_count}")

    # 3. Temizlenmiş veriyi kaydet
    df.to_csv(output_filepath, index=False)
    print(f"\nTemizlenmiş ham veri '{output_filepath}' adına kaydedildi.")


if __name__ == "__main__":
    INPUT_FILE = "raw_urls.csv"
    OUTPUT_FILE = "01_clean_raw_urls.csv"

    preprocess_data(INPUT_FILE, OUTPUT_FILE)