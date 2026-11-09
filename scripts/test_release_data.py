"""Check that generated website data preserve the deposited OPV-DB tables."""
from pathlib import Path
import argparse, csv, json
from build_topic_data import filled, number

def read(path):
    with path.open(encoding='utf-8-sig', newline='') as f:
        return list(csv.DictReader(f))

def check(release, output):
    manifest=json.loads((output/'data/manifest.json').read_text(encoding='utf-8'))
    assert manifest['doi']=='10.5281/zenodo.23951239'
    for name in ['binary','binary_supplement','binary_strict_performance','binary_strict_molecular','ternary','indoor','materials_reference']:
        assert (release/'data'/f'{name}.csv').read_bytes()==(output/'downloads'/f'{name}.csv').read_bytes(),name
    supplement={r['id']:r for r in read(release/'data/binary_supplement.csv')}
    counts={}
    for topic in ['binary','ternary','indoor']:
        raw=read(release/'data'/f'{topic}.csv')
        payload=json.loads((output/'data'/f'{topic}.json').read_text(encoding='utf-8'))
        index=[dict(zip(payload['fields'],r)) for r in payload['rows']]
        full=json.loads((output/'downloads'/f'{topic}.json').read_text(encoding='utf-8'))['records']
        chunks={}
        for path in (output/'data/details'/topic).glob('*.json'):
            for key,value in json.loads(path.read_text(encoding='utf-8')).items():
                assert key not in chunks,(topic,key)
                chunks[key]=value
        assert len(raw)==len(index)==len(full)==len(chunks)==manifest['topics'][topic]['rows']
        assert len({r['id'] for r in index})==len(raw)
        for original,shown,complete in zip(raw,index,full):
            expected=dict(original)
            key=original['id'] if topic=='binary' else original['observation_id']
            if topic=='binary':expected.update(supplement[key])
            assert complete==expected,(topic,key,'JSON values')
            assert chunks[key]=={k:v for k,v in expected.items() if filled(v)},(topic,key,'details')
            assert shown['id']==key and shown['doi']==original['doi']
            keys=['pce','voc','jsc','ff'] if topic=='binary' else ['pce_percent','voc_v','jsc_ua_cm2' if topic=='indoor' else 'jsc_ma_cm2','ff_percent']
            assert [shown[f] for f in ['pce','voc','jsc','ff']]==[number(original[k]) for k in keys]
            if topic=='indoor':assert shown['cct']==number(original['light_source_cct_k'])
        if topic=='binary':
            for kind in ['strict_performance','strict_molecular']:
                expected={r['id'] for r in read(release/'data'/f'binary_{kind}.csv')}
                assert {r['id'] for r in index if r[kind]}==expected
        counts[topic]=len(raw)
    print(json.dumps({'status':'passed','records':counts,'csv_values':'identical','details':'all checked','subsets':'exact membership'}))

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--release',type=Path,required=True)
    p.add_argument('--output',type=Path,default=Path(__file__).resolve().parents[1]/'docs')
    a=p.parse_args();check(a.release,a.output)
