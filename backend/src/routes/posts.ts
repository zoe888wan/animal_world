/**
 * 动态帖路由
 * 功能：列表、发布、点赞/取消、评论列表、发表评论
 */
import { Router } from 'express';
import { authMiddleware, optionalAuthMiddleware, AuthRequest } from '../middleware/auth.js';
import { pool } from '../db.js';

const router = Router();

/** 将 JSON 列（可能是字符串或数组）统一为字符串数组，保证前端拿到的都是数组 */
function ensureMediaArray(val: unknown): string[] {
  if (Array.isArray(val)) return val.filter((x) => typeof x === 'string');
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed.filter((x: unknown) => typeof x === 'string') : [];
    } catch {
      return [];
    }
  }
  return [];
}

/** 分页获取动态，带用户和宠物信息 */
router.get('/', async (req, res) => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit), 10) || 20, 50);
    const offset = Math.max(0, parseInt(String(req.query.offset), 10) || 0);
    const [rows] = await pool.execute(
      `SELECT p.*, u.username, u.nickname, u.avatar_url as user_avatar,
        COALESCE(NULLIF(p.pet_display, ''), pet.name) as pet_name,
        pet.avatar_url as pet_avatar
       FROM posts p
       JOIN users u ON p.user_id = u.id
       LEFT JOIN pets pet ON p.pet_id = pet.id
       ORDER BY p.created_at DESC LIMIT ${limit} OFFSET ${offset}`
    );
    const list = (rows as Record<string, unknown>[]).map((row) => ({
      ...row,
      images: ensureMediaArray(row.images),
      videos: ensureMediaArray(row.videos),
    }));
    res.json(list);
  } catch (err) {
    console.error('[GET /posts]', err);
    res.status(500).json({ error: '获取动态失败' });
  }
});

/** 发布动态：可选关联宠物、宠物文本、图片、视频、定位、是否显示时间/定位 */
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { content, images, videos, pet_id, pet_display, location, show_time, show_location } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: '内容不能为空' });
    const imgs = Array.isArray(images) ? JSON.stringify(images) : images ? JSON.stringify([images]) : null;
    const vids = Array.isArray(videos) ? JSON.stringify(videos) : videos ? JSON.stringify([videos]) : null;
    const petDisplay = typeof pet_display === 'string' ? pet_display.trim() || null : null;
    await pool.execute(
      'INSERT INTO posts (user_id, pet_id, pet_display, content, images, videos, location, show_time, show_location) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [req.userId!, pet_id || null, petDisplay, content.trim(), imgs, vids, location || null, show_time !== false ? 1 : 0, show_location ? 1 : 0]
    );
    const [r] = await pool.execute<{ insertId: number }[]>('SELECT LAST_INSERT_ID() as id');
    const id = (r as unknown as { id: number }[])[0].id;
    const [postRows] = await pool.execute('SELECT * FROM posts WHERE id = ?', [id]);
    const post = (postRows as Record<string, unknown>[])[0];
    const [userRows] = await pool.execute('SELECT username, nickname, avatar_url FROM users WHERE id = ?', [req.userId!]);
    const user = (userRows as Record<string, unknown>[])[0];
    const pet = post.pet_id
      ? ((await pool.execute('SELECT name, avatar_url FROM pets WHERE id = ?', [post.pet_id]))[0] as Record<string, unknown>[])[0]
      : null;
    const displayName = petDisplay || pet?.name;
    res.status(201).json({
      ...post,
      images: ensureMediaArray(post.images),
      videos: ensureMediaArray(post.videos),
      pet_display: petDisplay,
      username: user?.username,
      nickname: user?.nickname,
      user_avatar: user?.avatar_url,
      pet_name: displayName,
      pet_avatar: pet?.avatar_url,
    });
  } catch {
    res.status(500).json({ error: '发布失败' });
  }
});

/** 删除动态（仅作者，且发布一个月内可删） */
router.delete('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const [rows] = await pool.execute('SELECT user_id, created_at FROM posts WHERE id = ?', [req.params.id]);
    const post = (rows as { user_id: number; created_at: Date }[])[0];
    if (!post) return res.status(404).json({ error: '动态不存在' });
    if (post.user_id !== req.userId) return res.status(403).json({ error: '只能删除自己的动态' });
    const created = new Date(post.created_at).getTime();
    const monthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    if (created < monthAgo) return res.status(403).json({ error: '发布超过一个月后无法删除' });
    await pool.execute('DELETE FROM posts WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: '删除失败' });
  }
});

