@echo off
chcp 65001 >nul
cd /d "%~dp0"

rem Егер жоба ішінде jdk папкасы болса, сол Java қолданылады (орнатусыз нұсқа)
set "JAVA=java"
set "JAVAC=javac"
for /d %%D in ("jdk*") do (
  if exist "%%D\bin\javac.exe" (
    set "JAVA=%%D\bin\java.exe"
    set "JAVAC=%%D\bin\javac.exe"
  )
)

rem javac болса — қайта компиляциялаймыз; болмаса дайын Server.class қолданылады
"%JAVAC%" -encoding UTF-8 -d . Server.java 2>nul
if not exist Server.class (
  echo.
  echo Java tabylmady. README.md faylyn qarańyz.
  pause
  exit /b
)
start "" http://localhost:8080
"%JAVA%" -cp . Server
pause
