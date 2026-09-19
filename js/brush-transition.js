/*
 * brush-transition.js - Oil brush stroke page transitions (v2)
 * Warm radial glow expanding from click point with brush texture overlay
 */
;(function () {
  'use strict'
  if (window.__brushInit) return
  window.__brushInit = true

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  var MIN_SHOW = 480
  var HIDE_DELAY = 420
  var overlay = null
  var covering = false
  var coverAt = 0
  var revealTimer = null
  var hideTimer = null
  var skipTimer = null
  var skipNext = false
  var lastX = window.innerWidth / 2
  var lastY = window.innerHeight / 2

  function ensureOverlay () {
    if (overlay && document.body.contains(overlay)) return overlay
    overlay = document.createElement('div')
    overlay.className = 'brush-overlay'
    overlay.setAttribute('aria-hidden', 'true')
    overlay.innerHTML =
      '<div class="brush-glow"></div>' +
      '<canvas class="brush-texture"></canvas>'
    document.body.appendChild(overlay)
    return overlay
  }

  function parseHref (href) {
    try { return new URL(href, location.href) } catch (e) { return null }
  }
  function normPath (u) { return u ? u.pathname.replace(/\/+$/, '') || '/' : '' }
  function isSamePath (u) { return u && normPath(u) === normPath(location) }

  // Draw subtle brush strokes on canvas for texture
  function drawBrushTexture (x, y) {
    var el = ensureOverlay()
    var cvs = el.querySelector('.brush-texture')
    if (!cvs) return
    cvs.width = window.innerWidth
    cvs.height = window.innerHeight
    var ctx = cvs.getContext('2d')
    ctx.clearRect(0, 0, cvs.width, cvs.height)

    var count = 8 + Math.floor(Math.random() * 5)
    for (var i = 0; i < count; i++) {
      var angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.4
      var len = 100 + Math.random() * 250
      var w = 2 + Math.random() * 4
      var ex = x + Math.cos(angle) * len
      var ey = y + Math.sin(angle) * len

      ctx.save()
      ctx.globalAlpha = 0.15 + Math.random() * 0.15
      ctx.strokeStyle = 'rgba(200, 170, 120, 0.6)'
      ctx.lineWidth = w
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(x + (Math.random() - 0.5) * 20, y + (Math.random() - 0.5) * 20)
      // Slightly curved stroke
      var cpx = (x + ex) / 2 + (Math.random() - 0.5) * 40
      var cpy = (y + ey) / 2 + (Math.random() - 0.5) * 40
      ctx.quadraticCurveTo(cpx, cpy, ex, ey)
      ctx.stroke()
      ctx.restore()
    }
  }

  function show (x, y) {
    if (reduceMotion || covering) return
    covering = true
    coverAt = Date.now()
    lastX = x
    lastY = y

    var el = ensureOverlay()
    var glow = el.querySelector('.brush-glow')

    // Set glow origin to click position
    glow.style.background = 'radial-gradient(circle at ' + x + 'px ' + y + 'px, rgba(26, 18, 10, 0.95), rgba(35, 25, 15, 0.88) 30%, rgba(45, 32, 18, 0.6) 55%, transparent 75%)'

    el.classList.remove('brush-reveal')
    el.classList.add('brush-active')
    void el.offsetWidth
    el.classList.add('brush-cover')

    // Draw brush texture
    drawBrushTexture(x, y)
  }

  function hide () {
    if (reduceMotion) { covering = false; return }
    if (!covering) return
    var el = ensureOverlay()
    var wait = Math.max(0, MIN_SHOW - (Date.now() - coverAt))
    clearTimeout(revealTimer)
    revealTimer = setTimeout(function () {
      el.classList.remove('brush-cover')
      el.classList.add('brush-reveal')
      clearTimeout(hideTimer)
      hideTimer = setTimeout(function () {
        el.classList.remove('brush-active', 'brush-reveal')
        covering = false
      }, HIDE_DELAY)
    }, wait)
  }

  // Record click position
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[href]') : null
    if (!a) return
    if (a.target && a.target !== '' && a.target !== '_self') return
    if (a.hasAttribute('download')) return
    var href = a.getAttribute('href')
    if (!href || href.charAt(0) === '#') return
    var u = parseHref(href)
    if (!u || u.origin !== location.origin) return
    if (isSamePath(u)) {
      clearTimeout(skipTimer)
      skipNext = true
      skipTimer = setTimeout(function () { skipNext = false }, 600)
      return
    }
    skipNext = false
    lastX = e.clientX
    lastY = e.clientY
  }, true)

  document.addEventListener('pjax:send', function () {
    if (skipNext) { skipNext = false; clearTimeout(skipTimer); return }
    show(lastX, lastY)
  })

  document.addEventListener('pjax:complete', hide)
  document.addEventListener('pjax:end', hide)

  window.addEventListener('pageshow', function (e) {
    if (e.persisted && overlay) {
      overlay.classList.remove('brush-active', 'brush-cover', 'brush-reveal')
      covering = false
    }
  })
})()
