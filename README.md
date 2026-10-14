# 一间自己的房间 · A Room of My Own

可交互的手绘 3D 个人网站。推门进入房间，走动、坐下，在电脑中浏览项目，通过相机看照片、笔记本翻页、耳机听音乐，也可以操作台灯、窗帘和床。

这是**可编辑的网站源码仓库**，不是打包后的部署目录。当前整理自 2026-10-10 已上线版本的开发源码；本次整理不增加新的视觉功能。

- 线上网站：https://mickey-paper-room.onrender.com/
- 独立部署仓库：https://github.com/MickeyWzt/mickey-paper-room-render
- 技术：Vite 7、Three.js、JavaScript、CSS；仓库保留了早期 React 原型代码，当前网站入口是 `src/room-v3.js`。

## 本地运行

使用 Node.js 22.12+（建议 Node.js 24 LTS）及 npm。在仓库根目录执行：

```sh
npm ci
npm run dev
```

打开 http://127.0.0.1:5173/ 。不需要 API Key 或 `.env` 才能运行网站。音乐使用远程播放地址，受网络及平台可用性影响。

```sh
npm run build
npm run preview
```

构建结果在 `dist/`；预览地址为 http://127.0.0.1:4173/ 。仓库包含现用 GLB 模型、字体、门口贴图、55 张照片的网页版本及头像，首次克隆需要下载这些资源。

## 从哪里改

| 位置 | 内容 |
| --- | --- |
| `src/room-v3.js` / `src/room-v3.css` | 当前入口、房间、移动、视角、坐下及菜单 |
| `src/room-refinements.js` / `src/surface-finish.js` | 模型细节修正与上色材质 |
| `src/loading-screen.html` / `vite.config.js` | 按真实加载进度画门、首屏与构建 |
| `src/computer.js` / `src/computer-screen.js` | 电脑开机、桌面、项目浏览 |
| `src/content/projects.js` / `projects.en.js` | 项目内容及英文翻译 |
| `src/desk-interactions.js` / `src/photo-album.js` | 笔记本、相机、相册 |
| `src/content/photos.json` | 照片清单及各尺寸资源地址 |
| `src/wearable-music.js` / `src/content/music.js` | 耳机、播放器与歌曲 |
| `src/room-life.js` / `src/desk-light.js` / `src/dream.js` | 台灯、窗帘、床与梦境 |
| `src/i18n.js` / `src/i18n.css` | 中英文切换 |
| `public/assets/` | 模型、图片、字体及第三方许可说明 |

`src/App.jsx`、`src/main.jsx`、`src/room.js`、`src/models.js`、`src/style.css` 是早期原型，保留以便参考，不是当前 HTML 的应用入口。

## 照片导入

```sh
npm run import:photos -- "/path/to/original-photos"
```

将按文件名排序的 JPG/PNG 生成缩略图、预览图、高清 WebP，更新 `src/content/photos.json`。原照片不修改。审计清单及联系表默认写入忽略提交的 `.local/photo-import/`；第三个命令行参数可以指定其他输出目录。导入会替换当前照片清单，请在确认要使用的新照片目录上运行。

## 发布

本源码仓库不会自动更新生产网站。修改并本地验证后执行：

```sh
npm run build
npm run release
```

`releases/<timestamp>/` 包含需要发布的 `site/` 及 SHA-256 清单，避免把保留的旧模型一起上线。随后按部署仓库的现有手动 Render 发布流程更新。不要直接把 `node_modules`、`.env` 或整个开发目录上传成网站。

## 内容与资源边界

- 包含网站运行所需的导出模型；原始 `.blend` 工程和建模过程脚本仍单独存放，不在本仓库中。修改场景逻辑不需要安装 Blender。
- 包含已用于网站的照片网页版本，不包含摄影原片目录。
- 笔记本和梦境中部分文字是展示用内容；项目描述以 `src/content/` 中的实际清单为准。
- 字体与第三方素材的说明保留在 `public/assets/OFL.txt`、`FONT-SOURCE.txt`、`KENNEY-LICENSE.txt`。照片、头像、音乐及其他素材不因存放于代码仓库而获得统一的开源授权；音乐未打包到仓库。
- 私有源码仓库需要授权 GitHub 访问才能供外部工具导入。不能仅凭链接匿名读取。
