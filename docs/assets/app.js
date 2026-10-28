import { classicShell, classicStats, loadPageViews } from './classic-shell.js?v=20261028-classic';
const topic = document.body.dataset.topic;
const indoor = topic === 'indoor';
const ternary = topic === 'ternary';
const pages = { binary: 'index.html', ternary: 'ternary.html', indoor: 'indoor.html' };
const labels = { binary: ['标准二元', 'Standard binary'], ternary: ['标准三元', 'Standard ternary'], indoor: ['室内光伏', 'Indoor PV'] };
let language = 'en';
try { language = localStorage.getItem('opv-language') || 'en'; } catch { /* Storage is optional. */ }
const t = (zh, en) => language === 'en' ? en : zh;
const $ = id => document.getElementById(id);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const int = n => Number(n || 0).toLocaleString('en-US');
const num = n => n === null || n === undefined || n === '' ? '—' : Number.isFinite(Number(n)) ? Number(n).toLocaleString('en-US', { maximumFractionDigits: 5 }) : esc(n);
const title = () => t(...labels[topic]);
const jscUnit = indoor ? 'µA/cm²' : 'mA/cm²';
const irradianceUnit = indoor ? 'µW/cm²' : 'mW/cm²';
const doiLink = doi => /^10\.\d{4,9}\//i.test(String(doi)) ? `<a class="source-link" href="https://doi.org/${esc(encodeURI(doi))}" target="_blank" rel="noopener noreferrer" title="${esc(doi)}">${esc(doi)} ↗</a>` : esc(doi);
let manifest, allRows = [], filtered = [], currentPage = 1, pageSize = 100, sortKey = 'pce', sortDirection = -1;
let dictionary, detailRecord, activeDetailId, loadError = '', ready = false, searchTimer;
const chunks = new Map();

function scopeLabel(value) {
  return ({ documented: t('标准条件齐全', 'Conditions documented'), unresolved: t('条件待补齐', 'Conditions incomplete'), outside: t('扩展条件', 'Extended conditions'), indoor: t('室内观测', 'Indoor observation') })[value] || value;
}
function badge(r) {
  return `<span class="badge ${r.scope_status === 'unresolved' ? 'unknown' : r.scope_status === 'outside' ? 'outside' : ''}">${esc(scopeLabel(r.scope_status))}</span>`;
}
function statGroup(value) {
  const s = String(value || '').toLowerCase();
  // Explicit PCE labels only; reported/unknown values are never assumed to be champions.
  if (/mixed/.test(s)) return 'other';
  if (/champion|best|maximum/.test(s)) return 'champion';
  if (/mean|average/.test(s)) return 'mean';
  if (/certified/.test(s)) return 'certified';
  if (/unspecified|^reported$|unknown/.test(s)) return 'unknown';
  return 'other';
}
function statLabel(value) {
  const s = String(value || 'reported_unspecified');
  const simple = { champion: t('冠军值', 'Champion'), best: t('最佳值', 'Best'), maximum: t('最大值', 'Maximum'), mean: t('平均值', 'Mean'), certified: t('认证值', 'Certified'), reported: t('口径未说明', 'Unspecified'), reported_unspecified: t('口径未说明', 'Unspecified') };
  return simple[s] || s.replaceAll('_', ' ');
}
const option = (value, label) => `<option value="${esc(value)}">${esc(label)}</option>`;
function snapshotForm() {
  return Object.fromEntries([...document.querySelectorAll('#filters input, #filters select')].map(el => [el.id, el.type === 'checkbox' ? el.checked : el.value]));
}

function shell(preserved = {}) {
  document.documentElement.lang = language === 'en' ? 'en' : 'zh-CN';
  document.title = `${title()} | OPV-DB`;
  $('app').innerHTML = classicShell({ topic, t, esc, labels, pages, manifest, ready, title, statsMarkup, option });
  for (const [id, value] of Object.entries(preserved)) {
    const input = $(id);
    if (input) input.type === 'checkbox' ? input.checked = value : input.value = value;
  }
  $('page-size').value = String(pageSize);
  bind();
  if (ready) { renderSummaryBars(); applyFilters(false); }
  else if (loadError) showLoadError();
  loadPageViews();
}

