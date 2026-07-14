from fastapi import FastAPI
from pydantic import BaseModel
# Eren'in yazdığı dosyadan özellik çıkarma fonksiyonunu projemize dahil ediyoruz
from process_dataset import extract_features

app = FastAPI()

# Tuana ve Tarık url'yi bu yapıda gönderecek
class URLSorgu(BaseModel):
    url: str

# Sunucu ayakta mı diye test etmek için düz ana sayfa
@app.get("/")
def ana_sayfa():
    return {"durum": "Backend aktif"}

# İstenecek asıl scan-url uç noktası
@app.post("/api/v1/scan-url")
def url_tara(veri: URLSorgu):
    # Eren'in fonksiyonunu kullanarak gelen sitenin siber güvenlik özelliklerini çıkarıyoruz!
    analiz_sonuclari = extract_features(veri.url)
    
    # Onur'un yapay zeka modeli gelince bu analiz sonuçlarını modele besleyeceğiz.
    # Şimdilik Eren'in kodunun çalıştığını ve verileri çıkardığımızı göstermek için sonuçları dönüyoruz.
    return {
        "url": veri.url,
        "durum": "Ozellikler basariyla cikarildi, yapay zeka modeli bekleniyor",
        "analiz_verileri": analiz_sonuclari
    }