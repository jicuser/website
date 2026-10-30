import React, { useEffect, useState } from 'react';
import { Download, FileImage, Share2, Smartphone, Printer } from 'lucide-react';
import { createMonthlyTimetableCanvas, createWallpaperCanvas } from '@/lib/timetableWallpaper';
import '@/styles/monthly-timetable.css';
import ImageViewer from '@/components/ImageViewer';

function printImage(file) {
  const win = window.open('', '_blank');
  if (!win) return false;
  win.document.title = file.title;
  const style = win.document.createElement('style');
  style.textContent =
    '@page{size:A4 portrait;margin:0}body{margin:0;background:white}img{display:block;width:210mm;height:297mm;object-fit:contain;max-width:100%}button{margin:12px;padding:12px}@media print{button{display:none}}';
  win.document.head.append(style);
  const button = win.document.createElement('button');
  button.textContent = 'Print / Save as PDF';
  button.onclick = () => win.print();
  const img = win.document.createElement('img');
  img.alt = file.title;
  img.onload = () => win.print();
  img.src = file.url;
  win.document.body.append(button, img);
  return true;
}

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

export default function WallpaperDownload({
  monthlyPrayerTimes,
  currentMonth,
  jummahTimes = [],
  editable = false,
}) {
  const [theme, setTheme] = useState('light');
  const [design, setDesign] = useState({
    hijriDay: '',
    hijriLength: '30',
    hijriHeading: '',
    zawalOffset: '',
    notice: '',
  });
  const [prepared, setPrepared] = useState(null);
  const [previewKey, setPreviewKey] = useState('');
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);
  // Minute polling must not rebuild images when the actual values are unchanged.
  const dataKey = JSON.stringify([currentMonth, monthlyPrayerTimes, jummahTimes, theme, design]);
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
        const [month, rows, jummah, selectedTheme, settings] = JSON.parse(dataKey);
        if (!rows.length) return;
        const loadImage = (url) =>
          new Promise((resolve) => {
            const image = new Image();
            image.onload = () => resolve(image);
            image.onerror = () => resolve(null);
            image.src = url;
          });
        const [lightLogo, darkLogo, photo] = await Promise.all([
          loadImage('/brand/jic-wordmark-light.svg'),
          loadImage('/brand/jic-wordmark-dark.svg'),
          loadImage('/jic-aerial-sunset.jpg'),
        ]);
        if (!active) return;
        const files = [];
        for (const format of formats) {
          const canvas = format.create(rows, month, jummah, {
            ...settings,
            theme: selectedTheme,
            jummahLabel: editable ? 'Weekly Jummah' : 'Next Jummah',
            logo:
              format.key === 'phone-wallpaper' && selectedTheme === 'dark' ? darkLogo : lightLogo,
            photo,
          });
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

  async function share(file = preview) {
    // Share the prepared file directly in the tap handler for iPhone Safari.
    try {
      await navigator.share({ files: [file.file], title: file.title });
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
      <h4>Print & phone wallpaper</h4>
      <fieldset className="timetable-theme-picker">
        <legend>Wallpaper colour</legend>
        {['light', 'dark'].map((value) => (
          <label key={value}>
            <input
              type="radio"
              name={`wallpaper-theme-${editable ? 'editor' : 'public'}`}
              value={value}
              checked={theme === value}
              onChange={() => setTheme(value)}
            />
            {value === 'light' ? 'Light' : 'Dark'}
          </label>
        ))}
      </fieldset>
      {editable && (
        <details className="timetable-design-options">
          <summary>Print details (optional)</summary>
          <p>
            These details apply to this download. Use the centre’s confirmed Hijri dates and Zawal
            interval.
          </p>
          <div className="admin-field-grid">
            <label>
              Hijri date on the 1st
              <input
                type="number"
                min="1"
                max={design.hijriLength}
                value={design.hijriDay}
                onChange={(e) => setDesign({ ...design, hijriDay: e.target.value })}
              />
            </label>
            <label>
              Days in that Hijri month
              <select
                value={design.hijriLength}
                onChange={(e) => setDesign({ ...design, hijriLength: e.target.value })}
              >
                <option>29</option>
                <option>30</option>
              </select>
            </label>
            <label>
              Hijri month names & year
              <input
                maxLength={80}
                value={design.hijriHeading}
                onChange={(e) => setDesign({ ...design, hijriHeading: e.target.value })}
                placeholder="Jumada al-Awwal / Jumada al-Thani 1448"
              />
            </label>
            <label>
              Zawal: minutes before Dhuhr
              <input
                type="number"
                min="0"
                max="60"
                value={design.zawalOffset}
                onChange={(e) => setDesign({ ...design, zawalOffset: e.target.value })}
              />
            </label>
            <label>
              Red notice strip
              <input
                maxLength={110}
                value={design.notice}
                onChange={(e) => setDesign({ ...design, notice: e.target.value })}
                placeholder="Clock change or important timetable notice"
              />
            </label>
          </div>
        </details>
      )}
      <p>
        A4 print layout stays light. Phone wallpaper leaves room above the timetable for your clock.
      </p>
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
                    {image.canShare && (
                      <button type="button" onClick={() => share(image)}>
                        <Share2 size={16} /> Share / Save
                      </button>
                    )}
                    {key === 'monthly-timetable' && (
                      <button
                        type="button"
                        onClick={() => {
                          if (!printImage(image))
                            setError({
                              key: dataKey,
                              message:
                                'Allow the print window, or download the JPEG and print it from Photos.',
                            });
                        }}
                      >
                        <Printer size={16} /> Print / PDF
                      </button>
                    )}
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
      <details className="timetable-wallpaper-help">
        <summary>How to set your wallpaper</summary>
        <ol>
          <li>Tap Share / Save to save the image to Photos, or download the JPEG.</li>
          <li>
            <strong>iPhone:</strong> Settings → Wallpaper → Add New Wallpaper → Photos. Choose the
            saved timetable.
          </li>
          <li>
            <strong>Android:</strong> Open Wallpaper & style in Settings, choose your photos and
            select the timetable. Names vary by phone.
          </li>
        </ol>
        <p>
          Choose Lock Screen for easier reading, or Home Screen if you prefer. Adjust the crop so
          every row is visible. This is a saved image; download a new one each month.
        </p>
      </details>
      {problem && !preview && <p role="alert">{problem}</p>}
      {preview && (
        <ImageViewer image={preview} onClose={() => setPreviewKey('')}>
          {problem && <p role="alert">{problem}</p>}
          {preview.canShare && (
            <button type="button" onClick={() => share()}>
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
