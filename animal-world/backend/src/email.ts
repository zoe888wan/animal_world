/**
 * 邮件发送模块
 * 功能：注册验证链接、登录验证码等邮件发送，支持 SMTP 或开发模式
 */
import nodemailer from 'nodemailer';

/**
 * 创建 Nodemailer 传输器
 * QQ 邮箱需在 .env 设置：SMTP_USER=你的QQ邮箱、SMTP_PASS=授权码（在QQ邮箱-设置-账户中获取）
 * @returns 配置了 SMTP 的 transporter，未配置时返回 null
 */
function createTransport() {
  const host = process.env.SMTP_HOST || 'smtp.qq.com';
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  if (!user) return null;
  if (!pass) {
    console.error('[SMTP] 未配置 SMTP_PASS，请在 .env 中添加 QQ 邮箱授权码。获取方式：QQ邮箱 -> 设置 -> 账户 -> POP3/SMTP -> 生成授权码');
    return null;
  }
  return nodemailer.createTransport({
    host,
    port: parseInt(process.env.SMTP_PORT || '465', 10),
    secure: true,
    auth: { user, pass },
  });
}

/**
 * 发送注册邮箱验证邮件
 * @param to 收件人邮箱
 * @param token 验证 token，用于拼成链接
 * @param baseUrl 前端根地址，用于生成验证链接
 * @returns 是否发送成功（开发模式无 SMTP 时也视为成功）
 */
export async function sendVerificationEmail(to: string, token: string, baseUrl: string): Promise<boolean> {
  const transporter = createTransport();
  const from = process.env.EMAIL_FROM || process.env.SMTP_USER || 'noreply@animal-world.local';
  const verifyUrl = `${baseUrl.replace(/\/$/, '')}/verify-email?token=${token}`;

  const html = `
    <p>你好，欢迎注册动物世界！</p>
    <p>请点击下方链接验证你的邮箱：</p>
    <p><a href="${verifyUrl}">${verifyUrl}</a></p>
    <p>链接 24 小时内有效。如非本人操作请忽略。</p>
  `;

  if (transporter) {
    try {
      const fromAddr = from.includes('<') ? from : `"动物世界" <${from}>`;
      await transporter.sendMail({
        from: fromAddr,
        to,
        subject: '【动物世界】邮箱验证',
        html,
      });
      return true;
    } catch (e) {
      console.error('Send email error:', e);
      const err = e as { code?: string };
      if (err.code === 'EAUTH') {
        console.error('[SMTP] 认证失败：请检查 SMTP_PASS（QQ邮箱需使用授权码）');
      }
      return false;
    }
  }
  console.log('[Dev] 未配置 SMTP，验证链接:', verifyUrl);
  return true;
}

/**
 * 发送登录验证码邮件
 * @param to 收件人邮箱
 * @param code 6 位数字验证码
 * @returns 是否发送成功
 */
export async function sendLoginCodeEmail(to: string, code: string): Promise<boolean> {
  const transporter = createTransport();
  const from = process.env.EMAIL_FROM || process.env.SMTP_USER || 'noreply@animal-world.local';

  const html = `
    <p>你好，你正在使用验证码登录动物世界。</p>
    <p>验证码：<strong>${code}</strong></p>
    <p>5 分钟内有效，如非本人操作请忽略。</p>
  `;

  if (transporter) {
    try {
      const fromAddr = from.includes('<') ? from : `"动物世界" <${from}>`;
      await transporter.sendMail({
        from: fromAddr,
        to,
        subject: '【动物世界】登录验证码',
        html,
      });
      return true;
    } catch (e) {
      console.error('Send login code email error:', e);
      const err = e as { code?: string; response?: string };
      if (err.code === 'EAUTH') {
        console.error('[SMTP] 认证失败：请检查 SMTP_USER 和 SMTP_PASS（QQ邮箱需使用授权码，非登录密码）');
      } else if (err.response) {
        console.error('[SMTP] 服务器响应:', err.response);
      }
      return false;
    }
  }
  console.log('[Dev] 未配置 SMTP，登录验证码:', code);
  return false;
}
