/**
 * 居中确认弹窗
 * 所有需要用户点击的提示均使用此组件，保证在屏幕中间显示
 */
import styles from './ConfirmModal.module.css';

interface Props {
  message: string;
  title?: string;
  primaryText?: string;
  onPrimary: () => void;
  secondaryText?: string;
  onSecondary?: () => void;
  primaryDanger?: boolean;
}

export default function ConfirmModal({
  message,
  title,
  primaryText = '确定',
  onPrimary,
  secondaryText,
  onSecondary,
  primaryDanger,
}: Props) {
  const overlayClick = onSecondary ?? onPrimary;
  return (
    <div className={styles.overlay} onClick={overlayClick}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {title && <h3 className={styles.title}>{title}</h3>}
        <p className={styles.message}>{message}</p>
        <div className={styles.actions}>
          {secondaryText && onSecondary && (
            <button type="button" className={styles.secondary} onClick={onSecondary}>
              {secondaryText}
            </button>
          )}
          <button type="button" className={primaryDanger ? styles.primaryDanger : styles.primary} onClick={onPrimary}>
            {primaryText}
          </button>
        </div>
      </div>
    </div>
  );
}
