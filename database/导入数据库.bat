@echo off
chcp 936 >nul
cd /d "%~dp0"
echo Importing animal_world database...
echo Enter MySQL root password when prompted. Press Enter if no password.
echo.
mysql -u root -p < init-mysql.sql
if %ERRORLEVEL% EQU 0 (
    echo.
    echo OK. Database imported successfully.
) else (
    echo.
    echo Failed. Check: 1 MySQL running 2 mysql in PATH
)
pause
