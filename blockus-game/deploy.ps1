# Blockus 游戏部署到 Vercel
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Blockus 游戏部署到 Vercel" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. 检查 Node.js 和 npm
Write-Host "1. 检查 Node.js 和 npm..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    $npmVersion = npm --version
    Write-Host "✓ Node.js: $nodeVersion" -ForegroundColor Green
    Write-Host "✓ npm: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ 请先安装 Node.js 和 npm" -ForegroundColor Red
    exit 1
}
Write-Host ""

# 2. 安装依赖
Write-Host "2. 安装依赖..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ 依赖安装失败" -ForegroundColor Red
    exit 1
}
Write-Host "✓ 依赖安装完成" -ForegroundColor Green
Write-Host ""

# 3. 构建项目
Write-Host "3. 构建项目..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ 构建失败" -ForegroundColor Red
    exit 1
}
Write-Host "✓ 构建成功" -ForegroundColor Green
Write-Host ""

# 4. 检查构建结果
Write-Host "4. 检查构建结果..." -ForegroundColor Yellow
if (Test-Path "build\index.html") {
    Write-Host "✓ 构建文件已准备就绪" -ForegroundColor Green
    Write-Host ""
    
    # 5. 部署选项
    Write-Host "5. 选择部署方式：" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "A) 通过 Vercel CLI 部署" -ForegroundColor Cyan
    Write-Host "B) 通过 GitHub 自动部署" -ForegroundColor Cyan
    Write-Host "C) 手动上传构建文件" -ForegroundColor Cyan
    Write-Host ""
    
    $choice = Read-Host "请选择 (A/B/C)"
    
    switch ($choice.ToUpper()) {
        "A" {
            Write-Host ""
            Write-Host "正在安装 Vercel CLI..." -ForegroundColor Yellow
            npm install -g vercel
            Write-Host ""
            Write-Host "请按照提示登录和配置..." -ForegroundColor Yellow
            vercel
        }
        "B" {
            Write-Host ""
            Write-Host "请按照以下步骤操作：" -ForegroundColor Yellow
            Write-Host "1. 将代码推送到 GitHub" -ForegroundColor White
            Write-Host "2. 在 Vercel.com 中导入项目" -ForegroundColor White
            Write-Host "3. 配置自动部署" -ForegroundColor White
            Write-Host ""
            Write-Host "详细说明请查看 DEPLOYMENT.md" -ForegroundColor Cyan
        }
        "C" {
            Write-Host ""
            Write-Host "构建文件已准备就绪！" -ForegroundColor Green
            Write-Host "请访问 https://vercel.com" -ForegroundColor Cyan
            Write-Host "选择 'Upload Template' 并上传 build 文件夹内容" -ForegroundColor White
        }
        default {
            Write-Host "无效选择，请重新运行脚本" -ForegroundColor Red
        }
    }
} else {
    Write-Host "✗ 构建失败！请检查错误信息" -ForegroundColor Red
}

Write-Host ""
Write-Host "部署完成！详细说明请查看 DEPLOYMENT.md" -ForegroundColor Green
Read-Host "按回车键退出"
