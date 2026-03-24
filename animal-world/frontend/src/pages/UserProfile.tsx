/**
 * 他人公开资料页
 * 功能：查看用户昵称、头像、个人简介、信誉分
 */
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, PublicUser } from '../api';
import { isAvatarImageUrl } from '../utils/avatar';
import styles from './UserProfile.module.css';

export default function UserProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const uid = parseInt(id || '', 10);
    if (isNaN(uid)) {
      setError('无效用户');
      setLoading(false);
      return;
    }
    api.users
      .get(uid)
      .then(setUser)
      .catch((e) => setError(e instanceof Error ? e.message : '加载失败'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className={styles.page}><p className={styles.muted}>加载中...</p></div>;
  if (error || !user) return <div className={styles.page}><p className={styles.muted}>{error || '用户不存在'}</p><button onClick={() => navigate(-1)}>返回</button></div>;

  return (
    <div className={styles.page}>
      <button type="button" className={styles.backBtn} onClick={() => navigate(-1)}>← 返回</button>
      <div className={styles.header}>
        <div className={styles.avatar}>
          {isAvatarImageUrl(user.avatar_url) ? (
            <img src={user.avatar_url!} alt="" />
          ) : (
            <span className={styles.avatarEmoji}>{user.avatar_url || '👤'}</span>
          )}
        </div>
        <h2>{user.nickname || '宠主'}</h2>
        {user.credit_score != null && (
          <div className={styles.creditBadge}>信誉分 {user.credit_score}</div>
        )}
      </div>
      {user.bio ? (
        <div className={styles.bioSection}>
          <h3>个人简介</h3>
          <p>{user.bio}</p>
        </div>
      ) : (
        <p className={styles.noBio}>暂无个人简介</p>
      )}
    </div>
  );
}
