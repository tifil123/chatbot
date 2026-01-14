@echo off
setlocal enabledelayedexpansion

:: ==========================================
:: Chatbot Proje Yedekleme Sistemi v2.0
:: ==========================================

:: Konfigürasyon yükle
call :loadConfig

:: Parametre kontrolü
if "%1"=="--help" goto :showHelp
if "%1"=="--install" goto :installScheduler
if "%1"=="--uninstall" goto :uninstallScheduler
if "%1"=="--check" goto :checkStatus
if "%1"=="--status" goto :showDetailedStatus
if "%1"=="--config" goto :showConfig

:: Ana yedekleme işlemi
call :backupProject
goto :eof

:: ==========================================
:: Konfigürasyon Yükleme
:: ==========================================
:loadConfig
    :: Varsayılan değerler
    set "SCRIPT_DIR=%~dp0"
    set "PROJE_KLASORU=%SCRIPT_DIR%.."
    set "GITHUB_KULLANICI=tifil123"
    set "DEPO_ADI=chatbot-yedekleme"
    set "LOG_DOSYASI=%PROJE_KLASORU%\yedekleme.log"
    set "ERROR_LOG=%PROJE_KLASORU%\yedekleme_hata.log"
    set "CONFIG_FILE=%PROJE_KLASORU%\backup-config.ini"
    set "BACKUP_BRANCH=main"
    set "COMMIT_PREFIX=Otomatik yedekleme"
    set "MAX_LOG_SIZE=10MB"
    set "BACKUP_RETENTION_DAYS=30"
    
    :: Konfigürasyon dosyası varsa yükle
    if exist "%CONFIG_FILE%" (
        call :log "INFO" "Konfigürasyon dosyası okunuyor: %CONFIG_FILE%"
        for /f "usebackq tokens=1,2 delims==" %%a in ("%CONFIG_FILE%") do (
            if not "%%a"=="" if not "%%b"=="" (
                set "%%a=%%b"
                call :log "DEBUG" "Konfigürasyon: %%a=%%b"
            )
        )
    ) else (
        call :log "INFO" "Konfigürasyon dosyası bulunamadı, varsayılan değerler kullanılıyor"
        call :createDefaultConfig
    )
goto :eof

:: ==========================================
:: Varsayılan Konfigürasyon Oluştur
:: ==========================================
:createDefaultConfig
    echo [GENERAL] > "%CONFIG_FILE%"
    echo PROJE_KLASORU=%PROJE_KLASORU% >> "%CONFIG_FILE%"
    echo GITHUB_KULLANICI=%GITHUB_KULLANICI% >> "%CONFIG_FILE%"
    echo DEPO_ADI=%DEPO_ADI% >> "%CONFIG_FILE%"
    echo BACKUP_BRANCH=%BACKUP_BRANCH% >> "%CONFIG_FILE%"
    echo COMMIT_PREFIX=%COMMIT_PREFIX% >> "%CONFIG_FILE%"
    echo. >> "%CONFIG_FILE%"
    echo [LOGGING] >> "%CONFIG_FILE%"
    echo LOG_DOSYASI=%LOG_DOSYASI% >> "%CONFIG_FILE%"
    echo ERROR_LOG=%ERROR_LOG% >> "%CONFIG_FILE%"
    echo MAX_LOG_SIZE=%MAX_LOG_SIZE% >> "%CONFIG_FILE%"
    echo. >> "%CONFIG_FILE%"
    echo [SCHEDULER] >> "%CONFIG_FILE%"
    echo ENABLED=true >> "%CONFIG_FILE%"
    echo SCHEDULE=daily >> "%CONFIG_FILE%"
    echo TIME=23:59 >> "%CONFIG_FILE%"
    echo RETRY_COUNT=3 >> "%CONFIG_FILE%"
    echo. >> "%CONFIG_FILE%"
    echo [ADVANCED] >> "%CONFIG_FILE%"
    echo COMPRESSION=true >> "%CONFIG_FILE%"
    echo ENCRYPTION=false >> "%CONFIG_FILE%"
    echo BACKUP_RETENTION_DAYS=%BACKUP_RETENTION_DAYS% >> "%CONFIG_FILE%"
    
    call :log "INFO" "Varsayılan konfigürasyon dosyası oluşturuldu: %CONFIG_FILE%"
goto :eof

