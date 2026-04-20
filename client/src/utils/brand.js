// ═══════════════════════════════════════════
// RIPHAH CONNECT — Brand Utilities
// ═══════════════════════════════════════════

// Unique avatar gradients per user (based on name hash)
const AVATAR_GRADIENTS = [
  ['#0d9488', '#14b8a6'], // teal
  ['#7c3aed', '#a78bfa'], // violet
  ['#db2777', '#f472b6'], // pink
  ['#ea580c', '#fb923c'], // orange
  ['#2563eb', '#60a5fa'], // blue
  ['#059669', '#34d399'], // emerald
  ['#dc2626', '#f87171'], // red
  ['#7c2d12', '#d97706'], // amber-brown
  ['#4f46e5', '#818cf8'], // indigo
  ['#0891b2', '#22d3ee'], // cyan
];

function hashStr(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

export function getAvatarGradient(name = '') {
  const idx = hashStr(name) % AVATAR_GRADIENTS.length;
  const [from, to] = AVATAR_GRADIENTS[idx];
  return `linear-gradient(135deg, ${from}, ${to})`;
}

export function getAvatarColors(name = '') {
  const idx = hashStr(name) % AVATAR_GRADIENTS.length;
  return AVATAR_GRADIENTS[idx];
}

// Format relative time like "2m ago", "3h ago"
export function timeAgo(date) {
  if (!date) return '';
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Format short time like "2m", "3h"
export function timeShort(date) {
  if (!date) return '';
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  if (seconds < 60) return 'now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
