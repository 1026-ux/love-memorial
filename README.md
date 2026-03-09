# 我们的纪念日 · 情侣小站

纯前端情侣纪念网站：倒计时、相册、目标、留言、关于我们、位置与提醒；支持与对象实时同步（Firebase Firestore）。

---

## 一、部署到网上（Vercel）

1. 把本项目推送到 GitHub（若尚未推送）：
   ```bash
   cd love-memorial
   git add -A
   git commit -m "deploy"
   git push origin main
   ```
2. 打开 [vercel.com](https://vercel.com) → 用 GitHub 登录 → **Add New Project** → 选择 `love-memorial` 仓库 → 直接 **Deploy**。
3. 部署完成后会得到一个地址，例如 `xxx.vercel.app`，用这个地址在电脑和手机浏览器打开即可。

---

## 二、同步功能（与对象共享数据）

### 1. 先完成 Firebase 配置（只需做一次）

- 打开 [Firebase 控制台](https://console.firebase.google.com) → 选择项目 **ux-af71e**。
- 左侧 **Firestore Database** → 若无数据库则「创建数据库」（测试模式、选区域如 asia-east1）。
- 在 Firestore 的 **「规则」** 里粘贴并**发布**下面整段：

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /rooms/{roomId} {
      allow read, write: if true;
      match /photos/{photoId} {
        allow read, write: if true;
      }
    }
  }
}
```

- **不需要**开启 Storage，照片全部存在 Firestore 里。

### 2. 电脑上使用同步

- 打开网站（本地或 Vercel 地址），页面**顶部**会出现「与对象同步」横幅。
- 你点 **「生成配对码」**，把 6 位码发给对方。
- 对方在顶部输入**同一串码**，点 **「进入」**。
- 之后两人看到的相册、目标、留言、纪念日等都会实时同步。

### 3. 手机上使用同步

- 打开网站（Vercel 地址），点底部 **「更多」**。
- 在「更多」页**最上方**有 **「与对象同步」** 卡片。
- 在此输入对方的配对码点「输入配对码进入」，或点「生成配对码」把码发给对方即可。

### 4. 照片存储（配对后）

- 配对成功后，上传的照片会存到 Firestore，两人都能看到。
- 若上传失败，页面会提示原因（如体积过大、权限不足）；可换一张更小或更简单的图片重试。
- 若提示「没有写入权限」，请回到 Firebase 控制台确认 Firestore 规则已按上面发布。

---

## 三、本地运行

```bash
cd love-memorial
npx serve -l 3000
```

浏览器打开 http://localhost:3000 。

---

## 四、推送更新后让 Vercel 生效

每次改完代码，在项目目录执行：

```bash
git add -A
git commit -m "更新说明"
git push origin main
```

若 `git push` 因网络失败，稍后重试或换网络即可；推送成功后 Vercel 会自动重新部署，约 1～2 分钟生效。

---

更多细节见：`同步功能启用清单.md`、`FIREBASE-操作流程.md`。
