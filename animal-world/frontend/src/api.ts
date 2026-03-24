/**
 * API 请求封装与接口定义
 * 功能：统一 fetch、自动附加 JWT、后端接口调用封装、全局类型定义
 */
const BASE = '/api';

/** 从本地存储读取 JWT */
function getToken(): string | null {
  return localStorage.getItem('token');
}

/** 封装 fetch，自动带 Content-Type 和 Authorization，失败时抛出 Error */
async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const headers: HeadersInit = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  const token = getToken();
  if (token) (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  const res = await fetch(BASE + path, { ...opts, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || '请求失败');
  return data;
}

/** 认证：登录、验证码登录、发送验证码、注册、邮箱验证 */
export const auth = {
  login: (email: string, password: string) =>
    request<{ user: User; token: string }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  sendCode: (email: string) =>
    request<{ ok: boolean; message: string }>('/auth/send-code', { method: 'POST', body: JSON.stringify({ email }) }),
  loginWithCode: (email: string, code: string) =>
    request<{ user: User; token: string }>('/auth/login-with-code', { method: 'POST', body: JSON.stringify({ email, code }) }),
  register: (username: string, email: string, password: string) =>
    request<{ user: User; token: string }>('/auth/register', { method: 'POST', body: JSON.stringify({ username, email, password }) }),
  verifyEmail: (token: string) =>
    request<{ ok: boolean; message: string }>(`/auth/verify-email?token=${encodeURIComponent(token)}`),
};

/** 用户：当前用户、每日签到、已购头像、更新资料、信誉分恢复信息 */
export const users = {
  me: () => request<User>('/users/me'),
  checkin: () =>
    request<{ checked: boolean; coins: number; message?: string }>('/users/me/checkin', { method: 'POST' }),
  creditRestoreInfo: () =>
    request<{ can_purchase: boolean; price: number; product_id: number | null; next_restore_number: number }>('/users/me/credit-restore-info'),
  get: (id: number) => request<PublicUser>(`/users/${id}`),
  myAvatars: () => request<{ purchased: { value: string; isImage: boolean }[] }>('/users/me/avatars'),
  profileQuota: () => request<{ edits_remaining: number; rename_cards: number }>('/users/me/profile-quota'),
  updateMe: (data: { nickname?: string; bio?: string; avatar_url?: string }) =>
    request<User>('/users/me', { method: 'PUT', body: JSON.stringify(data) }),
  petInteract: () =>
    request<{ earned: number; coins: number; message?: string }>('/users/me/pet-interact', { method: 'POST' }),
  accessories: () =>
    request<{ accessories: { user_product_id: number; used_pet_id?: number; product_id: number; name: string; image_url?: string }[] }>('/users/me/accessories'),
  equipAccessory: (userProductId: number, petId: number) =>
    request<{ ok: boolean }>(`/users/me/accessories/${userProductId}/equip`, { method: 'POST', body: JSON.stringify({ pet_id: petId }) }),
  unequipAccessory: (userProductId: number) =>
    request<{ ok: boolean }>(`/users/me/accessories/${userProductId}/unequip`, { method: 'POST' }),
  food: () =>
    request<{ food: { user_product_id: number; product_id: number; name: string; image_url?: string }[] }>('/users/me/food'),
  medicine: () =>
    request<{ medicine: { user_product_id: number; product_id: number; name: string; image_url?: string }[] }>('/users/me/medicine'),
  boostCards: () =>
    request<{ cards: { user_product_id: number; product_id: number; name: string; image_url?: string; popularity_boost?: number }[] }>('/users/me/boost-cards'),
};

/** 宠物：列表、详情、新增、编辑、热度排行 */
export const pets = {
  list: (ownerId?: number) => request<Pet[]>(`/pets${ownerId ? `?owner_id=${ownerId}` : ''}`),
  get: (id: number) => request<Pet>(`/pets/${id}`),
  create: (data: Partial<Pet>) => request<Pet>('/pets', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: Partial<Pet>) => request<Pet>(`/pets/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) => request<{ ok: boolean }>(`/pets/${id}`, { method: 'DELETE' }),
  rank: () => request<Pet[]>(`/pets/rank/popular`),
  feed: (petId: number, userProductId: number) =>
    request<{ ok: boolean }>(`/pets/${petId}/feed`, { method: 'POST', body: JSON.stringify({ user_product_id: userProductId }) }),
  cure: (petId: number, userProductId: number) =>
    request<{ ok: boolean }>(`/pets/${petId}/cure`, { method: 'POST', body: JSON.stringify({ user_product_id: userProductId }) }),
  useBoost: (petId: number, userProductId: number) =>
    request<{ ok: boolean; added?: number }>(`/pets/${petId}/use-boost`, { method: 'POST', body: JSON.stringify({ user_product_id: userProductId }) }),
};

/** 动态：列表、发布、点赞、取消点赞、评论、发表评论、删除评论、评论点赞 */
export const posts = {
  list: (limit?: number, offset?: number) => request<Post[]>(`/posts?limit=${limit || 20}&offset=${offset || 0}`),
  create: (data: {
    content: string;
    images?: string[];
    videos?: string[];
    pet_id?: number;
    /** 宠物显示名（发布者直接输入，优先于 pet_id 关联） */
    pet_display?: string;
    location?: string;
    show_time?: boolean;
    show_location?: boolean;
  }) => request<Post>('/posts', { method: 'POST', body: JSON.stringify(data) }),
  like: (id: number) => request<{ liked: boolean; likes_count: number }>(`/posts/${id}/like`, { method: 'POST' }),
  unlike: (id: number) => request<{ liked: boolean; likes_count: number }>(`/posts/${id}/like`, { method: 'DELETE' }),
  comments: (id: number, limit?: number, offset?: number) =>
    request<Comment[]>(`/posts/${id}/comments?limit=${limit ?? 15}&offset=${offset ?? 0}`),
  addComment: (postId: number, content: string) =>
    request<Comment>(`/posts/${postId}/comments`, { method: 'POST', body: JSON.stringify({ content }) }),
  deleteComment: (postId: number, commentId: number) =>
    request<{ ok: boolean }>(`/posts/${postId}/comments/${commentId}`, { method: 'DELETE' }),
  delete: (id: number) => request<{ ok: boolean }>(`/posts/${id}`, { method: 'DELETE' }),
  commentLike: (postId: number, commentId: number) =>
    request<{ liked: boolean; likes_count: number }>(`/posts/${postId}/comments/${commentId}/like`, { method: 'POST' }),
  commentUnlike: (postId: number, commentId: number) =>
    request<{ liked: boolean; likes_count: number }>(`/posts/${postId}/comments/${commentId}/like`, { method: 'DELETE' }),
  view: (id: number) => request<{ views_count: number }>(`/posts/${id}/view`, { method: 'POST' }),
};

/** 商品：列表、详情 */
export const products = {
  list: () => request<Product[]>('/products'),
  get: (id: number) => request<Product>(`/products/${id}`),
};

/** 订单：列表、创建、预支付、确认支付、查询状态 */
export const orders = {
  list: () => request<Order[]>('/orders'),
  create: (items: { product_id: number; quantity: number }[]) =>
    request<Order>('/orders', { method: 'POST', body: JSON.stringify({ items }) }),
  wechatPrepay: (orderId: number) =>
    request<{ code_url: string }>(`/orders/${orderId}/wechat-prepay`, { method: 'POST' }),
  confirmPaid: (orderId: number) =>
    request<{ ok: boolean; status: string }>(`/orders/${orderId}/confirm-paid`, { method: 'POST' }),
  status: (orderId: number) =>
    request<{ status: string; paid_at: string | null }>(`/orders/${orderId}/status`),
};

/** 约玩活动：列表（支持 event_type/city/district 筛选）、我报名的、创建、报名、签到 */
export const events = {
  list: (params?: { event_type?: string; city?: string; district?: string }) => {
    const q = new URLSearchParams();
    if (params?.event_type) q.set('event_type', params.event_type);
    if (params?.city) q.set('city', params.city);
    if (params?.district) q.set('district', params.district);
    return request<Event[]>(`/events${q.toString() ? '?' + q : ''}`);
  },
  myEvents: () => request<Event[]>('/events/my'),
  create: (data: Partial<Event> & { event_type?: string; province?: string; city?: string; district?: string }) =>
    request<Event>('/events', { method: 'POST', body: JSON.stringify(data) }),
  join: (id: number, params: { phone: string; pet_id?: number }) =>
    request<{ joined: boolean }>(`/events/${id}/join`, { method: 'POST', body: JSON.stringify(params) }),
  leave: (id: number) => request<{ left: boolean }>(`/events/${id}/leave`, { method: 'DELETE' }),
  cancel: (id: number, params: { cancel_reason?: string }) =>
    request<{ cancelled: boolean }>(`/events/${id}/cancel`, { method: 'POST', body: JSON.stringify(params) }),
  participants: (id: number) =>
    request<{ user_id?: number; nickname?: string; username?: string; credit_score?: number; noshow?: number }[]>(`/events/${id}/participants`),
  markNoshow: (id: number, params: { user_ids: number[] }) =>
    request<{ ok: boolean }>(`/events/${id}/mark-noshow`, { method: 'POST', body: JSON.stringify(params) }),
  checkin: (id: number) => request<{ ok: boolean; checked: boolean }>(`/events/${id}/checkin`, { method: 'POST' }),
  checkins: (id: number) =>
    request<{ user_id: number; checked_at: string; nickname?: string; username?: string }[]>(`/events/${id}/checkins`),
  confirmComplete: (id: number) =>
    request<{ ok: boolean; all_confirmed?: boolean; credited?: boolean; confirmed_count?: number; total_count?: number }>(`/events/${id}/confirm-complete`, { method: 'POST' }),
  completionStatus: (id: number) =>
    request<{ total_count: number; confirmed_count: number; current_user_confirmed: boolean; completed_credit_given: boolean }>(`/events/${id}/completion-status`),
  review: (id: number, params: { to_user_id: number; rating: number; comment?: string }) =>
    request<{ ok: boolean }>(`/events/${id}/reviews`, { method: 'POST', body: JSON.stringify(params) }),
};

/** 文件上传：图片/视频，返回 { url: string } */
export const upload = {
  file: async (file: File): Promise<{ url: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    const token = getToken();
    const headers: HeadersInit = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(BASE + '/upload', { method: 'POST', headers, body: formData });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || '上传失败');
    return data;
  },
};

export const api = { auth, users, pets, posts, products, orders, events, upload };

/** 用户实体 */
export interface User { id: number; username: string; email: string; nickname?: string; avatar_url?: string; bio?: string; credit_score?: number; coins?: number; }
/** 公开用户资料（他人可见） */
export interface PublicUser { id: number; nickname?: string; avatar_url?: string; bio?: string; credit_score?: number; }
/** 宠物实体 */
export interface Pet { id: number; owner_id: number; name: string; species?: string; breed?: string; avatar_url?: string; intro?: string; temperament?: string; size_type?: string; vaccinated?: number; popularity: number; health_status?: string; owner_nickname?: string; owner_avatar?: string; }
/** 动态帖实体 */
export interface Post {
  id: number;
  user_id: number;
  pet_id?: number;
  content: string;
  images?: string[];
  videos?: string[];
  location?: string;
  show_time?: boolean | number;
  show_location?: boolean | number;
  likes_count: number;
  comments_count: number;
  views_count?: number;
  created_at: string;
  username?: string;
  nickname?: string;
  user_avatar?: string;
  pet_name?: string;
  pet_avatar?: string;
}
/** 评论实体 */
export interface Comment { id: number; user_id?: number; content: string; username?: string; nickname?: string; avatar_url?: string; created_at: string; likes_count?: number; liked?: boolean; }
/** 商品实体 */
export interface Product { id: number; name: string; description?: string; price: number; image_url?: string; type?: string; popularity_boost?: number; avatar_value?: string; }
/** 订单实体 */
export interface Order { id: number; total_amount: number; status: string; created_at: string; }
/** 约玩活动实体（event_end_date 为部分环境字段名） */
export interface Event { id: number; creator_id: number; title: string; description?: string; location?: string; event_type?: string; province?: string; city?: string; district?: string; event_date: string; event_end?: string; event_end_date?: string; max_participants: number; creator_nickname?: string; creator_avatar?: string; creator_credit_score?: number; participants_count?: number; is_joined?: boolean; is_cancelled?: boolean; cancel_reason?: string; }
