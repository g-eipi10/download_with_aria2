@ECHO OFF
PUSHD %~DP0
:Code
ECHO Auto build script for extension ^<Download with Aria2^>
ECHO 1. Chromium
ECHO 2. Firefox
SET /P Option=Build for: 
IF %Option% EQU 1 SET Code=Chromium
IF %Option% EQU 2 SET Code=Firefox
IF NOT DEFINED Code CLS && GOTO :Code
IF NOT EXIST 7z.exe GOTO :Exit
FOR /F "USEBACKQ SKIP=3 TOKENS=1,2 DELIMS=,: " %%I IN ("%~DP0%Code%\manifest.json") DO (
	IF "%%~I"=="version" (
        SET Zip=%~DP0%Code%-%%~J.zip
        GOTO :Build
    )
)
:Build
%~DP07z.exe a %Zip% %~DP0Common\* %~DP0%Code%\*
GOTO :EXIT
:Exit
ECHO.
ECHO.
PING 127.0.0.1 -n 3 >NUL
ECHO %Code% build completed
PING 127.0.0.1 -n 3 >NUL
EXIT
