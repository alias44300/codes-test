#!/usr/bin/env python3
import json
import sqlite3
from pathlib import Path

root = Path('.')
db_path = root / 'ci-title-fight.sqlite'
if db_path.exists():
    db_path.unlink()
seed = json.loads((root / 'database/seed/boxers-heavyweight-v1.json').read_text(encoding='utf-8'))
schema = (root / 'database/schema-v1.sql').read_text(encoding='utf-8')
con = sqlite3.connect(db_path)
con.executescript(schema)

rating_columns = {
    'jabPower': 'jab_power', 'rearHandPower': 'rear_hand_power',
    'hookPower': 'hook_power', 'bodyPower': 'body_power',
    'handSpeed': 'hand_speed', 'footSpeed': 'foot_speed',
    'accuracy': 'accuracy', 'timing': 'timing',
    'headDefense': 'head_defense', 'bodyDefense': 'body_defense',
    'blocking': 'blocking', 'evasiveness': 'evasiveness',
    'countering': 'countering', 'pressure': 'pressure',
    'rangeControl': 'range_control', 'insideFighting': 'inside_fighting',
    'endurance': 'endurance', 'recovery': 'recovery',
    'chin': 'chin', 'bodyResistance': 'body_resistance',
    'balance': 'balance', 'cutResistance': 'cut_resistance',
    'ringIq': 'ring_iq', 'adaptability': 'adaptability',
    'discipline': 'discipline', 'aggression': 'aggression',
    'finishing': 'finishing', 'composure': 'composure',
}
tendency_columns = {
    'jabFrequency': 'jab_frequency',
    'bodyAttackFrequency': 'body_attack_frequency',
    'combinationFrequency': 'combination_frequency',
    'counterFrequency': 'counter_frequency',
    'clinchFrequency': 'clinch_frequency',
    'pressureFrequency': 'pressure_frequency',
    'riskTolerance': 'risk_tolerance',
    'fastStart': 'fast_start',
    'lateSurge': 'late_surge',
}
con.executemany(
    'INSERT INTO database_meta(meta_key, meta_value) VALUES (?, ?)',
    [('schema_version', str(seed['schemaVersion'])), ('boxer_count', str(len(seed['boxers'])))],
)
for item in seed['boxers']:
    r = item['ratings']
    con.execute(
        'INSERT OR IGNORE INTO boxers VALUES (?, ?, ?, ?, ?, ?)',
        (item['boxerId'], item['name'], item['nickname'], item['countryCode'], item['countryName'], item['era']),
    )
    primary = {
        'power': max(r['rearHandPower'], r['hookPower'], r['bodyPower']),
        'speed': round((r['handSpeed'] + r['footSpeed']) / 2),
        'technique': round((r['accuracy'] + r['timing'] + r['ringIq']) / 3),
        'defense': round((r['headDefense'] + r['bodyDefense'] + r['blocking'] + r['evasiveness']) / 4),
        'endurance': r['endurance'],
        'mental': round((r['ringIq'] + r['composure'] + r['discipline']) / 3),
        'chin': r['chin'], 'recovery': r['recovery'], 'accuracy': r['accuracy'],
        'mobility': r['footSpeed'], 'body_resistance': r['bodyResistance'],
        'aggression': r['aggression'],
    }
    values = (
        item['versionId'], item['boxerId'], item['databaseId'],
        item['prime']['start'], item['prime']['end'], item['weightClass'], item['stance'],
        item['style'], item['secondaryStyle'], item['preferredRange'], item['heightCm'], item['reachCm'],
        primary['power'], primary['speed'], primary['technique'], primary['defense'],
        primary['endurance'], primary['mental'], primary['chin'], primary['recovery'],
        primary['accuracy'], primary['mobility'], primary['body_resistance'], primary['aggression'],
    )
    con.execute('INSERT INTO boxer_versions VALUES (' + ','.join('?' for _ in values) + ')', values)
    rating_values = [item['versionId']] + [r[key] for key in rating_columns]
    con.execute(
        'INSERT INTO ratings(version_id,' + ','.join(rating_columns.values()) + ') VALUES (' + ','.join('?' for _ in rating_values) + ')',
        rating_values,
    )
    t = item['tendencies']
    tendency_values = [item['versionId']] + [t[key] for key in tendency_columns]
    con.execute(
        'INSERT INTO tendencies(version_id,' + ','.join(tendency_columns.values()) + ') VALUES (' + ','.join('?' for _ in tendency_values) + ')',
        tendency_values,
    )
    con.executemany(
        'INSERT INTO signature_actions(version_id, action_order, label) VALUES (?, ?, ?)',
        [(item['versionId'], index, label) for index, label in enumerate(item['signatureActions'])],
    )
    con.executemany(
        'INSERT INTO traits(version_id, trait_order, label) VALUES (?, ?, ?)',
        [(item['versionId'], index, label) for index, label in enumerate(item['traits'])],
    )
con.commit()
integrity = con.execute('PRAGMA integrity_check').fetchone()[0]
foreign_keys = con.execute('PRAGMA foreign_key_check').fetchall()
counts = {
    table: con.execute(f'SELECT COUNT(*) FROM {table}').fetchone()[0]
    for table in ('boxers', 'boxer_versions', 'ratings', 'tendencies', 'signature_actions', 'traits')
}
ali = con.execute(
    "SELECT b.name, v.style, r.hand_speed, t.jab_frequency "
    "FROM boxers b JOIN boxer_versions v USING(boxer_id) "
    "JOIN ratings r USING(version_id) JOIN tendencies t USING(version_id) "
    "WHERE lower(b.name) LIKE '%muhammad%'"
).fetchone()
result = {
    'integrity': integrity,
    'foreign_key_errors': foreign_keys,
    'counts': counts,
    'search_result': ali,
    'database_bytes': db_path.stat().st_size,
}
(root / 'sqlite-ci-audit.json').write_text(json.dumps(result, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
assert integrity == 'ok'
assert foreign_keys == []
assert counts == {
    'boxers': 20, 'boxer_versions': 20, 'ratings': 20,
    'tendencies': 20, 'signature_actions': 60, 'traits': 60,
}
assert ali and ali[0] == 'Muhammad Ali'
print(json.dumps(result, ensure_ascii=False))
con.close()
