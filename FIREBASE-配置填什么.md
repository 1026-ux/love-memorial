# Firebase 配置具体填什么

## 一、Firebase 控制台里长什么样

添加 Web 应用后，页面会有一段类似下面的代码（**你的实际值会不一样**）：

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  authDomain: "my-love-app-12345.firebaseapp.com",
  projectId: "my-love-app-12345",
  storageBucket: "my-love-app-12345.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890"
};
```

你要做的就是把上面 **等号右边引号里的内容**，一个一个填到项目的 `firebase-config.js` 里。

---

## 二、具体对应关系（复制到 firebase-config.js）

| 控制台里的名字 | 控制台示例值 | 你复制后填到 firebase-config.js 的键 |
|----------------|-------------|--------------------------------------|
| apiKey | `"AIzaSyBxxxxxxxx..."` | 替换 `"YOUR_API_KEY"` |
| authDomain | `"my-love-app-12345.firebaseapp.com"` | 替换 `"YOUR_PROJECT_ID.firebaseapp.com"` 整段 |
| projectId | `"my-love-app-12345"` | 替换 `"YOUR_PROJECT_ID"`（两处：authDomain 和 storageBucket 里的项目名也一起改） |
| storageBucket | `"my-love-app-12345.appspot.com"` | 替换 `"YOUR_PROJECT_ID.appspot.com"` 整段 |
| messagingSenderId | `"123456789012"` | 替换 `"YOUR_SENDER_ID"` |
| appId | `"1:123456789012:web:abcdef..."` | 替换 `"YOUR_APP_ID"` |

---

## 三、填完后的 firebase-config.js 示例

假设你在控制台看到的是：

- apiKey: `AIzaSyC_abc123def456`
- authDomain: `love-memorial-xyz.firebaseapp.com`
- projectId: `love-memorial-xyz`
- storageBucket: `love-memorial-xyz.appspot.com`
- messagingSenderId: `987654321098`
- appId: `1:987654321098:web:aaaabbbbcccc`

那 `firebase-config.js` 里就应该是（**只改引号里的内容，键名不要动**）：

```javascript
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyC_abc123def456",
  authDomain: "love-memorial-xyz.firebaseapp.com",
  projectId: "love-memorial-xyz",
  storageBucket: "love-memorial-xyz.appspot.com",
  messagingSenderId: "987654321098",
  appId: "1:987654321098:web:aaaabbbbcccc"
};
```

---

## 四、你要复制的「具体东西」

在 Firebase 控制台「添加 Web 应用」后的页面里：

1. 找到 **apiKey** 后面引号里的那一串（很长），复制 → 贴到 `firebase-config.js` 的 `"YOUR_API_KEY"` 位置，保留引号。
2. 找到 **authDomain** 后面引号里的整串，复制 → 贴到 `"YOUR_PROJECT_ID.firebaseapp.com"` 那整段的位置。
3. 找到 **projectId** 后面引号里的（通常是英文+数字），复制 → 贴到 `"YOUR_PROJECT_ID"` 的位置（文件里有两处 YOUR_PROJECT_ID，都改成这个 projectId）。
4. 找到 **storageBucket** 后面引号里的整串，复制 → 贴到 `"YOUR_PROJECT_ID.appspot.com"` 那整段的位置。
5. 找到 **messagingSenderId** 后面引号里的数字，复制 → 贴到 `"YOUR_SENDER_ID"` 的位置。
6. 找到 **appId** 后面引号里的整串，复制 → 贴到 `"YOUR_APP_ID"` 的位置。

保存 `firebase-config.js` 后，刷新网站，顶部出现「与对象同步」就说明配置对了。
