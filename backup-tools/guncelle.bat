@echo off
setlocal enabledelayedexpansion

:: Proje klasörüne git
set PROJE_KLASORU=C:\Users\berka\Downloads\chatbot
cd /d %PROJE_KLASORU%

echo [%time%] GitHub'dan guncel dosyalar aliniyor...

:: En son değişiklikleri çek
git fetch origin
git pull origin main

echo [%time%] Guncelleme tamamlandi!
echo.
echo Dosyalariniz artik guncel!
pause
