/**
 * 商品展示图映射（花草·颜色命名）
 */
const PRODUCT_IMAGE_MAP: Record<string, string> = {
  boost: '/products/boost-card.png',
  badge: '/products/star-badge.png',
  rename_card: '/products/rename-card.png',
  credit_restore: '/products/credit-restore.png',
  pet_accessory: '/products/pet-collar.png',
  pet_food: '/products/pet-food-main.png',
  medicine: '/products/medicine-cold.png',
};

const PRODUCT_NAME_MAP: Record<string, string> = {
  '热度加速卡': '/products/boost-card.png',
  '置顶卡': '/products/pin-card.png',
  '小星星徽章': '/products/star-badge.png',
  '改名卡': '/products/rename-card.png',
  '雏菊项圈': '/products/pet-collar.png',
  '蝴蝶结发夹': '/products/pet-bow.png',
  '小铃铛': '/products/pet-bell.png',
  '美味零食包': '/products/pet-snack.png',
  '冻干鸡肉粒': '/products/pet-treat.png',
  '磨牙棒': '/products/pet-chew.png',
  '感冒药': '/products/medicine-cold.png',
  '肠胃药': '/products/medicine-stomach.png',
};

export function getProductImageUrl(product: { image_url?: string | null; type?: string; name?: string }): string | null {
  if (product.image_url) {
    const url = product.image_url.startsWith('/') || product.image_url.startsWith('http') ? product.image_url : `/${product.image_url}`;
    return url;
  }
  if (product.name && PRODUCT_NAME_MAP[product.name]) return PRODUCT_NAME_MAP[product.name];
  if (product.type && PRODUCT_IMAGE_MAP[product.type]) return PRODUCT_IMAGE_MAP[product.type];
  return null;
}

/** 商品名对应展示 emoji（无图时显示） */
const PRODUCT_EMOJI_MAP: Record<string, string> = {
  '雏菊项圈': '🌼',
  '蝴蝶结发夹': '🎀',
  '小铃铛': '🔔',
  '美味零食包': '🍪',
  '冻干鸡肉粒': '🍗',
  '热度加速卡': '📈',
  '置顶卡': '📌',
  '小星星徽章': '⭐',
  '改名卡': '✏️',
};

export function getProductEmoji(product: { name?: string; type?: string }): string {
  if (product.name && PRODUCT_EMOJI_MAP[product.name]) return PRODUCT_EMOJI_MAP[product.name];
  if (product.type === 'pet_accessory') return '🎀';
  if (product.type === 'pet_food') return '🍗';
  if (product.type === 'boost') return '📈';
  return '🎁';
}
