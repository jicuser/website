import React from 'react';

// A stale deployment or interrupted chunk download should offer recovery, not a blank page.
export default class PageLoadBoundary extends React.Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed)
      return (
        <section className="jic-page-loading" role="alert">
          <p>This page could not load. Please check your connection and try again.</p>
          <button type="button" onClick={() => window.location.reload()}>
            Reload page
          </button>
        </section>
      );
    return this.props.children;
  }
}
