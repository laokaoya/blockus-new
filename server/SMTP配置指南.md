# 邮箱验证码配置指南

按下面步骤操作即可。

---

## 方案一：Resend（推荐，无需 SMTP）

1. 注册 [Resend](https://resend.com)，获取 API Key
2. 在 `server/.env` 添加：
```env
RESEND_API_KEY=re_你的API密钥
RESEND_FROM=Blockus <onboarding@resend.dev>
```
3. 重启服务端

免费额度 100 封/天，发件人默认用 `onboarding@resend.dev`（测试用）。若验证了自有域名，可改为 `Blockus <noreply@你的域名.com>`。

---

## 方案二：SMTP（QQ/163/Gmail）

### 第一步：选一个邮箱获取授权码

### 方案 A：QQ 邮箱（推荐，简单）

1. 登录 [QQ 邮箱](https://mail.qq.com)
2. 点顶部 **设置** → **账户**
3. 找到 **POP3/IMAP/SMTP/Exchange/CardDAV/CalDAV服务**
4. 开启 **IMAP/SMTP服务** 或 **POP3/SMTP服务**
5. 按提示用手机发短信验证，会得到一串 **授权码**（16位，不是QQ密码）
6. 把这串授权码复制保存好

### 方案 B：163 邮箱

1. 登录 [163 邮箱](https://mail.163.com)
2. **设置** → **POP3/SMTP/IMAP**
3. 开启 **SMTP服务**
4. 按提示设置授权码并保存

### 方案 C：Gmail

1. 登录 Google 账号
2. 开启两步验证
3. **安全性** → **应用密码** → 生成新密码
4. 保存生成的 16 位密码

---

## 第二步：编辑 server/.env

在项目根目录下找到 `server` 文件夹，打开里面的 `.env` 文件（没有就复制 `.env.example` 并改名为 `.env`）。

在文件末尾加上下面几行（按你选的邮箱改）：

### 如果用 QQ 邮箱：

```env
SMTP_HOST=smtp.qq.com
SMTP_PORT=465
SMTP_USER=你的QQ号@qq.com
SMTP_PASS=刚才复制的16位授权码
SMTP_FROM=Blockus <你的QQ号@qq.com>
```

把 `你的QQ号@qq.com` 换成你的 QQ 邮箱，`SMTP_PASS` 换成第一步拿到的授权码。

### 如果用 163 邮箱：

```env
SMTP_HOST=smtp.163.com
SMTP_PORT=465
SMTP_USER=你的163邮箱@163.com
SMTP_PASS=你的授权码
SMTP_FROM=Blockus <你的163邮箱@163.com>
```

### 如果用 Gmail：

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=你的gmail@gmail.com
SMTP_PASS=应用专用密码
SMTP_FROM=Blockus <你的gmail@gmail.com>
```

---

## 第三步：重启服务端

保存 `.env` 后，在终端执行：

```bash
cd server
npm run dev
```

如果服务端之前已经在运行，先按 `Ctrl+C` 停止，再重新执行上面的命令。

---

## 第四步：测试

1. 打开前端页面，进入注册
2. 输入邮箱、密码等，点击「发送验证码」
3. 去邮箱收件箱（或垃圾箱）查看验证码
4. 输入验证码完成注册

---

## 常见问题

**Resend 验证码发不出去？**
- 确认 `RESEND_API_KEY` 和 `RESEND_FROM` 已在 `.env` 或部署平台环境变量中配置
- 部署平台（如 Render）：在 Environment 中添加 `RESEND_API_KEY`、`RESEND_FROM`
- 使用 `onboarding@resend.dev` 时，Resend 免费版可能限制收件人；建议在 [Resend 控制台](https://resend.com/domains) 添加并验证你的域名，再改用 `noreply@你的域名.com`
- 查看服务端启动日志中的 `Email: Resend` 确认配置已加载
- 查看 Resend 控制台 Logs 了解具体错误

**收不到邮件？**
- 检查垃圾箱
- 确认 QQ/163 的 SMTP 已开启
- 确认 SMTP_PASS 是授权码，不是登录密码

**报错：Authentication failed？**
- 检查 SMTP_USER 和 SMTP_PASS 是否正确
- QQ/163 必须用授权码，不能用登录密码

**端口 465 连不上？**
- 可尝试 587：`SMTP_PORT=587`
