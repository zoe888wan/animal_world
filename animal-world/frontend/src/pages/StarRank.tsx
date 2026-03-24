/**
 * 明星榜页
 * 功能：展示热度最高的宠物排行，按 popularity 排序
 */
import { useEffect, useState } from 'react';
import { api, Pet } from '../api';
import { getPetEmoji } from '../utils/species';
import styles from './StarRank.module.css';

export default function StarRank() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.pets.rank().then(setPets).catch(() => []).finally(() => setLoading(false));
  }, []);

  return (
    <div className={styles.page}>
      <h2>⭐ 明星榜</h2>
      <p className={styles.desc}>热度最高的宠物明星，快来给自家毛孩子增加曝光吧 ~ 每月1日曝光度清零，单次最多 +50。</p>
      {loading ? <p className={styles.muted}>加载中...</p> : (
        <ol className={styles.list}>
          {pets.map((pet, i) => (
            <li key={pet.id} className={styles.card}>
              <span className={styles.rank}>{i + 1}</span>
              <div className={styles.avatar}>
                {pet.avatar_url && pet.avatar_url.startsWith('http') ? (
                  <img src={pet.avatar_url} alt="" />
                ) : (
                  <span>{pet.avatar_url || getPetEmoji(pet.species)}</span>
                )}
              </div>
              <div className={styles.info}>
                <h3>{pet.name}</h3>
                <p>{pet.species}{pet.breed ? ` · ${pet.breed}` : ''}</p>
                <span className={styles.owner}>{pet.owner_nickname || '宠主'}</span>
              </div>
              <span className={styles.pop}>🔥 {pet.popularity}</span>
            </li>
          ))}
          {pets.length === 0 && <p className={styles.muted}>暂无排行，发动态、买道具都能提升热度 ~</p>}
        </ol>
      )}
    </div>
  );
}
