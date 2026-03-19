/**
 * 商品展示图映射（花草·颜色命名）
 */
const PRODUCT_IMAGE_MAP: Record<string, string> = {
  boost: '/products/boost-card.svg',
  badge: '/products/star-badge.svg',
  rename_card: '/products/rename-card.svg',
  credit_restore: '/products/credit-restore.svg',
  pet_accessory: '/products/pet-collar.svg',
  pet_food: '/products/pet-snack.svg',
  medicine: '/products/medicine-cold.svg',
  avatar_frame: '/products/avatar-frame.svg',
  avatar_frame_premium: '/products/frame-gold.svg',
  avatar: '/products/avatar-crown.svg',
};

const PRODUCT_NAME_MAP: Record<string, string> = {
  '热度加速卡': '/products/boost-card.svg',
  '置顶卡': '/products/pin-card.svg',
  '小星星徽章': '/products/star-badge.svg',
  '改名卡': '/products/rename-card.svg',
  '信誉分恢复': '/products/credit-restore.svg',

  '雏菊项圈': '/products/pet-collar.svg',
  '蝴蝶结发夹': '/products/pet-bow-clip.svg',
  '蝴蝶结': '/products/pet-bow.svg',
  '小铃铛': '/products/pet-bell.svg',

  '美味零食包': '/products/pet-snack.svg',
  '冻干鸡肉粒': '/products/pet-treat.svg',
  '鲜肉罐头': '/products/pet-can.svg',
  '磨牙棒': '/products/pet-chew.svg',

  '感冒药': '/products/medicine-cold.svg',
  '肠胃药': '/products/medicine-stomach.svg',

  '明星头像框': '/products/avatar-frame.svg',
  '紫薇花': '/products/frame-gold.svg',
  '缠绕花藤': '/products/frame-crystal.svg',
  '烂漫樱': '/products/frame-diamond.svg',

  '龙系头像': '/products/avatar-dragon.svg',
  '独角兽头像': '/products/avatar-unicorn.svg',
  '皇冠头像': '/products/avatar-crown.svg',
  '蝴蝶头像': '/products/avatar-butterfly.svg',
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
