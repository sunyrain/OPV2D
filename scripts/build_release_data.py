"""Build the three topic pages from the published OPV-DB v2.0.0 archive.

CSV downloads are byte-identical to the deposited tables. Browser details join
the binary supplement by ID; strict membership comes from the supplied subsets.
No scientific value, scope selection or material mapping is inferred here.
"""
from pathlib import Path
import argparse, csv, json, shutil
from collections import Counter
from build_topic_data import INDEX_FIELDS, filled, number, first, save_json

ROOT = Path(__file__).resolve().parents[1]
DOI = '10.5281/zenodo.23951239'

def read(path):
    with path.open(encoding='utf-8-sig', newline='') as f:
        return list(csv.DictReader(f))

def build(release, output, archive=None):
    data = release/'data'
    out = output/'data'; downloads = output/'downloads'
    out.mkdir(parents=True, exist_ok=True); downloads.mkdir(parents=True, exist_ok=True)
    years = {r['doi_norm'].lower():number(r['publish_year']) for r in read(ROOT/'data_sources/article_years.csv')}
    supplement = {r['id']:r for r in read(data/'binary_supplement.csv')}
    strict = {k:{r['id'] for r in read(data/f'binary_{k}.csv')} for k in ['strict_performance','strict_molecular']}
    dictionary = read(release/'field_dictionary.csv')
    public_dictionary = []
    manifest = {'snapshot':'v2.0.0','schema_version':'opvdb-topics/2','version':'2.0.0',
                'doi':DOI,'updated':'2026-11-10','topics':{}}
    for topic in ['binary','ternary','indoor']:
        rows = read(data/f'{topic}.csv')
        public_rows = []
        indices = []
        for i, raw in enumerate(rows):
            r = dict(raw)
            identity = r['id'] if topic=='binary' else r['observation_id']
            if topic=='binary':
                extra=supplement[identity]
                assert extra['doi']==r['doi']
                r.update({k:v for k,v in extra.items() if k not in ('id','doi')})
            public_rows.append(r)
            if topic=='ternary':
                materials=[r[f'component_{j}_name'] or '—' for j in [1,2,3]]
            else:
                materials=[first(r,'donor_canonical','donor') or '—',first(r,'acceptor_canonical','acceptor') or '—']
                if filled(r.get('other_active_components')):materials.append(r['other_active_components'])
            metric_keys=('pce','voc','jsc','ff') if topic=='binary' else ('pce_percent','voc_v','jsc_ua_cm2' if topic=='indoor' else 'jsc_ma_cm2','ff_percent')
            metrics=[number(r.get(k)) for k in metric_keys]
            statistic=first(r,'statistic')
            if not statistic:
                try:
                    stats=json.loads(r.get('metric_statistics') or '{}')
                    if isinstance(stats,dict):statistic=stats.get(metric_keys[0]) or stats.get('pce')
                except (ValueError,TypeError):pass
            statistic=statistic if isinstance(statistic,str) and statistic else 'reported_unspecified'
            area=next((number(r[k]) for k in ['aperture_area_cm2','device_area_cm2'] if number(r.get(k)) is not None and number(r[k])>0),None)
            item=dict(zip(INDEX_FIELDS,[identity,r['doi'],years.get(r['doi'].lower()),materials,
                first(r,'composition_class'),first(r,'system_type'),*metrics,statistic,
                'published',[],area,first(r,'spectrum'),number(r.get('irradiance_uw_cm2' if topic=='indoor' else 'irradiance_mw_cm2')),
                number(r.get('illuminance_lux')),first(r,'light_source_type','light_source'),number(r.get('light_source_cct_k')),
                all(v is not None for v in metrics),bool(filled(r.get('donor_smiles')) and filled(r.get('acceptor_smiles'))),
                first(r,'solvent_canonical','solvent'),first(r,'device_structure','device_type'),0,i//500,first(r,'source_table'),first(r,'ratio_raw','d_a_ratio')]))
            item.update(donor=first(r,'donor_canonical','donor'),acceptor=first(r,'acceptor_canonical','acceptor'),
                donor_smiles=first(r,'donor_smiles'),acceptor_smiles=first(r,'acceptor_smiles'),
                device_type=first(r,'device_type'),additive=first(r,'additive_canonical','additive'),
                thickness=first(r,'active_layer_thickness'),annealing=first(r,'annealing_temp'),
                has_structure=bool(first(r,'device_structure')),
                pce_error=number(r.get('pce_relative_error_percent')),
                strict_performance=topic=='binary' and identity in strict['strict_performance'],
                strict_molecular=topic=='binary' and identity in strict['strict_molecular'])
            indices.append([item.get(k) for k in INDEX_FIELDS])
        assert len({r[0] for r in indices})==len(indices)
        detail=out/'details'/topic;detail.mkdir(parents=True,exist_ok=True)
        generated=set()
        for offset in range(0,len(public_rows),500):
            target=detail/f'{offset//500}.json';generated.add(target.name)
            save_json(target,{str(first(r,'observation_id','id')):{k:v for k,v in r.items() if filled(v)} for r in public_rows[offset:offset+500]})
        # Only obsolete generated chunks in this topic directory are removed.
        for old in detail.glob('*.json'):
            if old.name not in generated:old.unlink()
        save_json(out/f'{topic}.json',{'snapshot':'v2.0.0','doi':DOI,'topic':topic,'fields':INDEX_FIELDS,'rows':indices})
        save_json(downloads/f'{topic}.json',{'version':'2.0.0','doi':DOI,'topic':topic,'records':public_rows})
        shutil.copy2(data/f'{topic}.csv',downloads/f'{topic}.csv')
        objects=[dict(zip(INDEX_FIELDS,r)) for r in indices]
        stats={'rows':len(rows),'dois':len({r['doi'].lower() for r in rows}),'scope':{'published':len(rows)},'fields':len(rows[0])}
        for key in ['quartet','has_smiles','has_structure','strict_performance','strict_molecular']:
            stats['quartets' if key=='quartet' else key]=sum(bool(r[key]) for r in objects)
        for field in ['area','irradiance','lux']:
            stats[field+'_reported']=sum(r[field] is not None for r in objects)
        if topic=='ternary':
            stats.update(three_names=sum(all(filled(r[f'component_{j}_name']) for j in [1,2,3]) for r in rows),
                three_roles=sum(all(filled(r[f'component_{j}_role']) for j in [1,2,3]) for r in rows),
                composition_ratio=sum(filled(r['ratio_raw']) for r in rows))
        manifest['topics'][topic]=stats
        for entry in dictionary:
            if entry['file'] in [f'data/{topic}.csv']+(['data/binary_supplement.csv'] if topic=='binary' else []):
                public_dictionary.append({'topic':topic,'field':entry['field'],'description_en':entry['description'],'unit':entry['unit']})
    for name in ['binary_supplement','binary_strict_performance','binary_strict_molecular','materials_reference']:
        shutil.copy2(data/f'{name}.csv',downloads/f'{name}.csv')
    shutil.copy2(release/'field_dictionary.csv',downloads/'field_dictionary.csv')
    shutil.copy2(release/'validation/subset_rules.json',downloads/'subset_rules.json')
    shutil.copy2(release/'CITATION.cff',downloads/'CITATION.cff')
    shutil.copy2(release/'LICENSE',downloads/'LICENSE')
    shutil.copy2(release/'THIRD_PARTY_ATTRIBUTION.md',downloads/'THIRD_PARTY_ATTRIBUTION.md')
    if archive:shutil.copy2(archive,downloads/'OPV-DB_v2.0.0_data.zip')
    save_json(out/'manifest.json',manifest)
    save_json(out/'dictionary.json',public_dictionary)
    (downloads/'README.txt').write_text('''OPV-DB v2.0.0 public data\n\nDataset DOI: https://doi.org/10.5281/zenodo.23951239\n\nThe seven CSV tables, field dictionary, subset rules, citation and attribution files are copied from the published archive. The complete ZIP is the unchanged Zenodo archive. Binary CSV preserves the 37-column schema; binary_supplement.csv supplies the linked additional fields. Binary JSON and browser details join these two tables by id. Ternary and indoor JSON retain their respective table values. The filtered CSV export contains display fields, not the complete release schema.\n\nThe primary binary table has 32,778 records from 7,360 source DOIs. Strict performance and strict molecular subsets contain 27,863 and 19,299 records. Ternary: 2,588 records from 461 DOIs. Indoor: 1,678 records from 166 DOIs. Material reference: 4,988 entries. Ternary and indoor literature coverage is partial.\n\nThe principal PCE retains the reported statistic of each observation. Explicit mean and best values are retained separately where available; per-metric descriptions and source notes provide context. Indoor Jsc uses microamperes/cm2 and irradiance uses microwatts/cm2. Lux is separate.\n\nThe browser uses the deposited subset membership. It does not infer missing illumination or area, assign specialist SMILES, or exclude additional published records. Sources and observations can overlap across topics.\n\nThe archive-v1.1.0.html page, Active_Database.csv and opv_data.json are retained as explicitly historical v1.1.0 resources.\n\nData licence: CC BY 4.0. See LICENSE and THIRD_PARTY_ATTRIBUTION.md.\n''',encoding='utf-8')
    print(json.dumps(manifest,ensure_ascii=False,indent=2))

if __name__=='__main__':
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--release',type=Path,required=True)
    ap.add_argument('--output',type=Path,default=ROOT/'docs')
    ap.add_argument('--archive',type=Path)
    args=ap.parse_args();build(args.release.resolve(),args.output.resolve(),args.archive.resolve() if args.archive else None)
