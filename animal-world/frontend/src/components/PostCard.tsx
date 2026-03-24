/**
 * 动态卡片组件：展示动态、点赞、评论、图片点击大图、浏览量、评论可撤回、评论点赞
 */
import { useState, useEffect, useRef } from 'react';
import { api, Post, Comment } from '../api';
import { isAvatarImageUrl } from '../utils/avatar';
import ConfirmModal from './ConfirmModal';
import styles from './PostCard.module.css';

/** 卡片入参：post 数据，onUpdate 仅更新该条，onDelete 删除后回调 */
interface Props { post: Post; onUpdate?: (postId: number, updates: Partial<Post>) => void; onDelete?: (postId: number) => void; }

/** 确保 images/videos 为数组（后端 JSON 可能为字符串） */
function ensureArray(val: unknown): string[] {
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') { try { return JSON.parse(val) || []; } catch { return []; } }
  return [];
}

/** 是否在发布一个月内（可删除） */
function isWithinMonth(createdAt: string): boolean {
  return Date.now() - new Date(createdAt).getTime() < 30 * 24 * 60 * 60 * 1000;
}

export default function PostCard({ post, onUpdate, onDelete }: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likes_count);
  const [commentsCount, setCommentsCount] = useState(post.comments_count);
  const [viewsCount, setViewsCount] = useState(post.views_count ?? 0);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const viewedRef = useRef(false);
  const COMMENT_PAGE = 15;
  const imgs = ensureArray(post.images);
  const vids = ensureArray(post.videos);

  /** 首次进入视区时增加浏览量 */
  useEffect(() => {
    if (viewedRef.current) return;
    viewedRef.current = true;
    api.posts.view(post.id).then((r) => setViewsCount(r.views_count)).catch(() => {});
  }, [post.id]);

  /** 获取当前用户 ID（用于评论撤回判断） */
  useEffect(() => {
    api.users.me().then((u) => setCurrentUserId(u.id)).catch(() => setCurrentUserId(null));
  }, []);

  /** 展开评论时拉取前15条 */
  useEffect(() => {
    if (showComments) api.posts.comments(post.id, COMMENT_PAGE, 0).then(setComments).catch(() => setComments([]));
  }, [showComments, post.id]);

  /** 点赞/取消点赞 */
  const handleLike = async () => {
    try {
      const res = liked ? await api.posts.unlike(post.id) : await api.posts.like(post.id);
      setLiked(!liked);
      setLikesCount(res.likes_count);
    } catch {}
  };

  /** 提交评论：仅合并更新当前条，避免全量 reload 导致动态消失 */
  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      const c = await api.posts.addComment(post.id, newComment.trim());
      setComments((prev) => [...prev, c]);
      setCommentsCount((n) => n + 1);
      setNewComment('');
      onUpdate?.(post.id, { comments_count: commentsCount + 1 });
    } catch { setToast('评论失败'); }
  };

  /** 撤回评论（仅本人可撤回） */
  const handleDeleteComment = async (commentId: number) => {
    try {
      await api.posts.deleteComment(post.id, commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      setCommentsCount((n) => Math.max(0, n - 1));
      onUpdate?.(post.id, { comments_count: Math.max(0, commentsCount - 1) });
    } catch { setToast('撤回失败'); }
  };

  /** 删除动态（仅作者且一个月内），删除后动态及评论一并清空 */
  const handleDeletePost = async () => {
    setShowDeleteConfirm(false);
    try {
      await api.posts.delete(post.id);
      onDelete?.(post.id);
    } catch (e) { setToast(e instanceof Error ? e.message : '删除失败'); }
  };

  /** 加载更多评论 */
  const loadMoreComments = async () => {
    if (loadingMore || comments.length >= commentsCount) return;
    setLoadingMore(true);
    try {
      const more = await api.posts.comments(post.id, COMMENT_PAGE, comments.length);
      setComments((prev) => [...prev, ...more]);
    } catch { } finally { setLoadingMore(false); }
  };

  /** 评论点赞/取消 */
  const handleCommentLike = async (c: Comment) => {
    const isLiked = c.liked ?? false;
    try {
      const res = isLiked ? await api.posts.commentUnlike(post.id, c.id) : await api.posts.commentLike(post.id, c.id);
      setComments((prev) => prev.map((x) => (x.id === c.id ? { ...x, liked: res.liked, likes_count: res.likes_count ?? 0 } : x)));
    } catch {}
  };

  return (
    <article className={styles.card}>
      <div className={styles.head}>
        <div className={styles.avatar}>
          {isAvatarImageUrl(post.user_avatar) ? (
            <img src={post.user_avatar!} alt="" />
          ) : (
            <span>{post.user_avatar || '👤'}</span>
          )}
        </div>
        <div className={styles.meta}>
          <span className={styles.name}>{post.nickname || post.username}{post.pet_name && <small> · {post.pet_name}</small>}</span>
          {post.show_time !== 0 && <span className={styles.time}>{new Date(post.created_at).toLocaleString('zh-CN')}</span>}
          {post.show_location && post.location && <span className={styles.location}>📍 {post.location}</span>}
          {currentUserId != null && post.user_id === currentUserId && isWithinMonth(post.created_at) && (
            <button type="button" onClick={() => setShowDeleteConfirm(true)} className={styles.deletePost} title="删除动态（发布一个月内可删）">删除</button>
          )}
        </div>
      </div>
      <p className={styles.content}>{post.content}</p>
      {imgs.length > 0 && (
        <div className={styles.media}>
          <p className={styles.mediaHint}>点击图片可查看大图</p>
          {imgs.map((url: string) => (
            <img
              key={url}
              src={url}
              alt="动态配图"
              className={styles.mediaImg}
              onClick={() => setLightboxImg(url)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setLightboxImg(url); } }}
              role="button"
              tabIndex={0}
              title="点击查看大图"
            />
          ))}
        </div>
      )}
      {vids.length > 0 && (
        <div className={styles.media}>
          {vids.map((url: string) => (
            <video key={url} src={url} controls className={styles.mediaVideo} />
          ))}
        </div>
      )}
      <div className={styles.stats}>
        <span>👁 {viewsCount}</span>
        <button type="button" onClick={handleLike} className={`${styles.statBtn} ${liked ? styles.liked : ''}`}>❤️ {likesCount}</button>
        <button type="button" onClick={() => setShowComments(!showComments)} className={styles.commentToggle}>
          <span className={styles.statBtn}>💬 {commentsCount}</span>
          <span className={styles.triangle}>{showComments ? '▼' : '▶'}</span>
        </button>
      </div>
      {lightboxImg && (
        <div
          className={styles.lightbox}
          onClick={() => setLightboxImg(null)}
          onKeyDown={(e) => { if (e.key === 'Escape') setLightboxImg(null); }}
          role="button"
          tabIndex={0}
          title="点击空白处或按 Esc 关闭"
          aria-label="大图预览，点击或按 Esc 关闭"
        >
          <img src={lightboxImg} alt="大图预览" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
      {showComments && (
        <div className={styles.comments}>
          <form onSubmit={handleComment}>
            <input
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={commentsCount >= 30 ? '评论已满（最多30条）' : '写一条评论...'}
              disabled={commentsCount >= 30}
            />
            <button type="submit" disabled={commentsCount >= 30}>发送</button>
          </form>
          <ul className={styles.commentList}>
            {comments.map((c) => (
              <li key={c.id} className={styles.commentItem}>
                <div className={styles.commentBody}>
                  <strong>{c.nickname || c.username}</strong> {c.content}
                </div>
                <div className={styles.commentActions}>
                  <button type="button" onClick={() => handleCommentLike(c)} className={`${styles.commentLike} ${c.liked ? styles.liked : ''}`}>
                    ❤️ {c.likes_count ?? 0}
                  </button>
                  {currentUserId != null && Number(c.user_id) === Number(currentUserId) && (
                    <button type="button" onClick={() => handleDeleteComment(c.id)} className={styles.commentDelete}>撤回</button>
                  )}
                </div>
              </li>
            ))}
          </ul>
          {showComments && comments.length < commentsCount && (
            <button type="button" onClick={loadMoreComments} disabled={loadingMore} className={styles.loadMore}>
              {loadingMore ? '加载中...' : '查看更多'}
            </button>
          )}
        </div>
      )}
      {showDeleteConfirm && (
        <div className={styles.deleteModal} onClick={() => setShowDeleteConfirm(false)}>
          <div className={styles.deleteModalContent} onClick={(e) => e.stopPropagation()}>
            <p>确定要删除这条动态吗？删除后评论也会一并清空。</p>
            <div className={styles.deleteModalBtns}>
              <button type="button" onClick={() => setShowDeleteConfirm(false)}>取消</button>
              <button type="button" onClick={handleDeletePost} className={styles.deleteConfirm}>删除</button>
            </div>
          </div>
        </div>
      )}
      {toast && (
        <ConfirmModal message={toast} primaryText="确定" onPrimary={() => setToast(null)} />
      )}
    </article>
  );
}
