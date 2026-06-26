const RAW = Array.isArray(window.IQ2GQ_DATA) ? window.IQ2GQ_DATA : [];
const ODDS_BANDS = [
  { id: 'under1.20', label: 'Under 1.20', min: 0, max: 1.199999 },
  { id: '1.20-1.39', label: '1.20-1.39', min: 1.2, max: 1.399999 },
  { id: '1.40-1.59', label: '1.40-1.59', min: 1.4, max: 1.599999 },
  { id: '1.60-1.89', label: '1.60-1.89', min: 1.6, max: 1.899999 },
  { id: '1.90-1.99', label: '1.90-1.99', min: 1.9, max: 1.999999 },
  { id: '2plus', label: '2.00+', min: 2, max: 999 }
];
const PRESETS = [
  { label: 'Best NRL', sport: 'Rugby League', search: 'NRL' },
  { label: 'Best NFL', sport: 'American Football', search: 'NFL' },
  { label: 'Best Union', sport: 'Rugby Union' },
  { label: 'Best Football', sport: 'Football' },
  { label: 'Best H2H', bet: 'H2H' },
  { label: 'Point starts', bet: 'Point Start' },
  { label: 'Anytime scorers', bet: 'Anytime Scorer' },
  { label: '$2+ odds', odds: '2plus' },
  { label: 'Low odds anchors', odds: '1.20-1.39' },
  { label: 'Losses only', result: 'No' }
];
const QUESTIONS = [
  { label: 'Who is best at NRL?', sport: 'Rugby League', search: 'NRL' },
  { label: 'Who is best at NFL?', sport: 'American Football', search: 'NFL' },
  { label: 'Who should take H2H anchors?', bet: 'H2H', odds: '1.20-1.39' },
  { label: 'Who wins most $2+ picks?', odds: '2plus' },
  { label: 'Where are crashes concentrated?', result: 'No' },
  { label: 'Which options are most backed?', page: 'teams' },
  { label: 'Which sports beat 70%?', page: 'sports' },
  { label: 'Which bet types are weak?', page: 'bets', result: 'No' }
];

const $ = id => document.getElementById(id);
const rows = RAW.map(normalise).filter(r => r.result === 'Yes' || r.result === 'No');

