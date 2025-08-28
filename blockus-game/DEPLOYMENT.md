# Blockus 游戏部署指南

## 部署到 Vercel

### 方法 1: 通过 Vercel CLI 部署

1. **安装 Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **登录 Vercel**
   ```bash
   vercel login
   ```

3. **在项目目录中部署**
   ```bash
   cd blockus-game
   vercel
   ```

4. **按照提示操作**
   - 选择项目名称
   - 选择团队（如果有）
   - 确认部署设置

### 方法 2: 通过 GitHub 自动部署

1. **将代码推送到 GitHub**
   ```bash
   git add .
   git commit -m "准备部署到 Vercel"
   git push origin main
   ```

2. **在 Vercel 中导入项目**
   - 访问 [vercel.com](https://vercel.com)
   - 点击 "New Project"
   - 选择 "Import Git Repository"
   - 选择你的 GitHub 仓库
   - 配置项目设置

3. **自动部署配置**
   - Framework Preset: `Create React App`
   - Build Command: `npm run build`
   - Output Directory: `build`
   - Install Command: `npm install`

### 方法 3: 手动上传构建文件

1. **构建项目**
   ```bash
   npm run build
   ```

2. **在 Vercel 中创建项目**
   - 选择 "Upload Template"
   - 上传 `build` 文件夹内容

## 部署配置说明

### vercel.json 配置

- **builds**: 指定构建配置，使用 `@vercel/static-build` 构建器
- **routes**: 配置路由规则，确保 SPA 应用正常工作
- **headers**: 设置静态资源缓存策略

### 环境变量（如果需要）

如果游戏需要任何环境变量，可以在 Vercel 项目设置中添加：

1. 进入项目设置
2. 选择 "Environment Variables"
3. 添加必要的环境变量

## 部署后检查

1. **功能测试**
   - 游戏是否正常加载
   - AI 玩家是否正常工作
   - 结算功能是否正常

2. **性能检查**
   - 页面加载速度
   - 游戏运行流畅度

3. **移动端适配**
   - 在不同设备上测试
   - 触摸操作是否正常

## 常见问题

### 1. 构建失败
- 检查 `package.json` 中的依赖版本
- 确保所有依赖都已安装

### 2. 路由问题
- 确保 `vercel.json` 中的路由配置正确
- 检查 SPA 路由是否正常工作

### 3. 静态资源加载失败
- 检查 `public` 文件夹中的资源
- 确保构建后的文件结构正确

## 更新部署

每次代码更新后：

1. **推送代码到 GitHub**
   ```bash
   git push origin main
   ```

2. **Vercel 会自动重新部署**
   - 如果配置了 GitHub 集成
   - 或者手动触发重新部署

## 自定义域名

1. 在 Vercel 项目设置中添加自定义域名
2. 配置 DNS 记录
3. 等待 DNS 传播完成

---

部署完成后，你的 Blockus 游戏就可以在互联网上访问了！🎮✨
