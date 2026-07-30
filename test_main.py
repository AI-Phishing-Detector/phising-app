import os

import pytest

# 1. ADIM: TEST ORTAMI VERİTABANI TANIMLAMASI
test_db_path = "./test.db"
os.environ["DATABASE_URL"] = f"sqlite:///{test_db_path}"

from fastapi.testclient import TestClient

import database
from main import app

# 2. ADIM: TEST BİTTİĞİNDE test.db DOSYASINI OTOMATİK SİL
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
    Geçerli bir URL gönderildiğinde model analizini mock'layarak
    200 OK dönmesini ve mobilin beklediği JSON yanıtını test eder.
    """
    sahte_ozellikler = {
        "url_uzunlugu": 19,
        "alan_adi_uzunlugu": 11,
        "https_var_mi": 1,
        "entropi": 3.5,
    }

    sahte_analiz = {
        "verdict": "safe",
        "riskScore": 12.5,
        "title": "Güvenli bağlantı",
        "message": "Yüksek riskli bir işarete rastlanmadı.",
        "details": {
            "phishingProbability": 12.5,
            "safeProbability": 87.5,
            "entropy": 3.5,
        },
        "features": sahte_ozellikler,
    }

    mocker.patch(
        "main.analyze_url",
        return_value=sahte_analiz,
    )

    response = client.post(
        "/api/v1/scan-url",
        json={"url": "https://example.com"},
    )

    assert response.status_code == 200

    veri = response.json()

    assert veri["url"] == "https://example.com/"
    assert veri["verdict"] == "safe"
    assert veri["riskScore"] == 12.5
    assert veri["title"] == "Güvenli bağlantı"
    assert veri["message"] == "Yüksek riskli bir işarete rastlanmadı."
    assert veri["details"] == sahte_analiz["details"]
    assert veri["features"] == sahte_ozellikler


# --- SENARYO 2: Boşluklu / Geçersiz URL (422 Unprocessable Entity) ---
def test_scan_url_invalid_url():
    """
    Boşluk içeren veya geçersiz bir URL gönderildiğinde
    Pydantic validasyonunun devreye girip 422 dönmesini test eder.
    """
    response = client.post(
        "/api/v1/scan-url",
        json={"url": "https://gecersiz url .com"},
    )

    assert response.status_code == 422


# --- SENARYO 3A: Model Analizi Hatası (500 Internal Server Error) ---
def test_scan_url_analysis_error(mocker):
    """
    analyze_url fonksiyonu hata fırlattığında endpoint'in
    500 Internal Server Error döndürdüğünü test eder.
    """
    mocker.patch(
        "main.analyze_url",
        side_effect=Exception("Model analiz motoru hatası!"),
    )

    response = client.post(
        "/api/v1/scan-url",
        json={"url": "https://error-analysis.com"},
    )

    assert response.status_code == 500
    assert (
        "URL analizi tamamlanamadı"
        in response.json()["detail"]
    )


# --- SENARYO 3B: Veritabanı Hatası ve Rollback Doğrulaması ---
def test_scan_url_db_error_and_rollback(mocker):
    """
    Veritabanı kaydı sırasında commit() hata verdiğinde rollback()
    yapıldığını ve 500 dönüldüğünü test eder.
    """
    sahte_analiz = {
        "verdict": "dangerous",
        "riskScore": 95.0,
        "title": "Şüpheli bağlantı",
        "message": "Şüpheli özellikler bulundu.",
        "details": {
            "phishingProbability": 95.0,
            "safeProbability": 5.0,
            "entropy": 4.2,
        },
        "features": {
            "url_uzunlugu": 42,
            "entropi": 4.2,
        },
    }

    mocker.patch(
        "main.analyze_url",
        return_value=sahte_analiz,
    )
    mock_commit = mocker.patch(
        "sqlalchemy.orm.session.Session.commit",
        side_effect=Exception("DB bağlantısı koptu!"),
    )
    mock_rollback = mocker.patch(
        "sqlalchemy.orm.session.Session.rollback",
    )

    response = client.post(
        "/api/v1/scan-url",
        json={"url": "https://db-error.com"},
    )

    assert response.status_code == 500
    assert (
        "Veritabanı kayıt hatası"
        in response.json()["detail"]
    )
    mock_commit.assert_called_once()
    mock_rollback.assert_called_once()