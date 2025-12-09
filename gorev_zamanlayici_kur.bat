@echo off
schtasks /create /tn "Chatbot Gunluk Yedekleme" /tr "C:\Users\berka\Downloads\chatbot\yedekle.bat" /sc daily /st 23:59 /f
echo Görev Zamanlayıcı ayarlandı. Her gun saat 23:59'da yedekleme yapılacak.
pause
