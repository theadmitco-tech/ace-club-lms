'use client';
import { useEffect, useRef, useState } from 'react';
import { getYoutubeVideoId } from '@/lib/youtube';
import styles from './v2CourseSession.module.css';
type Player = { getCurrentTime(): number; getDuration(): number; getPlayerState(): number; destroy(): void };
type Youtube = { Player: new (element: HTMLElement, options: { videoId: string; host: string; playerVars: Record<string, string | number>; events: { onReady(): void; onStateChange(): void; onError(): void } }) => Player };
type YoutubeWindow = Window & { YT?: Youtube; onYouTubeIframeAPIReady?: () => void; aceYoutubeApi?: Promise<Youtube> };
function youtubeApi(): Promise<Youtube> {
  const browser = window as YoutubeWindow;
  if (browser.YT?.Player) return Promise.resolve(browser.YT);
  if (browser.aceYoutubeApi) return browser.aceYoutubeApi;
  browser.aceYoutubeApi = new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error('Recording player did not load.')), 20000);
    const previous = browser.onYouTubeIframeAPIReady;
    browser.onYouTubeIframeAPIReady = () => { previous?.(); clearTimeout(timeout); if (browser.YT?.Player) resolve(browser.YT); else reject(new Error('Recording player unavailable.')); };
    if (!document.querySelector('script[data-ace-youtube-api]')) {
      const script = document.createElement('script'); script.src = 'https://www.youtube.com/iframe_api'; script.async = true; script.dataset.aceYoutubeApi = 'true';
      script.onerror = () => { clearTimeout(timeout); reject(new Error('Recording player failed to load.')); };
      document.head.appendChild(script);
    }
  });
  browser.aceYoutubeApi = browser.aceYoutubeApi.catch(error => {
    delete browser.aceYoutubeApi; document.querySelector('script[data-ace-youtube-api]')?.remove(); throw error;
  });
  return browser.aceYoutubeApi;
}
export function v2RecordingSource(url: string): { kind: 'youtube'; id: string } | { kind: 'native' } | { kind: 'external' } {
  const youtube = getYoutubeVideoId(url);
  if (youtube) return { kind: 'youtube', id: youtube };
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return { kind: 'external' };
    if (['www.youtube-nocookie.com', 'youtube-nocookie.com'].includes(parsed.hostname) && /^\/embed\/[A-Za-z0-9_-]{6,}$/.test(parsed.pathname)) return { kind: 'youtube', id: parsed.pathname.split('/')[2] };
    if (/\.(mp4|webm|ogg)$/i.test(parsed.pathname)) return { kind: 'native' };
  } catch { /* Unsupported references retain their original source action. */ }
  return { kind: 'external' };
}
async function playerRequest(body: Record<string, unknown>) {
  const response = await fetch('/api/v2/learning', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Playback progress could not be confirmed.');
  return result;
}
export function V2RecordingPlayer({ url, title, batchId, sessionKey, recordingKey, publicationRevision, onFeedbackDue }: {
  url: string; title: string; batchId: string; sessionKey: string; recordingKey: string; publicationRevision: number; onFeedbackDue: () => void;
}) {
  const source = v2RecordingSource(url);
  const sourceKind = source.kind, videoId = source.kind === 'youtube' ? source.id : null;
  const host = useRef<HTMLDivElement>(null), video = useRef<HTMLVideoElement>(null), dueCallback = useRef(onFeedbackDue);
  const [status, setStatus] = useState('Loading the recording…'), [failed, setFailed] = useState(false), [selfReported, setSelfReported] = useState(false), [confirmed, setConfirmed] = useState(false), [busy, setBusy] = useState(false);
  useEffect(() => { dueCallback.current = onFeedbackDue; }, [onFeedbackDue]);
  useEffect(() => {
    if (sourceKind === 'external') return;
    let stopped = false, player: Player | null = null, timer: number | undefined, watchId: string | null = null, sending = false, due = false;
    const signal = () => {
      if (sourceKind === 'youtube') return player ? { position: player.getCurrentTime(), duration: player.getDuration(), playing: player.getPlayerState() === 1 } : null;
      return video.current ? { position: video.current.currentTime, duration: video.current.duration, playing: !video.current.paused && !video.current.ended } : null;
    };
    const sample = async () => {
      let values: ReturnType<typeof signal>;
      try { values = signal(); } catch { return; }
      if (stopped || sending || due || !watchId || !values || !Number.isFinite(values.duration) || values.duration <= 0 || !Number.isFinite(values.position)) return;
      sending = true;
      try {
        const result = await playerRequest({ action: 'watch-sample', watchId, requestId: crypto.randomUUID(), positionSeconds: values.position, durationSeconds: values.duration, playing: values.playing });
        if (stopped) return;
        if (result.due === true) { due = true; setStatus('Feedback is now due for this session. Its materials remain accessible.'); dueCallback.current(); }
        else setStatus('Playback progress is being saved. Feedback becomes due after 80% of distinct playback time.');
      } catch { if (!stopped) setStatus('Playback progress could not be saved. The recording remains available; retry the player to resume tracking.'); }
      finally { sending = false; }
    };
    async function initialize() {
      try {
        const started = await playerRequest({ action: 'watch-start', batchId, sessionKey, recordingKey, publicationRevision });
        if (stopped) return;
        if (typeof started.watchId !== 'string') throw new Error('Playback tracking unavailable.');
        watchId = started.watchId; due = started.due === true;
        setStatus(due ? 'Session feedback is due. This recording remains accessible.' : 'Playback progress is visual guidance; it is not verified attendance.');
        if (sourceKind === 'youtube') {
          const api = await youtubeApi(); if (stopped || !host.current) return;
          const target = document.createElement('div'); host.current.replaceChildren(target);
          player = new api.Player(target, { videoId: videoId!, host: 'https://www.youtube-nocookie.com', playerVars: { origin: location.origin, playsinline: 1, rel: 0 },
            events: { onReady: () => { host.current?.querySelector('iframe')?.setAttribute('title', title); void sample(); }, onStateChange: () => { void sample(); }, onError: () => { if (!stopped) { setFailed(true); setStatus('The recording could not play. Its original source remains available.'); } } } });
        }
        timer = window.setInterval(() => { void sample(); }, 5000);
        video.current?.addEventListener('play', sample); video.current?.addEventListener('pause', sample); video.current?.addEventListener('seeked', sample); video.current?.addEventListener('ended', sample);
      } catch { if (!stopped) { setFailed(true); setStatus('The recording or playback tracking could not be loaded. Retry the player or contact the programme team.'); } }
    }
    void initialize(); const native = video.current;
    return () => { stopped = true; clearInterval(timer); player?.destroy(); native?.removeEventListener('play', sample); native?.removeEventListener('pause', sample); native?.removeEventListener('seeked', sample); native?.removeEventListener('ended', sample); };
  }, [url, title, batchId, sessionKey, recordingKey, publicationRevision, sourceKind, videoId]);
  async function report() {
    setBusy(true);
    try {
      const result = await playerRequest({ action: 'watch-report', batchId, sessionKey, recordingKey, publicationRevision });
      if (typeof result.due !== 'boolean') throw new Error('Confirmation unavailable');
      setConfirmed(true); setStatus(result.due ? 'The recording was self-reported as watched. Session feedback is now due.' : 'The watched self-report is confirmed. Feedback for this session was already completed.'); onFeedbackDue();
    } catch { setStatus('The self-report could not be confirmed. Please retry.'); }
    finally { setBusy(false); }
  }
  if (source.kind === 'external') return <div><p>This recording opens with its external provider. Automatic playback tracking is unavailable.</p><label><input type="checkbox" checked={selfReported} disabled={busy || confirmed} onChange={event => setSelfReported(event.target.checked)} />The recording has been watched.</label><button className={styles.button} type="button" disabled={!selfReported || busy || confirmed} onClick={report}>{confirmed ? 'Watched self-report confirmed' : busy ? 'Confirming…' : 'Confirm watched · self-report'}</button><p role="status">{status === 'Loading the recording…' ? 'This confirmation records a self-report, not independently verified playback.' : status}</p></div>;
  return <div className={styles.player}><div className={styles.video}>
    {source.kind === 'youtube' ? <div ref={host} aria-label={title} /> : <video ref={video} src={url} title={title} controls preload="metadata" playsInline onError={() => { setFailed(true); setStatus('The recording could not play.'); }} />}
  </div><p role={failed ? 'alert' : 'status'}>{status}</p></div>;
}
