@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo 一键部署 Firestore 与 Storage 规则
echo.
echo 若尚未登录，请先在浏览器中完成登录。
echo 正在检查登录状态并部署...
echo.

npx --yes firebase-tools deploy --only firestore,storage
if errorlevel 1 (
  echo.
  echo 若提示未关联项目，请先运行: npx firebase-tools use --add
  echo 然后选择或输入你的 Firebase 项目 ID（与 firebase-config.js 里 projectId 一致）
  echo 再重新运行本脚本。
  pause
  exit /b 1
)

echo.
echo 部署完成。
pause
