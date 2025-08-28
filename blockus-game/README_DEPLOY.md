# 🚀 Blockus 游戏部署指南

## 📋 部署前准备

### 1. 确保项目已构建
```bash
# 在 blockus-game 目录中
npm install
npm run build
```

### 2. 检查构建结果
构建成功后，`build` 文件夹应包含：
- `index.html`
- `static/` 文件夹
- `manifest.json`
- `robots.txt`

## 🎯 部署方式

### 方式 1: 使用部署脚本（推荐）

#### Windows 用户
```bash
# 双击运行
deploy.bat
```

#### PowerShell 用户
```powershell
# 在 PowerShell 中运行
.\deploy.ps1
```

### 方式 2: 手动部署

#### 步骤 1: 安装 Vercel CLI
```bash
npm install -g vercel
```

#### 步骤 2: 登录 Vercel
```bash
vercel login
```

#### 步骤 3: 部署项目
```bash
# 在 blockus-game 目录中
vercel
```

### 方式 3: 通过 GitHub 自动部署

#### 步骤 1: 推送代码到 GitHub
```bash
git add .
git commit -m "准备部署到 Vercel"
git push origin main
```

#### 步骤 2: 在 Vercel 中导入项目
1. 访问 [vercel.com](https://vercel.com)
2. 点击 "New Project"
3. 选择 "Import Git Repository"
4. 选择你的 GitHub 仓库
5. 配置项目设置：
   - **Framework Preset**: `Create React App`
   - **Build Command**: `npm run build`
   - **Output Directory**: `build`
   - **Install Command**: `npm install`

### 方式 4: 手动上传构建文件

1. 访问 [vercel.com](https://vercel.com)
2. 点击 "New Project"
3. 选择 "Upload Template"
4. 上传 `build` 文件夹中的所有内容

## ⚙️ 部署配置

项目已包含 `vercel.json` 配置文件，自动处理：
- 构建配置
- 路由规则
- 静态资源缓存
- SPA 应用支持

## 🔍 部署后检查

### 功能测试
- [ ] 游戏正常加载
- [ ] AI 玩家正常工作
- [ ] 结算功能正常
- [ ] 移动端适配正常

### 性能检查
- [ ] 页面加载速度
- [ ] 游戏运行流畅度
- [ ] 静态资源加载

## 🚨 常见问题

### 构建失败
```bash
# 清理并重新安装
rm -rf node_modules package-lock.json
npm install
npm run build
```

### 部署失败
- 检查 `vercel.json` 配置
- 确保构建成功
- 检查网络连接

### 路由问题
- 确保 `vercel.json` 中的路由配置正确
- 检查 SPA 路由是否正常工作

## 📱 移动端优化

游戏已针对移动端进行优化：
- 触摸操作支持
- 响应式布局
- 移动端友好的 UI

## 🔄 更新部署

每次代码更新后：
1. 推送代码到 GitHub
2. Vercel 自动重新部署
3. 或手动触发重新部署

## 🌐 自定义域名

1. 在 Vercel 项目设置中添加自定义域名
2. 配置 DNS 记录
3. 等待 DNS 传播完成

## 📚 相关文档

- [Vercel 官方文档](https://vercel.com/docs)
- [Create React App 部署指南](https://create-react-app.dev/docs/deployment/)
- [项目详细说明](./README.md)

---

## 🎮 开始游戏

部署完成后，你的 Blockus 游戏就可以在互联网上访问了！

**游戏特色：**
- 🧩 经典拼图游戏
- 🤖 智能 AI 对手
- 🎯 策略性游戏玩法
- 📱 移动端友好
- 🏆 完整的游戏结算系统

**立即部署，开始游戏！** 🚀✨
