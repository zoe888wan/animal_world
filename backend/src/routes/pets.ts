/**
 * 宠物路由
 * 功能：列表、新增、详情、编辑、热度排行、曝光卡使用
 */
import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { pool } from '../db.js';

const router = Router();

const POPULARITY_CAP = 50;

/** 每月 1 日将所有宠物曝光度清零（仅当月首次访问时执行） */
async function ensureMonthlyPopularityReset(): Promise<void> {
  const now = new Date();
  if (now.getDate() !== 1) return;
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  try {
    await pool.execute(
      "CREATE TABLE IF NOT EXISTS app_meta (k VARCHAR(64) PRIMARY KEY, v VARCHAR(255))"
    );
    const [rows] = await pool.execute(
      "SELECT v FROM app_meta WHERE k = 'popularity_reset_month'"
    );
    const last = (rows as { v?: string }[])[0]?.v;
    if (last === monthKey) return;
    await pool.execute('UPDATE pets SET popularity = 0');
    await pool.execute(
      "INSERT INTO app_meta (k, v) VALUES ('popularity_reset_month', ?) ON DUPLICATE KEY UPDATE v = ?",
      [monthKey, monthKey]
    );
  } catch {
    // ignore
  }
}

/** 获取宠物列表，默认当前用户；随机触发生病（约3%概率） */
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const ownerId = (req.query.owner_id as string) || String(req.userId);
    const [rows] = await pool.execute(
      'SELECT * FROM pets WHERE owner_id = ? ORDER BY created_at DESC',
      [ownerId]
    );
    const pets = rows as { id: number; owner_id: number; health_status?: string }[];
    if (String(ownerId) === String(req.userId)) {
      for (const pet of pets) {
        const status = pet.health_status ?? 'healthy';
        if (status === 'healthy' && Math.random() < 0.03) {
          await pool.execute('UPDATE pets SET health_status = ? WHERE id = ?', ['sick', pet.id]);
          pet.health_status = 'sick';
        }
      }
    }
    res.json(pets);
  } catch {
    res.status(500).json({ error: '获取宠物列表失败' });
  }
});

/** 新增宠物，绑定当前用户为 owner */
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { name, species, breed, avatar_url, birthday, intro, temperament, size_type, vaccinated } = req.body;
    if (!name) return res.status(400).json({ error: '宠物名必填' });
    const temp = typeof temperament === 'string' ? temperament.trim() || null : null;
    const sizeT = typeof size_type === 'string' ? size_type.trim() || null : null;
    const vacc = vaccinated === true || vaccinated === 1 ? 1 : 0;
    try {
      await pool.execute(
        'INSERT INTO pets (owner_id, name, species, breed, avatar_url, birthday, intro, temperament, size_type, vaccinated) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [req.userId!, name, species || null, breed || null, avatar_url || null, birthday || null, intro || null, temp, sizeT, vacc]
      );
    } catch {
      await pool.execute(
        'INSERT INTO pets (owner_id, name, species, breed, avatar_url, birthday, intro) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [req.userId!, name, species || null, breed || null, avatar_url || null, birthday || null, intro || null]
      );
    }
    const [rows] = await pool.execute('SELECT * FROM pets WHERE owner_id = ? ORDER BY id DESC LIMIT 1', [req.userId!]);
    res.status(201).json((rows as Record<string, unknown>[])[0]);
  } catch {
    res.status(500).json({ error: '添加宠物失败' });
  }
});

/** 获取单只宠物详情（无需登录） */
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM pets WHERE id = ?', [req.params.id]);
    const pet = (rows as Record<string, unknown>[])[0];
    if (!pet) return res.status(404).json({ error: '宠物不存在' });
    res.json(pet);
  } catch {
    res.status(500).json({ error: '获取宠物失败' });
  }
});

/** 更新宠物信息，仅限主人 */
router.put('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const [r] = await pool.execute('SELECT owner_id FROM pets WHERE id = ?', [req.params.id]);
    const pet = (r as { owner_id: number }[])[0];
    if (!pet || pet.owner_id !== req.userId) return res.status(403).json({ error: '无权限' });
    const { name, species, breed, avatar_url, birthday, intro, temperament, size_type, vaccinated } = req.body;
    const temp = typeof temperament === 'string' ? temperament.trim() || null : null;
    const sizeT = typeof size_type === 'string' ? size_type.trim() || null : null;
    const vacc = vaccinated === true || vaccinated === 1 ? 1 : 0;
    try {
      await pool.execute(
        'UPDATE pets SET name=COALESCE(?,name), species=COALESCE(?,species), breed=COALESCE(?,breed), avatar_url=COALESCE(?,avatar_url), birthday=COALESCE(?,birthday), intro=COALESCE(?,intro), temperament=?, size_type=?, vaccinated=?, updated_at=NOW() WHERE id=?',
        [name ?? null, species ?? null, breed ?? null, avatar_url ?? null, birthday ?? null, intro ?? null, temp, sizeT, vacc, req.params.id]
      );
    } catch {
      await pool.execute(
        'UPDATE pets SET name=COALESCE(?,name), species=COALESCE(?,species), breed=COALESCE(?,breed), avatar_url=COALESCE(?,avatar_url), birthday=COALESCE(?,birthday), intro=COALESCE(?,intro), updated_at=NOW() WHERE id=?',
        [name ?? null, species ?? null, breed ?? null, avatar_url ?? null, birthday ?? null, intro ?? null, req.params.id]
      );
    }
    const [rows] = await pool.execute('SELECT * FROM pets WHERE id = ?', [req.params.id]);
    res.json((rows as Record<string, unknown>[])[0]);
  } catch {
    res.status(500).json({ error: '更新失败' });
  }
});

