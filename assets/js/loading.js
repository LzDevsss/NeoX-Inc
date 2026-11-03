/* Segurança: se algo falhar, o loading nunca fica preso. */
  document.documentElement.classList.add('is-loading');
  document.body.setAttribute('aria-busy', 'true');
  window.setTimeout(function () {
    var l = document.getElementById('site-loader');
    if (l && !l.classList.contains('is-done')) {
      l.classList.add('is-done');
      document.documentElement.classList.remove('is-loading');
      document.body.removeAttribute('aria-busy');
    }
  }, 5000);
  (function () { var l = document.getElementById('gf'); if (!l) return; var on = function () { l.media = 'all'; }; if (l.sheet) on(); else l.addEventListener('load', on); setTimeout(on, 3000); })();
