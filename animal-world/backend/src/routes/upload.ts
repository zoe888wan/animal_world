/**
 * 文件上传路由
 * 功能：接收图片/视频文件，保存到 uploads 目录，返回访问 URL
 */
import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = Router();
/** 与 index.ts 中 express.static 使用同一目录：backend/src/uploads */
const uploadDir = path.join(__dirname, '..', 'uploads');

if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

/** multer 配置：存储到 uploads，保留原扩展名 */
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(file.originalname) || '.bin'}`),
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /^image\//.test(file.mimetype) || /^video\//.test(file.mimetype);
    cb(null, !!ok);
  },
});

/** 单文件上传，需登录，返回 { url: string }，前端通过代理访问 /uploads */
router.post('/', authMiddleware, upload.single('file'), (req: AuthRequest, res) => {
  if (!req.file) return res.status(400).json({ error: '未选择文件' });
  /** 返回相对路径，前端代理 /uploads 到后端 */
  const url = `/uploads/${req.file.filename}`;
  res.json({ url });
});

export default router;
