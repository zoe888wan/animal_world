/**
 * 用户路由
 * 功能：获取当前用户、更新资料、获取已购头像列表
 */
import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { pool } from '../db.js';

const router = Router();

/** 获取当前登录用户信息（不含密码）；兼容不同迁移版本的数据库 */
router.get('/me', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const [rows] = await pool.execute(
      'SELECT id, username, email, avatar_url, nickname, bio, created_at FROM users WHERE id = ?',
      [userId]
    );
    const user = (rows as Record<string, unknown>[])[0];
    if (!user) return res.status(404).json({ error: '用户不存在' });
    try {
      const [cr] = await pool.execute('SELECT credit_score FROM users WHERE id = ?', [userId]);
      (user as Record<string, unknown>).credit_score = (cr as { credit_score?: number }[])[0]?.credit_score ?? 3;
    } catch {
      (user as Record<string, unknown>).credit_score = 3;
    }
    try {
      const [cRows] = await pool.execute('SELECT COALESCE(coins, 0) as coins FROM users WHERE id = ?', [userId]);
      const cr = (cRows as { coins: number }[])[0];
      (user as Record<string, unknown>).coins = cr?.coins ?? 0;
    } catch {
      (user as Record<string, unknown>).coins = 0;
    }
    res.json(user);
  } catch (e) {
    console.error('Get me error:', e);
    res.status(500).json({ error: '获取用户信息失败' });
  }
});

