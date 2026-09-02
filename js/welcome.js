/* 防抖限流：一次性定位 */
;(function () {
  var started = false
  var located = false

  // 本地时间问候语
  function timeGreeting () {
    var h = new Date().getHours()
    if (h >= 0 && h < 5) return '夜深了，早点休息，别熬夜哦！'
    if (h >= 5 && h < 7) return '清晨好，一日之计在于晨！'
    if (h >= 7 && h < 9) return '早上好，新的一天，从拥抱太阳开始！'
    if (h >= 9 && h < 12) return '上午好，早晨起来，拥抱太阳！'
    if (h >= 12 && h < 14) return '中午好，记得按时吃饭，好好休息！'
    if (h >= 14 && h < 17) return '下午好，泡杯茶，继续加油鸭！'
    if (h >= 17 && h < 19) return '傍晚好，落日与晚霞总是温柔！'
    if (h >= 19 && h < 23) return '晚上好，忙碌了一天，好好放松吧！'
    return '夜深了，早点休息，别熬夜哦！'
  }

  // 按省份/国家定制一句话
  var PROVINCE_TEXT = {
    北京市: '北——京——欢迎你~~~',
    天津市: '来了天津卫，我嘛也没学会~',
    河北省: '山势巍巍成壁垒，天下雄关。',
    河南省: '老乡见老乡，两眼泪汪汪。',
    内蒙古自治区: '天苍苍，野茫茫，风吹草低见牛羊。',
    辽宁省: '我想吃烤鸡架！',
    吉林省: '状元阁就是东北烧烤之王。',
    黑龙江省: '很喜欢哈尔滨大剧院。',
    上海市: '沪爷来了，里面请。',
    江苏省: '上有天堂，下有苏杭。',
    浙江省: '东风渐绿西湖柳，雁已还人未南归。',
    安徽省: '蚌埠住了，芜湖起飞。',
    福建省: '井邑白云间，岩城远带山。',
    江西省: '落霞与孤鹜齐飞，秋水共长天一色。',
    山东省: '遥望齐州九点烟，一泓海水杯中泻。',
    湖北省: '来碗热干面！',
    湖南省: '惟有门前镜湖水，春风不改旧时波。',
    广东省: '老板，来两斤福建人。',
    广西壮族自治区: '桂林山水甲天下。',
    海南省: '朝观日出逐白浪，夕看云起收霞光。',
    四川省: '天府之国，巴适得很！',
    重庆市: '勒是雾都，火锅整起！',
    贵州省: '山水黔灵，苗岭风光。',
    云南省: '玉龙飞舞云缠绕，万仞冰川直耸天。',
    西藏自治区: '躺在茫茫草原上，仰望蓝天。',
    陕西省: '来份臊子面加个馍。',
    甘肃省: '羌笛何须怨杨柳，春风不度玉门关。',
    青海省: '牛肉干和老酸奶都好好吃。',
    宁夏回族自治区: '大漠孤烟直，长河落日圆。',
    新疆维吾尔自治区: '驼铃古道丝绸路，胡马犹闻唐汉风。',
    台湾省: '我在这头，大陆在那头。',
    香港特别行政区: '予你一杯维港的晚风。',
    澳门特别行政区: '大三巴牌坊下，许个愿吧！',
    山西省: '五千年文明看山西！',
    海南省直辖县级行政区划: '朝观日出逐白浪，夕看云起收霞光。'
  }

  var NATION_TEXT = {
    日本: 'よろしく，一起去看樱花吗？',
    美国: 'Let us live in peace!',
    英国: '想同你一起夜乘伦敦眼~',
    俄罗斯: '干了这瓶伏特加！',
    法国: 'C\'est La Vie.',
    德国: 'Die Zeit verging im Fluge.',
    澳大利亚: '一起去大堡礁吧！',
    加拿大: '拾起一片枫叶赠予你~',
    韩国: '阿尼哈塞哟，一起看韩剧吧！',
    新加坡: '狮城欢迎你！',
    中国: ''
  }

  function posDesc (province, nation) {
    if (nation && province && PROVINCE_TEXT[province]) return PROVINCE_TEXT[province]
    if (nation && NATION_TEXT[nation] !== undefined) return NATION_TEXT[nation]
    if (nation && nation !== '中国') return '带我去你的国家逛逛吧。'
    if (province) return '带我去你的城市逛逛吧！'
    return '愿你在这里度过愉快的时光。'
  }

  function render (data) {
    var el = document.getElementById('welcome-info')
    if (!el) return
    if (located && data && (data.province || data.nation)) return
    if (data && (data.province || data.nation)) located = true

    var nation = (data && data.nation) || ''
    var province = (data && data.province) || ''
    var city = (data && data.city) || ''
    var pos = (province ? province : '') + (city && city !== province ? ' ' + city : '')
    var posTxt = pos || nation || '远方'

    el.innerHTML =
      '<b><center>🎉 欢迎信息 🎉</center>' +
      '&emsp;&emsp;欢迎来自 <span class="welcome-tag">' + posTxt +
      '</span> 的小伙伴，' + timeGreeting() + '&emsp;' + posDesc(province, nation) + '</b>'
  }

  // 备用：本地时间问候
  function renderLocal () {
    render(null)
  }

  var fetchWithTimeout = function (url, timeout) {
    var ctrl = new AbortController()
    var timer = setTimeout(function () { ctrl.abort() }, timeout)
    return fetch(url, { signal: ctrl.signal }).finally(function () { clearTimeout(timer) })
  }

  // 解析各接口返回
  var parsers = [
    // 1. vore.top（支持 CORS）
    {
      url: 'https://api.vore.top/api/IPdata',
      parse: function (res) {
        return res.then(function (r) { return r.json() }).then(function (d) {
          if (!d || !d.ipinfo) return null
          var info = d.ipinfo
          var ipd = d.ipdata || {}
          return {
            nation: info.country && info.country !== '未知' ? info.country : '',
            province: info.province || (info.cnip ? ipd.info2 : '') || '',
            city: info.city || (info.cnip ? ipd.info1 : '') || ''
          }
        })
      }
    },
    // 2. useragentinfo
    {
      url: 'https://ip.useragentinfo.com/json',
      parse: function (res) {
        return res.then(function (r) { return r.json() }).then(function (d) {
          if (!d || !d.province) return null
          return { nation: d.country, province: d.province, city: d.city }
        })
      }
    },
    // 3. pconline（GBK 编码，无 CORS 时会被浏览器拦截，仅作最后兜底）
    {
      url: 'https://whois.pconline.com.cn/ipJson.jsp?json=true',
      parse: function (res) {
        return res.then(function (r) {
          return r.arrayBuffer().then(function (buf) {
            return new TextDecoder('gbk').decode(buf)
          })
        }).then(function (text) {
          var d
          try { d = JSON.parse(text) } catch (e) { return null }
          if (!d || !d.pro) return null
          return { nation: '中国', province: d.pro, city: d.city }
        })
      }
    }
  ]

  function tryAt (i) {
    if (i >= parsers.length) return renderLocal()
    var p = parsers[i]
    fetchWithTimeout(p.url, 6000)
      .then(function (res) {
        if (!res.ok) throw new Error('status ' + res.status)
        return p.parse(res)
      })
      .then(function (data) {
        if (data && (data.province || data.nation)) render(data)
        else tryAt(i + 1)
      })
      .catch(function () { tryAt(i + 1) })
  }

  function init () {
    if (started) return
    started = true
    var el = document.getElementById('welcome-info')
    if (!el) return
    // 先展示纯时间问候，避免空白
    renderLocal()
    tryAt(0)
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})()