function normalise(r) {
  const odds = parseFloat(r.Odds);
  const sport = clean(r.Sport);
  const sportGroup = clean(r['Sport Group']) || inferSportGroup(sport);
  const betType = clean(r['Bet Type']) || clean(r['Cleaned up option']) || clean(r.Option);
  const date = clean(r.Date);
  return {
    key: clean(r.Key), date, ts: Date.parse(date) || 0, round: clean(r.Round), year: clean(r.FY) || clean(r['Annual Year']),
    member: clean(r['Member code']), betName: clean(r['Bet Name']), option: clean(r['Cleaned up option']) || clean(r.Option),
    rawOption: clean(r.Option), betType, betCategory: categoriseBet(betType), sport, sportGroup,
    odds: Number.isFinite(odds) ? odds : null, result: clean(r.Result), notes: clean(r['Special notes']), killer: clean(r['MM Killer/Sole Survivor'])
  };
}
function clean(v) { return v === null || v === undefined ? '' : String(v).replace(/\s+/g, ' ').trim(); }
function inferSportGroup(sport) {
  if (sport.includes('Rugby League')) return 'Rugby League';
  if (sport.includes('Rugby Union')) return 'Rugby Union';
  if (sport.includes('American Football')) return 'American Football';
  if (sport.includes('Football')) return 'Football';
  if (sport.includes('Basketball')) return 'Basketball';
  return sport.split('(')[0].trim() || 'Other';
}
function categoriseBet(s) {
  const x = s.toLowerCase();
  if (!x) return 'Other';
  if (x.includes('h2h') || x.includes('match result') || x.includes('match betting')) return 'H2H';
  if (x.includes('point start') || x.includes('line') || /\d+(\.\d+)? point/.test(x)) return 'Point Start';
  if (x.includes('anytime') || x.includes('try scorer') || x.includes('to score')) return 'Anytime Scorer';
  if (x.includes('total goals')) return 'Total Goals';
  if (x.includes('total combined') || x.includes('total points') || x.includes('over') || x.includes('under')) return 'Totals';
  if (x.includes('winning margin') || x.includes('13 and over') || x.includes('12 and under') || x.includes('1-12')) return 'Winning Margin';
  if (x.includes('tri bet')) return 'Tri Bet';
  if (x.includes('first')) return 'First Scoring';
  if (x.includes('half') || x.includes('full time') || x.includes('double') || x.includes('to win and')) return 'Combo';
  return 'Other';
}
function pct(v) { return `${(v * 100).toFixed(1)}%`; }
function money(v) { return `$${v.toFixed(2)}`; }
function avg(nums) { return nums.length ? nums.reduce((a,b)=>a+b,0) / nums.length : 0; }
function unique(arr) { return [...new Set(arr.filter(Boolean))]; }
function esc(v) { return String(v ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
function bandFor(odds) { return ODDS_BANDS.find(b => Number.isFinite(odds) && odds >= b.min && odds <= b.max); }
function bandLabel(odds) { return bandFor(odds)?.label || 'Unknown'; }

function init() {
  $('dataCount').textContent = rows.length.toLocaleString();
  const dated = rows.filter(r=>r.ts).sort((a,b)=>a.ts-b.ts);
  $('dateRange').textContent = dated.length ? `${dated[0].year} to ${dated[dated.length-1].year}` : '-';
  fillSelect('memberFilter', unique(rows.map(r => r.member)).sort());
  fillSelect('yearFilter', unique(rows.map(r => r.year)).sort());
  fillSelect('sportGroupFilter', unique(rows.map(r => r.sportGroup)).sort());
  fillSelect('sportFilter', unique(rows.map(r => r.sport)).sort());
  fillSelect('betCategoryFilter', unique(rows.map(r => r.betCategory)).sort());
  fillSelect('oddsBandFilter', ODDS_BANDS.map(b => ({ value: b.id, label: b.label })));
  makeButtons('presetButtons', PRESETS, applyPreset);
  makeButtons('questionButtons', QUESTIONS, applyPreset);
  document.querySelectorAll('input, select').forEach(el => el.addEventListener('input', update));
  document.querySelectorAll('.tab').forEach(btn => btn.addEventListener('click', () => showPage(btn.dataset.page)));
  $('resetBtn').addEventListener('click', reset);
  update();
}
function fillSelect(id, items) {
  const el = $(id); const first = el.querySelector('option')?.outerHTML || '';
  el.innerHTML = first;
  items.forEach(item => { const opt = document.createElement('option'); opt.value = typeof item === 'object' ? item.value : item; opt.textContent = typeof item === 'object' ? item.label : item; el.appendChild(opt); });
}
function makeButtons(id, list, handler) {
  const wrap = $(id); wrap.innerHTML = '';
  list.forEach(p => { const b = document.createElement('button'); b.type = 'button'; b.textContent = p.label; b.addEventListener('click', () => handler(p)); wrap.appendChild(b); });
}
function showPage(page) {
  document.querySelectorAll('.tab').forEach(x => x.classList.toggle('active', x.dataset.page === page));
  document.querySelectorAll('.page').forEach(x => x.classList.toggle('active', x.id === `page-${page}`));
  setTimeout(drawCharts, 30);
}
function applyPreset(p) {
  reset(false);
  if (p.sport) $('sportGroupFilter').value = p.sport;
  if (p.bet) $('betCategoryFilter').value = p.bet;
  if (p.odds) $('oddsBandFilter').value = p.odds;
  if (p.result) $('resultFilter').value = p.result;
  if (p.search !== undefined) $('searchInput').value = p.search;
  if (p.page) showPage(p.page);
  update();
}
function reset(run = true) {
  ['searchInput','memberFilter','yearFilter','sportGroupFilter','sportFilter','betCategoryFilter','oddsBandFilter','resultFilter'].forEach(id => $(id).value = '');
  $('minPicks').value = 8; $('sortBy').value = 'score';
  if (run) update();
}
function activeFilters() {
  return { q: $('searchInput').value.trim().toLowerCase(), member: $('memberFilter').value, year: $('yearFilter').value, sportGroup: $('sportGroupFilter').value, sport: $('sportFilter').value, betCategory: $('betCategoryFilter').value, oddsBand: $('oddsBandFilter').value, result: $('resultFilter').value, min: Math.max(1, Number($('minPicks').value || 1)), sortBy: $('sortBy').value };
}
function filteredRows() {
  const f = activeFilters(); const band = ODDS_BANDS.find(b => b.id === f.oddsBand);
  return rows.filter(r => {
    if (f.member && r.member !== f.member) return false;
    if (f.year && r.year !== f.year) return false;
    if (f.sportGroup && r.sportGroup !== f.sportGroup) return false;
    if (f.sport && r.sport !== f.sport) return false;
    if (f.betCategory && r.betCategory !== f.betCategory) return false;
    if (f.result && r.result !== f.result) return false;
    if (band && !(r.odds >= band.min && r.odds <= band.max)) return false;
    if (f.q) {
      const hay = [r.member,r.betName,r.option,r.rawOption,r.betType,r.betCategory,r.sport,r.sportGroup,r.year,r.notes,r.killer].join(' ').toLowerCase();
      if (!hay.includes(f.q)) return false;
    }
    return true;
  });
}
function stats(list) {
  const picks = list.length, wins = list.filter(r=>r.result === 'Yes').length, losses = picks - wins;
  const oddsList = list.map(r=>r.odds).filter(Number.isFinite);
  const avgOdds = avg(oddsList);
  const tenReturn = list.reduce((sum,r)=>sum + (r.result === 'Yes' && Number.isFinite(r.odds) ? 10 * r.odds : 0), 0);
  const spend = picks * 10, profit = tenReturn - spend, roi = spend ? profit / spend : 0, success = picks ? wins / picks : 0;
  const score = balancedScore(success, picks, roi);
  return { picks, wins, losses, success, avgOdds, tenReturn, spend, profit, roi, score };
}
function balancedScore(success, picks, roi) { const conf = 1 - Math.exp(-picks / 25); return (success * 75 + Math.max(-25, Math.min(25, roi * 100))) * conf; }
function groupBy(list, keyFn) {
  const m = new Map();
  list.forEach(r => { const k = keyFn(r); if (!k) return; if (!m.has(k)) m.set(k, []); m.get(k).push(r); });
  return [...m.entries()].map(([key, items]) => ({ key, items, ...stats(items) }));
}
function sortRows(items, sortBy = activeFilters().sortBy) {
  return items.sort((a,b) => {
    if (sortBy === 'success') return b.success - a.success || b.picks - a.picks;
    if (sortBy === 'wins') return b.wins - a.wins || b.success - a.success;
    if (sortBy === 'roi') return b.roi - a.roi || b.picks - a.picks;
    if (sortBy === 'avgOdds') return b.avgOdds - a.avgOdds || b.success - a.success;
    return b.score - a.score || b.success - a.success || b.picks - a.picks;
  });
}

let chartState = { members: [], sports: [] };
function update() {
  const list = filteredRows(); const f = activeFilters();
  const members = sortRows(groupBy(list, r=>r.member).filter(x=>x.picks >= f.min));
  renderKpis(list, members);
  renderMemberTables(list, members, f);
  renderSports(list, f);
  renderBetTypes(list, f);
  renderOdds(list, f);
  renderOptions(list, f);
  renderRecords(list, f);
  renderInsights(list, f);
  renderPickTable(list);
  chartState.members = members.slice(0, 13);
  chartState.sports = groupBy(list, r=>r.sportGroup).filter(x=>x.picks >= f.min).sort((a,b)=>b.picks-a.picks).slice(0,12).sort((a,b)=>b.success-a.success);
  drawCharts();
}
function renderKpis(list, members) {
  const s = stats(list); const sport = sortRows(groupBy(list, r=>r.sportGroup).filter(x=>x.picks >= activeFilters().min), 'score')[0];
  const cards = [[s.picks.toLocaleString(),'Filtered picks'],[s.wins.toLocaleString(),'Wins'],[pct(s.success),'Success rate'],[s.avgOdds ? s.avgOdds.toFixed(2) : '-','Average odds'],[money(s.profit),'$10 profit/loss'],[pct(s.roi),'$10 ROI'],[members[0]?.key || '-','Top member'],[members[0] ? `${pct(members[0].success)} from ${members[0].picks}` : '-','Top member record'],[sport?.key || '-','Top sport'],[sport ? `${pct(sport.success)} from ${sport.picks}` : '-','Top sport record']];
  $('kpiGrid').innerHTML = cards.map(c => `<div class="kpi"><b>${c[0]}</b><span>${c[1]}</span></div>`).join('');
}
function renderMemberTables(list, members, f) {
  $('rankingSummary').textContent = `${members.length} members qualify`;
  const data = members.map((x,i)=>[i+1,x.key,x.picks,x.wins,x.losses,pct(x.success),x.avgOdds.toFixed(2),money(x.profit),pct(x.roi),x.score.toFixed(1)]);
  table('homeMemberTable',['Rank','Member','Picks','Wins','Losses','Success','Avg odds','$10 P/L','ROI','Score'],data.slice(0,10),[0,2,3,4,6,7,8,9]);
  table('memberTable',['Rank','Member','Picks','Wins','Losses','Success','Avg odds','$10 P/L','ROI','Score'],data,[0,2,3,4,6,7,8,9]);
  const selected = f.member || members[0]?.key;
  renderProfile(list, selected);
  const strengths = selected ? sortRows(groupBy(list.filter(r=>r.member === selected), r=>`${r.sportGroup} - ${r.betCategory}`).filter(x=>x.picks >= Math.min(f.min,5)), 'score').slice(0,20) : [];
  table('memberStrengthTable',['Rank','Strength','Picks','Wins','Success','Avg odds','$10 P/L'],strengths.map((x,i)=>[i+1,x.key,x.picks,x.wins,pct(x.success),x.avgOdds.toFixed(2),money(x.profit)]),[0,2,3,5,6]);
  const form = groupBy(rows, r=>r.member).map(g => { const last = g.items.slice().sort((a,b)=>b.ts-a.ts).slice(0,20); return { key:g.key, filtered:list.filter(r=>r.member===g.key).length, ...stats(last) }; }).sort((a,b)=>b.success-a.success || b.wins-a.wins);
  table('formTable',['Member','Last 20','Wins','Success','Avg odds','Current filter picks'],form.map(x=>[x.key,x.picks,x.wins,pct(x.success),x.avgOdds.toFixed(2),x.filtered]),[1,2,4,5]);
}
function renderProfile(list, member) {
  if (!member) { $('memberProfile').innerHTML = '<p>No member selected.</p>'; return; }
  $('profileHint').textContent = member;
  const mine = rows.filter(r=>r.member === member), filtered = list.filter(r=>r.member === member), all = stats(mine), current = stats(filtered);
  const bestSport = sortRows(groupBy(mine, r=>r.sportGroup).filter(x=>x.picks>=5), 'score')[0];
  const bestBet = sortRows(groupBy(mine, r=>r.betCategory).filter(x=>x.picks>=5), 'score')[0];
  const worstBet = sortRows(groupBy(mine, r=>r.betCategory).filter(x=>x.picks>=5), 'success').reverse()[0];
  $('memberProfile').innerHTML = `<div class="mini-grid">
    <div><b>${all.picks}</b><span>all-time picks</span></div><div><b>${pct(all.success)}</b><span>all-time success</span></div><div><b>${money(all.profit)}</b><span>$10 all-time P/L</span></div><div><b>${current.picks}</b><span>filtered picks</span></div>
    <div><b>${bestSport?.key || '-'}</b><span>best sport group</span></div><div><b>${bestBet?.key || '-'}</b><span>best bet type</span></div><div><b>${worstBet?.key || '-'}</b><span>weakest bet type</span></div><div><b>${all.avgOdds.toFixed(2)}</b><span>average odds</span></div>
  </div>`;
}
function renderSports(list, f) {
  const sports = sortRows(groupBy(list, r=>r.sportGroup).filter(x=>x.picks>=f.min));
  table('sportsTable',['Rank','Sport group','Picks','Wins','Losses','Success','Avg odds','$10 P/L','Best bet type'],sports.map((x,i)=>{ const best=sortRows(groupBy(x.items,r=>r.betCategory).filter(y=>y.picks>=Math.min(f.min,5)),'score')[0]; return [i+1,x.key,x.picks,x.wins,x.losses,pct(x.success),x.avgOdds.toFixed(2),money(x.profit),best?`${best.key} (${pct(best.success)}, n=${best.picks})`:'-'];}),[0,2,3,4,6,7]);
  const best = sports.map(s => { const bm = sortRows(groupBy(s.items,r=>r.member).filter(x=>x.picks>=Math.min(f.min,5)),'score')[0]; return bm ? [s.key,bm.key,bm.picks,bm.wins,pct(bm.success),bm.avgOdds.toFixed(2),money(bm.profit)] : null; }).filter(Boolean);
  table('bestMemberSportTable',['Sport','Best member','Picks','Wins','Success','Avg odds','$10 P/L'],best,[2,3,5,6]);
  matrix('sportMemberMatrix', unique(list.map(r=>r.sportGroup)).sort(), unique(rows.map(r=>r.member)).sort(), (sport, member)=>list.filter(r=>r.sportGroup===sport && r.member===member), f.min);
}
function renderBetTypes(list, f) {
  const bets = sortRows(groupBy(list, r=>r.betCategory).filter(x=>x.picks>=f.min));
  table('betTypeTable',['Rank','Bet type','Picks','Wins','Losses','Success','Avg odds','$10 P/L'],bets.map((x,i)=>[i+1,x.key,x.picks,x.wins,x.losses,pct(x.success),x.avgOdds.toFixed(2),money(x.profit)]),[0,2,3,4,6,7]);
  const best = bets.map(s => { const bm=sortRows(groupBy(s.items,r=>r.member).filter(x=>x.picks>=Math.min(f.min,5)),'score')[0]; return bm ? [s.key,bm.key,bm.picks,bm.wins,pct(bm.success),bm.avgOdds.toFixed(2),money(bm.profit)] : null; }).filter(Boolean);
  table('bestMemberBetTable',['Bet type','Best member','Picks','Wins','Success','Avg odds','$10 P/L'],best,[2,3,5,6]);
  matrix('betOddsMatrix', unique(list.map(r=>r.betCategory)).sort(), ODDS_BANDS.map(b=>b.label), (bet, band) => { const b=ODDS_BANDS.find(x=>x.label===band); return list.filter(r=>r.betCategory===bet && b && r.odds>=b.min && r.odds<=b.max); }, f.min);
}
function renderOdds(list, f) {
  const bands = ODDS_BANDS.map(b=>({ key:b.label, items:list.filter(r=>r.odds>=b.min && r.odds<=b.max) })).map(x=>({ ...x, ...stats(x.items) }));
  table('oddsTable',['Odds band','Picks','Wins','Losses','Success','Avg odds','$10 P/L','ROI'],bands.map(x=>[x.key,x.picks,x.wins,x.losses,pct(x.success),x.avgOdds ? x.avgOdds.toFixed(2) : '-',money(x.profit),pct(x.roi)]),[1,2,3,5,6,7]);
  renderHeatmap(list, f.min);
  const high = sortRows(groupBy(list.filter(r=>r.odds>=2), r=>r.member).filter(x=>x.picks>=Math.min(f.min,3)), 'score');
  table('highOddsTable',['Rank','Member','Picks','Wins','Losses','Success','Avg odds','$10 P/L','ROI'],high.map((x,i)=>[i+1,x.key,x.picks,x.wins,x.losses,pct(x.success),x.avgOdds.toFixed(2),money(x.profit),pct(x.roi)]),[0,2,3,4,6,7,8]);
}
function renderOptions(list, f) {
  const options = sortRows(groupBy(list, r=>r.betName).filter(x=>x.picks>=f.min), 'wins').slice(0,100);
  table('optionTable',['Rank','Option/team','Picks','Wins','Losses','Success','Avg odds','$10 P/L','Most common sport'],options.map((x,i)=>{ const sport=groupBy(x.items,r=>r.sportGroup).sort((a,b)=>b.picks-a.picks)[0]; return [i+1,x.key,x.picks,x.wins,x.losses,pct(x.success),x.avgOdds.toFixed(2),money(x.profit),sport?.key || '-'];}),[0,2,3,4,6,7]);
  const optionMembers = options.slice(0,40).map(o => { const bm=sortRows(groupBy(o.items,r=>r.member).filter(x=>x.picks>=Math.min(f.min,3)),'score')[0]; return bm ? [o.key,bm.key,bm.picks,bm.wins,pct(bm.success),bm.avgOdds.toFixed(2),money(bm.profit)] : null; }).filter(Boolean);
  table('optionMemberTable',['Option/team','Best member','Picks','Wins','Success','Avg odds','$10 P/L'],optionMembers,[2,3,5,6]);
}
function renderRecords(list, f) {
  const wins = rows.filter(r=>r.result==='Yes' && Number.isFinite(r.odds)); const losses = rows.filter(r=>r.result==='No' && Number.isFinite(r.odds));
  const rec = [
    ['Highest successful odds', maxBy(wins,r=>r.odds)], ['Lowest crashed odds', minBy(losses,r=>r.odds)], ['Most all-time picks', maxBy(groupBy(rows,r=>r.member), r=>r.picks)], ['Most all-time wins', maxBy(groupBy(rows,r=>r.member), r=>r.wins)], ['Best all-time success rate (min 100)', maxBy(groupBy(rows,r=>r.member).filter(x=>x.picks>=100), r=>r.success)], ['Best $10 all-time P/L', maxBy(groupBy(rows,r=>r.member), r=>r.profit)]
  ].map(([label,x]) => [label, formatRecord(x)]);
  table('recordsTable',['Record','Holder / detail'],rec,[]);
  const streaks = unique(rows.map(r=>r.member)).map(m=>({ member:m, ...calcStreak(rows.filter(r=>r.member===m).sort((a,b)=>a.ts-b.ts)) })).sort((a,b)=>b.bestWin-a.bestWin);
  table('streakTable',['Member','Best win streak','Worst losing streak','Current streak'],streaks.map(x=>[x.member,x.bestWin,x.bestLoss,x.current]),[1,2]);
  const lowCrashes = losses.slice().sort((a,b)=>a.odds-b.odds).slice(0,8).map(r=>['Low odds crash',r.date,r.member,r.betName,r.sport,r.betCategory,r.odds.toFixed(2)]);
  const highMisses = losses.slice().sort((a,b)=>b.odds-a.odds).slice(0,8).map(r=>['High odds miss',r.date,r.member,r.betName,r.sport,r.betCategory,r.odds.toFixed(2)]);
  table('crashTable',['Type','Date','Member','Option','Sport','Bet type','Odds'],lowCrashes.concat(highMisses),[6]);
}
function maxBy(arr, fn) { return arr.reduce((best,x)=>!best || fn(x)>fn(best) ? x : best, null); }
function minBy(arr, fn) { return arr.reduce((best,x)=>!best || fn(x)<fn(best) ? x : best, null); }
function formatRecord(x) {
  if (!x) return '-';
  if (x.member) return `${x.member}: ${x.picks} picks, ${x.wins} wins, ${pct(x.success)}, ${money(x.profit)} $10 P/L`;
  if (x.key && x.items) return `${x.key}: ${x.picks} picks, ${x.wins} wins, ${pct(x.success)}, ${money(x.profit)} $10 P/L`;
  return `${x.member || ''} ${x.date || ''} ${x.betName || ''} ${x.odds ? '@ '+x.odds.toFixed(2) : ''}`.trim();
}
function calcStreak(items) {
  let bestWin=0,bestLoss=0,curType='',cur=0;
  items.forEach(r=>{ const t=r.result==='Yes'?'W':'L'; if(t===curType) cur++; else {curType=t; cur=1;} if(t==='W') bestWin=Math.max(bestWin,cur); else bestLoss=Math.max(bestLoss,cur); });
  return { bestWin, bestLoss, current: curType ? `${curType}${cur}` : '-' };
}
function renderInsights(list, f) {
  const combos = sortRows(groupBy(list, r=>`${r.member} - ${r.sportGroup} - ${r.betCategory}`).filter(x=>x.picks>=f.min), 'score');
  const recs = combos.slice(0,8).map(x=>`<li><b>${esc(x.key)}</b>: ${pct(x.success)} from ${x.picks}, avg odds ${x.avgOdds.toFixed(2)}, ${money(x.profit)} $10 P/L.</li>`).join('') || '<li>No qualifying recommendation. Lower the minimum-picks filter.</li>';
  $('recommendations').innerHTML = `<ol>${recs}</ol>`;
  const weak = sortRows(groupBy(list, r=>`${r.member} - ${r.sportGroup} - ${r.betCategory}`).filter(x=>x.picks>=f.min), 'success').reverse().slice(0,8);
  $('warnings').innerHTML = `<ol>${weak.map(x=>`<li><b>${esc(x.key)}</b>: ${pct(x.success)} from ${x.picks}, ${money(x.profit)} $10 P/L.</li>`).join('') || '<li>No qualifying risk warnings.</li>'}</ol>`;
}
function renderPickTable(list) {
  const latest = list.slice().sort((a,b)=>b.ts-a.ts).slice(0,500);
  $('pickSummary').textContent = `showing ${latest.length} of ${list.length}`;
  table('pickTable',['Date','Year','Round','Member','Option/team','Sport','Bet type','Odds','Band','Result','Notes'],latest.map(r=>[r.date,r.year,r.round,r.member,r.betName,r.sport,r.betCategory,Number.isFinite(r.odds)?r.odds.toFixed(2):'-',bandLabel(r.odds),r.result==='Yes'?'Win':'Loss',r.notes || r.killer]),[2,7]);
}
function table(id, heads, data, numCols=[]) {
  const el = $(id); if (!el) return;
  const th = heads.map((h,i)=>`<th class="${numCols.includes(i)?'num':''}">${esc(h)}</th>`).join('');
  const tr = data.map(row=>`<tr>${row.map((v,i)=>{ if(v==='Win') return '<td><span class="badge win">Win</span></td>'; if(v==='Loss') return '<td><span class="badge loss">Loss</span></td>'; return `<td class="${numCols.includes(i)?'num':''}">${esc(v)}</td>`; }).join('')}</tr>`).join('');
  el.innerHTML = `<thead><tr>${th}</tr></thead><tbody>${tr}</tbody>`;
}
function matrix(id, rowLabels, colLabels, subsetFn, min) {
  const wrap = $(id); if (!wrap) return;
  rowLabels = rowLabels.slice(0,20); colLabels = colLabels.slice(0,12);
  let html = `<div class="matrix-row"><div class="matrix-cell head">Category</div>${colLabels.map(c=>`<div class="matrix-cell head">${esc(c)}</div>`).join('')}</div>`;
  rowLabels.forEach(r=>{ html += `<div class="matrix-row"><div class="matrix-cell head">${esc(r)}</div>`; colLabels.forEach(c=>{ const s=stats(subsetFn(r,c)); const good=s.picks>=min; const cls=!good?'na':s.success>=.7?'good':s.success>=.6?'ok':'bad'; html += `<div class="matrix-cell ${cls}"><b>${s.picks?pct(s.success):'-'}</b><small>n=${s.picks}</small></div>`; }); html += '</div>'; });
  wrap.innerHTML = html;
}
function renderHeatmap(list, min) {
  matrix('heatmap', unique(rows.map(r=>r.member)).sort(), ODDS_BANDS.map(b=>b.label), (member, band)=>{ const b=ODDS_BANDS.find(x=>x.label===band); return list.filter(r=>r.member===member && b && r.odds>=b.min && r.odds<=b.max); }, min);
}
function drawCharts() {
  drawBar('memberChart', chartState.members.map(x=>x.key), chartState.members.map(x=>x.success*100), chartState.members.map(x=>`n=${x.picks}`));
  drawBar('sportChart', chartState.sports.map(x=>x.key), chartState.sports.map(x=>x.success*100), chartState.sports.map(x=>`n=${x.picks}`));
}
function drawBar(id, labels, values, sublabels) {
  const c=$(id); if(!c || c.offsetParent===null) return; const ctx=c.getContext('2d'), dpr=window.devicePixelRatio||1, rect=c.getBoundingClientRect();
  c.width=rect.width*dpr; c.height=Number(c.getAttribute('height')||300)*dpr; ctx.scale(dpr,dpr);
  const w=rect.width,h=Number(c.getAttribute('height')||300); ctx.clearRect(0,0,w,h); ctx.fillStyle='#0b1118'; ctx.fillRect(0,0,w,h);
  if(!labels.length){ctx.fillStyle='#aab8c8'; ctx.fillText('No qualifying data',16,28); return;}
  const left=120,right=20,top=18,rowH=Math.max(20,(h-top-10)/labels.length);
  labels.forEach((label,i)=>{ const y=top+i*rowH, barW=(w-left-right)*(values[i]/100); ctx.fillStyle='#aab8c8'; ctx.font='12px Arial'; ctx.fillText(label.slice(0,18),8,y+rowH*.62); ctx.fillStyle='#1c2836'; ctx.fillRect(left,y+4,w-left-right,rowH-8); ctx.fillStyle=values[i]>=70?'#22c55e':values[i]>=60?'#f59e0b':'#ef4444'; ctx.fillRect(left,y+4,barW,rowH-8); ctx.fillStyle='#f4f7fb'; ctx.fillText(`${values[i].toFixed(1)}% ${sublabels[i]}`,left+Math.min(barW+8,w-left-right-85),y+rowH*.62); });
}
window.addEventListener('resize', () => setTimeout(drawCharts, 50));
init();
