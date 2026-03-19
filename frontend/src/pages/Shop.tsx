/**
 * 虚拟商城页
 * 功能：虚拟币购买，按食物/饰品/头像框/功能卡分类展示
 */
import { useEffect, useState, useMemo } from 'react';
import { api, Product } from '../api';
import { useAuth } from '../context/AuthContext';
import { getProductImageUrl, getProductEmoji } from '../utils/productImages';
import ConfirmModal from '../components/ConfirmModal';
import styles from './Shop.module.css';

const CATEGORY_MAP: Record<string, string> = {
  pet_food: '食物',
  pet_accessory: '饰品',
  boost: '功能卡',
  badge: '功能卡',
  rename_card: '功能卡',
  credit_restore: '功能卡',
  medicine: '药物',
};

const CATEGORY_OPTIONS = [
  { value: '', label: '全部分类' },
  { value: '食物', label: '食物' },
  { value: '饰品', label: '饰品' },
  { value: '功能卡', label: '功能卡' },
  { value: '药物', label: '药物' },
];

function getCategory(p: Product): string {
  return CATEGORY_MAP[p.type || ''] || '其他';
}

export default function Shop() {
  const { user, refreshUser } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [exchanging, setExchanging] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [imgRetryTs, setImgRetryTs] = useState<Record<number, number>>({});

  const filteredProducts = useMemo(() => {
    if (!categoryFilter) return products;
    return products.filter((p) => getCategory(p) === categoryFilter);
  }, [products, categoryFilter]);

  useEffect(() => {
    api.products.list().then(setProducts).catch(() => []).finally(() => setLoading(false));
  }, []);

  const coins = user?.coins ?? 0;

  const handleExchange = async (p: Product) => {
    const price = Number(p.price) || 0;
    if (price > 0 && coins < price) {
      setToast({ type: 'error', message: `虚拟币不足，当前 ${coins} 币，该商品需 ${price} 币` });
      return;
    }
    if (exchanging) return;
    setExchanging(true);
    try {
      await api.orders.create([{ product_id: p.id, quantity: 1 }]);
      await refreshUser();
      setToast({ type: 'success', message: '换取成功！商品已发放 ~' });
    } catch (e) {
      setToast({ type: 'error', message: e instanceof Error ? e.message : '换取失败' });
    } finally {
      setExchanging(false);
    }
  };

  return (
    <div className={styles.page}>
      <h2>🌸 虚拟商城</h2>
      <p className={styles.desc}>
        简约小清新 · 花草命名，用虚拟币换取饰品与功能卡；<strong>头像、饰品换取后永久拥有</strong>，仅热度卡/食物/药物等为消耗品。签到领币、陪伴宠物可得币 ~ 当前：<strong>{coins} 币</strong>
      </p>
      <div className={styles.filters}>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          {CATEGORY_OPTIONS.map((opt) => (
            <option key={opt.value || 'all'} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
      {loading ? <p className={styles.muted}>加载中...</p> : (
        <div className={styles.grid}>
          {filteredProducts.map((p) => {
                  const imgUrl = getProductImageUrl(p);
                  const isAvatarEmoji = p.type === 'avatar' && p.avatar_value && !String(p.avatar_value).startsWith('http');
                  const fallbackEmoji = getProductEmoji(p);
                  const retryTs = imgRetryTs[p.id] || 0;
                  const finalImgUrl = imgUrl ? `${imgUrl}${imgUrl.includes('?') ? '&' : '?'}cb=${retryTs || 0}` : null;
                  return (
                    <div key={p.id} className={styles.card}>
                      <div className={styles.img} title={p.name}>
                        {isAvatarEmoji ? (
                          <span style={{ fontSize: '2rem' }}>{p.avatar_value}</span>
                        ) : (
                          <>
                            <span className={styles.imgEmoji}>{fallbackEmoji}</span>
                            {finalImgUrl && (
                              <img
                                src={finalImgUrl}
                                alt={p.name}
                                loading="lazy"
                                decoding="async"
                                onError={(e) => {
                                  // 不直接隐藏：先重试一次（强制绕过缓存），避免偶发网络/缓存导致“全是占位图”
                                  if (!imgRetryTs[p.id]) {
                                    setImgRetryTs((m) => ({ ...m, [p.id]: Date.now() }));
                                    return;
                                  }
                                  e.currentTarget.onerror = null;
                                  e.currentTarget.style.opacity = '0';
                                }}
                              />
                            )}
                          </>
                        )}
                      </div>
                      <h3>{p.name}</h3>
                      {p.description && <p>{p.description}</p>}
                      <div className={styles.footer}>
                        <span className={styles.price}>{Number(p.price)} 币</span>
                        {p.popularity_boost ? <span className={styles.boost}>+{Math.min(50, p.popularity_boost)} 曝光</span> : null}
                        <button onClick={() => handleExchange(p)} disabled={exchanging}>
                          {exchanging ? '换取中...' : '换取'}
                        </button>
                      </div>
                    </div>
                  );
                })}
        </div>
      )}

      {toast && (
        <ConfirmModal
          message={toast.message}
          primaryText="确定"
          onPrimary={() => setToast(null)}
        />
      )}
    </div>
  );
}
