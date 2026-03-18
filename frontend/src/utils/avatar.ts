/**
 * 头像工具
 * 功能：判断头像值是否为图片 URL（用于决定用 img 或 emoji 渲染）
 */
/** 判断是否为图片 URL，否则按 emoji 渲染 */
export function isAvatarImageUrl(val?: string | null): boolean {
  return !!(val && (val.startsWith('http://') || val.startsWith('https://')));
}
