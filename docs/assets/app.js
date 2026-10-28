const topic = document.body.dataset.topic;
const indoor = topic === 'indoor';
const ternary = topic === 'ternary';
const pages = { binary: 'index.html', ternary: 'ternary.html', indoor: 'indoor.html' };
const labels = { binary: ['标准二元', 'Standard binary'], ternary: ['标准三元', 'Standard ternary'], indoor: ['室内光伏', 'Indoor PV'] };
let language = 'zh';
try { language = localStorage.getItem('opv-language') || 'zh'; } catch { /* Storage is optional. */ }
const t = (zh, en) => language === 'en' ? en : zh;
const $ = id => document.getElementById(id);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const int = n => Number(n || 0).toLocaleString('en-US');
const num = n => n === null || n === undefined || n === '' ? '—' : Number.isFinite(Number(n)) ? Number(n).toLocaleString('en-US', { maximumFractionDigits: 5 }) : esc(n);
const title = () => t(...labels[topic]);
const jscUnit = indoor ? 'µA/cm²' : 'mA/cm²';
const irradianceUnit = indoor ? 'µW/cm²' : 'mW/cm²';
const doiLink = doi => /^10\.\d{4,9}\//i.test(String(doi)) ? `<a class="source-link" href="https://doi.org/${esc(encodeURI(doi))}" target="_blank" rel="noopener noreferrer" title="${esc(doi)}">${esc(doi)} ↗</a>` : esc(doi);
let manifest, allRows = [], filtered = [], currentPage = 1, pageSize = 50, sortKey = 'pce', sortDirection = -1;
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
  document.body.classList.toggle('lang-en', language === 'en');
  document.title = `${title()} | OPV-DB`;
  const subtitle = indoor
    ? t('按实际灯源、照度与辐照度记录室内有机光伏性能，保留器件面积与统计口径。', 'Indoor organic photovoltaic measurements with source-specific lighting, illuminance, irradiance, area and reported statistics.')
    : ternary
      ? t('三个独立光活性组分，保留组分角色、配比、器件工艺与来源。', 'Three independent photoactive components, with component roles, blend ratios, device processing and source provenance.')
      : t('二元有机光伏器件的材料、性能与制备条件，每条记录均关联来源 DOI。', 'Materials, performance and processing conditions for binary organic photovoltaic devices, linked to source DOIs.');
  const stats = manifest?.topics[topic];
  $('app').innerHTML = `
    <header class="masthead"><div class="wrap">
      <a class="brand" href="index.html"><img src="assets/icon.svg" alt=""><strong>OPV-DB</strong><span>Organic Photovoltaic Device Database</span></a>
      <div class="header-links"><a class="github" href="https://github.com/sunyrain/OPV2D" target="_blank" rel="noopener">GitHub ↗</a><a href="archive-v1.1.0.html">${t('v1.1.0 归档', 'v1.1.0 archive')}</a><button class="language" id="language" type="button">${t('English', '中文')}</button></div>
    </div></header>
    <nav class="topic-nav" aria-label="${t('光伏专题', 'Photovoltaic topics')}"><div class="wrap">${Object.entries(pages).map(([key, url]) => `<a class="topic-link" href="${url}" ${key === topic ? 'aria-current="page"' : ''}><span>${t(...labels[key])}</span><span class="nav-count" id="count-${key}">${manifest ? int(manifest.topics[key].rows) : '—'}</span></a>`).join('')}</div></nav>
    <main class="wrap">
      <section class="hero"><div><p class="eyebrow">LITERATURE-MINED · ${indoor ? 'INDOOR PHOTOVOLTAICS' : ternary ? 'TERNARY ORGANIC SOLAR CELLS' : 'BINARY ORGANIC SOLAR CELLS'}</p><h1>${title()}</h1><p class="subtitle">${subtitle}</p></div><div class="hero-mark">${t('网站数据快照', 'Website data snapshot')}<strong>2026.10.28</strong><span>${t('按原文条件组织 · 可追溯', 'Source-linked measurements')}</span></div></section>
      <section class="stats" id="stats" aria-label="${t('专题规模', 'Topic statistics')}">${statsMarkup(stats)}</section>
      <div class="scope-note"><span class="symbol" aria-hidden="true">↳</span><p>${indoor
        ? t('室内记录按实际条件保留，可包含三元、大面积和组件器件。照度与辐照度分别展示；不同灯源与光强下的 PCE 不宜直接排名比较。', 'Indoor records may include ternary devices, large areas and modules. Illuminance and irradiance are separate; PCE values under different spectra and intensities are not directly comparable.')
        : t('标准范围：有机、实验单结、AM1.5G、100 mW/cm²、面积 <1 cm²。默认视图移出已知不符条件的记录；条件缺失的历史记录保留并明确标记。', 'Target scope: organic, experimental, single junction, AM1.5G, 100 mW/cm² and area <1 cm². The default view excludes known incompatible conditions; retained legacy rows with missing conditions remain labelled.')}
        <a id="method-link" href="#methodology">${t('查看规则 →', 'Read scope rules →')}</a></p></div>
      <section id="records" aria-labelledby="records-title">
        <div class="section-heading"><div><p class="overline">${t('检索 · 筛选 · 追溯来源', 'SEARCH · FILTER · TRACE')}</p><h2 id="records-title">${t('器件数据', 'Device observations')}</h2></div>
          <details class="downloads"><summary>${t('下载数据', 'Download data')} ↓</summary><div class="download-menu">
            <a href="downloads/${topic}.csv" download>${t('本专题完整 CSV', 'Full topic CSV')}<small>${stats ? (stats.csv_bytes / 1e6).toFixed(1) + ' MB' : 'CSV'}</small></a>
            <a href="downloads/${topic}.json" download>${t('本专题完整 JSON', 'Full topic JSON')}<small>JSON</small></a>
            <a class="sep" href="downloads/OPV_three_topics_20261028.zip" download>${t('三个专题 CSV 合集', 'All three topics · CSV ZIP')}<small>ZIP</small></a>
            <a href="downloads/field_dictionary.csv" download>${t('字段字典', 'Field dictionary')}<small>CSV</small></a>
            <a href="downloads/README.txt" target="_blank">${t('数据说明与版本信息', 'Data notes & version')}</a>
          </div></details>
        </div>
        <div class="panel">
          <form id="filters" class="filters"><fieldset id="filter-fields" ${ready ? '' : 'disabled'}><div class="filter-grid">
            <div class="field"><label for="search">${t('搜索', 'Search')}</label><input id="search" type="search" placeholder="${t('材料、DOI、记录 ID、溶剂或器件层序', 'Material, DOI, record ID, solvent or stack')}" autocomplete="off"></div>
            <div class="field"><label for="view">${indoor ? t('活性层体系', 'Composition') : t('数据范围', 'Data scope')}</label><select id="view">${indoor
              ? option('all', t('全部室内记录', 'All indoor records')) + option('binary', t('二元', 'Binary')) + option('ternary', t('三元', 'Ternary')) + option('other', t('其他体系', 'Other compositions'))
              : option('scope', t('标准范围（含待补齐）', 'Standard scope + incomplete')) + option('documented', t('标准条件齐全', 'Conditions documented')) + option('outside', t('扩展条件', 'Extended conditions')) + option('all', t('本专题全部记录', 'All topic records'))}</select></div>
            <div class="field"><label for="statistic">${t('报告统计口径', 'Reported statistic')}</label><select id="statistic">${option('all', t('全部口径', 'All statistics')) + option('champion', t('冠军 / 最佳值', 'Champion / best')) + option('mean', t('平均值', 'Mean')) + option('certified', t('认证值', 'Certified')) + option('unknown', t('口径未说明', 'Unspecified')) + option('other', t('其他口径', 'Other'))}</select></div>
            <div class="field"><label for="specific">${indoor ? t('灯源类型', 'Light source') : ternary ? t('给受体构成', 'Component roles') : t('分子结构', 'Molecular structures')}</label><select id="specific">${indoor
              ? option('all', t('全部灯源', 'All light sources')) + option('led', 'LED') + option('fluorescent', t('荧光灯', 'Fluorescent')) + option('halogen', t('卤素灯', 'Halogen')) + option('other', t('其他 / 未知', 'Other / unknown'))
              : ternary ? option('all', t('全部构成', 'All systems')) + option('1d2a', t('1 给体 + 2 受体', '1 donor + 2 acceptors')) + option('2d1a', t('2 给体 + 1 受体', '2 donors + 1 acceptor')) + option('other', t('其他 / 待确认', 'Other / unresolved'))
              : option('all', t('全部记录', 'All records')) + option('both', t('双侧 SMILES 齐全', 'Both SMILES available')) + option('missing', t('SMILES 待补齐', 'Missing SMILES'))}</select></div>
          </div><div class="filter-bottom"><div class="checks"><label class="check"><input type="checkbox" id="quartet">${t('四项性能数值齐全', 'All four metrics available')}</label><label class="check"><input type="checkbox" id="area">${t('已报告面积', 'Area reported')}</label>${indoor ? `<label class="check"><input type="checkbox" id="irradiance">${t('已报告辐照度', 'Irradiance reported')}</label>` : ''}</div><button class="text-button" type="reset">${t('重置筛选', 'Reset filters')}</button></div>
          <details class="advanced"><summary>${t('性能与条件区间', 'Performance & condition ranges')}</summary><div class="range-fields">
            <div class="field"><label for="pce-min">${t('PCE 最低 (%)', 'Min. PCE (%)')}</label><input id="pce-min" type="number" step="any" min="0" placeholder="—"></div><div class="field"><label for="pce-max">${t('PCE 最高 (%)', 'Max. PCE (%)')}</label><input id="pce-max" type="number" step="any" min="0" placeholder="—"></div>
            ${indoor ? `<div class="field"><label for="lux-min">${t('最低照度 (lx)', 'Min. illuminance (lx)')}</label><input id="lux-min" type="number" min="0" step="any" placeholder="—"></div><div class="field"><label for="lux-max">${t('最高照度 (lx)', 'Max. illuminance (lx)')}</label><input id="lux-max" type="number" min="0" step="any" placeholder="—"></div>` : ''}
          </div></details><p class="filter-error" id="filter-error" role="alert" hidden></p></fieldset></form>
          <div class="result-bar"><div><strong id="result-count" aria-live="polite">${t('正在载入…', 'Loading…')}</strong><p class="result-note">${t('空白信息以 — 显示；点击详情查看字段定义与原文定位。', 'Missing values show —. Open details for field definitions and source locators.')}</p></div><div class="table-actions"><button class="btn-outline" id="export-filtered" type="button" disabled>${t('导出筛选 · 浏览字段 CSV', 'Export filtered · browser columns')}</button><label for="page-size">${t('每页', 'Rows/page')}</label><select id="page-size"><option>25</option><option selected>50</option><option>100</option></select></div></div>
          <div id="load-state" class="loading" role="status">${t('正在载入本专题数据…', 'Loading this topic…')}</div>
          <div class="table-scroll" id="table-scroll" tabindex="0" role="region" aria-label="${t('器件数据表，可横向滚动', 'Device data table; scroll horizontally')}" hidden><table id="device-table"><thead id="table-head"></thead><tbody id="table-body"></tbody></table></div>
          <div class="pagination" id="pagination" hidden><span id="page-info"></span><div class="page-buttons"><button id="previous" type="button">← ${t('上一页', 'Previous')}</button><span id="page-number"></span><button id="next" type="button">${t('下一页', 'Next')} →</button></div></div>
        </div>
      </section>
      <details class="methodology" id="methodology"><summary>${t('收录规则、统计口径与版本说明', 'Scope, statistical definitions & version notes')}</summary><div class="method-grid">
        <div><h3>01 / ${t('专题范围', 'Topic scope')}</h3><p>${indoor
          ? t('仅展示室内专题的原始实验观测。保留实际灯源、照度、辐照度、面积及器件形式；三元、大面积、组件等可以在本专题中同时出现。µA/cm² 与 mA/cm²、µW/cm² 与 mW/cm² 分别使用，lux 不换算为辐照度。', 'Primary experimental indoor observations retain their actual lamp, illuminance, irradiance, area and device form. Ternary devices, large areas and modules may overlap this topic. Indoor current density uses µA/cm² and irradiance uses µW/cm². Lux is not converted to irradiance.')
          : t('标准条件齐全要求显式记录相应组分、有机材料、实验测量、单结、AM1.5G、100 mW/cm² 以及面积 <1 cm²。缺字段的记录归入待补齐；已知面积 ≥1 cm²、组件/串联、室内或其他光强记录进入扩展视图。表格优先显示孔径面积，其次器件/活性面积；详情保留各面积定义。', 'The documented view requires explicit composition, organic materials, experimental measurement, single junction, AM1.5G, 100 mW/cm² and area <1 cm². Missing conditions remain unresolved. Known area ≥1 cm², modules/tandems, indoor or other intensities enter the extended view. Displayed area prefers aperture, then device/active area; separate definitions remain in details.')}</p></div>
        <div><h3>02 / ${t('数值与质量', 'Values & quality')}</h3><p>${t('保留已整理表中的报告值与逐指标统计口径。同一条件下明确冠军值优先，无冠军定义时使用明确平均值；不把口径未说明的数值自动改为冠军值，也不拼接不同条件的四项性能。四项数值齐全仅代表字段完整。模型来源复核不等于独立人工核验；历史基线记录并非全部在本轮重提取。', 'Reported values and per-metric statistics are preserved. Explicit champion values take priority within the same condition, followed by explicit means; unspecified statistics are not relabelled. Metrics from different conditions are not combined. Numeric completeness is not accuracy. Model-assisted source review is not independent human validation, and legacy rows were not all re-extracted in this batch.')}</p></div>
        <div><h3>03 / ${t('版本与使用', 'Version & reuse')}</h3><p>${t('此页面为 2026-10-28 整理快照，尚未分配新的 Zenodo 版本 DOI。v1.1.0 DOI 仅标识先前归档，不代表当前三表。完整下载包含专题的扩展条件和已保存科学字段；不包含本地全文与内部审计文件。允许跨专题重合，三表行数不能简单相加为独立器件数。', 'This is the 2026-10-28 curated website snapshot; no new Zenodo version DOI has been assigned. The v1.1.0 DOI identifies the previous archive, not these three updated tables. Full downloads include extended conditions and populated scientific fields, without local article text or internal audits. Topics may overlap; their row totals are not counts of unique devices.')}</p><p><a href="downloads/README.txt" target="_blank">${t('完整数据说明 ↗', 'Complete data notes ↗')}</a></p></div>
      </div></details>
    </main>
    <footer class="site-footer"><div class="wrap"><div class="footer-inner"><div><strong>OPV-DB</strong><p>${t('有机光伏器件文献数据库 · 数据许可 CC BY 4.0', 'Literature-mined organic photovoltaic devices · Data: CC BY 4.0')}</p></div><div class="footer-links"><a href="https://doi.org/10.5281/zenodo.22177960" target="_blank" rel="noopener">${t('先前归档 DOI · v1.1.0 ↗', 'Previous archive DOI · v1.1.0 ↗')}</a><a href="downloads/field_dictionary.csv" download>${t('字段字典', 'Field dictionary')}</a><a href="https://github.com/sunyrain/OPV2D/issues" target="_blank" rel="noopener">${t('反馈数据问题 ↗', 'Report a data issue ↗')}</a></div></div><p class="footer-note">${t('引用时请注明当前快照日期，并引用对应源文献。此快照不应标注为已发布的 v1.1.0 数据。', 'Identify the snapshot date and cite the corresponding source papers. Do not attribute this updated snapshot to the published v1.1.0 data.')}</p></div></footer>
    <dialog id="detail-modal" class="modal" aria-labelledby="detail-title"><div class="modal-header"><div><h2 id="detail-title">${t('记录详情', 'Observation details')}</h2><p id="detail-id"></p></div><button id="close-modal" class="close-modal" type="button" aria-label="${t('关闭详情', 'Close details')}">×</button></div><div id="detail-body" class="modal-body"></div></dialog>`;
  for (const [id, value] of Object.entries(preserved)) {
    const input = $(id);
    if (input) input.type === 'checkbox' ? input.checked = value : input.value = value;
  }
  $('page-size').value = String(pageSize);
  bind();
  if (ready) applyFilters(false);
  else if (loadError) showLoadError();
}

