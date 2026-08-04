from typing import Literal

from fastapi import FastAPI, Depends, HTTPException, status, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl, EmailStr, Field, ConfigDict, field_validator
from sqlalchemy.orm import Session
from dotenv import load_dotenv
import os
import random
import string

import database
import models
from model_service import analyze_url
import auth

# .env dosyasındaki değişkenleri yükle
load_dotenv()

# Veritabanı tablolarını otomatik oluştur
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="Phishing Detection API")

# CORS Kısıtlaması
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:8081",
        "http://127.0.0.1:8081",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- ŞEMALAR (Pydantic) ---
class URLSorgu(BaseModel):
    url: HttpUrl

    @field_validator("url", mode="before")
    @classmethod
    def check_whitespace(cls, v):
        if isinstance(v, str) and (" " in v or "\t" in v or "\n" in v):
            raise ValueError("URL boşluk karakteri içeremez.")
        return v


class URLAnalizDetayi(BaseModel):
    model_config = ConfigDict(extra="forbid")

    phishingProbability: float = Field(ge=0, le=100)
    safeProbability: float = Field(ge=0, le=100)
    entropy: float


class URLTaramaResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: int
    url: HttpUrl
    verdict: Literal["safe", "dangerous"]
    riskScore: float = Field(ge=0, le=100)
    title: str
    message: str
    details: URLAnalizDetayi
    features: dict[str, int | float | str]


class KayitOlRequest(BaseModel):
    ad_soyad: str
    email: EmailStr
    sifre: str

class GirisYapRequest(BaseModel):
    email: EmailStr
    sifre: str

class SifreUnuttumRequest(BaseModel):
    email: EmailStr


# --- ENDPOINT'LER ---

# Root endpointi veritabanı kullanmadığı için async kalabilir
@app.get("/")
async def read_root():
    return {"message": "Phishing Detection API is running"}

@app.post(
    "/api/v1/scan-url",
    response_model=URLTaramaResponse,
)
async def scan_url(
    payload: URLSorgu,
    db: Session = Depends(database.get_db),
):
    url_str = str(payload.url)

    try:
        analysis = analyze_url(url_str)
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"URL analizi tamamlanamadı: {str(error)}",
        ) from error

    try:
        db_log = models.ScanLog(
            url=url_str,
            prediction=analysis["verdict"],
            features=analysis["features"],
        )
        db.add(db_log)
        db.commit()
        db.refresh(db_log)

        return {
            "id": db_log.id,
            "url": db_log.url,
            "verdict": analysis["verdict"],
            "riskScore": analysis["riskScore"],
            "title": analysis["title"],
            "message": analysis["message"],
            "details": analysis["details"],
            "features": analysis["features"],
        }
    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Veritabanı kayıt hatası: {str(error)}",
        ) from error

@app.post("/api/v1/register")
async def register_user(payload: KayitOlRequest, db: Session = Depends(database.get_db)):
    existing_user = db.query(models.User).filter(models.User.email == payload.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Bu e-posta adresi ile zaten kayıt olunmuş.")
    
    try:
        new_user = models.User(
            ad_soyad=payload.ad_soyad,
            email=payload.email,
            sifre=auth.hash_password(payload.sifre),
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        print("\n" + "="*50)
        print(f"📧 [TEST MAİLİ - SİMÜLASYON]")
        print(f"Kime (Alıcı) : {payload.email}")
        print(f"Ad Soyad     : {payload.ad_soyad}")
        print(f"Konu         : Aramıza Hoş Geldiniz - Kayıt Başarılı")
        print(f"İçerik       : Kaydınız başarıyla oluşturulmuştur.")
        print("="*50 + "\n")

        return {"status": "success", "message": "Kayıt başarılı (Mail simülasyonu konsola yazdırıldı)."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Kayıt hatası: {str(e)}")

@app.post("/api/v1/login")
async def login_user(
    payload: GirisYapRequest,
    response: Response,
    db: Session = Depends(database.get_db),
):
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if not user or not auth.verify_password(payload.sifre, user.sifre):
        raise HTTPException(status_code=400, detail="E-posta veya şifre hatalı.")

    token = auth.create_access_token(user.id, user.email)
    response.set_cookie(
        key=auth.COOKIE_NAME,
        value=token,
        httponly=True,
        secure=auth.COOKIE_SECURE,
        samesite="lax",
        max_age=auth.JWT_EXPIRE_MINUTES * 60,
    )

    return {
    "status": "success",
    "message": "Giriş başarılı.",
    "ad_soyad": user.ad_soyad,
}


@app.get("/api/v1/me")
async def get_current_user_info(current_user: models.User = Depends(auth.get_current_user)):
    return {
        "id": current_user.id,
        "ad_soyad": current_user.ad_soyad,
        "email": current_user.email,
    }


@app.post("/api/v1/logout")
async def logout_user(response: Response):
    response.delete_cookie(
        key=auth.COOKIE_NAME,
        httponly=True,
        secure=auth.COOKIE_SECURE,
        samesite="lax",
    )
    return {"status": "success", "message": "Çıkış başarılı."}

@app.post("/api/v1/forgot-password")
async def forgot_password(payload: SifreUnuttumRequest, db: Session = Depends(database.get_db)):
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Bu e-posta adresine ait kayıt bulunamadı.")
    
    yeni_sifre = ''.join(random.choices(string.ascii_letters + string.digits, k=8))
    user.sifre = auth.hash_password(yeni_sifre)
    db.commit()

    print("\n" + "="*50)
    print(f"🔑 [TEST ŞİFRE MAİLİ - SİMÜLASYON]")
    print(f"Kime (Alıcı)       : {payload.email}")
    print("="*50 + "\n")

    return {
        "status": "success",
        "message": "Yeni şifreniz (test simülasyonu ile) konsola yazdırıldı.",
    }