/** 获取本月剩余修改次数与改名卡数量 */
router.get('/me/profile-quota', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01 00:00:00`;
    const [editRows] = await pool.execute(
      'SELECT COUNT(*) as c FROM user_profile_edits WHERE user_id = ? AND edited_at >= ?',
      [userId, monthStart]
    );
    const editCount = (editRows as { c: number }[])[0]?.c ?? 0;
    const remaining = Math.max(0, 2 - editCount);
    const [cardRows] = await pool.execute(
      `SELECT COUNT(*) as c FROM user_products up JOIN products p ON up.product_id = p.id
       WHERE up.user_id = ? AND p.type = 'rename_card'`,
      [userId]
    );
    const cards = (cardRows as { c: number }[])[0]?.c ?? 0;
    res.json({ edits_remaining: remaining, rename_cards: cards });
  } catch {
    res.status(500).json({ error: '获取失败' });
  }
});

/** 获取当前用户的宠物饰品（可佩戴） */
router.get('/me/accessories', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const [rows] = await pool.execute(
      `SELECT up.id as user_product_id, up.used_pet_id, p.id as product_id, p.name, p.image_url
       FROM user_products up JOIN products p ON up.product_id = p.id
       WHERE up.user_id = ? AND p.type = 'pet_accessory'`,
      [userId]
    );
    res.json({ accessories: rows });
  } catch {
    res.status(500).json({ error: '获取饰品失败' });
  }
});

/** 佩戴饰品到宠物 */
router.post('/me/accessories/:id/equip', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const userProductId = parseInt(req.params.id, 10);
    const { pet_id } = req.body;
    if (!pet_id) return res.status(400).json({ error: '请选择宠物' });
    const [r] = await pool.execute(
      'SELECT up.id, up.user_id, p.type FROM user_products up JOIN products p ON up.product_id = p.id WHERE up.id = ?',
      [userProductId]
    );
    const up = (r as { id: number; user_id: number; type: string }[])[0];
    if (!up || up.user_id !== userId) return res.status(404).json({ error: '饰品不存在' });
    if (up.type !== 'pet_accessory') return res.status(400).json({ error: '该商品不是宠物饰品' });
    const [pr] = await pool.execute('SELECT owner_id FROM pets WHERE id = ?', [pet_id]);
    const pet = (pr as { owner_id: number }[])[0];
    if (!pet || pet.owner_id !== userId) return res.status(403).json({ error: '只能给自己的宠物佩戴' });
    await pool.execute('UPDATE user_products SET used_pet_id = ? WHERE id = ?', [pet_id, userProductId]);
    res.json({ ok: true });
  } catch (e) {
    console.error('Equip error:', e);
    res.status(500).json({ error: '佩戴失败' });
  }
});

/** 卸下饰品 */
router.post('/me/accessories/:id/unequip', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const userProductId = parseInt(req.params.id, 10);
    const [r] = await pool.execute('SELECT user_id FROM user_products WHERE id = ?', [userProductId]);
    const up = (r as { user_id: number }[])[0];
    if (!up || up.user_id !== userId) return res.status(404).json({ error: '饰品不存在' });
    await pool.execute('UPDATE user_products SET used_pet_id = NULL WHERE id = ?', [userProductId]);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: '卸下失败' });
  }
});

/** 获取已购买的食物（可投喂） */
router.get('/me/food', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const [rows] = await pool.execute(
      `SELECT up.id as user_product_id, p.id as product_id, p.name, p.image_url
       FROM user_products up JOIN products p ON up.product_id = p.id
       WHERE up.user_id = ? AND p.type = 'pet_food'`,
      [userId]
    );
    res.json({ food: rows });
  } catch {
    res.status(500).json({ error: '获取食物失败' });
  }
});

/** 获取已购买的药物（可治疗） */
router.get('/me/medicine', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const [rows] = await pool.execute(
      `SELECT up.id as user_product_id, p.id as product_id, p.name, p.image_url
       FROM user_products up JOIN products p ON up.product_id = p.id
       WHERE up.user_id = ? AND p.type = 'medicine'`,
      [userId]
    );
    res.json({ medicine: rows });
  } catch {
    res.status(500).json({ error: '获取药物失败' });
  }
});

/** 获取已购买的曝光卡（需在「我的宠物」页选择一只宠物使用，单次最多 +50 曝光） */
router.get('/me/boost-cards', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const [rows] = await pool.execute(
      `SELECT up.id as user_product_id, p.id as product_id, p.name, p.image_url, LEAST(COALESCE(p.popularity_boost, 0), 50) as popularity_boost
       FROM user_products up JOIN products p ON up.product_id = p.id
       WHERE up.user_id = ? AND p.type = 'boost'`,
      [userId]
    );
    res.json({ cards: rows });
  } catch {
    res.status(500).json({ error: '获取曝光卡失败' });
  }
});

/** 获取当前用户已购买的头像商品（用于个人设置页头像选择） */
router.get('/me/avatars', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const [rows] = await pool.execute(
      `SELECT p.avatar_value, p.image_url FROM user_products up
       JOIN products p ON up.product_id = p.id
       WHERE up.user_id = ? AND p.type = 'avatar'`,
      [userId]
    );
    const purchased = (rows as { avatar_value?: string; image_url?: string }[]).map((r) => {
      const value = r.avatar_value || r.image_url || '';
      const isImage = !!(value && (value.startsWith('http://') || value.startsWith('https://')));
      return { value, isImage };
    }).filter((a) => a.value);
    res.json({ purchased });
  } catch {
    res.status(500).json({ error: '获取头像列表失败' });
  }
});

/** 签到：每24小时可领取 1 虚拟币 */
router.post('/me/checkin', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const now = new Date();
    const [r] = await pool.execute(
      'SELECT last_checkin_at, COALESCE(coins, 0) as coins FROM users WHERE id = ?',
      [userId]
    );
    const u = (r as { last_checkin_at?: string | Date; coins: number }[])[0];
    if (!u) return res.status(404).json({ error: '用户不存在' });
    const lastAt = u.last_checkin_at ? new Date(u.last_checkin_at).getTime() : 0;
    const elapsed = (now.getTime() - lastAt) / (1000 * 60 * 60);
    if (lastAt > 0 && elapsed < 24) {
      const remain = Math.ceil(24 - elapsed);
      return res.json({ checked: false, coins: u.coins, message: `请 ${remain} 小时后再签到` });
    }
    const newCoins = u.coins + 1;
    await pool.execute('UPDATE users SET coins = ?, last_checkin_at = NOW() WHERE id = ?', [newCoins, userId]);
    res.json({ checked: true, coins: newCoins, message: '签到成功，获得 1 虚拟币' });
  } catch (e) {
    console.error('Checkin error:', e);
    res.status(500).json({ error: '签到失败' });
  }
});

/** 与陪伴宠物互动：随机获得虚拟币（约30%概率 1-3 币，每日最多 10 次） */
router.post('/me/pet-interact', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const today = new Date().toISOString().slice(0, 10);
    const [uRows] = await pool.execute(
      'SELECT coins, pet_interact_date, pet_interact_count FROM users WHERE id = ?',
      [userId]
    );
    const u = (uRows as { coins?: number; pet_interact_date?: string; pet_interact_count?: number }[])[0];
    if (!u) return res.status(404).json({ error: '用户不存在' });
    let count = (u.pet_interact_date === today ? (u.pet_interact_count ?? 0) : 0);
    if (count >= 10) return res.json({ earned: 0, coins: u.coins ?? 0, message: '今日互动奖励已领完，明天再来~' });
    const roll = Math.random();
    const earned = roll < 0.3 ? Math.floor(Math.random() * 3) + 1 : 0;
    const newCoins = (u.coins ?? 0) + earned;
    await pool.execute(
      'UPDATE users SET coins = ?, pet_interact_date = ?, pet_interact_count = ? WHERE id = ?',
      [newCoins, today, count + (earned > 0 ? 1 : 0), userId]
    );
    res.json({ earned, coins: newCoins, message: earned > 0 ? `获得 ${earned} 虚拟币 ~` : '' });
  } catch (e) {
    console.error('Pet interact error:', e);
    res.status(500).json({ error: '操作失败' });
  }
});

/** 信誉分恢复：仅当 credit_score=0 时可购买，定价 100 虚拟币 */
router.get('/me/credit-restore-info', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const [uRows] = await pool.execute('SELECT credit_score FROM users WHERE id = ?', [userId]);
    const u = (uRows as { credit_score?: number }[])[0];
    const credit = u?.credit_score ?? 3;
    const canPurchase = credit < 1;
    const [cpRows] = await pool.execute(
      'SELECT COUNT(*) as c FROM credit_purchases WHERE user_id = ?',
      [userId]
    );
    const count = (cpRows as { c: number }[])[0]?.c ?? 0;
    const price = 100;
    const [pRows] = await pool.execute("SELECT id FROM products WHERE type = 'credit_restore' LIMIT 1");
    const productId = (pRows as { id: number }[])[0]?.id ?? null;
    res.json({ can_purchase: canPurchase, price, product_id: productId, next_restore_number: count + 1 });
  } catch (e) {
    console.error('Credit restore info:', e);
    res.status(500).json({ error: '获取失败' });
  }
});

/** 更新当前用户昵称、简介、头像。每月免费2次，超出需使用改名卡 */
router.put('/me', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const { nickname, bio, avatar_url } = req.body;
    const nick = typeof nickname === 'string' ? nickname.trim() : null;
    const bioVal = typeof bio === 'string' ? bio.trim() || null : null;
    const avatarVal = typeof avatar_url === 'string' ? avatar_url.trim() || null : null;

    const [curRows] = await pool.execute(
      'SELECT nickname, bio, avatar_url FROM users WHERE id = ?',
      [userId]
    );
    const cur = (curRows as { nickname?: string; bio?: string; avatar_url?: string }[])[0];
    if (!cur) return res.status(404).json({ error: '用户不存在' });

    const nickChanged = nick != null && nick !== (cur.nickname ?? '');
    const bioChanged = bioVal !== (cur.bio ?? '');
    const avatarChanged = avatarVal !== (cur.avatar_url ?? '');
    const hasChanges = nickChanged || bioChanged || avatarChanged;
    if (!hasChanges) {
      const [rows] = await pool.execute('SELECT id, username, email, avatar_url, nickname, bio, credit_score FROM users WHERE id = ?', [userId]);
      return res.json((rows as Record<string, unknown>[])[0]);
    }

    if (nickChanged && nick) {
      const [exist] = await pool.execute(
        'SELECT 1 FROM users WHERE nickname = ? AND id != ?',
        [nick, userId]
      );
      if ((exist as unknown[]).length > 0) {
        return res.status(400).json({ error: '该昵称已被使用，请换一个' });
      }
    }

    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01 00:00:00`;
    const [editRows] = await pool.execute(
      'SELECT COUNT(*) as c FROM user_profile_edits WHERE user_id = ? AND edited_at >= ?',
      [userId, monthStart]
    );
    const editCount = (editRows as { c: number }[])[0]?.c ?? 0;
    if (editCount >= 2) {
      const [cardRows] = await pool.execute(
        `SELECT up.id FROM user_products up JOIN products p ON up.product_id = p.id
         WHERE up.user_id = ? AND p.type = 'rename_card' LIMIT 1`,
        [userId]
      );
      const card = (cardRows as { id: number }[])[0];
      if (!card) {
        return res.status(400).json({
          error: '本月修改次数已用完，可在商城购买改名卡（2元）获取额外修改机会'
        });
      }
      await pool.execute('DELETE FROM user_products WHERE id = ?', [card.id]);
    }

    await pool.execute(
      'UPDATE users SET nickname = COALESCE(?, nickname), bio = COALESCE(?, bio), avatar_url = COALESCE(?, avatar_url), updated_at = NOW() WHERE id = ?',
      [nick ?? null, bioVal ?? null, avatarVal ?? null, userId]
    );
    await pool.execute(
      'INSERT INTO user_profile_edits (user_id) VALUES (?)',
      [userId]
    );
    const [rows] = await pool.execute('SELECT id, username, email, avatar_url, nickname, bio, credit_score FROM users WHERE id = ?', [userId]);
    res.json((rows as Record<string, unknown>[])[0]);
  } catch (e) {
    console.error('Update me error:', e);
    res.status(500).json({ error: '更新失败' });
  }
});

/** 获取指定用户公开资料（昵称、头像、简介、信誉分），所有人可见；须放在 /me 等具体路径之后 */
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: '无效用户' });
    const [rows] = await pool.execute(
      'SELECT id, nickname, avatar_url, bio, credit_score FROM users WHERE id = ?',
      [id]
    );
    const user = (rows as Record<string, unknown>[])[0];
    if (!user) return res.status(404).json({ error: '用户不存在' });
    res.json(user);
  } catch {
    res.status(500).json({ error: '获取失败' });
  }
});

export default router;
