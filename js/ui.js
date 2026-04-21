/**
 * ui.js — 页面渲染逻辑
 *
 * 职责：负责所有 DOM 操作，包括 Tab 导航、各面板的渲染与局部刷新。
 * 依赖：DB（db.js）、各常量（config.js）、工具函数（app.js 末尾的 utils）。
 *
 * 命名规范：
 *   render*()  — 渲染整个面板（由 switchTab 调用）
 *   refresh*() — 只刷新面板内的某个子区域（避免整页重渲染）
 */

// ═══════════════════════════════════════════════════════════
// 导航
// ═══════════════════════════════════════════════════════════

let currentTab = 'members';

/** 构建侧边栏导航按钮 */
function buildNav() {
  const nav = document.getElementById('nav');
  nav.innerHTML = TABS.map(t => `
    <button class="nav-btn ${t.id === currentTab ? 'active' : ''}"
            id="navbtn_${t.id}"
            onclick="switchTab('${t.id}')">
      <span class="icon">${t.icon}</span>
      <span>${t.label}</span>
      ${t.id === 'members'   ? `<span class="nav-badge" id="badge_members">${DB.members.length}</span>`   : ''}
      ${t.id === 'audiences' ? `<span class="nav-badge" id="badge_audiences">${DB.audiences.length}</span>` : ''}
    </button>
  `).join('');
  updateFooter();
}

/** 切换 Tab 页 */
function switchTab(id) {
  currentTab = id;
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById('navbtn_' + id);
  if (btn) btn.classList.add('active');

  const main = document.getElementById('main');
  main.innerHTML = '';
  const panel = document.createElement('div');
  panel.className = 'panel active';

  // 每个 tab 对应的渲染函数由 PANEL_RENDERERS 映射
  const renderer = PANEL_RENDERERS[id];
  if (renderer) renderer(panel);
  main.appendChild(panel);
  updateFooter();
}

/** 更新侧边栏底部统计数字 */
function updateFooter() {
  const fi = document.getElementById('footer-info');
  if (fi) fi.textContent = `${DB.audiences.length} obs / ${DB.performance.capacity || 0} seats`;
}

/** 刷新侧边栏数量徽章 */
function refreshBadge(key) {
  const el = document.getElementById('badge_' + key);
  if (el) el.textContent = DB[key].length;
}

// ═══════════════════════════════════════════════════════════
// 面板：成员设置
// ═══════════════════════════════════════════════════════════

function renderMembers(el) {
  el.innerHTML = `
  <div class="page-header">
    <div><h2>成员设置</h2><div class="subtitle">MEMBER CONFIGURATION</div></div>
    <button class="btn" onclick="loadDefaultMembers()">载入默认成员</button>
  </div>

  <div class="card">
    <div class="card-header"><h3>添加成员</h3></div>
    <div class="form-row">
      <label>成员名称</label>
      <input type="text" id="m_name" placeholder="例：橋本陽菜" style="flex:1">
    </div>
    <div class="form-row">
      <label>优先度</label>
      <input type="number" id="m_priority" value="5" min="1" max="10" class="w-sm">
      <span style="font-size:11px;color:var(--text3)">1–10，影响该成员饭的抽选权重</span>
    </div>
    <div class="form-row">
      <label>饭人数</label>
      <input type="number" id="m_fancount" value="200" min="0" class="w-md">
      <span style="font-size:11px;color:var(--text3)">用于随机生成观众时按比例分配</span>
    </div>
    <button class="btn btn-primary" onclick="addMember()">＋ 添加成员</button>
  </div>

  <div class="card">
    <div class="card-header">
      <h3>成员列表</h3>
      <button class="btn btn-danger btn-sm" onclick="clearMembers()">清空</button>
    </div>
    <div id="member_table"></div>
  </div>`;
  refreshMemberTable();
}

