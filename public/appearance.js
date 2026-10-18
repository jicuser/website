// Apply saved appearance before styles or React paint the page.
(() => {
  let theme = 'light';
  let surface = 'glass';
  try {
    theme = localStorage.getItem('jic-theme') === 'dark' ? 'dark' : 'light';
    surface = localStorage.getItem('jic_glass_enabled') === 'false' ? 'solid' : 'glass';
  } catch {
    // Private or restricted browsers can still use the default appearance.
  }
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.dataset.theme = theme;
  root.dataset.surface = surface;
  root.style.colorScheme = theme;
  root.style.backgroundColor = theme === 'dark' ? '#080f1d' : '#f9f7f1';
})();
