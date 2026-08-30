# OPV-DB v1.1.0 — 2026 Q3 quarterly release

OPV-DB v1.1.0 is the second public release and the final 2026 Q3 quarterly
update. It supersedes v1.0.0 while retaining the same public schemas and strict
benchmark definition.

- Version DOI: [10.5281/zenodo.22177960](https://doi.org/10.5281/zenodo.22177960)
- All-versions DOI: [10.5281/zenodo.20841542](https://doi.org/10.5281/zenodo.20841542)
- Zenodo record: [22177960](https://zenodo.org/records/22177960)
- Release ID: `OPVDB-2026Q3-v1.1.0`
- Release date: `2026-08-30`

## Dataset growth

| Metric | v1.0.0 | v1.1.0 | Change |
|---|---:|---:|---:|
| Full device records | 38,849 | 39,998 | +1,149 |
| Full unique DOIs | 7,873 | 8,073 | +200 |
| Strict-performance records | 31,360 | 32,457 | +1,097 |
| Strict-performance DOIs | 7,185 | 7,379 | +194 |
| Strict-molecular records | 21,720 | 22,467 | +747 |
| Strict-molecular DOIs | 5,459 | 5,615 | +156 |
| Material-reference records | 4,548 | 4,997 | +449 |

The Full archive adds 1,210 IDs and removes 61 IDs, for a net increase of
1,149 records. Of the removals, 21 are duplicate consolidations and 40 belong
to two simulation-only studies excluded from the experimental OPV scope.

## Public schema

- Device schema: 37 columns, unchanged; new public device columns: **0**.
- Material schema: seven columns, unchanged; new public material columns: **0**.
- The three device tiers remain joinable by `id` and use the same 37 columns.

## Strict benchmark continuity

The strict-performance tier retains the complete v1.0.0 rule:

1. normalized DOI and donor/acceptor identity are present;
2. PCE, Voc, Jsc, and FF are all present;
3. records are experimental single-junction OPV devices and pass documented
   physical ranges;
4. PCE recomputed from public fields has relative error `<= 2%`;
5. exact reported and canonical core duplicates are removed after scope
   admission, retaining the lowest numeric ID.

The execution order is now scope-before-deduplication. This recovers three valid
OSC records that were previously shadowed by excluded simulation or perovskite
records sharing the same public core values, without loosening the scientific
rule.

## Molecular curation

- 13,388 donor/acceptor SMILES fields were corrected across 13,339 records.
- 69 blank SMILES fields were filled through exact canonical-name mappings.
- Within strict performance, 11,530 SMILES fields changed across 11,487 records.
- Under the same strict-performance parent tier, strict-molecular membership
  increased from 22,421 to 22,467 records (+46, no removals).
- When explicit chain-end chemistry is unavailable, polymer repeat-unit
  surrogates use implicit hydrogen termination at polymerization sites.
- Ambiguous isomers, mixtures, composites, and graph conflicts remain outside
  automatic correction.

## Package and integrity

The Zenodo archive contains the same 15-file structure as v1.0.0. Detailed
row-level cross-version and SMILES-curation audits are retained in the project
QA workspace and are not included in the public archive.

- Zenodo file: `opvdb_2026_q3.zip`
- Size: 6,628,883 bytes
- SHA-256: `01f8410998fc3e2dc520054853cdde7de096ea4b2526eec08eec579206b3865c`
- Zenodo MD5: `74f7a1442c7d43eb36a4c6f53ee567e4`

For the full Chinese comparison, see
[RELEASE_COMPARISON_v1.1.0_ZH.md](RELEASE_COMPARISON_v1.1.0_ZH.md).
