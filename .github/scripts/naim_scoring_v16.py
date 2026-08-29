from pathlib import Path
import json, re, shutil

root = Path('naim-book-android')
project = root / 'buildsrc-v11' / 'Naim_Mondes_Impossibles_Android'
if not project.exists():
    raise SystemExit('Run v1.1 + v1.2 + v1.5 scripts first')

assets = project / 'app/src/main/assets'
index = assets / 'index.html'
appjs = assets / 'app.js'
cssp = assets / 'styles.css'
bookp = assets / 'book.json'

SCORES = [[(2, 1, 2, 0), (1, 1, 2, 0), (1, 2, 1, 0)], [(1, 0, 2, 0), (0, 0, 1, 2), (0, 0, 2, 2)], [(2, 0, 1, 0), (0, 0, 3, 0), (1, 0, 1, 1)], [(0, 1, 2, 0), (1, 0, 0, 2), (0, 3, 0, 0)], [(0, 0, 0, 3), (0, 0, 0, 2), (0, 0, 2, 0)], [(3, 0, 1, 0), (0, 0, 1, 1), (0, 0, 1, 2)], [(1, 0, 0, 3), (0, 0, 3, 1), (1, 0, 3, 0)], [(1, 0, 0, 1), (0, 0, 2, 1), (0, 0, 2, 0)], [(1, 0, 3, 0), (1, 0, 0, 3), (0, 0, 3, 0)], [(1, 0, 2, 0), (0, 0, 0, 3), (0, 0, 3, 0)], [(2, 0, 2, 0), (2, 0, 1, 0), (1, 0, 3, 0)], [(2, 0, 1, 0), (0, 0, 1, 2), (0, 0, 2, 1)], [(2, 1, 0, 0), (1, 0, 0, 2), (1, 1, 3, 0)], [(0, 0, 0, 1), (1, 0, 3, 0), (0, 0, 1, 2)], [(2, 0, 2, 0), (1, 0, 2, 0), (0, 0, 3, 0)], [(2, 0, 0, 2), (0, 1, 0, 0), (2, 0, 1, 1)], [(1, 0, 2, 0), (1, 0, 3, 0), (0, 0, 3, 0)], [(2, 0, 1, 0), (0, 0, 1, 2), (0, 1, 1, 0)], [(1, 0, 0, 3), (1, 0, 0, 3), (0, 0, 2, 1)], [(0, 0, 1, 1), (0, 0, 1, 1), (0, 0, 2, 0)], [(2, 0, 1, 0), (1, 0, 0, 2), (0, 0, 3, 0)], [(2, 0, 2, 0), (0, 1, 3, 0), (1, 0, 2, 0)], [(3, 0, 1, 0), (2, 0, 3, 0), (1, 0, 0, 2)], [(1, 0, 0, 3), (1, 0, 1, 0), (0, 0, 1, 0)], [(0, 0, 1, 1), (0, 0, 1, 0), (0, 0, 2, 1)], [(0, 0, 1, 2), (0, 0, 0, 2), (0, 0, 1, 1)], [(1, 0, 2, 0), (0, 0, 3, 0), (0, 0, 2, 0)], [(0, 0, 3, 0), (0, 0, 1, 3), (0, 0, 3, 0)], [(1, 0, 3, 0), (0, 0, 1, 2), (2, 0, 2, 0)], [(2, 1, 0, 0), (0, 0, 0, 3), (0, 0, 2, 0)], [(3, 1, 0, 0), (1, 2, 0, 0), (1, 0, 2, 0)], [(0, 0, 1, 1), (2, 0, 0, 0), (0, 0, 0, 3)], [(2, 0, 1, 0), (0, 1, 1, 0), (1, 0, 0, 3)], [(1, 0, 2, 0), (1, 0, 1, 2), (1, 0, 2, 0)], [(0, 0, 3, 0), (0, 0, 3, 0), (0, 0, 2, 1)], [(3, 0, 0, 0), (2, 0, 0, 2), (1, 0, 2, 0)], [(0, 0, 0, 3), (0, 0, 0, 3), (0, 0, 3, 0)], [(1, 0, 2, 0), (0, 0, 1, 2), (0, 0, 0, 2)], [(0, 0, 3, 0), (0, 0, 3, 0), (0, 2, 0, 1)], [(1, 0, 2, 0), (1, 0, 2, 0), (2, 0, 3, 0)], [(0, 0, 3, 0), (0, 0, 2, 1), (1, 0, 3, 0)], [(1, 0, 1, 0), (0, 0, 3, 0), (0, 0, 2, 0)], [(1, 0, 0, 0), (0, 0, 3, 0), (0, 0, 1, 2)], [(2, 0, 2, 0), (0, 0, 0, 3), (0, 0, 1, 2)], [(1, 1, 0, 0), (1, 0, 0, 3), (3, 0, 1, 0)], [(2, 0, 2, 0), (0, 0, 1, 2), (0, 0, 1, 1)], [(1, 0, 3, 0), (0, 0, 3, 0), (0, 0, 2, 1)], [(1, 0, 1, 0), (0, 0, 0, 3), (0, 0, 2, 0)], [(1, 0, 3, 0), (2, 1, 0, 0), (2, 0, 3, 0)], [(0, 0, 0, 3), (0, 0, 3, 1), (0, 0, 1, 3)], [(1, 0, 0, 2), (1, 0, 3, 0), (3, 2, 0, 0)], [(0, 0, 3, 1), (0, 0, 0, 3), (0, 0, 2, 1)], [(1, 0, 3, 0), (0, 1, 0, 3), (0, 0, 3, 0)], [(3, 0, 0, 0), (1, 0, 0, 3), (1, 0, 0, 3)], [(2, 0, 0, 3), (2, 0, 2, 0), (0, 0, 3, 0)], [(2, 0, 0, 1), (0, 0, 1, 3), (0, 0, 2, 1)], [(2, 0, 0, 2), (1, 0, 2, 1), (2, 0, 2, 1)], [(2, 0, 2, 0), (0, 1, 0, 1), (0, 2, 2, 0)], [(2, 0, 2, 0), (0, 1, 0, 3), (1, 0, 0, 3)], [(3, 0, 3, 0), (0, 2, 0, 0), (1, 1, 0, 0)]]
assert len(SCORES) == 60 and all(len(scene)==3 for scene in SCORES)
assert sum(len(scene) for scene in SCORES) == 180
assert all(len(v)==4 for scene in SCORES for v in scene)
assert all(0 <= n <= 3 for scene in SCORES for v in scene for n in v)