function refreshMemberTable() {
  const el = document.getElementById('member_table');
  if (!el) return;
  if (!DB.members.length) {
    el.innerHTML = '<div class="empty"><div class="empty-icon">👤</div>暂无成员，请添加或载入默认成员</div>';
    return;
  }
  el.innerHTML = `
  <div class="table-wrap"><table>
    <thead><tr><th>#</th><th>姓名</th><th>优先度</th><th>饭人数</th><th>操作</th></tr></thead>
    <tbody>
      ${DB.members.map((m, i) => `<tr>
        <td style="color:var(--text3);font-family:'DM Mono',monospace">${String(i + 1).padStart(2, '0')}</td>
        <td style="font-weight:500">${m.name}</td>
        <td><span class="badge badge-purple">P${m.priority}</span></td>
        <td style="font-family:'DM Mono',monospace;color:var(--text2)">${m.fanCount.toLocaleString()}</td>
        <td><button class="btn btn-danger btn-sm" onclick="delMember(${i})">削除</button></td>
      </tr>`).join('')}
    </tbody>
  </table></div>`;
}

// ═══════════════════════════════════════════════════════════
// 面板：观众管理
// ═══════════════════════════════════════════════════════════

function renderAudiences(el) {
  const femaleCount = DB.audiences.filter(a => a.gender === 'female').length;
  const memberCount = DB.audiences.filter(a => a.memberType).length;
  const avgSpend = DB.audiences.length
    ? Math.round(DB.audiences.reduce((s, a) => s + a.totalSpend, 0) / DB.audiences.length)
    : 0;

  el.innerHTML = `
  <div class="page-header">
    <div><h2>观众管理</h2><div class="subtitle">AUDIENCE DATABASE</div></div>
    <button class="btn btn-danger btn-sm" onclick="clearAudiences()">清空</button>
  </div>

  <div class="grid4">
    <div class="stat"><div class="stat-val">${DB.audiences.length}</div><div class="stat-lbl">总观众数</div></div>
    <div class="stat"><div class="stat-val">${memberCount}</div><div class="stat-lbl">会员数</div></div>
    <div class="stat"><div class="stat-val">${femaleCount}</div><div class="stat-lbl">女性观众</div></div>
    <div class="stat"><div class="stat-val">¥${avgSpend.toLocaleString()}</div><div class="stat-lbl">平均消费</div></div>
  </div>

  <div class="card">
    <div class="card-header"><h3>快速生成随机观众</h3></div>
    <div class="form-row">
      <label>生成数量</label>
      <input type="number" id="gen_n" value="200" min="1" max="10000" class="w-md">
      <button class="btn btn-primary" onclick="generateAudiences()">随机生成</button>
    </div>
    <p style="font-size:12px;color:var(--text3)">按成员饭人数比例分配喜欢成员，会员类型随机分配（约50%为一般观众）</p>
  </div>

  <div class="card">
    <details>
      <summary>＋ 手动添加单个观众</summary>
      <div class="detail-body">
        <div class="form-row">
          <label>账号 ID</label>
          <input type="text" id="a_id" placeholder="user_001" style="flex:1">
        </div>
        <div class="form-row">
          <label>性别</label>
          <select id="a_gender" style="width:100px">
            <option value="male">男性</option>
            <option value="female">女性</option>
            <option value="other">その他</option>
          </select>
          <label style="min-width:auto;margin-left:8px">年龄</label>
          <input type="number" id="a_age" value="25" min="6" max="80" class="w-sm">
        </div>
        <div class="form-row">
          <label>会员类型</label>
          <select id="a_membertype" style="flex:1">
            ${MEMBER_TYPE_OPTIONS.map(o => `<option value="${o.value}">${o.label}</option>`).join('')}
          </select>
        </div>
        <div class="form-row">
          <label>消费金额</label>
          <input type="number" id="a_spend" value="0" min="0" class="w-md">
          <span style="font-size:12px;color:var(--text3)">円（总消费）</span>
        </div>
        <div class="form-row">
          <label>注册日期</label>
          <input type="text" id="a_reg" placeholder="2023-01-01" style="flex:1">
        </div>
        <div class="form-row">
          <label>最喜欢成员</label>
          <select id="a_fav" style="flex:1">
            ${DB.members.map(m => `<option>${m.name}</option>`).join('')}
            <option value="">（未设定）</option>
          </select>
        </div>
        <div class="form-row">
          <label>消费目标</label>
          <input type="text" id="a_targets" placeholder="橋本陽菜:5000,岡部麟:3000" style="flex:1">
          <span style="font-size:11px;color:var(--text3)">成员:金额，逗号分隔</span>
        </div>
        <div class="form-row">
          <label>剧场消费</label>
          <input type="checkbox" id="a_intheater">
          <span style="font-size:12px;color:var(--text2);margin-left:4px">曾在剧场内有过消费</span>
        </div>
        <div class="form-row">
          <label>上次中签</label>
          <input type="text" id="a_lastwin" placeholder="2024-03-15（未中签留空）" style="flex:1">
        </div>
        <button class="btn btn-primary" onclick="addAudience()">＋ 添加</button>
      </div>
    </details>
  </div>

  <div class="card">
    <div class="card-header">
      <h3>观众列表 <span style="font-weight:400;color:var(--text3)">(显示前100条)</span></h3>
      <button class="btn btn-sm" onclick="exportAudiencesCSV()">导出CSV</button>
    </div>
    <div id="aud_table"></div>
  </div>`;
  refreshAudTable();
}

