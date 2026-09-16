@echo off
echo Cleaning local Android build caches...

if exist "padcommand.apk" del /f /q "padcommand.apk"
if exist "dist" rd /s /q "dist"
if exist "android\build" rd /s /q "android\build"
if exist "android\app\build\intermediates" rd /s /q "android\app\build\intermediates"
if exist "android\app\build\tmp" rd /s /q "android\app\build\tmp"
if exist "android\app\build\kotlin" rd /s /q "android\app\build\kotlin"
if exist "android\app\build\generated" rd /s /q "android\app\build\generated"
if exist "android\app\.cxx" rd /s /q "android\app\.cxx"
if exist "android\.gradle" rd /s /q "android\.gradle"

echo Clean complete!
