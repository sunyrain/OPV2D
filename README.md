# OPV-DB — three-topic device browser

The website now serves the **2026-10-28 curated snapshot** on three pages:

| Page | Full-topic observations | Source DOIs | Default standard-scope view |
|---|---:|---:|---:|
| [Standard binary](https://sunyrain.github.io/OPV2D/) | 33,877 | 7,453 | 33,877 |
| [Standard ternary](https://sunyrain.github.io/OPV2D/ternary.html) | 2,724 | 463 | 2,582 |
| [Indoor photovoltaics](https://sunyrain.github.io/OPV2D/indoor.html) | 1,678 | 166 | All indoor records |

The binary/ternary default view excludes known incompatible conditions and
retains records with incomplete conditions, without per-record scope badges. The
**conditions documented** filter requires explicit composition, organic scope,
experimental measurement, single junction, AM1.5G, 100 mW/cm² and area <1 cm²:
110 binary and 202 ternary observations currently satisfy all these fields.
These are metadata completeness counts, not independent accuracy estimates.

The ternary full-topic view/download retains 142 observations with known
extended conditions (including indoor, large-area, modules/tandems or other
irradiance/spectra). Topics may overlap; their totals are not additive counts
of unique devices. See [scope and data notes](docs/downloads/README.txt).

Each page provides Chinese/English navigation, search, numeric sorting,
pagination, source DOIs, condition/statistic filters, lazy-loaded record
details, filtered browser-column CSV, full scientific CSV/JSON and a three-topic
CSV ZIP. Indoor units remain µA/cm² and µW/cm²; lux is separate.

This snapshot **has no new Zenodo version DOI**. The v1.1.0 DOI below identifies
the previous frozen release, not the newly curated tables. The old browser is
preserved at [archive-v1.1.0.html](https://sunyrain.github.io/OPV2D/archive-v1.1.0.html).
`Active_Database.csv` and `docs/opv_data.json` remain unchanged v1.1.0 files.

## Website maintenance

GitHub Pages serves `main:/docs`. The new pages share `docs/assets/app.js` and
`app.css`, with data in `docs/data` and downloads in `docs/downloads`.
No runtime third-party scripts or build service are required.
The existing page-view counter is optional and does not block data loading.

The visual layout follows the original v1.1.0 browser: dark header, six compact
statistics cards, horizontal filter toolbar, two summary-bar panels, dense
DOI/material columns and the original related-work footer. Topic navigation and
topic-specific columns are added within that layout. The binary page also
retains strict-performance / strict-molecular filters, PCE-difference buckets,
SMILES search and process-metadata filters. The strict subsets use the curated
baseline-compatible membership (27,936 and 19,447 records respectively), not a
claim that every member was newly source-verified. The default interface language
is English, with a Chinese switch and saved language preference.

Regenerate the public data from the final curated CSV exports:

```powershell
python scripts/build_topic_data.py --source PATH_TO_CURATED_EXPORTS
python scripts/test_topic_scope.py
python -m http.server 8080 --directory docs
```

The exporter preserves populated scientific values, process fields, source
locators and issue labels. It omits internal workflow files, local paths and
large evidence objects; it does not read article full texts. Derived website
scope fields are separate from the source measurements. CSV uses UTF-8 BOM;
potential spreadsheet formulas are escaped without altering the JSON strings.

## Previous frozen release (v1.1.0)

This repository hosts the public static browser for OPV-DB:

<https://sunyrain.github.io/OPV2D/>

OPV-DB is a literature-mined organic photovoltaic device performance database.
The archived browser mirrors the publication-facing 2026 Q3 release,
OPV-DB v1.1.0:

- Zenodo v1.1.0 DOI: <https://doi.org/10.5281/zenodo.22177960>
- Zenodo all-versions DOI: <https://doi.org/10.5281/zenodo.20841542>
- Archived dataset: <https://zenodo.org/records/22177960>
- Full archive: 39,998 single-junction OPV device records
- Source DOIs: 8,073 normalized source DOIs
- Strict performance benchmark: 32,457 records
- Strict molecular benchmark: 22,467 records
- All four photovoltaic metrics: 38,606 records
- Donor and acceptor SMILES: 27,361 records

See [the v1.1.0 release notes](RELEASE_NOTES_v1.1.0.md) and the
[detailed Chinese comparison with v1.0.0](RELEASE_COMPARISON_v1.1.0_ZH.md)
for the dataset upgrade, benchmark continuity, and molecular-curation summary.

The archived web app is served from the `docs/` directory through GitHub Pages. It loads
`docs/opv_data.json`, which is generated from the archived v1.1.0 release.
The root `Active_Database.csv` is a byte-identical CSV mirror of
`data/opv_devices_full.csv` in that release. The browser payload adds only
display metadata and tier-membership flags; the 37 public device fields retain
their release values.

## Files

- `docs/archive-v1.1.0.html`: frozen-release browser interface.
- `docs/opv_data.json`: browser JSON generated from the public release, with
  release metadata stored once at the top level and records in `records`.
- `Active_Database.csv`: CSV mirror of `data/opv_devices_full.csv` from the
  Zenodo release.

## Recommended Citation

Please cite the archived dataset rather than a mutable website copy:

```bibtex
@dataset{qiu2026opvdb,
  author    = {Qiu, Jiangjie},
  title     = {OPV-DB: a literature-mined organic photovoltaic device performance database},
  year      = {2026},
  publisher = {Zenodo},
  version   = {1.1.0},
  doi       = {10.5281/zenodo.22177960},
  url       = {https://doi.org/10.5281/zenodo.22177960}
}
```

The citation above identifies the frozen v1.1.0 record. The all-versions concept
DOI remains `10.5281/zenodo.20841542`.

## License

The archived OPV-DB release is distributed under CC BY 4.0. See the Zenodo
record for the release package, data dictionary, checksums, license statement,
and third-party attribution notes.
