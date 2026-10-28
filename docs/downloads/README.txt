OPV-DB / three-topic website snapshot / 2026-10-28

binary.csv: 33,877 curated binary-scope records from the final main table.
ternary.csv: 2,724 measured ternary observations, including labelled extended conditions.
indoor.csv: 1,678 primary experimental indoor observations.

This snapshot updates the mutable website. It is NOT Zenodo v1.1.0 and does
not have a newly assigned version DOI. The previous frozen release remains
available at https://doi.org/10.5281/zenodo.22177960.

Binary and ternary target scope: organic, experimental, single-junction,
AM1.5G, 100 mW/cm2, measured device/aperture area below 1 cm2.
The default standard-scope browser excludes explicitly incompatible rows.
It retains legacy records with unknown conditions, clearly marked unresolved.
The "documented" view requires explicit composition, organic scope,
experimental measurement, single junction, AM1.5G, 100 mW/cm2, and area <1 cm2.
Unknown conditions are not evidence of standard conditions.
Large-area, module/tandem and indoor ternary observations are retained in
the complete topic download and extended browser view. Source values are
unchanged. website_scope_status and website_scope_reasons are derived flags.

Units: binary Jsc in mA/cm2, ternary jsc_ma_cm2 in mA/cm2, indoor
jsc_ua_cm2 in microA/cm2. Indoor irradiance_uw_cm2 is microW/cm2;
binary/ternary irradiance_mw_cm2 is mW/cm2. Illuminance_lux is separate.
Do not convert lux to irradiance without spectrum-specific measurements.
Device and aperture areas are retained separately. The browser's area
column prefers aperture area, then device area, then active area; all known
device/aperture/active areas are considered for the >=1 cm2 scope check.

Reported PCE is preserved. Champion/mean/unspecified values and individual
metric_statistics remain distinct; the site does not combine metrics from
different statistical groups or conditions. A complete numeric quartet is
field availability, not proof that all four values share a statistical basis.
Unknown statistical definitions are not converted to champion or mean.

Model-assisted source review is not independent human validation. Untargeted
legacy rows were not all re-extracted in this batch. Remaining issue labels
indicate missing evidence/definitions and are not automatic scientific errors.
Topic overlap is allowed. Do not sum row counts as unique devices.

Public downloads retain populated scientific fields, process parameters,
DOIs, source table/row locators and issue labels. Internal jobs, local paths,
full article text and large quotation/audit objects are omitted. Missing cells
remain empty. CSV is UTF-8 with BOM. Non-numeric cells starting with spreadsheet
formula characters have a leading apostrophe for safe spreadsheet import;
the accompanying website JSON preserves their literal scientific strings.

Field definitions: field_dictionary.csv. Provenance: record-level DOI,
origin_doi, extraction_doi and source_doi, where available.
License: CC BY 4.0, continuing the OPV-DB dataset license. Please cite the
source papers and identify this website snapshot separately from v1.1.0.
Website: https://sunyrain.github.io/OPV2D/
Repository: https://github.com/sunyrain/OPV2D
