/**
 * 认证上下文
 * 功能：全局用户状态、JWT 持久化、登录/注册/登出、刷新用户信息
 */
import React, { createContext, useContext, useEffect, useState } from 'react';
import { api, User } from '../api';

/** 认证上下文类型：用户、token、loading、登录/注册/登出方法 */
interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  loginWithCode: (email: string, code: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

/** 认证提供者：根据 token 拉取用户，暴露登录/注册/登出/刷新方法 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  /** 重新从后端拉取当前用户信息，用于资料修改后更新 */
  const refreshUser = async () => {
    if (token) {
      const u = await api.users.me();
      setUser(u);
    }
  };

  useEffect(() => {
    if (token) {
      api.users.me().then(setUser).catch(() => {
        localStorage.removeItem('token');
        setToken(null);
      }).finally(() => setLoading(false));
    } else setLoading(false);
  }, [token]);

  const login = async (email: string, password: string) => {
    const { user: u, token: t } = await api.auth.login(email, password);
    localStorage.setItem('token', t);
    setToken(t);
    setUser(u);
  };

  const loginWithCode = async (email: string, code: string) => {
    const { user: u, token: t } = await api.auth.loginWithCode(email, code);
    localStorage.setItem('token', t);
    setToken(t);
    setUser(u);
  };

  const register = async (username: string, email: string, password: string) => {
    const { user: u, token: t } = await api.auth.register(username, email, password);
    localStorage.setItem('token', t);
    setToken(t);
    setUser(u);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, refreshUser, login, loginWithCode, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

/** 获取认证上下文，必须在 AuthProvider 内使用 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
