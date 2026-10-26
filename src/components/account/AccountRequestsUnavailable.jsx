import React from 'react';
import { Link } from 'react-router-dom';
import '@/styles/workspace.css';

export default function AccountRequestsUnavailable() {
  return (
    <main className="community-workspace">
      <div className="workspace-wrap">
        <section className="workspace-card">
          <h1>Account requests are not open yet</h1>
          <p>
            You can still sign in or create a personal account with your email. For help with
            access, contact the office.
          </p>
          <div className="workspace-actions">
            <Link to="/portal">Sign in or create an account</Link>
            <Link to="/contact">Contact the office</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
