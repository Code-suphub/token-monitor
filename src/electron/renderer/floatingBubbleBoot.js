'use strict';

(() => {
  const query = new URLSearchParams(window.location.search);
  const side = query.get('floatingBubbleSide');
  if (['left', 'right'].includes(side)) {
    document.documentElement.classList.add(`floating-bubble-collapsed-${side}`);
    window.__TOKEN_MONITOR_INITIAL_FLOATING_BUBBLE__ = { collapsed: true, side };
  }
  window.__TOKEN_MONITOR_SUPPRESS_INITIAL_NUMBER_ANIMATION__ =
    query.get('suppressInitialNumberAnimation') === '1';
})();
