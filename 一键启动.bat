@echo off
chcp 65001 >nul
title 彼此_Autograder 一键启动
color 0A

echo ================================================
echo     彼此_Autograder · 一键启动器
echo ================================================
echo.

rem 1. 检查 Node.js
node -v >nul 2>&1
if %errorlevel% neq 0 (
    color 0C
    echo [错误] 未检测到 Node.js！
    echo 请先安装 Node.js v18 或以上版本：
    echo https://nodejs.org/  （下载 LTS 版，一路下一步即可）
    echo.
    pause
    exit /b
)
echo [1/3] Node.js 环境正常
echo.

rem 2. 检查/安装依赖
if exist node_modules (
    echo [2/3] 依赖已就绪，跳过安装
) else (
    echo [2/3] 首次运行，正在安装依赖（约 2-3 分钟，请耐心等待）...
    call npm install
    if %errorlevel% neq 0 (
        color 0C
        echo [错误] 依赖安装失败，请检查网络后重试
        pause
        exit /b
    )
)
echo.

rem 3. 启动并打开浏览器
echo [3/3] 正在启动本地服务，浏览器将自动打开 http://localhost:3000
echo.
echo 提示：录屏期间请保持本窗口开启，关闭即停止服务。
echo.
start "" http://localhost:3000
call npx next dev -p 3000

pause
