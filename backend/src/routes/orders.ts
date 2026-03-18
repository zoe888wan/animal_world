/**
 * 订单路由
 * 功能：订单列表、下单（含 user_products 发放、宠物热度提升）
 */
import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { pool } from '../db.js';

const router = Router();

/** 获取当前用户订单及明细 */
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const [rows] = await pool.execute(
      `SELECT o.*, JSON_ARRAYAGG(JSON_OBJECT('product_id', oi.product_id, 'quantity', oi.quantity, 'price', oi.price)) as items
       FROM orders o LEFT JOIN order_items oi ON o.id = oi.order_id WHERE o.user_id = ? GROUP BY o.id ORDER BY o.created_at DESC`,
      [userId]
    );
    res.json(rows);
  } catch {
    res.status(500).json({ error: '获取订单失败' });
  }
});

/** 同相框、头像、饰品为永久拥有，同款只能拥有一件，不可重复换取 */
const PERMANENT_OWN_TYPES = ['pet_accessory', 'avatar'] as const;

/** 下单：虚拟币支付，扣款后立即发放商品 */
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: '订单项不能为空' });
    }
    let totalCoins = 0;
    const products: { id: number; price: string; name?: string; popularity_boost: number; type?: string }[] = [];
    const [uRows] = await pool.execute('SELECT credit_score, COALESCE(coins, 0) as coins FROM users WHERE id = ?', [userId]);
    const u = (uRows as { credit_score?: number; coins: number }[])[0];
    const credit = u?.credit_score ?? 3;
    const userCoins = u?.coins ?? 0;

    for (const it of items) {
      const [r] = await pool.execute('SELECT id, name, price, popularity_boost, type FROM products WHERE id = ?', [it.product_id]);
      const p = (r as { id: number; name?: string; price: string; popularity_boost: number; type?: string }[])[0];
      if (!p) return res.status(400).json({ error: `商品 ${it.product_id} 不存在` });
      if (PERMANENT_OWN_TYPES.includes((p.type || '') as typeof PERMANENT_OWN_TYPES[number])) {
        const [owned] = await pool.execute('SELECT 1 FROM user_products WHERE user_id = ? AND product_id = ? LIMIT 1', [userId, p.id]);
        if ((owned as unknown[]).length > 0) {
          return res.status(400).json({ error: `您已拥有「${p.name || '该款'}」，同款永久拥有、无需重复换取` });
        }
      }
      let unitPrice = parseInt(String(p.price), 10) || 0;
      if (p.type === 'credit_restore') {
        if (credit >= 1) return res.status(400).json({ error: '信誉分大于0时无需购买恢复' });
        if ((it.quantity || 1) > 1) return res.status(400).json({ error: '信誉分恢复每次仅可购买1分' });
        unitPrice = 100;
      }
      const qty = it.quantity || 1;
      totalCoins += unitPrice * qty;
      products.push({ ...p, price: String(unitPrice), popularity_boost: p.popularity_boost || 0 });
    }

    if (userCoins < totalCoins) {
      return res.status(400).json({ error: `虚拟币不足，需要 ${totalCoins} 币，当前 ${userCoins} 币` });
    }

    await pool.execute('UPDATE users SET coins = coins - ? WHERE id = ?', [totalCoins, userId]);

    const [ord] = await pool.execute('INSERT INTO orders (user_id, total_amount, status, paid_at) VALUES (?, ?, ?, NOW())', [userId, totalCoins, 'paid']);
    const orderId = (ord as { insertId: number }).insertId;

    for (const it of items) {
      const prod = products.find((x) => x.id === it.product_id);
      if (!prod) continue;
      const qty = it.quantity || 1;
      await pool.execute('INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)', [orderId, it.product_id, qty, prod.price]);
    }

    let totalBoost = 0;
    for (const it of items) {
      const prod = products.find((x) => x.id === it.product_id);
      if (!prod) continue;
      const qty = it.quantity || 1;
      if (prod.type === 'credit_restore') {
        for (let i = 0; i < qty; i++) {
          await pool.execute('INSERT INTO credit_purchases (user_id, amount, credit_restored) VALUES (?, ?, 1)', [userId, 100]);
          await pool.execute('UPDATE users SET credit_score = COALESCE(credit_score, 0) + 1 WHERE id = ?', [userId]);
        }
      } else {
        const isPermanent = PERMANENT_OWN_TYPES.includes((prod.type || '') as typeof PERMANENT_OWN_TYPES[number]);
        for (let i = 0; i < qty; i++) {
          if (isPermanent && i > 0) break;
          await pool.execute('INSERT INTO user_products (user_id, product_id, order_id) VALUES (?, ?, ?)', [userId, it.product_id, orderId]);
        }
        if (prod.type !== 'boost') totalBoost += (prod.popularity_boost || 0) * (isPermanent ? 1 : qty);
      }
    }

    const [petRows] = await pool.execute('SELECT id FROM pets WHERE owner_id = ? ORDER BY id LIMIT 1', [userId]);
    const petId = (petRows as { id: number }[])[0]?.id;
    if (petId && totalBoost > 0) {
      await pool.execute('UPDATE pets SET popularity = GREATEST(0, popularity + ?) WHERE id = ?', [totalBoost, petId]);
    }

    const [o] = await pool.execute('SELECT * FROM orders WHERE id = ?', [orderId]);
    res.status(201).json((o as Record<string, unknown>[])[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '下单失败' });
  }
});