function statsMarkup(s) { return classicStats(s, topic, t); }

function errorBucket(value) {
  if (value === null || value === undefined) return 'unchecked';
  return value <= 2 ? '<=2%' : value <= 5 ? '2-5%' : value <= 10 ? '5-10%' : '>10%';
}

function renderSummaryBars() {
  const s = manifest.topics[topic], total = allRows.length;
  const count = predicate => allRows.filter(predicate).length;
  const tiers = topic === 'binary' ? [
    [t('完整专题', 'Full topic'),total,'blue'], [t('四项指标齐全', 'All four metrics'),s.quartets,'teal'],
    [t('严格性能子集', 'Strict performance'),s.strict_performance,'green'], [t('严格分子子集', 'Strict molecular'),s.strict_molecular,'green']
  ] : indoor ? [
    [t('全部室内记录','All indoor records'),total,'blue'],[t('二元','Binary'),count(r=>r.composition==='binary'),'teal'],
    [t('三元','Ternary'),count(r=>r.composition==='ternary'),'green'],[t('其他体系','Other compositions'),count(r=>!['binary','ternary'].includes(r.composition)),'amber']
  ] : [
    [t('完整专题','Full topic'),total,'blue'],[t('标准范围','Standard scope'),total-(s.scope.outside||0),'teal'],
    [t('标准条件齐全','Conditions documented'),s.scope.documented||0,'green'],[t('扩展条件','Extended conditions'),s.scope.outside||0,'amber']
  ];
  const quality = topic === 'binary' ? [
    [t('PCE 公式偏差 ≤2%','PCE error ≤2%'),count(r=>r.pce_error!==null&&r.pce_error<=2),'green'],
    [t('PCE 公式偏差 ≤10%','PCE error ≤10%'),count(r=>r.pce_error!==null&&r.pce_error<=10),'teal'],
    [t('双侧 SMILES','Both SMILES'),s.has_smiles,'purple'],[t('器件层序','Device stack'),s.has_structure,'blue'],
    [t('溶剂','Solvent'),count(r=>r.solvent!==null),'amber'],[t('添加剂','Additive'),count(r=>r.additive!==null),'red']
  ] : [
    [t('四项指标齐全','All four metrics'),s.quartets,'green'],[t('面积已报告','Area reported'),s.area_reported,'teal'],
    [t('辐照度已报告','Irradiance reported'),s.irradiance_reported,'purple'],[indoor?t('照度已报告','Illuminance reported'):t('器件层序','Device stack'),indoor?s.lux_reported:s.has_structure,'blue'],
    [t('溶剂','Solvent'),count(r=>r.solvent!==null),'amber'],[t('添加剂','Additive'),count(r=>r.additive!==null),'red']
  ];
  const bars = list => list.map(([label,value,color])=>`<div class="bar-row"><div class="bar-label">${esc(label)}</div><div class="bar-track"><div class="bar-fill ${color}" style="width:${total?Math.min(100,value/total*100):0}%"></div></div><div class="bar-value">${int(value)}</div></div>`).join('');
  $('tierBars').innerHTML=bars(tiers); $('qualityBars').innerHTML=bars(quality);
}

