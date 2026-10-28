"""Build the public three-topic browser from the 2026-10-28 curated CSVs.

No source measurements are overwritten. Website scope flags are derived separately.
Run with --source pointing at the local curated exports; article text is not input.
"""
from __future__ import annotations

import argparse
import csv
import io
import json
import math
import re
import zipfile
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VERSION = "2026-10-28"
TOPICS = {"binary": "main", "ternary": "ternary", "indoor": "indoor"}
EMPTY = {"", "none", "null", "nan", "n/a", "[]", "{}"}
# Internal workflow objects and full-text/evidence fragments are not public data.
PRIVATE_KEYS = {
    "annotation_file", "packet_index", "json_record_pointer", "delivery_status",
    "delivery_original_id", "review_method", "body_followup", "source_path", "source_key",
    "source_identity", "new_observation_original_proposal", "archive_doi_candidate_ids",
    "archive_link_basis", "archive_reconciliation_note", "datasets", "cross_dataset_identity",
    "cross_dataset_target_key", "strict_membership_basis", "proposed_scope_unverified",
    "source_reference", "source_table_footnote", "source_metric_cells", "raw_table_values",
    "source_discrepancy", "partially_resolved_fields", "resolved_issues",
}
PRIVATE_PREFIX = ("astra_", "reextraction_", "baseline_", "strict_", "primary_source_evidence", "metric_statistics_evidence", "metric_statistics_semantic")
PATH_RE = re.compile(r"(?:[A-Za-z]:[\\/]|/Users/|/home/|source_packets|sent_sources|sk-[A-Za-z0-9]{20,})", re.I)
INDEX_FIELDS = ["id", "doi", "year", "materials", "composition", "system", "pce", "voc", "jsc", "ff", "statistic", "scope_status", "scope_reasons", "area", "spectrum", "irradiance", "lux", "light", "cct", "quartet", "has_smiles", "solvent", "device", "issue_count", "detail_chunk", "source_table", "ratio"]
CLASSIC_FIELDS = ["donor", "acceptor", "donor_smiles", "acceptor_smiles", "device_type", "additive", "thickness", "annealing", "has_structure", "pce_error", "strict_performance", "strict_molecular"]
INDEX_FIELDS += CLASSIC_FIELDS


def filled(v):
    return v is not None and str(v).strip().lower() not in EMPTY


def number(v):
    if not filled(v):
        return None
    try:
        n = float(v)
        return n if math.isfinite(n) else None
    except (ValueError, TypeError):
        return None


def first(row, *keys):
    return next((row[k] for k in keys if filled(row.get(k))), None)


def unpack(v):
    if isinstance(v, str) and v[:1] in ("[", "{"):
        try:
            return json.loads(v)
        except ValueError:
            pass
    return v


def private_key(key):
    return key in PRIVATE_KEYS or key.startswith(PRIVATE_PREFIX) or key.endswith(("_file", "_path", "_quote", "_evidence"))


def sanitize(value):
    if isinstance(value, dict):
        return {k: sanitize(v) for k, v in value.items() if not private_key(k) and filled(v) and not PATH_RE.search(str(v))}
    if isinstance(value, list):
        return [sanitize(v) for v in value if not PATH_RE.search(str(v))]
    return value


def classify_scope(r, topic):
    if topic == "indoor":
        return "indoor", []
    reasons = []
    comp = str(first(r, "source_scope_composition_class", "composition_class") or "").lower()
    junction = str(first(r, "source_scope_junction_class", "junction_class", "scope.junction_class") or "").lower()
    device = " ".join(str(r.get(k, "")) for k in ("device_kind", "device_type", "device_architecture"))
    light = str(first(r, "source_scope_illumination_class", "illumination_class") or "").lower()
    spectrum = str(first(r, "spectrum", "illumination_spectrum") or "").lower()
    material = str(first(r, "source_scope_material_scope", "material_scope") or "").lower()
    measured = str(first(r, "source_scope_measurement_type", "measurement_type", "scope.measurement_type") or "").lower()
    areas = [n for k in ("device_area_cm2", "aperture_area_cm2", "active_area_cm2") if (n := number(r.get(k))) is not None and n > 0]
    irradiance = number(r.get("irradiance_mw_cm2"))
    lux = number(r.get("illuminance_lux"))
    if any(a >= 1 for a in areas):
        reasons.append("area_ge_1")
    if re.search(r"\b(module|tandem)\b|series.connected|multi.junction", junction + " " + device, re.I) or any((number(r.get(k)) or 0) > 1 for k in ("num_cells", "series_cell_count", "subcell_count")):
        reasons.append("module_or_tandem")
    if "indoor" in light or (lux is not None and lux > 0):
        reasons.append("indoor_light")
    if irradiance is not None and not math.isclose(irradiance, 100, abs_tol=0.01):
        reasons.append("other_irradiance")
    if re.search(r"\bled\b|halogen|fluorescent|am\s*1\.5\s*d\b", spectrum + " " + light):
        reasons.append("other_spectrum")
    if "simulat" in measured or "theoretical" in measured:
        reasons.append("simulation")
    if "inorganic" in material or "hybrid" in material:
        reasons.append("other_material")
    if (topic == "binary" and re.search(r"\b(ternary|quaternary|multicomponent)\b", comp)) or (topic == "ternary" and comp and comp != "ternary"):
        reasons.append("other_composition")
    if reasons:
        return "outside", list(dict.fromkeys(reasons))
    solar = bool(re.search(r"am[ _]?1[_.]?5[ _]?g|am\s*1\.5\s*global", spectrum + " " + light))
    intensity = irradiance is not None and math.isclose(irradiance, 100, abs_tol=0.01)
    # A combined source classification explicitly contains both spectrum and intensity.
    if light == "am1_5g_100mw_cm2":
        solar = intensity = True
    conditions = {
        "spectrum_unreported": solar,
        "irradiance_unreported": intensity,
        "area_unreported": bool(areas) and all(a < 1 for a in areas),
        "junction_unreported": "single" in junction and "inferred" not in junction,
        "composition_unreported": ("binary" in comp if topic == "binary" else comp == "ternary"),
        "material_unreported": "organic" in material,
        "measurement_unreported": "experiment" in measured,
    }
    missing = [k for k, ok in conditions.items() if not ok]
    return ("unresolved", missing) if missing else ("documented", [])


