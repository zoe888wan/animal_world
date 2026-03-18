/**
 * 约玩活动路由
 * 功能：活动列表、创建活动、报名参加（须填手机号，身份验证由邮箱完成）、取消报名、报名名单
 */
import { Router } from 'express';
import { authMiddleware, optionalAuthMiddleware, AuthRequest } from '../middleware/auth.js';
import { pool } from '../db.js';

const router = Router();

/** 获取未结束的约玩活动列表，支持按 event_type/city/district 筛选 */
router.get('/', optionalAuthMiddleware, async (req: AuthRequest, res) => {
  try {
    const event_type = typeof req.query.event_type === 'string' ? req.query.event_type.trim() : '';
    const city = typeof req.query.city === 'string' ? req.query.city.trim() : '';
    const district = typeof req.query.district === 'string' ? req.query.district.trim() : '';
    let sql = `SELECT e.*, u.nickname as creator_nickname, u.avatar_url as creator_avatar, u.credit_score as creator_credit_score,
        (SELECT COUNT(*) FROM event_participants WHERE event_id = e.id) as participants_count
       FROM events e JOIN users u ON e.creator_id = u.id
       WHERE e.event_date >= DATE_SUB(NOW(), INTERVAL 24 HOUR) AND (e.cancelled = 0 OR e.cancelled IS NULL)`;
    const params: (string | number)[] = [];
    if (event_type) { sql += ' AND (e.event_type = ? OR (e.event_type IS NULL AND ? = \'other\'))'; params.push(event_type, event_type); }
    if (city) { sql += ' AND e.city = ?'; params.push(city); }
    if (district) { sql += ' AND e.district = ?'; params.push(district); }
    sql += ' ORDER BY e.event_date ASC LIMIT 50';
    const [rows] = params.length > 0 ? await pool.execute(sql, params) : await pool.execute(sql);
    const events = rows as Record<string, unknown>[];
    if (req.userId) {
      const eventIds = events.map((e) => (e as { id: number }).id);
      let joinedIds = new Set<number>();
      if (eventIds.length > 0) {
        const [joinedRows] = await pool.execute(
          'SELECT event_id FROM event_participants WHERE user_id = ? AND event_id IN (?)',
          [req.userId, eventIds]
        );
        joinedIds = new Set((joinedRows as { event_id: number }[]).map((r) => r.event_id));
      }
      for (const ev of events) {
        (ev as Record<string, unknown>).is_joined = joinedIds.has(Number(ev.id));
      }
    } else {
      for (const ev of events) (ev as Record<string, unknown>).is_joined = false;
    }
    res.json(events);
  } catch (e) {
    console.error('List events error:', e);
    res.status(500).json({ error: '获取活动失败' });
  }
});

