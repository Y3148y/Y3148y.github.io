/* 全站底部悬浮播放器（原生 <audio> + 自绘简约条，不依赖 APlayer）
 * 数据源：/music/music.json（与歌单页共用）
 * 特性：底部常驻、音量记忆、进站静音自动播放、点音量图标手动解除静音、翻页自动恢复曲目/进度/音量/静音状态
 */
;(function () {
  'use strict'
  if (window.__gpInit) return
  window.__gpInit = true

  var VOL_KEY = 'mq_v2_volume'
  var state = {
    list: [],
    index: 0,
    ready: false,
    volume: 0.7
  }

  var audio = null
  var els = {}

  function safeGet (key, def) {
    try {
      var v = parseFloat(localStorage.getItem(key))
      if (isNaN(v)) return def
      return v
    } catch (e) { return def }
  }

  function safeSet (key, v) {
    try { localStorage.setItem(key, String(v)) } catch (e) {}
  }

  var SESS_KEY = 'mq_sess'

  function readSess () {
    try {
      var raw = sessionStorage.getItem(SESS_KEY)
      if (!raw) return null
      var s = JSON.parse(raw)
      if (!s || typeof s.i !== 'number') return null
      return s
    } catch (e) { return null }
  }

  function saveSess () {
    if (!audio) return
    try {
      sessionStorage.setItem(SESS_KEY, JSON.stringify({
        i: state.index,
        t: isNaN(audio.currentTime) ? 0 : audio.currentTime,
        m: audio.muted,
        p: audio.paused
      }))
    } catch (e) {}
  }

  function fmt (sec) {
    if (isNaN(sec) || !isFinite(sec)) return '0:00'
    sec = Math.max(0, Math.floor(sec))
    var m = Math.floor(sec / 60)
    var s = sec % 60
    return m + ':' + (s < 10 ? '0' : '') + s
  }

  function esc (t) {
    return String(t == null ? '' : t)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  }

  function createAudio () {
    audio = document.createElement('audio')
    audio.preload = 'none'
    audio.style.cssText = 'position:absolute;width:1px;height:1px;opacity:0;left:-9999px;top:0'
    document.body.appendChild(audio)

    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('volumechange', onVolume)
    audio.addEventListener('error', function () {
      setText('无法播放，可能链接失效')
    })
  }

  function buildBar () {
    var bar = document.createElement('div')
    bar.id = 'gp-player'
    bar.className = 'gp-player'
    bar.innerHTML =
      '<div class="gp-text" id="gp-text"><span class="gp-title" id="gp-title">未播放</span><span class="gp-artist" id="gp-artist"></span></div>' +
      '  <div class="gp-controls">' +
      '    <button class="gp-btn" id="gp-prev" title="上一首"><i class="fas fa-step-backward"></i></button>' +
      '    <button class="gp-btn gp-play" id="gp-play" title="播放 / 暂停"><i class="fas fa-play" id="gp-play-icon"></i></button>' +
      '    <button class="gp-btn" id="gp-next" title="下一首"><i class="fas fa-step-forward"></i></button>' +
      '    <div class="gp-volwrap" id="gp-volwrap">' +
      '      <button class="gp-btn gp-vol" id="gp-vol" title="音量"><i class="fas fa-volume-up" id="gp-vol-icon"></i></button>' +
      '      <div class="gp-volpop" id="gp-volpop">' +
      '        <div class="gp-volbar" id="gp-volbar"><div class="gp-volfill" id="gp-volfill"></div></div>' +
      '        <span class="gp-volnum" id="gp-volnum">70%</span>' +
      '      </div>' +
      '    </div>' +
      '  </div>'
    document.body.appendChild(bar)
    els = {
      player: bar,
      title: bar.querySelector('#gp-title'),
      artist: bar.querySelector('#gp-artist'),
      text: bar.querySelector('#gp-text'),
      playBtn: bar.querySelector('#gp-play'),
      playIcon: bar.querySelector('#gp-play-icon'),
      volwrap: bar.querySelector('#gp-volwrap'),
      volIcon: bar.querySelector('#gp-vol-icon'),
      volpop: bar.querySelector('#gp-volpop'),
      volbar: bar.querySelector('#gp-volbar'),
      volfill: bar.querySelector('#gp-volfill'),
      volnum: bar.querySelector('#gp-volnum')
    }
  }

  function setText (msg) {
    els.title.textContent = msg
    els.artist.textContent = ''
  }

  function current () {
    return state.list[state.index]
  }

  function loadTrack () {
    var track = current()
    if (!track) return
    els.title.textContent = track.name || '未命名'
    els.artist.textContent = track.artist || ''
    audio.src = track.url
    audio.load()
    document.title = (track.name || '') + ' - ' + (track.artist || '') + ' - 听雨'
    document.dispatchEvent(new CustomEvent('globalTrackChange', { detail: { index: state.index } }))
  }

  function playIndex (i) {
    if (!state.ready) return false
    if (typeof i === 'number' && i >= 0 && i < state.list.length) state.index = i
    if (!current()) return false
    loadTrack()
    audio.play().catch(function () {})
    saveSess()
    return true
  }

  function toggle () {
    if (!state.ready) return
    if (!audio.src) { playIndex(state.index); return }
    if (audio.paused) audio.play().catch(function () {})
    else audio.pause()
  }

  function nextTrack () {
    if (!state.list.length) return
    state.index = (state.index + 1) % state.list.length
    playIndex(state.index)
  }

  function prevTrack () {
    if (!state.list.length) return
    if (audio.currentTime > 3) { audio.currentTime = 0; return }
    state.index = (state.index - 1 + state.list.length) % state.list.length
    playIndex(state.index)
  }

  function onPlay () {
    els.playIcon.className = 'fas fa-pause'
    saveSess()
  }

  function onPause () {
    els.playIcon.className = 'fas fa-play'
    saveSess()
  }

  function onEnded () {
    nextTrack()
  }

  function onVolume () {
    state.volume = audio.volume
    safeSet(VOL_KEY, audio.volume)
    var pct = Math.round(audio.volume * 100)
    els.volfill.style.height = pct + '%'
    els.volnum.textContent = pct + '%'
    els.volIcon.className = audio.muted || audio.volume === 0 ? 'fa-solid fa-volume-mute' : 'fas fa-volume-up'
    if (state.ready) saveSess()
  }

  function setVolume (v) {
    v = Math.max(0, Math.min(1, v))
    audio.volume = v
    audio.muted = v === 0
    onVolume()
  }

  function unmute () {
    if (!audio.muted) return
    audio.muted = false
    if (audio.volume === 0) setVolume(0.7)
    else onVolume()
  }

  function bindEvents () {
    els.volbar.addEventListener('click', function (e) {
      var r = els.volbar.getBoundingClientRect()
      var pct = 1 - (e.clientY - r.top) / r.height
      setVolume(pct)
    })

    els.volwrap.addEventListener('mouseenter', function () {
      els.volpop.classList.add('open')
    })
    els.volwrap.addEventListener('mouseleave', function () {
      els.volpop.classList.remove('open')
    })
    document.getElementById('gp-play').addEventListener('click', toggle)
    document.getElementById('gp-next').addEventListener('click', nextTrack)
    document.getElementById('gp-prev').addEventListener('click', prevTrack)

    var volBtn = document.getElementById('gp-vol')
    volBtn.addEventListener('click', function (e) {
      e.stopPropagation()
      if (audio.muted) {
        unmute()
        els.volpop.classList.add('open')
      } else {
        audio.muted = true
        onVolume()
        els.volpop.classList.remove('open')
      }
    })
    els.volwrap.addEventListener('wheel', function (e) {
      e.preventDefault()
      var d = e.deltaY > 0 ? -0.05 : 0.05
      setVolume(Math.round((audio.volume + d) * 100) / 100)
    }, { passive: false })

    document.addEventListener('click', function (e) {
      if (!els.volwrap.contains(e.target)) els.volpop.classList.remove('open')
    })
  }

  function tryAutoplay () {
    /* 浏览器若因自动播放策略拦截带声音播放 → 静音兜底，等用户点音量键 */
    audio.play().catch(function () {
      if (audio.muted) return
      audio.muted = true
      onVolume()
      audio.play().catch(function () {})
    })
  }

  function restoreSeek (t) {
    if (!t || t <= 0) return
    var done = function () {
      try { audio.currentTime = t } catch (e) {}
      audio.removeEventListener('loadedmetadata', done)
    }
    audio.addEventListener('loadedmetadata', done)
    try { audio.currentTime = t } catch (e) {}
  }

  function boot () {
    if (!state.ready || !state.list.length) return
    var sess = readSess()
    if (sess) {
      state.index = Math.max(0, Math.min(sess.i || 0, state.list.length - 1))
      audio.muted = typeof sess.m === 'boolean' ? sess.m : true
      loadTrack()
      onVolume()
      if (sess.p) {
        restoreSeek(sess.t)
        els.playIcon.className = 'fas fa-play'
        return
      }
      restoreSeek(sess.t)
      tryAutoplay()
      return
    }
    /* 首次进站：静音自动播放第一首，用户点音量键开启声音 */
    audio.muted = true
    playIndex(0)
    onVolume()
  }

  function init () {
    createAudio()
    buildBar()
    state.volume = safeGet(VOL_KEY, 0.7)
    audio.volume = state.volume
    audio.muted = true
    onVolume()
    bindEvents()

    fetch('/music/music.json')
      .then(function (res) { return res.json() })
      .then(function (data) {
        var list = (data && data.songs) || data || []
        if (!list.length) return
        state.list = list
        state.ready = true

        window.GlobalPlayer = {
          ready: true,
          play: playIndex,
          toggle: toggle,
          pause: function () { if (audio) audio.pause() },
          next: nextTrack,
          prev: prevTrack,
          getIndex: function () { return state.index },
          getList: function () { return state.list.slice() }
        }
        document.dispatchEvent(new CustomEvent('globalMusicReady'))
        boot()
      })
      .catch(function (e) { console.error('music.json 加载失败：', e) })
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})()