/** 点赞，关联宠物热度+1 */
/** 点赞，关联宠物的 popularity +1 */
router.post('/:id/like', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const [ins] = await pool.execute(
      'INSERT IGNORE INTO likes (user_id, post_id) VALUES (?, ?)',
      [req.userId!, req.params.id]
    );
    const affected = (ins as { affectedRows: number }).affectedRows;
    if (affected > 0) {
      await pool.execute(
        'UPDATE pets p INNER JOIN posts po ON p.id = po.pet_id SET p.popularity = p.popularity + 1 WHERE po.id = ?',
        [req.params.id]
      );
    }
    await pool.execute('UPDATE posts SET likes_count = (SELECT COUNT(*) FROM likes WHERE post_id = ?) WHERE id = ?', [req.params.id, req.params.id]);
    const [r] = await pool.execute('SELECT likes_count FROM posts WHERE id = ?', [req.params.id]);
    const likes = (r as { likes_count: number }[])[0];
    res.json({ liked: true, likes_count: likes?.likes_count ?? 0 });
  } catch {
    res.status(500).json({ error: '点赞失败' });
  }
});

/** 取消点赞，关联宠物热度-1 */
/** 取消点赞，关联宠物的 popularity -1 */
router.delete('/:id/like', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const [del] = await pool.execute('DELETE FROM likes WHERE user_id = ? AND post_id = ?', [req.userId!, req.params.id]);
    const affected = (del as { affectedRows: number }).affectedRows;
    if (affected > 0) {
      await pool.execute(
        'UPDATE pets p INNER JOIN posts po ON p.id = po.pet_id SET p.popularity = GREATEST(0, p.popularity - 1) WHERE po.id = ?',
        [req.params.id]
      );
    }
    await pool.execute('UPDATE posts SET likes_count = (SELECT COUNT(*) FROM likes WHERE post_id = ?) WHERE id = ?', [req.params.id, req.params.id]);
    const [r] = await pool.execute('SELECT likes_count FROM posts WHERE id = ?', [req.params.id]);
    const likes = (r as { likes_count: number }[])[0];
    res.json({ liked: false, likes_count: likes?.likes_count ?? 0 });
  } catch {
    res.status(500).json({ error: '取消点赞失败' });
  }
});

/** 增加动态浏览量（用户点开/查看该动态时调用） */
router.post('/:id/view', async (req, res) => {
  try {
    await pool.execute('UPDATE posts SET views_count = IFNULL(views_count, 0) + 1 WHERE id = ?', [req.params.id]);
    const [r] = await pool.execute('SELECT views_count FROM posts WHERE id = ?', [req.params.id]);
    const row = (r as { views_count: number }[])[0];
    res.json({ views_count: row?.views_count ?? 0 });
  } catch {
    res.status(500).json({ error: '操作失败' });
  }
});

/** 获取某条动态的评论列表（含点赞数、当前用户是否点赞），支持分页，默认每页15条 */
const COMMENT_PAGE_SIZE = 15;
const MAX_COMMENTS_PER_POST = 30;

router.get('/:id/comments', optionalAuthMiddleware, async (req, res) => {
  try {
    const userId = (req as AuthRequest).userId ?? null;
    const limit = Math.min(parseInt(String(req.query.limit), 10) || COMMENT_PAGE_SIZE, 30);
    const offset = Math.max(0, parseInt(String(req.query.offset), 10) || 0);
    const [rows] = await pool.execute(
      `SELECT c.*, u.username, u.nickname, u.avatar_url,
        (SELECT COUNT(*) FROM comment_likes WHERE comment_id = c.id) as likes_count
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.post_id = ?
       ORDER BY c.created_at
       LIMIT ${limit} OFFSET ${offset}`,
      [req.params.id]
    );
    const comments = rows as (Record<string, unknown> & { user_id: number; id: number })[];
    if (userId) {
      const ids = comments.map((c) => c.id).filter(Boolean);
      if (ids.length > 0) {
        const [likedRows] = await pool.execute(
          'SELECT comment_id FROM comment_likes WHERE user_id = ? AND comment_id IN (?)',
          [userId, ids]
        );
        const likedSet = new Set((likedRows as { comment_id: number }[]).map((r) => r.comment_id));
        for (const c of comments) {
          c.liked = likedSet.has(c.id);
        }
      }
    }
    for (const c of comments) {
      if (c.liked === undefined) c.liked = false;
      c.likes_count = Number(c.likes_count) || 0;
    }
    res.json(comments);
  } catch {
    res.status(500).json({ error: '获取评论失败' });
  }
});