/** 获取当前用户报名的活动列表（含已取消，用于显示活动已取消） */
router.get('/my', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT e.*, u.nickname as creator_nickname, u.avatar_url as creator_avatar, u.credit_score as creator_credit_score,
        (SELECT COUNT(*) FROM event_participants WHERE event_id = e.id) as participants_count
       FROM events e JOIN users u ON e.creator_id = u.id
       JOIN event_participants ep ON ep.event_id = e.id AND ep.user_id = ?
       WHERE e.event_date >= NOW() ORDER BY e.event_date ASC, e.id DESC LIMIT 50`,
      [req.userId!]
    );
    const events = rows as Record<string, unknown>[];
    for (const ev of events) {
      (ev as Record<string, unknown>).is_joined = true;
      (ev as Record<string, unknown>).is_cancelled = !!(ev.cancelled);
      (ev as Record<string, unknown>).cancel_reason = ev.cancel_reason || null;
    }
    res.json(events);
  } catch (e) {
    console.error('My events error:', e);
    res.status(500).json({ error: '获取失败' });
  }
});

/** 活动签到：参与者在活动时间范围内可签到 */
router.post('/:id/checkin', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const eventId = parseInt(req.params.id, 10);
    if (isNaN(eventId)) return res.status(400).json({ error: '无效活动' });
    const [evRows] = await pool.execute(
      'SELECT id, creator_id, event_date, event_end FROM events WHERE id = ? AND (cancelled = 0 OR cancelled IS NULL)',
      [eventId]
    );
    const ev = (evRows as { id: number; creator_id: number; event_date: Date; event_end?: Date }[])[0];
    if (!ev) return res.status(404).json({ error: '活动不存在或已取消' });
    const [partRows] = await pool.execute(
      'SELECT 1 FROM event_participants WHERE event_id = ? AND user_id = ?',
      [eventId, req.userId!]
    );
    const isCreator = ev.creator_id === req.userId;
    const isParticipant = (partRows as unknown[]).length > 0;
    if (!isCreator && !isParticipant) return res.status(403).json({ error: '仅参与者或发起者可签到' });
    const now = new Date();
    const start = new Date(ev.event_date);
    const end = ev.event_end ? new Date(ev.event_end) : new Date(ev.event_date);
    end.setHours(end.getHours() + 1);
    if (now < start) return res.status(400).json({ error: '活动尚未开始，无法签到' });
    if (now > end) return res.status(400).json({ error: '活动已结束，无法签到' });
    await pool.execute(
      'INSERT INTO event_checkins (event_id, user_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE checked_at = NOW()',
      [eventId, req.userId!]
    );
    res.json({ ok: true, checked: true });
  } catch (e) {
    console.error('Checkin error:', e);
    res.status(500).json({ error: '签到失败' });
  }
});

/** 获取活动签到名单 */
router.get('/:id/checkins', async (req, res) => {
  try {
    const eventId = parseInt(req.params.id, 10);
    if (isNaN(eventId)) return res.status(400).json({ error: '无效活动' });
    const [rows] = await pool.execute(
      'SELECT c.user_id, c.checked_at, u.nickname, u.username FROM event_checkins c JOIN users u ON c.user_id = u.id WHERE c.event_id = ? ORDER BY c.checked_at',
      [eventId]
    );
    res.json(rows);
  } catch {
    res.status(500).json({ error: '获取签到名单失败' });
  }
});

/** 获取活动报名名单（不含手机号，隐私保护：电话由系统管理，不对外暴露） */
router.get('/:id/participants', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT ep.user_id, ep.noshow, u.nickname, u.username, u.credit_score FROM event_participants ep
       JOIN users u ON ep.user_id = u.id
       WHERE ep.event_id = ? ORDER BY ep.created_at ASC`,
      [req.params.id]
    );
    res.json(rows);
  } catch {
    res.status(500).json({ error: '获取报名名单失败' });
  }
});

/** 格式化 datetime-local 为 MySQL DATETIME（YYYY-MM-DD HH:mm:ss） */
function toMysqlDatetime(val: string | undefined): string | null {
  if (!val || typeof val !== 'string') return null;
  const s = val.trim().replace('T', ' ');
  if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(s)) return null;
  return s.length === 16 ? `${s}:00` : s;
}

