/* Minimal screen switcher — opacity + 6px translate per North Star §六 */
(function () {
  const body = document.body;
  const buttons = document.querySelectorAll('[data-screen-btn]');
  const KEY_TO_SCREEN = { '1': '1', '2': '2', '3': '3', '4': '4' };

  function setScreen(n) {
    const value = String(n);
    body.setAttribute('data-screen', value);
    buttons.forEach(btn => {
      btn.setAttribute('aria-pressed', btn.dataset.screenBtn === value ? 'true' : 'false');
    });
    // Restart the fade-in so every switch feels deliberate
    const active = document.querySelector('.screen--' + value);
    if (active) {
      active.querySelectorAll(':scope > *').forEach(el => {
        el.style.animation = 'none';
        el.getBoundingClientRect();
        el.style.animation = '';
      });
    }
  }

  buttons.forEach(btn => btn.addEventListener('click', () => setScreen(btn.dataset.screenBtn)));
  window.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (KEY_TO_SCREEN[e.key]) setScreen(KEY_TO_SCREEN[e.key]);
    if (e.key === 'ArrowRight') setScreen(Math.min(4, Number(body.dataset.screen || '1') + 1));
    if (e.key === 'ArrowLeft')  setScreen(Math.max(1, Number(body.dataset.screen || '1') - 1));
  });
})();
