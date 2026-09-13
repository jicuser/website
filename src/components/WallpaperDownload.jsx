import React, { useEffect, useState } from 'react';
import { Download, FileImage, Share2, Smartphone } from 'lucide-react';
import { createMonthlyTimetableCanvas, createWallpaperCanvas } from '@/lib/timetableWallpaper';
import ImageViewer from '@/components/ImageViewer';

const formats = [
  {
    key: 'monthly-timetable',
    label: 'Monthly timetable',
    Icon: FileImage,
    create: createMonthlyTimetableCanvas,
  },
  {
    key: 'phone-wallpaper',
    label: 'Phone wallpaper',
    Icon: Smartphone,
    create: createWallpaperCanvas,
  },
];

export default function WallpaperDownload({ monthlyPrayerTimes, currentMonth, jummahTimes = [] }) {
  const [prepared, setPrepared] = useState(null);
  const [previewKey, setPreviewKey] = useState('');
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);
  // Minute polling must not rebuild images when the actual values are unchanged.
  const dataKey = JSON.stringify([currentMonth, monthlyPrayerTimes, jummahTimes]);
  const ready = prepared?.key === dataKey ? prepared.files : null;
  const preview = ready?.find((file) => file.key === previewKey);
  const problem = error?.key === dataKey ? error.message : '';

  useEffect(() => {
    let active = true;
    const urls = [];
    setPreviewKey('');
    setError(null);
    async function prepare() {
      try {
        const [month, rows, jummah] = JSON.parse(dataKey);
        if (!rows.length) return;
        const files = [];
        for (const format of formats) {
          const canvas = format.create(rows, month, jummah);
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
          canvas.width = 0;
          canvas.height = 0;
          if (!active) return;
          const filename = `JIC-${month.replace(/\s+/g, '-')}-${format.key}.jpg`;
          const file =
            typeof File === 'function' ? new File([blob], filename, { type: 'image/jpeg' }) : null;
          let canShare = false;
          try {
            canShare = Boolean(file && navigator.share && navigator.canShare?.({ files: [file] }));
          } catch {
            // A direct download remains available when file sharing is unsupported.
          }
          const url = URL.createObjectURL(blob);
          urls.push(url);
          files.push({
            key: format.key,
            url,
            title: `${month} ${format.label.toLowerCase()}`,
            file,
            filename,
            canShare,
          });
        }
        if (active) setPrepared({ key: dataKey, files });
      } catch (failure) {
        if (active)
          setError({
            key: dataKey,
            message: failure.message || 'Unable to create the timetable images.',
          });
      }
    }
    prepare();
    return () => {
      active = false;
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [dataKey, attempt]);

  async function share() {
    // Share the prepared file directly in the tap handler for iPhone Safari.
    try {
      await navigator.share({ files: [preview.file], title: preview.title });
    } catch (failure) {
      if (failure.name !== 'AbortError')
        setError({
          key: dataKey,
          message: 'Sharing is unavailable here. Use Download JPEG, or open the image and save it.',
        });
    }
  }

  return (
    <section
      className="timetable-downloads"
      id="phone-wallpaper"
      tabIndex={-1}
      aria-label="Timetable downloads"
    >
      <h4>Downloads</h4>
      <ul>
        {formats.map(({ key, label, Icon }) => {
          const image = ready?.find((file) => file.key === key);
          return (
            <li key={key}>
              <span className="timetable-downloads-title">
                <Icon size={20} aria-hidden="true" />
                {label}
              </span>
              <div className="timetable-downloads-actions">
                {image ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setPreviewKey(key)}
                      aria-label={`Preview ${label.toLowerCase()}`}
                    >
                      Preview
                    </button>
                    <a
                      href={image.url}
                      download={image.filename}
                      aria-label={`Download ${label.toLowerCase()} JPEG`}
                    >
                      <Download size={16} aria-hidden="true" />
                      Download JPEG
                    </a>
                  </>
                ) : (
                  <button
                    type="button"
                    disabled={!problem}
                    onClick={() => setAttempt((value) => value + 1)}
                  >
                    {problem
                      ? 'Retry download'
                      : monthlyPrayerTimes.length
                        ? 'Preparing image…'
                        : 'Timetable unavailable'}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {problem && !preview && <p role="alert">{problem}</p>}
      {preview && (
        <ImageViewer image={preview} onClose={() => setPreviewKey('')}>
          <p>
            Download saves a JPEG to your browser’s downloads. On iPhone, use Share / Save to save
            to Photos, or open the image and press and hold it.
          </p>
          {problem && <p role="alert">{problem}</p>}
          {preview.canShare && (
            <button type="button" onClick={share}>
              <Share2 size={17} />
              Share / Save
            </button>
          )}
          <a href={preview.url} download={preview.filename}>
            Download JPEG
          </a>
          <a href={preview.url} target="_blank" rel="noopener noreferrer">
            Open image
          </a>
        </ImageViewer>
      )}
    </section>
  );
}
