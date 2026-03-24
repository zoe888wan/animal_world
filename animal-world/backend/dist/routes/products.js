/**
 * 商品路由
 * 功能：商品列表、商品详情（含头像等虚拟商品）
 */
import { Router } from 'express';
import { pool } from '../db.js';
const router = Router();
/** 获取全部商品（不含头像框） */
router.get('/', async (_req, res) => {
    try {
        const [rows] = await pool.execute("SELECT * FROM products WHERE type NOT IN ('avatar_frame', 'avatar_frame_premium') ORDER BY id");
        res.json(rows);
    }
    catch (e) {
        console.error('Products list error:', e);
        res.status(500).json({ error: '获取商品列表失败' });
    }
});
/** 获取单个商品详情 */
/** 根据 id 获取单个商品详情 */
router.get('/:id', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM products WHERE id = ?', [req.params.id]);
        const p = rows[0];
        if (!p)
            return res.status(404).json({ error: '商品不存在' });
        res.json(p);
    }
    catch {
        res.status(500).json({ error: '获取商品失败' });
    }
});
export default router;
