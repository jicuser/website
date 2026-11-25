const input = document.querySelector('#share-url');
const status = document.querySelector('.share-status');
const copyButton = document.querySelector('[data-copy-link]');
const shareButton = document.querySelector('[data-share-link]');

if (input && status && copyButton && shareButton) {
  input.addEventListener('click', () => input.select());
  copyButton.hidden = false;
  copyButton.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(input.value);
      status.textContent = 'Link copied. You can paste it into WhatsApp or another message.';
    } catch {
      input.focus();
      input.select();
      input.setSelectionRange(0, input.value.length);
      status.textContent = 'The link is selected. Use your phone or browser’s Copy command.';
    }
  });
  if (typeof navigator.share === 'function') {
    shareButton.hidden = false;
    shareButton.addEventListener('click', async () => {
      try {
        await navigator.share({ title: document.title, url: input.value });
        status.textContent = '';
      } catch (error) {
        if (error?.name !== 'AbortError') {
          status.textContent = 'Sharing is unavailable here. Use Copy link instead.';
        }
      }
    });
  }
}