/** 获取订单支付状态 */
router.get('/:id/status', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const orderId = parseInt(req.params.id, 10);
    if (isNaN(orderId)) return res.status(400).json({ error: '无效订单' });
    const [rows] = await pool.execute(
      'SELECT id, status, paid_at FROM orders WHERE id = ? AND user_id = ?',
      [orderId, userId]
    );
    const o = (rows as { id: number; status: string; paid_at: Date | null }[])[0];
    if (!o) return res.status(404).json({ error: '订单不存在' });
    res.json({ status: o.status, paid_at: o.paid_at });
  } catch {
    res.status(500).json({ error: '获取失败' });
  }
});

/** 微信 Native 预支付：生成扫码支付二维码链接 */
router.post('/:id/wechat-prepay', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const orderId = parseInt(req.params.id, 10);
    if (isNaN(orderId)) return res.status(400).json({ error: '无效订单' });
    const [rows] = await pool.execute(
      'SELECT id, user_id, total_amount, status FROM orders WHERE id = ? AND user_id = ?',
      [orderId, userId]
    );
    const order = (rows as { id: number; total_amount: number; status: string }[])[0];
    if (!order) return res.status(404).json({ error: '订单不存在' });
    if (order.status !== 'pending') return res.status(400).json({ error: '订单已支付或已关闭' });
    const codeUrl = `weixin://wxpay/bizpayurl?pr=AW${orderId}`;
    await pool.execute('UPDATE orders SET payment_method = ?, payment_id = ? WHERE id = ?', ['wechat', `prepay_${orderId}`, orderId]);
    res.json({ code_url: codeUrl });
  } catch (e) {
    console.error('Wechat prepay error:', e);
    res.status(500).json({ error: '创建支付失败' });
  }
});

/** 确认支付成功（微信回调或模拟扫码后调用，发放商品） */
router.post('/:id/confirm-paid', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const orderId = parseInt(req.params.id, 10);
    if (isNaN(orderId)) return res.status(400).json({ error: '无效订单' });
    const [rows] = await pool.execute(
      'SELECT id, user_id, status FROM orders WHERE id = ? AND user_id = ?',
      [orderId, userId]
    );
    const order = (rows as { id: number; user_id: number; status: string }[])[0];
    if (!order) return res.status(404).json({ error: '订单不存在' });
    if (order.status !== 'pending') return res.json({ ok: true, status: order.status });

    const [items] = await pool.execute(
      'SELECT oi.product_id, oi.quantity, oi.price, p.popularity_boost, p.type FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?',
      [orderId]
    );
    const productList = items as { product_id: number; quantity: number; price: string; popularity_boost: number; type?: string }[];

    let totalBoost = 0;
    for (const it of productList) {
      if (it.type === 'credit_restore') {
        for (let i = 0; i < it.quantity; i++) {
          await pool.execute(
            'INSERT INTO credit_purchases (user_id, amount, credit_restored) VALUES (?, ?, 1)',
            [order.user_id, parseFloat(it.price)]
          );
          await pool.execute('UPDATE users SET credit_score = COALESCE(credit_score, 0) + 1 WHERE id = ?', [order.user_id]);
        }
      } else {
        for (let i = 0; i < it.quantity; i++) {
          await pool.execute('INSERT INTO user_products (user_id, product_id, order_id) VALUES (?, ?, ?)', [order.user_id, it.product_id, orderId]);
        }
        if (it.type !== 'boost') totalBoost += (it.popularity_boost || 0) * it.quantity;
      }
    }
    await pool.execute('UPDATE orders SET status = ?, paid_at = NOW() WHERE id = ?', ['paid', orderId]);

    const [petRows] = await pool.execute('SELECT id FROM pets WHERE owner_id = ? ORDER BY id LIMIT 1', [order.user_id]);
    const petId = (petRows as { id: number }[])[0]?.id;
    if (petId && totalBoost > 0) {
      await pool.execute('UPDATE pets SET popularity = GREATEST(0, popularity + ?) WHERE id = ?', [totalBoost, petId]);
    }
    res.json({ ok: true, status: 'paid' });
  } catch (e) {
    console.error('Confirm paid error:', e);
    res.status(500).json({ error: '确认支付失败' });
  }
});

export default router;
