/**
 * engine.js — 核心抽选权重算法
 *
 * 职责：纯计算，不触碰 DOM，不直接读写 DB。
 * 所有函数均接受参数，便于单元测试和后续替换算法。
 *
 * 扩展方法：
 *   - 新增权重因子：在 calcWeight() 里追加逻辑，并在 db.js 的 lotteryConfig 默认值里加对应字段。
 *   - 替换抽选算法：只需重写 weightedDraw()，接口不变（pool[], n → {winners[], losers[]}）。
 */

/**
 * 计算单个观众的抽选权重。
 *
 * @param {Object} audience  - 观众数据对象（来自 DB.audiences）
 * @param {Object} cfg       - 抽选配置（来自 DB.lotteryConfig）
 * @param {Set}    perfMemberSet - 本次参演成员名称集合
 * @param {Array}  members   - 成员列表（来自 DB.members），用于查找推し信息
 * @returns {number} 权重值（≥ 0.01）
 */
function calcWeight(audience, cfg, perfMemberSet, members) {
  const a = audience;
  let w = 1.0;

  // ── 性别加权（女性优先）──
  if (cfg.wGender > 0 && a.gender === 'female') {
    w += cfg.wGender * 0.5;
  }

  // ── 年龄加权（未满25岁，越年轻加成越高）──
  if (cfg.wAge > 0 && a.age < 25) {
    w += cfg.wAge * (1 - a.age / 25) * 0.5;
  }

  // ── 消费金额加权（对数平滑，避免高消费者碾压）──
  if (cfg.wConsumption > 0 && a.totalSpend > 0) {
    w += cfg.wConsumption * Math.log10(a.totalSpend + 1) * 0.2;
  }

  // ── 久未中签加权 ──
  if (cfg.wLastWin > 0) {
    if (!a.lastWinDate) {
      // 从未中签：最大加权
      w += cfg.wLastWin * 1.0;
    } else {
      const daysSince = (Date.now() - new Date(a.lastWinDate).getTime()) / 86400000;
      // 距上次中签越久，加权越高，上限为 1.5 倍系数
      w += cfg.wLastWin * Math.min(daysSince / 60, 1.5) * 0.5;
    }
  }

  // ── 推し在参演成员中时，根据成员属性加权 ──
  if ((cfg.wPriority > 0 || cfg.wFanCount > 0) && a.favoriteMembers) {
    const favMember = members.find(m => m.name === a.favoriteMembers);
    if (favMember && perfMemberSet.has(favMember.name)) {
      // 优先使用公演级别的覆盖优先度，没有则用成员全局优先度
      const overrides = (typeof DB !== 'undefined' && DB.performance.priorityOverrides) || {};
      const priority = overrides[favMember.name] !== undefined
        ? overrides[favMember.name]
        : favMember.priority;
      w += cfg.wPriority * priority * 0.05;
      w += cfg.wFanCount * Math.log10(favMember.fanCount + 1) * 0.1;
    }
  }

  // ── 会员枠倍率（乘法，让枠内成员获得整体提升）──
  const types = a.memberTypes || (a.memberType ? [a.memberType] : []);
  if (types.length > 0 && cfg.wMember > 0) {
    const maxMult = Math.max(...types.map(t => cfg.frameWeights[t] || 1));
    w *= (1 + (maxMult - 1) * cfg.wMember / 10);
  }

  return Math.max(w, 0.01);
}

/**
 * 加权随机抽选（无放回）。
 * 使用累积分布函数 (CDF) + 二分查找，时间复杂度 O(k·log n)。
 *
 * @param {Array}    pool       - 候选观众数组
 * @param {number}   n          - 需要抽取的人数
 * @param {Function} weightFn   - (audience) => number，权重函数
 * @returns {{ winners: Array, losers: Array }}
 */
