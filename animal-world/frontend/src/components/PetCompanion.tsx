/**
 * 陪伴宠物组件
 * 展示用户选择的宠物，随机显示符合性格的关心/撒娇话语
 */
import { useState, useEffect } from 'react';
import { api, Pet } from '../api';
import { useAuth } from '../context/AuthContext';
import { useCompanion } from '../context/CompanionContext';
import { getPetEmoji } from '../utils/species';
import { getRandomPhrase } from '../utils/companionPhrases';
import { isAvatarImageUrl } from '../utils/avatar';
import styles from './PetCompanion.module.css';

const PHRASE_INTERVAL_MS = 12000;

export default function PetCompanion() {
  const { companionPetId, setCompanionPetId } = useCompanion();
  const { refreshUser } = useAuth();
  const [pet, setPet] = useState<Pet | null>(null);
  const [phrase, setPhrase] = useState('');
  const [bubbleVisible, setBubbleVisible] = useState(false);

  useEffect(() => {
    if (!companionPetId) {
      setPet(null);
      return;
    }
    api.pets.list().then((list) => {
      const p = list.find((x) => x.id === companionPetId);
      if (!p) setCompanionPetId(null);
      setPet(p || null);
      if (p) {
        setPhrase(getRandomPhrase(p.species));
        setBubbleVisible(true);
      }
    }).catch(() => setPet(null));
  }, [companionPetId, setCompanionPetId]);

  useEffect(() => {
    if (!pet) return;
    const timer = setInterval(() => {
      setPhrase(getRandomPhrase(pet.species));
      setBubbleVisible(true);
    }, PHRASE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [pet]);

  const handleClick = async () => {
    if (!pet) return;
    try {
      const { earned } = await api.users.petInteract();
      if (earned > 0) {
        setPhrase(`获得 ${earned} 虚拟币 ~`);
        await refreshUser();
      } else {
        setPhrase(getRandomPhrase(pet.species));
      }
    } catch {
      setPhrase(getRandomPhrase(pet.species));
    }
    setBubbleVisible(true);
  };

  if (!pet) return null;

  const displayName = pet.name || '小宝贝';
  const emoji = getPetEmoji(pet.species);
  const avatarUrl = pet.avatar_url;

  return (
    <div className={styles.wrap}>
      <button
        type="button"
        className={styles.pet}
        onClick={handleClick}
        aria-label={`${displayName}想对你说`}
        title="点击换一句"
      >
        <div className={styles.avatar}>
          {isAvatarImageUrl(avatarUrl) ? (
            <img src={avatarUrl!} alt="" />
          ) : (
            <span>{emoji}</span>
          )}
        </div>
        <div className={`${styles.bubble} ${bubbleVisible ? styles.visible : ''}`}>
          <span>{phrase}</span>
        </div>
      </button>
    </div>
  );
}