function bind() {
  $('language').addEventListener('click', () => {
    const saved = snapshotForm();
    language = language === 'zh' ? 'en' : 'zh';
    try { localStorage.setItem('opv-language', language); } catch { /* Storage is optional. */ }
    shell(saved);
    $('language').focus();
  });
  $('method-link').addEventListener('click', () => $('methodology').open = true);
  $('filters').addEventListener('submit', e => { e.preventDefault(); clearTimeout(searchTimer); applyFilters(); });
  $('filters').addEventListener('input', () => { clearTimeout(searchTimer); searchTimer = setTimeout(() => applyFilters(), 180); });
  $('filters').addEventListener('change', () => { clearTimeout(searchTimer); applyFilters(); });
  $('filters').addEventListener('reset', () => { clearTimeout(searchTimer); setTimeout(() => applyFilters(), 0); });
  $('page-size').addEventListener('change', e => { pageSize = Number(e.target.value); currentPage = 1; renderTable(); });
  $('previous').addEventListener('click', () => { currentPage--; renderTable(); });
  $('next').addEventListener('click', () => { currentPage++; renderTable(); });
  $('export-filtered').addEventListener('click', exportFiltered);
  $('close-modal').addEventListener('click', () => $('detail-modal').close());
  $('detail-modal').addEventListener('click', e => { if (e.target === $('detail-modal') && (e.offsetX < 0 || e.offsetY < 0 || e.offsetX > e.target.clientWidth || e.offsetY > e.target.clientHeight)) e.target.close(); });
  $('table-body').addEventListener('click', e => {
    const button = e.target.closest('[data-detail]');
    if (button) openDetail(allRows.find(r => r.id === button.dataset.detail));
    else if (!e.target.closest('a')) {
      const row = e.target.closest('[data-record]');
      if (row) openDetail(allRows.find(r => r.id === row.dataset.record));
    }
  });
  $('table-head').addEventListener('click', e => {
    const button = e.target.closest('[data-sort]');
    if (!button) return;
    const key = button.dataset.sort;
    sortDirection = key === sortKey ? -sortDirection : ['materials', 'doi', 'scope_status', 'statistic', 'light'].includes(key) ? 1 : -1;
    sortKey = key;
    currentPage = 1;
    sortRows(); renderTable();
    document.querySelector(`[data-sort="${key}"]`)?.focus();
  });
}

function lightGroup(value) {
  const s = String(value || '').toLowerCase();
  return /led/.test(s) ? 'led' : /fluorescen/.test(s) ? 'fluorescent' : /halogen/.test(s) ? 'halogen' : 'other';
}

function applyFilters(resetPage = true) {
  if (!ready) return;
  const f = snapshotForm();
  const terms = (f.search || '').trim().toLowerCase().split(/\s+/).filter(Boolean);
  const low = f['pce-min'] === '' ? null : Number(f['pce-min']);
  const high = f['pce-max'] === '' ? null : Number(f['pce-max']);
  const luxLow = !indoor || f['lux-min'] === '' ? null : Number(f['lux-min']);
  const luxHigh = !indoor || f['lux-max'] === '' ? null : Number(f['lux-max']);
  const invalid = (low !== null && high !== null && low > high) || (luxLow !== null && luxHigh !== null && luxLow > luxHigh) || !$('filters').checkValidity();
  $('filter-error').hidden = !invalid;
  $('filter-error').textContent = invalid ? t('请输入有效区间：最小值不能超过最大值，且数值应为非负。', 'Enter a valid non-negative range; minimum must not exceed maximum.') : '';
  filtered = invalid ? [] : allRows.filter(r => {
    if (terms.some(term => !r.searchText.includes(term))) return false;
    if (!indoor && f.view !== 'all') {
      if (f.view === 'strict_performance' || f.view === 'strict_molecular') { if (!r[f.view]) return false; }
      else if (f.view === 'scope' ? r.scope_status === 'outside' : r.scope_status !== f.view) return false;
    }
    if (indoor && f.view !== 'all' && (f.view === 'other' ? ['binary', 'ternary'].includes(r.composition) : r.composition !== f.view)) return false;
    if (f.statistic !== 'all' && statGroup(r.statistic) !== f.statistic) return false;
    if (f['error-filter'] && f['error-filter'] !== 'all' && errorBucket(r.pce_error) !== f['error-filter']) return false;
    if (f.process !== 'all' && (r[f.process] === null || r[f.process] === '' || r[f.process] === false)) return false;
    if (f.quartet && !r.quartet) return false;
    if (f.area && r.area === null) return false;
    if (f.irradiance && r.irradiance === null) return false;
    if (low !== null && (r.pce === null || r.pce < low)) return false;
    if (high !== null && (r.pce === null || r.pce > high)) return false;
    if (luxLow !== null && (r.lux === null || r.lux < luxLow)) return false;
    if (luxHigh !== null && (r.lux === null || r.lux > luxHigh)) return false;
    if (f.specific !== 'all') {
      if (indoor && lightGroup(r.light) !== f.specific) return false;
      if (ternary && (f.specific === 'other' ? ['1d2a', '2d1a'].includes(r.system) : r.system !== f.specific)) return false;
      if (!indoor && !ternary && (f.specific === 'both' ? !r.has_smiles : r.has_smiles)) return false;
    }
    return true;
  });
  if (resetPage) currentPage = 1;
  sortRows(); renderTable();
}

