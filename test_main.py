import os
import pytest

# 1. ADIM: TEST ORTAMI VERİTABANI TANIMLAMASI
test_db_path = "./test.db"
os.environ["DATABASE_URL"] = f"sqlite:///{test_db_path}"

from fastapi.testclient import TestClient
from main import app
import database

# 2. ADIM: TEST BİTTİĞİNDE test.db DOSYASINI OTOMATİK SİL (Murat'ın son isteri)
@pytest.fixture(scope="session", autouse=True)
def cleanup_test_db():
    yield  # Testlerin normalce çalışmasına izin ver
    # Tüm testler bittikten sonra arkada kalan test.db dosyasını sil
    if os.path.exists(test_db_path):
        try:
            os.remove(test_db_path)
        except Exception:
            pass

client = TestClient(app)

# --- MEVCUT TEMEL TEST (Korundu) ---
def test_read_root():
    response = client.get("/")
    assert response.status_code in [200, 404]


# =====================================================================
# /api/v1/scan-url ENDPOINT TESTLERİ
# =====================================================================

# --- SENARYO 1: Başarılı İstek (200 OK) ---
def test_scan_url_success(mocker):
    """
    Geçerli bir URL gönderildiğinde özellik çıkarımını mock'layarak
    200 OK dönmesini ve JSON yanıtının doğruluğunu test eder.
    """
    sahte_ozellikler = {
        "url_uzunlugu": 19,
        "alan_adi_uzunlugu": 11,
        "https_var_mi": 1,
        "entropi": 3.5
    }
    mocker.patch("main.extract_features", return_value=sahte_ozellikler)

    response = client.post("/api/v1/scan-url", json={"url": "https://example.com"})

    assert response.status_code == 200
    veri = response.json()
    assert veri["url"] == "https://example.com/"
    assert veri["prediction"] == "Başarılı"
    assert veri["features"] == sahte_ozellikler


# --- SENARYO 2: Boşluklu / Geçersiz URL (422 Unprocessable Entity) ---
def test_scan_url_invalid_url():
    """
    Boşluk içeren veya geçersiz bir URL gönderildiğinde, 
    Pydantic validasyonunun devreye girip 422 dönmesini test eder.
    """
    response = client.post("/api/v1/scan-url", json={"url": "https://gecersiz url .com"})
    assert response.status_code == 422


# --- SENARYO 3A: Özellik Çıkarma Hatası (500 Internal Server Error) ---
def test_scan_url_feature_extraction_error(mocker):
    """
    extract_features fonksiyonu hata fırlattığında endpoint'in
    500 Internal Server Error döndürdüğünü test eder.
    """
    mocker.patch("main.extract_features", side_effect=Exception("Özellik çıkarma motoru hatası!"))

    response = client.post("/api/v1/scan-url", json={"url": "https://error-feature.com"})

    assert response.status_code == 500
    assert "Özellik çıkarılırken hata oluştu" in response.json()["detail"]


# --- SENARYO 3B: Veritabanı Hatası ve Rollback Doğrulaması (500 Internal Server Error) ---
def test_scan_url_db_error_and_rollback(mocker):
    """
    Veritabanı kaydı sırasında commit() hata verdiğinde rollback() yapıldığını
    ve 500 dönüldüğünü mock'layarak test eder.
    """
    mocker.patch("main.extract_features", return_value={"test_feature": 1})
    mock_commit = mocker.patch("sqlalchemy.orm.session.Session.commit", side_effect=Exception("DB bağlantı koptu!"))
    mock_rollback = mocker.patch("sqlalchemy.orm.session.Session.rollback")

    response = client.post("/api/v1/scan-url", json={"url": "https://db-error.com"})

    assert response.status_code == 500
    assert "Veritabanı kayıt hatası" in response.json()["detail"]
    mock_commit.assert_called_once()
    mock_rollback.assert_called_once()