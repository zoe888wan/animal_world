/**
 * 主布局组件
 * 功能：顶部导航、Logo、用户头像与昵称、每日签到、退出登录、子路由 Outlet
 */
import { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useCompanion } from '../context/CompanionContext';
import { isAvatarImageUrl } from '../utils/avatar';
import CuteMascot from './CuteMascot';
import PetCompanion from './PetCompanion';
import styles from './Layout.module.css';

const ROUTE_MASCOTS: Record<string, { variant: 'cat' | 'dog' | 'bunny'; pos: 'bottom-left' | 'bottom-right' }> = {
  '/': { variant: 'dog', pos: 'bottom-left' },
  '/pets': { variant: 'cat', pos: 'bottom-right' },
  '/shop': { variant: 'bunny', pos: 'bottom-right' },
  '/events': { variant: 'bunny', pos: 'bottom-left' },
  '/stars': { variant: 'cat', pos: 'bottom-right' },
};

export default function Layout() {
  const { user, logout, refreshUser } = useAuth();
  const { companionPetId } = useCompanion();
  const navigate = useNavigate();
  const [checkinMsg, setCheckinMsg] = useState<string | null>(null);
  const [checkinLoading, setCheckinLoading] = useState(false);

  const handleCheckin = async () => {
    if (checkinLoading) return;
    setCheckinLoading(true);
    try {
      const r = await api.users.checkin();
      await refreshUser();
      setCheckinMsg(r.message || (r.checked ? '签到成功 +1 币' : '今日已签到'));
      setTimeout(() => setCheckinMsg(null), 2500);
    } catch (e) {
      setCheckinMsg(e instanceof Error ? e.message : '签到失败');
      setTimeout(() => setCheckinMsg(null), 2500);
    } finally {
      setCheckinLoading(false);
    }
  };
  const loc = useLocation();
  const path = loc.pathname;
  const mascot = ROUTE_MASCOTS[path] || { variant: 'dog' as const, pos: 'bottom-right' as const };
  const showPetCompanion = !!companionPetId;
  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <NavLink to="/" className={styles.logo}>🐾 动物世界</NavLink>
        <nav className={styles.nav}>
          <NavLink to="/" end>动态</NavLink>
          <NavLink to="/pets">我的宠物</NavLink>
          <NavLink to="/events">约玩</NavLink>
          <NavLink to="/shop">商城</NavLink>
          <NavLink to="/stars">明星榜</NavLink>
          <NavLink to="/profile">设置</NavLink>
        </nav>
        <div className={styles.user}>
          <button
            type="button"
            className={styles.checkinBtn}
            onClick={handleCheckin}
            disabled={checkinLoading}
            title="每日签到领取 1 虚拟币"
          >
            {checkinLoading ? '...' : '📅 签到'}
          </button>
          {checkinMsg && <span className={styles.checkinMsg}>{checkinMsg}</span>}
          {user?.coins != null && (
            <span className={styles.coins}>🪙 {user.coins}</span>
          )}
          <div className={styles.userAvatar}>
            {isAvatarImageUrl(user?.avatar_url) ? (
              <img src={user!.avatar_url!} alt="" />
            ) : (
              <span>{user?.avatar_url || '👤'}</span>
            )}
          </div>
          <NavLink to="/profile" className={styles.userName}>{user?.nickname || user?.username}</NavLink>
          <button onClick={() => { logout(); navigate('/login'); }} className={styles.logout}>退出</button>
        </div>
      </header>
      <main className={styles.main}><Outlet /></main>
      {!path.includes('/users/') && (
        showPetCompanion ? <PetCompanion /> : <CuteMascot variant={mascot.variant} position={mascot.pos} />
      )}
    </div>
  );
}