function refreshAudTable() {
  const el = document.getElementById('aud_table');
  if (!el) return;
  if (!DB.audiences.length) {
    el.innerHTML = '<div class="empty"><div class="empty-icon">👥</div>暂无观众数据，请生成或手动添加</div>';
    return;
  }
  const list = DB.audiences.slice(0, 100);
  el.innerHTML = `
  <div class="table-wrap"><table>
    <thead><tr><th>ID</th><th>性别/年龄</th><th>会员</th><th>消费</th><th>推し</th><th>最後当選</th><th>剧場消費</th></tr></thead>
    <tbody>
      ${list.map(a => `<tr>
        <td style="font-family:'DM Mono',monospace;font-size:12px">${a.id}</td>
        <td>${a.gender === 'female' ? '女' : a.gender === 'male' ? '男' : '他'}
            <span style="color:var(--text3)">${a.age}歳</span></td>
        <td>${a.memberType
          ? `<span class="badge ${FRAME_BADGE[a.memberType] || 'badge-gray'}" style="font-size:10px">${a.memberType}</span>`
          : '<span style="color:var(--text3);font-size:12px">一般</span>'
        }</td>
        <td style="font-family:'DM Mono',monospace;font-size:12px">¥${a.totalSpend.toLocaleString()}</td>
        <td style="font-size:12px">${a.favoriteMembers || '–'}</td>
        <td style="font-size:12px;color:var(--text3)">${a.lastWinDate || '未当選'}</td>
        <td style="text-align:center">${a.inTheaterConsumed ? '✓' : ''}</td>
      </tr>`).join('')}
    </tbody>
  </table></div>
  ${DB.audiences.length > 100
    ? `<p style="font-size:12px;color:var(--text3);padding:8px 10px">只显示前100条，共 ${DB.audiences.length} 人</p>`
    : ''}`;
}

// ═══════════════════════════════════════════════════════════
// 面板：公演设置
// ═══════════════════════════════════════════════════════════

