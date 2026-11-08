/*
 * paint-scroll-transition.js - 油画卷轴跳转过渡
 *
 * 点击站内链接后，一幅油画从顶部卷轴展开铺满全屏，遮住 PJAX 换页的那一瞬，
 * 再向上收起露出新页面。挂在 document.body 上（PJAX 只换 #body-wrap 等区域，
 * body 不换，所以遮罩能存活）。
 *
 * 配图见 themes/butterfly/source/css/transition.css
 * 图片由 tools/build-transition-art.py 从 source/img/art/ 裁切压缩生成。
 */
(function () {
  'use strict'
  if (window.__scrollTransitionInit) return
  window.__scrollTransitionInit = true

  // 原作最大 1280 宽，已统一裁成 16:9 并压成 640 / 1280 两档
  var WORKS = [
    { slug: 'monet-water-lilies', title: '睡莲', artist: '克劳德·莫奈', meta: 'Water Lilies · 1914–1926' },
    { slug: 'vangogh-starry-night', title: '星夜', artist: '文森特·梵高', meta: 'The Starry Night · 1889' },
    { slug: 'monet-impression-sunrise', title: '日出·印象', artist: '克劳德·莫奈', meta: 'Impression, Sunrise · 1872' },
    { slug: 'vangogh-poppy-field', title: '罂粟田', artist: '文森特·梵高', meta: 'Poppy Field · 1890' },
    { slug: 'vangogh-garden-arles', title: '阿尔勒的花园', artist: '文森特·梵高', meta: 'Garden at Arles · 1888' }
  ]

  var MOBILE_QUERY = '(max-width: 768px)'
  // 铺满之后还要停留多久。太短会让人以为没动画
  var MIN_HOLD_MS = 220
  var MAX_COVER_MS = 2500  // 兜底：PJAX 事件丢失、或 transition.css 没加载时强制收起
  var CLEANUP_MS = 480     // 收起动画走完再摘类

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  var mobileMQ = window.matchMedia && window.matchMedia(MOBILE_QUERY)

  var el = null
  var covering = false
  var revealing = false
  var coverAt = 0
  var coverReadyAt = 0      // 画布真正铺满的时刻，0 = 还没铺满
  var revealTimer = null
  var cleanupTimer = null
  var safetyTimer = null
  var skipNext = false
  var skipTimer = null

  // ==================== 选画：洗牌袋，5 幅轮转不重复 ====================
  var bag = []
  var lastIndex = -1

  function refill () {
    for (var k = 0; k < WORKS.length; k++) bag.push(k)
    for (var i = bag.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1))
      var t = bag[i]; bag[i] = bag[j]; bag[j] = t
    }
    // 重新洗牌时避免和上一幅撞车
    if (bag.length > 1 && bag[0] === lastIndex) { var x = bag[0]; bag[0] = bag[1]; bag[1] = x }
  }

  function draw () {
    if (!bag.length) refill()
    lastIndex = bag.shift()
    return WORKS[lastIndex]
  }

  function artUrl (work) {
    var tier = mobileMQ && mobileMQ.matches ? '640' : '1280'
    return '/img/art/transition/' + work.slug + '-' + tier + '.jpg'
  }

  function idle (fn) {
    if (window.requestIdleCallback) window.requestIdleCallback(fn, { timeout: 3000 })
    else setTimeout(fn, 1200)
  }

  // 只预热下一幅，闲时一次一张
  var preloaded = {}
  function preloadNext () {
    if (reduceMotion || !bag.length) return
    var url = artUrl(WORKS[bag[0]])
    if (preloaded[url]) return
    preloaded[url] = true
    var img = new Image()
    img.src = url
  }

  // ==================== DOM ====================
  function ensure () {
    if (el && document.body.contains(el)) return el
    el = document.createElement('div')
    el.className = 'scroll-transition'
    el.setAttribute('aria-hidden', 'true')
    el.innerHTML =
      '<div class="st-sheet">' +
        '<div class="st-art"></div>' +
        '<div class="st-grain"></div>' +
        '<div class="st-vignette"></div>' +
        '<div class="st-caption">' +
          '<span class="st-title"></span>' +
          '<span class="st-artist"></span>' +
          '<span class="st-meta"></span>' +
        '</div>' +
      '</div>' +
      '<div class="st-veil"></div>' +
      '<div class="st-roller st-roller-top"></div>' +
      '<div class="st-roller st-roller-bottom"></div>'
    document.body.appendChild(el)
    return el
  }

  // ==================== 展开 / 收起 ====================
  function show () {
    if (covering || reduceMotion) return

    var work = draw()
    var node = ensure()

    node.querySelector('.st-art').style.backgroundImage = 'url("' + artUrl(work) + '")'
    node.querySelector('.st-title').textContent = work.title
    node.querySelector('.st-artist').textContent = work.artist
    node.querySelector('.st-meta').textContent = work.meta

    // 底轴行程 = 遮罩实际高度 - 轴高。
    // 用遮罩自身的高度而不是 innerHeight：移动端地址栏收起时视觉视口和
    // innerHeight 会对不上，而遮罩是 position:fixed，只认视觉视口。
    node.style.setProperty('--st-travel', (node.clientHeight - 14) + 'px')

    node.classList.remove('st-rolling', 'st-unveiling')
    node.classList.add('st-veiling', 'st-unrolling')
    node.style.pointerEvents = 'auto'   // 遮住的这几百毫秒里挡住误触

    void node.offsetWidth              // 强制回流，保证连续点击时动画能重放
    covering = true
    revealing = false
    coverAt = Date.now()
    coverReadyAt = 0

    // 以展开动画真正跑完的时刻为基准计驻留，别和 transition.css 的时长硬对齐
    var sheet = node.querySelector('.st-sheet')
    var onUnrolled = function (e) {
      if (e.animationName !== 'st-unroll') return
      coverReadyAt = Date.now()
      sheet.removeEventListener('animationend', onUnrolled)
    }
    sheet.addEventListener('animationend', onUnrolled)

    preloadNext()
    clearTimeout(safetyTimer)
    safetyTimer = setTimeout(hide, MAX_COVER_MS)
  }

  function hide () {
    // pjax:complete 和 pjax:end 会连着触发两次，不挡住的话收起动画会被重置重放
    if (!covering || revealing) return
    revealing = true
    clearTimeout(safetyTimer)
    clearTimeout(revealTimer)

    var node = ensure()
    var sheet = node.querySelector('.st-sheet')

    function startRollup () {
      clearTimeout(revealTimer)
      var hold = Math.max(0, MIN_HOLD_MS - (Date.now() - coverReadyAt))
      revealTimer = setTimeout(function () {
        node.classList.remove('st-veiling', 'st-unrolling')
        void node.offsetWidth
        node.classList.add('st-unveiling', 'st-rolling')
        node.style.pointerEvents = 'none'

        clearTimeout(cleanupTimer)
        cleanupTimer = setTimeout(function () {
          node.classList.remove('st-rolling', 'st-unveiling')
          covering = false
          revealing = false
        }, CLEANUP_MS)
      }, hold)
    }

    if (coverReadyAt) {
      // 展开已经跑完，直接算驻留时间
      startRollup()
    } else {
      // 展开还没铺满，必须等它走完再收，绝不在半路折回去。
      // 万一 transition.css 没加载、animationend 永远不来，靠兜底计时器收场。
      var onEnd = function (e) {
        if (e.animationName !== 'st-unroll') return
        sheet.removeEventListener('animationend', onEnd)
        clearTimeout(fallbackTimer)
        coverReadyAt = Date.now()
        startRollup()
      }
      var fallbackTimer = setTimeout(function () {
        sheet.removeEventListener('animationend', onEnd)
        coverReadyAt = Date.now()
        startRollup()
      }, MAX_COVER_MS)
      sheet.addEventListener('animationend', onEnd)
    }
  }

  // ==================== 跳过条件 ====================
  function parseHref (href) {
    try { return new URL(href, location.href) } catch (e) { return null }
  }
  function normPath (u) { return u ? u.pathname.replace(/\/+$/, '') || '/' : '' }

  function shouldSkip (e, a) {
    if (e.defaultPrevented) return true
    if (typeof e.button === 'number' && e.button !== 0) return true          // 中键 / 右键
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return true         // 新标签页打开
    var t = a.getAttribute('target')
    if (t && t !== '_self') return true
    if (a.hasAttribute('download')) return true
    if (a.hasAttribute('data-no-transition')) return true

    var href = a.getAttribute('href')
    if (!href || href.charAt(0) === '#') return true
    var u = parseHref(href)
    if (!u || u.origin !== location.origin) return true
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return true
    if (normPath(u) === normPath(location)) return true                      // 当前页
    return false
  }

  // ==================== 事件绑定 ====================
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[href]') : null
    if (!a) return
    if (reduceMotion) return

    if (shouldSkip(e, a)) {
      // 同页内跳转也走一遍：Pace 不重启，但遮罩不能跟着闪
      var u0 = parseHref(a.getAttribute('href'))
      if (u0 && normPath(u0) === normPath(location)) {
        skipNext = true
        clearTimeout(skipTimer)
        skipTimer = setTimeout(function () { skipNext = false }, 600)
      }
      return
    }

    skipNext = false
  }, true)

  document.addEventListener('pjax:send', function () {
    if (skipNext) {
      skipNext = false
      clearTimeout(skipTimer)
      return
    }
    show()
  })

  document.addEventListener('pjax:complete', hide)
  document.addEventListener('pjax:end', hide)
  document.addEventListener('pjax:error', hide)

  // 整页刷新（非 PJAX）时遮罩随文档一起消失；bfcache 回退时把状态清干净
  window.addEventListener('pageshow', function (e) {
    if (!e.persisted) return
    clearTimeout(safetyTimer)
    clearTimeout(revealTimer)
    clearTimeout(cleanupTimer)
    if (el) {
      el.classList.remove('st-unrolling', 'st-rolling', 'st-veiling', 'st-unveiling')
      el.style.pointerEvents = 'none'
    }
    covering = false
    revealing = false
    coverReadyAt = 0
  })

  // 视口尺寸变了，下一次展开的轴行程要重算。
  // visualViewport 才能覆盖移动端地址栏收放（光看 resize 不够）
  function syncTravel () {
    if (el) el.style.setProperty('--st-travel', (el.clientHeight - 14) + 'px')
  }
  window.addEventListener('resize', syncTravel, { passive: true })
  if (window.visualViewport) window.visualViewport.addEventListener('resize', syncTravel, { passive: true })

  if (mobileMQ && mobileMQ.addEventListener) {
    mobileMQ.addEventListener('change', function () { idle(preloadNext) })
  }

  refill()          // 先把袋填上，下面这行闲时预加载才有东西可预热
  idle(preloadNext)
})()