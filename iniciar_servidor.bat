@echo off
TITLE SmartFix Server
echo Iniciando servidor de SmartFix...

:: Configurar la ruta de Node.js portable
set "NODE_PATH=%LOCALAPPDATA%\Programs\node-v20.18.1-win-x64"
set "PATH=%NODE_PATH%;%PATH%"

:: Cambiar al directorio del script
cd /d "%~dp0"

:: Verificar si Node existe
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] No se pudo encontrar Node.js en la ruta especificada.
    echo Ruta buscada: %NODE_PATH%
    pause
    exit /b
)

:: Iniciar el servidor
echo Servidor activo en http://localhost:3000
node server.js

pause