def csv_bytes(rows, fields):
    s = io.StringIO(newline="")
    writer = csv.DictWriter(s, fieldnames=fields, extrasaction="ignore")
    writer.writeheader()
    for row in rows:
        cooked = {}
        for k, v in row.items():
            if isinstance(v, (dict, list)):
                v = json.dumps(v, ensure_ascii=False, separators=(",", ":"))
            # Spreadsheet formula protection. Numeric negative values stay numeric.
            if isinstance(v, str) and v[:1] in ("=", "+", "-", "@", "\t", "\r") and number(v) is None:
                v = "'" + v
            cooked[k] = v
        writer.writerow(cooked)
    return ("\ufeff" + s.getvalue()).encode("utf-8")


def save_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":"), allow_nan=False), encoding="utf-8")


def build(source, output):
    output.mkdir(parents=True, exist_ok=True)
    data_dir = output / "data"
    downloads = output / "downloads"
    downloads.mkdir(exist_ok=True)
    legacy = json.loads((output / "opv_data.json").read_text(encoding="utf-8"))
    years = {str(r["doi"]).lower(): r.get("publish_year") for r in legacy["records"] if r.get("publish_year")}
    dictionary = list(csv.DictReader((source / "field_dictionary.csv").open(encoding="utf-8-sig", newline="")))
    manifest = {"snapshot": VERSION, "schema_version": "opvdb-topics/1", "previous_release": {"version": "1.1.0", "doi": "10.5281/zenodo.22177960"}, "topics": {}}
    public_dictionary = []
    for topic, original in TOPICS.items():
        source_rows = list(csv.DictReader((source / f"{original}.csv").open(encoding="utf-8-sig", newline="")))
        public_rows, indices, fields = [], [], []
        field_set = set()
        for i, raw in enumerate(source_rows):
            r = sanitize({k: unpack(v) for k, v in raw.items() if filled(v) and not private_key(k)})
            identity = str(first(r, "observation_id", "id"))
            status, reasons = classify_scope(raw, topic)
            r.update(website_scope_status=status, website_scope_reasons=reasons)
            public_rows.append(r)
            for k in r:
                if k not in field_set:
                    fields.append(k)
                    field_set.add(k)
            if topic == "ternary":
                materials = [first(r, f"component_{j}_name") or "—" for j in (1, 2, 3)]
            else:
                materials = [first(r, "donor_canonical", "donor") or "—", first(r, "acceptor_canonical", "acceptor") or "—"]
                other = r.get("other_active_components")
                if filled(other):
                    materials.append(json.dumps(other, ensure_ascii=False) if not isinstance(other, str) else other)
            metric_keys = ("pce", "voc", "jsc", "ff") if topic == "binary" else ("pce_percent", "voc_v", "jsc_ua_cm2" if topic == "indoor" else "jsc_ma_cm2", "ff_percent")
            metrics = [number(r.get(k)) for k in metric_keys]
            statistics = r.get("metric_statistics") or {}
            stat = first(r, "statistic") or (statistics.get(metric_keys[0]) if isinstance(statistics, dict) else None) or "reported_unspecified"
            area = next((number(r[k]) for k in ("aperture_area_cm2", "device_area_cm2", "active_area_cm2") if number(r.get(k)) is not None and number(r[k]) > 0), None)
            processing = r.get("processing") if isinstance(r.get("processing"), dict) else {}
            issues = r.get("remaining_issues", [])
            row = dict(zip(INDEX_FIELDS, [identity, r["doi"], years.get(str(r["doi"]).lower()), materials,
                r.get("composition_class"), r.get("system_type"), *metrics, stat, status, reasons, area,
                first(r, "spectrum", "illumination_spectrum"), number(r.get("irradiance_uw_cm2" if topic == "indoor" else "irradiance_mw_cm2")),
                number(r.get("illuminance_lux")), first(r, "light_source_type", "light_source_name", "light_source"), number(first(r, "cct_k", "color_temperature_k")),
                all(v is not None for v in metrics), bool(filled(r.get("donor_smiles")) and filled(r.get("acceptor_smiles"))),
                first(r, "solvent_canonical", "solvent") or processing.get("solvent"), first(r, "device_structure", "device_stack", "device_kind", "device_type"),
                len(issues) if isinstance(issues, (list, dict)) else (1 if filled(issues) else 0), i // 500,
                r.get("source_table"), first(r, "ratio_raw", "d_a_ratio") ]))
            row.update(
                donor=first(r, "donor_canonical", "donor"), acceptor=first(r, "acceptor_canonical", "acceptor"),
                donor_smiles=r.get("donor_smiles"), acceptor_smiles=r.get("acceptor_smiles"),
                device_type=first(r, "device_type", "device_kind"),
                additive=first(r, "additive_canonical", "additive", "processing_additive") or processing.get("additive"),
                thickness=first(r, "active_layer_thickness", "active_layer_thickness_nm") or processing.get("active_layer_thickness_nm"),
                annealing=first(r, "annealing_temp", "annealing_temperature_c", "annealing_temp_c") or processing.get("annealing_temp_c") or processing.get("annealing_temperature_c"),
                has_structure=bool(first(r, "device_structure", "device_stack")),
                pce_error=number(r.get("pce_relative_error_percent")) if topic == "binary" else None,
                strict_performance=str(raw.get("baseline_compatible_strict_performance_member", "")).lower() == "true",
                strict_molecular=str(raw.get("baseline_compatible_strict_molecular_member", "")).lower() == "true",
            )
            indices.append([row.get(k) for k in INDEX_FIELDS])
        assert len({row[0] for row in indices}) == len(indices), f"Duplicate IDs in {topic}"
        for offset in range(0, len(public_rows), 500):
            chunk = {str(first(r, "observation_id", "id")): r for r in public_rows[offset:offset + 500]}
            save_json(data_dir / "details" / topic / f"{offset // 500}.json", chunk)
        compact = {"snapshot": VERSION, "topic": topic, "fields": INDEX_FIELDS, "rows": indices}
        save_json(data_dir / f"{topic}.json", compact)
        save_json(downloads / f"{topic}.json", {"snapshot": VERSION, "topic": topic, "records": public_rows})
        (downloads / f"{topic}.csv").write_bytes(csv_bytes(public_rows, fields))
        scope = Counter(r[INDEX_FIELDS.index("scope_status")] for r in indices)
        stats = {"rows": len(indices), "dois": len({r[1].lower() for r in indices}), "scope": dict(scope),
            "quartets": sum(r[INDEX_FIELDS.index("quartet")] for r in indices),
            "area_reported": sum(r[INDEX_FIELDS.index("area")] is not None for r in indices),
            "irradiance_reported": sum(r[INDEX_FIELDS.index("irradiance")] is not None for r in indices),
            "lux_reported": sum(r[INDEX_FIELDS.index("lux")] is not None for r in indices),
            "fields": len(fields), "browser_bytes": (data_dir / f"{topic}.json").stat().st_size,
            "csv_bytes": (downloads / f"{topic}.csv").stat().st_size, "json_bytes": (downloads / f"{topic}.json").stat().st_size}
        stats.update({
            key: sum(bool(row[INDEX_FIELDS.index(key)]) for row in indices)
            for key in ["strict_performance", "strict_molecular", "has_smiles", "has_structure"]
        })
        manifest["topics"][topic] = stats
        for entry in dictionary:
            if entry["dataset"] == original and entry["field"] in field_set:
                public_dictionary.append({"topic": topic, "field": entry["field"], "description_zh": entry["description_zh"], "unit": entry["unit"]})
        for key, desc in [("website_scope_status", "网站派生范围：documented=显式标准条件齐全；unresolved=尚缺条件字段；outside=已知非标准条件；indoor=室内专题。不是人工准确率或新的测量结果。"), ("website_scope_reasons", "网站范围标记的缺失项或移出标准视图的原因；原始测量和来源分类不改写。")]:
            public_dictionary.append({"topic": topic, "field": key, "description_zh": desc, "unit": ""})
    save_json(data_dir / "manifest.json", manifest)
    save_json(data_dir / "dictionary.json", public_dictionary)
    (downloads / "field_dictionary.csv").write_bytes(csv_bytes(public_dictionary, ["topic", "field", "description_zh", "unit"]))
    with zipfile.ZipFile(downloads / "OPV_three_topics_20261028.zip", "w", zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
        for name in ["binary.csv", "ternary.csv", "indoor.csv", "field_dictionary.csv", "README.txt"]:
            if (downloads / name).exists():
                archive.write(downloads / name, name)
    print(json.dumps(manifest, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--output", type=Path, default=ROOT / "docs")
    args = parser.parse_args()
    build(args.source, args.output)