function renderPerformance(el) {
  const p = DB.performance;
  el.innerHTML = `
  <div class="page-header">
    <div><h2>公演设置</h2><div class="subtitle">PERFORMANCE CONFIGURATION</div></div>
    <button class="btn btn-primary" onclick="savePerformance()">保存设置</button>
  </div>

  <div class="grid2">
    <div class="card">
      <div class="card-header"><h3>基本信息</h3></div>
      <div class="form-row">
        <label>公演名称</label>
        <input type="text" id="p_name" value="${p.name || ''}" placeholder="チームBコンサート" style="flex:1">
      </div>
      <div class="form-row">
        <label>公演日期</label>
        <input type="text" id="p_date" value="${p.date || ''}" placeholder="2025-06-01" style="flex:1">
      </div>
      <div class="form-row">
        <label>席数（总）</label>
        <input type="number" id="p_capacity" value="${p.capacity || 200}" min="1" class="w-md">
        <span style="font-size:12px;color:var(--text3)">席</span>
      </div>
      <div class="form-row">
        <label>票价</label>
        <input type="number" id="p_price" value="${p.ticketPrice || 3500}" min="0" class="w-md">
        <span style="font-size:12px;color:var(--text3)">円</span>
      </div>
    </div>

    <div class="card">
      <div class="card-header"><h3>会员枠席数</h3></div>
      <p style="font-size:12px;color:var(--text3);margin-bottom:10px">各枠专用名额（超出枠限的同类会员进入一般枠）</p>
      ${FRAME_KEYS.map(key => `
      <div class="form-row">
        <label style="min-width:130px;font-size:12px">${FRAME_LABELS[key]}</label>
        <input type="number" id="frame_${key}" value="${(p.frames && p.frames[key]) || 0}" min="0" class="w-sm">
        <span style="font-size:12px;color:var(--text3)">席</span>
      </div>`).join('')}
    </div>
  </div>

  <div class="card">
    <div class="card-header"><h3>参演成员</h3></div>
    <p style="font-size:12px;color:var(--text3);margin-bottom:10px">点击选择本次公演的参演成员（影响成员偏好的观众权重）</p>
    ${DB.members.length
      ? `<div class="tag-list" id="member_tags">
          ${DB.members.map(m => `
          <span class="mtag ${(p.memberNames || []).includes(m.name) ? 'selected' : ''}"
                data-name="${m.name}" onclick="this.classList.toggle('selected')">
            ${m.name}
          </span>`).join('')}
        </div>`
      : '<div class="empty" style="padding:12px">请先在成员设置中添加成员</div>'}
  </div>`;
}

// ═══════════════════════════════════════════════════════════
// 面板：消费设置
// ═══════════════════════════════════════════════════════════

function renderConsumption(el) {
  el.innerHTML = `
  <div class="page-header">
    <div><h2>消费设置</h2><div class="subtitle">CONSUMPTION ITEMS</div></div>
  </div>

  <div class="card">
    <div class="card-header"><h3>添加消费项目</h3></div>
    <div class="form-row">
      <label>类型</label>
      <select id="c_type" onchange="toggleLotteryFields()" style="width:120px">
        <option value="handshake">握手会</option>
        <option value="lottery">摇奖</option>
      </select>
    </div>
    <div class="form-row">
      <label>名称</label>
      <input type="text" id="c_name" placeholder="握手券 / チェキ抽選" style="flex:1">
    </div>
    <div class="form-row">
      <label>单价</label>
      <input type="number" id="c_price" value="500" min="0" class="w-md">
      <span style="font-size:12px;color:var(--text3)">円</span>
    </div>
    <div class="form-row">
      <label>对象成员</label>
      <select id="c_member" style="flex:1">
        <option value="全員">全员</option>
        ${DB.members.map(m => `<option>${m.name}</option>`).join('')}
      </select>
    </div>
    <div id="lottery_extra" style="display:none">
      <hr class="divider">
      <div class="form-row">
        <label>中奖概率</label>
        <input type="number" id="c_prob" value="10" min="0" max="100" class="w-sm">
        <span style="font-size:12px;color:var(--text3)">%</span>
      </div>
      <div class="form-row">
        <label>消费场所</label>
        <input type="text" id="c_place" value="劇場内" style="flex:1">
      </div>
    </div>
    <button class="btn btn-primary" onclick="addConsumption()">＋ 添加</button>
  </div>

  <div class="card">
    <div class="card-header">
      <h3>消费项目列表 (${DB.consumption.length})</h3>
    </div>
    <div id="cons_table"></div>
  </div>`;
  refreshConsTable();
}

