(function () {
  if (window.top === window.self) {
    var s = document.getElementById('anti-frame');
    if (s && s.parentNode) s.parentNode.removeChild(s);
  } else {
    try { window.top.location = window.self.location; } catch (e) { /* bloqueado: o site continua oculto */ }
  }
})();
