@echo off
setlocal enabledelayedexpansion
title GeoTopics - dev server (red local)

cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js no esta instalado o no esta en el PATH.
  echo Instalalo desde https://nodejs.org y vuelve a ejecutar este archivo.
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo Instalando dependencias ^(primera vez^)...
  call npm install
  if errorlevel 1 (
    echo [ERROR] Fallo npm install.
    pause
    exit /b 1
  )
)

set "PORT=3000"

rem --- IP local de esta maquina en el wifi/LAN ---
rem Esta PC tiene muchas interfaces virtuales con IPs 169.254.x (APIPA, sin red
rem real) que aparecen antes que la buena en `ipconfig`. Pedimos la IP por ruta
rem activa: la que Windows usaria para salir a internet es la del wifi real.
set "LANIP="
for /f "usebackq delims=" %%A in (`powershell -NoProfile -Command "(Get-NetIPConfiguration | Where-Object { $_.IPv4DefaultGateway -and $_.NetAdapter.Status -eq 'Up' } | Select-Object -First 1).IPv4Address.IPAddress"`) do set "LANIP=%%A"
if not defined LANIP set "LANIP=<no detectada - mira 'ipconfig'>"

echo.
echo ============================================================
echo   Sitio disponible en la red local
echo ------------------------------------------------------------
echo   En esta PC:        http://localhost:%PORT%
echo   Desde el celular:  http://%LANIP%:%PORT%
echo ------------------------------------------------------------
echo   El otro dispositivo debe estar en el MISMO wifi.
echo   Si no carga, es el Firewall de Windows: ver README abajo.
echo   Ctrl+C para detener.
echo ============================================================
echo.

rem Espera ~5s antes de abrir el navegador. `ping` a loopback es mas portable
rem que `timeout`, que falla si la consola no es interactiva.
start "" /b cmd /c "ping -n 6 127.0.0.1 >nul & start "" http://localhost:%PORT%"

rem -H 0.0.0.0 hace que Next escuche en todas las interfaces, no solo en localhost.
call npm run dev -- -H 0.0.0.0 -p %PORT%

echo.
echo El servidor se detuvo.
pause
