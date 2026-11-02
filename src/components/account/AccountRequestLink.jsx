import React from 'react';
import { Link } from 'react-router-dom';
import { ACCOUNT_REQUESTS_ENABLED } from '@/lib/accountRequests';

export default function AccountRequestLink({ children = 'Request access', state }) {
  return ACCOUNT_REQUESTS_ENABLED ? (
    <Link to="/account/request" state={state}>
      {children}
    </Link>
  ) : (
    <Link to="/contact">Contact the office</Link>
  );
}
