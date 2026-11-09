// The archived v1.1.0 layout, with topic-specific fields and the current data snapshot.
export function classicStats(s, topic, t) {
  const n = value => s ? Number(value || 0).toLocaleString('en-US') : '—';
  const base = [[t('完整专题', 'Full topic'), s?.rows, t('本专题全部记录', 'all topic observations'), 'blue'], [t('来源 DOI', 'Source DOIs'), s?.dois, t('记录级来源', 'record-level provenance'), 'teal']];
  const cards = topic === 'binary' ? [...base,
    [t('严格性能子集', 'Strict performance'), s?.strict_performance, t('已发布子集', 'published subset'), 'green'],
    [t('严格分子子集', 'Strict molecular'), s?.strict_molecular, t('已发布子集', 'published subset'), 'purple'],
    [t('四项指标齐全', 'All four metrics'), s?.quartets, 'PCE · Voc · Jsc · FF', 'amber'],
    [t('双侧 SMILES', 'Paired SMILES'), s?.has_smiles, t('给体与受体结构', 'donor and acceptor structures'), 'gray']]
    : topic === 'ternary' ? [...base,
      [t('三组分名称齐全', 'Three component names'), s?.three_names, t('名称已报告', 'reported names'), 'green'],
      [t('三组分角色齐全', 'Three component roles'), s?.three_roles, t('给体或受体角色', 'donor or acceptor roles'), 'purple'],
      [t('四项指标齐全', 'All four metrics'), s?.quartets, 'PCE · Voc · Jsc · FF', 'amber'],
      [t('组分配比', 'Composition ratio'), s?.composition_ratio, t('报告的混合比例', 'reported blend ratio'), 'gray']]
    : [...base,
      [t('四项指标齐全', 'All four metrics'), s?.quartets, 'PCE · Voc · Jsc · FF', 'green'],
      [t('照度已报告', 'Illuminance'), s?.lux_reported, 'lux', 'purple'],
      [t('辐照度已报告', 'Irradiance'), s?.irradiance_reported, 'µW/cm²', 'amber'],
      [t('面积已报告', 'Device / aperture area'), s?.area_reported, 'cm²', 'gray']];
  return cards.map(([label, value, sub, color]) => `<div class="stat ${color}"><div class="label">${label}</div><div class="value">${n(value)}</div><div class="sub">${sub}</div></div>`).join('');
}

