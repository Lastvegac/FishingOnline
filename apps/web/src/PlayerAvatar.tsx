import { Anchor, Fish, Leaf, Sprout } from 'lucide-react';
import styles from './app.module.css';

/** One avatar presentation for the account header, journal and profile preview. */
export function PlayerAvatar({
  avatarKey,
  username,
  className = styles.avatar,
}: {
  avatarKey: string;
  username: string;
  className?: string;
}) {
  const Icon = {
    'angler-1': Leaf,
    'angler-2': Fish,
    'angler-3': Anchor,
    'angler-4': Sprout,
  }[avatarKey];
  return (
    <span className={className} aria-hidden="true">
      {Icon ? <Icon size={22} /> : username.charAt(0).toUpperCase()}
    </span>
  );
}