book = json.loads(bookp.read_text(encoding='utf-8'))
flat = [s for c in book['chapters'] for s in c['scenes']]
assert len(flat) == 60
assert sum(len(s['choices']) for s in flat) == 180

audit = []
for si, scene in enumerate(flat):
    for ci, choice in enumerate(scene['choices']):
        c,f,u,k = SCORES[si][ci]
        audit.append({
            'sceneIndex': si,
            'scene': scene['title'],
            'choiceIndex': ci,
            'choice': choice,
            'scores': {'courage':c,'fear':f,'curiosity':u,'kindness':k}
        })
(assets/'scoring-v16.json').write_text(json.dumps(audit, ensure_ascii=False, indent=2), encoding='utf-8')

html = index.read_text(encoding='utf-8')
html = html.replace('id="gaugeCourageVal">0/10', 'id="gaugeCourageVal">0 pt')
html = html.replace('id="gaugeFearVal">0/10', 'id="gaugeFearVal">0 pt')
html = html.replace('id="gaugeCuriosityVal">0/10', 'id="gaugeCuriosityVal">0 pt')
html = html.replace('id="gaugeKindnessVal">0/10', 'id="gaugeKindnessVal">0 pt')
if 'id="scoreToast"' not in html:
    html = html.replace(
        '<div id="choiceResult" class="choice-result hidden" aria-live="polite"></div>',
        '<div id="choiceResult" class="choice-result hidden" aria-live="polite"></div>\n          <div id="scoreToast" class="score-toast hidden" aria-live="polite"></div>'
    )
html = html.replace(
    'Courage, Peur, Curiosité et Gentillesse changent selon tes choix.',
    'Chaque choix donne de vrais points de Courage, Peur, Curiosité ou Gentillesse.'
)
index.write_text(html, encoding='utf-8')

