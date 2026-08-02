const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{6,}$/;

export function getYoutubeVideoId(value: string) {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:') return null;

    const host = url.hostname.toLowerCase().replace(/^(www\.|m\.)/, '');
    let videoId: string | null = null;

    if (host === 'youtu.be') {
      videoId = url.pathname.split('/').filter(Boolean)[0] ?? null;
    } else if (host === 'youtube.com') {
      if (url.pathname === '/watch') {
        videoId = url.searchParams.get('v');
      } else {
        const [kind, id] = url.pathname.split('/').filter(Boolean);
        if (kind === 'shorts' || kind === 'embed') videoId = id ?? null;
      }
    }

    return videoId && VIDEO_ID_PATTERN.test(videoId) ? videoId : null;
  } catch {
    return null;
  }
}

export function isSupportedYoutubeUrl(value: string) {
  return getYoutubeVideoId(value) !== null;
}

export function getYoutubeEmbedUrl(value: string) {
  const videoId = getYoutubeVideoId(value);
  return videoId ? `https://www.youtube-nocookie.com/embed/${videoId}` : null;
}
