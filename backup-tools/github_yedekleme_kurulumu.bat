@echo off
echo ========================================
echo Chatbot GitHub Yedekleme Kurulum Sihirbazi
echo ========================================
echo.

:: Kullanıcı adını al
set /p GITHUB_KULLANICI="GitHub kullanıcı adınızı girin: "

:: Depo adını al
set /p DEPO_ADI="GitHub depo adını girin (varsayılan: chatbot-yedekleme): "
if "%DEPO_ADI%"=="" set DEPO_ADI=chatbot-yedekleme

:: Proje klasörünü kontrol et
set PROJE_KLASORU=%CD%
echo.
echo Proje klasörü: %PROJE_KLASORU%
echo.

:: Git deposunu kontrol et
if not exist ".git" (
    echo Git deposu oluşturuluyor...
    git init
    echo Git deposu oluşturuldu.
) else (
    echo Git deposu zaten mevcut.
)

:: Remote bağlantısını kontrol et
git remote -v | findstr "origin" >nul
if %errorlevel% neq 0 (
    echo.
    echo GitHub remote bağlantısı kuruluyor...
    git remote add origin https://github.com/%GITHUB_KULLANICI%/%DEPO_ADI%.git
    echo Remote bağlantısı kuruldu: https://github.com/%GITHUB_KULLANICI%/%DEPO_ADI%.git
) else (
    echo GitHub remote bağlantısı zaten mevcut.
)

:: yedekle.bat dosyasını güncelle
echo.
echo yedekle.bat dosyası güncelleniyor...
(
echo @echo off
echo setlocal enabledelayedexpansion
echo.
echo :: Değişkenleri ayarla
echo set PROJE_KLASORU=%PROJE_KLASORU%
echo set GITHUB_KULLANICI=%GITHUB_KULLANICI%
echo set DEPO_ADI=%DEPO_ADI%
echo set TARIH=%%date:~-4%%-%%date:~4,2%%-%%date:~7,2%%
echo.
echo :: Log dosyası oluştur
echo echo [%%time%%] Yedekleme baslatildi ^>^> %%PROJE_KLASORU%%\yedekleme.log
echo.
echo :: GitHub'da depo yoksa oluştur
echo cd /d %%PROJE_KLASORU%%
echo if not exist ".git" ^(
echo     echo [%%time%%] Git deposu初始化 ediliyor ^>^> %%PROJE_KLASORU%%\yedekleme.log
echo     git init
echo     git remote add origin https://github.com/%%GITHUB_KULLANICI%%/%%DEPO_ADI%%.git
echo ^)
echo.
echo :: Tüm dosyaları ekle ve commit yap
echo echo [%%time%%] Dosyalar yukleniyor ^>^> %%PROJE_KLASORU%%\yedekleme.log
echo git add .
echo git commit -m "Otomatik yedekleme - %%TARIH%%"
echo.
echo :: GitHub'a gönder
echo echo [%%time%%] GitHub'a yukleniyor ^>^> %%PROJE_KLASORU%%\yedekleme.log
echo git push origin main
echo.
echo echo [%%time%%] Yedekleme tamamlandi ^>^> %%PROJE_KLASORU%%\yedekleme.log
echo echo Yedekleme basariyla tamamlandi!
) > yedekle.bat

echo yedekle.bat dosyası güncellendi.
echo.

:: İlk yedeklemeyi yap
echo İlk yedekleme yapılıyor...
git add .
git commit -m "Kurulum tamamlandı - %date% %time%"
echo.
echo İlk yedekleme tamamlandı.
echo.

:: Görev Zamanlayıcı için script oluştur
echo Görev Zamanlayıcı kurulum script'i oluşturuluyor...
(
echo @echo off
echo schtasks /create /tn "Chatbot Gunluk Yedekleme" /tr "%PROJE_KLASORU%\yedekle.bat" /sc daily /st 23:59 /f
echo echo Görev Zamanlayıcı ayarlandı. Her gun saat 23:59'da yedekleme yapılacak.
echo pause
) > gorev_zamanlayici_kur.bat

echo gorev_zamanlayici_kur.bat dosyası oluşturuldu.
echo.

echo ========================================
echo KURULUM TAMAMLANDI!
echo ========================================
echo.
echo Yapılan işlemler:
echo 1. Git deposu hazırlandı
echo 2. GitHub remote bağlantısı kuruldu: https://github.com/%GITHUB_KULLANICI%/%DEPO_ADI%
echo 3. yedekle.bat dosyası güncellendi
echo 4. İlk yedekleme yapıldı
echo 5. Görev Zamanlayıcı kurulum script'i hazırlandı
echo.
echo SONRAKİ ADIMLAR:
echo 1. GitHub'da "%DEPO_ADI%" adında bir depo oluşturun
echo 2. gorev_zamanlayici_kur.bat dosyasını yönetici olarak çalıştırın
echo 3. Her gun saat 23:59'da otomatik yedekleme başlayacak
echo.
echo Manuel yedekleme için: yedekle.bat dosyasını çalıştırın
echo.
pause