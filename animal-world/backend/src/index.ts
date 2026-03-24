/**
 * 动物世界 - 后端 API 入口
 * 功能：初始化 Express、挂载路由、启动 HTTP 服务
 */
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import auth from './routes/auth.js';
import users from './routes/users.js';
import pets from './routes/pets.js';
import posts from './routes/posts.js';
import products from './routes/products.js';
import orders from './routes/orders.js';
import events from './routes/events.js';
import upload from './routes/upload.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
/** 允许所有来源跨域，便于开发调试 */
app.use(cors({ origin: true }));
/** 解析 JSON 请求体 */
app.use(express.json());

/** 认证相关：注册、登录、验证码、邮箱验证 */
app.use('/api/auth', auth);
/** 用户信息、头像、个人设置 */
app.use('/api/users', users);
/** 宠物 CRUD、热度排行 */
app.use('/api/pets', pets);
/** 动态帖、点赞、评论 */
app.use('/api/posts', posts);
/** 商品列表（含头像商品等虚拟物品） */
app.use('/api/products', products);
/** 下单、支付、订单历史 */
app.use('/api/orders', orders);
/** 约玩活动、报名 */
app.use('/api/events', events);
/** 文件上传（图片/视频） */
app.use('/api/upload', upload);
/** 静态提供上传文件访问 */
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

/** 健康检查接口，用于探活 */
app.get('/api/health', (_req, res) => res.json({ ok: true }));

/** 托管前端构建产物并 SPA 回退，避免直接访问或刷新子路径时出现「无法访问此网页」 */
// 注意：运行环境为编译后的 dist/index.js，此处的 __dirname 指向 backend/dist
// 因此需要回退两级再进入 frontend/dist
const frontendDist = path.join(__dirname, '..', '..', 'frontend', 'dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`动物世界 API http://localhost:${PORT}`));
