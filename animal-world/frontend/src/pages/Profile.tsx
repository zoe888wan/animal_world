/**
 * 个人设置页
 * 功能：免费动物头像选择、已购头像展示、昵称与简介编辑
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCompanion } from '../context/CompanionContext';
import { api, Pet } from '../api';
import { SPECIES_OPTIONS, getPetEmoji } from '../utils/species';
import ConfirmModal from '../components/ConfirmModal';
import styles from './Profile.module.css';

/** 免费用户头像（动物 emoji） */
const FREE_AVATARS = SPECIES_OPTIONS.map((s) => s.emoji);

export default function Profile() {
  const { token, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [me, setMe] = useState<{ nickname?: string; bio?: string; avatar_url?: string; credit_score?: number } | null>(null);
  const [creditRestore, setCreditRestore] = useState<{ can_purchase: boolean; price: number; product_id: number | null } | null>(null);
  const [form, setForm] = useState({ nickname: '', bio: '', avatar_url: '' });
  const [purchasedAvatars, setPurchasedAvatars] = useState<{ value: string; isImage: boolean }[]>([]);
  const [quota, setQuota] = useState<{ edits_remaining: number; rename_cards: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'quota'; message: string } | null>(null);
  const [myPets, setMyPets] = useState<Pet[]>([]);
  const { companionPetId, setCompanionPetId } = useCompanion();

  useEffect(() => {
    if (token) {
      Promise.all([api.users.me(), api.users.myAvatars(), api.pets.list()])
        .then(async ([u, avatars, pets]) => {
          setMyPets(pets || []);
          setMe(u);
          setForm({
            nickname: u.nickname || '',
            bio: u.bio || '',
            avatar_url: u.avatar_url || '',
          });
          setPurchasedAvatars(avatars.purchased || []);
          try {
            const q = await api.users.profileQuota();
            setQuota(q);
          } catch {
            setQuota(null);
          }
          try {
            const cr = await api.users.creditRestoreInfo();
            setCreditRestore(cr);
          } catch {
            setCreditRestore(null);
          }
        })
        .catch(() => setMe(null))
        .finally(() => setLoading(false));
    }
  }, [token]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.users.updateMe(form);
      setMe((prev) => prev ? { ...prev, ...form } : null);
      const q = await api.users.profileQuota();
      setQuota(q);
      await refreshUser();
      setToast({ type: 'success', message: '保存成功' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : '保存失败';
      if (msg.includes('修改次数已用完') || msg.includes('改名卡')) {
        setToast({ type: 'quota', message: msg });
      } else {
        setToast({ type: 'error', message: msg });
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className={styles.page}><p className={styles.muted}>加载中...</p></div>;
  if (!me) return <div className={styles.page}><p className={styles.muted}>无法加载用户信息</p></div>;

  return (
    <div className={styles.page}>
      <h2>个人设置</h2>
      {me?.credit_score != null && (
        <p className={styles.creditHint}>信誉分：{me.credit_score}（初始3分，未赴约扣1分，0分需购买恢复）</p>
      )}
      {creditRestore?.can_purchase && creditRestore?.product_id && (
        <div className={styles.creditRestore}>
          <p>信誉分为 0，无法报名/发起活动。可购买恢复（首次 ¥10，之后每次 +¥5 累加）</p>
          <button
            type="button"
            onClick={() => navigate(`/shop?buy_credit=1&product_id=${creditRestore.product_id}`)}
          >
            去购买（¥{creditRestore.price}）
          </button>
        </div>
      )}
      {quota && (
        <p className={styles.quotaHint}>
          本月还可免费修改 {quota.edits_remaining} 次
          {quota.rename_cards > 0 && ` · 拥有改名卡 ${quota.rename_cards} 张`}
        </p>
      )}
      <form onSubmit={handleSave} className={styles.form}>
        <div className={styles.avatarSection}>
          <label>头像</label>
          <p className={styles.hint}>免费动物头像 | 付费特殊头像在商城中购买</p>
          <p className={styles.subLabel}>免费头像</p>
          <div className={styles.avatarGrid}>
            {FREE_AVATARS.map((emoji) => (
              <div
                key={'f-' + emoji}
                role="button"
                tabIndex={0}
                aria-pressed={form.avatar_url === emoji}
                aria-label={`选择头像 ${emoji}`}
                className={`${styles.avatarBtn} ${form.avatar_url === emoji ? styles.selected : ''}`}
                onClick={() => setForm((f) => ({ ...f, avatar_url: emoji }))}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setForm((f) => ({ ...f, avatar_url: emoji })); } }}
              >
                {emoji}
              </div>
            ))}
          </div>
          {purchasedAvatars.length > 0 && (
            <>
              <p className={styles.subLabel}>已购头像</p>
              <div className={styles.avatarGrid}>
                {purchasedAvatars.map((a) => (
                  <div
                    key={'p-' + a.value}
                    role="button"
                    tabIndex={0}
                    aria-pressed={form.avatar_url === a.value}
                    aria-label="选择已购头像"
                    className={`${styles.avatarBtn} ${form.avatar_url === a.value ? styles.selected : ''}`}
                    onClick={() => setForm((f) => ({ ...f, avatar_url: a.value }))}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setForm((f) => ({ ...f, avatar_url: a.value })); } }}
                  >
                    {a.isImage ? <img src={a.value} alt="" className={styles.avatarImg} draggable={false} /> : a.value}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        <div className={styles.field}>
          <label>页面陪伴宠物</label>
          <p className={styles.hint}>选择一只宠物常驻页面右下角，随机显示关心/撒娇话语，点击可换一句</p>
          <div className={styles.companionSelect}>
            <button
              type="button"
              className={`${styles.companionBtn} ${!companionPetId ? styles.selected : ''}`}
              onClick={() => setCompanionPetId(null)}
            >
              不显示
            </button>
            {myPets.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`${styles.companionBtn} ${companionPetId === p.id ? styles.selected : ''}`}
                onClick={() => setCompanionPetId(p.id)}
                title={p.name}
              >
                {p.avatar_url && p.avatar_url.startsWith('http') ? (
                  <img src={p.avatar_url} alt="" className={styles.companionAvatar} />
                ) : (
                  <span className={styles.companionEmoji}>{getPetEmoji(p.species)}</span>
                )}
                <span className={styles.companionName}>{p.name}</span>
              </button>
            ))}
          </div>
          {myPets.length === 0 && (
            <p className={styles.muted}>暂无宠物，先去 <a href="/pets" onClick={(e) => { e.preventDefault(); navigate('/pets'); }}>我的宠物</a> 添加吧 ~</p>
          )}
        </div>
        <div className={styles.field}>
          <label>昵称</label>
          <input
            value={form.nickname}
            onChange={(e) => setForm((f) => ({ ...f, nickname: e.target.value }))}
            placeholder="显示名称"
          />
        </div>
        <div className={styles.field}>
          <label>个人简介</label>
          <textarea
            value={form.bio}
            onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
            placeholder="介绍一下自己"
            rows={3}
          />
        </div>
        <button type="submit" disabled={saving}>{saving ? '保存中...' : '保存'}</button>
      </form>

      {toast && (
        <ConfirmModal
          message={toast.message}
          primaryText={toast.type === 'quota' ? '去购买' : '确定'}
          onPrimary={() => {
            setToast(null);
            if (toast.type === 'quota') navigate('/shop?highlight=rename_card');
          }}
        />
      )}
    </div>
  );
}
