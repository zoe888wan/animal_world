/**
 * 可爱角色装饰组件
 * 类似参考图风格但原创的小角色，点击触发动画彩蛋
 */
import { useState } from 'react';
import styles from './CuteMascot.module.css';

type Variant = 'cat' | 'dog' | 'bunny';
type Position = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

const VARIANTS: Record<Variant, { bg: string; accent: string; label: string }> = {
  cat: { bg: '#d4c4a8', accent: '#8a7560', label: '小猫' },
  dog: { bg: '#c9b896', accent: '#7a6b55', label: '小狗' },
  bunny: { bg: '#e8ddd0', accent: '#9a8a75', label: '小兔' },
};

interface Props {
  variant?: Variant;
  position?: Position;
}

export default function CuteMascot({ variant = 'cat', position = 'top-right' }: Props) {
  const [animating, setAnimating] = useState(false);
  const [clickCount, setClickCount] = useState(0);
  const { bg, accent, label } = VARIANTS[variant];

  const handleClick = () => {
    if (animating) return;
    setAnimating(true);
    setClickCount((c) => c + 1);
    setTimeout(() => setAnimating(false), 600);
  };

  return (
    <button
      type="button"
      className={`${styles.mascot} ${styles[position]} ${animating ? styles.bounce : ''}`}
      onClick={handleClick}
      aria-label={`点击${label}有惊喜`}
      title={`点击${label} ~`}
    >
      <div className={styles.blob} style={{ background: bg, borderColor: accent }}>
        {variant === 'cat' && (
          <svg viewBox="0 0 80 80" className={styles.face}>
            <ellipse cx="40" cy="45" rx="28" ry="26" fill={bg} stroke={accent} strokeWidth="1.5" />
            <circle cx="32" cy="42" r="3" fill={accent} />
            <circle cx="48" cy="42" r="3" fill={accent} />
            <path d="M 36 50 Q 40 54 44 50" stroke={accent} strokeWidth="2" fill="none" strokeLinecap="round" />
            <path d="M 18 35 Q 12 30 10 38" stroke={accent} strokeWidth="2" fill="none" strokeLinecap="round" />
            <path d="M 62 35 Q 68 30 70 38" stroke={accent} strokeWidth="2" fill="none" strokeLinecap="round" />
          </svg>
        )}
        {variant === 'dog' && (
          <svg viewBox="0 0 80 80" className={styles.face}>
            <ellipse cx="40" cy="44" rx="26" ry="25" fill={bg} stroke={accent} strokeWidth="1.5" />
            <circle cx="32" cy="41" r="3" fill={accent} />
            <circle cx="48" cy="41" r="3" fill={accent} />
            <path d="M 34 50 Q 40 56 46 50" stroke={accent} strokeWidth="2" fill="none" strokeLinecap="round" />
            <ellipse cx="22" cy="38" rx="6" ry="4" fill={bg} stroke={accent} strokeWidth="1.5" />
            <ellipse cx="58" cy="38" rx="6" ry="4" fill={bg} stroke={accent} strokeWidth="1.5" />
          </svg>
        )}
        {variant === 'bunny' && (
          <svg viewBox="0 0 80 80" className={styles.face}>
            <ellipse cx="40" cy="46" rx="24" ry="26" fill={bg} stroke={accent} strokeWidth="1.5" />
            <circle cx="32" cy="44" r="2.5" fill={accent} />
            <circle cx="48" cy="44" r="2.5" fill={accent} />
            <path d="M 36 52 Q 40 56 44 52" stroke={accent} strokeWidth="1.5" fill="none" strokeLinecap="round" />
            <ellipse cx="20" cy="30" rx="5" ry="12" fill={bg} stroke={accent} strokeWidth="1.5" transform="rotate(-20 20 30)" />
            <ellipse cx="60" cy="30" rx="5" ry="12" fill={bg} stroke={accent} strokeWidth="1.5" transform="rotate(20 60 30)" />
          </svg>
        )}
      </div>
      {animating && (
        <span className={styles.bubble}>
          {clickCount % 5 === 0 ? '✨' : clickCount % 3 === 0 ? '🐾' : '~'}
        </span>
      )}
    </button>
  );
}
