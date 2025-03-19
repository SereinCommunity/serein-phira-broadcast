/// <reference path="SereinJSPluginHelper/index.d.ts"/>

const PREFIX = '[Phira] ';
/** @type {number} */
const ENABLED_GROUP = serein.getSettingsObject().bot.groupList[0];
if (!ENABLED_GROUP) {
  throw new Error('未设置监听群组');
}

/** @type {Record<string, string>} */
const playerMap = {};

/**
 * @param {string} id
 * @returns {string}
 */
function getPlayerName(id) {
  return `${playerMap[id] || '???'} (#${id})`;
}

const OPTION_MAP = {
  create: '创建',
  join: '加入',
  leave: '离开',
};

/** @type {[RegExp, (data: Record<string, string>) => string | void][]} */
const REGEX_FUNCTIONS = [
  // 记录玩家名
  [
    /UserInfo \{ id: (?<id>\d+?), name: "(?<name>.+?)", language: "(?<language>[a-zA-Z-]+?)" \}/,
    (data) => {
      playerMap[data.id] = data.name;
    },
  ],

  // 创建/加入/离开房间
  [
    /user (?<option>create|join|leave) room user=(?<user>\d+?) room="(?<room>[a-zA-Z0-9-_]{1,20})"/,
    (data) =>
      `[${data.room}] ` +
      `玩家 ${getPlayerName(data.user)} ${OPTION_MAP[data.option]}了房间`,
  ],

  // 房间关闭
  [
    /room users all disconnected, dropping room/,
    () => `某房间成员全部离开，房间已关闭`,
  ],

  // 锁定/解锁
  [
    /lock room user=(?<user>\d+?) room="(?<room>[a-zA-Z0-9-_]{1,20})" lock=(?<cycle>true|false)/,
    (data) => `[${data.room}] 房间已${data.cycle === 'true' ? '锁定' : '解锁'}`,
  ],

  // 切换模式
  [
    /cycle room user=(?<user>\d+?) room="(?<room>[a-zA-Z0-9-_]{1,20})" cycle=(?<cycle>true|false)/,
    (data) =>
      `[${data.room}] 已切换为 ${data.cycle === 'true' ? '循环' : '普通'}模式`,
  ],

  // 选择谱面
  [
    /select chart\{user=(\d+?) room="(?<room>[a-zA-Z0-9-_]{1,20})" chart=(\d+)}: phira_mp_server::room: broadcast Message\(SelectChart \{ user: (?<user>\d+?), name: "(?<name>.+?)", id: (?<id>\d+?) \}\)/,
    (data) =>
      `[${data.room}] ` +
      `房主 ${getPlayerName(data.user)} 选择了谱面 ${data.name} (#${data.id})`,
  ],

  // 轮换房主
  [
    /cycling room="(?<room>[a-zA-Z0-9-_]{1,20})"/,
    (data) => `[${data.room}] 已轮换房主`,
  ],

  // 等待准备
  [
    /room wait for ready room="(?<room>[a-zA-Z0-9-_]{1,20})"/,
    (data) => `[${data.room}] 房主开始游戏，等待所有玩家准备`,
  ],

  // 开始游戏
  [
    /game start room="(?<room>[a-zA-Z0-9-_]{1,20})"/,
    (data) => `[${data.room}] 已开始游戏`,
  ],

  // 放弃游戏
  [
    /broadcast Message\(Abort \{ user: (?<user>\d+?) \}\)/,
    (data) => `某房间内玩家 ${getPlayerName(data.user)} 放弃了游戏`,
  ],

  // 成绩
  [
    /user played: Record \{ id: (\d+?), player: (?<user>\d+?), score: (?<score>\d+?), perfect: (?<p>\d+?), good: (?<g>\d+?), bad: (?<b>\d+?), miss: (?<m>\d+?), max_combo: (?<combo>\d+?), accuracy: (?<acc>[0-9.]+?), full_combo: (?<fc>true|false), std: ([0-9.]+?), std_score: ([0-9.]+?) \} room="(?<room>[a-zA-Z0-9-_]{1,20})"/,
    (data) => {
      const accText = (parseFloat(data.acc) * 100).toFixed(2);
      let fcText = '';
      if (data.fc === 'true')
        fcText = ` | ${data.p === data.combo ? 'All Perfect!' : 'Full Combo'}`;

      return (
        `[${data.room}] ` +
        `玩家 ${getPlayerName(data.user)} 结束了游玩\n` +
        `Score: ${data.score} (${accText}%)${fcText}\n` +
        `P: ${data.p} / G: ${data.g} / B: ${data.b} / M: ${data.m} | ` +
        `Max ${data.combo}x`
      );
    },
  ],
];

serein.setListener('onServerOutput', (line) => {
  for (const [regex, func] of REGEX_FUNCTIONS) {
    const match = line.match(regex);
    if (match) {
      const message = func(match.groups ?? {});
      if (message) serein.sendGroup(ENABLED_GROUP, `${PREFIX}${message}`);
      return true;
    }
  }
  return true;
});

serein.registerPlugin(
  'PhiraBroadcast',
  'v0.1.0',
  'LgCookie',
  'Phira 服务器状态播报'
);
