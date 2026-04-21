/**
 * app.js — 全局初始化与事件绑定
 *
 * 职责：
 *   1. DOMContentLoaded 后启动应用（buildNav + switchTab）
 *   2. 业务操作函数（addMember, generateAudiences, runLottery 等）
 *      这些函数被 HTML inline onclick 调用，必须挂到 window 上
 *   3. 工具函数（downloadCSV, showToast）
 *
 * 扩展方法：
 *   - 新增业务操作：在本文件对应区块内添加函数，无需改动其他模块。
 *   - 如果操作涉及新数据字段，同步修改 db.js 的 DB_DEFAULTS。
 */

// ═══════════════════════════════════════════════════════════
// 初始化
// ═══════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  buildNav();
  switchTab('members');
});

// ═══════════════════════════════════════════════════════════
// 成员操作
// ═══════════════════════════════════════════════════════════

function addMember() {
  const name = document.getElementById('m_name').value.trim();
  if (!name) { alert('成员名不能为空'); return; }
  DB.members.push({
    name,
    priority: parseInt(document.getElementById('m_priority').value) || 5,
    fanCount: parseInt(document.getElementById('m_fancount').value) || 200,
    generation: document.getElementById('m_generation').value.trim() || null,
  });
  saveDB('members');
  document.getElementById('m_name').value = '';
  refreshMemberTable();
  refreshBadge('members');
}

function delMember(i) {
  if (!confirm(`确定删除成员「${DB.members[i].name}」？`)) return;
  DB.members.splice(i, 1);
  saveDB('members');
  refreshMemberTable();
  refreshBadge('members');
}

function updateMemberField(i, field, value) {
  DB.members[i][field] = value;
  saveDB('members');
  showToast(`已保存：${DB.members[i].name}`);
}

function clearMembers() {
  if (!confirm('确定清空所有成员？')) return;
  DB.members = [];
  saveDB('members');
  refreshMemberTable();
  refreshBadge('members');
}

function loadDefaultMembers() {
  const existing = new Set(DB.members.map(m => m.name));
  DEFAULT_MEMBERS
    .filter(d => !existing.has(d.name))
    .forEach(d => DB.members.push({ ...d }));
  saveDB('members');
  refreshMemberTable();
  refreshBadge('members');
}

// ═══════════════════════════════════════════════════════════
// 观众操作
// ═══════════════════════════════════════════════════════════

function addAudience() {
  const id = document.getElementById('a_id').value.trim() || `user_${Date.now()}`;
  const targetStr = document.getElementById('a_targets').value;
  const consumptionTargets = targetStr
    ? targetStr.split(',').map(s => {
      const [member, amount] = s.split(':');
      return { member: member.trim(), amount: parseInt(amount) || 0 };
    })
    : [];

  DB.audiences.push({
    id,
    gender: document.getElementById('a_gender').value,
    age: parseInt(document.getElementById('a_age').value) || 25,
    memberTypes: [...document.getElementById('a_membertype').selectedOptions].map(o => o.value),
    memberType: [...document.getElementById('a_membertype').selectedOptions].map(o => o.value)[0] || '',
    isMember: document.getElementById('a_membertype').selectedOptions.length > 0,
    totalSpend: parseInt(document.getElementById('a_spend').value) || 0,
    inTheaterConsumed: (parseInt(document.getElementById('a_spend').value) || 0) > 0
      ? document.getElementById('a_intheater').checked
      : false,
    registeredAt: document.getElementById('a_reg').value || new Date().toISOString().slice(0, 10),
    favoriteMembers: document.getElementById('a_fav').value,
    consumptionTargets,
    inTheaterConsumed: document.getElementById('a_intheater').checked,
    lastWinDate: document.getElementById('a_lastwin').value || null,
  });

  saveDB('audiences');
  refreshAudTable();
  refreshBadge('audiences');
}

