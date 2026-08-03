import os
import tempfile
import uuid
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Uygulama modülleri import edilirken zorunlu olan ayar. Dosya yolu vermeyerek
# testlerin fiziksel bir SQLite veritabanı oluşturmasını engelliyoruz.
os.environ["DATABASE_URL"] = "sqlite://"
os.environ["JWT_SECRET"] = "test-secret-key"
os.environ["COOKIE_SECURE"] = "false"
test_cache_dir = tempfile.TemporaryDirectory(prefix="phishing-test-tldextract-")
os.environ["TLDEXTRACT_CACHE"] = test_cache_dir.name

import database
import models
from main import app

test_engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=test_engine,
)


async def override_get_db():
    """Her istek için paylaşılan bellek içi motora bağlı ayrı bir oturum aç."""
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(scope="session", autouse=True)
def test_database():
    models.Base.metadata.create_all(bind=test_engine)
    app.dependency_overrides[database.get_db] = override_get_db
    yield
    app.dependency_overrides.pop(database.get_db, None)
    models.Base.metadata.drop_all(bind=test_engine)
    test_engine.dispose()
    test_cache_dir.cleanup()


@pytest_asyncio.fixture
async def async_client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        yield client


# --- MEVCUT TEMEL TEST ---
@pytest.mark.asyncio
async def test_read_root(async_client):
    response = await async_client.get("/")
    assert response.status_code in [200, 404]


# =====================================================================
# /api/v1/scan-url ENDPOINT TESTLERİ
# =====================================================================

# --- SENARYO 1: Mock Model ile Başarılı İstek (200 OK) ---
@pytest.mark.asyncio
async def test_scan_url_success(mocker, async_client):
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

    response = await async_client.post(
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
@pytest.mark.asyncio
async def test_scan_url_real_model_smoke(async_client):
    response = await async_client.post(
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
@pytest.mark.asyncio
async def test_scan_url_invalid_url(async_client):
    response = await async_client.post(
        "/api/v1/scan-url",
        json={"url": "https://gecersiz url .com"},
    )

    assert response.status_code == 422


# --- SENARYO 4A: Model Analizi Hatası (500) ---
@pytest.mark.asyncio
async def test_scan_url_analysis_error(mocker, async_client):
    mocker.patch(
        "main.analyze_url",
        side_effect=Exception("Model analiz motoru hatası!"),
    )

    response = await async_client.post(
        "/api/v1/scan-url",
        json={"url": "https://error-analysis.com"},
    )

    assert response.status_code == 500
    assert "URL analizi tamamlanamadı" in response.json()["detail"]


# --- SENARYO 4B: Veritabanı Hatası ve Rollback ---
@pytest.mark.asyncio
async def test_scan_url_db_error_and_rollback(mocker, async_client):
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

    response = await async_client.post(
        "/api/v1/scan-url",
        json={"url": "https://db-error.com"},
    )

    assert response.status_code == 500
    assert "Veritabanı kayıt hatası" in response.json()["detail"]
    mock_commit.assert_called_once()
    mock_rollback.assert_called_once()


# =====================================================================
# AUTH ENDPOINT TESTLERİ (login, logout, me)
# =====================================================================

TEST_USER = {
    "ad_soyad": "Test Kullanıcı",
    "email": "test@example.com",
    "sifre": "GucluSifre123",
}


@pytest_asyncio.fixture
async def registered_user(async_client):
    """Test kullanıcısını kaydet ve temiz bilgileri döndür."""
    user_data = {
        **TEST_USER,
        "email": f"test-{uuid.uuid4().hex[:8]}@example.com",
    }
    response = await async_client.post("/api/v1/register", json=user_data)
    assert response.status_code == 200
    return user_data


@pytest.mark.asyncio
async def test_login_success_sets_cookie(async_client, registered_user):
    response = await async_client.post(
        "/api/v1/login",
        json={"email": registered_user["email"], "sifre": registered_user["sifre"]},
    )

    assert response.status_code == 200
    assert response.json()["status"] == "success"
    assert "access_token" in response.cookies
    assert "ad_soyad" not in response.json()


@pytest.mark.asyncio
async def test_login_invalid_credentials(async_client, registered_user):
    response = await async_client.post(
        "/api/v1/login",
        json={"email": registered_user["email"], "sifre": "yanlis-sifre"},
    )

    assert response.status_code == 400
    assert "hatalı" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_me_returns_current_user(async_client, registered_user):
    login_response = await async_client.post(
        "/api/v1/login",
        json={"email": registered_user["email"], "sifre": registered_user["sifre"]},
    )
    assert login_response.status_code == 200

    me_response = await async_client.get("/api/v1/me")

    assert me_response.status_code == 200
    data = me_response.json()
    assert data["email"] == registered_user["email"]
    assert data["ad_soyad"] == registered_user["ad_soyad"]
    assert "id" in data
    assert "sifre" not in data


@pytest.mark.asyncio
async def test_me_unauthenticated(async_client):
    response = await async_client.get("/api/v1/me")

    assert response.status_code == 401


@pytest.mark.asyncio
async def test_logout_clears_session(async_client, registered_user):
    login_response = await async_client.post(
        "/api/v1/login",
        json={"email": registered_user["email"], "sifre": registered_user["sifre"]},
    )
    assert login_response.status_code == 200

    logout_response = await async_client.post("/api/v1/logout")
    assert logout_response.status_code == 200
    assert logout_response.json()["status"] == "success"

    me_response = await async_client.get("/api/v1/me")
    assert me_response.status_code == 401


@pytest.mark.asyncio
async def test_forgot_password_no_debug_leak(async_client, registered_user):
    response = await async_client.post(
        "/api/v1/forgot-password",
        json={"email": registered_user["email"]},
    )

    assert response.status_code == 200
    assert "debug_yeni_sifre" not in response.json()
