/**
 * 邮箱验证页
 * 功能：从 URL 获取 token 调用验证接口，展示成功/失败状态
 */
import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import styles from './Auth.module.css';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('缺少验证链接');
      return;
    }
    api.auth.verifyEmail(token)
      .then((res) => {
        setStatus('ok');
        setMessage(res.message || '邮箱验证成功');
      })
      .catch((e) => {
        setStatus('error');
        setMessage(e instanceof Error ? e.message : '验证失败');
      });
  }, [token]);

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1>🐾 动物世界</h1>
        <h2>邮箱验证</h2>
        {status === 'loading' && <p>验证中...</p>}
        {status === 'ok' && <p className={styles.success}>{message}</p>}
        {status === 'error' && <p className={styles.error}>{message}</p>}
        <p><Link to="/login">去登录</Link></p>
      </div>
    </div>
  );
}