/** 发表评论，并更新帖子 comments_count。单条动态最多30条评论。 */
router.post('/:id/comments', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: '评论内容不能为空' });
    const [cnt] = await pool.execute('SELECT comments_count FROM posts WHERE id = ?', [req.params.id]);
    const count = (cnt as { comments_count: number }[])[0]?.comments_count ?? 0;
    if (count >= MAX_COMMENTS_PER_POST) return res.status(400).json({ error: '该动态评论已满（最多30条）' });
    await pool.execute('INSERT INTO comments (user_id, post_id, content) VALUES (?, ?, ?)', [req.userId!, req.params.id, content.trim()]);
    await pool.execute('UPDATE posts SET comments_count = comments_count + 1 WHERE id = ?', [req.params.id]);
    const [rows] = await pool.execute('SELECT * FROM comments WHERE user_id = ? AND post_id = ? ORDER BY id DESC LIMIT 1', [req.userId!, req.params.id]);
    const comment = (rows as Record<string, unknown>[])[0];
    const [userRows] = await pool.execute('SELECT username, nickname, avatar_url FROM users WHERE id = ?', [req.userId!]);
    const user = (userRows as Record<string, unknown>[])[0];
    res.status(201).json({
      ...comment,
      username: user?.username,
      nickname: user?.nickname,
      avatar_url: user?.avatar_url,
      likes_count: 0,
      liked: false,
    });
  } catch {
    res.status(500).json({ error: '评论失败' });
  }
});

/** 删除评论（仅评论作者可删，严格校验 user_id） */
router.delete('/:postId/comments/:commentId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { postId, commentId } = req.params;
    const [rows] = await pool.execute('SELECT user_id FROM comments WHERE id = ? AND post_id = ?', [commentId, postId]);
    const comment = (rows as { user_id: number }[])[0];
    if (!comment) return res.status(404).json({ error: '评论不存在' });
    const commentAuthorId = Number(comment.user_id);
    const currentUserId = Number(req.userId);
    if (commentAuthorId !== currentUserId) return res.status(403).json({ error: '只能删除自己的评论' });
    await pool.execute('DELETE FROM comments WHERE id = ?', [commentId]);
    await pool.execute('UPDATE posts SET comments_count = GREATEST(0, comments_count - 1) WHERE id = ?', [postId]);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: '删除失败' });
  }
});

/** 评论点赞 */
router.post('/:postId/comments/:commentId/like', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { postId, commentId } = req.params;
    const [check] = await pool.execute('SELECT 1 FROM comments WHERE id = ? AND post_id = ?', [commentId, postId]);
    if (!(check as unknown[]).length) return res.status(404).json({ error: '评论不存在' });
    await pool.execute('INSERT IGNORE INTO comment_likes (user_id, comment_id) VALUES (?, ?)', [req.userId!, commentId]);
    const [r] = await pool.execute(
      'SELECT COUNT(*) as cnt FROM comment_likes WHERE comment_id = ?',
      [commentId]
    );
    const cnt = (r as { cnt: number }[])[0]?.cnt ?? 0;
    res.json({ liked: true, likes_count: cnt });
  } catch {
    res.status(500).json({ error: '点赞失败' });
  }
});

/** 评论取消点赞 */
router.delete('/:postId/comments/:commentId/like', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { commentId } = req.params;
    await pool.execute('DELETE FROM comment_likes WHERE user_id = ? AND comment_id = ?', [req.userId!, commentId]);
    const [r] = await pool.execute(
      'SELECT COUNT(*) as cnt FROM comment_likes WHERE comment_id = ?',
      [commentId]
    );
    const cnt = (r as { cnt: number }[])[0]?.cnt ?? 0;
    res.json({ liked: false, likes_count: cnt });
  } catch {
    res.status(500).json({ error: '取消点赞失败' });
  }
});

export default router;
