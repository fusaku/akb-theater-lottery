/**
 * ui.js — 页面渲染逻辑
 *
 * 职责：负责所有 DOM 操作，包括 Tab 导航、各面板的渲染与局部刷新。
 * 依赖：DB（db.js）、各常量（config.js）、工具函数（app.js 末尾的 utils）。
 *
 * 命名规范：
 * render*()  — 渲染整个面板（由 switchTab 调用）
 * refresh*() — 只刷新面板内的某个子区域（避免整页重渲染）
 */

// ═══════════════════════════════════════════════════════════
// 导航
// ═══════════════════════════════════════════════════════════

let currentTab = 'members';

/** 构建侧边栏导航按钮 */
function buildNav() {
  const nav = document.getElementById('nav');
  nav.innerHTML = TABS.map(t_tab => `
    <button class="nav-btn ${t_tab.id === currentTab ? 'active' : ''}"
            id="navbtn_${t_tab.id}"
            onclick="switchTab('${t_tab.id}')">
      <span class="icon">${t_tab.icon}</span>
      <span>${t(t_tab.labelKey)}</span>
      ${t_tab.id === 'members' ? `<span class="nav-badge" id="badge_members">${DB.members.length}</span>` : ''}
      ${t_tab.id === 'audiences' ? `<span class="nav-badge" id="badge_audiences">${DB.audiences.length}</span>` : ''}
    </button>
  `).join('');

  // 语言切换按钮 (保留中日文的硬编码，因为通常作为UI切换标识不计入语言包)
  const footer = document.getElementById('sidebar-lang');
  if (footer) {
    footer.innerHTML = `
      <button class="btn btn-sm ${currentLang === 'zh' ? 'btn-primary' : ''}" onclick="switchLang('zh')">中文</button>
      <button class="btn btn-sm ${currentLang === 'ja' ? 'btn-primary' : ''}" onclick="switchLang('ja')">日本語</button>
    `;
  }
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
  main.appendChild(panel);   // ← 先挂到 DOM

  const renderer = PANEL_RENDERERS[id];
  if (renderer) renderer(panel);  // ← 再渲染

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
    <div><h2>${t('members_title')}</h2><div class="subtitle">${t('members_subtitle')}</div></div>
    <button class="btn" onclick="loadDefaultMembers()">${t('members_load_default')}</button>
  </div>

  <div class="card">
    <div class="card-header"><h3>${t('members_add_card')}</h3></div>
    <div class="form-row">
      <label>${t('members_name')}</label>
      <input type="text" id="m_name" placeholder="${t('members_name_ph')}" style="flex:1">
    </div>
    <div class="form-row">
      <label>${t('members_priority')}</label>
      <input type="number" id="m_priority" value="5" min="1" max="10" class="w-sm">
      <span style="font-size:11px;color:var(--text3)">${t('members_priority_tip')}</span>
    </div>
    <div class="form-row">
      <label>${t('members_fancount')}</label>
      <input type="number" id="m_fancount" value="200" min="0" class="w-md">
      <span style="font-size:11px;color:var(--text3)">${t('members_fancount_tip')}</span>
    </div>
    <div class="form-row">
    <label>${t('members_generation')}</label>
    <input type="text" id="m_generation" value="" placeholder="${t('members_generation_ph')}" class="w-md">
    </div>
    <button class="btn btn-primary" onclick="addMember()">${t('members_add_btn')}</button>
  </div>

  <div class="card">
    <div class="card-header">
      <h3>${t('members_list')}</h3>
      <button class="btn btn-danger btn-sm" onclick="clearMembers()">${t('members_clear')}</button>
    </div>
    <div id="member_table"></div>
  </div>`;
  refreshMemberTable();
}

function refreshMemberTable() {
  const el = document.getElementById('member_table');
  if (!el) return;
  if (!DB.members.length) {
    el.innerHTML = `<div class="empty"><div class="empty-icon">👤</div>${t('members_empty')}</div>`;
    return;
  }
  el.innerHTML = `
  <div class="table-wrap"><table>
    <thead><tr>
      <th>${t('members_th_no')}</th>
      <th>${t('members_th_name')}</th>
      <th>${t('members_th_priority')}</th>
      <th>${t('members_th_fancount')}</th>
      <th>${t('members_th_gen')}</th>
      <th>${t('members_th_action')}</th>
    </tr></thead>
    <tbody>
      ${DB.members.map((m, i) => `<tr>
        <td style="color:var(--text3);font-family:'DM Mono',monospace">${String(i + 1).padStart(2, '0')}</td>
        <td style="font-weight:500">${m.name}</td>
        <td>
          <input type="number" value="${m.priority}" min="1" max="10" class="w-sm"
                 onchange="updateMemberField(${i}, 'priority', +this.value)">
        </td>
        <td>
          <input type="number" value="${m.fanCount}" min="0" class="w-md"
                 onchange="updateMemberField(${i}, 'fanCount', +this.value)">
        </td>
        <td>
          <input type="text" value="${m.generation || ''}" placeholder="–" class="w-md"
                 onchange="updateMemberField(${i}, 'generation', this.value.trim() || null)">
        </td>
        <td><button class="btn btn-danger btn-sm" onclick="delMember(${i})">${t('members_delete')}</button></td>
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
    <div><h2>${t('audiences_title')}</h2><div class="subtitle">${t('audiences_subtitle')}</div></div>
    <button class="btn btn-danger btn-sm" onclick="clearAudiences()">${t('audiences_clear')}</button>
  </div>

  <div class="grid4">
    <div class="stat"><div class="stat-val">${DB.audiences.length}</div><div class="stat-lbl">${t('audiences_total')}</div></div>
    <div class="stat"><div class="stat-val">${memberCount}</div><div class="stat-lbl">${t('audiences_members')}</div></div>
    <div class="stat"><div class="stat-val">${femaleCount}</div><div class="stat-lbl">${t('audiences_female')}</div></div>
    <div class="stat"><div class="stat-val">¥${avgSpend.toLocaleString()}</div><div class="stat-lbl">${t('audiences_avg_spend')}</div></div>
  </div>

  <div class="card">
    <div class="card-header"><h3>${t('gen_card_title')}</h3></div>
    <div class="form-row">
      <label>${t('gen_total')}</label>
      <input type="number" id="gen_n" value="2000" min="1" max="20000" class="w-md">
    </div>

    <hr class="divider">
    <div class="card-header" style="margin-top:0"><h3>${t('gen_frame_title')}</h3></div>
    <p style="font-size:12px;color:var(--text3);margin-bottom:10px">${t('gen_frame_tip')}</p>
    ${FRAME_KEYS.map(k => {
    // 定义每个枠对应的默认生成人数
    const defaultCounts = {
      '映像倉庫': 500,
      '柱の会': 1000,
      '百発98中': 10,
      '女性小中学生': 100,
      'ファミリーカップル': 100
    };

    // 获取当前枠的默认值，如果没有定义则默认为0
    const defaultVal = defaultCounts[k] || 0;

    return `
          <div class="form-row">
            <label style="min-width:130px;font-size:12px">${FRAME_LABELS[k]}</label>
            <input type="number" id="gen_frame_${k}" value="${defaultVal}" min="0" class="w-sm">
            <span style="font-size:12px;color:var(--text3)">${t('aud_show_limit2')}</span>
          </div>`;
  }).join('')}

    <hr class="divider">
    <div class="card-header" style="margin-top:0"><h3>${t('gen_gender_title')}</h3></div>
    <div class="form-row">
      <label>${t('gen_male')}</label><input type="number" id="gen_male" value="80" min="0" max="100" class="w-sm">
      <span style="font-size:12px;color:var(--text3)">%</span>
      <label style="margin-left:12px">${t('gen_female')}</label><input type="number" id="gen_female" value="20" min="0" max="100" class="w-sm">
      <span style="font-size:12px;color:var(--text3)">${t('gen_gender_tip')}</span>
    </div>

    <hr class="divider">
    <div class="card-header" style="margin-top:0"><h3>${t('gen_age_title')}</h3></div>
    <div class="form-row">
      <label>${t('gen_age_min')}</label><input type="number" id="gen_age_min" value="13" min="6" max="80" class="w-sm">
      <label style="margin-left:12px">${t('gen_age_max')}</label><input type="number" id="gen_age_max" value="55" min="6" max="80" class="w-sm">
    </div>
    <div class="form-row">
      <label>${t('gen_age_skew')}</label>
      <input type="range" id="gen_age_skew" min="0" max="10" value="5"
             oninput="document.getElementById('gen_age_skew_val').textContent=this.value">
      <span id="gen_age_skew_val" class="wval">5</span>
      <span style="font-size:11px;color:var(--text3);margin-left:4px">${t('gen_age_skew_tip')}</span>
    </div>

    <hr class="divider">
    <div class="card-header" style="margin-top:0"><h3>${t('gen_spend_title')}</h3></div>
    <div class="form-row">
      <label>${t('gen_spend_min')}</label><input type="number" id="gen_spend_min" value="0" min="0" class="w-md">
      <span style="font-size:12px;color:var(--text3)">${t('perf_price_unit')}</span>
      <label style="margin-left:12px">${t('gen_spend_max')}</label><input type="number" id="gen_spend_max" value="80000" min="0" class="w-md">
      <span style="font-size:12px;color:var(--text3)">${t('perf_price_unit')}</span>
    </div>
    <div class="form-row">
      <label>${t('gen_spend_skew')}</label>
      <input type="range" id="gen_spend_skew" min="0" max="10" value="6"
             oninput="document.getElementById('gen_spend_skew_val').textContent=this.value">
      <span id="gen_spend_skew_val" class="wval">6</span>
      <span style="font-size:11px;color:var(--text3);margin-left:4px">${t('gen_spend_skew_tip')}</span>
    </div>
    <hr class="divider">
    <div class="card-header" style="margin-top:0"><h3>${t('gen_hs_title')}</h3></div>
    <div class="form-row">
      <label>${t('gen_hs_count')}</label>
      <input type="number" id="gen_hs_count" value="1500" min="0" class="w-sm">
      <span style="font-size:12px;color:var(--text3)">${t('gen_hs_count_tip')}</span>
    </div>
    <div class="form-row">
      <label>${t('gen_hs_range')}</label>
      <input type="number" id="gen_hs_min" value="1300" min="0" class="w-md">
      <span style="font-size:12px;color:var(--text3)">～</span>
      <input type="number" id="gen_hs_max" value="3000000" min="0" class="w-md">
      <span style="font-size:12px;color:var(--text3)">${t('perf_price_unit')}</span>
    </div>

    <hr class="divider">
    <div class="card-header" style="margin-top:0"><h3>${t('gen_lt_title')}</h3></div>
    <div class="form-row">
      <label>${t('gen_lt_count')}</label>
      <input type="number" id="gen_lt_count" value="200" min="0" class="w-sm">
      <span style="font-size:12px;color:var(--text3)">${t('gen_hs_count_tip')}</span>
    </div>
    <div class="form-row">
      <label>${t('gen_lt_place')}</label>
      <select id="gen_lt_place" style="width:160px">
        <option value="劇場内">${t('gen_lt_place_theater')}</option>
        <option value="握手会現場">${t('gen_lt_place_handshake')}</option>
      </select>
    </div>
    <div class="form-row">
      <label>${t('gen_lt_range')}</label>
      <input type="number" id="gen_lt_min" value="500" min="0" class="w-md">
      <span style="font-size:12px;color:var(--text3)">～</span>
      <input type="number" id="gen_lt_max" value="1000000" min="0" class="w-md">
      <span style="font-size:12px;color:var(--text3)">${t('perf_price_unit')}</span>
    </div>

      <hr class="divider">
      <button class="btn btn-primary" onclick="generateAudiences()">${t('gen_btn')}</button>
      <span style="font-size:12px;color:var(--text3);margin-left:10px">${t('gen_btn_tip')}</span>
    </div>

  <div class="card">
    <details>
      <summary>${t('manual_add_title')}</summary>
      <div class="detail-body">
        <div class="form-row">
          <label>${t('aud_id')}</label>
          <input type="text" id="a_id" placeholder="user_001" style="flex:1">
        </div>
        <div class="form-row">
          <label>${t('aud_gender')}</label>
          <select id="a_gender" style="width:100px">
            <option value="male">${t('aud_gender_male')}</option>
            <option value="female">${t('aud_gender_female')}</option>
            <option value="other">${t('aud_gender_other')}</option>
          </select>
          <label style="min-width:auto;margin-left:8px">${t('aud_age')}</label>
          <input type="number" id="a_age" value="25" min="6" max="80" class="w-sm">
        </div>
        <div class="form-row" style="align-items:flex-start">
          <label style="padding-top:6px">${t('aud_membertype')}</label>
          <div style="flex:1">
            <select id="a_membertype" multiple size="5" style="width:100%">
              ${FRAME_KEYS.map(k => `<option value="${k}">${FRAME_LABELS[k]}</option>`).join('')}
            </select>
            <p style="font-size:11px;color:var(--text3);margin-top:4px">${t('aud_membertype_tip')}</p>
          </div>
        </div>
        <div class="form-row">
          <label>${t('aud_spend')}</label>
          <input type="number" id="a_spend" value="0" min="0" class="w-md">
          <span style="font-size:12px;color:var(--text3)">${t('aud_spend_tip')}</span>
        </div>
        <div class="form-row">
          <label>${t('aud_reg')}</label>
          <input type="text" id="a_reg" placeholder="2023-01-01" style="flex:1">
        </div>
        <div class="form-row">
          <label>${t('aud_fav')}</label>
          <select id="a_fav" style="flex:1">
            ${DB.members.map(m => `<option>${m.name}</option>`).join('')}
            <option value="">${t('aud_fav_none')}</option>
          </select>
        </div>
        <div class="form-row">
          <label>${t('aud_targets')}</label>
          <input type="text" id="a_targets" placeholder="${t('aud_targets_ph')}" style="flex:1">
          <span style="font-size:11px;color:var(--text3)">${t('aud_targets_tip')}</span>
        </div>
        <div class="form-row">
          <label>${t('aud_th_intheater')}</label>
          <input type="checkbox" id="a_intheater">
          <span style="font-size:12px;color:var(--text2);margin-left:4px">${t('aud_intheater')}</span>
        </div>
        <div class="form-row">
          <label>${t('aud_lastwin')}</label>
          <input type="text" id="a_lastwin" placeholder="${t('aud_lastwin_ph')}" style="flex:1">
        </div>
        <button class="btn btn-primary" onclick="addAudience()">${t('aud_add_btn')}</button>
      </div>
    </details>
  </div>

  <div class="card">
    <div class="card-header">
      <h3>${t('aud_list_title')} <span style="font-weight:400;color:var(--text3)">${t('aud_list_tip')}</span></h3>
      <button class="btn btn-sm" onclick="exportAudiencesCSV()">${t('aud_export')}</button>
    </div>
    <div id="aud_table"></div>
  </div>`;
  refreshAudTable();
}

function refreshAudTable() {
  const el = document.getElementById('aud_table');
  if (!el) return;
  if (!DB.audiences.length) {
    el.innerHTML = `<div class="empty"><div class="empty-icon">👥</div>${t('aud_empty')}</div>`;
    return;
  }
  const list = DB.audiences.slice(0, 100);
  el.innerHTML = `
  <div class="table-wrap"><table>
    <thead><tr>
      <th>${t('aud_th_id')}</th>
      <th>${t('aud_th_gender_age')}</th>
      <th>${t('aud_th_member')}</th>
      <th>${t('aud_th_spend')}</th>
      <th>${t('aud_th_fav')}</th>
      <th>${t('aud_th_lastwin')}</th>
      <th>${t('aud_th_intheater')}</th>
    </tr></thead>
    <tbody>
      ${list.map(a => `<tr>
        <td style="font-family:'DM Mono',monospace;font-size:12px">${a.id}</td>
        <td>${a.gender === 'female' ? t('gender_female') : a.gender === 'male' ? t('gender_male') : t('gender_other')}
            <span style="color:var(--text3)">${a.age}歳</span></td>
        <td>${(() => {
      const types = a.memberTypes || (a.memberType ? [a.memberType] : []);
      return types.length > 0
        ? types.map(type => `<span class="badge ${FRAME_BADGE[type] || 'badge-gray'}" style="font-size:10px;margin-right:2px">${type}</span>`).join('')
        : `<span style="color:var(--text3);font-size:12px">${t('aud_general')}</span>`;
    })()}</td>
        <td style="font-family:'DM Mono',monospace;font-size:12px">¥${a.totalSpend.toLocaleString()}</td>
        <td style="font-size:12px">${a.favoriteMembers || '–'}</td>
        <td style="font-size:12px;color:var(--text3)">${a.lastWinDate || t('aud_not_won')}</td>
        <td style="text-align:center">${a.inTheaterConsumed ? '✓' : ''}</td>
      </tr>`).join('')}
    </tbody>
  </table></div>
  ${DB.audiences.length > 100
      ? `<p style="font-size:12px;color:var(--text3);padding:8px 10px">${t('aud_show_limit')} ${DB.audiences.length} ${t('aud_show_limit2')}</p>`
      : ''}`;
}

// ═══════════════════════════════════════════════════════════
// 面板：公演设置
// ═══════════════════════════════════════════════════════════

function renderPerformance(el) {
  const p = DB.performance;
  const selectedNames = (p.memberNames && p.memberNames.length > 0) ? p.memberNames : [];

  el.innerHTML = `
  <div class="page-header">
    <div><h2>${t('perf_title')}</h2><div class="subtitle">${t('perf_subtitle')}</div></div>
    <button class="btn btn-primary" onclick="savePerformance()">${t('perf_save')}</button>
  </div>

  <div class="grid2">
    <div class="card">
      <div class="card-header"><h3>${t('perf_basic')}</h3></div>
      <div class="form-row">
        <label>${t('perf_name')}</label>
        <input type="text" id="p_name" value="${p.name || ''}" placeholder="${t('perf_name_ph')}" style="flex:1">
      </div>
      <div class="form-row">
        <label>${t('perf_date')}</label>
        <input type="text" id="p_date" value="${p.date || ''}" placeholder="${t('perf_date_ph')}" style="flex:1">
      </div>
      <div class="form-row">
        <label>${t('perf_capacity')}</label>
        <input type="number" id="p_capacity" value="${p.capacity || 200}" min="1" class="w-md">
        <span style="font-size:12px;color:var(--text3)">${t('perf_capacity_unit')}</span>
      </div>
      <div class="form-row">
        <label>${t('perf_price')}</label>
        <input type="number" id="p_price" value="${p.ticketPrice || 3500}" min="0" class="w-md">
        <span style="font-size:12px;color:var(--text3)">${t('perf_price_unit')}</span>
      </div>
    </div>

    <div class="card">
      <div class="card-header"><h3>${t('perf_frames')}</h3></div>
      <p style="font-size:12px;color:var(--text3);margin-bottom:10px">${t('perf_frames_tip')}</p>
      ${FRAME_KEYS.map(key => `
      <div class="form-row">
        <label style="min-width:130px;font-size:12px">${FRAME_LABELS[key]}</label>
        <input type="number" id="frame_${key}" value="${(p.frames && p.frames[key]) || 0}" min="0" class="w-sm">
        <span style="font-size:12px;color:var(--text3)">${t('perf_frames_unit')}</span>
      </div>`).join('')}
    </div>
  </div>

  <div class="card">
    <div class="card-header"><h3>${t('perf_members_title')}</h3></div>
    <p style="font-size:12px;color:var(--text3);margin-bottom:10px">
      ${t('perf_members_tip')}
    </p>
    ${DB.members.length
      ? `<div class="tag-list">
          ${DB.members.map(m => `
          <span class="mtag ${selectedNames.includes(m.name) ? 'selected' : ''}"
                data-name="${m.name}"
                onclick="this.classList.toggle('selected'); refreshPriorityOverrides()">
            ${m.name}
          </span>`).join('')}
        </div>`
      : `<div class="empty" style="padding:12px">${t('perf_members_empty')}</div>`
    }
  </div>

  <div class="card" id="priority_overrides_card">
    <div class="card-header"><h3>${t('perf_pri_title')}</h3></div>
    <p style="font-size:12px;color:var(--text3);margin-bottom:12px">
      ${t('perf_pri_tip')}
    </p>
    <div id="priority_overrides_list">
      ${renderPriorityOverrideRows(selectedNames, p.priorityOverrides || {})}
    </div>
  </div>`;
}

// 生成优先度覆盖的行列表（供初始渲染和点击tag时刷新用）
function renderPriorityOverrideRows(selectedNames, overrides) {
  if (!selectedNames.length) {
    return `<p style="font-size:12px;color:var(--text3)">${t('perf_pri_hint')}</p>`;
  }
  return selectedNames.map(name => {
    const member = DB.members.find(m => m.name === name);
    if (!member) return '';
    return `
    <div class="form-row">
      <label style="min-width:100px">${member.name}</label>
      <span style="font-size:11px;color:var(--text3);margin-right:4px">${t('perf_pri_global')} P${member.priority}</span>
      <input type="number" id="perf_pri_${member.name}" min="1" max="10" class="w-sm"
             placeholder="${member.priority}"
             value="${overrides[member.name] || ''}">
    </div>`;
  }).join('');
}

// 点击成员tag时刷新优先度覆盖列表
function refreshPriorityOverrides() {
  const selectedNames = [...document.querySelectorAll('.mtag.selected')].map(t => t.dataset.name);
  const currentOverrides = {};
  // 保留已填入的值
  DB.members.forEach(m => {
    const inp = document.getElementById('perf_pri_' + m.name);
    if (inp && inp.value.trim() !== '') {
      currentOverrides[m.name] = parseInt(inp.value);
    }
  });
  const list = document.getElementById('priority_overrides_list');
  if (list) list.innerHTML = renderPriorityOverrideRows(selectedNames, currentOverrides);
}

// ═══════════════════════════════════════════════════════════
// 面板：抽选配置
// ═══════════════════════════════════════════════════════════

function renderLotteryCfg(el) {
  const cfg = DB.lotteryConfig;

  el.innerHTML = `
  <div class="page-header">
    <div><h2>${t('lcfg_title')}</h2><div class="subtitle">${t('lcfg_subtitle')}</div></div>
  </div>

  <div class="grid2">
    <div class="card">
      <div class="card-header"><h3>${t('lcfg_audience_title')}</h3></div>
      <p style="font-size:12px;color:var(--text3);margin-bottom:12px">${t('lcfg_audience_tip')}</p>
      ${makeSliderRow(t('lcfg_w_gender'), 'wGender', cfg)}
      ${makeSliderRow(t('lcfg_w_age'), 'wAge', cfg)}
      ${makeSliderRow(t('lcfg_w_member'), 'wMember', cfg)}
      ${makeSliderRow(t('lcfg_w_lastwin'), 'wLastWin', cfg)}
      ${makeSliderRow(t('lcfg_w_consumption'), 'wConsumption', cfg)}
    </div>

    <div class="card">
      <div class="card-header"><h3>${t('lcfg_member_title')}</h3></div>
      <p style="font-size:12px;color:var(--text3);margin-bottom:12px">${t('lcfg_member_tip')}</p>
      ${makeSliderRow(t('lcfg_w_priority'), 'wPriority', cfg)}
      ${makeSliderRow(t('lcfg_w_fancount'), 'wFanCount', cfg)}
      <hr class="divider">
      <div class="card-header" style="margin-top:8px"><h3>${t('lcfg_frame_title')}</h3></div>
      <p style="font-size:12px;color:var(--text3);margin-bottom:12px">${t('lcfg_frame_tip')}</p>
      ${FRAME_KEYS.map(key => makeSliderRow(FRAME_LABELS[key], key, cfg.frameWeights, 1, 20)).join('')}
    </div>
  </div>

  <div class="card">
    <div class="card-header"><h3>${t('lcfg_overflow_title')}</h3></div>
    <div style="display:flex;align-items:flex-start;gap:10px">
      <input type="checkbox" id="overflow_chk" ${cfg.overflow ? 'checked' : ''}
             onchange="DB.lotteryConfig.overflow=this.checked;saveDB('lotteryConfig')"
             style="margin-top:3px">
      <div>
        <div style="font-size:13px;color:var(--text)">${t('lcfg_overflow_label')}</div>
        <div style="font-size:12px;color:var(--text3);margin-top:3px">
          ${t('lcfg_overflow_tip')}
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
  const val = obj[key] !== undefined ? obj[key] : 5;
  const isFrame = (obj !== DB.lotteryConfig); // 区分是否是 frameWeights
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
  const key = el.dataset.key;
  const val = +el.value;
  const isFrame = el.dataset.isframe === 'true';
  if (isFrame) DB.lotteryConfig.frameWeights[key] = val;
  else DB.lotteryConfig[key] = val;
  const span = document.getElementById('wval_' + key);
  if (span) span.textContent = val;
  saveDB('lotteryConfig');
}

// ═══════════════════════════════════════════════════════════
// 面板：执行抽选
// ═══════════════════════════════════════════════════════════

function renderRun(el) {
  const p = DB.performance;
  const frameTotal = p.frames ? Object.values(p.frames).reduce((s, v) => s + v, 0) : 0;
  const issues = [];
  if (!DB.audiences.length) issues.push(t('run_issues_audiences'));
  if (!p.capacity) issues.push(t('run_issues_capacity'));

  el.innerHTML = `
  <div class="page-header">
    <div><h2>${t('run_title')}</h2><div class="subtitle">${t('run_subtitle')}</div></div>
  </div>

  <div class="grid4">
    <div class="stat"><div class="stat-val">${DB.audiences.length.toLocaleString()}</div><div class="stat-lbl">${t('run_applicants')}</div></div>
    <div class="stat"><div class="stat-val">${(p.capacity || 0).toLocaleString()}</div><div class="stat-lbl">${t('run_seats')}</div></div>
    <div class="stat"><div class="stat-val">${frameTotal}</div><div class="stat-lbl">${t('run_frame_seats')}</div></div>
    <div class="stat">
      <div class="stat-val">${DB.audiences.length && p.capacity
      ? (p.capacity / DB.audiences.length * 100).toFixed(1) + '%'
      : '–'}</div>
      <div class="stat-lbl">${t('run_base_rate')}</div>
    </div>
  </div>

  <div class="card">
    <div class="card-header"><h3>${t('run_confirm_title')}</h3></div>
    <div style="font-size:13px;color:var(--text2);margin-bottom:10px">
      <strong style="color:var(--text)">${p.name || t('run_no_name')}</strong>
      <span style="margin:0 8px;color:var(--text3)">|</span>${p.date || t('run_no_date')}
      <span style="margin:0 8px;color:var(--text3)">|</span>¥${(p.ticketPrice || 0).toLocaleString()} / 席
    </div>
    <div class="tag-list" style="margin-bottom:12px">
      ${p.frames
      ? Object.entries(p.frames).filter(([, v]) => v > 0).map(([k, v]) =>
        `<span class="badge ${FRAME_BADGE[k] || 'badge-gray'}">${k} ${v}席</span>`
      ).join('')
      : ''}
      <span class="badge badge-gray">${t('run_general')} ${Math.max(0, (p.capacity || 0) - frameTotal)}席</span>
    </div>
    ${issues.length
      ? `<div style="background:var(--red-dim);border:1px solid var(--red);border-radius:var(--radius-sm);padding:10px 12px;font-size:12px;color:var(--red)">
          注意：${issues.join('；')}
        </div>`
      : `<button class="btn btn-primary btn-lg" onclick="runLottery()">${t('run_start')}</button>`}
  </div>
  <div class="card">
    <div class="card-header"><h3>${t('run_observe_title')}</h3></div>
    <div class="form-row">
      <input type="text" id="observe_id" placeholder="${t('run_observe_ph')}" style="flex:1">
      <button class="btn btn-primary" onclick="observeAccount()">${t('run_observe_btn')}</button>
    </div>
    <div id="observe_result"></div>
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
    <div class="card-header"><h3>${t('run_result_title')}</h3></div>
    <div class="grid4" style="margin-bottom:14px">
      <div class="stat"><div class="stat-val" style="color:var(--green)">${stats.winCount}</div><div class="stat-lbl">${t('run_winners')}</div></div>
      <div class="stat"><div class="stat-val" style="color:var(--red)">${stats.loseCount}</div><div class="stat-lbl">${t('run_losers')}</div></div>
      <div class="stat"><div class="stat-val">${(stats.winCount / stats.total * 100).toFixed(1)}%</div><div class="stat-lbl">${t('run_rate')}</div></div>
      <div class="stat"><div class="stat-val">${stats.genderCounts.female}</div><div class="stat-lbl">${t('run_female_won')}</div></div>
    </div>

    <div class="card-header" style="margin-top:4px"><h3>${t('run_frame_dist')}</h3></div>
    <div class="tag-list" style="margin-bottom:14px">
      ${Object.entries(stats.frameCounts).map(([k, v]) =>
    `<span class="badge ${FRAME_BADGE[k] || 'badge-gray'}">${k}: ${v}人 (${(v / stats.winCount * 100).toFixed(0)}%)</span>`
  ).join('')}
    </div>

    <div class="card-header"><h3>${t('run_member_dist')}</h3></div>
    <div class="tag-list">
      ${Object.entries(stats.memberCounts).sort((a, b) => b[1] - a[1]).map(([k, v]) =>
    `<span class="badge badge-blue">${k}: ${v}人</span>`
  ).join('')}
    </div>
  </div>

  <div class="card">
    <div class="card-header">
      <h3>${t('run_list_title')} <span style="font-weight:400;color:var(--text3)">${t('run_list_tip')}</span></h3>
      <div style="display:flex;gap:8px">
        <button class="btn btn-sm" onclick="exportWinnersCSV()">${t('run_export_winners')}</button>
        <button class="btn btn-danger btn-sm" onclick="exportLosersCSV()">${t('run_export_losers')}</button>
      </div>
    </div>
    <div class="table-wrap"><table>
      <thead><tr>
        <th>${t('run_th_id')}</th>
        <th>${t('run_th_frame')}</th>
        <th>${t('run_th_gender_age')}</th>
        <th>${t('run_th_member')}</th>
        <th>${t('run_th_fav')}</th>
        <th>${t('run_th_spend')}</th>
      </tr></thead>
      <tbody>
        ${winners.slice(0, 100).map(w => `<tr>
          <td style="font-family:'DM Mono',monospace;font-size:12px">${w.id}</td>
          <td><span class="badge ${FRAME_BADGE[w._frame] || 'badge-gray'}">${w._frame}</span></td>
          <td>${w.gender === 'female' ? t('gender_female') : w.gender === 'male' ? t('gender_male') : t('gender_other')}
              <span style="color:var(--text3)">${w.age}歳</span></td>
          <td style="font-size:12px">${w.memberType || '–'}</td>
          <td style="font-size:12px">${w.favoriteMembers || '–'}</td>
          <td style="font-family:'DM Mono',monospace;font-size:12px">¥${w.totalSpend.toLocaleString()}</td>
        </tr>`).join('')}
      </tbody>
    </table></div>
  </div>`;
}
function observeAccount() {
  const id  = document.getElementById('observe_id').value.trim();
  const el  = document.getElementById('observe_result');
  if (!id || !el) return;

  const audience = DB.audiences.find(a => a.id === id);
  if (!audience) {
    el.innerHTML = `<p style="font-size:13px;color:var(--red);margin-top:8px">${t('run_observe_not_found')}</p>`;
    return;
  }

  // 从 winLog 里找该账号的所有当选记录
  const logs = (DB.winLog || []).filter(w => w.id === id);

  const types = audience.memberTypes || (audience.memberType ? [audience.memberType] : []);

  el.innerHTML = `
  <div style="margin-top:12px">
    <div class="grid4" style="margin-bottom:12px">
      <div class="stat">
        <div class="stat-val" style="color:var(--green)">${logs.length}</div>
        <div class="stat-lbl">${t('run_observe_win_count')}</div>
      </div>
      <div class="stat">
        <div class="stat-val" style="font-size:16px">
          ${audience.gender === 'female' ? t('gender_female') : audience.gender === 'male' ? t('gender_male') : t('gender_other')}
          ${audience.age}歳
        </div>
        <div class="stat-lbl">${t('run_observe_gender')} / ${t('run_observe_age')}</div>
      </div>
      <div class="stat">
        <div class="stat-val" style="font-size:14px">¥${audience.totalSpend.toLocaleString()}</div>
        <div class="stat-lbl">${t('run_observe_spend')}</div>
      </div>
      <div class="stat">
        <div class="stat-val" style="font-size:14px">${audience.favoriteMembers || '–'}</div>
        <div class="stat-lbl">${t('run_observe_fav')}</div>
      </div>
    </div>

    <div style="font-size:12px;color:var(--text2);margin-bottom:10px;display:flex;gap:8px;flex-wrap:wrap">
      <span>${t('run_observe_id')}：<strong style="color:var(--text)">${audience.id}</strong></span>
      <span style="color:var(--text3)">|</span>
      <span>${t('run_observe_member')}：${
        types.length > 0
          ? types.map(type => `<span class="badge ${FRAME_BADGE[type] || 'badge-gray'}" style="font-size:10px">${type}</span>`).join(' ')
          : t('aud_general')
      }</span>
      <span style="color:var(--text3)">|</span>
      <span>${t('run_observe_lastwin')}：${audience.lastWinDate || t('aud_not_won')}</span>
      <span style="color:var(--text3)">|</span>
      <span>${t('run_observe_intheater')}：${audience.inTheaterConsumed ? '✓' : '–'}</span>
    </div>

    <div class="card-header"><h3>${t('run_observe_win_log')}</h3></div>
    ${logs.length === 0
      ? `<p style="font-size:12px;color:var(--text3)">${t('run_observe_no_log')}</p>`
      : `<div class="table-wrap"><table>
          <thead><tr>
            <th>${t('run_observe_date')}</th>
            <th>${t('run_observe_frame')}</th>
            <th>${t('perf_name')}</th>
          </tr></thead>
          <tbody>
            ${logs.map(w => `<tr>
              <td style="font-family:'DM Mono',monospace;font-size:12px">${w.date}</td>
              <td><span class="badge ${FRAME_BADGE[w.frame] || 'badge-gray'}">${w.frame}</span></td>
              <td style="font-size:12px;color:var(--text2)">${w.perfName || '–'}</td>
            </tr>`).join('')}
          </tbody>
        </table></div>`
    }
  </div>`;
}

// ── 面板渲染函数映射表（供 switchTab 使用）──────────────────
const PANEL_RENDERERS = {
  members: renderMembers,
  audiences: renderAudiences,
  performance: renderPerformance,
  lottery_cfg: renderLotteryCfg,
  run: renderRun,
};