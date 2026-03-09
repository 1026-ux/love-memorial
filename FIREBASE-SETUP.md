# Firebase 同步 - 使用说明

## 你已经配置好 Firebase 后

1. **打开网站**  
   顶部会出现「与对象同步」横幅。

2. **你（先打开的一方）**  
   点击 **「生成配对码」**，会得到一串 6 位码（如 `a1b2c3`），把这段码发给对方。

3. **对方**  
   在顶部输入框里输入**同一串 6 位码**，点击 **「进入」**。

4. **之后**  
   两人看到的是同一份数据，你上传的照片、写的目标/留言等都会实时同步到对方页面。

---

## 一键部署 Firestore 和 Storage 规则（推荐）

**方式一：用脚本（推荐）**

1. 确保 `firebase-config.js` 里已填写真实的 `projectId`（不是 `YOUR_PROJECT_ID`）。
2. 在项目根目录 `c:\Users\冉梦宇\love-memorial` 打开 **PowerShell**，执行一次登录（会打开浏览器）：
   ```powershell
   npx firebase-tools login
   ```
3. 然后任选一种方式部署规则：
   - **PowerShell**：`.\deploy-firebase-rules.ps1`
   - **命令提示符**：双击运行 `deploy-firebase-rules.bat`，或在 cmd 里执行 `deploy-firebase-rules.bat`
4. 若提示“未关联项目”，在项目目录执行：
   ```powershell
   npx firebase-tools use --add
   ```
   按提示选择或输入你的 Firebase 项目 ID（与 `firebase-config.js` 里的 `projectId` 一致），保存后再重新运行上面的脚本或 bat。

**方式二：手动命令**

在项目根目录打开终端，按顺序执行：

```powershell
npx firebase-tools login
npx firebase-tools use 你的项目ID
npx firebase-tools deploy --only firestore,storage
```

---

## 若不想用命令行，手动粘贴规则

1. **Firestore**  
   打开 [Firebase 控制台](https://console.firebase.google.com) → 你的项目 → **Firestore Database** → **规则**  
   把本仓库里 `firestore.rules` 文件的全部内容粘贴进去，点击 **发布**。

2. **Storage**  
   控制台 → **Storage** → **规则**  
   把 `storage.rules` 文件的全部内容粘贴进去，点击 **发布**。

---

## 若网站控制台报权限错误

说明规则还没生效，请按上面「一键部署」或「手动粘贴规则」做一遍，保存后刷新网站再试。
