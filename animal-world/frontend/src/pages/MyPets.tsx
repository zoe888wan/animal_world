/**
 * 我的宠物页
 * 功能：添加宠物、编辑、列表展示，支持物种选择与头像 emoji 选择
 */
import { useEffect, useState } from 'react';
import { api, Pet } from '../api';
import { useCompanion } from '../context/CompanionContext';
import { getPetEmoji, SPECIES_OPTIONS } from '../utils/species';
import ConfirmModal from '../components/ConfirmModal';
import styles from './MyPets.module.css';

type Accessory = { user_product_id: number; used_pet_id?: number; product_id: number; name: string; image_url?: string };
type Food = { user_product_id: number; product_id: number; name: string };
type Medicine = { user_product_id: number; product_id: number; name: string };
type BoostCard = { user_product_id: number; product_id: number; name: string; popularity_boost?: number };

export default function MyPets() {
  const { companionPetId, setCompanionPetId } = useCompanion();
  const [pets, setPets] = useState<Pet[]>([]);
  const [accessories, setAccessories] = useState<Accessory[]>([]);
  const [food, setFood] = useState<Food[]>([]);
  const [medicine, setMedicine] = useState<Medicine[]>([]);
  const [boostCards, setBoostCards] = useState<BoostCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Pet | null>(null);
  const [form, setForm] = useState({ name: '', species: '', breed: '', intro: '', avatar_url: '', temperament: '', size_type: '', vaccinated: 0 });
  const [toast, setToast] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Pet | null>(null);

  const load = async () => {
    try {
      const [pList, accRes, foodRes, medRes, boostRes] = await Promise.all([
        api.pets.list(),
        api.users.accessories().catch(() => ({ accessories: [] })),
        api.users.food().catch(() => ({ food: [] })),
        api.users.medicine().catch(() => ({ medicine: [] })),
        api.users.boostCards().catch(() => ({ cards: [] })),
      ]);
      setPets(pList);
      setAccessories(accRes.accessories || []);
      setFood(foodRes.food || []);
      setMedicine(medRes.medicine || []);
      setBoostCards(boostRes.cards || []);
    } catch { setPets([]); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const handleEquip = async (userProductId: number, petId: number) => {
    try {
      await api.users.equipAccessory(userProductId, petId);
      load();
    } catch { setToast('佩戴失败'); }
  };

  const handleUnequip = async (userProductId: number) => {
    try {
      await api.users.unequipAccessory(userProductId);
      load();
    } catch { setToast('卸下失败'); }
  };

  const handleFeed = async (petId: number, userProductId: number) => {
    try {
      await api.pets.feed(petId, userProductId);
      load();
      setToast('投喂成功');
    } catch { setToast('投喂失败'); }
  };

  const handleCure = async (petId: number, userProductId: number) => {
    try {
      await api.pets.cure(petId, userProductId);
      load();
      setToast('治疗成功');
    } catch (e) { setToast(e instanceof Error ? e.message : '治疗失败'); }
  };

  const handleUseBoost = async (petId: number, userProductId: number) => {
    try {
      const r = await api.pets.useBoost(petId, userProductId);
      load();
      setToast(r.added != null ? `使用成功，该宠物 +${r.added} 曝光度` : '使用成功');
    } catch (e) { setToast(e instanceof Error ? e.message : '使用失败'); }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    try {
      await api.pets.create({
        ...form,
        avatar_url: form.avatar_url || undefined,
        temperament: form.temperament || undefined,
        size_type: form.size_type || undefined,
        vaccinated: form.vaccinated ? 1 : 0,
      });
      setForm({ name: '', species: '', breed: '', intro: '', avatar_url: '', temperament: '', size_type: '', vaccinated: 0 });
      load();
    } catch { setToast('添加失败'); }
  };

  const handleDeleteClick = (p: Pet) => setDeleteTarget(p);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await api.pets.delete(deleteTarget.id);
      setDeleteTarget(null);
      load();
    } catch { setToast('删除失败'); setDeleteTarget(null); }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    try {
      await api.pets.update(editing.id, {
        ...form,
        avatar_url: form.avatar_url || undefined,
        temperament: form.temperament || undefined,
        size_type: form.size_type || undefined,
        vaccinated: form.vaccinated ? 1 : 0,
      });
      setEditing(null);
      load();
    } catch { setToast('更新失败'); }
  };

  return (
    <div className={styles.page}>
      <h2>我的宠物</h2>
      <form onSubmit={handleCreate} className={styles.form}>
        <input placeholder="宠物名字 *" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
        <select value={form.species} onChange={(e) => {
            const v = e.target.value;
            const opt = SPECIES_OPTIONS.find((s) => s.value === v);
            setForm((f) => ({ ...f, species: v, avatar_url: opt ? opt.emoji : f.avatar_url }));
          }}>
            <option value="">选择物种（可选）</option>
            {SPECIES_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>{s.emoji} {s.label}</option>
            ))}
          </select>
        <div className={styles.avatarPick}>
          {SPECIES_OPTIONS.slice(0, 12).map((s) => (
            <button key={s.value} type="button" className={form.avatar_url === s.emoji ? styles.avatarSelected : ''}
              onClick={() => setForm((f) => ({ ...f, avatar_url: s.emoji }))}>{s.emoji}</button>
          ))}
        </div>
        <input placeholder="细分品种" value={form.breed} onChange={(e) => setForm((f) => ({ ...f, breed: e.target.value }))} />
        <select value={form.size_type} onChange={(e) => setForm((f) => ({ ...f, size_type: e.target.value }))}>
          <option value="">体型（可选）</option>
          <option value="小型">小型</option>
          <option value="中型">中型</option>
          <option value="大型">大型</option>
        </select>
        <select value={form.temperament} onChange={(e) => setForm((f) => ({ ...f, temperament: e.target.value }))}>
          <option value="">性格（可选）</option>
          <option value="温和">温和</option>
          <option value="活泼">活泼</option>
          <option value="胆小">胆小</option>
          <option value="好斗">好斗</option>
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input type="checkbox" checked={!!form.vaccinated} onChange={(e) => setForm((f) => ({ ...f, vaccinated: e.target.checked ? 1 : 0 }))} />
          已接种疫苗
        </label>
        <input placeholder="简介" value={form.intro} onChange={(e) => setForm((f) => ({ ...f, intro: e.target.value }))} />
        <button type="submit">添加宠物</button>
      </form>
      <div className={styles.list}>
        {loading ? <p className={styles.muted}>加载中...</p> : pets.length === 0 ? <p className={styles.muted}>还没有宠物，先添加一只吧 ~</p> : pets.map((p) => (
          <div key={p.id} className={styles.card}>
            <div className={styles.avatar}>
                {p.avatar_url && p.avatar_url.startsWith('http') ? (
                  <img src={p.avatar_url} alt="" />
                ) : (
                  <span>{p.avatar_url || getPetEmoji(p.species)}</span>
                )}
              </div>
            <div className={styles.info}>
              <h3>{p.name}{(p.health_status === 'sick') && <span className={styles.sickBadge}>生病</span>}</h3>
              <p>{(p.species || '') + (p.breed ? ` · ${p.breed}` : '')}</p>
              {p.intro && <p className={styles.intro}>{p.intro}</p>}
              <span className={styles.pop} title="每月1日会清零">⭐ 热度 {p.popularity}</span>
            </div>
            <div className={styles.cardActions}>
              {boostCards.length > 0 && (
                <div className={styles.equipRow}>
                  <span>曝光卡：</span>
                  <select
                    defaultValue=""
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v) { handleUseBoost(p.id, Number(v)); e.target.value = ''; }
                    }}
                  >
                    <option value="">选择曝光卡（+最多50）</option>
                    {boostCards.map((b) => (
                      <option key={b.user_product_id} value={b.user_product_id}>
                        {b.name}{b.popularity_boost != null ? ` +${b.popularity_boost}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {food.length > 0 && (
                <div className={styles.equipRow}>
                  <span>投喂：</span>
                  <select
                    defaultValue=""
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v) { handleFeed(p.id, Number(v)); e.target.value = ''; }
                    }}
                  >
                    <option value="">选择食物</option>
                    {food.map((f) => (
                      <option key={f.user_product_id} value={f.user_product_id}>{f.name}</option>
                    ))}
                  </select>
                </div>
              )}
              {p.health_status === 'sick' && medicine.length > 0 && (
                <div className={styles.equipRow}>
                  <span>治疗：</span>
                  <select
                    defaultValue=""
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v) { handleCure(p.id, Number(v)); e.target.value = ''; }
                    }}
                  >
                    <option value="">选择药物</option>
                    {medicine.map((m) => (
                      <option key={m.user_product_id} value={m.user_product_id}>{m.name}</option>
                    ))}
                  </select>
                </div>
              )}
              {accessories.length > 0 && (
                <div className={styles.equipRow}>
                  <span>佩戴饰品：</span>
                  <select
                    value={accessories.find((a) => a.used_pet_id === p.id)?.user_product_id ?? ''}
                    onChange={(e) => {
                      const v = e.target.value;
                      const cur = accessories.find((a) => a.used_pet_id === p.id);
                      if (cur && (!v || Number(v) !== cur.user_product_id)) handleUnequip(cur.user_product_id);
                      if (v) handleEquip(Number(v), p.id);
                    }}
                  >
                    <option value="">无</option>
                    {accessories.map((a) => (
                      <option key={a.user_product_id} value={a.user_product_id}>
                        {a.name}{a.used_pet_id && a.used_pet_id !== p.id ? ` (已佩戴)` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <button
                type="button"
                className={companionPetId === p.id ? styles.placeActive : ''}
                onClick={() => setCompanionPetId(companionPetId === p.id ? null : p.id)}
                title={companionPetId === p.id ? '取消放置' : '放置到页面'}
              >
                {companionPetId === p.id ? '✓ 已放置' : '放置到页面'}
              </button>
              <button onClick={() => {
                setEditing(p);
                setForm({
                  name: p.name,
                  species: p.species || '',
                  breed: p.breed || '',
                  intro: p.intro || '',
                  avatar_url: (p.avatar_url && !p.avatar_url.startsWith('http') ? p.avatar_url : '') || (p.species ? getPetEmoji(p.species) : ''),
                  temperament: p.temperament || '',
                  size_type: p.size_type || '',
                  vaccinated: p.vaccinated ? 1 : 0,
                });
              }}>编辑</button>
              <button type="button" className={styles.deleteBtn} onClick={() => handleDeleteClick(p)}>删除</button>
            </div>
          </div>
        ))}
      </div>
      {editing && (
        <div className={styles.modal} onClick={() => setEditing(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3>编辑 {editing.name}</h3>
            <form onSubmit={handleUpdate}>
              <input placeholder="名字" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              <select value={form.species} onChange={(e) => {
                const v = e.target.value;
                const opt = SPECIES_OPTIONS.find((s) => s.value === v);
                setForm((f) => ({ ...f, species: v, avatar_url: opt ? opt.emoji : f.avatar_url }));
              }}>
                <option value="">选择物种</option>
                {SPECIES_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.emoji} {s.label}</option>
                ))}
              </select>
              <div className={styles.avatarPick}>
                {SPECIES_OPTIONS.slice(0, 12).map((s) => (
                  <button key={s.value} type="button" className={form.avatar_url === s.emoji ? styles.avatarSelected : ''}
                    onClick={() => setForm((f) => ({ ...f, avatar_url: s.emoji }))}>{s.emoji}</button>
                ))}
              </div>
              <input placeholder="细分品种" value={form.breed} onChange={(e) => setForm((f) => ({ ...f, breed: e.target.value }))} />
              <select value={form.size_type} onChange={(e) => setForm((f) => ({ ...f, size_type: e.target.value }))}>
                <option value="">体型</option>
                <option value="小型">小型</option>
                <option value="中型">中型</option>
                <option value="大型">大型</option>
              </select>
              <select value={form.temperament} onChange={(e) => setForm((f) => ({ ...f, temperament: e.target.value }))}>
                <option value="">性格</option>
                <option value="温和">温和</option>
                <option value="活泼">活泼</option>
                <option value="胆小">胆小</option>
                <option value="好斗">好斗</option>
              </select>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input type="checkbox" checked={!!form.vaccinated} onChange={(e) => setForm((f) => ({ ...f, vaccinated: e.target.checked ? 1 : 0 }))} />
                已接种疫苗
              </label>
              <input placeholder="简介" value={form.intro} onChange={(e) => setForm((f) => ({ ...f, intro: e.target.value }))} />
              <div className={styles.modalActions}>
                <button type="button" onClick={() => setEditing(null)}>取消</button>
                <button type="submit">保存</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <ConfirmModal
          message={`确定要删除「${deleteTarget.name}」吗？`}
          primaryText="删除"
          secondaryText="取消"
          onPrimary={handleDeleteConfirm}
          onSecondary={() => setDeleteTarget(null)}
          primaryDanger
        />
      )}

      {toast && (
        <ConfirmModal message={toast} primaryText="确定" onPrimary={() => setToast(null)} />
      )}
    </div>
  );
}
