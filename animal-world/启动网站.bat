@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo 正在启动动物世界...
echo.
npm run dev
pause
