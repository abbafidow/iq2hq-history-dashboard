const data = (window.IQ2GQ_DATA || []).map(d => ({...d, win: d.Result === 'Yes'}));
const ids = ['search','member','sportGroup','sport','betType','year','oddsMin','oddsMax','minPicks'];
const el = Object.fromEntries(ids.map(id => [id, document.getElementById(id)]));
let charts = {};

function uniq(arr){return [...new Set(arr.filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b)));}
function optionList(select, values, label='All'){
  const current = select.value;
  select.innerHTML = `<option value="">${label}</option>` + values.map(v => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('');
  if(values.includes(current)) select.value = current;
}
function escapeHtml(s){return String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
function pct(n,d){return d ? (100*n/d) : 0;}
function fmtPct(n){return `${n.toFixed(1)}%`;}
function avg(arr){const v=arr.filter(x=>Number.isFinite(x)); return v.length ? v.reduce((a,b)=>a+b,0)/v.length : 0;}
function oddsBand(o){
  if(!Number.isFinite(o)) return 'No odds';
  if(o < 1.20) return 'Under 1.20';
  if(o < 1.40) return '1.20-1.39';
  if(o < 1.60) return '1.40-1.59';
  if(o < 1.80) return '1.60-1.79';
  if(o < 2.00) return '1.80-1.99';
  if(o < 3.00) return '2.00-2.99';
  return '3.00+';
}
function groupBy(rows, key){
  const m = new Map();
  rows.forEach(r => {const k = typeof key === 'function' ? key(r) : r[key]; if(!k) return; if(!m.has(k)) m.set(k, []); m.get(k).push(r);});
  return m;
}
function summarise(rows, key){
  return [...groupBy(rows,key)].map(([name,rs]) => {
    const wins = rs.filter(r=>r.win).length;
    return {name, picks:rs.length, wins, losses:rs.length-wins, sr:pct(wins,rs.length), avgOdds:avg(rs.map(r=>r.Odds))};
  });
}
function filtered(){
  const q = el.search.value.trim().toLowerCase();
  const min = parseFloat(el.oddsMin.value), max = parseFloat(el.oddsMax.value);
  return data.filter(r => {
    if(el.member.value && r['Member code'] !== el.member.value) return false;
    if(el.sportGroup.value && r['Sport Group'] !== el.sportGroup.value) return false;
    if(el.sport.value && r.Sport !== el.sport.value) return false;
    if(el.betType.value && r['Bet Type'] !== el.betType.value) return false;
    if(el.year.value && r.FY !== el.year.value && r['Annual Year'] !== el.year.value) return false;
    if(Number.isFinite(min) && (!Number.isFinite(r.Odds) || r.Odds < min)) return false;
    if(Number.isFinite(max) && (!Number.isFinite(r.Odds) || r.Odds > max)) return false;
    if(q){
      const hay = [r['Member code'],r['Bet Name'],r['Bet Type'],r.Sport,r['Sport Group'],r.FY,r.Result].join(' ').toLowerCase();
      if(!hay.includes(q)) return false;
    }
    return true;
  });
}
function populateFilters(){
  optionList(el.member, uniq(data.map(r=>r['Member code'])), 'All members');
  optionList(el.sportGroup, uniq(data.map(r=>r['Sport Group'])), 'All sport groups');
  optionList(el.sport, uniq(data.map(r=>r.Sport)), 'All sports');
  optionList(el.betType, uniq(data.map(r=>r['Bet Type'])), 'All bet types');
  optionList(el.year, uniq(data.map(r=>r.FY || r['Annual Year'])).reverse(), 'All years');
}
function smartFilterLists(){
  const sg = el.sportGroup.value;
  const sports = data.filter(r => !sg || r['Sport Group'] === sg).map(r=>r.Sport);
  optionList(el.sport, uniq(sports), 'All sports');
}
function drawChart(id, type, labels, values, secondValues){
  if(charts[id]) charts[id].destroy();
  const datasets = [{label:'Success rate %', data:values, borderWidth:1}];
  if(secondValues) datasets.push({label:'Picks', data:secondValues, borderWidth:1, yAxisID:'y1'});
  charts[id] = new Chart(document.getElementById(id), {type, data:{labels,datasets}, options:{responsive:true, maintainAspectRatio:false, scales:{y:{beginAtZero:true, max:100}, y1:{beginAtZero:true, position:'right', grid:{drawOnChartArea:false}, display:!!secondValues}}, plugins:{legend:{labels:{color:'#f8fafc'}}}}});
}
function update(){
  const rows = filtered();
  const wins = rows.filter(r=>r.win).length;
  document.getElementById('totalPicks').textContent = rows.length.toLocaleString();
  document.getElementById('wins').textContent = wins.toLocaleString();
  document.getElementById('successRate').textContent = fmtPct(pct(wins, rows.length));
  document.getElementById('avgOdds').textContent = avg(rows.map(r=>r.Odds)).toFixed(2);

  const minPicks = parseInt(el.minPicks.value || '1',10);
  const memberSummary = summarise(rows,'Member code').filter(x=>x.picks>=minPicks).sort((a,b)=>b.sr-a.sr || b.wins-a.wins || b.avgOdds-a.avgOdds);
  document.getElementById('bestMember').textContent = memberSummary[0] ? `${memberSummary[0].name} (${fmtPct(memberSummary[0].sr)})` : '-';

  const topMembers = memberSummary.slice(0,12);
  drawChart('memberChart','bar',topMembers.map(x=>x.name),topMembers.map(x=>+x.sr.toFixed(1)),topMembers.map(x=>x.picks));
  const sportSummary = summarise(rows,'Sport Group').filter(x=>x.picks>=minPicks).sort((a,b)=>b.sr-a.sr || b.picks-a.picks).slice(0,12);
  drawChart('sportChart','bar',sportSummary.map(x=>x.name),sportSummary.map(x=>+x.sr.toFixed(1)),sportSummary.map(x=>x.picks));
  const bandOrder = ['Under 1.20','1.20-1.39','1.40-1.59','1.60-1.79','1.80-1.99','2.00-2.99','3.00+','No odds'];
  const bandSummary = summarise(rows, r=>oddsBand(r.Odds)).sort((a,b)=>bandOrder.indexOf(a.name)-bandOrder.indexOf(b.name));
  drawChart('oddsChart','bar',bandSummary.map(x=>x.name),bandSummary.map(x=>+x.sr.toFixed(1)),bandSummary.map(x=>x.picks));
  const yearSummary = summarise(rows, r=>r.FY || r['Annual Year']).sort((a,b)=>a.name.localeCompare(b.name));
  drawChart('yearChart','line',yearSummary.map(x=>x.name),yearSummary.map(x=>+x.sr.toFixed(1)),yearSummary.map(x=>x.picks));
  renderRankings(memberSummary, rows);
  renderPicks(rows);
}
function bestWithin(rows, key){
  const s = summarise(rows,key).filter(x=>x.picks>=3).sort((a,b)=>b.sr-a.sr || b.picks-a.picks)[0];
  return s ? `${s.name} (${fmtPct(s.sr)}, ${s.picks})` : '-';
}
function renderRankings(summary, rows){
  const tbody = document.querySelector('#rankings tbody');
  tbody.innerHTML = summary.slice(0,50).map((x,i)=>{
    const mine = rows.filter(r=>r['Member code']===x.name);
    return `<tr><td>${i+1}</td><td>${escapeHtml(x.name)}</td><td>${x.picks}</td><td>${x.wins}</td><td>${x.losses}</td><td>${fmtPct(x.sr)}</td><td>${x.avgOdds.toFixed(2)}</td><td>${escapeHtml(bestWithin(mine,'Sport Group'))}</td><td>${escapeHtml(bestWithin(mine,'Bet Type'))}</td></tr>`;
  }).join('');
}
function renderPicks(rows){
  const tbody = document.querySelector('#picks tbody');
  tbody.innerHTML = rows.slice(0,250).map(r=>`<tr><td>${escapeHtml(r.Date)}</td><td>${escapeHtml(r.FY||r['Annual Year'])}</td><td>${escapeHtml(r['Member code'])}</td><td>${escapeHtml(r['Bet Name'])}</td><td>${escapeHtml(r['Bet Type'])}</td><td>${escapeHtml(r.Sport)}</td><td>${Number.isFinite(r.Odds)?r.Odds.toFixed(2):''}</td><td class="${r.win?'win':'loss'}">${escapeHtml(r.Result)}</td></tr>`).join('');
}
ids.forEach(id => el[id].addEventListener('input', () => { if(id==='sportGroup') smartFilterLists(); update(); }));
document.getElementById('reset').addEventListener('click',()=>{ids.forEach(id=>{if(id==='minPicks') el[id].value=5; else el[id].value='';}); populateFilters(); update();});
populateFilters(); update();
