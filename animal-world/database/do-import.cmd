@echo off
cd /d "%~dp0"
mysql -u root -proot < init-mysql.sql
echo Done. Exit code: %ERRORLEVEL%
pause