function toggleLotteryFields() {
  const t  = document.getElementById('c_type');
  const el = document.getElementById('lottery_extra');
  if (t && el) el.style.display = t.value === 'lottery' ? 'block' : 'none';
}

function refreshConsTable() {
  const el = document.getElementById('cons_table');
  if (!el) return;
  if (!DB.consumption.length) {
    el.innerHTML = '<div class="empty"><div class="empty-icon">🛒</div>暂无消费项目</div>';
    return;
  }
  el.innerHTML = `
  <div class="table-wrap"><table>
    <thead><tr><th>类型</th><th>名称</th><th>单价</th><th>对象成员</th><th>概率/场所</th><th>操作</th></tr></thead>
    <tbody>
      ${DB.consumption.map((c, i) => `<tr>
        <td><span class="badge ${c.type === 'handshake' ? 'badge-blue' : 'badge-amber'}">
          ${c.type === 'handshake' ? '握手会' : '摇奖'}</span></td>
        <td>${c.name}</td>
        <td style="font-family:'DM Mono',monospace">¥${c.price.toLocaleString()}</td>
        <td>${c.memberName}</td>
        <td style="font-size:12px;color:var(--text2)">
          ${c.type === 'lottery' ? c.probability + '% / ' + c.place : '–'}
        </td>
        <td><button class="btn btn-danger btn-sm" onclick="delConsumption(${i})">削除</button></td>
      </tr>`).join('')}
    </tbody>
  </table></div>`;
}

// ═══════════════════════════════════════════════════════════
// 面板：抽选配置
// ═══════════════════════════════════════════════════════════

function renderLotteryCfg(el) {
  const cfg = DB.lotteryConfig;

  el.innerHTML = `
  <div class="page-header">
    <div><h2>抽选配置</h2><div class="subtitle">LOTTERY WEIGHT SETTINGS</div></div>
  </div>

  <div class="grid2">
    <div class="card">
      <div class="card-header"><h3>观众当选权重因子</h3></div>
      <p style="font-size:12px;color:var(--text3);margin-bottom:12px">各因子对观众中签概率的加成强度（0 = 无影响，10 = 最强加成）</p>
      ${makeSliderRow('女性加权',         'wGender',      cfg)}
      ${makeSliderRow('年轻加权（未满25岁）','wAge',       cfg)}
      ${makeSliderRow('会员枠综合加权',    'wMember',     cfg)}
      ${makeSliderRow('久未中签加权',      'wLastWin',    cfg)}
      ${makeSliderRow('消费金额加权',      'wConsumption',cfg)}
    </div>

    <div class="card">
      <div class="card-header"><h3>成员饭权重</h3></div>
      <p style="font-size:12px;color:var(--text3);margin-bottom:12px">推しが参演时的额外加成</p>
      ${makeSliderRow('成员优先度权重', 'wPriority', cfg)}
      ${makeSliderRow('饭人数权重',     'wFanCount', cfg)}
      <hr class="divider">
      <div class="card-header" style="margin-top:8px"><h3>各会员枠倍率</h3></div>
      <p style="font-size:12px;color:var(--text3);margin-bottom:12px">该枠内观众的基础权重乘数（1–20倍）</p>
      ${FRAME_KEYS.map(key => makeSliderRow(FRAME_LABELS[key], key, cfg.frameWeights, 1, 20)).join('')}
    </div>
  </div>

  <div class="card">
    <div class="card-header"><h3>枠溢出设置</h3></div>
    <div style="display:flex;align-items:flex-start;gap:10px">
      <input type="checkbox" id="overflow_chk" ${cfg.overflow ? 'checked' : ''}
             onchange="DB.lotteryConfig.overflow=this.checked;saveDB('lotteryConfig')"
             style="margin-top:3px">
      <div>
        <div style="font-size:13px;color:var(--text)">允许枠溢出分配</div>
        <div style="font-size:12px;color:var(--text3);margin-top:3px">
          当某枠报名人数不足席数时，多余名额自动分配给一般枠，避免座位空置
        </div>
      </div>
    </div>
  </div>`;
}

