@echo off
cd /d "%~dp0"
mysql -u root -p < init-mysql.sql
pause