export function classicShell({ topic, t, esc, labels, pages, manifest, ready, title, statsMarkup, option }) {
  const indoor = topic === 'indoor', ternary = topic === 'ternary';
  return `
  <header class="site-header"><div class="header-inner"><div>
    <h1>OPV-DB Literature-Mined Device Dataset</h1>
    <p class="subtitle">${t('文献挖掘的有机光伏器件数据库：标准二元、标准三元与室内光伏专题。', 'A literature-mined organic photovoltaic device database with standard binary, standard ternary and indoor photovoltaic topics.')}</p>
  </div><div class="header-actions">
    <a class="btn" href="https://github.com/sunyrain/OPV2D" target="_blank" rel="noopener">GitHub</a>
    <a class="btn" href="https://doi.org/10.5281/zenodo.23951239" target="_blank" rel="noopener">Zenodo v2.0.0</a>
    <a class="btn" href="downloads/${topic}.json" download>JSON</a><a class="btn" href="downloads/${topic}.csv" download>CSV</a>
    <a class="btn" href="archive-v1.1.0.html">${t('v1.1.0 归档', 'v1.1.0 archive')}</a><button class="btn" id="language" type="button">${t('English', '中文')}</button>
  </div></div></header>
  <main class="wrap">
    <nav class="topic-nav" aria-label="${t('光伏专题', 'Photovoltaic topics')}">${Object.entries(pages).map(([key, url]) => `<a class="btn topic-link ${key === topic ? 'btn-primary' : ''}" href="${url}" ${key === topic ? 'aria-current="page"' : ''}>${t(...labels[key])}<span class="topic-count">${manifest ? manifest.topics[key].rows.toLocaleString('en-US') : '—'}</span></a>`).join('')}</nav>
    <section class="release-strip"><div><div class="release-title">${title()} · ${t('整理数据浏览', 'Curated data browser')}</div>
      <div class="release-note">${indoor
        ? t('保留实际灯源、照度、辐照度与面积。室内专题允许包含三元、大面积和组件；不同光照下的 PCE 不宜直接比较。', 'Indoor observations retain the reported lamp, illuminance, irradiance and area. Ternary devices, large areas and modules may overlap this topic; PCE values at different lighting conditions are not directly comparable.')
        : t('采用已发布的标准器件数据：有机、实验单结、AM1.5G、100 mW/cm²、面积 <1 cm²。未报告的条件保持缺失。三元专题为补充收集，文献覆盖不完整。', 'Published standard-device collections target organic, experimental, single-junction devices under AM1.5G, 100 mW/cm², with area <1 cm². Unreported conditions remain unspecified. Ternary literature coverage is partial.')}</div>
      <div class="release-id">OPV-DB v2.0.0 · <a href="https://doi.org/10.5281/zenodo.23951239" target="_blank" rel="noopener">10.5281/zenodo.23951239</a> · <a id="method-link" href="#methodology">${t('范围与统计说明', 'Scope and statistics')}</a></div>
    </div><span class="pill blue">${t('更新', 'Updated')} 2026-11-10</span></section>
    <section class="stats-grid" id="stats">${statsMarkup(manifest?.topics[topic])}</section>
    <section class="panel"><div class="panel-header"><h2 class="panel-title">${t('筛选', 'Filters')}</h2><div class="header-actions">
      <button class="btn btn-secondary" id="export-filtered" type="button" disabled>${t('筛选结果 CSV', 'Filtered CSV')}</button><button class="btn" type="reset" form="filters">${t('清空', 'Clear')}</button>
    </div></div><div class="panel-body"><form id="filters"><fieldset id="filter-fields" ${ready ? '' : 'disabled'}><div class="toolbar">
      <div class="field"><label for="search">${t('搜索', 'Search')}</label><input id="search" type="search" placeholder="${t('DOI、材料、SMILES、器件层序', 'DOI, materials, SMILES, device stack')}" autocomplete="off"></div>
      <div class="field"><label for="view">${indoor ? t('活性层体系', 'Composition') : t('数据子集', 'Dataset subset')}</label><select id="view">${indoor
        ? option('all', t('全部室内记录', 'All indoor records')) + option('binary', t('二元', 'Binary')) + option('ternary', t('三元', 'Ternary')) + option('other', t('其他体系', 'Other compositions'))
        : option('all', t('全部发布记录', 'All published records')) + (!ternary ? option('strict_performance', t('严格性能子集', 'Strict performance')) + option('strict_molecular', t('严格分子子集', 'Strict molecular')) : '')}</select></div>
      <div class="field"><label for="pce-min">${t('PCE 最低', 'PCE min')} (%)</label><input id="pce-min" type="number" min="0" step="any" placeholder="0"></div>
      <div class="field"><label for="pce-max">${t('PCE 最高', 'PCE max')} (%)</label><input id="pce-max" type="number" min="0" step="any" placeholder="${indoor ? '50' : '30'}"></div>
      ${!indoor && !ternary ? `<div class="field"><label for="error-filter">${t('PCE 公式偏差', 'PCE error')}</label><select id="error-filter">${option('all',t('全部','All')) + option('<=2%','≤2%') + option('2-5%','2–5%') + option('5-10%','5–10%') + option('>10%','>10%') + option('unchecked',t('未核算','Unchecked'))}</select></div>` : statisticField(t, option)}
      <div class="field"><label for="specific">${indoor ? t('灯源', 'Light source') : ternary ? t('给受体构成', 'System') : 'SMILES'}</label><select id="specific">${indoor
        ? option('all', t('全部灯源', 'All sources')) + option('led', 'LED') + option('fluorescent', t('荧光灯', 'Fluorescent')) + option('halogen', t('卤素灯', 'Halogen')) + option('other', t('其他 / 未知', 'Other / unknown'))
        : ternary ? option('all', t('全部构成', 'All systems')) + option('1d2a', '1D + 2A') + option('2d1a', '2D + 1A') + option('other', t('其他 / 未知', 'Other / unknown'))
        : option('all', t('全部', 'All')) + option('both', t('给体与受体均有', 'Both donor and acceptor')) + option('missing', t('缺失一侧或两侧', 'Missing one or both'))}</select></div>
      <div class="field"><label for="process">${t('工艺信息', 'Process metadata')}</label><select id="process">${option('all',t('全部','All')) + option('has_structure',t('器件层序','Device stack')) + option('solvent',t('溶剂','Solvent')) + option('additive',t('添加剂','Additive')) + option('thickness',t('厚度','Thickness')) + option('annealing',t('退火','Annealing'))}</select></div>
      <button class="btn btn-primary" type="submit">${t('应用', 'Apply')}</button>
    </div><div class="filter-extras">${!indoor && !ternary ? statisticField(t, option) : ''}
      <label class="check"><input type="checkbox" id="quartet">${t('四项指标齐全', 'All four metrics')}</label><label class="check"><input type="checkbox" id="area">${t('已报告面积', 'Area reported')}</label>
      ${indoor ? `<label class="check"><input type="checkbox" id="irradiance">${t('已报告辐照度', 'Irradiance reported')}</label><div class="field"><label for="lux-min">${t('最低照度', 'Lux min')}</label><input id="lux-min" type="number" min="0" step="any" placeholder="0"></div><div class="field"><label for="lux-max">${t('最高照度', 'Lux max')}</label><input id="lux-max" type="number" min="0" step="any" placeholder="—"></div>` : ''}
    </div><p class="error" id="filter-error" role="alert" hidden></p></fieldset></form></div></section>
    <section class="summary-grid"><div class="panel"><div class="panel-header"><h2 class="panel-title">${topic === 'binary' ? t('基准数据层', 'Benchmark layers') : t('专题数据层', 'Topic layers')}</h2></div><div class="panel-body" id="tierBars"></div></div>
      <div class="panel"><div class="panel-header"><h2 class="panel-title">${t('数据完整性与诊断', 'Validation and completeness')}</h2></div><div class="panel-body" id="qualityBars"></div></div></section>
    <section class="panel" id="records"><div class="panel-header"><h2 class="panel-title">${t('器件记录', 'Device records')}</h2><span class="pill" id="result-count" aria-live="polite">${t('载入中…', 'Loading…')}</span></div>
      <div class="loading" id="load-state" role="status">${t('正在载入 OPV-DB 记录…', 'Loading OPV-DB records…')}</div>
      <div class="table-wrap" id="table-scroll" tabindex="0" role="region" aria-label="${t('器件记录，可横向滚动', 'Device records, scroll horizontally')}" hidden><table id="device-table"><thead id="table-head"></thead><tbody id="table-body"></tbody></table></div>
      <div class="status-line" id="pagination" hidden><span id="page-info"></span><div class="pagination"><label for="page-size">${t('每页', 'Rows/page')}</label><select id="page-size"><option>25</option><option>50</option><option selected>100</option></select><button id="previous" type="button">${t('上一页', 'Previous')}</button><span id="page-number"></span><button id="next" type="button">${t('下一页', 'Next')}</button></div></div>
    </section>
    <details id="methodology" class="panel methodology"><summary>${t('收录规则、统计口径和下载', 'Scope, statistics and downloads')}</summary><div class="panel-body">
      <p>${t('本网站对应 Zenodo v2.0.0。标准二元为主数据集；三元和室内光伏为覆盖部分文献的补充专题。已识别的二元对照不属于三元表。室内专题保存实际光源和测量条件。', 'This browser presents Zenodo v2.0.0. Standard binary devices form the primary collection; ternary and indoor photovoltaics are complementary collections with partial literature coverage. Identified binary controls are excluded from the ternary table. Indoor observations retain their actual light sources and measurement conditions.')}</p>
      <p>${t('严格性能子集要求来源和材料字段、完整的四项性能、规定的数值范围、名义光强下 PCE 相对偏差 ≤2%，并按公开规则去重。严格分子子集进一步要求给体和受体 SMILES 齐全。网站直接使用已发布的两个子集。', 'The strict performance subset requires source and material fields, a complete performance quartet, specified numerical ranges and a relative PCE difference ≤2% at nominal irradiance, followed by the published duplicate-selection rules. The strict molecular subset additionally requires both donor and acceptor SMILES. The browser uses the two deposited subsets directly.')}</p>
      <p>${t('主 PCE 保留该条观察的统计含义；有来源支持的均值、最佳值和逐指标统计说明分别保存。室内 Jsc 使用 µA/cm²，辐照度使用 µW/cm²，照度以 lux 单独记录。', 'The principal PCE preserves the reported statistical meaning of the observation. Source-supported mean and best values, and per-metric statistics, are recorded separately. Indoor Jsc is expressed in µA/cm², irradiance in µW/cm² and illuminance separately in lux.')}</p>
      <p>${t('顶部 CSV 与发布表完全一致，二元主表为 37 列；二元补充表单独下载。二元 JSON 和记录详情按 ID 合并主表与补充表。筛选 CSV 导出当前浏览字段。跨专题记录可以重合。', 'The header CSV downloads are identical to the deposited tables. The binary main table retains 37 columns, with its supplement available separately. Binary JSON and record details join the two tables by ID. Filtered CSV exports the current browser fields. Observations can overlap across topics.')}</p>
      <div class="header-actions"><a class="btn" href="downloads/OPV-DB_v2.0.0_data.zip" download>${t('完整发布数据 ZIP', 'Complete data ZIP')}</a>${topic === 'binary' ? `<a class="btn" href="downloads/binary_supplement.csv" download>${t('二元补充表', 'Binary supplement')}</a><a class="btn" href="downloads/binary_strict_performance.csv" download>${t('严格性能 CSV', 'Strict performance CSV')}</a><a class="btn" href="downloads/binary_strict_molecular.csv" download>${t('严格分子 CSV', 'Strict molecular CSV')}</a>` : ''}<a class="btn" href="downloads/field_dictionary.csv" download>${t('字段字典', 'Field dictionary')}</a><a class="btn" href="downloads/subset_rules.json" download>${t('子集规则', 'Subset rules')}</a><a class="btn" href="downloads/README.txt" target="_blank">${t('数据说明', 'Data notes')}</a></div>
    </div></details>
  </main>
  <footer class="footer"><div class="footer-inner"><div class="footer-stat"><div class="footer-label">Page views</div><div class="footer-count" id="pageViewCount">—</div><div class="footer-count-note">Since August 2026</div></div><div class="footer-citations"><h2 class="footer-heading">Dataset and related work</h2><div class="citation-list">
    <a class="citation-item" href="https://doi.org/10.5281/zenodo.23951239" target="_blank" rel="noopener"><span class="citation-label">Zenodo dataset · v2.0.0</span><span class="citation-title">OPV-DB: a literature-mined organic photovoltaic device performance dataset</span><span class="citation-arrow">↗</span></a>
    <a class="citation-item" href="https://doi.org/10.1609/aaai.v40i45.41224" target="_blank" rel="noopener"><span class="citation-label">AAAI 2026</span><span class="citation-title">CycleChemist: A Dual-Pronged Machine Learning Framework for Organic Photovoltaic Discovery</span><span class="citation-arrow">↗</span></a>
    <a class="citation-item" href="https://openreview.net/forum?id=hvsO7Ws4GC" target="_blank" rel="noopener"><span class="citation-label">ICLR Workshop 2025</span><span class="citation-title">Accelerating High-Efficiency Organic Photovoltaic Discovery via Pretrained Graph Neural Networks and Generative Reinforcement Learning</span><span class="citation-arrow">↗</span></a>
  </div></div></div></footer>
  <dialog id="detail-modal" class="modal" aria-labelledby="detail-title"><div class="modal-header"><div><h3 class="modal-title" id="detail-title">${t('记录详情', 'Record detail')}</h3><small id="detail-id"></small></div><button class="btn" id="close-modal" type="button">${t('关闭', 'Close')}</button></div><div id="detail-body" class="modal-body"></div></dialog>`;
}

