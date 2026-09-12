import React, { useEffect, useState } from 'react';
import { Share2, Smartphone } from 'lucide-react';
import { createWallpaperCanvas } from '@/lib/timetableWallpaper';
import ImageViewer from '@/components/ImageViewer';

export default function WallpaperDownload({ monthlyPrayerTimes, currentMonth }) {
  const [prepared, setPrepared] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);
  // Polling returns new arrays. Rebuild the image only when timetable values change.
  const dataKey = JSON.stringify([currentMonth, monthlyPrayerTimes]);
  const ready = prepared?.key === dataKey ? prepared : null;
  const problem = error?.key === dataKey ? error.message : '';

  useEffect(() => {
    let active = true;
    let url;
    setPreviewOpen(false);
    setError(null);
    async function prepare() {
      try {
        const [month, rows] = JSON.parse(dataKey);
        const canvas = createWallpaperCanvas(rows, month);
        if (!canvas) return;
        const blob = await new Promise((resolve, reject) =>
          canvas.toBlob(
            (result) =>
              result
                ? resolve(result)
                : reject(new Error('The image could not be created. Please try again.')),
            'image/jpeg',
            0.96,
          ),
        );
        if (!active) return;
        const filename = `JIC-${month.replace(/\s+/g, '-')}-phone-wallpaper.jpg`;
        const file =
          typeof File === 'function' ? new File([blob], filename, { type: 'image/jpeg' }) : null;
        let canShare = false;
        try {
          canShare = Boolean(file && navigator.share && navigator.canShare?.({ files: [file] }));
        } catch {
          // The ordinary download remains available if file sharing is unsupported.
        }
        url = URL.createObjectURL(blob);
        setPrepared({
          key: dataKey,
          url,
          title: `${month} prayer timetable`,
          file,
          filename,
          canShare,
        });
      } catch (failure) {
        if (active)
          setError({ key: dataKey, message: failure.message || 'Unable to create the wallpaper.' });
      }
    }
    prepare();
    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [dataKey, attempt]);

  async function share() {
    // The ready file can be shared directly from the tap, preserving Safari activation.
    try {
      await navigator.share({ files: [ready.file], title: ready.title });
    } catch (failure) {
      if (failure.name !== 'AbortError')
        setError({
          key: dataKey,
          message: 'Sharing is unavailable here. Use Download JPEG, or open the image and save it.',
        });
    }
  }

  return (
    <div className="jic-wallpaper-control" id="phone-wallpaper" tabIndex={-1}>
      {ready ? (
        <>
          <a href={ready.url} download={ready.filename}>
            <Smartphone size={17} /> Download phone wallpaper
          </a>
          <button type="button" onClick={() => setPreviewOpen(true)}>
            Preview / save image
          </button>
        </>
      ) : (
        <button type="button" disabled={!problem} onClick={() => setAttempt((value) => value + 1)}>
          <Smartphone size={17} />
          {problem
            ? 'Retry wallpaper'
            : monthlyPrayerTimes.length
              ? 'Preparing wallpaper…'
              : 'Timetable unavailable'}
        </button>
      )}
      {problem && !previewOpen && <p role="alert">{problem}</p>}
      {previewOpen && ready && (
        <ImageViewer image={ready} onClose={() => setPreviewOpen(false)}>
          <p>
            Download saves a JPEG to your browser’s downloads. On iPhone, use Share / Save to save
            to Photos, or open the image and press and hold it.
          </p>
          {problem && <p role="alert">{problem}</p>}
          {ready.canShare && (
            <button type="button" onClick={share}>
              <Share2 size={17} /> Share / Save
            </button>
          )}
          <a href={ready.url} download={ready.filename}>
            Download JPEG
          </a>
          <a href={ready.url} target="_blank" rel="noopener noreferrer">
            Open image
          </a>
        </ImageViewer>
      )}
    </div>
  );
}
