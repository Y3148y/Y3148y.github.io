(function(){
  var toc = document.getElementById('card-toc');
  if (!toc) return;
  var aside = document.getElementById('aside-content');
  if (!aside) return;
  var header = document.getElementById('page-header');
  var navHeight = header ? header.offsetHeight : 60;
  var isFixed = false;
  var placeholder = null;
  var topOffset = 80;
  
  function updateToc() {
    var rect = toc.getBoundingClientRect();
    var asideRect = aside.getBoundingClientRect();
    var st = window.pageYOffset || document.documentElement.scrollTop;
    
    // 移动端不处理
    if (window.innerWidth < 900) {
      if (isFixed) {
        toc.style.position = '';
        toc.style.top = '';
        toc.style.right = '';
        toc.style.left = '';
        toc.style.zIndex = '';
        toc.style.width = '';
        if (placeholder) {
          placeholder.remove();
          placeholder = null;
        }
        var stickyLayout = toc.closest('.sticky_layout');
        if (stickyLayout) stickyLayout.style.display = '';
        isFixed = false;
      }
      return;
    }
    
    // TOC 进入视口且页面已滚动超过导航栏高度时固定
    if (rect.top <= topOffset && st > navHeight && !isFixed) {
      isFixed = true;
      var stickyLayout = toc.closest('.sticky_layout');
      if (stickyLayout) stickyLayout.style.display = 'none';
      
      placeholder = document.createElement('div');
      placeholder.style.height = (stickyLayout ? stickyLayout.offsetHeight : 200) + 'px';
      placeholder.style.width = '100%';
      stickyLayout.parentNode.insertBefore(placeholder, stickyLayout);
      
      toc.style.position = 'fixed';
      toc.style.top = topOffset + 'px';
      toc.style.right = (window.innerWidth - asideRect.right) + 'px';
      toc.style.left = 'auto';
      toc.style.zIndex = '200';
      toc.style.width = asideRect.width + 'px';
    }
    // TOC 超出视口底部时取消固定
    else if (rect.bottom >= window.innerHeight - 20 && isFixed) {
      isFixed = false;
      toc.style.position = '';
      toc.style.top = '';
      toc.style.right = '';
      toc.style.left = '';
      toc.style.zIndex = '';
      toc.style.width = '';
      if (placeholder) {
        placeholder.remove();
        placeholder = null;
      }
      var sl = toc.closest('.sticky_layout');
      if (sl) sl.style.display = '';
    }
    // 回到页面顶部时取消固定
    else if (st < 50 && isFixed) {
      isFixed = false;
      toc.style.position = '';
      toc.style.top = '';
      toc.style.right = '';
      toc.style.left = '';
      toc.style.zIndex = '';
      toc.style.width = '';
      if (placeholder) {
        placeholder.remove();
        placeholder = null;
      }
      var sl2 = toc.closest('.sticky_layout');
      if (sl2) sl2.style.display = '';
    }
    // 保持固定状态，更新位置
    else if (isFixed) {
      var newAsideRect = aside.getBoundingClientRect();
      toc.style.right = (window.innerWidth - newAsideRect.right) + 'px';
      toc.style.width = newAsideRect.width + 'px';
    }
  }
  
  var ticking = false;
  window.addEventListener('scroll', function() {
    if (!ticking) {
      window.requestAnimationFrame(function() {
        updateToc();
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });
  
  window.addEventListener('resize', function() {
    updateToc();
  });
  
  updateToc();
})();