const EVENT_TYPES = ['遛狗', '餐厅', '拍照', '户外', '室内', '其他'];
/** 创建约玩活动：标题、描述、地点（省市区+详细）、活动类型、开始/结束时间；须信誉分>=1 */
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const [userRows] = await pool.execute(
      'SELECT bio, credit_score FROM users WHERE id = ?',
      [req.userId!]
    );
    const u = (userRows as { bio?: string; credit_score?: number }[])[0];
    if (!u) return res.status(404).json({ error: '用户不存在' });
    const credit = u.credit_score ?? 3;
    if (credit < 1) return res.status(400).json({ error: '信誉分不足，无法发起活动（0分及以下需先购买恢复）' });
    if (!u.bio?.trim()) return res.status(400).json({ error: '请先在个人设置中填写个人简介，才能发起活动' });
    const { title, description, location, event_date, event_end, max_participants, event_type, province, city, district } = req.body;
    if (!title?.trim()) return res.status(400).json({ error: '活动标题必填' });
    if (!description?.trim()) return res.status(400).json({ error: '活动目的必填' });
    const loc = typeof location === 'string' ? location.trim() : '';
    if (!loc) return res.status(400).json({ error: '请填写完整地址（省市区+详细地址）' });
    const evType = EVENT_TYPES.includes(event_type) ? event_type : '其他';
    const prov = typeof province === 'string' ? province.trim() : '';
    const cty = typeof city === 'string' ? city.trim() : '';
    const dist = typeof district === 'string' ? district.trim() : '';
    const startDt = toMysqlDatetime(event_date);
    if (!startDt) return res.status(400).json({ error: '请选择活动开始时间' });
    const endDt = toMysqlDatetime(event_end);
    if (!endDt) return res.status(400).json({ error: '请选择活动结束时间' });
    if (endDt <= startDt) return res.status(400).json({ error: '结束时间须晚于开始时间' });
    const maxP = Math.max(2, Math.min(100, parseInt(String(max_participants), 10) || 10));
    try {
      await pool.execute(
        `INSERT INTO events (creator_id, title, description, location, event_type, province, city, district, event_date, event_end, max_participants)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [req.userId!, title.trim(), description || null, loc, evType, prov || null, cty || null, dist || null, startDt, endDt, maxP]
      );
    } catch {
      try {
        await pool.execute(
          'INSERT INTO events (creator_id, title, description, location, event_date, event_end, max_participants) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [req.userId!, title.trim(), description || null, loc, startDt, endDt, maxP]
        );
      } catch {
        try {
          await pool.execute(
            'INSERT INTO events (creator_id, title, description, location, event_date, event_end_date, max_participants) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [req.userId!, title.trim(), description || null, loc, startDt, endDt, maxP]
          );
        } catch {
          await pool.execute(
            'INSERT INTO events (creator_id, title, description, location, event_date, max_participants) VALUES (?, ?, ?, ?, ?, ?)',
            [req.userId!, title.trim(), description || null, loc, startDt, maxP]
          );
        }
      }
    }
    const [rows] = await pool.execute(
      `SELECT e.*, u.nickname as creator_nickname, u.avatar_url as creator_avatar, u.credit_score as creator_credit_score,
        (SELECT COUNT(*) FROM event_participants ep WHERE ep.event_id = e.id) as participants_count
       FROM events e JOIN users u ON e.creator_id = u.id
       WHERE e.creator_id = ? ORDER BY e.id DESC LIMIT 1`,
      [req.userId!]
    );
    res.status(201).json((rows as Record<string, unknown>[])[0]);
  } catch (e) {
    console.error('Create event error:', e);
    res.status(500).json({ error: '创建活动失败' });
  }
});

/** 报名参加活动：需填写手机号（必填），身份验证由邮箱完成；信誉分须>=1 */
router.post('/:id/join', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const [ucRows] = await pool.execute(
      'SELECT credit_score FROM users WHERE id = ?',
      [req.userId!]
    );
    const uc = (ucRows as { credit_score?: number }[])[0];
    const credit = uc?.credit_score ?? 3;
    if (credit < 1) return res.status(400).json({ error: '信誉分不足，无法报名（0分及以下需先购买恢复）' });
    const { pet_id, phone } = req.body;
    const phoneStr = typeof phone === 'string' ? phone.trim() : '';
    if (!/^1[3-9]\d{9}$/.test(phoneStr)) {
      return res.status(400).json({ error: '请填写正确的11位手机号' });
    }
    const eventId = parseInt(req.params.id, 10);
    if (isNaN(eventId)) return res.status(400).json({ error: '无效活动' });
    const [evRows] = await pool.execute(
      'SELECT id, event_date, max_participants, cancelled FROM events WHERE id = ?',
      [eventId]
    );
    const ev = (evRows as { id: number; event_date: Date; max_participants: number; cancelled?: number }[])[0];
    if (!ev) return res.status(404).json({ error: '活动不存在' });
    if (ev.cancelled) return res.status(400).json({ error: '活动已取消' });
    const [cntRows] = await pool.execute(
      'SELECT COUNT(*) as c FROM event_participants WHERE event_id = ?',
      [eventId]
    );
    const cnt = (cntRows as { c: number }[])[0]?.c ?? 0;
    if (cnt >= ev.max_participants) return res.status(400).json({ error: '人数已满' });
    await pool.execute(
      'INSERT INTO event_participants (event_id, user_id, pet_id, phone) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE pet_id = VALUES(pet_id), phone = VALUES(phone)',
      [eventId, req.userId!, pet_id || null, phoneStr]
    );
    res.json({ joined: true });
  } catch (e) {
    console.error('Join event error:', e);
    res.status(500).json({ error: '报名失败' });
  }
});

/** 取消报名（活动开始前3天内不可取消） */
router.delete('/:id/leave', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const eventId = parseInt(req.params.id, 10);
    if (isNaN(eventId)) return res.status(400).json({ error: '无效活动' });
    const [rows] = await pool.execute(
      'SELECT event_date FROM events WHERE id = ?',
      [eventId]
    );
    const ev = (rows as { event_date: Date }[])[0];
    if (!ev) return res.status(404).json({ error: '活动不存在' });
    const eventStart = new Date(ev.event_date);
    const threeDaysBefore = new Date(eventStart);
    threeDaysBefore.setDate(threeDaysBefore.getDate() - 3);
    if (new Date() > threeDaysBefore) {
      return res.status(400).json({ error: '活动开始前3天内不可取消报名' });
    }
    const [r] = await pool.execute(
      'DELETE FROM event_participants WHERE event_id = ? AND user_id = ?',
      [eventId, req.userId!]
    );
    const affected = (r as { affectedRows?: number })?.affectedRows ?? 0;
    res.json({ left: affected > 0 });
  } catch (e) {
    console.error('Leave event error:', e);
    res.status(500).json({ error: '取消失败' });
  }
});

/** 发起者取消活动（活动开始前一周内可取消），并通知报名者 */
router.post('/:id/cancel', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const eventId = parseInt(req.params.id, 10);
    const { cancel_reason } = req.body || {};
    if (isNaN(eventId)) return res.status(400).json({ error: '无效活动' });
    const [evRows] = await pool.execute(
      'SELECT id, creator_id, title, event_date, cancelled FROM events WHERE id = ?',
      [eventId]
    );
    const ev = (evRows as { id: number; creator_id: number; title: string; event_date: Date; cancelled?: number }[])[0];
    if (!ev) return res.status(404).json({ error: '活动不存在' });
    if (ev.creator_id !== req.userId) return res.status(403).json({ error: '只有发起者可取消活动' });
    if (ev.cancelled) return res.status(400).json({ error: '活动已取消' });
    const eventStart = new Date(ev.event_date);
    const oneWeekBefore = new Date(eventStart);
    oneWeekBefore.setDate(oneWeekBefore.getDate() - 7);
    if (new Date() > oneWeekBefore) {
      return res.status(400).json({ error: '活动开始前一周内不可取消' });
    }
    const reason = typeof cancel_reason === 'string' ? cancel_reason.trim() : '';
    if (!reason) return res.status(400).json({ error: '请填写取消原因' });
    await pool.execute(
      'UPDATE events SET cancelled = 1, cancel_reason = ?, cancelled_at = NOW() WHERE id = ?',
      [reason, eventId]
    );
    const [participants] = await pool.execute(
      'SELECT user_id FROM event_participants WHERE event_id = ? AND user_id != ?',
      [eventId, req.userId!]
    );
    const pids = (participants as { user_id: number }[]).map((p) => p.user_id);
    for (const uid of pids) {
      await pool.execute(
        'INSERT INTO notifications (user_id, type, title, content, event_id) VALUES (?, ?, ?, ?, ?)',
        [uid, 'event_cancelled', '活动已取消', `${ev.title} 已取消。取消原因：${reason}`, eventId]
      );
    }
    res.json({ cancelled: true });
  } catch (e) {
    console.error('Cancel event error:', e);
    res.status(500).json({ error: '取消失败' });
  }
});

/** 活动完成需全体参与者（含举办者）确认，活动举行日期 12h 后开放；全部确认后每人 +1 信誉分 */
router.post('/:id/confirm-complete', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const eventId = parseInt(req.params.id, 10);
    if (isNaN(eventId)) return res.status(400).json({ error: '无效活动' });
    const [evRows] = await pool.execute(
      'SELECT id, creator_id, event_date, event_end, cancelled, completed_credit_given FROM events WHERE id = ?',
      [eventId]
    );
    const ev = (evRows as { id: number; creator_id: number; event_date: Date; event_end?: Date; cancelled?: number; completed_credit_given?: number }[])[0];
    if (!ev) return res.status(404).json({ error: '活动不存在' });
    if (ev.cancelled) return res.status(400).json({ error: '活动已取消，无法确认完成' });
    const endTime = ev.event_end ? new Date(ev.event_end) : new Date(ev.event_date);
    endTime.setHours(endTime.getHours() + 12);
    if (new Date() < endTime) return res.status(400).json({ error: '活动举行日期 12 小时后方可确认完成' });
    if (ev.completed_credit_given) return res.json({ ok: true, all_confirmed: true, credited: true, confirmed_count: 0, total_count: 0 });

    const [parts] = await pool.execute('SELECT user_id FROM event_participants WHERE event_id = ?', [eventId]);
    const participantIds = new Set((parts as { user_id: number }[]).map((p) => p.user_id));
    participantIds.add(ev.creator_id);
    const totalCount = participantIds.size;

    if (!participantIds.has(req.userId!)) return res.status(403).json({ error: '仅参与者（含举办者）可确认完成' });

    await pool.execute(
      'INSERT IGNORE INTO event_completion_confirmations (event_id, user_id) VALUES (?, ?)',
      [eventId, req.userId!]
    );

    const [confRows] = await pool.execute(
      'SELECT user_id FROM event_completion_confirmations WHERE event_id = ?',
      [eventId]
    );
    const confirmedIds = new Set((confRows as { user_id: number }[]).map((r) => r.user_id));
    const confirmedCount = confirmedIds.size;

    if (confirmedCount >= totalCount) {
      await pool.execute('UPDATE events SET completed_credit_given = 1, completed_at = NOW() WHERE id = ?', [eventId]);
      for (const uid of participantIds) {
        await pool.execute('UPDATE users SET credit_score = COALESCE(credit_score, 3) + 1 WHERE id = ?', [uid]);
      }
      return res.json({ ok: true, all_confirmed: true, credited: true, confirmed_count: totalCount, total_count: totalCount });
    }
    res.json({ ok: true, all_confirmed: false, credited: false, confirmed_count: confirmedCount, total_count: totalCount });
  } catch (e) {
    console.error('Confirm complete error:', e);
    res.status(500).json({ error: '操作失败' });
  }
});

/** 获取活动完成确认状态（参与者和举办者可查） */
router.get('/:id/completion-status', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const eventId = parseInt(req.params.id, 10);
    if (isNaN(eventId)) return res.status(400).json({ error: '无效活动' });
    const [evRows] = await pool.execute(
      'SELECT id, creator_id, event_date, event_end, cancelled, completed_credit_given FROM events WHERE id = ?',
      [eventId]
    );
    const ev = (evRows as { id: number; creator_id: number; event_date: Date; event_end?: Date; cancelled?: number; completed_credit_given?: number }[])[0];
    if (!ev) return res.status(404).json({ error: '活动不存在' });
    const [parts] = await pool.execute('SELECT user_id FROM event_participants WHERE event_id = ?', [eventId]);
    const participantIds = new Set((parts as { user_id: number }[]).map((p) => p.user_id));
    participantIds.add(ev.creator_id);
    if (!participantIds.has(req.userId!)) return res.status(403).json({ error: '仅参与者可查看' });
    const [confRows] = await pool.execute(
      'SELECT user_id FROM event_completion_confirmations WHERE event_id = ?',
      [eventId]
    );
    const confirmedIds = (confRows as { user_id: number }[]).map((r) => r.user_id);
    const currentUserConfirmed = confirmedIds.includes(req.userId!);
    res.json({
      total_count: participantIds.size,
      confirmed_count: confirmedIds.length,
      confirmed_user_ids: confirmedIds,
      current_user_confirmed: currentUserConfirmed,
      completed_credit_given: !!ev.completed_credit_given,
    });
  } catch (e) {
    console.error('Completion status error:', e);
    res.status(500).json({ error: '获取失败' });
  }
});

/** 活动互评：参与者对其他参与者评分 1-5，评价<=30字；活动结束后可评价 */
router.post('/:id/reviews', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const eventId = parseInt(req.params.id, 10);
    const { to_user_id, rating, comment } = req.body || {};
    if (isNaN(eventId)) return res.status(400).json({ error: '无效活动' });
    const toId = parseInt(String(to_user_id), 10);
    const score = parseInt(String(rating), 10);
    const text = typeof comment === 'string' ? comment.trim() : '';
    if (isNaN(toId) || toId <= 0) return res.status(400).json({ error: '无效评价对象' });
    if (toId === req.userId) return res.status(400).json({ error: '不能评价自己' });
    if (isNaN(score) || score < 1 || score > 5) return res.status(400).json({ error: '评分需为 1-5 分' });
    if (text.length > 30) return res.status(400).json({ error: '评价最多 30 字' });

    const [evRows] = await pool.execute(
      'SELECT id, event_date, event_end, cancelled FROM events WHERE id = ?',
      [eventId]
    );
    const ev = (evRows as { id: number; event_date: Date; event_end?: Date; cancelled?: number }[])[0];
    if (!ev) return res.status(404).json({ error: '活动不存在' });
    if (ev.cancelled) return res.status(400).json({ error: '活动已取消，无法评价' });
    const endTime = ev.event_end ? new Date(ev.event_end) : new Date(ev.event_date);
    endTime.setHours(endTime.getHours() + 1);
    if (new Date() < endTime) return res.status(400).json({ error: '活动结束后方可评价' });

    const [meRows] = await pool.execute(
      'SELECT 1 FROM event_participants WHERE event_id = ? AND user_id = ? LIMIT 1',
      [eventId, req.userId!]
    );
    if ((meRows as unknown[]).length === 0) return res.status(403).json({ error: '仅参与者可评价' });
    const [toRows] = await pool.execute(
      'SELECT 1 FROM event_participants WHERE event_id = ? AND user_id = ? LIMIT 1',
      [eventId, toId]
    );
    if ((toRows as unknown[]).length === 0) return res.status(400).json({ error: '对方不是该活动参与者' });

    await pool.execute(
      `INSERT INTO event_reviews (event_id, from_user_id, to_user_id, rating, comment)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE rating = VALUES(rating), comment = VALUES(comment), updated_at = NOW()`,
      [eventId, req.userId!, toId, score, text || null]
    );
    res.json({ ok: true });
  } catch (e) {
    console.error('Create review error:', e);
    res.status(500).json({ error: '评价失败' });
  }
});

/** 发起者标记未赴约：活动结束后可标记，被标记用户扣1信誉分 */
router.post('/:id/mark-noshow', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const eventId = parseInt(req.params.id, 10);
    const { user_ids } = req.body || {};
    if (isNaN(eventId)) return res.status(400).json({ error: '无效活动' });
    const ids = Array.isArray(user_ids) ? user_ids.map((x: unknown) => parseInt(String(x), 10)).filter((n) => !isNaN(n)) : [];
    if (ids.length === 0) return res.status(400).json({ error: '请选择要标记的参与者' });
    const [evRows] = await pool.execute(
      'SELECT id, creator_id, event_date, event_end FROM events WHERE id = ?',
      [eventId]
    );
    const ev = (evRows as { id: number; creator_id: number; event_date: Date; event_end?: Date }[])[0];
    if (!ev) return res.status(404).json({ error: '活动不存在' });
    if (ev.creator_id !== req.userId) return res.status(403).json({ error: '只有发起者可标记未赴约' });
    const endTime = ev.event_end ? new Date(ev.event_end) : new Date(ev.event_date);
    endTime.setHours(endTime.getHours() + 1);
    if (new Date() < endTime) {
      return res.status(400).json({ error: '活动结束后方可标记未赴约' });
    }
    for (const uid of ids) {
      if (uid === req.userId) continue;
      const [epRows] = await pool.execute(
        'SELECT id, noshow FROM event_participants WHERE event_id = ? AND user_id = ?',
        [eventId, uid]
      );
      const ep = (epRows as { id: number; noshow?: number }[])[0];
      if (!ep) continue;
      if (ep.noshow) continue;
      const [ckRows] = await pool.execute('SELECT 1 FROM event_checkins WHERE event_id = ? AND user_id = ?', [eventId, uid]);
      if ((ckRows as unknown[]).length > 0) continue;
      await pool.execute('UPDATE event_participants SET noshow = 1 WHERE id = ?', [ep.id]);
      await pool.execute(
        'UPDATE users SET credit_score = GREATEST(0, COALESCE(credit_score, 3) - 1) WHERE id = ?',
        [uid]
      );
    }
    res.json({ ok: true });
  } catch (e) {
    console.error('Mark noshow error:', e);
    res.status(500).json({ error: '操作失败' });
  }
});

export default router;