function statsMarkup(s) {
  const cards = [
    [t('本专题记录', 'Topic observations'), s?.rows, t('完整专题，包含扩展条件', 'Full topic, including extended conditions')],
    [t('来源 DOI', 'Source DOIs'), s?.dois, t('按表内 DOI 去重', 'Distinct DOIs within this topic')],
    [t('四项性能数值齐全', 'Four numeric metrics'), s?.quartets, t('PCE · Vₒ꜀ · Jₛ꜀ · FF', 'PCE · Vₒ꜀ · Jₛ꜀ · FF')],
    [indoor ? t('已报告照度', 'Illuminance reported') : t('标准条件齐全', 'Conditions documented'), indoor ? s?.lux_reported : s?.scope.documented || 0,
      indoor ? t('保留原始 lux，不换算光强', 'Original lux; no intensity conversion') : t('仅计显式条件字段齐全的记录', 'Explicit scope fields; not an accuracy score')],
  ];
  return cards.map(([label, value, note]) => `<div class="stat"><span class="stat-label">${label}</span><strong class="stat-value">${s ? int(value) : '—'}</strong><span class="stat-note">${note}</span></div>`).join('');
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
    if (!indoor && f.view !== 'all' && (f.view === 'scope' ? r.scope_status === 'outside' : r.scope_status !== f.view)) return false;
    if (indoor && f.view !== 'all' && (f.view === 'other' ? ['binary', 'ternary'].includes(r.composition) : r.composition !== f.view)) return false;
    if (f.statistic !== 'all' && statGroup(r.statistic) !== f.statistic) return false;
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
  const base = [['materials', t('活性层材料', 'Active-layer materials'), ''], ['pce', 'PCE', '%'], ['voc', 'Vₒ꜀', 'V'], ['jsc', 'Jₛ꜀', jscUnit], ['ff', 'FF', '%'], ['statistic', t('统计口径', 'Statistic'), '']];
  return [...base, ...(indoor ? [['light', t('灯源 / 色温', 'Light / CCT'), 'K'], ['lux', t('照度', 'Illuminance'), 'lx'], ['irradiance', t('辐照度', 'Irradiance'), irradianceUnit]] : [['scope_status', t('测量范围', 'Scope status'), '']]), ['area', t('面积', 'Area'), 'cm²'], ['doi', t('来源 DOI', 'Source DOI'), ''], ['detail', t('详情', 'Details'), '']];
}

