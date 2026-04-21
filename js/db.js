/**
 * db.js — 数据持久化层
 *
 * 职责：管理所有应用状态，提供 localStorage 的读写封装。
 * 其他模块通过 DB 对象读取数据，通过 saveDB(key) 写入持久化。
 *
 * 扩展方法：
 *   - 新增数据集：在 DB 对象里加一个 key，同时在 DB_DEFAULTS 里定义默认值。
 *   - 切换存储后端（如 IndexedDB / 远程 API）：只需修改 loadDB / saveDB 两个函数。
 */

const STORAGE_PREFIX = 'sim2_';

/** 各 key 的初始默认值 */
const DB_DEFAULTS = {
  members: [],

  audiences: [],

  performance: {
    name: '',
    date: '',
    capacity: 250,
    ticketPrice: 4100,
    memberNames: [],
    frames: {
      '映像倉庫': 80,
      '柱の会': 70,
      '百発98中': 50,
      '女性小中学生': 10,
      'ファミリーカップル': 10,
    },
  },

  consumption: [],

  lotteryConfig: {
    wGender: 3,   // 女性加权
    wAge: 2,   // 年轻加权（未满25岁）
    wMember: 5,   // 会员枠综合加权
    wLastWin: 5,   // 久未中签加权
    wConsumption: 4,   // 消费金额加权
    wFanCount: 3,   // 饭人数加权
    wPriority: 4,   // 成员优先度加权
    frameWeights: {
      '映像倉庫': 3,
      '柱の会': 3,
      '百発98中': 5,
      '女性小中学生': 2,
      'ファミリーカップル': 2,
    },
    overflow: true,    // 枠不满时是否将剩余席位并入一般枠
  },

  winLog: [],   // 格式：[{ id, frame, date, perfName }]
};

/**
 * 从 localStorage 读取指定 key 的数据。
 * 读取失败或不存在时返回对应的默认值。
 * @param {string} key
 * @returns {*}
 */
function loadDB(key) {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    return raw ? JSON.parse(raw) : structuredClone(DB_DEFAULTS[key]);
  } catch (e) {
    console.warn(`[db] loadDB("${key}") failed:`, e);
    return structuredClone(DB_DEFAULTS[key]);
  }
}

/**
 * 将 DB[key] 序列化写入 localStorage。
 * @param {string} key
 */
function saveDB(key) {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(DB[key]));
  } catch (e) {
    console.error(`[db] saveDB("${key}") failed:`, e);
  }
}

/**
 * 清除指定 key 的持久化数据，并还原为默认值。
 * @param {string} key
 */
function resetDB(key) {
  localStorage.removeItem(STORAGE_PREFIX + key);
  DB[key] = structuredClone(DB_DEFAULTS[key]);
}

/**
 * 将所有 key 的数据序列化为 JSON 字符串，用于导出备份。
 * @returns {string}
 */
function exportAllDB() {
  const snapshot = {};
  Object.keys(DB_DEFAULTS).forEach(k => { snapshot[k] = DB[k]; });
  return JSON.stringify(snapshot, null, 2);
}

/**
 * 从 JSON 字符串恢复全部数据（导入备份）。
 * @param {string} jsonStr
 */
function importAllDB(jsonStr) {
  const data = JSON.parse(jsonStr);
  Object.keys(DB_DEFAULTS).forEach(k => {
    if (data[k] !== undefined) {
      DB[k] = data[k];
      saveDB(k);
    }
  });
}

/** 全局数据对象——所有模块均通过此对象读写数据 */
const DB = {
  members: loadDB('members'),
  audiences: loadDB('audiences'),
  performance: loadDB('performance'),
  consumption: loadDB('consumption'),
  lotteryConfig: loadDB('lotteryConfig'),
  winLog: loadDB('winLog'),
};
