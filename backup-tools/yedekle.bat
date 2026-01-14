@echo off
setlocal enabledelayedexpansion

:: Değişkenleri ayarla
set PROJE_KLASORU=C:\Users\berka\Downloads\chatbot
set GITHUB_KULLANICI=tifil123
set DEPO_ADI=chatbot
set TARIH=%date:~-4%-%date:~4,2%-%date:~7,2%

:: Log dosyası oluştur
echo [%time%] Yedekleme baslatildi >> %PROJE_KLASORU%\yedekleme.log

:: GitHub'da depo yoksa oluştur
cd /d %PROJE_KLASORU%
if not exist ".git" (
    echo [%time%] Git deposu初始化 ediliyor >> %PROJE_KLASORU%\yedekleme.log
    git init
    git remote add origin https://github.com/%GITHUB_KULLANICI%/%DEPO_ADI%.git
)

:: Tüm dosyaları ekle ve commit yap
echo [%time%] Dosyalar yukleniyor >> %PROJE_KLASORU%\yedekleme.log
git add .
git commit -m "Otomatik yedekleme - %TARIH%"

:: GitHub'a gönder
echo [%time%] GitHub'a yukleniyor >> %PROJE_KLASORU%\yedekleme.log
git push origin main

echo [%time%] Yedekleme tamamlandi >> %PROJE_KLASORU%\yedekleme.log
echo Yedekleme basariyla tamamlandi!