function renderTable() {
  const cols = columns();
  $('table-head').innerHTML = `<tr>${cols.map(([key, label, unit]) => `<th scope="col" ${key === sortKey ? `aria-sort="${sortDirection > 0 ? 'ascending' : 'descending'}"` : ''}>${key !== 'detail' ? `<button class="sort" type="button" data-sort="${key}">${label}<small aria-hidden="true">${key === sortKey ? sortDirection > 0 ? '↑' : '↓' : '↕'}</small></button>` : label}${unit ? `<span class="unit">${unit}</span>` : ''}</th>`).join('')}</tr>`;
  const maxPage = Math.max(1, Math.ceil(filtered.length / pageSize));
  currentPage = Math.min(Math.max(currentPage, 1), maxPage);
  const start = (currentPage - 1) * pageSize;
  const current = filtered.slice(start, start + pageSize);
  $('table-body').innerHTML = current.length ? current.map(r => `<tr>${cols.map(([key]) => `<td class="${key === 'materials' ? 'materials' : ['pce','voc','jsc','ff','lux','irradiance','area'].includes(key) ? 'numeric' : ''}">${cell(r, key)}</td>`).join('')}</tr>`).join('') : `<tr><td colspan="${cols.length}" class="empty">${t('没有符合当前筛选的记录。可清空搜索或放宽筛选条件。', 'No matching observations. Clear the search or broaden the filters.')}</td></tr>`;
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
  if (key === 'materials') return `<span class="material-name" title="${esc(r.materials.join(' : '))}">${esc(r.materials.join(' : '))}</span><div class="material-sub" title="${esc(r.ratio || '')}">${r.ratio ? esc(r.ratio) : r.system ? esc(r.system.toUpperCase()) : t('配比未说明', 'Ratio unspecified')}</div>`;
  if (key === 'pce') return `<span class="pce-value">${num(r.pce)}</span>`;
  if (key === 'statistic') return `<span class="statistic-badge" title="${esc(r.statistic)}">${esc(statLabel(r.statistic))}</span>`;
  if (key === 'scope_status') return badge(r);
  if (key === 'doi') return doiLink(r.doi) + `<div class="source-year">${r.year || ''}</div>`;
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
    const [meta, payload] = await Promise.all([getJSON('data/manifest.json?v=20261028'), getJSON(`data/${topic}.json?v=20261028`)]);
    manifest = meta;
    allRows = payload.rows.map(values => {
      const r = Object.fromEntries(payload.fields.map((field, i) => [field, values[i]]));
      r.searchText = [r.id, r.doi, ...r.materials, r.solvent, r.device, r.source_table, r.ratio].join(' ').toLowerCase();
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
    if (!chunks.has(row.detail_chunk)) chunks.set(row.detail_chunk, await getJSON(`data/details/${topic}/${row.detail_chunk}.json?v=20261028`));
    if (!dictionary) dictionary = await getJSON('data/dictionary.json?v=20261028');
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
    return `<div class="detail-field"><dt>${esc(key)}${description ? `<small>${esc(description)}</small>` : ''}</dt><dd class="${typeof value === 'object' ? 'json' : ''}">${key.endsWith('doi') || key === 'doi' ? doiLink(formatted) : esc(formatted)}</dd></div>`;
  }).join('') : `<p class="empty">${t('没有匹配字段。', 'No matching fields.')}</p>`;
}

function csvCell(value) {
  let str = Array.isArray(value) ? value.join(' | ') : String(value ?? '');
  if (/^[=+@\t\r]/.test(str) || (/^-/.test(str) && !Number.isFinite(Number(str)))) str = "'" + str;
  return '"' + str.replaceAll('"', '""') + '"';
}
function exportFiltered() {
  const fields = ['id','doi','year','materials','composition','system','pce','voc','jsc','ff','statistic','scope_status','scope_reasons','area','spectrum','irradiance','lux','light','cct','source_table','ratio'];
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
