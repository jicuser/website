import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { CAMPAIGN_PURPOSE, money } from './model';
import { LoadState, Notice, Stats, rpc, rows, useRecords } from './shared';
const loader = (signal) =>
  rows('community_campaigns', signal, (q) =>
    q.order('created_at', { ascending: false }).limit(200),
  );
export default function FundraisingManager() {
  const state = useRecords(loader);
  const [filter, setFilter] = useState('pending'),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [message, setMessage] = useState('');
  const campaigns = state.data || [];
  async function review(c, status) {
    const note =
      status === 'rejected' ? window.prompt('Explain what the organiser needs to change:') : '';
    if (status === 'rejected' && !note) return;
    if (
      status === 'published' &&
      !window.confirm(
        'Publish this page? Confirm the organiser, public wording and fundraising purpose are suitable for JIC.',
      )
    )
      return;
    setBusy(true);
    setError('');
    try {
      await rpc('review_community_campaign', {
        p_id: c.id,
        p_status: status,
        p_note: note || '',
        p_version: c.version,
      });
      setMessage(
        status === 'published'
          ? 'Campaign published. Its link is ready to share.'
          : 'Review saved.',
      );
      state.refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="ops-admin">
      <header className="ops-heading">
        <div>
          <p className="ops-eyebrow">Community support</p>
          <h1>Fundraising</h1>
          <p>Review personal pages before they appear on the website.</p>
        </div>
        <Link className="ops-secondary" to="/donate">
          Open giving hub →
        </Link>
      </header>
      <LoadState state={state} />
      <Notice error={error} message={message} />
      {state.data && (
        <Stats
          items={[
            ['Awaiting review', campaigns.filter((c) => c.status === 'pending').length],
            ['Published', campaigns.filter((c) => c.status === 'published').length],
            ['Closed', campaigns.filter((c) => c.status === 'closed').length],
          ]}
        />
      )}
      <nav className="ops-tabs" aria-label="Campaign status">
        {['pending', 'published', 'closed', 'rejected'].map((s) => (
          <button key={s} aria-pressed={filter === s} onClick={() => setFilter(s)}>
            {s === 'pending' ? 'Awaiting review' : s}
          </button>
        ))}
      </nav>
      <p className="ops-help">
        Latest 200 pages. All campaigns use this purpose: {CAMPAIGN_PURPOSE}
      </p>
      {!state.loading && !state.error && !campaigns.some((c) => c.status === filter) && (
        <div className="ops-empty">No campaigns in this section.</div>
      )}
      <div className="ops-campaign-grid">
        {campaigns
          .filter((c) => c.status === filter)
          .map((c) => (
            <article className="ops-panel" key={c.id}>
              <span className="ops-badge">
                {c.category} · {c.status}
              </span>
              <h2>{c.title}</h2>
              <p>
                Organiser: <strong>{c.organiser}</strong> · {money(c.target_pence)} goal
              </p>
              <p className="ops-preserve">{c.story}</p>
              {c.review_note && <p className="ops-notice">{c.review_note}</p>}
              <p className="ops-help">Payment reference: {c.reference}</p>
              <div className="ops-actions">
                {c.status !== 'published' && (
                  <button
                    className="ops-button"
                    disabled={busy}
                    onClick={() => review(c, 'published')}
                  >
                    {c.status === 'closed' ? 'Reopen campaign' : 'Approve and publish'}
                  </button>
                )}
                {c.status === 'pending' && (
                  <button
                    className="ops-secondary"
                    disabled={busy}
                    onClick={() => review(c, 'rejected')}
                  >
                    Request changes
                  </button>
                )}
                {c.status === 'published' && (
                  <>
                    <Link className="ops-secondary" to={`/fundraise/${c.slug}`}>
                      View page
                    </Link>
                    <button
                      className="ops-secondary"
                      disabled={busy}
                      onClick={() => review(c, 'closed')}
                    >
                      Close campaign
                    </button>
                  </>
                )}
              </div>
            </article>
          ))}
      </div>
    </section>
  );
}