js = appjs.read_text(encoding='utf-8')
score_map_js = json.dumps(SCORES, ensure_ascii=False, separators=(',',':'))
new_profile = r'''
  const SCORE_MAP = __SCORE_MAP__;
  const SCORE_MAX = (() => {
    const max={courage:0,fear:0,curiosity:0,kindness:0};
    SCORE_MAP.forEach(scene => {
      max.courage += Math.max(...scene.map(v=>v[0]));
      max.fear += Math.max(...scene.map(v=>v[1]));
      max.curiosity += Math.max(...scene.map(v=>v[2]));
      max.kindness += Math.max(...scene.map(v=>v[3]));
    });
    return max;
  })();

  function getChoiceScore(sceneIndex, choiceIndex){
    const v=(SCORE_MAP[sceneIndex]||[])[choiceIndex] || [0,0,0,0];
    return {courage:v[0], fear:v[1], curiosity:v[2], kindness:v[3]};
  }

  function getAdventureProfile(){
    const p={courage:0,fear:0,curiosity:0,kindness:0};
    Object.entries(state.choices || {}).forEach(([sceneKey, choiceIndex]) => {
      const d=getChoiceScore(Number(sceneKey), Number(choiceIndex));
      p.courage+=d.courage; p.fear+=d.fear; p.curiosity+=d.curiosity; p.kindness+=d.kindness;
    });
    p.levels={
      courage:SCORE_MAX.courage ? Math.round(p.courage/SCORE_MAX.courage*10) : 0,
      fear:SCORE_MAX.fear ? Math.round(p.fear/SCORE_MAX.fear*10) : 0,
      curiosity:SCORE_MAX.curiosity ? Math.round(p.curiosity/SCORE_MAX.curiosity*10) : 0,
      kindness:SCORE_MAX.kindness ? Math.round(p.kindness/SCORE_MAX.kindness*10) : 0
    };
    return p;
  }

  function setGauge(name, value){
    const ids={courage:'Courage',fear:'Fear',curiosity:'Curiosity',kindness:'Kindness'};
    const suffix=ids[name], bar=$('gauge'+suffix+'Bar'), val=$('gauge'+suffix+'Val');
    const max=SCORE_MAX[name] || 1;
    if(bar) bar.style.width=`${Math.min(100,(value/max)*100)}%`;
    if(val) val.textContent=`${value} pt${value>1?'s':''}`;
  }

  function renderGauges(){
    const p=getAdventureProfile();
    setGauge('courage',p.courage); setGauge('fear',p.fear);
    setGauge('curiosity',p.curiosity); setGauge('kindness',p.kindness);
  }

  function scoreText(d){
    const parts=[];
    if(d.courage) parts.push(`🦁 +${d.courage} Courage`);
    if(d.fear) parts.push(`🌙 +${d.fear} Peur`);
    if(d.curiosity) parts.push(`🔎 +${d.curiosity} Curiosité`);
    if(d.kindness) parts.push(`💛 +${d.kindness} Gentillesse`);
    return parts.length ? parts.join(' · ') : 'Ce choix ne change pas les jauges.';
  }

  function showScoreToast(d){
    const el=$('scoreToast');
    if(!el) return;
    el.textContent=scoreText(d);
    el.classList.remove('hidden','score-pop');
    void el.offsetWidth;
    el.classList.add('score-pop');
  }
'''.replace('__SCORE_MAP__', score_map_js)

pat = r"\n  function getAdventureProfile\(\)\{.*?\n  function current\(\)\{"
m = re.search(pat, js, flags=re.S)
if not m:
    raise SystemExit('Could not locate v1.5 adventure profile block')
js = js[:m.start()] + '\n' + new_profile + '\n  function current(){' + js[m.end():]

choose_pat = r"  function choose\(sceneIndex, choiceIndex\)\{.*?\n  \}\n\n  function next\(\)\{"
choose_repl = r'''  function choose(sceneIndex, choiceIndex){
    const delta=getChoiceScore(sceneIndex, choiceIndex);
    state.choices[sceneIndex] = choiceIndex;
    const scene = flatScenes[sceneIndex];
    state.lastResult = scene.results[choiceIndex];
    save(); renderReader(); showScoreToast(delta);
  }

  function next(){'''
js, n = re.subn(choose_pat, choose_repl, js, count=1, flags=re.S)
if n != 1:
    raise SystemExit('Could not replace choose()')

js = re.sub(
    r"if\(bagText\) bagText\.textContent=`Courage \$\{p\.courage\}/10 · Peur \$\{p\.fear\}/10 · Curiosité \$\{p\.curiosity\}/10 · Gentillesse \$\{p\.kindness\}/10`;",
    r"if(bagText) bagText.textContent=`Courage ${p.courage} pts · Peur ${p.fear} pts · Curiosité ${p.curiosity} pts · Gentillesse ${p.kindness} pts`;",
    js
)