/**
 * 生成一行滑块 HTML。
 * @param {string} label  - 显示名称
 * @param {string} key    - 配置字段 key
 * @param {Object} obj    - 存储该字段的对象（cfg 或 cfg.frameWeights）
 * @param {number} min
 * @param {number} max
 */
function makeSliderRow(label, key, obj, min = 0, max = 10) {
  const val      = obj[key] !== undefined ? obj[key] : 5;
  const isFrame  = (obj !== DB.lotteryConfig); // 区分是否是 frameWeights
  return `
  <div class="weight-row">
    <span class="wlabel">${label}</span>
    <input type="range" min="${min}" max="${max}" step="1" value="${val}"
           data-isframe="${isFrame}" data-key="${key}"
           oninput="syncSlider(this)" onchange="syncSlider(this)">
    <span class="wval" id="wval_${key}">${val}</span>
  </div>`;
}

/** 滑块实时同步到 DB */
function syncSlider(el) {
  const key     = el.dataset.key;
  const val     = +el.value;
  const isFrame = el.dataset.isframe === 'true';
  if (isFrame) DB.lotteryConfig.frameWeights[key] = val;
  else         DB.lotteryConfig[key] = val;
  const span = document.getElementById('wval_' + key);
  if (span) span.textContent = val;
  saveDB('lotteryConfig');
}

// ═══════════════════════════════════════════════════════════
// 面板：执行抽选
// ═══════════════════════════════════════════════════════════

function renderRun(el) {
  const p          = DB.performance;
  const frameTotal = p.frames ? Object.values(p.frames).reduce((s, v) => s + v, 0) : 0;
  const issues     = [];
  if (!DB.audiences.length) issues.push('观众数据为空');
  if (!p.capacity)           issues.push('公演席数未设定');

  el.innerHTML = `
  <div class="page-header">
    <div><h2>执行抽选</h2><div class="subtitle">RUN LOTTERY</div></div>
  </div>

  <div class="grid4">
    <div class="stat"><div class="stat-val">${DB.audiences.length.toLocaleString()}</div><div class="stat-lbl">报名人数</div></div>
    <div class="stat"><div class="stat-val">${(p.capacity || 0).toLocaleString()}</div><div class="stat-lbl">总席数</div></div>
    <div class="stat"><div class="stat-val">${frameTotal}</div><div class="stat-lbl">会員枠席数</div></div>
    <div class="stat">
      <div class="stat-val">${DB.audiences.length && p.capacity
        ? (p.capacity / DB.audiences.length * 100).toFixed(1) + '%'
        : '–'}</div>
      <div class="stat-lbl">基础中签率</div>
    </div>
  </div>

  <div class="card">
    <div class="card-header"><h3>公演信息确认</h3></div>
    <div style="font-size:13px;color:var(--text2);margin-bottom:10px">
      <strong style="color:var(--text)">${p.name || '（未命名）'}</strong>
      <span style="margin:0 8px;color:var(--text3)">|</span>${p.date || '日期未设定'}
      <span style="margin:0 8px;color:var(--text3)">|</span>¥${(p.ticketPrice || 0).toLocaleString()} / 席
    </div>
    <div class="tag-list" style="margin-bottom:12px">
      ${p.frames
        ? Object.entries(p.frames).filter(([, v]) => v > 0).map(([k, v]) =>
            `<span class="badge ${FRAME_BADGE[k] || 'badge-gray'}">${k} ${v}席</span>`
          ).join('')
        : ''}
      <span class="badge badge-gray">一般枠 ${Math.max(0, (p.capacity || 0) - frameTotal)}席</span>
    </div>
    ${issues.length
      ? `<div style="background:var(--red-dim);border:1px solid var(--red);border-radius:var(--radius-sm);padding:10px 12px;font-size:12px;color:var(--red)">
          注意：${issues.join('；')}
        </div>`
      : `<button class="btn btn-primary btn-lg" onclick="runLottery()">▶ 开始抽选</button>`}
  </div>

  <div id="lottery_result"></div>`;
}