function sortRows() {
  filtered.sort((a, b) => {
    const x = a[sortKey], y = b[sortKey];
    if (x === null || x === undefined || x === '') return y === null || y === undefined || y === '' ? 0 : 1;
    if (y === null || y === undefined || y === '') return -1;
    if (typeof x === 'number' && typeof y === 'number') return (x - y) * sortDirection;
    return String(x).localeCompare(String(y), 'en', { numeric: true }) * sortDirection;
  });
}

function columns() {
  const source = [['doi','DOI',''],['year',t('年份','Year'),'']];
  const materials = ternary ? [['component_1',t('组分 1','Component 1'),''],['component_2',t('组分 2','Component 2'),''],['component_3',t('组分 3','Component 3'),''],['ratio',t('配比','Ratio'),'']] : [['donor',t('给体','Donor'),''],['acceptor',t('受体','Acceptor'),'']];
  const metrics = [['pce','PCE','%'],['voc','Voc','V'],['jsc','Jsc',jscUnit],['ff','FF','%']];
  const detail = ['detail',t('详情','Details'),''];
  if (topic === 'binary') return [['layer',t('数据层','Layer'),''],...source,...materials,...metrics,['pce_error',t('PCE 公式偏差','PCE error'),'%'],['has_smiles','SMILES',''],['device_type',t('器件','Device'),''],['solvent',t('溶剂','Solvent'),''],['additive',t('添加剂','Additive'),''],['scope_status',t('范围','Scope'),''],detail];
  if (ternary) return [['scope_status',t('范围','Scope'),''],...source,...materials,...metrics,['statistic',t('统计口径','Statistic'),''],['area',t('面积','Area'),'cm²'],['solvent',t('溶剂','Solvent'),''],detail];
  return [['composition',t('体系','Composition'),''],...source,...materials,['light',t('灯源 / 色温','Light / CCT'),'K'],['lux',t('照度','Illuminance'),'lx'],['irradiance',t('辐照度','Irradiance'),irradianceUnit],...metrics,['area',t('面积','Area'),'cm²'],['statistic',t('统计口径','Statistic'),''],['device_type',t('器件','Device'),''],detail];
}

