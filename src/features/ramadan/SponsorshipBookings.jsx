import React, { Fragment } from 'react';
import { fullDate } from '@/lib/bookingCalendar';
import { money } from '@/features/operations/model';
import { RAMADAN_COLOURS, SPONSORSHIP_STATUS } from './model';

export default function SponsorshipBookings({
  rows,
  tableRef,
  selected,
  editing,
  dayEnabled,
  disabled,
  onEdit,
  onAdd,
  editor,
}) {
  return (
    <>
      <div
        className="booking-table-wrap sponsorship-table-wrap sponsorship-bookings"
        tabIndex={0}
        role="region"
        aria-label="Staff sponsorship bookings"
      >
        <p className="sponsorship-table-hint">Scroll across to see all columns.</p>
        <table
          className="booking-table sponsorship-mobile-table sponsorship-admin-table"
          ref={tableRef}
        >
          <thead>
            <tr>
              <th scope="col" className="sponsorship-day-cell">
                Ramadan day
              </th>
              <th scope="col" className="sponsorship-date-cell">
                UK date
              </th>
              <th scope="col" className="sponsorship-status-cell">
                Status
              </th>
              <th scope="col">Sponsor</th>
              <th scope="col" className="sponsorship-print-detail">
                Contact
              </th>
              <th scope="col" className="sponsorship-print-detail">
                Amount
              </th>
              <th scope="col" className="sponsorship-print-detail">
                Payment
              </th>
              <th scope="col" className="sponsorship-action-cell" data-print-exclude="true">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {!rows.length && (
              <tr>
                <td colSpan={8}>No sponsorships match this range and status.</td>
              </tr>
            )}
            {rows.map(({ number, date, row }, index) => {
              const colour =
                row?.status === 'confirmed'
                  ? 'confirmed'
                  : row?.status === 'pending'
                    ? 'pending'
                    : row?.status === 'cancelled' || !dayEnabled(date)
                      ? 'closed'
                      : 'available';
              const expanded =
                selected === date &&
                (editing
                  ? row?.id === editing
                  : rows.findIndex((entry) => entry.date === date) === index);
              return (
                <Fragment key={row?.id || date}>
                  <tr className={expanded ? 'is-selected' : undefined}>
                    <th scope="row" className="sponsorship-day-cell">
                      {number} Ramadan
                    </th>
                    <td className="sponsorship-date-cell">{fullDate(date)}</td>
                    <td className="sponsorship-status-cell">
                      <span className="sponsorship-status">
                        <i
                          className="booking-dot"
                          aria-hidden="true"
                          style={{ '--day-colour': RAMADAN_COLOURS[colour] }}
                        />
                        {row
                          ? SPONSORSHIP_STATUS[row.status]
                          : dayEnabled(date)
                            ? 'Available'
                            : 'Closed'}
                      </span>
                      {row && !dayEnabled(date) && <small>Bookings closed</small>}
                    </td>
                    <td className="sponsorship-sponsor-cell">{row?.sponsor_name || '—'}</td>
                    <td className="sponsorship-print-detail">
                      {[row?.phone, row?.email].filter(Boolean).join(' / ') || '—'}
                    </td>
                    <td className="sponsorship-print-detail">
                      {row ? money(row.amount_pence) : '—'}
                    </td>
                    <td className="sponsorship-print-detail">
                      {row ? (row.paid ? 'Received' : 'Not recorded') : '—'}
                    </td>
                    <td className="sponsorship-action-cell" data-print-exclude="true">
                      <button
                        type="button"
                        className="booking-button"
                        disabled={disabled}
                        aria-expanded={expanded}
                        onClick={() => (row ? onEdit(row) : onAdd(date))}
                      >
                        {row ? 'Edit' : 'Add sponsor'}
                        <span className="sr-only">
                          {' '}
                          · {number} Ramadan{row ? ` · ${row.sponsor_name}` : ''}
                        </span>
                      </button>
                    </td>
                  </tr>
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      {editor}
    </>
  );
}
