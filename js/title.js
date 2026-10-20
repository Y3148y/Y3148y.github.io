//动态标题
var OriginTitile = document.title;
var titleTime;
document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
        //离开当前页面时
        document.title = '(┯_┯)难过，你离开了';
        clearTimeout(titleTime);
    } else {
        //返回当前页面时
        document.title = '(≧ω≦)嘻嘻，谢谢你回来';
        //两秒后变回原标题
        titleTime = setTimeout(function () {
            document.title = OriginTitile;
        }, 2000);
    }
});