:: ==========================================
:: Ana Yedekleme Fonksiyonu
:: ==========================================
:backupProject
    call :log "INFO" "========== Yedekleme İşlemi Başlatılıyor =========="
    call :log "INFO" "Proje klasörü: %PROJE_KLASORU%"
    call :log "INFO" "GitHub deposu: %GITHUB_KULLANICI%/%DEPO_ADI%"
    call :log "INFO" "Branch: %BACKUP_BRANCH%"
    
    :: Proje klasörü kontrolü
    if not exist "%PROJE_KLASORU%" (
        call :log "ERROR" "Proje klasörü bulunamadı: %PROJE_KLASORU%"
        exit /b 1
    )
    
    cd /d "%PROJE_KLASORU%"
    
    :: Git deposu kontrolü ve hazırlığı
    call :prepareGitRepository
    if %errorlevel% neq 0 (
        call :log "ERROR" "Git deposu hazırlanamadı"
        exit /b 1
    )
    
    :: Değişiklikleri kontrol et
    call :checkForChanges
    if %errorlevel% equ 0 (
        call :log "INFO" "Yedeklenecek değişiklik bulunamadı"
        call :cleanupOldLogs
        call :log "INFO" "========== Yedekleme Tamamlandı =========="
        goto :backupComplete
    )
    
    :: Değişiklikleri yedekle
    call :commitAndPush
    if %errorlevel% neq 0 (
        call :log "ERROR" "Yedekleme gönderilemedi"
        exit /b 1
    )
    
    :backupComplete
    call :cleanupOldLogs
    call :log "INFO" "========== Yedekleme Başarıyla Tamamlandı =========="
    call :showSummary
goto :eof

:: ==========================================
:: Git Deposu Hazırlama
:: ==========================================
:prepareGitRepository
    call :log "INFO" "Git deposu hazırlanıyor..."
    
    :: Git kurulum kontrolü
    git --version >nul 2>&1
    if %errorlevel% neq 0 (
        call :log "ERROR" "Git kurulu değil. Lütfen önce Git'i kurun."
        exit /b 1
    )
    
    if not exist ".git" (
        call :log "INFO" "Git deposu oluşturuluyor..."
        git init >nul 2>&1
        if %errorlevel% neq 0 (
            call :log "ERROR" "Git deposu oluşturulamadı"
            exit /b 1
        )
        call :log "INFO" "Git deposu başarıyla oluşturuldu"
    )
    
    :: Remote kontrolü
    git remote -v | findstr "origin" >nul
    if %errorlevel% neq 0 (
        call :log "INFO" "GitHub remote bağlantısı kuruluyor..."
        git remote add origin https://github.com/%GITHUB_KULLANICI%/%DEPO_ADI%.git
        if %errorlevel% neq 0 (
            call :log "ERROR" "GitHub remote bağlantısı kurulamadı"
            exit /b 1
        )
        call :log "INFO" "GitHub remote bağlantısı kuruldu"
    ) else (
        call :log "DEBUG" "GitHub remote bağlantısı zaten mevcut"
    )
    
    :: Branch kontrolü
    git rev-parse --verify %BACKUP_BRANCH% >nul 2>&1
    if %errorlevel% neq 0 (
        call :log "INFO" "%BACKUP_BRANCH% branch'i oluşturuluyor..."
        git checkout -b %BACKUP_BRANCH% >nul 2>&1
        if %errorlevel% neq 0 (
            call :log "WARNING" "Branch oluşturulamadı, mevcut branch kullanılacak"
        )
    ) else (
        call :log "DEBUG" "%BACKUP_BRANCH% branch'i zaten mevcut"
        git checkout %BACKUP_BRANCH% >nul 2>&1
    )
goto :eof

:: ==========================================
:: Değişiklik Kontrolü
:: ==========================================
:checkForChanges
    call :log "DEBUG" "Değişiklikler kontrol ediliyor..."
    
    :: Untracked dosyaları kontrol et
    git ls-files --others --exclude-standard >nul 2>&1
    if %errorlevel% equ 0 (
        call :log "DEBUG" "Takip edilmeyen dosyalar bulundu"
        exit /b 1
    )
    
    :: Modified dosyaları kontrol et
    git diff --quiet >nul 2>&1
    if %errorlevel% neq 0 (
        call :log "DEBUG" "Değiştirilmiş dosyalar bulundu"
        exit /b 1
    }
    
    :: Staged değişiklikleri kontrol et
    git diff --cached --quiet >nul 2>&1
    if %errorlevel% neq 0 (
        call :log "DEBUG" "Staged değişiklikler bulundu"
        exit /b 1
    }
    
    call :log "DEBUG" "Değişiklik bulunamadı"
    exit /b 0

