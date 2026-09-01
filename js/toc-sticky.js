(function(){
  var cardToc = document.getElementById('card-toc');
  if (!cardToc) return;
  var stickyLayout = cardToc.closest('.sticky_layout');
  if (!stickyLayout) return;
  var aside = document.getElementById('aside-content');
  if (!aside) return;
  
  var isFixed = false;
  var fixedTop = 80;
  var placeholder = null;
  
  function fixToc() {
    if (window.innerWidth < 900) {
      if (isFixed) {
        cardToc.style.position = '';
        cardToc.style.top = '';
        cardToc.style.right = '';
        cardToc.style.zIndex = '';
        if (placeholder) placeholder.remove();
        placeholder = null;
        isFixed = false;
      }
      return;
    }
    
    var rect = cardToc.getBoundingClientRect();
    var asideRect = aside.getBoundingClientRect();
    var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    
    // TOC 进入视口且不在顶部时固定
    if (rect.top < fixedTop && scrollTop > 100 && !isFixed) {
      isFixed = true;
      // 创建占位元素保持布局
      placeholder = document.createElement('div');
      placeholder.className = 'toc-placeholder';
      placeholder.style.height = stickyLayout.offsetHeight + 'px';
      stickyLayout.parentNode.insertBefore(placeholder, stickyLayout);
      stickyLayout.style.display = 'none';
      
      cardToc.style.position = 'fixed';
      cardToc.style.top = fixedTop + 'px';
      cardToc.style.right = (window.innerWidth - asideRect.right) + 'px';
      cardToc.style.zIndex = '100';
      cardToc.style.width = asideRect.width + 'px';
    }
    // TOC 超出视口底部时取消固定
    else if (rect.bottom > window.innerHeight && isFixed) {
      isFixed = false;
      cardToc.style.position = '';
      cardToc.style.top = '';
      cardToc.style.right = '';
      cardToc.style.zIndex = '';
      cardToc.style.width = '';
      if (placeholder) {
        placeholder.remove();
        placeholder = null;
      }
      stickyLayout.style.display = '';
    }
    // 回到顶部时取消固定
    else if (scrollTop < 100 && isFixed) {
      isFixed = false;
      cardToc.style.position = '';
      cardToc.style.top = '';
      cardToc.style.right = '';
      cardToc.style.zIndex = '';
      cardToc.style.width = '';
      if (placeholder) {
        placeholder.remove();
        placeholder = null;
      }
      stickyLayout.style.display = '';
    }
    // 更新固定位置
    else if (isFixed) {
      var newAsideRect = aside.getBoundingClientRect();
      cardToc.style.right = (window.innerWidth - newAsideRect.right) + 'px';
      cardToc.style.width = newAsideRect.width + 'px';
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
  
  window.addEventListener('resize', function() {
    fixToc();
  });
  
  fixToc();
})();