function statisticField(t, option) {
  return `<div class="field"><label for="statistic">${t('统计口径', 'Statistic')}</label><select id="statistic">${option('all', t('全部', 'All')) + option('champion', t('冠军 / 最佳值', 'Champion / best')) + option('mean', t('平均值', 'Mean')) + option('certified', t('认证值', 'Certified')) + option('unknown', t('口径未说明', 'Unspecified')) + option('other', t('其他', 'Other'))}</select></div>`;
}

let counterRequest;
export async function loadPageViews() {
  if (!counterRequest) counterRequest = (async () => {
    const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const url = 'https://counterapi.com/api/sunyrain.github.io/view/opv2d-home' + (location.hostname === 'sunyrain.github.io' ? '' : '?readOnly=true');
      const response = await fetch(url, { cache:'no-store', credentials:'omit', referrerPolicy:'no-referrer', signal:controller.signal });
      if (!response.ok) throw new Error('Counter unavailable');
      const data = await response.json();
      if (!Number.isFinite(Number(data.value))) throw new Error('Invalid counter');
      return Number(data.value).toLocaleString('en-US');
    } catch { return 'Unavailable'; }
    finally { clearTimeout(timeout); }
  })();
  const value = await counterRequest, el = document.getElementById('pageViewCount');
  if (el) { el.textContent = value; if (value === 'Unavailable') el.style.fontSize = '13px'; }
}
