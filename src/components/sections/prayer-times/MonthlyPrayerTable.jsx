import React, { useMemo } from 'react';
import WallpaperDownload from '@/components/WallpaperDownload';
import { buildMonthlyTimetable } from '@/lib/monthlyTimetable';
import '@/styles/monthly-timetable.css';

export default function MonthlyPrayerTable({
  monthlyPrayerTimes,
  currentMonth,
  currentDate,
  jummahTimes = [],
}) {
  const timetable = useMemo(() => buildMonthlyTimetable(monthlyPrayerTimes), [monthlyPrayerTimes]);
  const today = currentDate.toLocaleDateString('en-CA', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const year = currentDate.toLocaleDateString('en-GB', {
    timeZone: 'Europe/London',
    year: 'numeric',
  });
  return (
    <div className="monthly-timetable">
      <header className="monthly-timetable-heading">
        <div>
          <h3>
            {currentMonth} {year} Prayer Times
          </h3>
          <p>12-hour times · Gold rows: Friday · &quot; means the same time as above</p>
        </div>
      </header>
      {timetable.rows.length === 0 ? (
        <p className="monthly-timetable-empty">
          This month’s timetable has not been uploaded yet. Please contact the centre.
        </p>
      ) : (
        <>
          <p className="monthly-timetable-scroll-hint">Swipe across to see all prayers.</p>
          <div
            className="monthly-timetable-scroll"
            role="region"
            aria-label="Monthly timetable, scroll across for all prayers"
            tabIndex={0}
          >
            <table
              className="monthly-timetable-grid"
              aria-label={`${currentMonth} ${year} prayer start and congregation times`}
            >
              <colgroup>
                {timetable.columns.map((column, index) => (
                  <col
                    key={column.key}
                    style={index < 2 ? { width: index === 0 ? '3.5rem' : '3rem' } : undefined}
                  />
                ))}
              </colgroup>
              <thead>
                <tr>
                  {timetable.groups.map((group) => (
                    <th
                      key={group.key}
                      scope={group.single ? 'col' : 'colgroup'}
                      colSpan={group.columns.length}
                      rowSpan={group.single ? 2 : 1}
                      className={group.key === 'date' ? 'monthly-timetable-date-heading' : ''}
                    >
                      {group.key === 'date' ? currentMonth : group.label}
                      {group.arabic && (
                        <span lang="ar" dir="rtl" className="monthly-timetable-arabic">
                          {group.arabic}
                        </span>
                      )}
                    </th>
                  ))}
                </tr>
                <tr>
                  {timetable.groups
                    .filter((group) => !group.single)
                    .flatMap((group) =>
                      group.columns.map((column) => (
                        <th
                          key={column.key}
                          scope="col"
                          className={`monthly-timetable-column-${column.key}`}
                        >
                          {column.label}
                        </th>
                      )),
                    )}
                </tr>
              </thead>
              <tbody>
                {timetable.rows.map((row, index) => (
                  <tr
                    key={row.isoDate || index}
                    className={`${row.isFriday ? 'is-friday' : ''} ${row.isoDate === today ? 'is-today' : ''}`}
                    aria-current={row.isoDate === today ? 'date' : undefined}
                  >
                    {row.cells.map((cell, cellIndex) =>
                      cellIndex === 0 ? (
                        <th key={cell.key} scope="row" className="monthly-timetable-column-dayName">
                          {row.isoDate === today && <span className="sr-only">Today, </span>}
                          <span aria-hidden="true">{cell.display}</span>
                          <span className="sr-only">
                            {row.isoDate
                              ? new Date(`${row.isoDate}T12:00:00Z`).toLocaleDateString('en-GB', {
                                  timeZone: 'UTC',
                                  weekday: 'long',
                                  day: 'numeric',
                                  month: 'long',
                                  year: 'numeric',
                                })
                              : `${row.dayName} ${row.day}`}
                          </span>
                        </th>
                      ) : (
                        <td
                          key={cell.key}
                          className={`monthly-timetable-column-${cell.key}`}
                          title={cell.value}
                        >
                          {cell.key === 'day' ? (
                            <time dateTime={row.isoDate || undefined}>{cell.display}</time>
                          ) : (
                            <>
                              <span aria-hidden="true">{cell.display}</span>
                              <span className="sr-only">{cell.value}</span>
                            </>
                          )}
                        </td>
                      ),
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="monthly-timetable-notes">
            {timetable.combinedMaghrib && <p>Maghrib Jama‘ah is at the Adhan time shown.</p>}
            {jummahTimes.length > 0 && (
              <p>
                <strong>Next Jummah</strong>
                {jummahTimes.map((jummah) => (
                  <span key={jummah.name}>
                    {jummah.name}: <strong>{jummah.prayer}</strong>
                  </span>
                ))}
              </p>
            )}
          </div>
        </>
      )}
      <WallpaperDownload
        monthlyPrayerTimes={monthlyPrayerTimes}
        currentMonth={`${currentMonth} ${year}`}
        jummahTimes={jummahTimes}
      />
    </div>
  );
}
