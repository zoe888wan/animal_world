/**
 * 约玩活动页
 * 功能：活动列表、我报名的、发起活动、报名参加（需填手机号，无短信验证）、已报名显示、取消报名、报名名单下拉
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, Event } from '../api';
import { useAuth } from '../context/AuthContext';
import { isAvatarImageUrl } from '../utils/avatar';
import ConfirmModal from '../components/ConfirmModal';
import styles from './Events.module.css';

type Participant = { user_id?: number; nickname?: string; username?: string; credit_score?: number; noshow?: number };

export default function Events() {
  const [tab, setTab] = useState<'all' | 'my'>('all');
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [joinEvent, setJoinEvent] = useState<Event | null>(null);
  const [joinPhone, setJoinPhone] = useState('');
  const [joinSubmitting, setJoinSubmitting] = useState(false);
  const [expandedParticipants, setExpandedParticipants] = useState<number | null>(null);
  const [participantsMap, setParticipantsMap] = useState<Record<number, Participant[]>>({});
  const [completionStatusMap, setCompletionStatusMap] = useState<Record<number, { confirmed_count: number; total_count: number; current_user_confirmed: boolean; completed_credit_given: boolean }>>({});
  const [reviewModal, setReviewModal] = useState<null | { ev: Event; toUserId: number; toName: string }> (null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [form, setForm] = useState({
    title: '',
    description: '',
    event_type: '遛狗',
    province: '',
    city: '',
    district: '',
    address_detail: '',
    event_day: '',
    start_time: '',
    end_time: '',
    max_participants: 10,
  });
  const [filter, setFilter] = useState<{ event_type?: string; city?: string; district?: string }>({});
  const [checkinsMap, setCheckinsMap] = useState<Record<number, { user_id: number; checked_at: string }[]>>({});
  const [confirmLeave, setConfirmLeave] = useState<Event | null>(null);
  const [cancelEvent, setCancelEvent] = useState<Event | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    try {
      const list = tab === 'my' ? await api.events.myEvents() : await api.events.list(filter);
      const withJoined = list.map((e) => ({ ...e, is_joined: tab === 'my' ? true : (e as Event).is_joined ?? false }));
      setEvents(withJoined);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [tab, filter.event_type, filter.city, filter.district]);

  useEffect(() => {
    if (tab !== 'my') return;
    events.forEach((ev) => {
      if (user && (ev.creator_id === user.id || ev.is_joined) && canConfirmComplete(ev) && !ev.is_cancelled && !completionStatusMap[ev.id]) {
        api.events.completionStatus(ev.id).then((s) => setCompletionStatusMap((m) => ({ ...m, [ev.id]: s }))).catch(() => {});
      }
    });
  }, [tab, events, user?.id, completionStatusMap]);

  useEffect(() => {
    if (!showCreate) return;
    const now = new Date();
    const yyyy = String(now.getFullYear());
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    setForm((f) => ({
      ...f,
      event_day: f.event_day || `${yyyy}-${mm}-${dd}`,
      start_time: f.start_time || '10:00',
      end_time: f.end_time || '12:00',
    }));
  }, [showCreate]);

  const loadParticipants = async (eventId: number) => {
    if (expandedParticipants === eventId) {
      setExpandedParticipants(null);
      return;
    }
    if (!participantsMap[eventId]) {
      try {
        const [list, checkins] = await Promise.all([
          api.events.participants(eventId),
          api.events.checkins(eventId).catch(() => []),
        ]);
        setParticipantsMap((m) => ({ ...m, [eventId]: list }));
        setCheckinsMap((m) => ({ ...m, [eventId]: checkins }));
      } catch {
        setToast('获取报名名单失败');
        return;
      }
    }
    setExpandedParticipants(eventId);
  };

  const handleCheckin = async (ev: Event) => {
    try {
      await api.events.checkin(ev.id);
      setCheckinsMap((m) => ({
        ...m,
        [ev.id]: [...(m[ev.id] || []), { user_id: user!.id, checked_at: new Date().toISOString() }],
      }));
      setToast('签到成功');
    } catch (err) {
      setToast(err instanceof Error ? err.message : '签到失败');
    }
  };

  /** 活动开始前 3 天之前可取消报名 */
  const canCancel = (eventDate: string) => {
    const start = new Date(eventDate);
    const cutoff = new Date(start);
    cutoff.setDate(cutoff.getDate() - 3);
    return new Date() <= cutoff;
  };

  /** 活动是否已结束（结束时间 + 1 小时后可标记未赴约等） */
  const isEventEnded = (ev: Event) => {
    const endStr = ev.event_end || ev.event_end_date;
    const end = endStr ? new Date(endStr) : new Date(ev.event_date);
    end.setHours(end.getHours() + 1);
    return new Date() > end;
  };

  /** 活动举行日期 12h 后，方可进行完成确认 */
  const canConfirmComplete = (ev: Event) => {
    const endStr = ev.event_end || ev.event_end_date;
    const end = endStr ? new Date(endStr) : new Date(ev.event_date);
    end.setHours(end.getHours() + 12);
    return new Date() > end;
  };

  /** 活动进行中（开始后、结束后1小时内）可签到 */
  const canCheckin = (ev: Event) => {
    const start = new Date(ev.event_date);
    const endStr = ev.event_end || ev.event_end_date;
    const end = endStr ? new Date(endStr) : new Date(ev.event_date);
    end.setHours(end.getHours() + 1);
    const now = new Date();
    return now >= start && now <= end && (ev.creator_id === user?.id || ev.is_joined);
  };

  /** 发起者可在活动开始前一周取消活动 */
  const canCreatorCancel = (ev: Event) => {
    if (!user || ev.creator_id !== user.id) return false;
    const start = new Date(ev.event_date);
    const cutoff = new Date(start);
    cutoff.setDate(cutoff.getDate() - 7);
    return new Date() <= cutoff;
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinEvent) return;
    const phone = joinPhone.trim();
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      setToast('请填写正确的 11 位手机号');
      return;
    }
    setJoinSubmitting(true);
    try {
      await api.events.join(joinEvent.id, { phone });
      setJoinEvent(null);
      setJoinPhone('');
      setParticipantsMap((m) => {
        const next = { ...m };
        delete next[joinEvent.id];
        return next;
      });
      load();
    } catch (err) {
      setToast(err instanceof Error ? err.message : '报名失败');
    } finally {
      setJoinSubmitting(false);
    }
  };

  const handleLeaveClick = (ev: Event) => setConfirmLeave(ev);

  const handleCancelEventClick = (ev: Event) => {
    setCancelEvent(ev);
    setCancelReason('');
  };

  const handleCancelEventConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelEvent) return;
    if (!cancelReason.trim()) {
      setToast('请填写取消原因');
      return;
    }
    setCancelSubmitting(true);
    try {
      await api.events.cancel(cancelEvent.id, { cancel_reason: cancelReason.trim() || undefined });
      setCancelEvent(null);
      setCancelReason('');
      load();
    } catch (err) {
      setToast(err instanceof Error ? err.message : '取消失败');
    } finally {
      setCancelSubmitting(false);
    }
  };

  const handleMarkNoshow = async (ev: Event, userId: number) => {
    try {
      await api.events.markNoshow(ev.id, { user_ids: [userId] });
      setParticipantsMap((m) => {
        const list = m[ev.id] || [];
        return { ...m, [ev.id]: list.map((p) => (p.user_id === userId ? { ...p, noshow: 1 } : p)) };
      });
    } catch (err) {
      setToast(err instanceof Error ? err.message : '操作失败');
    }
  };

  const handleConfirmComplete = async (ev: Event) => {
    try {
      const r = await api.events.confirmComplete(ev.id);
      if (r.credited) setToast('全体已确认，每人信誉分 +1');
      else setToast('已确认，等待其他参与者确认');
      setCompletionStatusMap((m) => ({ ...m, [ev.id]: { ...m[ev.id], confirmed_count: r.confirmed_count ?? 0, total_count: r.total_count ?? 0, current_user_confirmed: true, completed_credit_given: !!r.credited } }));
      await load();
    } catch (err) {
      setToast(err instanceof Error ? err.message : '操作失败');
    }
  };

  const openReview = (ev: Event, p: Participant) => {
    if (!p.user_id) return;
    const name = p.nickname || p.username || '用户';
    setReviewRating(5);
    setReviewComment('');
    setReviewModal({ ev, toUserId: p.user_id, toName: name });
  };

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewModal) return;
    const text = reviewComment.trim();
    if (text.length > 30) {
      setToast('评价最多 30 字');
      return;
    }
    try {
      await api.events.review(reviewModal.ev.id, { to_user_id: reviewModal.toUserId, rating: reviewRating, comment: text || undefined });
      setReviewModal(null);
      setToast('评价已提交');
    } catch (err) {
      setToast(err instanceof Error ? err.message : '评价失败');
    }
  };

  const handleLeaveConfirm = async () => {
    if (!confirmLeave) return;
    try {
      await api.events.leave(confirmLeave.id);
      setConfirmLeave(null);
      setParticipantsMap((m) => {
        const next = { ...m };
        delete next[confirmLeave.id];
        return next;
      });
      load();
    } catch (err) {
      setToast(err instanceof Error ? err.message : '取消失败');
    } finally {
      setConfirmLeave(null);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return setToast('请填写活动标题');
    if (!form.description.trim()) return setToast('请填写活动目的（如：侧重出片、吃美食、重个人体验）');
    if (!form.province?.trim() || !form.city?.trim() || !form.district?.trim() || !form.address_detail?.trim()) {
      return setToast('请填写完整地址（省、市、区、详细地址）');
    }
    if (!form.event_day || !form.start_time || !form.end_time) {
      return setToast('请选择活动日期、开始时间与结束时间');
    }
    const event_date = `${form.event_day}T${form.start_time}`;
    const event_end = `${form.event_day}T${form.end_time}`;
    const location = [form.province, form.city, form.district, form.address_detail].filter(Boolean).join(' ');
    try {
      const created = await api.events.create({
        title: form.title,
        description: form.description,
        event_type: form.event_type,
        province: form.province,
        city: form.city,
        district: form.district,
        location,
        event_date,
        event_end,
        max_participants: form.max_participants,
      });
      setForm({ title: '', description: '', event_type: '遛狗', province: '', city: '', district: '', address_detail: '', event_day: '', start_time: '', end_time: '', max_participants: 10 });
      setShowCreate(false);
      setEvents((prev) => [{ ...created, participants_count: 0, is_joined: false }, ...prev]);
      load();
    } catch (err) {
      setToast(err instanceof Error ? err.message : '创建失败');
    }
  };

  const formatTime = (d: string) => {
    const dt = new Date(d);
    return dt.toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <h2>约玩活动</h2>
        <button onClick={() => {
          if (!user?.bio?.trim()) {
            setToast('请先在个人设置中填写个人简介，才能发起活动');
            return;
          }
          setShowCreate(true);
        }}>发起活动</button>
      </div>
      <p className={styles.desc}>和同城宠主一起带毛孩子出去玩 ~</p>

      {tab === 'all' && (
        <div className={styles.filters}>
          <select
            value={filter.event_type || ''}
            onChange={(e) => setFilter((f) => ({ ...f, event_type: e.target.value || undefined }))}
          >
            <option value="">全部类型</option>
            <option value="遛狗">遛狗</option>
            <option value="餐厅">餐厅</option>
            <option value="拍照">拍照</option>
            <option value="户外">户外</option>
            <option value="室内">室内</option>
            <option value="其他">其他</option>
          </select>
          <input
            placeholder="筛选城市"
            value={filter.city || ''}
            onChange={(e) => setFilter((f) => ({ ...f, city: e.target.value.trim() || undefined }))}
          />
          <input
            placeholder="筛选区县"
            value={filter.district || ''}
            onChange={(e) => setFilter((f) => ({ ...f, district: e.target.value.trim() || undefined }))}
          />
        </div>
      )}

      <div className={styles.tabs}>
        <button className={tab === 'all' ? styles.tabActive : ''} onClick={() => setTab('all')}>
          全部活动
        </button>
        <button className={tab === 'my' ? styles.tabActive : ''} onClick={() => setTab('my')}>
          我报名的
        </button>
      </div>

      <p className={styles.joinTip}>报名需填写手机号，登录后可在「我报名的」中查看已报名活动。</p>

      {loading ? (
        <p className={styles.muted}>加载中...</p>
      ) : (
        <div className={styles.list}>
          {events.map((ev) => (
            <div key={ev.id} className={`${styles.card} ${ev.is_cancelled ? styles.cardCancelled : ''}`}>
              <h3>
                {ev.event_type && <span className={styles.eventType}>{ev.event_type}</span>}
                {ev.title}{ev.is_cancelled && <span className={styles.cancelledBadge}>活动已取消</span>}
              </h3>
              {ev.description && <p>{ev.description}</p>}
              {ev.is_cancelled && ev.cancel_reason && <p className={styles.cancelReason}>取消原因：{ev.cancel_reason}</p>}
              <div className={styles.meta}>
                {ev.location && <span>📍 {ev.location}</span>}
                <span>
                  🕐 {formatTime(ev.event_date)}
                  {(ev.event_end || ev.event_end_date) && ` — ${formatTime(ev.event_end || ev.event_end_date!)}`}
                </span>
                <span>👥 {ev.participants_count ?? 0} / {ev.max_participants} 人</span>
              </div>
              <button
                type="button"
                className={styles.creatorBtn}
                onClick={() => ev.creator_id && navigate(`/users/${ev.creator_id}`)}
                title="查看发起者简介"
              >
                <div className={styles.creatorAvatarWrap}>
                {isAvatarImageUrl(ev.creator_avatar) ? (
                  <img src={ev.creator_avatar!} alt="" />
                ) : (
                  <span>{ev.creator_avatar || '👤'}</span>
                )}
              </div>
                <span>{ev.creator_nickname || '宠主'}</span>
                {ev.creator_credit_score != null && (
                  <span className={styles.creatorCredit}>信誉 {ev.creator_credit_score}</span>
                )}
              </button>

              <div className={styles.participantsDropdown}>
                <button
                  type="button"
                  className={styles.participantsToggle}
                  onClick={() => loadParticipants(ev.id)}
                >
                  {expandedParticipants === ev.id ? '收起名单 ▲' : '报名名单 ▼'}
                </button>
                {expandedParticipants === ev.id && (
                  <div className={styles.participantsList}>
                    {(participantsMap[ev.id] ?? []).length === 0 ? (
                      <p className={styles.muted}>暂无报名</p>
                    ) : (
                      (participantsMap[ev.id] ?? []).map((p, i) => (
                        <div key={i} className={styles.participantRow}>
                          <span>
                            {p.nickname || p.username || '用户'}
                            {p.credit_score != null && <span className={styles.participantCredit}> 信誉{p.credit_score}</span>}
                            {(checkinsMap[ev.id] || []).some((c) => c.user_id === p.user_id) && <span className={styles.checkedBadge}> 已签到</span>}
                            {p.noshow && <span className={styles.noshowBadge}> 未赴约</span>}
                          </span>
                          <span className={styles.participantActions}>
                            {canCreatorCancel(ev) && isEventEnded(ev) && p.user_id && p.user_id !== user?.id && !p.noshow && (
                              <button type="button" className={styles.markNoshowBtn} onClick={() => handleMarkNoshow(ev, p.user_id!)}>
                                标记未赴约
                              </button>
                            )}
                            {ev.is_joined && isEventEnded(ev) && p.user_id && p.user_id !== user?.id && (
                              <button type="button" className={styles.reviewBtn} onClick={() => openReview(ev, p)}>
                                评价
                              </button>
                            )}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div className={styles.cardActions}>
                {ev.is_cancelled ? (
                  <span className={styles.cancelledText}>活动已取消</span>
                ) : user && (ev.creator_id === user.id || ev.is_joined) ? (
                  <>
                    {ev.creator_id === user.id && canCreatorCancel(ev) && (
                      <button
                        type="button"
                        className={styles.cancelEventBtn}
                        onClick={() => handleCancelEventClick(ev)}
                      >
                        取消活动
                      </button>
                    )}
                    {canConfirmComplete(ev) && (() => {
                      const s = completionStatusMap[ev.id];
                      if (s?.completed_credit_given) return <span className={styles.creditedBadge}>已发放信誉分</span>;
                      if (s?.current_user_confirmed) return <span className={styles.confirmedBadge}>已确认 ({s.confirmed_count}/{s.total_count})</span>;
                      return (
                        <button
                          type="button"
                          className={styles.completeBtn}
                          onClick={() => handleConfirmComplete(ev)}
                        >
                          确认完成（{s ? `${s.confirmed_count}/${s.total_count}` : '…'}）
                        </button>
                      );
                    })()}
                    {canCheckin(ev) && !(checkinsMap[ev.id] || []).some((c) => c.user_id === user?.id) && (
                      <button type="button" className={styles.checkinBtn} onClick={() => handleCheckin(ev)}>
                        签到
                      </button>
                    )}
                    {ev.is_joined && (
                      <>
                        <span className={styles.joined}>✓ 你已报名</span>
                        {canCancel(ev.event_date) && (
                          <button
                            type="button"
                            className={styles.leaveBtn}
                            onClick={() => handleLeaveClick(ev)}
                          >
                            取消报名
                          </button>
                        )}
                      </>
                    )}
                  </>
                ) : (
                  <button
                    onClick={() => setJoinEvent(ev)}
                    className={styles.join}
                  >
                    报名参加
                  </button>
                )}
              </div>
            </div>
          ))}
          {events.length === 0 && (
            <p className={styles.muted}>
              {tab === 'my' ? '暂无已报名活动' : '暂无活动，来发起一个吧 ~'}
            </p>
          )}
        </div>
      )}

      {showCreate && (
        <div className={styles.modal} onClick={() => setShowCreate(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3>发起约玩</h3>
            <form onSubmit={handleCreate} className={styles.createForm}>
              <div className={styles.modalCreateScroll}>
              <div className={styles.fieldWithHint}>
                <label>活动类型 *</label>
                <select
                  value={form.event_type}
                  onChange={(e) => setForm((f) => ({ ...f, event_type: e.target.value }))}
                >
                  <option value="遛狗">遛狗</option>
                  <option value="餐厅">餐厅</option>
                  <option value="拍照">拍照</option>
                  <option value="户外">户外</option>
                  <option value="室内">室内</option>
                  <option value="其他">其他</option>
                </select>
              </div>
              <input
                placeholder="活动标题 *"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                required
              />
              <div className={styles.fieldWithHint}>
                <input
                  placeholder="活动目的 *（如：侧重出片、吃美食、重个人体验）"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  required
                />
                <span className={styles.inputHint}>简要说明活动侧重方向，便于匹配同好</span>
              </div>
              <div className={styles.locFields}>
                <input
                  placeholder="省 *"
                  value={form.province}
                  onChange={(e) => setForm((f) => ({ ...f, province: e.target.value }))}
                  required
                />
                <input
                  placeholder="市 *"
                  value={form.city}
                  onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                  required
                />
                <input
                  placeholder="区 *"
                  value={form.district}
                  onChange={(e) => setForm((f) => ({ ...f, district: e.target.value }))}
                  required
                />
                <input
                  placeholder="详细地址 *（街道、门牌、地标等）"
                  value={form.address_detail}
                  onChange={(e) => setForm((f) => ({ ...f, address_detail: e.target.value }))}
                  required
                />
              </div>
              <div className={styles.timeGrid}>
                <div>
                  <label>日期 *</label>
                  <input
                    type="date"
                    value={form.event_day}
                    onChange={(e) => setForm((f) => ({ ...f, event_day: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label>开始 *</label>
                  <input
                    type="time"
                    value={form.start_time}
                    onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label>结束 *</label>
                  <input
                    type="time"
                    value={form.end_time}
                    onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value }))}
                    required
                  />
                </div>
              </div>
              <div className={styles.maxParticipants}>
                <label>人数限制</label>
                <input
                  type="number"
                  min={2}
                  max={100}
                  value={form.max_participants}
                  onChange={(e) => setForm((f) => ({ ...f, max_participants: parseInt(e.target.value) || 10 }))}
                  placeholder="最大参与人数（2–100）"
                />
                <span className={styles.hint}>报名需填写手机号</span>
              </div>
              </div>
              <div className={styles.modalFooter}>
                <div className={styles.modalActions}>
                  <button type="button" onClick={() => setShowCreate(false)}>
                    取消
                  </button>
                  <button type="submit">创建</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {cancelEvent && (
        <div className={styles.modal} onClick={() => setCancelEvent(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3>取消活动</h3>
            <p className={styles.confirmMsg}>确定要取消「{cancelEvent.title}」吗？报名者将收到取消通知。</p>
            <form onSubmit={handleCancelEventConfirm}>
              <label>取消原因 *</label>
              <input
                placeholder="必填，如：时间冲突、天气原因等"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                required
              />
              <div className={styles.modalActions}>
                <button type="button" onClick={() => setCancelEvent(null)}>返回</button>
                <button type="submit" disabled={cancelSubmitting} className={styles.confirmDanger}>
                  {cancelSubmitting ? '提交中...' : '确认取消'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {reviewModal && (
        <div className={styles.modal} onClick={() => setReviewModal(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3>评价：{reviewModal.toName}</h3>
            <form onSubmit={submitReview}>
              <label>评分 *</label>
              <select
                value={reviewRating}
                onChange={(e) => setReviewRating(parseInt(e.target.value, 10))}
                className={styles.select}
              >
                <option value={5}>5 分</option>
                <option value={4}>4 分</option>
                <option value={3}>3 分</option>
                <option value={2}>2 分</option>
                <option value={1}>1 分</option>
              </select>
              <label>评价（30字以内）</label>
              <input
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value.slice(0, 30))}
                placeholder="选填"
                maxLength={30}
              />
              <div className={styles.modalActions}>
                <button type="button" onClick={() => setReviewModal(null)}>取消</button>
                <button type="submit">提交</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmLeave && (
        <div className={styles.modal} onClick={() => setConfirmLeave(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3>取消报名</h3>
            <p className={styles.confirmMsg}>确定要取消报名「{confirmLeave.title}」吗？</p>
            <div className={styles.modalActions}>
              <button type="button" onClick={() => setConfirmLeave(null)}>取消</button>
              <button type="button" onClick={handleLeaveConfirm} className={styles.confirmDanger}>确定取消</button>
            </div>
          </div>
        </div>
      )}

      {joinEvent && (
        <div className={styles.modal} onClick={() => setJoinEvent(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3>报名：{joinEvent.title}</h3>
            <p className={styles.joinHint}>手机号必填，用于活动联系；身份验证由QQ邮箱登录完成</p>
            <form onSubmit={handleJoin}>
              <label>手机号 *</label>
              <input
                type="tel"
                placeholder="11 位手机号"
                value={joinPhone}
                onChange={(e) => setJoinPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                maxLength={11}
                required
              />
              <div className={styles.modalActions}>
                <button type="button" onClick={() => setJoinEvent(null)}>
                  取消
                </button>
                <button type="submit" disabled={joinSubmitting}>
                  {joinSubmitting ? '提交中...' : '确认报名'}
                </button>
              </div>
            </form>
          </div>
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
