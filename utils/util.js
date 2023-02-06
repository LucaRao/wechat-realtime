const formatTime = dates => {
  let date = new Date(dates)
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = date.getHours()
  const minute = date.getMinutes()
  const second = date.getSeconds()

  return [year, month, day].map(formatNumber).join('/') + ' ' + [hour, minute, second].map(formatNumber).join(':')
}

const formatNumber = n => {
  n = n.toString()
  return n[1] ? n : `0${n}`
}

const getRandomName =function(){
  var firstNames = new Array(
    '平平无奇', '对钱无感', '绝世高手', '例无虚发', '快活王', '老刀把子', '大宫主', '第一剑神', '天下第一', '痴人说梦', '风流倜傥', '不讲武德', '夺笋呐', '针不戳', '雷区蹦迪', '能有什么坏心思',
    '小丑竟是','绝绝子','凡尔赛','上海十套房','信你个鬼','这瓜保熟','duck不必',
  );

  var lastNames = new Array(
    '吴明', '阴姬', '燕南天', '李商', '柴玉关', '木道人', '邀月宫主', '西门吹雪', '展白', '俞佩玉', '夜帝',
    '原随云', '逍遥侯', '王夫人', '怜星宫主', '燕十三', '日后', '高莫静', '玉罗刹', '叶孤城', '孙白发',
    '上官金虹', '金童', '玉女', '宫九', '李寻欢', '楚留香', '陆小凤', '沈浪', '江小鱼', '谢晓峰',
    '傅红雪', '萧十一郎', '阿飞', '叶开', '铁中棠', '柳长街', '孙玉伯', '南宫平', '方宝玉', '萧泪血',
    '花无缺', '芮玮', '仇恕'
  );
  var result = [];
  var obj = {};
  for (var i = 0; i < lastNames.length; i++) {
    if (!obj[lastNames[i]]) {
      result.push(lastNames[i]);
      obj[lastNames[i]] = 1;
    }
  }
  lastNames = result;
  var firstLength = firstNames.length;
  var lastLength = lastNames.length;

  var i = parseInt(Math.random() * firstLength);
  var j = parseInt(Math.random() * lastLength);
  var name = firstNames[i] + lastNames[j];

  return name;
}


module.exports = {
  formatTime,
  getRandomName
}