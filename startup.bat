@echo off
REM Startup script for Esports Tournament Website
REM Tries Docker Compose first; falls back to local npm scripts for FRONTEND and BACKEND

setlocal enabledelayedexpansion

echo === Starting Docker Containers (Redis, Zookeeper, Kafka) ===
docker compose up -d || docker-compose up -d

echo === Waiting for services to spin up... ===
timeout /t 5 /nobreak > nul

echo === Starting project components ===

REM Run BACKEND and FRONTEND locally using npm
REM Start BACKEND
if exist "CODE\BACKEND\package.json" (
  echo Starting BACKEND via npm (CODE\BACKEND)
  pushd "CODE\BACKEND"
  call npm install
  start "BACKEND" cmd /k "npm run dev || npm start"
  popd
else (
  echo BACKEND package.json not found at CODE\BACKEND\package.json
)

REM Start FRONTEND
if exist "CODE\FRONTEND\package.json" (
  echo Starting FRONTEND via npm (CODE\FRONTEND)
  pushd "CODE\FRONTEND"
  call npm install
  start "FRONTEND" cmd /k "npm run dev || npm start"
  popd
else (
  echo FRONTEND package.json not found at CODE\FRONTEND\package.json
)

REM Start Java Tournament Engine
if exist "CODE\JAVA-TOURNAMENT-ENGINE\pom.xml" (
  echo Starting Java Tournament Engine (CODE\JAVA-TOURNAMENT-ENGINE)
  pushd "CODE\JAVA-TOURNAMENT-ENGINE"
  REM Try to start via Maven (if mvn is available), otherwise try java -jar on built artifact
  start "JAVA_ENGINE" cmd /k "mvn spring-boot:run || (for %%F in (target\*.jar) do java -jar %%F)"
  popd
else (
  echo Java engine project not found at CODE\JAVA-TOURNAMENT-ENGINE\pom.xml
)

:done
echo Startup sequence finished.
endlocal
exit /b 0
