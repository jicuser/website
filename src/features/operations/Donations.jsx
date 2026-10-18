import React, { useCallback, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowRight,
  Heart,
  Copy,
  Check,
  Moon,
  BookOpen,
  Users,
  Landmark,
  Share2,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { BANK_DETAILS, CAMPAIGN_CATEGORIES, CAMPAIGN_PURPOSE, money, toPence } from './model';
import { Field, Notice, LoadState, PortalGate, rpc, rows, useRecords } from './shared';

const icons = { community: Users, ramadan: Moon, education: BookOpen, masjid: Landmark };
export function BankDetails({ reference = 'JIC-DONATION' }) {
  const [copied, setCopied] = useState(false),
    [error, setError] = useState('');
  async function copy() {
    try {
      await navigator.clipboard.writeText(
        `Bank: ${BANK_DETAILS.bank}\nAccount name: ${BANK_DETAILS.accountName}\nSort code: ${BANK_DETAILS.sortCode}\nAccount number: ${BANK_DETAILS.accountNumber}\nReference: ${reference}`,
      );
      setCopied(true);
      setError('');
    } catch {
      setError('Select and copy the details below.');
    }
  }
  return (
    <section className="ops-bank" aria-label="JIC bank transfer details">
      <div className="ops-heading">
        <h3>Give directly to JIC</h3>
        <button type="button" className="ops-secondary" onClick={copy}>
          {copied ? <Check size={17} /> : <Copy size={17} />} {copied ? 'Copied' : 'Copy details'}
        </button>
      </div>
      <dl>
        <div>
          <dt>Bank</dt>
          <dd>{BANK_DETAILS.bank}</dd>
        </div>
        <div>
          <dt>Account name</dt>
          <dd>{BANK_DETAILS.accountName}</dd>
        </div>
        <div>
          <dt>Sort code</dt>
          <dd>{BANK_DETAILS.sortCode}</dd>
        </div>
        <div>
          <dt>Account number</dt>
          <dd>{BANK_DETAILS.accountNumber}</dd>
        </div>
        <div className="ops-bank-ref">
          <dt>Payment reference</dt>
          <dd>{reference}</dd>
        </div>
      </dl>
      <Notice error={error} />
      <p className="ops-help">
        Use your banking app to make a transfer. Check the account name before confirming. A
        reference helps the treasurer match your donation.
      </p>
    </section>
  );
}
export function CampaignCard({ campaign }) {
  const Icon = icons[campaign.category] || Heart;
  const progress = Math.min(
    100,
    Math.max(0, (Number(campaign.raised_pence || 0) / campaign.target_pence) * 100),
  );
  return (
    <article className="ops-campaign-card">
      <div className={`ops-campaign-art ops-art-${campaign.category}`}>
        <Icon size={48} strokeWidth={1.3} />
        <span>{CAMPAIGN_CATEGORIES.find(([id]) => id === campaign.category)?.[1]}</span>
      </div>
      <div className="ops-campaign-copy">
        <span className="ops-badge">
          {campaign.status === 'closed' ? 'Campaign closed' : `By ${campaign.organiser}`}
        </span>
        <h3>
          <Link to={`/fundraise/${campaign.slug}`}>{campaign.title}</Link>
        </h3>
        <p>
          {campaign.story.slice(0, 150)}
          {campaign.story.length > 150 ? '…' : ''}
        </p>
        <div
          className="ops-progress"
          role="progressbar"
          aria-label="Confirmed donations"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <span style={{ width: `${progress}%` }} />
        </div>
        <p className="ops-progress-label">
          <strong>{money(campaign.raised_pence)}</strong>
          <span>of {money(campaign.target_pence)}</span>
        </p>
        <Link className="ops-text-link" to={`/fundraise/${campaign.slug}`}>
          View campaign <ArrowRight size={17} />
        </Link>
      </div>
    </article>
  );
}
const publicLoader = async (signal) => {
  const { data, error } = await supabase.rpc('public_community_campaigns').abortSignal(signal);
  if (error) throw error;
  return data || [];
};
export default function DonationsPage() {
  const state = useRecords(publicLoader);
  const [category, setCategory] = useState('all');
  const [amount, setAmount] = useState('20');
  const [frequency, setFrequency] = useState('once');
  const campaigns = (state.data || []).filter((c) => category === 'all' || c.category === category);
  return (
    <div className="ops-page ops-giving">
      <Helmet>
        <title>Donate & Fundraise | Jamatia Islamic Centre</title>
      </Helmet>
      <header className="ops-giving-hero">
        <div>
          <p className="ops-eyebrow">A little from each of us. More for everyone.</p>
          <h1>
            Support your
            <br />
            centre.
          </h1>
          <p>Support the place where our community prays, learns and comes together.</p>
          <div className="ops-actions">
            <a className="ops-button" href="#give">
              Make a donation <Heart size={17} />
            </a>
          </div>
        </div>
        <figure>
          <img src="/optimized/jic-aerial-sunset.webp" alt="Jamatia Islamic Centre at sunset" />
          <figcaption>Your centre. Your community. Your impact.</figcaption>
        </figure>
      </header>
      <section className="ops-section">
        <div className="ops-heading">
          <div>
            <p className="ops-eyebrow">Giving, in every season</p>
            <h2>Choose a cause</h2>
          </div>
          <Link to="/financial-history">
            View financial history <ArrowRight size={16} />
          </Link>
        </div>
        <div className="ops-reasons">
          {CAMPAIGN_CATEGORIES.map(([id, label]) => {
            const Icon = icons[id];
            return (
              <button
                type="button"
                key={id}
                aria-pressed={category === id}
                onClick={() => setCategory(category === id ? 'all' : id)}
              >
                <Icon size={28} />
                <strong>{label}</strong>
                <span>
                  {
                    {
                      community: 'View community campaigns.',
                      ramadan: 'View Ramadan campaigns.',
                      education: 'View learning campaigns.',
                      masjid: 'View masjid campaigns.',
                    }[id]
                  }
                </span>
              </button>
            );
          })}
        </div>
      </section>
      <section className="ops-section" id="campaigns">
        <div className="ops-heading">
          <div>
            <p className="ops-eyebrow">Community fundraisers</p>
            <h2>Fundraising for JIC</h2>
          </div>
          <Link to="/fundraise/new">
            Create your page <ArrowRight size={16} />
          </Link>
        </div>
        <LoadState state={state} />
        {!state.loading && !state.error && !campaigns.length && (
          <div className="ops-empty">
            <Heart size={32} />
            <h3>
              {category === 'all'
                ? 'No public campaigns are currently listed.'
                : 'No public campaigns are currently listed in this category.'}
            </h3>
            <p>
              Create a personal page, choose a target and invite friends to support JIC. The team
              reviews every page before it appears here.
            </p>
            <Link className="ops-secondary" to="/fundraise/new">
              Start a fundraiser
            </Link>
            {category !== 'all' && (
              <button className="ops-secondary" onClick={() => setCategory('all')}>
                Show all campaigns
              </button>
            )}
          </div>
        )}
        <div className="ops-campaign-grid">
          {campaigns.map((c) => (
            <CampaignCard key={c.id} campaign={c} />
          ))}
        </div>
      </section>
      <section className="ops-give-layout ops-section" id="give">
        <div>
          <p className="ops-eyebrow">Choose your rhythm</p>
          <h2>
            A gift today.
            <br />A habit for tomorrow.
          </h2>
          <p>Choose an amount to plan your donation, then make the transfer through your bank.</p>
          <div className="ops-toggle" aria-label="Donation frequency">
            {[
              ['once', 'One off'],
              ['monthly', 'Monthly'],
              ['ramadan', 'Ramadan daily'],
            ].map(([id, label]) => (
              <button
                type="button"
                key={id}
                aria-pressed={frequency === id}
                onClick={() => setFrequency(id)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="ops-amounts">
            {['5', '10', '20', '50'].map((value) => (
              <button key={value} aria-pressed={amount === value} onClick={() => setAmount(value)}>
                £{value}
              </button>
            ))}
          </div>
          <Field label="Your amount (£)">
            <input
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              aria-label="Donation amount in pounds"
            />
          </Field>
          <div className="ops-notice">
            {frequency === 'once'
              ? `Your chosen gift: £${/^\d+(\.\d{1,2})?$/.test(amount) ? amount : '—'}.`
              : frequency === 'monthly'
                ? 'Set up a monthly standing order in your banking app. You control when it starts or stops.'
                : 'Set a daily standing order for your chosen Ramadan dates in your banking app, including an end date.'}{' '}
            Nothing is charged on this page.
          </div>
          <p className="ops-help">
            {CAMPAIGN_PURPOSE} For Zakat or a restricted gift, confirm the purpose with JIC before
            transferring.
          </p>
        </div>
        <BankDetails reference={frequency === 'ramadan' ? 'JIC-RAMADAN' : 'JIC-DONATION'} />
      </section>
      <section className="ops-panel ops-faq">
        <h2>Before you give</h2>
        <details>
          <summary>Can I add Gift Aid?</summary>
          <p>
            Contact the JIC office about eligibility and a valid declaration. Gift Aid is not
            automatically added here. Madrassah fees, invoices and other payments for services are
            kept separate from donations.
          </p>
        </details>
        <details>
          <summary>When will my campaign total change?</summary>
          <p>
            The treasurer records donations after checking receipt. A bank transfer may not appear
            immediately. Only confirmed entries count towards the total.
          </p>
        </details>
        <details>
          <summary>What will be public on my fundraising page?</summary>
          <p>
            Your chosen organiser name, title, story, target and confirmed total. Use a name you are
            happy to share and leave out private information about others.
          </p>
        </details>
      </section>
    </div>
  );
}
export function CampaignPage() {
  const { slug } = useParams();
  const loader = useCallback(
    async (signal) => {
      const { data, error } = await supabase
        .rpc('public_community_campaigns', { p_slug: slug })
        .abortSignal(signal);
      if (error) throw error;
      return data?.[0] || null;
    },
    [slug],
  );
  const state = useRecords(loader);
  const [message, setMessage] = useState('');
  async function share() {
    try {
      if (navigator.share)
        await navigator.share({ title: state.data.title, url: window.location.href });
      else {
        await navigator.clipboard.writeText(window.location.href);
        setMessage('Campaign link copied.');
      }
    } catch (e) {
      if (e.name !== 'AbortError')
        setMessage('Copy the address from your browser to share this page.');
    }
  }
  const c = state.data;
  return (
    <div className="ops-page">
      <Link className="ops-text-link" to="/donate">
        ← All fundraising
      </Link>
      <LoadState state={state} />
      {!state.loading && !state.error && !c && (
        <div className="ops-empty">
          <h1>Campaign unavailable</h1>
          <p>This page may still be awaiting review or is no longer public.</p>
        </div>
      )}
      {c && (
        <>
          <Helmet>
            <title>{c.title} | JIC Fundraising</title>
          </Helmet>
          <header className="ops-campaign-hero">
            <p className="ops-eyebrow">Community fundraising · {c.category}</p>
            <h1>{c.title}</h1>
            <p>Organised by {c.organiser}</p>
            <button className="ops-secondary" onClick={share}>
              <Share2 size={18} /> Share this page
            </button>
            <Notice message={message} />
          </header>
          <div className="ops-give-layout">
            <article className="ops-panel">
              <img
                className="ops-story-photo"
                src="/optimized/jic-aerial-sunset.webp"
                alt="Jamatia Islamic Centre"
              />
              <h2>Why I’m fundraising</h2>
              <p className="ops-preserve">{c.story}</p>
              <p className="ops-help">{CAMPAIGN_PURPOSE}</p>
            </article>
            <aside>
              <div className="ops-panel">
                <p className="ops-eyebrow">Confirmed donations</p>
                <p className="ops-large-number">{money(c.raised_pence)}</p>
                <progress
                  className="ops-native-progress"
                  value={Math.min(c.raised_pence, c.target_pence)}
                  max={c.target_pence}
                  aria-label="Campaign progress"
                />
                <p>of {money(c.target_pence)} goal</p>
                <p className="ops-help">Totals update after the treasurer confirms receipt.</p>
              </div>
              {c.status === 'published' ? (
                <BankDetails reference={c.reference} />
              ) : (
                <div className="ops-notice">
                  This campaign is closed. Thank you for supporting JIC.{' '}
                  <Link to="/donate">Explore other ways to give</Link>.
                </div>
              )}
            </aside>
          </div>
        </>
      )}
    </div>
  );
}
export function MyFundraisingPage() {
  return (
    <PortalGate destination="/fundraise/new">
      <MyFundraising />
    </PortalGate>
  );
}
function MyFundraising() {
  const { profile, user } = useAuth();
  const loader = useCallback(
    (signal) =>
      rows('community_campaigns', signal, (q) =>
        q.eq('owner_id', user.id).order('created_at', { ascending: false }),
      ),
    [user.id],
  );
  const state = useRecords(loader);
  const blank = {
    title: '',
    organiser: profile?.display_name || '',
    story: '',
    category: 'community',
    target: '500',
  };
  const [form, setForm] = useState(blank),
    [editing, setEditing] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [message, setMessage] = useState(''),
    [consent, setConsent] = useState(false);
  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  async function save(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await rpc('save_community_campaign', {
        p_id: editing?.id || null,
        p_body: { ...form, target_pence: toPence(form.target) },
        p_version: editing?.version || null,
      });
      setForm(blank);
      setEditing(null);
      setConsent(false);
      setMessage(
        'Your page is saved and waiting for JIC review. Your campaigns below show its status.',
      );
      state.refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="ops-page">
      <Helmet>
        <title>My Fundraising | JIC Portal</title>
      </Helmet>
      <div className="ops-heading">
        <Link to="/portal">← My portal</Link>
        <Link to="/donate">Donation hub</Link>
      </div>
      <header className="ops-intro">
        <p className="ops-eyebrow">Make it personal</p>
        <h1>
          Start a fundraiser
          <br />
          for JIC.
        </h1>
        <p>Create a page for review, then share the approved page with friends and family.</p>
      </header>
      <ol className="ops-steps">
        <li>
          <b>01</b>
          <span>Create your page</span>
        </li>
        <li>
          <b>02</b>
          <span>JIC reviews it</span>
        </li>
        <li>
          <b>03</b>
          <span>Share and raise</span>
        </li>
      </ol>
      <div className="ops-give-layout">
        <form className="ops-panel ops-form" onSubmit={save}>
          <h2>{editing ? 'Edit your fundraiser' : 'Create your fundraising page'}</h2>
          <fieldset disabled={busy}>
            <Field label="Page title">
              <input
                required
                minLength={5}
                maxLength={120}
                value={form.title}
                onChange={(e) => set('title', e.target.value)}
                placeholder="Our family’s Ramadan fundraiser"
              />
            </Field>
            <Field label="Public organiser name" hint="This name will appear on your page.">
              <input
                required
                minLength={2}
                maxLength={100}
                value={form.organiser}
                onChange={(e) => set('organiser', e.target.value)}
              />
            </Field>
            <div className="ops-form-grid">
              <Field label="Occasion">
                <select value={form.category} onChange={(e) => set('category', e.target.value)}>
                  {CAMPAIGN_CATEGORIES.map(([id, label]) => (
                    <option value={id} key={id}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Target (£)">
                <input
                  required
                  inputMode="decimal"
                  value={form.target}
                  onChange={(e) => set('target', e.target.value)}
                />
              </Field>
            </div>
            <Field
              label="Your story"
              hint="40–4,000 characters. Explain what JIC means to you. Avoid private details about children or other people."
            >
              <textarea
                required
                minLength={40}
                maxLength={4000}
                rows={7}
                value={form.story}
                onChange={(e) => set('story', e.target.value)}
              />
            </Field>
            <p className="ops-help">
              {CAMPAIGN_PURPOSE} Money goes directly to JIC; this page does not pay funds to the
              organiser.
            </p>
            <label className="ops-check">
              <input
                required
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
              />
              <span>
                I’m 18 or over, I agree to these fundraising terms and I’m happy for this page to be
                public after review. <Link to="/privacy">Privacy information</Link>.
              </span>
            </label>
            <button className="ops-button" disabled={busy}>
              {busy ? 'Saving…' : 'Save and send for review'}
            </button>
            {editing && (
              <button
                type="button"
                className="ops-secondary"
                onClick={() => {
                  setEditing(null);
                  setForm(blank);
                }}
              >
                Cancel editing
              </button>
            )}
          </fieldset>
          <Notice error={error} message={message} />
        </form>
        <aside>
          <h2>Your campaigns</h2>
          <LoadState state={state} />
          {state.data?.length === 0 && (
            <p className="ops-empty">Your saved campaigns will appear here.</p>
          )}
          {state.data?.map((c) => (
            <article className="ops-panel" key={c.id}>
              <span className="ops-badge">{c.status}</span>
              <h3>{c.title}</h3>
              <p>{money(c.target_pence)} goal</p>
              {c.review_note && <p className="ops-notice">JIC review: {c.review_note}</p>}
              {['pending', 'rejected'].includes(c.status) ? (
                <button
                  className="ops-secondary"
                  disabled={busy}
                  onClick={() => {
                    setEditing(c);
                    setForm({ ...c, target: String(c.target_pence / 100) });
                    setMessage('');
                    setConsent(false);
                  }}
                >
                  Edit page
                </button>
              ) : (
                <Link to={`/fundraise/${c.slug}`}>Open and share page →</Link>
              )}
            </article>
          ))}
        </aside>
      </div>
    </div>
  );
}