/**
 * 渲染抽选结果区域。
 * @param {Array}  winners - runLotteryEngine() 返回的 allWinners
 * @param {Object} stats   - runLotteryEngine() 返回的 stats
 */
function renderLotteryResult(winners, stats) {
  const el = document.getElementById('lottery_result');
  if (!el) return;

  el.innerHTML = `
  <div class="card">
    <div class="card-header"><h3>抽选结果概览</h3></div>
    <div class="grid4" style="margin-bottom:14px">
      <div class="stat"><div class="stat-val" style="color:var(--green)">${stats.winCount}</div><div class="stat-lbl">当选人数</div></div>
      <div class="stat"><div class="stat-val" style="color:var(--red)">${stats.loseCount}</div><div class="stat-lbl">落选人数</div></div>
      <div class="stat"><div class="stat-val">${(stats.winCount / stats.total * 100).toFixed(1)}%</div><div class="stat-lbl">实际中签率</div></div>
      <div class="stat"><div class="stat-val">${stats.genderCounts.female}</div><div class="stat-lbl">女性当选</div></div>
    </div>

    <div class="card-header" style="margin-top:4px"><h3>枠分布</h3></div>
    <div class="tag-list" style="margin-bottom:14px">
      ${Object.entries(stats.frameCounts).map(([k, v]) =>
        `<span class="badge ${FRAME_BADGE[k] || 'badge-gray'}">${k}: ${v}人 (${(v / stats.winCount * 100).toFixed(0)}%)</span>`
      ).join('')}
    </div>

    <div class="card-header"><h3>推し成员分布（当选）</h3></div>
    <div class="tag-list">
      ${Object.entries(stats.memberCounts).sort((a, b) => b[1] - a[1]).map(([k, v]) =>
        `<span class="badge badge-blue">${k}: ${v}人</span>`
      ).join('')}
    </div>
  </div>

  <div class="card">
    <div class="card-header">
      <h3>当选名单 <span style="font-weight:400;color:var(--text3)">(前100条)</span></h3>
      <div style="display:flex;gap:8px">
        <button class="btn btn-sm" onclick="exportWinnersCSV()">导出当选CSV</button>
        <button class="btn btn-danger btn-sm" onclick="exportLosersCSV()">导出落选CSV</button>
      </div>
    </div>
    <div class="table-wrap"><table>
      <thead><tr><th>ID</th><th>枠</th><th>性别/年龄</th><th>会员</th><th>推し</th><th>消费</th></tr></thead>
      <tbody>
        ${winners.slice(0, 100).map(w => `<tr>
          <td style="font-family:'DM Mono',monospace;font-size:12px">${w.id}</td>
          <td><span class="badge ${FRAME_BADGE[w._frame] || 'badge-gray'}">${w._frame}</span></td>
          <td>${w.gender === 'female' ? '女' : w.gender === 'male' ? '男' : '他'}
              <span style="color:var(--text3)">${w.age}歳</span></td>
          <td style="font-size:12px">${w.memberType || '–'}</td>
          <td style="font-size:12px">${w.favoriteMembers || '–'}</td>
          <td style="font-family:'DM Mono',monospace;font-size:12px">¥${w.totalSpend.toLocaleString()}</td>
        </tr>`).join('')}
      </tbody>
    </table></div>
  </div>`;
}

// ── 面板渲染函数映射表（供 switchTab 使用）──────────────────
const PANEL_RENDERERS = {
  members:     renderMembers,
  audiences:   renderAudiences,
  performance: renderPerformance,
  consumption: renderConsumption,
  lottery_cfg: renderLotteryCfg,
  run:         renderRun,
};
