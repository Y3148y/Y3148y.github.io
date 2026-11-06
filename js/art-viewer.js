/* 鐢诲唽楂樻竻澶у浘鏌ョ湅鍣細鐐瑰嚮 .art-card-thumb 鐨勫浘鐗囧脊鍑哄師鍥撅紝鍙殢 PJAX 缈婚〉鐢熸晥 */
(function () {
  function bindEsc (viewer, close) {
    var esc = function (e) { if (e.key === 'Escape') close() }
    document.addEventListener('keydown', esc)
    viewer._esc = esc
  }

  function open (img) {
    var src = img.getAttribute('src') || img.currentSrc || ''
    if (!src) return
    var old = document.querySelector('.art-viewer')
    if (old) { old.remove(); document.body.classList.remove('artview-lock') }

    var v = document.createElement('div')
    v.className = 'art-viewer'
    v.innerHTML = '<div class="art-viewer-body"><img class="art-viewer-img" alt="" /></div>' +
      '<div class="art-viewer-caption">' +
      '<div class="art-viewer-caption-title"></div>' +
      '<div class="art-viewer-caption-meta"></div>' +
      '<div class="art-viewer-caption-desc"></div>' +
      '</div>' +
      '<button class="art-viewer-close" type="button" aria-label="close"></button>'

    var imgEl = v.querySelector('.art-viewer-img')
    imgEl.src = src
    imgEl.alt = img.getAttribute('alt') || ''

    var caption = v.querySelector('.art-viewer-caption')
    var titleEl = caption.querySelector('.art-viewer-caption-title')
    var metaEl = caption.querySelector('.art-viewer-caption-meta')
    var descEl = caption.querySelector('.art-viewer-caption-desc')
    titleEl.textContent = img.getAttribute('data-title') || img.alt
    if (!img.getAttribute('data-meta')) metaEl.classList.add('art-viewer-empty')
    else metaEl.textContent = img.getAttribute('data-meta')
    if (!img.getAttribute('data-desc')) descEl.classList.add('art-viewer-empty')
    else descEl.textContent = img.getAttribute('data-desc')

    document.body.appendChild(v)
    document.body.classList.add('artview-lock')
    requestAnimationFrame(function () { v.classList.add('artview-open') })

    var close = function () {
      document.removeEventListener('keydown', v._esc)
      v.classList.remove('artview-open')
      document.body.classList.remove('artview-lock')
      setTimeout(function () { v.remove() }, 200)
    }

    v.addEventListener('click', function (e) {
      if (e.target === v || e.target.classList.contains('art-viewer-body')) close()
    })
    v.querySelector('.art-viewer-close').addEventListener('click', close)
    bindEsc(v, close)
  }

  document.addEventListener('click', function (e) {
    var t = e.target
    if (!t || !t.closest) return
    if (t.closest('.art-viewer')) return
    var thumb = t.closest('.art-card-thumb')
    if (!thumb) return
    var img = thumb.querySelector('img')
    if (img) open(img)
  })

  document.addEventListener('pjax:start', function () {
    var v = document.querySelector('.art-viewer')
    if (!v) return
    document.removeEventListener('keydown', v._esc)
    v.remove()
    document.body.classList.remove('artview-lock')
  })
})()
