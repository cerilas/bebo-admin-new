#!/bin/bash

# Birebiro Admin Panel - Start Script
# Backend (API) ve Frontend (Angular) uygulamalarını aynı anda başlatır

echo "🚀 Birebiro Admin Panel başlatılıyor..."
echo ""

# Renk kodları
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# API dizinine git ve başlat
echo -e "${BLUE}📡 Backend API başlatılıyor (Port 3000)...${NC}"
cd api && node server.js &
API_PID=$!
echo -e "${GREEN}✅ Backend PID: $API_PID${NC}"
echo ""

# Angular dizinine git ve başlat
echo -e "${BLUE}🎨 Frontend Angular başlatılıyor (Port 4200)...${NC}"
cd ngx-admin && npm start &
ANGULAR_PID=$!
echo -e "${GREEN}✅ Frontend PID: $ANGULAR_PID${NC}"
echo ""

echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✨ Tüm servisler başlatıldı!${NC}"
echo ""
echo -e "${BLUE}🔗 Backend API:${NC}      http://localhost:3000"
echo -e "${BLUE}🔗 Frontend Angular:${NC}  http://localhost:4200"
echo -e "${BLUE}🔗 Health Check:${NC}      http://localhost:3000/api/health"
echo ""
echo -e "${YELLOW}⏸️  Durdurmak için CTRL+C basın${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# CTRL+C ile her iki process'i de durdur
trap "echo ''; echo '🛑 Servisler durduruluyor...'; kill $API_PID $ANGULAR_PID 2>/dev/null; echo '✅ Tüm servisler durduruldu.'; exit" INT TERM

# Process'lerin çalışmasını bekle
wait
