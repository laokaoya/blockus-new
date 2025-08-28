@echo off
echo ========================================
echo Blockus 游戏部署到 Vercel
echo ========================================
echo.

echo 1. 检查 Node.js 和 npm...
node --version
npm --version
echo.

echo 2. 安装依赖...
npm install
echo.

echo 3. 构建项目...
npm run build
echo.

echo 4. 检查构建结果...
if exist "build\index.html" (
    echo ✓ 构建成功！
    echo.
    echo 5. 部署到 Vercel...
    echo 请选择部署方式：
    echo.
    echo A) 通过 Vercel CLI 部署
    echo B) 通过 GitHub 自动部署
    echo C) 手动上传构建文件
    echo.
    set /p choice="请选择 (A/B/C): "
    
    if /i "%choice%"=="A" (
        echo.
        echo 正在安装 Vercel CLI...
        npm install -g vercel
        echo.
        echo 请按照提示登录和配置...
        vercel
    ) else if /i "%choice%"=="B" (
        echo.
        echo 请按照以下步骤操作：
        echo 1. 将代码推送到 GitHub
        echo 2. 在 Vercel.com 中导入项目
        echo 3. 配置自动部署
        echo.
        echo 详细说明请查看 DEPLOYMENT.md
    ) else if /i "%choice%"=="C" (
        echo.
        echo 构建文件已准备就绪！
        echo 请访问 https://vercel.com
        echo 选择 "Upload Template" 并上传 build 文件夹内容
    ) else (
        echo 无效选择，请重新运行脚本
    )
) else (
    echo ✗ 构建失败！请检查错误信息
)

echo.
echo 部署完成！详细说明请查看 DEPLOYMENT.md
pause
