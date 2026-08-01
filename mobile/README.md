# AI Phishing Detector - Mobil Uygulama

Kullanıcıların SMS, e-posta veya WhatsApp üzerinden gelen şüpheli bağlantıları açmadan önce analiz edebilmesini sağlayan React Native mobil uygulamasıdır.

## Özellikler

- URL güvenlik analizi
- Risk yüzdesi ve güvenli/şüpheli sonucu
- FastAPI backend ve makine öğrenmesi modeli entegrasyonu
- Panodan URL yapıştırma
- QR kod içerisindeki bağlantıları tarama
- Kullanıcı kaydı ve girişi
- Şifre sıfırlama
- Profil ve çıkış işlemleri
- Tarama geçmişi ve sonuç özeti
- Phishing bilgilendirme rehberi
- Kamera izin yönetimi

## Kullanılan Teknolojiler

- React Native
- Expo SDK 54
- Expo Router
- TypeScript
- FastAPI REST API

## Kurulum

Öncelikle mobil uygulama klasörüne girin:

```bash
cd mobile
```

Bağımlılıkları yükleyin:

```bash
npm ci
```

`.env.example` dosyasını `.env.local` adıyla kopyalayın.

Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

`.env.local` dosyasındaki backend adresini düzenleyin:

```env
EXPO_PUBLIC_API_URL=http://BILGISAYAR_IP_ADRESI:8000
```

Fiziksel telefonla test yapılırken telefon ve bilgisayar aynı Wi-Fi ağına bağlı olmalıdır. `localhost` yerine bilgisayarın yerel IP adresi kullanılmalıdır.

## Uygulamayı Çalıştırma

```bash
npx expo start
```

Expo Go uygulamasıyla terminalde gösterilen QR kod okutularak fiziksel cihazda test yapılabilir.

- Android emülatörü: `a`
- Web tarayıcısı: `w`

## Kod Kontrolleri

TypeScript kontrolü:

```bash
npx tsc --noEmit
```

Lint kontrolü:

```bash
npm run lint
```

## Backend Bağlantısı

Mobil uygulama aşağıdaki FastAPI endpointlerini kullanır:

- `POST /api/v1/scan-url`
- `POST /api/v1/register`
- `POST /api/v1/login`
- `POST /api/v1/forgot-password`

Backend servisi mobil uygulamadan ayrı olarak çalıştırılmalıdır.

## Bilinen Sınırlamalar

- Kullanıcı oturumu uygulama açık olduğu sürece korunur.
- Tarama geçmişi şu anda uygulama belleğinde tutulur.
- Backend henüz internete dağıtılmadığı için yerel ağ adresi kullanılmaktadır.
- Kalıcı oturum ve geçmiş için backend desteği gerekmektedir.

## Güvenlik

`.env.local`, erişim anahtarları, parolalar ve bilgisayara özel bilgiler GitHub’a gönderilmemelidir.