:: ==========================================
:: Commit ve Push
:: ==========================================
:commitAndPush
    set "TARIH=%date:~-4%-%date:~4,2%-%date:~7,2%"
    set "ZAMAN=%time:~0,2%:%time:~3,2%:%time:~6,2%"
    set "COMMIT_MSG=%COMMIT_PREFIX% - %TARIH% %ZAMAN%"
    
    call :log "INFO" "Değişikler hazırlanıyor..."
    git add -A >nul 2>&1
    if %errorlevel% neq 0 (
        call :log "ERROR" "Dosyalar eklenemedi"
        exit /b 1
    }
    
    call :log "INFO" "Değişikler commit ediliyor: %COMMIT_MSG%"
    git commit -m "%COMMIT_MSG%" >nul 2>&1
    if %errorlevel% neq 0 (
        call :log "WARNING" "Commit edilecek değişiklik yok"
        exit /b 0
    }
    
    call :log "INFO" "Değişikler GitHub'a gönderiliyor..."
    git push origin %BACKUP_BRANCH% >nul 2>&1
    if %errorlevel% neq 0 (
        call :log "ERROR" "GitHub'a gönderilemedi"
        call :log "INFO" "Lütfen internet bağlantınızı ve GitHub kimlik bilgilerinizi kontrol edin"
        exit /b 1
    }
    
    call :log "INFO" "Değişikler başarıyla GitHub'a gönderildi"
goto :eof

:: ==========================================
:: Görev Zamanlayıcı Kurulumu
:: ==========================================
:installScheduler
    call :log "INFO" "Görev Zamanlayıcı kuruluyor..."
    
    :: Mevcut görevi kontrol et
    schtasks /query /tn "Chatbot Yedekleme" >nul 2>&1
    if %errorlevel% equ 0 (
        echo Görev zaten mevcut. Güncellensin mi? (E/H)
        set /p choice=
        if /i "!choice!" neq "E" (
            call :log "INFO" "Görev güncellenmedi"
            goto :eof
        )
        call :log "INFO" "Mevcut görev kaldırılıyor..."
        schtasks /delete /tn "Chatbot Yedekleme" /f >nul 2>&1
    )
    
    :: Yeni görev oluştur
    set "TASK_PATH=%~f0"
    schtasks /create /tn "Chatbot Yedekleme" /tr "\"%TASK_PATH%\"" /sc daily /st 23:59 /f >nul 2>&1
    if %errorlevel% equ 0 (
        call :log "INFO" "Görev Zamanlayıcı başarıyla kuruldu"
        echo Her gün saat 23:59'da otomatik yedekleme yapılacak
        echo Manuel yedekleme için: "%~f0"
    ) else (
        call :log "ERROR" "Görev Zamanlayıcı kurulamadı"
        echo Lütfen yönetici olarak çalıştırın
    }
goto :eof

:: ==========================================
:: Görev Zamanlayıcı Kaldırma
:: ==========================================
:uninstallScheduler
    call :log "INFO" "Görev Zamanlayıcı kaldırılıyor..."
    schtasks /delete /tn "Chatbot Yedekleme" /f >nul 2>&1
    if %errorlevel% equ 0 (
        call :log "INFO" "Görev Zamanlayıcı kaldırıldı"
        echo Otomatik yedekleme durduruldu
    ) else (
        call :log "WARNING" "Görev bulunamadı veya kaldırılamadı"
    }
goto :eof

:: ==========================================
:: Durum Kontrolü
:: ==========================================
:checkStatus
    echo === Yedekleme Durumu ===
    echo.
    
    :: Git durumu
    echo Git Durumu:
    cd /d "%PROJE_KLASORU%" 2>nul
    if exist ".git" (
        git status --porcelain 2>nul
        if %errorlevel% equ 0 (
            echo   ✅ Temiz (yedeklenecek değişiklik yok)
        } else (
            echo   ⚠️ Değişiklikler var
        }
    ) else (
        echo   ❌ Git deposu bulunamadı
    }
    echo.
    
    :: Son commit'ler
    echo Son 5 Yedekleme:
    cd /d "%PROJE_KLASORU%" 2>nul
    if exist ".git" (
        git log --oneline -5 --grep="%COMMIT_PREFIX%" 2>nul || echo   Yedekleme geçmişi bulunamadı
    ) else (
        echo   Git deposu yok
    }
    echo.
    
    :: Görev durumu
    echo Görev Zamanlayıcı:
    schtasks /query /tn "Chatbot Yedekleme" 2>nul && echo   ✅ Aktif || echo   ❌ Pasif
    echo.
    
    :: Log özeti
    echo Log Özeti:
    if exist "%LOG_DOSYASI%" (
        findstr /C:"ERROR" "%LOG_DOSYASI%" >nul && echo   ❌ Hatalar var || echo   ✅ Hata yok
        for %%f in ("%LOG_DOSYASI%") do echo   📊 Log boyutu: %%~zf
    ) else (
        echo   📝 Log dosyası bulunamadı
    }
    echo.
