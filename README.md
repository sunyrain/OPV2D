# OPV-DB Static Browser

This repository hosts the public static browser for OPV-DB:

<https://sunyrain.github.io/OPV2D/>

OPV-DB is a literature-mined organic photovoltaic device performance database.
The current website mirrors the publication-facing Zenodo release:

- Data DOI: <https://doi.org/10.5281/zenodo.20841543>
- Full archive: 38,849 single-junction OPV device records
- Source DOIs: 7,873 normalized source DOIs
- Strict performance benchmark: 31,360 records
- Strict molecular benchmark: 21,720 records
- All four photovoltaic metrics: 37,452 records
- Donor and acceptor SMILES: 26,566 records

The web app is served from the `docs/` directory through GitHub Pages. It loads
`docs/opv_data.json`, which is generated from the archived Zenodo release file
`opvdb.zip`. The root `Active_Database.csv` is kept as a CSV mirror of the
public full device archive.

## Files

- `docs/index.html`: static browser interface.
- `docs/opv_data.json`: browser JSON generated from the public release.
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
  version   = {1.0.0},
  doi       = {10.5281/zenodo.20841543},
  url       = {https://doi.org/10.5281/zenodo.20841543}
}
```

## License

The archived OPV-DB release is distributed under CC BY 4.0. See the Zenodo
record for the release package, data dictionary, checksums, license statement,
and third-party attribution notes.
