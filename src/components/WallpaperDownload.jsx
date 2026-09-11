import React, { useEffect, useRef, useState } from 'react';
import { Share2, Smartphone } from 'lucide-react';
import { createWallpaperCanvas } from '@/lib/timetableWallpaper';
import ImageViewer from '@/components/ImageViewer';

export default function WallpaperDownload({ monthlyPrayerTimes, currentMonth }) {
  const [preview, setPreview] = useState(null), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => () => { if (preview?.url) URL.revokeObjectURL(preview.url); }, [preview]);

  async function prepare() {
    setBusy(true); setError('');
    try {
      const canvas = createWallpaperCanvas(monthlyPrayerTimes, currentMonth);
      if (!canvas) throw new Error('No timetable is available for this month.');
      const blob = await new Promise((resolve, reject) => canvas.toBlob(result => result ? resolve(result) : reject(new Error('The image could not be created. Please try again.')), 'image/jpeg', .96));
      if (!mounted.current) return;
      const filename = `JIC-${currentMonth.replace(/\s+/g, '-')}-phone-wallpaper.jpg`;
      const file = new File([blob], filename, { type: 'image/jpeg' });
      let canShare = false;
      try { canShare = Boolean(navigator.share && navigator.canShare?.({ files: [file] })); } catch { /* Use image/download fallback. */ }
      setPreview({ url: URL.createObjectURL(blob), title: `${currentMonth} prayer timetable`, file, filename, canShare });
    } catch (problem) { if (mounted.current) setError(problem.message || 'Unable to create the wallpaper.'); }
    finally { if (mounted.current) setBusy(false); }
  }

  async function share() {
    // The file is already prepared. Calling share directly from this fresh tap
    // preserves Safari's transient activation; no asynchronous canvas work first.
    try { await navigator.share({ files: [preview.file], title: preview.title }); }
    catch (problem) { if (problem.name !== 'AbortError') setError('Sharing is unavailable here. Use Download JPEG, or open the image and save it.'); }
  }

  return <div className="jic-wallpaper-control">
    <button type="button" disabled={busy} onClick={prepare}><Smartphone size={17}/>{busy ? 'Preparing wallpaper…' : 'Download phone wallpaper'}</button>
    {error && !preview && <p role="alert">{error}</p>}
    {preview && <ImageViewer image={preview} onClose={() => { setPreview(null); setError(''); }}>
      <p>On iPhone, tap Share / Save and choose Save Image or Save to Files. You can also open the image and press and hold to save it.</p>
      {error && <p role="alert">{error}</p>}
      {preview.canShare && <button type="button" onClick={share}><Share2 size={17}/> Share / Save</button>}
      <a href={preview.url} download={preview.filename}>Download JPEG</a>
      <a href={preview.url} target="_blank" rel="noopener noreferrer">Open image</a>
    </ImageViewer>}
  </div>;
}
