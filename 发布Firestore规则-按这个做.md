# 解决「没有写入权限」——发布 Firestore 规则

你看到的「没有写入权限，请到 Firebase 控制台发布 Firestore 规则」就是因为规则还没在控制台里发布。按下面做一次即可。

---

## 第一步：打开规则页面

在浏览器里打开（用电脑或手机都行）：

**https://console.firebase.google.com/project/ux-af71e/firestore/rules**

若提示登录，用你的 Google 账号登录。

---

## 第二步：替换规则并发布

1. 页面上会有一个**规则编辑器**（一大段英文）。
2. **全选**编辑器里的内容并**删掉**（Ctrl+A 全选，然后删除）。
3. **复制**下面这一整段（从 `rules_version` 到最后的 `}`），**粘贴**到编辑器里：

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

4. 点击页面上方的蓝色按钮 **「发布」**（Publish）。
5. 等几秒看到「规则已发布」或成功提示即可。

---

## 第三步：回到网站重试

关闭弹窗，在纪念站里再点一次「上传照片」，就可以正常存储了。

若还是报错，确认你点的是 **「发布」** 且没有改规则里的字（例如把 `rooms`、`photos` 改掉）。
