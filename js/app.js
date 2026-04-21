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
    gender:             document.getElementById('a_gender').value,
    age:                parseInt(document.getElementById('a_age').value) || 25,
    memberType:         document.getElementById('a_membertype').value,
    isMember:           !!document.getElementById('a_membertype').value,
    totalSpend:         parseInt(document.getElementById('a_spend').value) || 0,
    registeredAt:       document.getElementById('a_reg').value || new Date().toISOString().slice(0, 10),
    favoriteMembers:    document.getElementById('a_fav').value,
    consumptionTargets,
    inTheaterConsumed:  document.getElementById('a_intheater').checked,
    lastWinDate:        document.getElementById('a_lastwin').value || null,
  });

  saveDB('audiences');
  refreshAudTable();
  refreshBadge('audiences');
}

function generateAudiences() {
  const n = parseInt(document.getElementById('gen_n').value) || 200;
  if (!DB.members.length) { alert('请先添加成员'); return; }

  const totalFan = DB.members.reduce((s, m) => s + m.fanCount, 0);

  for (let i = 0; i < n; i++) {
    // 按饭人数比例选喜欢成员
    let r = Math.random() * totalFan, acc = 0, fav = DB.members[0].name;
    for (const m of DB.members) {
      acc += m.fanCount;
      if (r < acc) { fav = m.name; break; }
    }

    const memberType  = RANDOM_MEMBER_TYPE_POOL[Math.floor(Math.random() * RANDOM_MEMBER_TYPE_POOL.length)];
    const gender      = RANDOM_GENDER_POOL[Math.floor(Math.random() * RANDOM_GENDER_POOL.length)];
    const age         = 13 + Math.floor(Math.random() * 42);
    const totalSpend  = Math.floor(Math.random() * Math.random() * 80000); // 偏低分布
    const regDaysAgo  = 30 + Math.floor(Math.random() * 1200);
    const hasLastWin  = Math.random() < 0.25;
    const lastWinDate = hasLastWin
      ? new Date(Date.now() - Math.floor(Math.random() * 400) * 86400000).toISOString().slice(0, 10)
      : null;

    DB.audiences.push({
      id:                `u${(DB.audiences.length + 1).toString().padStart(5, '0')}`,
      gender, age,
      memberType,
      isMember:           !!memberType,
      totalSpend,
      registeredAt:       new Date(Date.now() - regDaysAgo * 86400000).toISOString().slice(0, 10),
      favoriteMembers:    fav,
      consumptionTargets: [{ member: fav, amount: totalSpend }],
      inTheaterConsumed:  Math.random() < 0.35,
      lastWinDate,
    });
  }

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
    name:        document.getElementById('p_name').value,
    date:        document.getElementById('p_date').value,
    capacity:    parseInt(document.getElementById('p_capacity').value) || 200,
    ticketPrice: parseInt(document.getElementById('p_price').value) || 3500,
    frames,
    memberNames,
  });

  saveDB('performance');
  updateFooter();
  showToast('公演设置已保存');
}

// ═══════════════════════════════════════════════════════════
// 消费操作
// ═══════════════════════════════════════════════════════════

function addConsumption() {
  const type = document.getElementById('c_type').value;
  DB.consumption.push({
    type,
    name:        document.getElementById('c_name').value || (type === 'handshake' ? '握手券' : '摇奖'),
    price:       parseInt(document.getElementById('c_price').value) || 0,
    memberName:  document.getElementById('c_member').value,
    probability: type === 'lottery' ? parseInt(document.getElementById('c_prob').value) || 10 : 100,
    place:       type === 'lottery' ? document.getElementById('c_place').value : '劇場',
  });
  saveDB('consumption');
  refreshConsTable();
}

function delConsumption(i) {
  DB.consumption.splice(i, 1);
  saveDB('consumption');
  refreshConsTable();
}

// ═══════════════════════════════════════════════════════════
// 抽选执行
// ═══════════════════════════════════════════════════════════

function runLottery() {
  if (!DB.audiences.length) { alert('观众数据为空'); return; }

  const { allWinners, stats } = runLotteryEngine({
    audiences:     DB.audiences,
    performance:   DB.performance,
    lotteryConfig: DB.lotteryConfig,
    members:       DB.members,
  });

  // 更新当选者的最后中签日期
  const winSet = new Set(allWinners.map(w => w.id));
  const today  = new Date().toISOString().slice(0, 10);
  DB.audiences.forEach(a => {
    if (winSet.has(a.id)) a.lastWinDate = today;
  });
  saveDB('audiences');

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
  const rows   = [['ID', '性别', '年龄', '会员类型', '推し', '消费金额']];
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
 * 下载 CSV 文件（BOM 保证 Excel 正确显示中文）。
 * @param {Array<Array>} rows
 * @param {string}       filename
 */
function downloadCSV(rows, filename) {
  const csv  = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
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
    position:   'fixed',
    bottom:     '24px',
    right:      '24px',
    background: '#1c1c24',
    border:     '1px solid #a78bfa',
    color:      '#a78bfa',
    padding:    '10px 18px',
    borderRadius: '8px',
    fontSize:   '13px',
    fontFamily: "'DM Mono', monospace",
    zIndex:     9999,
    boxShadow:  '0 4px 20px rgba(0,0,0,0.4)',
  });
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2500);
}

// ── 需要在 HTML inline onclick 中访问的函数，挂到 window ──
// （纯模块化项目可以改成 import/export，GitHub Pages 直接引用脚本则需要这样）
Object.assign(window, {
  // 导航
  switchTab, syncSlider,
  // 成员
  addMember, delMember, clearMembers, loadDefaultMembers,
  // 观众
  addAudience, generateAudiences, clearAudiences, exportAudiencesCSV,
  // 公演
  savePerformance,
  // 消费
  addConsumption, delConsumption, toggleLotteryFields,
  // 抽选
  runLottery, exportWinnersCSV, exportLosersCSV,
  // utils
  showToast, downloadCSV,
});
