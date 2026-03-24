/**
 * 认证路由
 * 功能：注册、密码登录、验证码登录、发送验证码、邮箱链接验证
 */
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { pool } from '../db.js';
import { sendVerificationEmail, sendLoginCodeEmail } from '../email.js';
const router = Router();
/** 注册：写入用户、发验证邮件、返回 JWT。用户名可重复，邮箱唯一（一个邮箱只能注册一个账号） */
router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        if (!username || !email || !password) {
            return res.status(400).json({ error: '用户名、邮箱和密码必填' });
        }
        const emailNorm = String(email).trim().toLowerCase();
        const [existRows] = await pool.execute('SELECT 1 FROM users WHERE email = ?', [emailNorm]);
        if (existRows.length > 0) {
            return res.status(400).json({ error: '该邮箱已注册' });
        }
        const hash = await bcrypt.hash(password, 10);
        const verifyToken = crypto.randomBytes(32).toString('hex');
        const verifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
        let insertId;
        try {
            const [r] = await pool.execute('INSERT INTO users (username, email, password_hash, email_verified, email_verify_token, email_verify_expires) VALUES (?, ?, ?, 0, ?, ?)', [username, emailNorm, hash, verifyToken, verifyExpires]);
            insertId = r.insertId;
        }
        catch (e) {
            const err = e;
            // 兼容旧版 schema：users 表可能没有邮箱验证相关字段
            if (err.code === 'ER_BAD_FIELD_ERROR') {
                const [r] = await pool.execute('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)', [username, emailNorm, hash]);
                insertId = r.insertId;
            }
            else {
                throw e;
            }
        }
        const [rows] = await pool.execute('SELECT id, username, email FROM users WHERE id = ?', [insertId]);
        const user = rows[0];
        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '7d' });
        const baseUrl = process.env.FRONTEND_URL || `http://localhost:${process.env.FRONTEND_PORT || '5173'}`;
        // 兼容旧版 schema：如果没有邮箱验证字段，仍允许注册并跳过邮件
        await sendVerificationEmail(emailNorm, verifyToken, baseUrl);
        res.json({ user: { id: user.id, username: user.username, email: user.email }, token });
    }
    catch (e) {
        const err = e;
        if (err.code === 'ER_DUP_ENTRY') {
            const msg = err.message || '';
            if (msg.includes('email'))
                return res.status(400).json({ error: '该邮箱已注册' });
            if (msg.includes('username'))
                return res.status(400).json({ error: '该用户名已被使用' });
            return res.status(400).json({ error: '注册信息重复' });
        }
        console.error('Register error:', err);
        const msg = process.env.NODE_ENV === 'development' && err.message ? err.message : '注册失败';
        res.status(500).json({ error: msg });
    }
});
/** 密码登录：校验邮箱+密码，返回用户与 JWT */
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: '邮箱和密码必填' });
        }
        const emailNorm = String(email).trim().toLowerCase();
        const [rows] = await pool.execute('SELECT id, username, email, password_hash, avatar_url, nickname FROM users WHERE email = ?', [emailNorm]);
        const user = rows[0];
        if (!user || !(await bcrypt.compare(password, user.password_hash))) {
            return res.status(401).json({ error: '邮箱或密码错误' });
        }
        const [cRows] = await pool.execute('SELECT COALESCE(coins, 0) as coins FROM users WHERE id = ?', [user.id]);
        const coins = cRows[0]?.coins ?? 0;
        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '7d' });
        const { password_hash: _, ...safe } = user;
        res.json({ user: { ...safe, coins }, token });
    }
    catch {
        res.status(500).json({ error: '登录失败' });
    }
});
/** 发送登录验证码：仅限 QQ 邮箱 (@qq.com)，6 位数字，5 分钟有效 */
router.post('/send-code', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email || typeof email !== 'string') {
            return res.status(400).json({ error: '请输入邮箱' });
        }
        const emailNorm = email.trim().toLowerCase();
        if (!emailNorm.endsWith('@qq.com')) {
            return res.status(400).json({ error: '验证码登录仅支持 QQ 邮箱，其他邮箱请使用密码登录' });
        }
        const [rows] = await pool.execute('SELECT id, email FROM users WHERE email = ?', [emailNorm]);
        const user = rows[0];
        if (!user) {
            return res.status(404).json({ error: '该邮箱未注册' });
        }
        const code = crypto.randomInt(100000, 999999).toString();
        const expires = new Date(Date.now() + 5 * 60 * 1000);
        try {
            await pool.execute('UPDATE users SET login_code = ?, login_code_expires = ? WHERE id = ?', [code, expires, user.id]);
        }
        catch (e) {
            const err = e;
            // 兼容旧版 schema：没有验证码字段时直接报错提示升级数据库
            if (err.code === 'ER_BAD_FIELD_ERROR') {
                return res.status(500).json({ error: '服务器未启用验证码登录（数据库未升级），请使用密码登录' });
            }
            throw e;
        }
        const ok = await sendLoginCodeEmail(user.email, code);
        if (!ok) {
            return res.status(500).json({ error: '验证码发送失败，请稍后重试' });
        }
        res.json({ ok: true, message: '验证码已发送到邮箱' });
    }
    catch (e) {
        console.error('Send code error:', e);
        res.status(500).json({ error: '发送失败' });
    }
});
/** 验证码登录：校验邮箱+验证码，验证后清除验证码并返回 JWT */
router.post('/login-with-code', async (req, res) => {
    try {
        const { email, code } = req.body;
        if (!email || !code || typeof email !== 'string' || typeof code !== 'string') {
            return res.status(400).json({ error: '邮箱和验证码必填' });
        }
        const emailNorm = email.trim().toLowerCase();
        const [rows] = await pool.execute('SELECT id, username, email, avatar_url, nickname, login_code, login_code_expires FROM users WHERE email = ?', [emailNorm]);
        const user = rows[0];
        if (!user) {
            return res.status(401).json({ error: '邮箱或验证码错误' });
        }
        if (!user.login_code || user.login_code !== code.trim()) {
            return res.status(401).json({ error: '验证码错误' });
        }
        if (!user.login_code_expires || new Date(user.login_code_expires) < new Date()) {
            return res.status(401).json({ error: '验证码已过期，请重新获取' });
        }
        await pool.execute('UPDATE users SET login_code = NULL, login_code_expires = NULL WHERE id = ?', [user.id]);
        const [cRows] = await pool.execute('SELECT COALESCE(coins, 0) as coins FROM users WHERE id = ?', [user.id]);
        const coins = cRows[0]?.coins ?? 0;
        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '7d' });
        const { login_code: _, login_code_expires: __, ...safe } = user;
        res.json({ user: { ...safe, coins }, token });
    }
    catch {
        res.status(500).json({ error: '登录失败' });
    }
});
/** 邮箱验证：通过注册邮件中的 token 验证，并置位 email_verified */
router.get('/verify-email', async (req, res) => {
    try {
        const { token } = req.query;
        if (!token || typeof token !== 'string') {
            return res.status(400).json({ error: '缺少验证码' });
        }
        const [rows] = await pool.execute('SELECT id, username, email FROM users WHERE email_verify_token = ? AND email_verify_expires > NOW()', [token]);
        const user = rows[0];
        if (!user) {
            return res.status(400).json({ error: '验证链接无效或已过期' });
        }
        await pool.execute('UPDATE users SET email_verified = 1, email_verify_token = NULL, email_verify_expires = NULL WHERE id = ?', [user.id]);
        res.json({ ok: true, message: '邮箱验证成功' });
    }
    catch (e) {
        console.error('Verify email error:', e);
        res.status(500).json({ error: '验证失败' });
    }
});
export default router;
