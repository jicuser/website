import '@/styles/app.css';
const rootEl = document.getElementById('root');

const showStatus = (title) => {
  if (!rootEl) return;
  rootEl.innerHTML = `
    <div style="min-height:100vh;background:#07111b;color:#fff;display:flex;align-items:center;justify-content:center;padding:24px;font-family:system-ui,-apple-system,sans-serif">
      <div style="max-width:520px;width:100%;background:#0d1a27;border:1px solid rgba(255,255,255,.16);border-radius:18px;padding:22px;box-shadow:0 16px 50px rgba(0,0,0,.35);text-align:center">
        <div style="font-size:14px;color:#f2c35c;margin-bottom:8px">Jamatia Islamic Centre</div>
        <div style="font-size:20px;font-weight:700">${title}</div>
      </div>
    </div>`;
};

showStatus('Loading website…');

(async () => {
  try {
    const [
      ReactModule,
      ReactDOMModule,
      RouterModule,
      AppModule,
      ToasterModule,
      AuthModule,
      ContentModule,
      AppearanceModule,
    ] = await Promise.all([
      import('react'),
      import('react-dom/client'),
      import('react-router-dom'),
      import('@/App'),
      import('@/components/ui/toaster'),
      import('@/context/AuthContext'),
      import('@/context/ContentContext'),
      import('@/context/AppearanceContext'),
    ]);

    const React = ReactModule.default;
    const ReactDOM = ReactDOMModule.default ?? ReactDOMModule;
    const { BrowserRouter } = RouterModule;
    const App = AppModule.default;
    const { Toaster } = ToasterModule;
    const { AuthProvider } = AuthModule;
    const { ContentProvider } = ContentModule;
    const { AppearanceProvider } = AppearanceModule;

    ReactDOM.createRoot(rootEl).render(
      React.createElement(
        React.StrictMode,
        null,
        React.createElement(
          BrowserRouter,
          null,
          React.createElement(
            AppearanceProvider,
            null,
            React.createElement(
              AuthProvider,
              null,
              React.createElement(
                ContentProvider,
                null,
                React.createElement(App),
                React.createElement(Toaster),
              ),
            ),
          ),
        ),
      ),
    );
  } catch (error) {
    console.error('JIC startup error', error);
    showStatus('Website is temporarily unavailable. Please refresh and try again.');
  }
})();
