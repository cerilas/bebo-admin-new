# Birebiro Admin Panel

Birebiro AI art platform için Angular admin paneli.

## Özellikler

- 📊 Dashboard (Genel Bakış)
- 📦 Sipariş yönetimi
- 👥 Kullanıcı yönetimi
- 🖼️ Ürün yönetimi
- 🎨 Üretilen görsel yönetimi
- 📰 Bülten aboneleri
- 📝 İletişim formları
- ⚖️ Yasal belgeler
- 🔐 Authentication sistemi
- 🌙 Tema desteği (Açık/Koyu/Kozmik/Kurumsal)

## Teknolojiler

- Angular 15
- Nebular UI Kit 11
- ECharts (grafikler)
- ng2-smart-table

## Kurulum

\`\`\`bash
npm install --legacy-peer-deps
npm start
\`\`\`

## Production Build

\`\`\`bash
npm run build -- --configuration=production
\`\`\`

## Railway Deployment

Bu proje Railway'de deploy edilmek üzere yapılandırılmıştır.

1. Railway'de yeni bir proje oluşturun
2. Bu repo'yu bağlayın
3. Otomatik olarak Dockerfile ile build edilecek
4. Environment variable olarak gerekirse API URL'i ayarlayın

## Admin Giriş

Panel'e erişim için kullanıcı adı, şifre ve erişim anahtarı gereklidir.

## Lisans

MIT License - Octaworks
