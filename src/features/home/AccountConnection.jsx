import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, FileCheck2, Heart, ShieldCheck, UserCircle } from 'lucide-react';

export default function AccountConnection() {
  return (
    <section className="jic-account-connection" aria-labelledby="home-account-title">
      <div className="jic-account-connection-inner">
        <div>
          <span className="jic-section-label">
            <UserCircle size={15} aria-hidden="true" /> Your JIC account
          </span>
          <h2 id="home-account-title">
            A closer connection.
            <br />
            <em>One simple account.</em>
          </h2>
          <p>
            Sign in to see the records and services available to you, follow your requests and pick
            up where you left off.
          </p>
          <Link className="jic-solid-link" to="/portal">
            Open my JIC account <ArrowRight size={18} aria-hidden="true" />
          </Link>
          <p className="jic-account-help">
            New here? <Link to="/account/request">Ask the office about access</Link>
          </p>
        </div>
        <div className="jic-account-steps">
          {[
            [UserCircle, '01', 'Your account', 'Use your email to sign in.'],
            [FileCheck2, '02', 'Your requests', 'Find the records shared with you.'],
            [Heart, '03', 'Your community', 'Return to the services you need.'],
          ].map(([Icon, number, title, text]) => (
            <div className="jic-account-step" key={number}>
              <span className="jic-step-icon">
                <Icon size={21} aria-hidden="true" />
              </span>
              <span>
                <strong>{title}</strong>
                <small>{text}</small>
              </span>
              <span className="jic-step-number" aria-hidden="true">
                {number}
              </span>
            </div>
          ))}
          <p>
            <ShieldCheck size={16} aria-hidden="true" /> Personal records are only shown with the
            right account access.
          </p>
        </div>
      </div>
    </section>
  );
}
