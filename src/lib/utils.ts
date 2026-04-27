/* ============================================
   Utility Functions
   ============================================ */

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) {
    const absDays = Math.abs(diffDays);
    if (absDays === 0) return 'Today';
    if (absDays === 1) return 'Yesterday';
    if (absDays < 7) return `${absDays} days ago`;
    if (absDays < 30) return `${Math.floor(absDays / 7)} weeks ago`;
    return formatDate(dateStr);
  }
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays < 7) return `In ${diffDays} days`;
  if (diffDays < 30) return `In ${Math.floor(diffDays / 7)} weeks`;
  return formatDate(dateStr);
}

export function getYouTubeEmbedUrl(url: string): string | null {
  if (!url) return null;
  
  // Handle various YouTube URL formats
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return `https://www.youtube.com/embed/${match[1]}`;
    }
  }
  
  return null;
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function getMaterialTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    pre_read: 'Pre-read',
    class_material: 'Class Material',
    worksheet: 'Worksheet',
    video: 'Video',
  };
  return labels[type] || type;
}

export function getMaterialTypeIcon(type: string): string {
  const icons: Record<string, string> = {
    pre_read: '📖',
    class_material: '📄',
    worksheet: '✍️',
    video: '🎬',
  };
  return icons[type] || '📎';
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
