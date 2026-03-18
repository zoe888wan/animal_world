/**
 * 宠物物种工具
 * 功能：物种选项列表、物种到 emoji 的映射
 */
/** 可选物种及对应 emoji，用于表单下拉和头像显示 */
export const SPECIES_OPTIONS: { value: string; label: string; emoji: string }[] = [
  { value: '猫', label: '猫', emoji: '🐱' },
  { value: '狗', label: '狗', emoji: '🐕' },
  { value: '兔', label: '兔子', emoji: '🐰' },
  { value: '仓鼠', label: '仓鼠', emoji: '🐹' },
  { value: '龙猫', label: '龙猫', emoji: '🐭' },
  { value: '豚鼠', label: '豚鼠', emoji: '🐹' },
  { value: '鸟', label: '鸟', emoji: '🐦' },
  { value: '鹦鹉', label: '鹦鹉', emoji: '🦜' },
  { value: '鱼', label: '鱼', emoji: '🐠' },
  { value: '蜥蜴', label: '蜥蜴', emoji: '🦎' },
  { value: '蛇', label: '蛇', emoji: '🐍' },
  { value: '龟', label: '乌龟', emoji: '🐢' },
  { value: '狮子', label: '狮子', emoji: '🦁' },
  { value: '老虎', label: '老虎', emoji: '🐯' },
  { value: '狐狸', label: '狐狸', emoji: '🦊' },
  { value: '熊猫', label: '熊猫', emoji: '🐼' },
  { value: '考拉', label: '考拉', emoji: '🐨' },
  { value: '企鹅', label: '企鹅', emoji: '🐧' },
  { value: '刺猬', label: '刺猬', emoji: '🦔' },
  { value: '猴子', label: '猴子', emoji: '🐵' },
  { value: '猪', label: '猪', emoji: '🐷' },
  { value: '羊', label: '羊', emoji: '🐑' },
  { value: '马', label: '马', emoji: '🐴' },
  { value: '鹰', label: '鹰', emoji: '🦅' },
  { value: '牛', label: '牛', emoji: '🐮' },
  { value: '鸭', label: '鸭', emoji: '🦆' },
  { value: '鹅', label: '鹅', emoji: '🪿' },
  { value: '鸡', label: '鸡', emoji: '🐔' },
  { value: '蜘蛛', label: '蜘蛛', emoji: '🕷️' },
  { value: '螃蟹', label: '螃蟹', emoji: '🦀' },
  { value: '其他', label: '其他', emoji: '🐾' },
];

const speciesToEmojiMap: Record<string, string> = Object.fromEntries(
  SPECIES_OPTIONS.map((s) => [s.value, s.emoji])
);

/** 根据物种名称获取对应的 emoji，找不到时返回默认 */
export function getPetEmoji(species?: string | null): string {
  if (!species) return '🐾';
  return speciesToEmojiMap[species.trim()] ?? '🐾';
}
