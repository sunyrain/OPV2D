# Three-topic website update — 2026-10-28

The single-table homepage is replaced by separate standard-binary,
standard-ternary and indoor-photovoltaic pages, using the final curated exports.
Original measurements and source IDs are preserved. New website scope flags
separate documented conditions, incomplete conditions and extended conditions.

| Topic | All rows | Standard scope including incomplete | Documented standard conditions | Extended conditions |
|---|---:|---:|---:|---:|
| Binary | 33,877 | 33,877 | 110 | 0 |
| Ternary | 2,724 | 2,582 | 202 | 142 |
| Indoor | 1,678 | Not applicable | Not applicable | Not applicable |

Default standard scope is a working view, not a claim that every row has
confirmed AM1.5G, 100 mW/cm² and area <1 cm². The documented filter requires
those explicit fields plus composition, organic materials, experimental
measurement and single-junction architecture. Module/tandem and area >=1 cm²
checks use observation-level fields; a solar simulator is not classified as
computational simulation. Indoor data remain independent of standard-sun filters.

Public full-topic CSV/JSON downloads retain scientific fields and source
locators; the browser index is compact and details load in batches of 500 only
on demand. No local full-text package, API credential or internal extraction job
is included. Browser exports name the current-density and irradiance units
explicitly. Missing numerical values stay missing, including during sorting
and numeric-range filtering. The primary PCE values are not recalculated or
changed by the website.

Chinese and English interfaces are available. Mobile layouts preserve horizontal
table scrolling. Record details are keyboard-accessible dialogs and return focus
when closed. Loading failures offer retry and direct CSV downloads.

The previous v1.1.0 browser remains at `docs/archive-v1.1.0.html`; its JSON and
root CSV are unchanged. The current snapshot is identified by date and has no
newly assigned Zenodo version DOI.

Validation: source DOI and four primary performance values match the final
curated tables for every delivered row; all lazy-loaded records match the public
JSON exports. Six scope-boundary and public-export tests passed. Browser checks
passed on all three pages for filtering, documented/extended views, numeric
sorting, pagination, detail loading, CSV/JSON downloads, language switching,
390-pixel mobile layout and recovery from a failed data request. No JavaScript
page errors were observed.
