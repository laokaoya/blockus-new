# Firebase 项目配置说明

## 问题：`Firebase ID token has incorrect "aud" (audience) claim`

当出现 `Expected "blockus-dev" but got "blockus-14f38"` 时，说明：

- **前端**（blockus-game）使用的 Firebase 项目是 `blockus-14f38`
- **服务端**（server）的 Firebase Admin 使用的是 `blockus-dev` 的 Service Account

两者不一致会导致 token 验证失败，用户无法正确登录，表现为：
- Socket 连接显示 `(user: anonymous)`
- 昵称不同步到天梯和 Profile
- 登录状态异常

## 解决方法

**服务端必须使用与前端相同的 Firebase 项目的 Service Account。**

### 步骤

1. 打开 [Firebase Console](https://console.firebase.google.com/)
2. 选择项目 **blockus-14f38**（与前端一致）
3. 点击 ⚙️ **项目设置** → **服务账号**
4. 点击 **生成新的私钥**
5. 下载的 JSON 文件内容即为 Service Account 凭证
6. 在 Render / 本地 `.env` 中配置：
   ```env
   FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"blockus-14f38",...}
   ```
   将整段 JSON 压缩成一行，作为环境变量值

7. 重启服务端

### 验证

重启后，日志中应不再出现 `incorrect "aud" (audience) claim`，Socket 连接应显示实际用户 ID 而非 `anonymous`。