function renderTable() {
  const cols = columns();
  $('table-head').innerHTML = `<tr>${cols.map(([key, label, unit]) => `<th scope="col" ${key === sortKey ? `aria-sort="${sortDirection > 0 ? 'ascending' : 'descending'}"` : ''}>${key !== 'detail' ? `<button class="sort" type="button" data-sort="${key}">${label}<small aria-hidden="true">${key === sortKey ? sortDirection > 0 ? '↑' : '↓' : '↕'}</small></button>` : label}${unit ? `<span class="unit">${unit}</span>` : ''}</th>`).join('')}</tr>`;
  const maxPage = Math.max(1, Math.ceil(filtered.length / pageSize));
  currentPage = Math.min(Math.max(currentPage, 1), maxPage);
  const start = (currentPage - 1) * pageSize;
  const current = filtered.slice(start, start + pageSize);
  $('table-body').innerHTML = current.length ? current.map(r => `<tr data-record="${esc(r.id)}">${cols.map(([key]) => `<td class="${['pce','voc','jsc','ff','lux','irradiance','area','pce_error'].includes(key) ? 'numeric' : ''}">${cell(r, key)}</td>`).join('')}</tr>`).join('') : `<tr><td colspan="${cols.length}" class="empty">${t('没有符合当前筛选的记录。可清空搜索或放宽筛选条件。', 'No matching observations. Clear the search or broaden the filters.')}</td></tr>`;
  $('load-state').hidden = true;
  $('table-scroll').hidden = false;
  $('pagination').hidden = false;
  $('result-count').textContent = t(`${int(filtered.length)} 条记录 · ${int(new Set(filtered.map(r => r.doi.toLowerCase())).size)} 个 DOI`, `${int(filtered.length)} observations · ${int(new Set(filtered.map(r => r.doi.toLowerCase())).size)} DOIs`);
  $('page-info').textContent = filtered.length ? `${int(start + 1)}–${int(Math.min(start + pageSize, filtered.length))} / ${int(filtered.length)}` : '0 / 0';
  $('page-number').textContent = `${currentPage} / ${maxPage}`;
  $('previous').disabled = currentPage === 1;
  $('next').disabled = currentPage === maxPage;
  $('export-filtered').disabled = !filtered.length;
}

function cell(r, key) {
  if (key === 'year') return esc(r.year || '—');
  if (key === 'layer') return r.strict_molecular ? `<span class="pill green">${t('严格分子','Strict molecular')}</span>` : r.strict_performance ? `<span class="pill blue">${t('严格性能','Strict performance')}</span>` : `<span class="pill">${t('仅完整专题','Full only')}</span>`;
  if (key === 'has_smiles') return r.has_smiles ? `<span class="pill green">${t('双侧','Both')}</span>` : `<span class="pill">${t('缺失','Missing')}</span>`;
  if (key === 'pce_error') { const b=errorBucket(r.pce_error); return `<span class="pill ${b==='<=2%'?'green':b==='unchecked'?'':b==='>10%'?'red':'amber'}" title="${r.pce_error===null?'':esc(num(r.pce_error)+'%')}">${b==='unchecked'?t('未核算','Unchecked'):esc(b.replace('<=','≤'))}</span>`; }
  if (['donor','acceptor','component_1','component_2','component_3','solvent','additive','device_type','ratio','composition'].includes(key)) return `<span class="material-name" title="${esc(r[key] || '')}">${esc(r[key] || '—')}</span>`;
  if (key === 'materials') return `<span class="material-name" title="${esc(r.materials.join(' : '))}">${esc(r.materials.join(' : '))}</span><div class="material-sub" title="${esc(r.ratio || '')}">${r.ratio ? esc(r.ratio) : r.system ? esc(r.system.toUpperCase()) : t('配比未说明', 'Ratio unspecified')}</div>`;
  if (key === 'pce') return `<span class="pce-value">${num(r.pce)}</span>`;
  if (key === 'statistic') return `<span class="statistic-badge" title="${esc(r.statistic)}">${esc(statLabel(r.statistic))}</span>`;
  if (key === 'scope_status') return badge(r);
  if (key === 'doi') return doiLink(r.doi);
  if (key === 'light') return `<span class="light-cell">${esc(r.light || '—')}<small>${r.cct ? num(r.cct) + ' K' : ''}</small></span>`;
  if (key === 'detail') return `<button type="button" class="row-details" data-detail="${esc(r.id)}" aria-label="${esc(t('查看记录 ', 'Open observation ') + r.id)}">${t('查看', 'View')} ↗</button>`;
  return num(r[key]);
}

