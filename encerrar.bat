@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"

set "PORT=%~1"
if "%PORT%"=="" set "PORT=3001"

echo [encerrar] Finalizando processos escutando na porta %PORT% (LISTENING)...

set "FOUND="
for /f "tokens=*" %%L in ('netstat -ano 2^>nul ^| findstr LISTENING ^| findstr ":%PORT%"') do (
  set "LINE=%%L"
  set "PID="
  for %%p in (!LINE!) do set "PID=%%p"
  if defined PID (
    set "FOUND=1"
    echo   Encerrando PID !PID! ...
    taskkill /PID !PID! /F >nul 2>&1
    if errorlevel 1 (
      echo [encerrar] Falha ao encerrar PID !PID!. Tente executar o CMD como Administrador.
    )
  )
)

if not defined FOUND (
  echo [encerrar] Nenhuma linha LISTENING encontrada para a porta %PORT%.
)

echo [encerrar] Concluido.
pause