goto :eof

:: ==========================================
:: Detaylı Durum
:: ==========================================
:showDetailedStatus
    call :checkStatus
    
    echo === Detaylı Bilgiler ===
    echo Proje Klasörü: %PROJE_KLASORU%
    echo GitHub Deposu: https://github.com/%GITHUB_KULLANICI%/%DEPO_ADI%
    echo Branch: %BACKUP_BRANCH%
    echo Log Dosyası: %LOG_DOSYASI%
    echo Hata Log'u: %ERROR_LOG%
    echo Konfigürasyon: %CONFIG_FILE%
    echo.
goto :eof

:: ==========================================
:: Konfigürasyon Göster
:: ==========================================
:showConfig
    echo === Mevcut Konfigürasyon ===
    if exist "%CONFIG_FILE%" (
        type "%CONFIG_FILE%"
    ) else (
        echo Konfigürasyon dosyası bulunamadı: %CONFIG_FILE%
    }
    echo.
goto :eof

:: ==========================================
:: Loglama Sistemi
:: ==========================================
:log
    set "LEVEL=%1"
    set "MESSAGE=%2"
    set "TIMESTAMP=%date% %time%"
    
    :: Konsola yaz
    echo [%TIMESTAMP%] [%LEVEL%] %MESSAGE%
    
    :: Log dosyasına yaz
    echo [%TIMESTAMP%] [%LEVEL%] %MESSAGE% >> "%LOG_DOSYASI%"
    
    :: Hata log'u
    if "%LEVEL%"=="ERROR" (
        echo [%TIMESTAMP%] [ERROR] %MESSAGE% >> "%ERROR_LOG%"
    }
goto :eof

:: ==========================================
:: Eski Log'ları Temizle
:: ==========================================
:cleanupOldLogs
    if not exist "%LOG_DOSYASI%" goto :eof
    
    :: Log boyutu kontrolü
    for %%f in ("%LOG_DOSYASI%") do set "LOG_SIZE=%%~zf"
    
    :: Log rotasyonu
    if exist "%LOG_DOSYASI%.old" del "%LOG_DOSYASI%.old"
    if %LOG_SIZE% GTR 10485760 (
        move "%LOG_DOSYASI%" "%LOG_DOSYASI%.old" >nul 2>&1
        call :log "INFO" "Log dosyası döndürüldü"
    }
goto :eof

:: ==========================================
:: Özet Gösterimi
:: ==========================================
:showSummary
    echo.
    echo === Yedekleme Özeti ===
    echo Proje: %PROJE_KLASORU%
    echo GitHub: %GITHUB_KULLANICI%/%DEPO_ADI%
    echo Branch: %BACKUP_BRANCH%
    echo Tarih: %date% %time%
    echo.
goto :eof

:: ==========================================
:: Yardım
:: ==========================================
:showHelp
    echo Chatbot Yedekleme Sistemi v2.0
    echo.
    echo Kullanım:
    echo   %~n0                    - Normal yedekleme
    echo   %~n0 --install          - Görev Zamanlayıcı kur
    echo   %~n0 --uninstall        - Görev Zamanlayıcı kaldır
    echo   %~n0 --check            - Durum kontrolü
    echo   %~n0 --status           - Detaylı durum
    echo   %~n0 --config           - Konfigürasyon göster
    echo   %~n0 --help             - Bu yardım
    echo.
    echo Konfigürasyon:
    echo   backup-config.ini dosyası oluşturarak ayarları özelleştirebilirsiniz
    echo.
    echo Örnek Konfigürasyon:
    echo   [GENERAL]
    echo   PROJE_KLASORU=C:\Projeler\Chatbot
    echo   GITHUB_KULLANICI=kullanici
    echo   DEPO_ADI=chatbot-backup
    echo.
    echo   [SCHEDULER]
    echo   TIME=02:00
    echo   SCHEDULE=weekly
goto :eof