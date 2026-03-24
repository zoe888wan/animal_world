import jwt from 'jsonwebtoken';
/**
 * 鉴权中间件：校验 Authorization: Bearer <token>
 * 校验通过时设置 req.userId，失败时返回 401
 */
export function authMiddleware(req, res, next) {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) {
        return res.status(401).json({ error: '未登录' });
    }
    const token = auth.slice(7);
    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
        req.userId = payload.userId;
        next();
    }
    catch {
        return res.status(401).json({ error: '登录已过期' });
    }
}
/** 可选鉴权：有 token 时解析并设置 req.userId，无 token 不报错 */
export function optionalAuthMiddleware(req, res, next) {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer '))
        return next();
    const token = auth.slice(7);
    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
        req.userId = payload.userId;
    }
    catch { }
    next();
}
