@echo off
echo GitHub Depo Kontrolü
echo ==================
echo.

cd C:\Users\berka\Downloads\chatbot

echo 1. Git durumu kontrol ediliyor...
git status
echo.

echo 2. Remote bağlantısı kontrol ediliyor...
git remote -v
echo.

echo 3. Son commit'ler kontrol ediliyor...
git log --oneline -3
echo.

echo 4. Yedekleme log'u kontrol ediliyor...
if exist yedekleme.log (
    type yedekleme.log
) else (
    echo Yedekleme log dosyası bulunamadı.
)
echo.

echo Kontrol tamamlandı!
pause