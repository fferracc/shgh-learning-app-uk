@echo off
REM ================================================================
REM  Replaced 24 Sep 2026. The old version of this script deployed or
REM  built the app WITHOUT telling the phones, so they never updated.
REM  Every release now goes through publish_update.ps1, which updates
REM  the web version AND every phone. See UPDATES.md.
REM ================================================================
cd /d "%~dp0"
echo.
echo  Before running: raise versionCode and versionName in android\app\build.gradle.
echo  This builds a new APK and publishes an update to every phone running the app,
echo  and to the web version, in one step.
echo.
set /p NOTES=What changed? (a few words, then Enter): 
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0publish_update.ps1" -Notes "%NOTES%" -BuildApk
echo.
pause
