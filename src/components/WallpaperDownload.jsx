import React, { useEffect, useState } from 'react';
import { Download, FileImage, Share2, Smartphone, Printer, Link as LinkIcon } from 'lucide-react';
import { createMonthlyTimetableCanvas, createWallpaperCanvas } from '@/lib/timetableWallpaper';
import {
  approvedTimetableAssets,
  emptyTimetableDesign,
  TIMETABLE_HEADER,
} from '@/lib/timetableDesign';
import { recordDate } from '@/lib/monthlyTimetable';
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
    label: 'A4 timetable',
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
  detailsStatus = 'ready',
  retryDetails,
  design = emptyTimetableDesign,
  designStatus = 'ready',
  retryDesign,
  onDesignChange,
  designDisabled = false,
}) {
  const settings = design || emptyTimetableDesign;
  const [prepared, setPrepared] = useState(null);
  const [previewKey, setPreviewKey] = useState('');
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState('');
  const [attempt, setAttempt] = useState(0);
  const dataKey = JSON.stringify([
    currentMonth,
    detailsStatus === 'ready' && designStatus === 'ready' ? monthlyPrayerTimes : [],
    jummahTimes,
    settings,
  ]);
  const ready = prepared?.key === dataKey ? prepared.files : null;
  const preview = ready?.find((file) => file.key === previewKey);
  const problem = error?.key === dataKey ? error.message : '';
  const change = (patch, resetDates = false) =>
    onDesignChange?.({ ...settings, ...patch, ...(resetDates ? { hijriDates: {} } : {}) });

  useEffect(() => {
    let active = true;
    const urls = [];
    setPreviewKey('');
    setError(null);
    setNotice('');
    async function prepare() {
      try {
        const [month, rows, jummah, savedSettings] = JSON.parse(dataKey);
        if (!rows.length) return;
        const approved = approvedTimetableAssets(rows, savedSettings, jummah);
        let header;
        if (!approved) {
          header = await new Promise((resolve, reject) => {
            const image = new Image();
            image.onload = () => resolve(image);
            image.onerror = () =>
              reject(new Error('The timetable header could not load. Please try again.'));
            image.src = TIMETABLE_HEADER;
          });
          if (document.fonts?.ready) await document.fonts.ready;
        }
        if (!active) return;
        const files = [];
        for (const format of formats) {
          const original = approved?.[format.key];
          let blob, url;
          if (original) {
            url = original.url;
            // The stable image URL remains usable even where sharing files is unsupported.
            if (typeof File === 'function' && navigator.share) {
              try {
                const response = await fetch(url);
                if (response.ok) blob = await response.blob();
              } catch {
                /* Direct image/PDF links remain available. */
              }
            }
          } else {
            const canvas = format.create(rows, month, jummah, { ...savedSettings, header });
            blob = await new Promise((resolve, reject) =>
              canvas.toBlob(
                (result) =>
                  result
                    ? resolve(result)
                    : reject(new Error('The image could not be created. Please try again.')),
                'image/png',
              ),
            );
            canvas.width = 0;
            canvas.height = 0;
            if (!active) return;
            url = URL.createObjectURL(blob);
            urls.push(url);
          }
          const filename = `JIC-${month.replace(/\s+/g, '-')}-${format.key}.png`;
          const file =
            blob && typeof File === 'function'
              ? new File([blob], filename, { type: 'image/png' })
              : null;
          let canShare = false;
          try {
            canShare = Boolean(file && navigator.share && navigator.canShare?.({ files: [file] }));
          } catch {
            /* Download fallback. */
          }
          files.push({
            key: format.key,
            url,
            title: `${month} ${format.label.toLowerCase()}`,
            file,
            filename,
            canShare,
            pdf: original?.pdf,
            shareUrl: original?.sharePath
              ? new URL(original.sharePath, window.location.origin).href
              : null,
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

  async function shareImage(file = preview) {
    try {
      await navigator.share({ files: [file.file], title: file.title });
    } catch (failure) {
      if (failure.name !== 'AbortError')
        setError({
          key: dataKey,
          message: 'Sharing is unavailable here. Download the PNG, or open the image and save it.',
        });
    }
  }
  async function shareLink(file) {
    try {
      if (navigator.share) await navigator.share({ title: file.title, url: file.shareUrl });
      else {
        await navigator.clipboard.writeText(file.shareUrl);
        setNotice('Link copied. Paste it into WhatsApp or a message.');
      }
    } catch (failure) {
      if (failure.name !== 'AbortError')
        setError({
          key: dataKey,
          message: 'Open the download page and copy its address to share it.',
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
      <h4>Download timetable</h4>
      {(detailsStatus === 'loading' || designStatus === 'loading') && (
        <p role="status">Loading published timetable…</p>
      )}
      {detailsStatus === 'error' && (
        <p role="alert">
          The extra timetable times could not be loaded.{' '}
          <button type="button" onClick={retryDetails}>
            Retry
          </button>
        </p>
      )}
      {designStatus === 'error' && (
        <p role="alert">
          The saved timetable design could not be loaded.{' '}
          <button type="button" onClick={retryDesign}>
            Retry
          </button>
        </p>
      )}
      {editable && (
        <details className="timetable-design-options" open>
          <summary>Original-sheet layout &amp; notices</summary>
          <p>
            These settings are saved with the month and used for the public A4 and phone downloads.
          </p>
          <fieldset disabled={designDisabled} className="admin-field-grid">
            <label>
              Hijri date on the 1st
              <input
                type="number"
                min="1"
                max={settings.hijriLength}
                value={settings.hijriDay}
                onChange={(event) => change({ hijriDay: event.target.value }, true)}
              />
            </label>
            <label>
              Days in that Hijri month
              <select
                value={settings.hijriLength}
                onChange={(event) => change({ hijriLength: event.target.value }, true)}
              >
                <option>29</option>
                <option>30</option>
              </select>
            </label>
            <label>
              Hijri month names &amp; year
              <input
                maxLength={80}
                value={settings.hijriHeading}
                onChange={(event) => change({ hijriHeading: event.target.value })}
                placeholder="Jumada al-Awwal / Jumada al-Thani 1448"
              />
            </label>
            <label>
              First Hijri month label
              <input
                maxLength={40}
                value={settings.hijriMonthLabel}
                onChange={(event) => change({ hijriMonthLabel: event.target.value })}
                placeholder="Jamadi-ul-Thani"
              />
            </label>
            <label>
              Next Hijri month label
              <input
                maxLength={40}
                value={settings.hijriNextMonth}
                onChange={(event) => change({ hijriNextMonth: event.target.value }, true)}
                placeholder="Rajab"
              />
            </label>
            <label>
              Zawal offset for months without published times (minutes before Dhuhr)
              <input
                type="number"
                min="0"
                max="60"
                disabled={
                  detailsStatus !== 'ready' || monthlyPrayerTimes.some((row) => row.zawwal_start)
                }
                value={settings.zawalOffset}
                onChange={(event) => change({ zawalOffset: event.target.value })}
              />
            </label>
            <label>
              Red notice strip
              <input
                maxLength={110}
                value={settings.notice}
                onChange={(event) => change({ notice: event.target.value })}
                placeholder="Clock change or important timetable notice"
              />
            </label>
            <label>
              Insert notice before this date
              <input
                type="date"
                value={settings.noticeDate}
                onChange={(event) => change({ noticeDate: event.target.value })}
              />
              <small>Leave blank to place the notice below the table.</small>
            </label>
          </fieldset>
          <details>
            <summary>Confirmed Hijri labels for individual dates</summary>
            <p>
              Leave a day blank to use the date rule above. A month name may replace the number on
              the transition day. Changing the date rule resets these labels.
            </p>
            <fieldset className="admin-field-grid" disabled={designDisabled}>
              {monthlyPrayerTimes.map((row) => {
                const date = recordDate(row);
                return (
                  <label key={date}>
                    {date}
                    <input
                      maxLength={40}
                      aria-label={`Hijri label ${date}`}
                      value={settings.hijriDates?.[date] || ''}
                      onChange={(event) =>
                        change({
                          hijriDates: { ...settings.hijriDates, [date]: event.target.value },
                        })
                      }
                    />
                  </label>
                );
              })}
            </fieldset>
          </details>
        </details>
      )}
      <p>The phone wallpaper uses the same timetable, with space above it for your clock.</p>
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
                      aria-label={`Download ${label.toLowerCase()} PNG`}
                    >
                      <Download size={16} aria-hidden="true" />
                      Download PNG
                    </a>
                    {image.pdf ? (
                      <a
                        href={image.pdf}
                        download={`JIC-${currentMonth.replace(/\s+/g, '-')}-Timetable.pdf`}
                      >
                        <Download size={16} />
                        Download PDF
                      </a>
                    ) : (
                      key === 'monthly-timetable' && (
                        <button
                          type="button"
                          onClick={() => {
                            if (!printImage(image))
                              setError({
                                key: dataKey,
                                message:
                                  'Allow the print window, or download the PNG and print it from Photos.',
                              });
                          }}
                        >
                          <Printer size={16} />
                          Print / PDF
                        </button>
                      )
                    )}
                    {image.shareUrl && (
                      <>
                        <button type="button" onClick={() => shareLink(image)}>
                          <Share2 size={16} />
                          Share link
                        </button>
                        <a href={image.shareUrl}>
                          <LinkIcon size={16} />
                          Download page
                        </a>
                      </>
                    )}
                    {image.canShare && (
                      <button type="button" onClick={() => shareImage(image)}>
                        <Share2 size={16} />
                        Share / Save image
                      </button>
                    )}
                  </>
                ) : (
                  <button
                    type="button"
                    disabled={!problem}
                    onClick={() => setAttempt((value) => value + 1)}
                  >
                    {problem
                      ? 'Retry download'
                      : detailsStatus === 'error' || designStatus === 'error'
                        ? 'Timetable unavailable'
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
      {notice && <p role="status">{notice}</p>}
      <details className="timetable-wallpaper-help">
        <summary>How to set your wallpaper</summary>
        <ol>
          <li>Save the PNG to Photos, or use Share / Save image.</li>
          <li>
            <strong>iPhone:</strong> Settings → Wallpaper → Add New Wallpaper → Photos. Choose the
            saved timetable.
          </li>
          <li>
            <strong>Android:</strong> Open Wallpaper &amp; style in Settings, choose your photos and
            select the timetable. Names vary by phone.
          </li>
        </ol>
        <p>Adjust the crop so every row stays visible. Download the new timetable each month.</p>
      </details>
      {problem && !preview && <p role="alert">{problem}</p>}
      {preview && (
        <ImageViewer image={preview} onClose={() => setPreviewKey('')}>
          {problem && <p role="alert">{problem}</p>}
          {preview.canShare && (
            <button type="button" onClick={() => shareImage()}>
              <Share2 size={17} />
              Share / Save image
            </button>
          )}
          {preview.shareUrl && (
            <button type="button" onClick={() => shareLink(preview)}>
              <Share2 size={17} />
              Share link
            </button>
          )}
          <a href={preview.url} download={preview.filename}>
            Download PNG
          </a>
          {preview.pdf && (
            <a href={preview.pdf} download>
              Download PDF
            </a>
          )}
          <a href={preview.url} target="_blank" rel="noopener noreferrer">
            Open image
          </a>
        </ImageViewer>
      )}
    </section>
  );
}
