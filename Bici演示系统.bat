@echo off
chcp 65001 >nul
title AutoGrader 演示启动器
color 0A

echo ========================================================
echo     🚀 AutoGrader 演示环境自动部署工具
echo ========================================================
echo.

:: 1. 检查 Node.js 是否安装
echo [1/3] 检查 Node.js 环境...
node -v >nul 2>&1
if %errorlevel% neq 0 (
    color 0C
    echo.
    echo ❌ 错误：未检测到 Node.js！
    echo 请先下载并安装 Node.js (推荐 v18 或以上版本)
    echo 下载地址: https://nodejs.org/
    echo.
    pause
    exit
)
echo ✅ Node.js 已安装
echo.

:: 2. 自动安装依赖
echo [2/3] 正在检查并安装项目依赖 (首次运行需2-3分钟，请耐心等待)...
call npm install
if %errorlevel% neq 0 (
    color 0C
    echo.
    echo ❌ 依赖安装失败，请检查网络，或将报错发给队长！
    pause
    exit
)
echo ✅ 依赖安装成功
echo.

:: 3. 启动项目并打开浏览器
echo [3/3] 正在启动本地服务...
echo 🔗 浏览器将自动打开 http://localhost:3000
echo ⚠️ 录制视频时，请保持这个黑色窗口不要关闭！
echo.
start http://localhost:3000
call npm run dev

pause