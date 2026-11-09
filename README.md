# OPV-DB device data browser

The website presents the published [OPV-DB v2.0.0 dataset](https://doi.org/10.5281/zenodo.23951239).

| Collection | Observations | Source DOIs |
|---|---:|---:|
| [Standard binary](https://sunyrain.github.io/OPV2D/) | 32,778 | 7,360 |
| [Standard ternary](https://sunyrain.github.io/OPV2D/ternary.html) | 2,588 | 461 |
| [Indoor photovoltaics](https://sunyrain.github.io/OPV2D/indoor.html) | 1,678 | 166 |

The primary binary collection has two nested subsets: 27,863 strict-performance
records and 19,299 strict-molecular records. Ternary and indoor collections have
partial literature coverage; records can overlap across topics.

The original compact layout is retained, with English/Chinese navigation,
search, sortable tables, filters, record details and downloads. The website
uses the deposited subset membership and retains published measurements.
The principal PCE preserves each observation's statistical meaning; mean and
best values and per-metric statistics are stored separately where available.
Indoor Jsc uses µA/cm² and irradiance uses µW/cm²; lux is separate.

## Downloads

- CSV tables and the complete data ZIP are byte-identical to the Zenodo files.
- The main binary CSV retains 37 columns; its 47-column supplement is separate.
- Binary JSON and record details join the main table and supplement by ID.
- Ternary and indoor JSON retain their published table values. Their SMILES
  are not inferred by material-name matching.
- Filtered CSV exports browser fields, not the full release schema.
- The field dictionary, subset rules, citation and attribution accompany downloads.

## Website maintenance

GitHub Pages serves `main:/docs`. The three pages share `docs/assets/app.js`,
`classic-shell.js` and `app.css`. No build service is required.

```sh
python scripts/build_release_data.py --release /path/to/extracted-release --archive /path/to/OPV-DB_v2.0.0_data.zip
python scripts/test_release_data.py --release /path/to/extracted-release
python -m http.server 8080 --directory docs
```

The builder uses the Python standard library. It copies the seven released CSV
tables, creates browsing indices and joins binary details by ID. DOI/year
metadata for the year display are in `data_sources/article_years.csv`, also
used by the [figure workflow](https://github.com/sunyrain/OPV-DB-release-code/tree/main/v2).
No full-text articles or credentials are needed or included.

## Earlier release

The [v1.1.0 browser](https://sunyrain.github.io/OPV2D/archive-v1.1.0.html) and
`Active_Database.csv` / `docs/opv_data.json` remain explicitly historical
resources. The legacy `build_topic_data.py` command targets the earlier curated
snapshot; use `build_release_data.py` for current deposited data.

Data: CC BY 4.0, with attribution in the deposited archive.
