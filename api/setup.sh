#!/bin/bash

# Birebiro Admin Panel - Hızlı Kurulum
# Bu script admin paneli kurmanıza yardımcı olur

echo "🎨 Birebiro Admin Panel Kurulumu Başlatılıyor..."
echo ""

# Renk kodları
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Node.js versiyonunu kontrol et
echo -e "${BLUE}📦 Node.js versiyonu kontrol ediliyor...${NC}"
NODE_VERSION=$(node -v 2>&1)
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Node.js yüklü: $NODE_VERSION${NC}"
else
    echo -e "${RED}✗ Node.js yüklü değil! Lütfen Node.js 14.14+ yükleyin.${NC}"
    exit 1
fi

# NPM versiyonunu kontrol et
echo -e "${BLUE}📦 NPM versiyonu kontrol ediliyor...${NC}"
NPM_VERSION=$(npm -v 2>&1)
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ NPM yüklü: $NPM_VERSION${NC}"
else
    echo -e "${RED}✗ NPM yüklü değil!${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}📥 Dependencies yükleniyor... (Bu birkaç dakika sürebilir)${NC}"
npm install

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Dependencies başarıyla yüklendi!${NC}"
else
    echo -e "${RED}✗ Dependencies yüklenirken hata oluştu.${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}⚠️  ÖNEMLİ NOTLAR:${NC}"
echo ""
echo "1. Backend API henüz oluşturulmadı. Admin panel çalışması için API gereklidir."
echo "2. Environment dosyalarını kontrol edin:"
echo "   - src/environments/environment.ts"
echo "   - src/environments/environment.prod.ts"
echo ""
echo "3. Pages routing'e Products modülünü ekleyin:"
echo "   - src/app/pages/pages-routing.module.ts"
echo ""

echo -e "${GREEN}✨ Kurulum tamamlandı!${NC}"
echo ""
echo -e "${BLUE}Uygulamayı başlatmak için:${NC}"
echo "  npm start"
echo ""
echo -e "${BLUE}Production build için:${NC}"
echo "  npm run build:prod"
echo ""
echo -e "${BLUE}Daha fazla bilgi için:${NC}"
echo "  cat NEXT-STEPS.md"
echo "  cat README-ADMIN.md"
echo ""
echo -e "${GREEN}🚀 İyi çalışmalar!${NC}"