function generateAudiences() {
  const n = parseInt(document.getElementById('gen_n').value) || 200;
  if (!DB.members.length) { alert('请先添加成员'); return; }

  // ── 读取参数 ──
  const gMale = parseInt(document.getElementById('gen_male').value) || 50;
  const gFemale = parseInt(document.getElementById('gen_female').value) || 40;
  const ageMin = parseInt(document.getElementById('gen_age_min').value) || 13;
  const ageMax = parseInt(document.getElementById('gen_age_max').value) || 55;
  const ageSkew = parseInt(document.getElementById('gen_age_skew').value) || 5;
  const spendMin = parseInt(document.getElementById('gen_spend_min').value) || 0;
  const spendMax = parseInt(document.getElementById('gen_spend_max').value) || 80000;
  const spendSkew = parseInt(document.getElementById('gen_spend_skew').value) || 6;

  const hsCount = parseInt(document.getElementById('gen_hs_count').value) || 0;
  const hsMin = parseInt(document.getElementById('gen_hs_min').value) || 500;
  const hsMax = parseInt(document.getElementById('gen_hs_max').value) || 5000;
  const ltCount = parseInt(document.getElementById('gen_lt_count').value) || 0;
  const ltPlace = document.getElementById('gen_lt_place').value;
  const ltMin = parseInt(document.getElementById('gen_lt_min').value) || 300;
  const ltMax = parseInt(document.getElementById('gen_lt_max').value) || 3000;

  // ── 会員枠配額 ──
  const frameQuotas = {};
  let quotaTotal = 0;
  FRAME_KEYS.forEach(k => {
    const v = parseInt(document.getElementById('gen_frame_' + k).value) || 0;
    frameQuotas[k] = v;
    quotaTotal += v;
  });
  if (quotaTotal > n) {
    alert(`各枠合計(${quotaTotal})が総生成数(${n})を超えています`);
    return;
  }

  // ── ヘルパー関数 ──
  const totalFan = DB.members.reduce((s, m) => s + m.fanCount, 0);

  function pickFav() {
    let r = Math.random() * totalFan, acc = 0;
    for (const m of DB.members) {
      acc += m.fanCount;
      if (r < acc) return m.name;
    }
    return DB.members[0].name;
  }

  function skewedRandom(min, max, skew) {
    const r = Math.random();
    const biased = skew > 0 ? Math.pow(r, 1 + skew * 0.4) : r;
    return Math.floor(min + biased * (max - min));
  }

  function pickGender() {
    const r = Math.random() * 100;
    if (r < gMale) return 'male';
    if (r < gMale + gFemale) return 'female';
    return 'other';
  }

  function randomSample(total, k) {
    const arr = Array.from({ length: total }, (_, i) => i);
    for (let i = 0; i < k; i++) {
      const j = i + Math.floor(Math.random() * (total - i));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return new Set(arr.slice(0, k));
  }

  // ── 枠スロット生成 ──
  // 每个枠独立随机分配给 n 个观众中的 quota 个
  // 同一观众可以被多个枠选中
  // 先生成每个观众的基础属性
  const baseAttrs = Array.from({ length: n }, () => {
    const age = skewedRandom(ageMin, ageMax, ageSkew);
    const gender = pickGender();
    return { age, gender };
  });

  // 再按枠规则分配，限制候选池
  const memberTypeSets = Array.from({ length: n }, () => new Set());

  FRAME_KEYS.forEach(k => {
    const quota = frameQuotas[k] || 0;
    if (quota <= 0) return;

    // 筛选符合该枠条件的观众索引
    let eligible = baseAttrs.map((a, idx) => idx); // 默认全部可选
    if (k === '女性小中学生') {
      eligible = baseAttrs.map((a, idx) => idx)
        .filter(idx => baseAttrs[idx].gender === 'female' || baseAttrs[idx].age <= 15);
    }

    // 从符合条件的观众里随机选 quota 个
    const pool = eligible.length >= quota ? eligible : eligible; // 不够就全选
    const picked = randomSample(pool.length, Math.min(quota, pool.length));
    picked.forEach(i => memberTypeSets[pool[i]].add(k));
  });

  const slots = memberTypeSets.map(s => [...s]);

  // ── 消費インデックスを事前抽選 ──
  const hsIndices = randomSample(n, Math.min(hsCount, n));
  const ltIndices = randomSample(n, Math.min(ltCount, n));

  // ── 観客生成 ──
  slots.forEach(function (memberTypes, idx) {
    const age = baseAttrs[idx].age;    // 用已生成的，和枠分配一致
    const gender = baseAttrs[idx].gender; // 用已生成的，和枠分配一致

    const hsSpend = hsIndices.has(idx) ? skewedRandom(hsMin, hsMax, 0) : 0;
    const ltSpend = ltIndices.has(idx) ? skewedRandom(ltMin, ltMax, 0) : 0;
    const totalSpend = hsSpend + ltSpend;

    const consumptionTargets = [];
    if (hsSpend > 0) consumptionTargets.push({ type: 'handshake', member: pickFav(), amount: hsSpend });
    if (ltSpend > 0) consumptionTargets.push({ type: 'lottery', member: pickFav(), amount: ltSpend, place: ltPlace });

    const hasLastWin = Math.random() < 0.25;
    const lastWinDate = hasLastWin
      ? new Date(Date.now() - Math.floor(Math.random() * 400) * 86400000).toISOString().slice(0, 10)
      : null;
    const regDaysAgo = 30 + Math.floor(Math.random() * 1200);
    const fav = pickFav();

    DB.audiences.push({
      id: `u${(DB.audiences.length + 1).toString().padStart(5, '0')}`,
      gender: gender,
      age: age,
      memberTypes: memberTypes,
      memberType: memberTypes[0] || '',
      isMember: memberTypes.length > 0,
      totalSpend: totalSpend,
      inTheaterConsumed: totalSpend > 0 ? Math.random() < 0.35 : false,
      registeredAt: new Date(Date.now() - regDaysAgo * 86400000).toISOString().slice(0, 10),
      favoriteMembers: fav,
      consumptionTargets: consumptionTargets,
      lastWinDate: lastWinDate,
    });
  });

  saveDB('audiences');
  switchTab('audiences');
}

function clearAudiences() {
  if (!confirm('确定清空所有观众数据？')) return;
  DB.audiences = [];
  saveDB('audiences');
  switchTab('audiences');
}

function exportAudiencesCSV() {
  const rows = [['ID', '性别', '年龄', '会员类型', '消费金额', '推し成员', '注册日期', '上次中签', '剧场消费']];
  DB.audiences.forEach(a => rows.push([
    a.id, a.gender, a.age, a.memberType || '一般',
    a.totalSpend, a.favoriteMembers || '',
    a.registeredAt || '', a.lastWinDate || '',
    a.inTheaterConsumed ? '是' : '否',
  ]));
  downloadCSV(rows, 'audiences.csv');
}

// ═══════════════════════════════════════════════════════════
// 公演操作
// ═══════════════════════════════════════════════════════════

function savePerformance() {
  const frames = {};
  FRAME_KEYS.forEach(k => {
    const inp = document.getElementById('frame_' + k);
    if (inp) frames[k] = parseInt(inp.value) || 0;
  });
  const memberNames = [...document.querySelectorAll('.mtag.selected')].map(t => t.dataset.name);

  Object.assign(DB.performance, {
    name: document.getElementById('p_name').value,
    date: document.getElementById('p_date').value,
    capacity: parseInt(document.getElementById('p_capacity').value) || 200,
    ticketPrice: parseInt(document.getElementById('p_price').value) || 3500,
    frames,
    memberNames,
    priorityOverrides: (() => {
      const overrides = {};
      DB.members.forEach(m => {
        const inp = document.getElementById('perf_pri_' + m.name);
        if (inp && inp.value.trim() !== '') {
          overrides[m.name] = parseInt(inp.value);
        }
      });
      return overrides;
    })(),
  });

  saveDB('performance');
  updateFooter();
  showToast('公演设置已保存');
}

// ═══════════════════════════════════════════════════════════
// 抽选执行
// ═══════════════════════════════════════════════════════════

function runLottery() {
  if (!DB.audiences.length) { alert('观众数据为空'); return; }
  DB.lotteryCount = (DB.lotteryCount || 0) + 1;
  saveDB('lotteryCount');
  const countEl = document.getElementById('lottery_count');
  if (countEl) countEl.textContent = DB.lotteryCount;

  const { allWinners, stats } = runLotteryEngine({
    audiences: DB.audiences,
    performance: DB.performance,
    lotteryConfig: DB.lotteryConfig,
    members: DB.members,
  });

  // 更新当选者的最后中签日期
  const winSet = new Set(allWinners.map(w => w.id));
  const today = new Date().toISOString().slice(0, 10);
  DB.audiences.forEach(a => {
    if (winSet.has(a.id)) a.lastWinDate = today;
  });
  saveDB('audiences');

  // 写入当选记录
  if (!DB.winLog) DB.winLog = [];
  allWinners.forEach(w => {
    DB.winLog.push({
      id: w.id,
      frame: w._frame,
      date: today,
      perfName: DB.performance.name || '',
    });
  });
  saveDB('winLog');

  // 缓存结果供导出使用
  window._lastWinners = allWinners;

  renderLotteryResult(allWinners, stats);
}

function exportWinnersCSV() {
  if (!window._lastWinners) return;
  const rows = [['ID', '枠', '性别', '年龄', '会员类型', '推し', '消费金额', '最後当選']];
  window._lastWinners.forEach(w => rows.push([
    w.id, w._frame, w.gender, w.age,
    w.memberType || '一般', w.favoriteMembers || '',
    w.totalSpend, w.lastWinDate || '',
  ]));
  downloadCSV(rows, 'winners.csv');
}

function exportLosersCSV() {
  if (!window._lastWinners) return;
  const winSet = new Set(window._lastWinners.map(w => w.id));
  const losers = DB.audiences.filter(a => !winSet.has(a.id));
  const rows = [['ID', '性别', '年龄', '会员类型', '推し', '消费金额']];
  losers.forEach(a => rows.push([
    a.id, a.gender, a.age,
    a.memberType || '一般', a.favoriteMembers || '', a.totalSpend,
  ]));
  downloadCSV(rows, 'losers.csv');
}

// ═══════════════════════════════════════════════════════════
// 工具函数
// ═══════════════════════════════════════════════════════════
/**
 * 从 0～n-1 中随机不重复抽取 k 个索引（Fisher-Yates 部分洗牌）
 */
function randomSample(n, k) {
  const arr = Array.from({ length: n }, (_, i) => i);
  for (let i = 0; i < k; i++) {
    const j = i + Math.floor(Math.random() * (n - i));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, k);
}

function switchLang(lang) {
  currentLang = lang;
  localStorage.setItem('sim_lang', lang);
  buildNav();
  switchTab(currentTab);
}

/**
 * 下载 CSV 文件（BOM 保证 Excel 正确显示中文）。
 * @param {Array<Array>} rows
 * @param {string}       filename
 */
function downloadCSV(rows, filename) {
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

/**
 * 右下角弹出短暂提示。
 * @param {string} msg
 */
function showToast(msg) {
  const t = document.createElement('div');
  t.textContent = msg;
  Object.assign(t.style, {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    background: '#1c1c24',
    border: '1px solid #a78bfa',
    color: '#a78bfa',
    padding: '10px 18px',
    borderRadius: '8px',
    fontSize: '13px',
    fontFamily: "'DM Mono', monospace",
    zIndex: 9999,
    boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
  });
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2500);
}

// ── 需要在 HTML inline onclick 中访问的函数，挂到 window ──
// （纯模块化项目可以改成 import/export，GitHub Pages 直接引用脚本则需要这样）
Object.assign(window, {
  // 导航
  switchTab, syncSlider, switchLang,
  // 成员
  addMember, delMember, clearMembers, loadDefaultMembers, updateMemberField,
  // 观众
  addAudience, generateAudiences, clearAudiences, exportAudiencesCSV,
  // 公演
  savePerformance,
  // 抽选
  runLottery, exportWinnersCSV, exportLosersCSV, observeAccount,
  // utils
  showToast, downloadCSV,
});
