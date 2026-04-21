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
  { id: 'members',     labelKey: 'nav_members', icon: '👤' },
  { id: 'audiences',   labelKey: 'nav_audiences', icon: '👥' },
  { id: 'performance', labelKey: 'nav_performance', icon: '🎭' },
  { id: 'lottery_cfg', labelKey: 'nav_lottery_cfg', icon: '⚙️' },
  { id: 'run',         labelKey: 'nav_run', icon: '🎯' },
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
  { name: '岩立沙穂', priority: 5, fanCount: 850, generation: '13期生' },
  { name: '福岡聖菜',   priority: 5, fanCount: 720, generation: '15期生' },
  { name: '向井地美音', priority: 5, fanCount: 610, generation: '15期生' },
  { name: '小栗有以', priority: 5, fanCount: 680, generation: 'Team8' },
  { name: '行天優莉奈',priority: 5, fanCount: 590, generation: 'Team8' },
  { name: '倉野尾成美', priority: 5, fanCount: 420, generation: 'Team8' },
  { name: '坂川陽香',priority: 5, fanCount: 380, generation: 'Team8' },
  { name: '下尾みう', priority: 5, fanCount: 310, generation: 'Team8' },
  { name: '髙橋彩音', priority: 5, fanCount: 850, generation: 'Team8' },
  { name: '徳永羚海',   priority: 5, fanCount: 720, generation: 'Team8' },
  { name: '永野芹佳', priority: 5, fanCount: 610, generation: 'Team8' },
  { name: '橋本陽菜', priority: 5, fanCount: 680, generation: 'Team8' },
  { name: '千葉恵里',priority: 5, fanCount: 590, generation: 'ドラフト2期生' },
  { name: '黒須遥香', priority: 5, fanCount: 420, generation: '16期生' },
  { name: '鈴木くるみ',priority: 5, fanCount: 380, generation: '16期生' },
  { name: '田口愛佳', priority: 5, fanCount: 310, generation: '16期生' },
  { name: '長友彩海', priority: 5, fanCount: 850, generation: '16期生' },
  { name: '武藤小麟',   priority: 5, fanCount: 720, generation: '16期生' },
  { name: '山内瑞葵', priority: 5, fanCount: 610, generation: '16期生' },
  { name: '山根涼羽', priority: 5, fanCount: 680, generation: '16期生' },
  { name: '大盛真歩',priority: 5, fanCount: 590, generation: 'ドラフト3期生' },
  { name: '太田有紀', priority: 5, fanCount: 420, generation: '17期生' },
  { name: '佐藤綺星',priority: 5, fanCount: 380, generation: '17期生' },
  { name: '橋本恵理子', priority: 5, fanCount: 310, generation: '17期生' },
  { name: '畠山希美', priority: 5, fanCount: 850, generation: '17期生' },
  { name: '平田侑希',   priority: 5, fanCount: 720, generation: '17期生' },
  { name: '布袋百椛', priority: 5, fanCount: 610, generation: '17期生' },
  { name: '正鋳真優', priority: 5, fanCount: 680, generation: '17期生' },
  { name: '水島美結',priority: 5, fanCount: 590, generation: '17期生' },
  { name: '山﨑空', priority: 5, fanCount: 420, generation: '17期生' },
  { name: '秋山由奈',priority: 5, fanCount: 380, generation: '18期生' },
  { name: '新井彩永', priority: 5, fanCount: 310, generation: '18期生' },
  { name: '工藤華純', priority: 5, fanCount: 850, generation: '18期生' },
  { name: '久保姫菜乃',   priority: 5, fanCount: 720, generation: '18期生' },
  { name: '迫由芽実', priority: 5, fanCount: 610, generation: '18期生' },
  { name: '成田香姫奈', priority: 5, fanCount: 680, generation: '18期生' },
  { name: '八木愛月',priority: 5, fanCount: 590, generation: '18期生' },
  { name: '山口結愛', priority: 5, fanCount: 420, generation: '18期生' },
  { name: '伊藤百花',priority: 5, fanCount: 380, generation: '19期生' },
  { name: '奥本カイリ', priority: 5, fanCount: 310, generation: '19期生' },
  { name: '川村結衣', priority: 5, fanCount: 850, generation: '19期生' },
  { name: '白鳥沙怜',   priority: 5, fanCount: 720, generation: '19期生' },
  { name: '花田藍衣', priority: 5, fanCount: 610, generation: '19期生' },
  { name: '大賀彩姫', priority: 5, fanCount: 680, generation: '20期研究生' },
  { name: '近藤沙樹',priority: 5, fanCount: 590, generation: '20期研究生' },
  { name: '丸山ひなた', priority: 5, fanCount: 420, generation: '20期研究生' },
  { name: '髙橋舞桜',priority: 5, fanCount: 380, generation: '21期研究生' },
  { name: '田中沙友利', priority: 5, fanCount: 310, generation: '21期研究生' },
  { name: '牧戸愛茉', priority: 5, fanCount: 850, generation: '21期研究生' },
  { name: '森川優',   priority: 5, fanCount: 720, generation: '21期研究生' },
  { name: '渡邉葵心', priority: 5, fanCount: 610, generation: '21期研究生' },
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

let currentLang = localStorage.getItem('sim_lang') || 'ja';

function t(key) {
  const pack = currentLang === 'ja' ? window.I18N_JA : window.I18N_ZH;
  return (pack && pack[key]) || (window.I18N_ZH && window.I18N_ZH[key]) || key;
}