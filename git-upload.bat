@echo off
chcp 65001 >nul
echo =======================================================
echo  🌸 실버 배움터 - 깃허브(GitHub) 간편 업로드 도우미
echo =======================================================
echo 어르신 평생학습 사이트 코드를 본인의 깃허브에 편리하게 올리실 수 있습니다.
echo.
echo 1. 먼저 본인의 GitHub(https://github.com/eseo0032)에 접속하셔서
echo    새로운 저장소(Repository)를 만드셨는지 확인해 주세요.
echo 2. 새로 만드신 저장소(Repository)의 이름을 입력하고 엔터를 눌러주세요.
echo.
set /p REPO_NAME="▶ 저장소 이름 입력 (예: silver-edu): "

if "%REPO_NAME%"=="" (
    echo [오류] 저장소 이름이 입력되지 않았습니다. 다시 실행해 주세요.
    pause
    exit
)

echo.
echo -------------------------------------------------------
echo [진행 1/2] 원격 저장소 연결을 등록하는 중...
git remote remove origin >nul 2>&1
git remote add origin https://github.com/eseo0032/%REPO_NAME%.git
echo 연결 주소: https://github.com/eseo0032/%REPO_NAME%.git
echo.
echo [진행 2/2] 깃허브에 코드 업로드(Push) 시작...
echo (※ 최초 1회 깃허브 로그인 웹브라우저 창이 뜰 수 있습니다.)
echo -------------------------------------------------------
echo.
git push -u origin master

if %errorlevel% neq 0 (
    echo.
    echo ❌ 업로드 도중 오류가 발생했습니다.
    echo 1. 깃허브에 입력하신 이름의 저장소가 실제로 존재하는지 확인해 주세요.
    echo 2. 로그인 창이 떴을 때 인증에 성공했는지 확인해 주세요.
) else (
    echo.
    echo 🎉 업로드가 성공적으로 완료되었습니다!
    echo 본인의 깃허브 주소(https://github.com/eseo0032/%REPO_NAME%)에서 확인하실 수 있습니다.
)
echo.
pause
