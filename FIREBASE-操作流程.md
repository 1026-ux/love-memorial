# Firebase 操作流程（从零到同步可用）

按顺序做下面几步即可。

---

## 一、在 Firebase 控制台里做的

### 1. 打开控制台并创建项目

1. 打开：https://console.firebase.google.com  
2. 用 Google 账号登录  
3. 点击 **「创建项目」**（或「添加项目」）  
4. 输入项目名称（如「情侣纪念站」），下一步 → 可按需关闭 Google Analytics → 创建项目  

### 2. 创建 Web 应用并拿到配置

1. 在项目首页点击 **「</> 网页」**（或「添加应用」→ 选 Web）  
2. 注册应用昵称（可随便填），**不要**勾选「Firebase Hosting」→ 注册应用  
3. 页面上会有一段 `firebaseConfig = { ... }`，记下里面的：
   - `apiKey`
   - `authDomain`
   - `projectId`
   - `storageBucket`
   - `messagingSenderId`
   - `appId`  
4. 打开你项目里的 **`firebase-config.js`**，把上面 6 个值按顺序替换掉里面的 `YOUR_xxx`，保存文件  

### 3. 开启 Firestore

1. 左侧菜单点 **「Firestore Database」**  
2. 点击 **「创建数据库」**  
3. 选 **「在测试模式下启动」**（先让读写可用）→ 下一步  
4. 选一个离你近的位置（如 `asia-east1`）→ 启用  

### 4. 开启 Storage

1. 左侧菜单点 **「Storage」**  
2. 点击 **「开始使用」**  
3. 规则选 **「在测试模式下启动」** → 下一步  
4. 选和 Firestore 相同或就近的位置 → 完成  

### 5. 配置规则（二选一）

**方式 A：用命令行部署（推荐）**

1. 在电脑上打开 **PowerShell**，进入项目目录：
   ```powershell
   cd "c:\Users\冉梦宇\love-memorial"
   ```
2. 登录 Firebase（会打开浏览器）：
   ```powershell
   npx firebase-tools login
   ```
3. 关联当前项目（把下面的 `你的项目ID` 换成 `firebase-config.js` 里的 `projectId`）：
   ```powershell
   npx firebase-tools use 你的项目ID
   ```
4. 部署 Firestore 和 Storage 规则：
   ```powershell
   npx firebase-tools deploy --only firestore,storage
   ```
   看到 “Deploy complete” 就说明规则已生效。

**方式 B：在网页里手动粘贴规则**

1. **Firestore 规则**  
   控制台 → 你的项目 → **Firestore Database** → 上方 **「规则」**  
   打开项目里的 **`firestore.rules`** 文件，全选复制，粘贴到网页规则编辑器里 → **发布**  

2. **Storage 规则**  
   控制台 → **Storage** → 上方 **「规则」**  
   打开项目里的 **`storage.rules`** 文件，全选复制，粘贴到网页规则编辑器里 → **发布**  

---

## 二、在网站里做的（和对象一起用）

1. 用浏览器打开你的纪念站（本地或 Vercel 地址都可以）  
2. 若顶部出现 **「与对象同步」**，说明 Firebase 已接好  
3. **你先操作**：点 **「生成配对码」**，得到 6 位码（如 `a1b2c3`），把这段码发给对方  
4. **对方操作**：在顶部输入框输入**同一串 6 位码**，点 **「进入」**  
5. 之后两人看到的相册、目标、留言、纪念日等都会是同一份，并会实时同步  

---

## 三、常见问题

| 情况 | 处理 |
|------|------|
| 网站顶部没有「与对象同步」 | 检查 `firebase-config.js` 里的 `projectId` 是否已改成真实项目 ID（不能是 `YOUR_PROJECT_ID`） |
| 控制台报 Firestore/Storage 权限错误 | 按「一、5」再做一遍规则（命令行部署或手动粘贴并发布） |
| 对方输入配对码后没数据 | 你先点一次「生成配对码」创建房间，再把码发给对方；对方用同一码「进入」 |

---

**简要顺序：**  
控制台建项目 → 添加 Web 应用 → 复制配置到 `firebase-config.js` → 开启 Firestore 和 Storage → 部署/粘贴规则 → 打开网站生成配对码 → 对方输入同一码进入。