finish_pat = r"  function finish\(\)\{.*?\n  \}\n\n  \$\('startBtn'\)"
finish_repl = r'''  function finish(){
    state.finished=true; save();
    const p=getAdventureProfile();
    const l=p.levels;
    const finalChoice=state.choices[58];
    const ranked=[['courage',l.courage],['fear',l.fear],['curiosity',l.curiosity],['kindness',l.kindness]].sort((a,b)=>b[1]-a[1]);
    let title, text, icon='❤️';
    if(l.courage>=5 && l.curiosity>=5 && l.kindness>=5){
      title='Naïm, Grand Gardien des Mondes';
      text='Naïm a osé avancer, observé les mystères et pris soin de ses amis. Le Cœur des Mondes sait qu’il peut compter sur lui.';
      icon='🌟';
    } else if(ranked[0][0]==='kindness'){
      title='Naïm, Ami de tous les Mondes';
      text='Naïm a souvent choisi d’aider, de partager et de penser aux autres. Ses amis savent qu’ils peuvent compter sur lui.';
      icon='🤝';
    } else if(ranked[0][0]==='curiosity'){
      title='Naïm, Explorateur des Secrets';
      text='Naïm a posé des questions, observé les indices et testé beaucoup d’idées. Peu de mystères lui échappent.';
      icon='🔎';
    } else if(ranked[0][0]==='fear'){
      title='Naïm, Courageux même quand il a peur';
      text='Naïm a ressenti la peur plusieurs fois. Il a appris qu’on peut avoir peur, réfléchir, puis continuer quand on se sent prêt.';
      icon='🌙';
    } else {
      title='Naïm, Aventurier des Portes';
      text='Naïm a souvent choisi d’avancer vers l’inconnu et d’essayer. Les portes impossibles ne lui font plus tourner les talons.';
      icon='🚪';
    }
    if(finalChoice===1) text += ' Il choisit aussi de laisser chaque monde se reposer en paix.';
    if(finalChoice===2) text += ' Il garde les portes prêtes à s’ouvrir quand quelqu’un a vraiment besoin d’aide.';
    $('endingIcon').textContent=icon; $('endingTitle').textContent=title; $('endingText').textContent=text;
    const profileBox=$('endingProfile');
    if(profileBox){
      profileBox.innerHTML=`<h3>⭐ Ton aventure</h3><p>Voici les vrais points gagnés avec tes choix.</p><div class="ending-profile-values"><span>🦁 ${p.courage} pts</span><span>🌙 ${p.fear} pts</span><span>🔎 ${p.curiosity} pts</span><span>💛 ${p.kindness} pts</span></div>`;
    }
    show('endingScreen');
  }

  $('startBtn')'''
js, n = re.subn(finish_pat, finish_repl, js, count=1, flags=re.S)
if n != 1:
    raise SystemExit('Could not replace finish()')

appjs.write_text(js, encoding='utf-8')

css = cssp.read_text(encoding='utf-8')
if '.score-toast{' not in css:
    css += r'''
.score-toast{margin-top:10px;padding:10px 12px;border-radius:14px;background:#23243a;border:1px solid #454862;font-weight:900;font-size:13px;line-height:1.35;text-align:center}
.score-toast.score-pop{animation:scorePop .42s ease}
@keyframes scorePop{0%{transform:scale(.96);opacity:.35}55%{transform:scale(1.025);opacity:1}100%{transform:scale(1);opacity:1}}
'''
cssp.write_text(css, encoding='utf-8')

gradle = project / 'app/build.gradle'
g = gradle.read_text(encoding='utf-8')
g = g.replace("applicationId 'com.naim.mondesimpossibles.reader'", "applicationId 'com.naim.mondesimpossibles.reader.scored'")
g = g.replace('versionCode 6', 'versionCode 7').replace("versionName '1.5.0'", "versionName '1.6.0'")
gradle.write_text(g, encoding='utf-8')

out = root / 'Naim_Mondes_Impossibles_Android_v1.6_ScoringComplet_Source.zip'
if out.exists(): out.unlink()
shutil.make_archive(str(out.with_suffix('')), 'zip', root_dir=root/'buildsrc-v11', base_dir='Naim_Mondes_Impossibles_Android')

js2=appjs.read_text(encoding='utf-8')
html2=index.read_text(encoding='utf-8')
assert 'SCORE_MAP' in js2 and 'getChoiceScore' in js2 and 'scoreText' in js2
assert 'choiceIndex===0' not in js2
assert 'label = (scene.choices' not in js2
assert 'scoreToast' in html2
assert len(audit)==180
assert "applicationId 'com.naim.mondesimpossibles.reader.scored'" in g
assert "versionName '1.6.0'" in g
assert not (assets/'illustrations').exists()
print('V1.6 SCORING COMPLET OK: 180/180 explicit choices, 4 real cumulative scores, no images, no search-and-find')
