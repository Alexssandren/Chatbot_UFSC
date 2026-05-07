@echo off
setlocal EnableExtensions
cd /d "%~dp0backend"

if not exist ".env" (
  echo [iniciar] Criando .env a partir de .env.example...
  copy /Y ".env.example" ".env" >nul
)

echo [iniciar] npm install...
call npm install
if errorlevel 1 (
  echo [iniciar] Falha no npm install.
  pause
  exit /b 1
)

echo [iniciar] prisma migrate deploy...
call npx prisma migrate deploy
if errorlevel 1 (
  echo [iniciar] migrate deploy falhou. Executando prisma generate...
  call npx prisma generate
  if errorlevel 1 (
    echo [iniciar] Falha no prisma generate.
    pause
    exit /b 1
  )
)

echo [iniciar] npm run dev...
call npm run dev
set "EXITCODE=%ERRORLEVEL%"
if not "%EXITCODE%"=="0" (
  echo [iniciar] Servidor encerrado com codigo %EXITCODE%.
  pause
)
exit /b %EXITCODE%
