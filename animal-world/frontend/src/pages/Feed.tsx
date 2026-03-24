/**
 * 动态流页面
 * 功能：发布动态（宠物名称直接输入）、上传照片/视频、可选时间与定位、动态列表
 */
import { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { api, Post } from '../api';
import PostCard from '../components/PostCard';
import ConfirmModal from '../components/ConfirmModal';
import styles from './Feed.module.css';

export default function Feed() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [content, setContent] = useState('');
  const [petDisplay, setPetDisplay] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [videos, setVideos] = useState<string[]>([]);
  const [locationText, setLocationText] = useState('');
  const [showTime, setShowTime] = useState(true);
  const [showLocation, setShowLocation] = useState(false);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const routeLocation = useLocation();

  /** 加载动态列表（从 MySQL 获取，切换回动态页时重新拉取） */
  const load = async () => {
    setLoading(true);
    try {
      const p = await api.posts.list();
      setPosts(p || []);
    } catch { setPosts([]); } finally { setLoading(false); }
  };

  useEffect(() => {
    if (routeLocation.pathname === '/' || routeLocation.pathname === '') load();
  }, [routeLocation.pathname]);


  /** 选择并上传图片/视频 */
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isVideo = file.type.startsWith('video/');
      if (!file.type.startsWith('image/') && !isVideo) continue;
      try {
        const { url } = await api.upload.file(file);
        if (isVideo) setVideos((v) => [...v, url]);
        else setImages((im) => [...im, url]);
      } catch { setToast(`上传失败: ${file.name}`); }
    }
    e.target.value = '';
  };

  /** 移除已选图片/视频 */
  const removeMedia = (url: string, isVideo: boolean) => {
    if (isVideo) setVideos((v) => v.filter((u) => u !== url));
    else setImages((im) => im.filter((u) => u !== url));
  };

  /** 发布动态 */
  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || posting) return;
    setPosting(true);
    try {
      const newPost = await api.posts.create({
        content: content.trim(),
        pet_display: petDisplay.trim() || undefined,
        images: images.length ? images : undefined,
        videos: videos.length ? videos : undefined,
        location: showLocation ? locationText.trim() || undefined : undefined,
        show_time: showTime,
        show_location: showLocation,
      });
      setPosts((prev) => [newPost, ...prev]);
      setContent('');
      setPetDisplay('');
      setImages([]);
      setVideos([]);
      setLocationText('');
    } catch { setToast('发布失败'); } finally { setPosting(false); }
  };

  return (
    <div className={styles.feed}>
      <form onSubmit={handlePost} className={styles.compose}>
        <textarea placeholder="分享你家小宝贝的动态..." value={content} onChange={(e) => setContent(e.target.value)} rows={3} />
        {/* 已选媒体预览 */}
        {(images.length > 0 || videos.length > 0) && (
          <div className={styles.mediaPreview}>
            {images.map((url) => (
              <div key={url} className={styles.mediaItem}>
                <img src={url} alt="" /><button type="button" onClick={() => removeMedia(url, false)}>×</button>
              </div>
            ))}
            {videos.map((url) => (
              <div key={url} className={styles.mediaItem}>
                <video src={url} controls /><button type="button" onClick={() => removeMedia(url, true)}>×</button>
              </div>
            ))}
          </div>
        )}
        <div className={styles.composeOptions}>
          <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple hidden onChange={handleFileChange} />
          <button type="button" onClick={() => fileInputRef.current?.click()}>📷 添加照片/视频</button>
          <label><input type="checkbox" checked={showTime} onChange={(e) => setShowTime(e.target.checked)} /> 显示时间</label>
          <label>
            <input type="checkbox" checked={showLocation} onChange={(e) => setShowLocation(e.target.checked)} /> 显示定位
          </label>
          {showLocation && (
            <input
              type="text"
              placeholder="手动填写地点，如：北京朝阳公园"
              value={locationText}
              onChange={(e) => setLocationText(e.target.value)}
              className={styles.locationInput}
            />
          )}
        </div>
        <div className={styles.composeFooter}>
          <input
            list="animal-types"
            placeholder="动物类别（可选，可输入或选择：猫/狗/马/鹰等，也可自定义）"
            value={petDisplay}
            onChange={(e) => setPetDisplay(e.target.value)}
            className={styles.petInput}
          />
          <datalist id="animal-types">
            <option value="猫" /><option value="狗" /><option value="马" /><option value="鹰" /><option value="兔子" />
            <option value="仓鼠" /><option value="鸟" /><option value="鱼" /><option value="鹦鹉" /><option value="龙猫" />
            <option value="乌龟" /><option value="蛇" /><option value="蜥蜴" /><option value="金丝雀" /><option value="荷兰猪" />
          </datalist>
          <button type="submit" disabled={!content.trim() || posting}>{posting ? '发布中...' : '发布'}</button>
        </div>
      </form>
      <div className={styles.list}>
        {loading ? <p className={styles.muted}>加载中...</p> : posts.length === 0 ? <p className={styles.muted}>暂无动态，发一条试试吧 ~</p> : posts.map((p) => (
          <PostCard
            key={p.id}
            post={p}
            onUpdate={(id, updates) => setPosts((prev) => prev.map((x) => (x.id === id ? { ...x, ...updates } : x)))}
            onDelete={(id) => setPosts((prev) => prev.filter((x) => x.id !== id))}
          />
        ))}
      </div>
      {toast && (
        <ConfirmModal message={toast} primaryText="确定" onPrimary={() => setToast(null)} />
      )}
    </div>
  );
}
