# 阿里云 OSS 配置步骤（用于存原图）

> 目的：原图存到阿里云 OSS，Firestore 只存缩略图 + URL，这样照片数量和体积都不再受 Firestore 单文档 1MB 限制。

---

## 一、在阿里云创建 OSS Bucket

1. 打开阿里云控制台：https://oss.console.aliyun.com/
2. 选择你常用的地域（如：**华东 1 杭州 `oss-cn-hangzhou`**）。
3. 点击「创建 Bucket」：
   - Bucket 名称：例如 `love-memorial-photos`（全局唯一，小写字母 + 数字 + 中划线）。
   - 地域：选择你刚才的地域（例如 `oss-cn-hangzhou`）。
   - 存储类型：标准存储。
   - 读写权限：**公共读（Public Read）**，这样浏览器才能直接访问图片 URL。
   - 其他保持默认 → 确认创建。

---

## 二、获取 AccessKey（AK/SK）

1. 打开阿里云 AccessKey 管理：https://ram.console.aliyun.com/manage/ak
2. 建议为本项目创建一个 RAM 用户：
   - 创建用户 → 勾选编程访问 → 为该用户授予 **AliyunOSSFullAccess** 或针对指定 Bucket 的最小权限策略。
3. 生成 AccessKey：
   - 记录下 **AccessKey ID** 和 **AccessKey Secret**（只在这里显示一次）。

> 注意：这两个值不要写进代码，后面会放到 Vercel 的环境变量里。

---

## 三、在 Vercel 配置环境变量

1. 打开 Vercel Dashboard：https://vercel.com/dashboard
2. 找到你的项目（比如 `love-memorial-iota`），进入「Settings」→「Environment Variables」。
3. 依次添加下面几项（`Value` 替换为你自己的信息）：

| Name                       | Value 示例                      |
|----------------------------|---------------------------------|
| `ALIYUN_OSS_REGION`        | `oss-cn-hangzhou`              |
| `ALIYUN_OSS_BUCKET`        | 你的 Bucket 名，如 `love-memorial-photos` |
| `ALIYUN_OSS_ACCESS_KEY_ID` | 你刚才复制的 AccessKey ID      |
| `ALIYUN_OSS_ACCESS_KEY_SECRET` | 你刚才复制的 AccessKey Secret |

4. 保存后，在 Vercel 里重新部署一次（或触发一次 `git push`），让函数拿到新的环境变量。

---

## 四、使用方式（你已经准备好了）

- 前端上传照片时：
  - 会先把**原图**通过 `/api/oss-upload` 上传到阿里云 OSS。
  - 后端返回图片的 `url` 和 `key`。
  - 同时前端会生成一个较小的缩略图 dataURL。
  - Firestore 里每张照片会保存：`data`（缩略图）、`ossUrl`（原图地址）、`category`、`caption` 等。
- 相册列表：
  - 使用缩略图 `data` 显示（加载快）。
- 点击大图预览：
  - 优先显示 `ossUrl`，等于查看接近原图的清晰版本。

---

## 五、注意事项

- Bucket 读权限设置为「公共读」后，任何知道 URL 的人都可以访问图片，所以配对码要自己保管好。
- 若以后需要删除 OSS 里的图片，可以：
  - 后续再加一个 `/api/oss-delete` 接口，按 Firestore 里存的 `key` 删除；
  - 或直接在阿里云 OSS 控制台里手动删除对应对象。

