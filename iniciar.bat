@echo off
setlocal EnableExtensions

echo ===================================================
echo [iniciar] Iniciando o Frontend em uma nova janela...
echo ===================================================
cd /d "%~dp0frontend"
if not exist "node_modules" (
  echo [iniciar] Instalando dependencias do frontend...
  call npm install
)
start "ValidaCert - Frontend" cmd /c "npm run dev"

echo ===================================================
echo [iniciar] Configurando e iniciando o Backend...
echo ===================================================
cd /d "%~dp0backend"

if not exist ".env.example" (
  echo [iniciar] ERRO: backend\.env.example nao encontrado.
  echo [iniciar] Restaure o arquivo ou copie as variaveis do README do backend.
  pause
  exit /b 1
)

findstr /B /C:"DATABASE_URL=" ".env" >nul 2>&1
if errorlevel 1 (
  echo [iniciar] Criando .env a partir de .env.example...
  copy /Y ".env.example" ".env" >nul
  if errorlevel 1 (
    echo [iniciar] Falha ao copiar .env.example para .env
    pause
    exit /b 1
  )
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

echo [iniciar] Verificando dados iniciais (seed se banco vazio)...
call npx tsx prisma/seed-if-empty.ts
if errorlevel 1 (
  echo [iniciar] Falha ao preparar dados iniciais.
  pause
  exit /b 1
)

echo [iniciar] npm run dev (Backend)...
call npm run dev
set "EXITCODE=%ERRORLEVEL%"
if not "%EXITCODE%"=="0" (
  echo [iniciar] Servidor encerrado com codigo %EXITCODE%.
  pause
)
exit /b %EXITCODE%
