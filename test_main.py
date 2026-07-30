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
    yield  # Testlerin normal şekilde çalışmasına izin ver

    # Test veritabanı gerçek uygulama veritabanından ayrı tutulur.
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

# --- SENARYO 1: Mock Model ile Başarılı İstek (200 OK) ---
def test_scan_url_success(mocker):
    """
    Endpoint sözleşmesini modelden bağımsız test edebilmek için
    analiz sonucunu mock'lar.
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


# --- SENARYO 2: Gerçek Model Entegrasyon / Smoke Testi ---
def test_scan_url_real_model_smoke():
    """
    Mock kullanmadan gerçek model dosyalarını, özellik çıkarımını,
    scaler dönüşümünü ve predict işlemini uçtan uca çalıştırır.

    Bu testin amacı belirli bir risk yüzdesini sabitlemek değil,
    model pipeline'ının gerçekten çalıştığını doğrulamaktır.
    """
    response = client.post(
        "/api/v1/scan-url",
        json={"url": "https://www.google.com"},
    )

    assert response.status_code == 200

    veri = response.json()

    assert veri["url"] == "https://www.google.com/"
    assert veri["verdict"] in {"safe", "dangerous"}
    assert 0 <= veri["riskScore"] <= 100
    assert isinstance(veri["title"], str)
    assert veri["title"]
    assert isinstance(veri["message"], str)
    assert veri["message"]

    detaylar = veri["details"]

    assert 0 <= detaylar["phishingProbability"] <= 100
    assert 0 <= detaylar["safeProbability"] <= 100
    assert isinstance(detaylar["entropy"], (int, float))
    assert detaylar["phishingProbability"] == veri["riskScore"]

    assert isinstance(veri["features"], dict)
    assert veri["features"]


# --- SENARYO 3: Boşluklu / Geçersiz URL (422) ---
def test_scan_url_invalid_url():
    """
    Geçersiz bir URL gönderildiğinde Pydantic doğrulamasının
    devreye girip 422 dönmesini test eder.
    """
    response = client.post(
        "/api/v1/scan-url",
        json={"url": "https://gecersiz url .com"},
    )

    assert response.status_code == 422


# --- SENARYO 4A: Model Analizi Hatası (500) ---
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


# --- SENARYO 4B: Veritabanı Hatası ve Rollback ---
def test_scan_url_db_error_and_rollback(mocker):
    """
    Veritabanı kaydı sırasında commit() hata verdiğinde rollback()
    yapıldığını ve endpoint'in 500 döndürdüğünü test eder.
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