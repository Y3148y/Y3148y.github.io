/*
 * painting-engine.js - AI Oil Painting + Naked-eye 3D Engine
 * Full-site: art cards, post covers, page headers
 */
;(function () {
  'use strict'
  if (window.__paintInit) return
  window.__paintInit = true

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  var isMobile = window.innerWidth < 768 || (navigator.maxTouchPoints && navigator.maxTouchPoints > 2)
  var mx = 0, my = 0
  var rafId = null
  var targets = []
  var oilTargets = []
  var breathTime = 0

  // ======================== Mouse Tracker ========================
  function onMove (e) {
    var x = e.clientX || (e.touches && e.touches[0] && e.touches[0].clientX) || window.innerWidth / 2
    var y = e.clientY || (e.touches && e.touches[0] && e.touches[0].clientY) || window.innerHeight / 2
    mx = (x / window.innerWidth) * 2 - 1
    my = (y / window.innerHeight) * 2 - 1
    document.documentElement.style.setProperty('--paint-mx', mx.toFixed(4))
    document.documentElement.style.setProperty('--paint-my', my.toFixed(4))
  }

  if (!isMobile) {
    document.addEventListener('mousemove', onMove, { passive: true })
  } else {
    document.addEventListener('touchmove', onMove, { passive: true })
    if (window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientation', function (e) {
        if (e.gamma != null && e.beta != null) {
          mx = Math.max(-1, Math.min(1, e.gamma / 45))
          my = Math.max(-1, Math.min(1, (e.beta - 45) / 45))
          document.documentElement.style.setProperty('--paint-mx', mx.toFixed(4))
          document.documentElement.style.setProperty('--paint-my', my.toFixed(4))
        }
      }, { passive: true })
    }
  }

  // ======================== 3D Depth Parallax ========================
  function wrapDepthLayer (img, depth) {
    if (img.parentElement && img.parentElement.classList.contains('depth-layer')) return
    depth = depth || 1.0
    var wrap = document.createElement('div')
    wrap.className = 'depth-layer'
    img.parentNode.insertBefore(wrap, img)
    wrap.appendChild(img)
    img.style.position = 'relative'
    img.style.zIndex = '2'
    targets.push({ el: img, depth: depth, ox: 0, oy: 0 })
  }

  function updateParallax () {
    if (reduceMotion || isMobile) return
    for (var i = 0; i < targets.length; i++) {
      var t = targets[i]
      var tx = mx * 30 * t.depth
      var ty = my * 20 * t.depth
      t.ox += (tx - t.ox) * 0.12
      t.oy += (ty - t.oy) * 0.12
      t.el.style.transform = 'translate3d(' + t.ox.toFixed(2) + 'px,' + t.oy.toFixed(2) + 'px,0) scale(1.03)'
    }
  }

  // ======================== Oil Painting Canvas ========================
  function getOilSrc (img) {
    var src = img.getAttribute('src') || ''
    if (!src || src.indexOf('data:') === 0) return null
    var oilAttr = img.getAttribute('data-oil')
    if (oilAttr) return oilAttr
    if (src.indexOf('/img/art/') !== -1) {
      return src.replace('/img/art/', '/img/art/oil/').replace(/\.(jpg|jpeg|png|webp)$/i, '.jpg')
    }
    return null
  }

  function createOilCanvas (img) {
    var oilSrc = getOilSrc(img)
    if (!oilSrc) return
    var canvas = document.createElement('canvas')
    canvas.className = 'oil-canvas'
    canvas.setAttribute('aria-hidden', 'true')
    var wrap = img.closest('.art-card-thumb') || img.closest('.depth-layer') || img.closest('.post_cover') || img.parentElement
    if (!wrap) return
    wrap.style.position = 'relative'
    wrap.appendChild(canvas)
    oilTargets.push({ el: img, canvas: canvas, oilSrc: oilSrc, loaded: false, breathPhase: Math.random() * Math.PI * 2 })
  }

  function loadOilTexture (entry) {
    if (entry.loaded) return
    var img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = function () {
      var c = entry.canvas
      c.width = entry.el.naturalWidth || 800
      c.height = entry.el.naturalHeight || 600
      var ctx = c.getContext('2d')
      ctx.drawImage(img, 0, 0, c.width, c.height)
      entry.loaded = true
      requestAnimationFrame(function () { c.style.opacity = '0.55' })
    }
    img.onerror = function () { entry.canvas.style.display = 'none' }
    img.src = entry.oilSrc
  }

  function updateOilEffects () {
    breathTime += 0.015
    for (var i = 0; i < oilTargets.length; i++) {
      var t = oilTargets[i]
      if (!t.loaded && isInViewport(t.el)) loadOilTexture(t)
      if (t.loaded) {
        var breath = Math.sin(breathTime + t.breathPhase) * 0.015 + 1.0
        t.el.style.transform = (t.el.style.transform || '').replace(/scale\([^)]*\)/, '') + ' scale(' + breath.toFixed(4) + ')'
      }
    }
  }

  function isInViewport (el) {
    var r = el.getBoundingClientRect()
    return r.bottom > -200 && r.top < window.innerHeight + 200
  }

  // ======================== Scroll Entrance ========================
  function initScrollReveal () {
    if (typeof IntersectionObserver === 'undefined') {
      document.querySelectorAll('.paint-wait').forEach(function (el) { el.classList.add('paint-reveal') })
      return
    }
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add('paint-reveal'); observer.unobserve(entry.target) }
      })
    }, { threshold: 0.05, rootMargin: '50px 0px 0px 0px' })
    document.querySelectorAll('.art-card, .recent-post-item, .post-card').forEach(function (card) {
      if (!card.classList.contains('paint-wait')) { card.classList.add('paint-wait'); observer.observe(card) }
    })
    setTimeout(function () {
      document.querySelectorAll('.paint-wait:not(.paint-reveal)').forEach(function (el) {
        var r = el.getBoundingClientRect()
        if (r.top < window.innerHeight + 50 && r.bottom > -50) el.classList.add('paint-reveal')
      })
    }, 100)
  }

  // ======================== RAF Loop ========================
  function tick () {
    updateParallax()
    updateOilEffects()
    rafId = requestAnimationFrame(tick)
  }

  // ======================== Init ========================
  function init () {
    targets = []
    oilTargets = []

    document.querySelectorAll('.art-card-thumb img').forEach(function (img) {
      wrapDepthLayer(img, 1.0)
      createOilCanvas(img)
      function checkFit () {
        if (!img.naturalWidth) return
        var cardRatio = 3 / 2
        var imgRatio = img.naturalWidth / img.naturalHeight
        img.style.objectFit = imgRatio > cardRatio * 1.3 ? 'contain' : 'cover'
      }
      img.addEventListener('load', checkFit)
      if (img.complete) checkFit()
    })

    document.querySelectorAll('.post_cover img').forEach(function (img) { wrapDepthLayer(img, 0.6) })
    document.querySelectorAll('#page-header .banner-img, #page-header img').forEach(function (img) { wrapDepthLayer(img, 0.4) })

    initScrollReveal()

    if (!reduceMotion && !isMobile) {
      if (rafId) cancelAnimationFrame(rafId)
      tick()
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }

  document.addEventListener('pjax:complete', function () {
    setTimeout(init, 100)
  })
})()
