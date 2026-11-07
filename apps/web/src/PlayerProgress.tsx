import type { PlayerDto } from '@fwo/contracts';
import { Badge, Progress, formatNumber, t, useI18n } from '@fwo/ui';
import styles from './app.module.css';

export function PlayerProgress({ player }: { player: PlayerDto }) {
  useI18n();
  const progress = player.levelProgress;
  return (
    <div className={styles.playerProgress}>
      <Badge tone="uncommon">
        {t('profile.currentLevel', { level: player.level })}
      </Badge>
      {progress && (
        <>
          <div className={styles.xpRow}>
            <span>{t('profile.nextLevel', { level: progress.nextLevel })}</span>
            <span>
              {t('profile.xpFraction', {
                current: formatNumber(progress.currentXp),
                required: formatNumber(progress.requiredXp),
              })}
            </span>
          </div>
          <Progress
            value={progress.currentXp}
            max={progress.requiredXp}
            ariaLabel={t('profile.nextLevel', { level: progress.nextLevel })}
          />
          <p className={styles.xpRemaining}>
            {t('profile.xpRemaining', {
              xp: formatNumber(progress.remainingXp),
              level: progress.nextLevel,
            })}
          </p>
        </>
      )}
    </div>
  );
}
