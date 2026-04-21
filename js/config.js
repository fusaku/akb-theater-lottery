/**
 * config.js — 静态配置
 *
 * 职责：集中管理所有"硬编码"的业务常量。
 * 扩展方法：
 *   - 新增 Tab 页：在 TABS 数组里加一条记录，panel 字段指向 ui.js 里的渲染函数。
 *   - 新增会员枠：在 FRAME_KEYS / FRAME_LABELS / FRAME_BADGE 里同步添加。
 *   - 新增默认成员：在 DEFAULT_MEMBERS 里追加对象。
 */

/* ── Tab 导航定义 ─────────────────────────────────────────────
   panel 字段是函数引用，在 app.js 初始化后用实际函数填充。
   这里先用字符串占位，app.js 会在 DOMContentLoaded 后替换。       */
const TABS = [
  { id: 'members',     label: '成员设置', icon: '👤' },
  { id: 'audiences',   label: '观众管理', icon: '👥' },
  { id: 'performance', label: '公演设置', icon: '🎭' },
  { id: 'consumption', label: '消费设置', icon: '🛒' },
  { id: 'lottery_cfg', label: '抽选配置', icon: '⚙️' },
  { id: 'run',         label: '执行抽选', icon: '🎯' },
];

/* ── 会员枠常量 ──────────────────────────────────────────────
   FRAME_KEYS 决定枠的顺序，其他 Map 用 key 对应显示信息。        */
const FRAME_KEYS = [
  '映像倉庫',
  '柱の会',
  '百発98中',
  '女性小中学生',
  'ファミリーカップル',
];

/** 枠 key → 显示名称（用于表单 label） */
const FRAME_LABELS = {
  '映像倉庫':          '映像倉庫会員枠',
  '柱の会':            '柱の会 会員枠',
  '百発98中':          '100発98中権利',
  '女性小中学生':       '女性・小中学生枠',
  'ファミリーカップル':  'ファミリー・カップル枠',
};

/** 枠 key → CSS badge 类名（用于徽章颜色） */
const FRAME_BADGE = {
  '映像倉庫':          'badge-purple',
  '柱の会':            'badge-blue',
  '百発98中':          'badge-amber',
  '女性小中学生':       'badge-pink',
  'ファミリーカップル':  'badge-green',
  '一般':              'badge-gray',
};

/** 随机生成观众时，会员类型的权重池（空字符串=一般观众，出现频率越高比例越大） */
const RANDOM_MEMBER_TYPE_POOL = [
  '', '', '', '', '',          // 50% 一般
  '映像倉庫',                   // 10%
  '柱の会',                     // 10%
  '百発98中',                   // 10%
  '女性小中学生',                // 10%
  'ファミリーカップル',           // 10%
];

/** 随机生成观众时，性别的权重池 */
const RANDOM_GENDER_POOL = [
  'male', 'male', 'male', 'male',   // ~50% 男性
  'female', 'female', 'female',     // ~37% 女性
  'other',                           // ~13% その他
];

/** 载入默认成员时使用的数据 */
const DEFAULT_MEMBERS = [
  { name: '橋本陽菜', priority: 9, fanCount: 850 },
  { name: '岡部麟',   priority: 8, fanCount: 720 },
  { name: '山内瑞葵', priority: 7, fanCount: 610 },
  { name: '小栗有以', priority: 8, fanCount: 680 },
  { name: '向井地美音',priority: 7, fanCount: 590 },
  { name: '本田仁美', priority: 6, fanCount: 420 },
  { name: '倉野尾成美',priority: 6, fanCount: 380 },
  { name: '大盛真歩', priority: 5, fanCount: 310 },
];

/** 会员枠 select 下拉选项（含"一般"） */
const MEMBER_TYPE_OPTIONS = [
  { value: '',                   label: '一般（非会員）'        },
  { value: '映像倉庫',           label: '映像倉庫会員'          },
  { value: '柱の会',             label: '柱の会 会員'           },
  { value: '百発98中',           label: '100発98中権利'         },
  { value: '女性小中学生',        label: '女性・小中学生枠'      },
  { value: 'ファミリーカップル',   label: 'ファミリー・カップル枠' },
];
