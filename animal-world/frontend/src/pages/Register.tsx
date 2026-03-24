/**
 * 注册页
 * 功能：用户名、邮箱、密码注册，成功后跳转首页
 */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './Auth.module.css';

export default function Register() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  /** 提交注册表单 */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    try {
      await register(username, email, password);
      navigate('/');
    } catch (e) {
      setErr(e instanceof Error ? e.message : '注册失败');
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1>🐾 动物世界</h1>
        <h2>注册</h2>
        <form onSubmit={handleSubmit}>
          <input type="text" placeholder="用户名" value={username} onChange={(e) => setUsername(e.target.value)} required />
          <input type="email" placeholder="邮箱" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input type="password" placeholder="密码" value={password} onChange={(e) => setPassword(e.target.value)} required />
          {err && <p className={styles.error}>{err}</p>}
          <button type="submit">注册</button>
        </form>
        <p>已有账号？<Link to="/login">去登录</Link></p>
      </div>
    </div>
  );
}
