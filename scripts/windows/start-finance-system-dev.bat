@echo off
setlocal EnableExtensions
rem 仓库根目录 = 本脚本所在 scripts\windows 的上两级
pushd "%~dp0..\.." || exit /b 1
if not exist "package.json" (
  echo [FinanceSystem] 未找到 package.json，请确认快捷方式指向的仓库完整。
  pause
  exit /b 1
)

echo [FinanceSystem] 将打开新窗口运行 pnpm run dev，请勿关闭该窗口。
echo [FinanceSystem] 数秒后会在默认浏览器中打开 http://127.0.0.1:5173/
start "FinanceSystem pnpm dev" cmd /k "pnpm run dev"

timeout /t 8 /nobreak >nul
start "" "http://127.0.0.1:5173/"

popd
endlocal
