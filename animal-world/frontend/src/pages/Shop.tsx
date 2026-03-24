/**
 * 虚拟商城页
 * 功能：虚拟币购买，仅展示改名卡、置顶卡、头像
 */
import { useEffect, useState, useMemo } from 'react';
import { api, Product } from '../api';
import { useAuth } from '../context/AuthContext';
import { getProductImageUrl, getProductEmoji } from '../utils/productImages';
import ConfirmModal from '../components/ConfirmModal';
import styles from './Shop.module.css';

const CATEGORY_MAP: Record<string, string> = {
  rename_card: '改名卡',
  avatar: '头像',
  avatar_frame: '头像',
  avatar_frame_premium: '头像',
};

function getCategory(p: Product): string {
  if (p.name === '置顶卡') return '置顶卡';
  return CATEGORY_MAP[p.type || ''] || '其他';
}

const CATEGORY_OPTIONS = [
  { value: '', label: '全部分类' },
  { value: '改名卡', label: '改名卡' },
  { value: '置顶卡', label: '置顶卡' },
  { value: '头像', label: '头像' },
];

export default function Shop() {
  const { user, refreshUser } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [exchanging, setExchanging] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [imgRetryTs, setImgRetryTs] = useState<Record<number, number>>({});
  const [imgFailed, setImgFailed] = useState<Record<number, boolean>>({});

  const filteredProducts = useMemo(() => {
    if (!categoryFilter) return products;
    return products.filter((p) => getCategory(p) === categoryFilter);
  }, [products, categoryFilter]);

  useEffect(() => {
    api.products.list()
      .then(setProducts)
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  const coins = user?.coins ?? 0;

  const handleExchange = async (p: Product) => {
    const price = Number(p.price) || 0;
    if (price > 0 && coins < price) {
      setToast(`虚拟币不足，当前 ${coins} 币，该商品需 ${price} 币`);
      return;
    }
    if (exchanging) return;
    setExchanging(true);
    try {
      await api.orders.create([{ product_id: p.id, quantity: 1 }]);
      await refreshUser();
      setToast('换取成功！商品已发放 ~');
    } catch (e) {
      setToast(e instanceof Error ? e.message : '换取失败');
    } finally {
      setExchanging(false);
    }
  };

  return (
    <div className={styles.page}>
      <h2>🌸 虚拟商城</h2>
      <p className={styles.desc}>
        用虚拟币换取改名卡、置顶卡、头像；<strong>头像换取后永久拥有</strong>。签到领币、陪伴宠物可得币 ~ 当前：<strong>{coins} 币</strong>
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
            const showImg = Boolean(finalImgUrl) && !imgFailed[p.id];
            return (
              <div key={p.id} className={styles.card}>
                <div
                  className={styles.img}
                  title={p.name}
                  data-img={showImg ? 'ok' : (finalImgUrl ? 'error' : 'none')}
                >
                  {isAvatarEmoji ? (
                    <span style={{ fontSize: '2rem' }}>{p.avatar_value}</span>
                  ) : (
                    <>
                      <span className={styles.imgEmoji}>{fallbackEmoji}</span>
                      {showImg && (
                        <img
                          src={finalImgUrl}
                          alt={p.name}
                          loading="lazy"
                          decoding="async"
                          onError={(e) => {
                            if (!imgRetryTs[p.id]) {
                              setImgRetryTs((m) => ({ ...m, [p.id]: Date.now() }));
                              return;
                            }
                            e.currentTarget.onerror = null;
                            setImgFailed((m) => ({ ...m, [p.id]: true }));
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
                  {p.popularity_boost != null && p.popularity_boost > 0 && (
                    <span className={styles.boost}>+{p.popularity_boost} 曝光</span>
                  )}
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
          message={toast}
          primaryText="确定"
          onPrimary={() => setToast(null)}
        />
      )}
    </div>
  );
}
