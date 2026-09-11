import '@/styles/app.css';
const rootEl = document.getElementById('root');

const showStatus = (title) => {
  if (!rootEl) return;
  const panel = document.createElement('div');
  panel.className = 'jic-startup-status';
  const brand = document.createElement('p');
  brand.textContent = 'Jamatia Islamic Centre';
  const message = document.createElement('h1');
  message.textContent = title;
  panel.append(brand, message);
  rootEl.replaceChildren(panel);
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
