// 修复目录固定问题：当文章很长时，TOC 可能随 aside 滚出视窗
(function() {
  var $cardToc = document.getElementById('card-toc');
  if (!$cardToc) return;
  var $aside = document.getElementById('aside-content');
  if (!$aside) return;
  var isFixed = false;
  var originalPosition = '';
  var originalTop = '';
  var originalWidth = '';
  var originalRight = '';
  var originalMargin = '';

  function fixToc() {
    if (window.innerWidth < 900) return;
    var asideRect = $aside.getBoundingClientRect();
    var tocRect = $cardToc.getBoundingClientRect();
    var viewportHeight = window.innerHeight;
    var headerHeight = document.getElementById('page-header') ? document.getElementById('page-header').offsetHeight : 60;

    // TOC 进入视口后开始固定
    if (tocRect.top < headerHeight + 10 && !isFixed && asideRect.top >= 0) {
      isFixed = true;
      originalPosition = $cardToc.style.position;
      originalTop = $cardToc.style.top;
      originalMargin = $cardToc.style.margin;
      $cardToc.style.position = 'fixed';
      $cardToc.style.top = (headerHeight + 10) + 'px';
      $cardToc.style.width = asideRect.width + 'px';
      $cardToc.style.right = (window.innerWidth - asideRect.right) + 'px';
    } else if (isFixed && tocRect.top >= headerHeight + 10) {
      // TOC 回到正常位置，恢复 sticky
      isFixed = false;
      $cardToc.style.position = originalPosition || '';
      $cardToc.style.top = originalTop || '';
      $cardToc.style.width = '';
      $cardToc.style.right = '';
      $cardToc.style.margin = originalMargin || '';
    }

    // TOC 即将超出视窗底部时，恢复 sticky
    if (isFixed && tocRect.bottom > viewportHeight - 10) {
      isFixed = false;
      $cardToc.style.position = originalPosition || '';
      $cardToc.style.top = originalTop || '';
      $cardToc.style.width = '';
      $cardToc.style.right = '';
      $cardToc.style.margin = originalMargin || '';
    }

    // aside 完全滚出视口时隐藏
    if (asideRect.bottom < 0) {
      $cardToc.style.opacity = '0';
      $cardToc.style.pointerEvents = 'none';
    } else if (asideRect.top < viewportHeight && !isFixed) {
      $cardToc.style.opacity = '1';
      $cardToc.style.pointerEvents = 'auto';
    }
  }

  var ticking = false;
  window.addEventListener('scroll', function() {
    if (!ticking) {
      window.requestAnimationFrame(function() {
        fixToc();
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });

  fixToc();
  window.addEventListener('resize', fixToc);
})();