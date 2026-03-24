/**
 * 登录页
 * 功能：密码登录、验证码登录切换，发送验证码（60s 倒计时），登录成功后跳转首页
 */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import styles from './Auth.module.css';

type Mode = 'password' | 'code';

export default function Login() {
  const [mode, setMode] = useState<Mode>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const [codeCountdown, setCodeCountdown] = useState(0);
  const { login, loginWithCode } = useAuth();
  const navigate = useNavigate();

  /** 发送登录验证码，启动 60 秒倒计时 */
  const handleSendCode = async () => {
    setErr('');
    try {
      await api.auth.sendCode(email);
      setCodeCountdown(60);
      const timer = setInterval(() => {
        setCodeCountdown((c) => {
          if (c <= 1) {
            clearInterval(timer);
            return 0;
          }
          return c - 1;
        });
      }, 1000);
    } catch (e) {
      setErr(e instanceof Error ? e.message : '发送失败');
    }
  };

  /** 表单提交：根据 mode 调用密码或验证码登录 */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    try {
      if (mode === 'password') {
        await login(email, password);
      } else {
        await loginWithCode(email, code);
      }
      navigate('/');
    } catch (e) {
      setErr(e instanceof Error ? e.message : '登录失败');
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1>🐾 动物世界</h1>
        <h2>登录</h2>
        <div className={styles.tabs}>
          <button type="button" className={mode === 'password' ? styles.tabActive : ''} onClick={() => setMode('password')}>
            密码登录
          </button>
          <button type="button" className={mode === 'code' ? styles.tabActive : ''} onClick={() => setMode('code')}>
            验证码登录
          </button>
        </div>
        <p className={styles.codeHint}>验证码登录仅支持 QQ 邮箱 (@qq.com)，其他邮箱请使用密码登录</p>
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="邮箱"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          {mode === 'password' ? (
            <input
              type="password"
              placeholder="密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          ) : (
            <div className={styles.codeRow}>
              <input
                type="text"
                placeholder="验证码"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                required
              />
              <button
                type="button"
                className={styles.codeBtn}
                onClick={handleSendCode}
                disabled={!email || codeCountdown > 0 || !email.toLowerCase().endsWith('@qq.com')}
              >
                {codeCountdown > 0 ? `${codeCountdown}s` : '获取验证码'}
              </button>
            </div>
          )}
          {err && <p className={styles.error}>{err}</p>}
          <button type="submit">登录</button>
        </form>
        <p>还没有账号？<Link to="/register">立即注册</Link></p>
      </div>
    </div>
  );
}
