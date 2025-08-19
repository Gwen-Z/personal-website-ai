# Turso 数据库设置指南

## 1. 安装 Turso CLI

在 macOS 上安装：
```bash
brew install turso
```

或者使用 curl：
```bash
curl -sSfL https://get.tur.so/install.sh | bash
```

## 2. 注册和登录

```bash
# 注册账户（如果没有的话）
turso auth signup

# 或者登录已有账户
turso auth login
```

## 3. 创建数据库

```bash
# 创建数据库
turso db create personal-website-data

# 查看数据库信息（获取 DATABASE_URL）
turso db show personal-website-data
```

复制输出中的 `URL` 字段，这就是你的 `TURSO_DATABASE_URL`。

## 4. 生成认证令牌

```bash
# 创建数据库访问令牌
turso db tokens create personal-website-data
```

复制输出的令牌，这就是你的 `TURSO_AUTH_TOKEN`。

## 5. 在 Vercel 中配置环境变量

1. 进入你的 Vercel 项目控制台
2. 点击 **Settings** → **Environment Variables**
3. 添加以下两个环境变量：

   - **Name**: `TURSO_DATABASE_URL`
     **Value**: `libsql://personal-website-data-[your-username].turso.io`

   - **Name**: `TURSO_AUTH_TOKEN`
     **Value**: `eyJ...` (刚才生成的令牌)

4. 点击 **Save**

## 6. 重新部署项目

环境变量配置完成后，触发重新部署：
- 推送代码到 GitHub 主分支，或
- 在 Vercel 控制台点击 **Deployments** → **Redeploy**

## 7. 测试连接

设置环境变量后测试：

```bash
# 设置本地测试环境变量
export VERCEL_API_URL="https://your-app.vercel.app"

# 运行测试
npm run test:vercel
```

## 8. 验证数据库

可以通过 Turso CLI 直接查看数据：

```bash
# 连接到数据库
turso db shell personal-website-data

# 查看表结构
.schema

# 查看数据
SELECT * FROM simple_records LIMIT 5;
SELECT * FROM raw_entries LIMIT 5;

# 退出
.quit
```

## 常见问题

### 1. 认证失败
确保环境变量中的 URL 和 TOKEN 正确无误，注意不要有多余的空格。

### 2. 找不到数据库
确认数据库名称正确：`turso db list` 查看所有数据库。

### 3. 权限错误
重新生成令牌：`turso db tokens create personal-website-data`

### 4. 本地测试连接
可以在项目根目录创建 `.env.local` 文件测试：
```
TURSO_DATABASE_URL=libsql://personal-website-data-xxx.turso.io
TURSO_AUTH_TOKEN=eyJ...
```

## 安全提示

- 永远不要将认证令牌提交到代码仓库
- 令牌具有数据库的完全访问权限，请妥善保管
- 可以随时通过 `turso db tokens revoke` 撤销令牌
