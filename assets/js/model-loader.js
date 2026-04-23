(function () {
  'use strict';

  var MIN_MS  = 300;
  var FADE_MS = 400;

  function makeOverlay() {
    var el = document.createElement('div');
    el.className = 'mv-loader';
    el.innerHTML =
      '<div class="mv-loader__spinner"></div>' +
      '<div class="mv-loader__progress-wrap"><div class="mv-loader__progress-bar"></div></div>' +
      '<div class="mv-loader__text">YÜKLENİYOR</div>' +
      '<div class="mv-loader__error" hidden>Model yüklenemedi</div>';
    return el;
  }

  function attach(mv) {
    if (mv._mvLoaderAttached) return;
    mv._mvLoaderAttached = true;

    var wrap = mv.parentElement;
    if (!wrap) return;
    wrap.classList.add('mv-loader-wrap');

    var overlay = makeOverlay();
    wrap.appendChild(overlay);
    var t0 = Date.now();

    function hideOverlay() {
      var delay = Math.max(0, MIN_MS - (Date.now() - t0));
      setTimeout(function () {
        overlay.classList.add('mv-loader--hiding');
        setTimeout(function () {
          overlay.classList.add('mv-loader--hidden');
        }, FADE_MS);
      }, delay);
    }

    mv.addEventListener('load', hideOverlay, { once: true });

    mv.addEventListener('progress', function (e) {
      if (!e.detail || e.detail.totalProgress == null) return;
      var bar = overlay.querySelector('.mv-loader__progress-bar');
      if (bar) bar.style.width = (e.detail.totalProgress * 100).toFixed(0) + '%';
    });

    mv.addEventListener('error', function () {
      overlay.querySelector('.mv-loader__text').hidden         = true;
      overlay.querySelector('.mv-loader__spinner').hidden      = true;
      overlay.querySelector('.mv-loader__progress-wrap').hidden = true;
      overlay.querySelector('.mv-loader__error').hidden        = false;
    }, { once: true });
  }

  function initAll() {
    document.querySelectorAll('model-viewer').forEach(attach);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }

  // Dinamik eklenen model-viewer'ları yakala (ürün kartları)
  document.addEventListener('DOMContentLoaded', function () {
    new MutationObserver(function (mutations) {
      mutations.forEach(function (m) {
        m.addedNodes.forEach(function (node) {
          if (node.nodeType !== 1) return;
          if (node.tagName === 'MODEL-VIEWER') {
            attach(node);
          } else if (node.querySelectorAll) {
            node.querySelectorAll('model-viewer').forEach(attach);
          }
        });
      });
    }).observe(document.body, { childList: true, subtree: true });
  });
})();
