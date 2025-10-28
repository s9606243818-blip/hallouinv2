@echo off
echo ================================
echo   Multiplayer Card Game Setup
echo ================================
echo.

echo [1/3] Установка зависимостей...
call npm install

echo.
echo [2/3] Создание папки для аватаров...
if not exist "public\avatars" mkdir "public\avatars"

echo.
echo [3/3] Готово!
echo.
echo ================================
echo   Запуск сервера...
echo ================================
echo.
echo Сервер будет доступен на http://localhost:3000
echo.
pause
call npm start
