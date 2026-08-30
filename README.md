# OPV-DB Static Browser

This repository hosts the public static browser for OPV-DB:

<https://sunyrain.github.io/OPV2D/>

OPV-DB is a literature-mined organic photovoltaic device performance database.
The current website mirrors the publication-facing 2026 Q3 release,
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

The web app is served from the `docs/` directory through GitHub Pages. It loads
`docs/opv_data.json`, which is generated from the archived v1.1.0 release.
The root `Active_Database.csv` is a byte-identical CSV mirror of
`data/opv_devices_full.csv` in that release. The browser payload adds only
display metadata and tier-membership flags; the 37 public device fields retain
their release values.

## Files

- `docs/index.html`: static browser interface.
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