async function getJSON(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

async function load() {
  loadError = '';
  $('load-state').className = 'loading';
  $('load-state').textContent = t('正在载入本专题数据…', 'Loading this topic…');
  try {
    const [meta, payload] = await Promise.all([getJSON('data/manifest.json?v=20261028-classic'), getJSON(`data/${topic}.json?v=20261028-classic`)]);
    manifest = meta;
    allRows = payload.rows.map(values => {
      const r = Object.fromEntries(payload.fields.map((field, i) => [field, values[i]]));
      r.component_1=r.materials[0]; r.component_2=r.materials[1]; r.component_3=r.materials[2];
      r.layer=r.strict_molecular?'Strict molecular':r.strict_performance?'Strict performance':'Full only';
      r.searchText = [r.id, r.doi, ...r.materials, r.donor_smiles, r.acceptor_smiles, r.solvent, r.additive, r.device, r.source_table, r.ratio].join(' ').toLowerCase();
      return r;
    });
    ready = true;
    shell(snapshotForm());
    // Optional direct record/search links are scoped to the selected topic.
    const params = new URLSearchParams(location.search);
    if (params.has('q')) { $('search').value = params.get('q'); applyFilters(); }
    if (params.has('record')) {
      const r = allRows.find(row => row.id === params.get('record'));
      if (r) openDetail(r);
    }
  } catch (error) {
    loadError = error.message;
    showLoadError();
  }
}

function showLoadError() {
  $('load-state').className = 'empty';
  $('load-state').innerHTML = `${t('数据暂未载入，请重试。也可直接下载 CSV。', 'Could not load data. Retry or download the CSV directly.')} <button class="btn-outline" id="retry" type="button">${t('重试', 'Retry')}</button>`;
  $('result-count').textContent = t('载入失败', 'Load failed');
  $('retry').addEventListener('click', load);
}

async function openDetail(row) {
  if (!row) return;
  activeDetailId = row.id;
  $('detail-id').textContent = row.id;
  $('detail-body').innerHTML = `<p class="loading">${t('载入原始字段…', 'Loading record fields…')}</p>`;
  $('detail-modal').showModal();
  try {
    if (!chunks.has(row.detail_chunk)) chunks.set(row.detail_chunk, await getJSON(`data/details/${topic}/${row.detail_chunk}.json?v=20261028-classic`));
    if (!dictionary) dictionary = await getJSON('data/dictionary.json?v=20261028-classic');
    if (activeDetailId !== row.id || !$('detail-modal').open) return;
    detailRecord = chunks.get(row.detail_chunk)[row.id];
    if (!detailRecord) throw new Error('Missing record');
    $('detail-body').innerHTML = `<div class="detail-head"><div><h3>${esc(row.materials.join(' : '))}</h3><p>${doiLink(row.doi)}</p></div>${badge(row)}</div>
      <div class="detail-metrics">${[['pce','PCE','%'],['voc','Vₒ꜀','V'],['jsc','Jₛ꜀',jscUnit],['ff','FF','%']].map(([k,l,u]) => `<div><span>${l} · ${u}</span><strong>${num(row[k])}</strong></div>`).join('')}</div>
      <p class="detail-note">${t('报告统计口径：', 'Reported statistic: ')}${esc(statLabel(row.statistic))}。${t('逐指标定义见 metric_statistics；缺失条件不作推断，数值齐全不代表口径一致或人工核验。', 'See metric_statistics for per-metric definitions. Missing conditions are not inferred; numeric completeness is not statistical consistency or human validation.')}</p>
      <div class="section-heading"><h3>${t('已保存字段', 'Populated fields')}</h3><button class="btn-outline" id="download-record" type="button">${t('下载此记录 JSON', 'Download record JSON')}</button></div>
      <div class="field field-search"><label for="detail-search">${t('筛选字段', 'Filter fields')}</label><input id="detail-search" type="search" placeholder="${t('如：面积、溶剂、metric_statistics', 'e.g. area, solvent, metric_statistics')}"></div><dl id="detail-fields" class="detail-fields"></dl>`;
    renderFields();
    $('detail-search').addEventListener('input', renderFields);
    $('download-record').addEventListener('click', () => download(new Blob([JSON.stringify(detailRecord, null, 2)], { type: 'application/json;charset=utf-8' }), `${topic}-${row.id.replace(/[^a-z0-9_-]/gi, '_')}.json`));
  } catch {
    if (activeDetailId === row.id) {
      $('detail-body').innerHTML = `<p>${t('字段未能载入，请重试。', 'Could not load record fields. Please retry.')} <button class="btn-outline" id="retry-detail" type="button">${t('重试', 'Retry')}</button></p>`;
      $('retry-detail').addEventListener('click', () => openDetail(row));
    }
  }
}

function renderFields() {
  const query = $('detail-search').value.trim().toLowerCase();
  const definitions = new Map(dictionary.filter(f => f.topic === topic).map(f => [f.field, f]));
  const priority = ['doi','origin_doi','extraction_doi','source_doi','source_table','source_row','statistic','metric_statistics','website_scope_status','website_scope_reasons','remaining_issues'];
  const fields = Object.entries(detailRecord).filter(([k,v]) => `${k} ${definitions.get(k)?.description_zh || ''} ${JSON.stringify(v)}`.toLowerCase().includes(query));
  fields.sort(([a],[b]) => (priority.includes(a) ? priority.indexOf(a) - 1000 : 0) - (priority.includes(b) ? priority.indexOf(b) - 1000 : 0));
  $('detail-fields').innerHTML = fields.length ? fields.map(([key, value]) => {
    const def = definitions.get(key);
    const description = language === 'zh' ? def?.description_zh : def?.unit ? `Unit: ${def.unit}` : '';
    const formatted = typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
    return `<div class="detail-field ${typeof value === 'object' || formatted.length > 160 ? 'wide' : ''}"><dt>${esc(key)}${description ? `<small>${esc(description)}</small>` : ''}</dt><dd class="${typeof value === 'object' ? 'json' : ''}">${key.endsWith('doi') || key === 'doi' ? doiLink(formatted) : esc(formatted)}</dd></div>`;
  }).join('') : `<p class="empty">${t('没有匹配字段。', 'No matching fields.')}</p>`;
}

function csvCell(value) {
  let str = Array.isArray(value) ? value.join(' | ') : String(value ?? '');
  if (/^[=+@\t\r]/.test(str) || (/^-/.test(str) && !Number.isFinite(Number(str)))) str = "'" + str;
  return '"' + str.replaceAll('"', '""') + '"';
}
function exportFiltered() {
  const fields = ['id','doi','year','donor','acceptor','donor_smiles','acceptor_smiles','materials','composition','system','pce','voc','jsc','ff','statistic','scope_status','scope_reasons','area','spectrum','irradiance','lux','light','cct','source_table','ratio','device_type','solvent','additive','thickness','annealing','pce_error','strict_performance','strict_molecular'];
  const headers = fields.map(k => ({ pce:'pce_percent', voc:'voc_v', jsc: indoor ? 'jsc_ua_cm2' : 'jsc_ma_cm2', ff:'ff_percent', area:'display_area_cm2', irradiance: indoor ? 'irradiance_uw_cm2' : 'irradiance_mw_cm2', lux:'illuminance_lux', cct:'cct_k' })[k] || k);
  const content = '\ufeff' + [headers.map(csvCell).join(','), ...filtered.map(r => fields.map(k => csvCell(r[k])).join(','))].join('\r\n');
  download(new Blob([content], { type:'text/csv;charset=utf-8' }), `OPV-${topic}-filtered-20261028.csv`);
}
function download(blob, name) {
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = name; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

shell();
load();