/** 使用曝光卡对指定宠物增加曝光度（买后需在此选择宠物使用，单次最多 +50） */
router.post('/:id/use-boost', authMiddleware, async (req: AuthRequest, res) => {
  try {
    await ensureMonthlyPopularityReset();
    const petId = parseInt(req.params.id, 10);
    const { user_product_id } = req.body;
    if (!user_product_id) return res.status(400).json({ error: '请选择要使用的曝光卡' });
    const [pr] = await pool.execute('SELECT owner_id FROM pets WHERE id = ?', [petId]);
    const pet = (pr as { owner_id: number }[])[0];
    if (!pet || pet.owner_id !== req.userId) return res.status(403).json({ error: '只能给自己的宠物使用' });
    const [up] = await pool.execute(
      'SELECT p.popularity_boost FROM user_products up JOIN products p ON up.product_id = p.id WHERE up.id = ? AND up.user_id = ? AND p.type = ?',
      [user_product_id, req.userId, 'boost']
    );
    const row = (up as { popularity_boost?: number }[])[0];
    if (!row) return res.status(400).json({ error: '曝光卡不存在或已使用' });
    const add = Math.min(POPULARITY_CAP, Math.max(0, row.popularity_boost ?? 0));
    await pool.execute('DELETE FROM user_products WHERE id = ?', [user_product_id]);
    await pool.execute('UPDATE pets SET popularity = GREATEST(0, popularity + ?) WHERE id = ?', [add, petId]);
    res.json({ ok: true, added: add });
  } catch (e) {
    console.error('Use boost error:', e);
    res.status(500).json({ error: '使用失败' });
  }
});

/** 投喂食物给宠物 */
router.post('/:id/feed', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const petId = parseInt(req.params.id, 10);
    const { user_product_id } = req.body;
    if (!user_product_id) return res.status(400).json({ error: '请选择食物' });
    const [pr] = await pool.execute('SELECT owner_id FROM pets WHERE id = ?', [petId]);
    const pet = (pr as { owner_id: number }[])[0];
    if (!pet || pet.owner_id !== req.userId) return res.status(403).json({ error: '只能投喂自己的宠物' });
    const [up] = await pool.execute(
      'SELECT p.popularity_boost FROM user_products up JOIN products p ON up.product_id = p.id WHERE up.id = ? AND up.user_id = ? AND p.type = ?',
      [user_product_id, req.userId, 'pet_food']
    );
    const row = (up as { popularity_boost?: number }[])[0];
    if (!row) return res.status(400).json({ error: '食物不存在' });
    const boost = Math.min(POPULARITY_CAP, Math.max(0, row.popularity_boost ?? 5));
    await pool.execute('DELETE FROM user_products WHERE id = ?', [user_product_id]);
    await pool.execute('UPDATE pets SET popularity = GREATEST(0, popularity + ?) WHERE id = ?', [boost, petId]);
    res.json({ ok: true });
  } catch (e) {
    console.error('Feed error:', e);
    res.status(500).json({ error: '投喂失败' });
  }
});

/** 使用药物治疗生病宠物 */
router.post('/:id/cure', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const petId = parseInt(req.params.id, 10);
    const { user_product_id } = req.body;
    if (!user_product_id) return res.status(400).json({ error: '请选择药物' });
    const [pr] = await pool.execute('SELECT owner_id, health_status FROM pets WHERE id = ?', [petId]);
    const pet = (pr as { owner_id: number; health_status?: string }[])[0];
    if (!pet || pet.owner_id !== req.userId) return res.status(403).json({ error: '只能治疗自己的宠物' });
    if ((pet.health_status ?? 'healthy') !== 'sick') return res.status(400).json({ error: '宠物没有生病' });
    const [up] = await pool.execute(
      'SELECT up.id FROM user_products up JOIN products p ON up.product_id = p.id WHERE up.id = ? AND up.user_id = ? AND p.type = ?',
      [user_product_id, req.userId, 'medicine']
    );
    if ((up as unknown[]).length === 0) return res.status(400).json({ error: '药物不存在' });
    await pool.execute('DELETE FROM user_products WHERE id = ?', [user_product_id]);
    await pool.execute('UPDATE pets SET health_status = ? WHERE id = ?', ['healthy', petId]);
    res.json({ ok: true });
  } catch (e) {
    console.error('Cure error:', e);
    res.status(500).json({ error: '治疗失败' });
  }
});

/** 删除宠物，仅限主人 */
router.delete('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const [r] = await pool.execute('SELECT owner_id FROM pets WHERE id = ?', [req.params.id]);
    const pet = (r as unknown as { owner_id: number }[])[0];
    if (!pet || pet.owner_id !== req.userId) return res.status(403).json({ error: '无权限' });
    await pool.execute('DELETE FROM pets WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: '删除失败' });
  }
});

/** 热度排行，取前 20 只宠物 */
router.get('/rank/popular', async (_req, res) => {
  try {
    await ensureMonthlyPopularityReset();
    const [rows] = await pool.execute(
      'SELECT p.*, u.nickname as owner_nickname, u.avatar_url as owner_avatar FROM pets p JOIN users u ON p.owner_id = u.id ORDER BY p.popularity DESC LIMIT 20'
    );
    res.json(rows);
  } catch {
    res.status(500).json({ error: '获取排行榜失败' });
  }
});

export default router;
