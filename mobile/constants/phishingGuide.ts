export type GuideSectionId = "phishing" | "protection" | "workflow";

export type GuideSection = {
  id: GuideSectionId;
  number: string;
  title: string;
  description: string;
  items: string[];
};

export const phishingGuideSections: GuideSection[] = [
  {
    id: "phishing",
    number: "01",
    title: "Phishing nedir?",
    description:
      "Phishing, saldırganların gerçek kurumları taklit eden sahte bağlantılar veya web sayfaları kullanarak kullanıcıları kandırmasıdır. Amaç; şifre, kart bilgisi, hesap bilgisi veya kişisel verileri ele geçirmektir.",
    items: [
      "Sahte giriş ekranları kullanılabilir.",
      "Linkler gerçek siteye benzer görünebilir.",
      "Kullanıcıdan acil işlem yapması istenebilir.",
    ],
  },
  {
    id: "protection",
    number: "02",
    title: "Nasıl korunulur?",
    description:
      "Şüpheli bir bağlantıya tıklamadan önce alan adı dikkatlice kontrol edilmeli, bilinmeyen kaynaklardan gelen formlara bilgi girilmemeli ve bağlantı güvenilir değilse analiz edilmelidir.",
    items: [
      "Alan adında harf değişimi veya garip karakter var mı kontrol edin.",
      "SMS, e-posta veya sosyal medya üzerinden gelen linklere dikkat edin.",
      "Şifre veya kart bilgisi isteyen sayfalarda ekstra dikkatli olun.",
    ],
  },
  {
    id: "workflow",
    number: "03",
    title: "Sistem nasıl çalışır?",
    description:
      "Kullanıcı URL adresini uygulamaya girer. Uygulama bu adresi backend API'ye gönderir. Backend URL özelliklerini çıkarır, yapay zekâ modeliyle analiz eder ve sonucu kullanıcıya döndürür.",
    items: [
      "URL arayüz üzerinden alınır.",
      "Backend tarafında analiz edilir.",
      "Sonuç kullanıcıya gösterilir.",
    ],
  },
];