function weightedDraw(pool, n, weightFn) {
  if (!pool.length || n <= 0) {
    return { winners: [], losers: [...pool] };
  }

  const k = Math.min(n, pool.length);
  const weights = pool.map(a => weightFn(a));
  const total = weights.reduce((s, w) => s + w, 0);

  // 构建 CDF
  const cdf = [];
  let acc = 0;
  weights.forEach((w, i) => {
    acc += w;
    cdf.push({ threshold: acc, index: i });
  });

  // 无放回抽样（二分查找加速）
  const chosen = new Set();
  let attempts = 0;
  const maxAttempts = k * 30; // 防止极端情况死循环

  while (chosen.size < k && attempts++ < maxAttempts) {
    const r = Math.random() * total;
    // 二分查找第一个 threshold >= r 的项
    let lo = 0, hi = cdf.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cdf[mid].threshold < r) lo = mid + 1;
      else hi = mid;
    }
    if (!chosen.has(cdf[lo].index)) {
      chosen.add(cdf[lo].index);
    }
  }

  const winners = [...chosen].map(i => pool[i]);
  const winnerIds = new Set(winners.map(a => a.id));
  const losers = pool.filter(a => !winnerIds.has(a.id));

  return { winners, losers };
}

/**
 * 执行完整的分枠抽选流程。
 *
 * @param {Object} opts
 * @param {Array}  opts.audiences     - 全部报名观众
 * @param {Object} opts.performance   - 公演设置（capacity, frames, memberNames）
 * @param {Object} opts.lotteryConfig - 抽选权重配置
 * @param {Array}  opts.members       - 成员列表
 * @returns {{ allWinners: Array, stats: Object }}
 *   allWinners: 每个元素附带 _frame 字段（枠名称）
 *   stats:      { total, winCount, loseCount, frameCounts, memberCounts, genderCounts }
 */
function runLotteryEngine({ audiences, performance: perf, lotteryConfig: cfg, members }) {
  const capacity = perf.capacity || 200;
  const frames = perf.frames || {};
  const perfMembers = new Set(perf.memberNames || []);

  // 绑定参数，生成当次抽选专用的权重函数
  const weightFn = (a) => calcWeight(a, cfg, perfMembers, members);

  // ── 按会员类型分组 ──────────────────────────────────────────
  const frameKeys = Object.keys(frames).filter(k => frames[k] > 0);
  const grouped = { __general__: [] };
  frameKeys.forEach(k => { grouped[k] = []; });

  DB.audiences.forEach(a => {
    const types = a.memberTypes || (a.memberType ? [a.memberType] : []);
    const validFrames = types.filter(t => frames[t] > 0);
    if (validFrames.length === 0) {
      grouped['__general__'].push(a);
    } else {
      validFrames.forEach(t => grouped[t].push(a));
    }
  });

  // ── 各枠抽选 ────────────────────────────────────────────────
  const allWinners = [];
  const loserOverflow = [];
  const wonIds = new Set(); // 已当选的观众ID，防止同一人多次当选
  let generalSeats = capacity - frameKeys.reduce((s, k) => s + frames[k], 0);

  frameKeys.forEach(k => {
    const seats = frames[k];
    // 排除已当选的观众
    const pool = (grouped[k] || []).filter(a => !wonIds.has(a.id));
    const { winners, losers } = weightedDraw(pool, seats, weightFn);

    winners.forEach(w => {
      allWinners.push({ ...w, _frame: k });
      wonIds.add(w.id);
    });
    loserOverflow.push(...losers);

    if (cfg.overflow && winners.length < seats) {
      generalSeats += (seats - winners.length);
    }
  });

  // 一般枠也排除已当选的观众
  const generalPool = [
    ...(grouped['__general__'] || []),
    ...(cfg.overflow ? loserOverflow : []),
  ].filter(a => !wonIds.has(a.id));

  // ── 一般枠抽选（含溢出） ─────────────────────────────────────
  const { winners: generalWinners } = weightedDraw(
    generalPool, Math.max(generalSeats, 0), weightFn
  );
  generalWinners.forEach(w => allWinners.push({ ...w, _frame: '一般' }));

  // ── 统计数据 ─────────────────────────────────────────────────
  const frameCounts = {};
  const memberCounts = {};
  const genderCounts = { male: 0, female: 0, other: 0 };

  allWinners.forEach(w => {
    frameCounts[w._frame] = (frameCounts[w._frame] || 0) + 1;
    if (w.favoriteMembers) {
      memberCounts[w.favoriteMembers] = (memberCounts[w.favoriteMembers] || 0) + 1;
    }
    genderCounts[w.gender] = (genderCounts[w.gender] || 0) + 1;
  });

  return {
    allWinners,
    stats: {
      total: audiences.length,
      winCount: allWinners.length,
      loseCount: audiences.length - allWinners.length,
      frameCounts,
      memberCounts,
      genderCounts,
    },
  };
}
