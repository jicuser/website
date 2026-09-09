import '@/styles/admin-workspace.css';
const rootEl = document.getElementById('root');

const showStatus = (title, detail = '') => {
  if (!rootEl) return;
  rootEl.innerHTML = `
    <div style="min-height:100vh;background:#07111b;color:#fff;display:flex;align-items:center;justify-content:center;padding:24px;font-family:system-ui,-apple-system,sans-serif">
      <div style="max-width:760px;width:100%;background:#0d1a27;border:1px solid rgba(255,255,255,.16);border-radius:18px;padding:22px;box-shadow:0 16px 50px rgba(0,0,0,.35)">
        <div style="font-size:14px;color:#f2c35c;margin-bottom:8px">Jamatia Islamic Centre</div>
        <div style="font-size:22px;font-weight:700;margin-bottom:10px">${title}</div>
        ${detail ? `<pre style="white-space:pre-wrap;word-break:break-word;margin:0;color:#d8e0e8;font-size:13px;line-height:1.5">${detail.replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))}</pre>` : ''}
      </div>
    </div>`;
};

showStatus('Loading website…');

(async () => {
  try {
    const [ReactModule, ReactDOMModule, RouterModule, AppModule, ToasterModule, AuthModule, ContentModule] = await Promise.all([
      import('react'),
      import('react-dom/client'),
      import('react-router-dom'),
      import('@/App'),
      import('@/components/ui/toaster'),
      import('@/context/AuthContext'),
      import('@/context/ContentContext'),
      import('@/styles/index.css'),
      import('@/styles/reference-match.css'),
      import('@/styles/navigation-refine.css'),
      import('@/styles/jic-polish.css'),
      import('@/styles/mobile-fixes.css'),
      import('@/styles/ios-glass.css'),
      import('@/styles/final-touches.css'),
      import('@/styles/jic-restructure.css'),
      import('@/styles/jic-final-polish.css'),
      import('@/styles/jic-popup-overrides.css'),
      import('@/styles/mobile-home-refine.css'),
      import('@/styles/scroll-reminder.css'),
      import('@/styles/header-uniform.css'),
      import('@/styles/mobile-full-menu.css'),
      import('@/styles/desktop-refine.css'),
      import('@/styles/desktop-polish-v2.css'),
      import('@/styles/navigation-structure-v2.css'),
      import('@/styles/navigation-cleanup.css'),
      import('@/styles/compact-desktop-fixes.css'),
      import('@/styles/ux-refine-v4.css'),
      import('@/styles/stability-v5.css'),
      import('@/styles/desktop-admin-v6.css'),
      import('@/styles/header-ux-v6.css'),
      import('@/styles/header-ux-v7.css'),
      import('@/styles/header-final-v8.css'),
      import('@/styles/header-nav-v9.css'),
    ]);

    const React = ReactModule.default;
    const ReactDOM = ReactDOMModule.default ?? ReactDOMModule;
    const { BrowserRouter } = RouterModule;
    const App = AppModule.default;
    const { Toaster } = ToasterModule;
    const { AuthProvider } = AuthModule;
    const { ContentProvider } = ContentModule;

    ReactDOM.createRoot(rootEl).render(
      React.createElement(
        React.StrictMode,
        null,
        React.createElement(
          BrowserRouter,
          null,
          React.createElement(
            AuthProvider,
            null,
            React.createElement(
              ContentProvider,
              null,
              React.createElement(App),
              React.createElement(Toaster)
            )
          )
        )
      )
    );
  } catch (error) {
    console.error('JIC startup error', error);
    showStatus('Website startup error', error?.message || String(error));
  }
})();
