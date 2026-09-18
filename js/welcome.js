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

  // 按省份/国家定制多句话（每次随机抽一句）
  var PROVINCE_TEXT = {
    北京市: ['北——京——欢迎你~~~', '紫禁城的红墙黄瓦，藏着六百年的风。', '胡同里鸽哨声声，听得见老北京的午。'],
    天津市: ['来了天津卫，我嘛也没学会~', '狗不理配煎饼果子，海河的风都带香。', '津门夜景灯光起，摩天轮的轮廓很温柔。'],
    河北省: ['山势巍巍成壁垒，天下雄关。', '蔚县剪纸配驴肉火烧，燕赵的烟火气。', '白洋淀的芦苇荡，风吹过满塘荷香。'],
    河南省: ['老乡见老乡，两眼泪汪汪。', '一碗烩面配胡辣汤，中原清晨味最足。', '洛水河畔牡丹开，十三朝故事说与君。'],
    内蒙古自治区: ['天苍苍，野茫茫，风吹草低见牛羊。', '烤羊腿配马奶酒，草原豪情都在碗里。', '呼伦贝尔的星空下，马头琴声飘向远方。'],
    辽宁省: ['我想吃烤鸡架！', '锅包肉配老雪，东北夜市最懂你。', '大连的海风吹来，浪漫写在浪花里。'],
    吉林省: ['状元阁就是东北烧烤之王。', '雾凇挂满树梢，松花江上飘着雪。', '长白山天池如镜，映着人间好天气。'],
    黑龙江省: ['很喜欢哈尔滨大剧院。', '马迭尔冰棍配红肠，冰城的夏天也热闹。', '北极村的极光夜，蓝紫色的光在跳舞。'],
    上海市: ['沪爷来了，里面请。', '生煎包配豆花，弄堂里的清晨。', '外滩灯火倒映江面，流光溢彩一整夜。'],
    江苏省: ['上有天堂，下有苏杭。', '盐水鸭配小笼包，金陵城里好味道。', '烟雨江南枫桥夜，姑苏城外寒山寺。'],
    浙江省: ['东风渐绿西湖柳，雁已还人未南归。', '龙井茶香配桂花糕，杭州午后正慢。', '钱塘江潮起时，浪头高过三丈天。'],
    安徽省: ['黄山归来不看岳，云海翻腾胜仙境。', '太平猴魁配毛豆腐，皖南的味道很特别。', '宏村月沼映白墙，徽班千古韵悠长。'],
    福建省: ['井邑白云间，岩城远带山。', '佛跳墙里是醇厚，闽南碗里尽是鲜。', '鼓浪屿的琴声，和着海风轻轻摇。'],
    江西省: ['落霞与孤鹜齐飞，秋水共长天一色。', '一罐瓦罐汤，一碗拌粉，南昌的清晨就位了。', '赣江晚风凉，记得添一件衣裳。'],
    山东省: ['遥望齐州九点烟，一泓海水杯中泻。', '煎饼卷大葱配啤酒，山东的爽朗全在桌上。', '泰山日出红透半边天，齐鲁大地岁岁安。'],
    湖北省: ['故人西辞黄鹤楼，烟花三月下扬州。', '来碗热干面！芝麻酱香扑鼻，过早只认这一口。', '长江汉水两江交汇，江城灯火彻夜亮。'],
    湖南省: ['惟有门前镜湖水，春风不改旧时波。', '剁椒鱼头配臭豆腐，湘菜辣得直冒汗。', '橘子洲头看江景，湘江北去淘不尽。'],
    广东省: ['老板，来两斤福建人。', '叹一盅两件，饮茶已经开市啦。', '珠江水浩浩，愿你在此风调雨顺。'],
    广西壮族自治区: ['桂林山水甲天下。', '螺蛳粉香飘十里，柳州人最懂这碗汤。', '漓江竹筏过青峰，水墨山水入眼帘。'],
    海南省: ['朝观日出逐白浪，夕看云起收霞光。', '椰子一开甜滋滋，博鳌海边踏浪花。', '天涯海角的礁石边，海风轻抚昨夜梦。'],
    四川省: ['天府之国，巴适得很！', '蜀道早已不再难，火锅还在等你来。', '峨眉山月半轮秋，影入平羌江水流。'],
    重庆市: ['勒是雾都，火锅整起！', '小面配酸辣粉，山城的清晨火辣辣。', '洪崖洞灯火挂崖壁，像宫崎骏的梦。'],
    贵州省: ['山水黔灵，苗岭风光。', '酸汤鱼配糯米饭，黔东南的味蕾盛宴。', '梵净山云海之上，金顶闪闪发着光。'],
    云南省: ['玉龙飞舞云缠绕，万仞冰川直耸天。', '过桥米线加菌子火锅，云南的鲜美尝得到。', '大理的风花雪月，丽江的慢时光。'],
    西藏自治区: ['躺在茫茫草原上，仰望蓝天。', '酥油茶配青稞饼，高原上喝的是温暖。', '布达拉宫的金顶，照亮朝圣的路。'],
    陕西省: ['长安回望绣成堆，山顶千门次第开。', '来份臊子面加个馍，肉夹馍最香。', '大雁塔的铃声，应着钟鼓楼的回响。'],
    甘肃省: ['羌笛何须怨杨柳，春风不度玉门关。', '兰州拉面清汤亮，捧在手中暖一冬。', '敦煌莫高的壁画，飞天千年仍在舞。'],
    青海省: ['青海湖月如轮，倒映天光水纹。', '牛肉干和老酸奶都好好吃。', '茶卡盐湖的天空之镜，倒着高原的蓝。'],
    宁夏回族自治区: ['大漠孤烟直，长河落日圆。', '手抓羊肉配八宝茶，塞上江南暖胃。', '贺兰山下的星空，流星划过正好许愿。'],
    新疆维吾尔自治区: ['驼铃古道丝绸路，胡马犹闻唐汉风。', '红柳烤肉配哈密瓜，新疆的甜香都拉满。', '喀纳斯的碧水像宝石，天山雪峰澄净。'],
    台湾省: ['我在这头，大陆在那头。', '珍珠奶茶配蚵仔煎，夜市里的宝岛味。', '日月潭的清晨，雾散后水光潋滟。'],
    香港特别行政区: ['予你一杯维港的晚风。', '菠萝包配丝袜奶茶，茶餐厅的烟火日常。', '太平山顶望下去，霓虹坠入兰桂坊的夜。'],
    澳门特别行政区: ['大三巴牌坊下，许个愿吧！', '葡式蛋挞配猪扒包，濠江的味道金灿灿。', '澳门塔的黄昏，把海天都染成暖金色。'],
    山西省: ['五千年文明看山西！', '刀削面里滚着热油，老陈醋香飘一条街。', '云冈石窟微微一笑，千年后依然温柔。']
  }

  var NATION_TEXT = {
    日本: ['よろしく，一起去看樱花吗？', '富士山的雪顶，在车窗外静静发光。'],
    美国: ['Let us live in peace!', '高速公路尽头的日落，总是很自由。'],
    英国: ['想同你一起夜乘伦敦眼~', '泰晤士河雾蒙蒙，大本钟敲响时。'],
    俄罗斯: ['干了这瓶伏特加！', '红场的雪，盖住了火车的长鸣。'],
    法国: ['C\'est La Vie.', '塞纳河畔的风，吹过左岸的咖啡馆。'],
    德国: ['Die Zeit verging im Fluge.', '黑森林的慢火车窗外，是童话。'],
    澳大利亚: ['一起去大堡礁吧！', '悉尼港的白帆，迎着南半球的风。'],
    加拿大: ['拾起一片枫叶赠予你~', '落基山脉的湖，在雾里泛着蓝光。'],
    韩国: ['阿尼哈塞哟，一起看韩剧吧！', '首尔塔下的锁，挂着两个人的名字。'],
    新加坡: ['狮城欢迎你！', '鱼尾狮喷着水花，滨海湾灯火通明。'],
    泰国: ['萨瓦迪卡，一起去逛夜市吧！', '湄南河的风，揉着冬阴功的香。'],
    印度: ['Namaste~ 一起跳支舞吧！', '泰姬陵的晨光，柔和得像首诗。'],
    意大利: ['Ciao! 一起去威尼斯划船吧！', '罗马的黄昏，落在斗兽场的石缝里。'],
    西班牙: ['Hola! 一起看弗拉明戈吧！', '巴塞罗那的夏夜，高迪的童话醒着。'],
    新西兰: ['Kia Ora! 一起看星空吧！', '南岛的牧场上，羊群慢悠悠地吃草。'],
    中国: ''
  }

  // 简称 -> 全称（用于匹配 PROVINCE_TEXT）
  var PROVINCE_ALIAS = {
    北京: '北京市', 天津: '天津市', 上海: '上海市', 重庆: '重庆市',
    河北: '河北省', 山西: '山西省', 辽宁: '辽宁省', 吉林: '吉林省', 黑龙江: '黑龙江省',
    江苏: '江苏省', 浙江: '浙江省', 安徽: '安徽省', 福建: '福建省', 江西: '江西省',
    山东: '山东省', 河南: '河南省', 湖北: '湖北省', 湖南: '湖南省', 广东: '广东省',
    海南: '海南省', 四川: '四川省', 贵州: '贵州省', 云南: '云南省', 陕西: '陕西省',
    甘肃: '甘肃省', 青海: '青海省', 台湾: '台湾省',
    内蒙古: '内蒙古自治区', 广西: '广西壮族自治区', 西藏: '西藏自治区',
    宁夏: '宁夏回族自治区', 新疆: '新疆维吾尔自治区',
    香港: '香港特别行政区', 澳门: '澳门特别行政区'
  }

  function normProvince (name) {
    if (!name) return ''
    return PROVINCE_ALIAS[name] || name
  }

  // 从多句中随机取一句（兼容字符串）
  function pickText (list) {
    if (!list) return ''
    if (typeof list === 'string') return list
    return list[Math.floor(Math.random() * list.length)]
  }

  function posDesc (province, nation) {
    if (nation && province && PROVINCE_TEXT[province]) return pickText(PROVINCE_TEXT[province])
    if (nation && NATION_TEXT[nation]) return pickText(NATION_TEXT[nation])
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

  // 解析各接口返回（并行请求，谁先成功用谁）
  var parsers = [
    // 1. myip.ipip.net：返回 data.location = [国家, 省份, 城市, 区县, 运营商]，
    //    中文、支持 CORS、国内速度快、IPv6 也能识别
    {
      url: 'https://myip.ipip.net/json',
      parse: function (d) {
        if (!d || d.ret !== 'ok' || !d.data || !Array.isArray(d.data.location)) return null
        var loc = d.data.location
        var nation = loc[0] || ''
        var province = normProvince(loc[1] || '')
        var city = loc[2] || ''
        return { nation: nation, province: province, city: city }
      }
    },
    // 2. vore.top：info1=省份, info2=城市（IPv6 下 ipinfo 无省市区，需从 ipdata/adcode 兜底）
    {
      url: 'https://api.vore.top/api/IPdata',
      parse: function (d) {
        if (!d || !d.ipinfo) return null
        var info = d.ipinfo
        var ipd = d.ipdata || {}
        var adc = d.adcode || {}
        var province = info.province || ipd.info1 || adc.p || ''
        var city = info.city || ipd.info2 || adc.c || ''
        var nation = info.country && info.country !== '未知'
          ? info.country
          : (province ? '中国' : '')
        return { nation: nation, province: normProvince(province), city: city }
      }
    },
    // 3. ip-api.com：支持 CORS；regionName 为省简称，city 可能为拼音需过滤
    {
      url: 'https://ip-api.com/json/?lang=zh-CN&fields=status,country,regionName,city',
      parse: function (d) {
        if (!d || d.status !== 'success') return null
        var nation = d.country === '中国' ? '中国' : (d.country || '')
        var city = d.city && /[\u4e00-\u9fa5]/.test(d.city) ? d.city : ''
        return { nation: nation, province: normProvince(d.regionName), city: city }
      }
    }
  ]

  function runParsers () {
    var finished = 0
    var done = false
    parsers.forEach(function (p) {
      fetchWithTimeout(p.url, 5000)
        .then(function (res) {
          if (!res.ok) throw new Error('status ' + res.status)
          return res.text().then(function (t) {
            try { return JSON.parse(t) } catch (e) { throw new Error('bad json') }
          })
        })
        .then(function (d) {
          return p.parse(d)
        })
        .then(function (data) {
          finished += 1
          if (done) return
          if (data && (data.province || data.nation)) {
            done = true
            render(data)
          } else if (finished >= parsers.length) {
            renderLocal()
          }
        })
        .catch(function () {
          finished += 1
          if (finished >= parsers.length && !done) renderLocal()
        })
    })
  }

  function init () {
    if (started) return
    started = true
    var el = document.getElementById('welcome-info')
    if (!el) return
    renderLocal()
    runParsers()
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})()