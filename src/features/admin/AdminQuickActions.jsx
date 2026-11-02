import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, ClipboardList, CalendarDays, Users, Wallet, Clock3, ArrowRight } from 'lucide-react';
import { availableQuickActions } from '@/lib/adminQuickActions';
import '@/styles/connected-admin.css';

const ICONS = { pages: FileText, forms: ClipboardList, classes: CalendarDays, people: Users, finance: Wallet, prayer: Clock3 };

export default function AdminQuickActions({ can }) {
  const actions = availableQuickActions(can);
  if (!actions.length) return null;
  return (
    <section className="connected-quick-actions" aria-labelledby="connected-actions-title">
      <div className="admin-overview-section-heading"><div>
        <h2 id="connected-actions-title">What would you like to do?</h2>
        <p>Go straight to the right editor. Saving a draft does not publish it.</p>
      </div></div>
      <div className="connected-action-grid">
        {actions.map((action) => {
          const Icon = ICONS[action.id];
          return <Link key={action.id} to={action.href} className="connected-action-card">
            <Icon size={22} aria-hidden="true" />
            <span><strong>{action.title}</strong><small>{action.detail}</small></span>
            <ArrowRight size={16} aria-hidden="true" />
          </Link>;
        })}
      </div>
    </section>
  );
}
