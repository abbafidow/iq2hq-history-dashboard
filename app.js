(function(){
'use strict';
const GOOGLE_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTVYy2XbUF-O2jOSeM2nd0_yiIpC2ljYp68PO4s3vEsg3ozl9qtDU1JnQ7ezo4dWQUb3d6LGetdSECT/pub?gid=1016619530&single=true&output=csv';
let RAW = [];
let rows = [];
const BANDS=[['u120','Under 1.20',0,1.1999],['120139','1.20-1.39',1.2,1.3999],['140159','1.40-1.59',1.4,1.5999],['160189','1.60-1.89',1.6,1.8999],['190199','1.90-1.99',1.9,1.9999],['2plus','2.00+',2,999]];
const PRESETS=[['Best NRL',{sport:'Rugby League',q:'NRL'}],['Best NFL',{sport:'American Football',q:'NFL'}],['Best Union',{sport:'Rugby Union'}],['Best Football',{sport:'Football'}],['H2H',{bet:'H2H'}],['Point starts',{bet:'Point Start'}],['Anytime scorers',{bet:'Anytime Scorer'}],['$2+ odds',{odds:'2plus'}],['Losses only',{result:'No'}]];
const $=id=>document.getElementById(id);
const clean=v=>v==null?'':String(v).replace(/\s+/g,' ').trim();
const num=v=>{const n=parseFloat(v);return Number.isFinite(n)?n:null};
const pct=v=>Number.isFinite(v)?(v*100).toFixed(1)+'%':'-';
const odds=v=>Number.isFinite(v)?v.toFixed(2):'-';
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

function get(r, names){
 names=Array.isArray(names)?names:[names];
 const lookup={};
 Object.keys(r||{}).forEach(k=>lookup[clean(k).toLowerCase()]=k);
 for(const name of names){
  const key=lookup[clean(name).toLowerCase()];
  if(key!==undefined && clean(r[key])!=='') return r[key];
 }
 return '';
}
function parseCsv(text){
 const out=[]; let row=[]; let cell=''; let q=false;
 text=String(text||'').replace(/^\ufeff/,'');
 for(let i=0;i<text.length;i++){
  const ch=text[i], next=text[i+1];
  if(q){
   if(ch==='"' && next==='"'){cell+='"'; i++;}
   else if(ch==='"'){q=false;}
   else cell+=ch;
  }else{
   if(ch==='"')q=true;
   else if(ch===','){row.push(cell); cell='';}
   else if(ch==='\n'){row.push(cell); out.push(row); row=[]; cell='';}
   else if(ch==='\r'){}
   else cell+=ch;
  }
 }
 row.push(cell); out.push(row);
 const headers=(out.shift()||[]).map(h=>clean(h));
 return out.filter(r=>r.some(c=>clean(c)!=='')).map(r=>{
  const obj={}; headers.forEach((h,i)=>obj[h]=r[i]??''); return obj;
 });
}
async function loadRawData(){
 const status=$('dataStatus');
 try{
  if(status) status.textContent='Loading Google Sheet data...';
  const sep=GOOGLE_SHEET_CSV_URL.includes('?')?'&':'?';
  const res=await fetch(GOOGLE_SHEET_CSV_URL+sep+'cacheBust='+Date.now(),{cache:'no-store'});
  if(!res.ok) throw new Error('Google Sheet returned '+res.status);
  const text=await res.text();
  const parsed=parseCsv(text);
  if(!parsed.length) throw new Error('Google Sheet returned no rows');
  return parsed;
 }catch(err){
  console.warn('Google Sheet load failed. Falling back to data.js if available.',err);
  if(Array.isArray(window.IQ2GQ_DATA) && window.IQ2GQ_DATA.length) return window.IQ2GQ_DATA;
  throw err;
 }
}
const uniq=a=>[...new Set(a.filter(Boolean))].sort((x,y)=>String(x).localeCompare(String(y),undefined,{numeric:true}));
function groupSport(s){s=clean(s); if(s.includes('Rugby League'))return'Rugby League'; if(s.includes('Rugby Union'))return'Rugby Union'; if(s.includes('American Football'))return'American Football'; if(s.includes('Football'))return'Football'; if(s.includes('Basketball'))return'Basketball'; return clean(s.split('(')[0])||'Other'}
function betCat(s){const x=clean(s).toLowerCase(); if(!x)return'Other'; if(x.includes('h2h')||x.includes('match result')||x.includes('match betting'))return'H2H'; if(x.includes('point start')||/[-+]?\d+(\.\d+)? point/.test(x))return'Point Start'; if(x.includes('anytime')||x.includes('try scorer')||x.includes('to score'))return'Anytime Scorer'; if(x.includes('total goals'))return'Total Goals'; if(x.includes('over')||x.includes('under')||x.includes('total combined')||x.includes('total points'))return'Totals'; if(x.includes('winning margin')||x.includes('13 and over')||x.includes('12 and under'))return'Winning Margin'; if(x.includes('tri bet'))return'Tri Bet'; if(x.includes('first'))return'First Scoring'; if(x.includes('half')||x.includes('full time')||x.includes('double')||x.includes('to win and'))return'Combo'; return clean(s)||'Other'}
function bandId(o){if(!Number.isFinite(o))return''; const b=BANDS.find(x=>o>=x[2]&&o<=x[3]); return b?b[0]:''}
function bandLabel(o){const id=bandId(o); return (BANDS.find(b=>b[0]===id)||[])[1]||'Unknown'}
function normalise(r){
 const option=clean(get(r,['Cleaned up option','Bet Option','Option','Bet Type']));
 const bet=clean(get(r,['Bet Type','Bet Option','Option']))||option;
 const sport=clean(get(r,['Sport','Competition']));
 const date=clean(get(r,['Date','MM Drop','Drop Date']));
 const rawResult=clean(get(r,['Result','Bet Successful','Successful','Win/Loss']));
 let result=rawResult;
 if(/^win$/i.test(result)) result='Yes';
 if(/^loss$/i.test(result)) result='No';
 if(/^true$/i.test(result)) result='Yes';
 if(/^false$/i.test(result)) result='No';
 return {
  key:clean(get(r,'Key')),
  date,
  ts:Date.parse(date)||0,
  round:clean(get(r,['Round','Week'])),
  year:clean(get(r,['Synd Year','Synd. Year','FY','Annual Year','Year'])),
  member:clean(get(r,['Member Code','Member code','Member','Name'])),
  betName:clean(get(r,['Bet Name','Bet','Option Name'])),
  option,
  betType:betCat(bet),
  sport,
  sportGroup:clean(get(r,['Sport Group','Sport Category']))||groupSport(sport),
  odds:num(get(r,['Odds','Final Odds','Final odds'])),
  result,
  streak:parseInt(get(r,'Streak'),10)||0,
  killer:clean(get(r,['MM Killer/Sole Survivor','MM Killer','MM Kill','Lonesome Loser'])),
  notes:clean(get(r,['Special notes','Notes','Actual Result']))
 };
}
let page='home';
let topMemberSort={key:'sr',dir:'desc'};
function aggregate(data,keyFn){const m=new Map(); data.forEach(r=>{const k=keyFn(r); if(!k)return; if(!m.has(k))m.set(k,{key:k,picks:0,wins:0,losses:0,odds:[],last:0,items:[]}); const g=m.get(k); g.picks++; if(r.result==='Yes')g.wins++; else g.losses++; if(Number.isFinite(r.odds))g.odds.push(r.odds); if(r.ts>g.last)g.last=r.ts; g.items.push(r);}); return [...m.values()].map(g=>({...g,sr:g.picks?g.wins/g.picks:0,avgOdds:g.odds.length?g.odds.reduce((a,b)=>a+b,0)/g.odds.length:null}));}
function currentFilters(){return {member:$('memberFilter').value,sport:$('sportFilter').value,bet:$('betFilter').value,year:$('yearFilter').value,odds:$('oddsFilter').value,result:$('resultFilter').value,q:$('textFilter').value.trim().toLowerCase(),min:Math.max(1,parseInt($('minPicks').value,10)||1)}}
function filtered(){const f=currentFilters(); return rows.filter(r=>{if(f.member&&r.member!==f.member)return false; if(f.sport&&r.sportGroup!==f.sport)return false; if(f.bet&&r.betType!==f.bet)return false; if(f.year&&r.year!==f.year)return false; if(f.result&&r.result!==f.result)return false; if(f.odds&&bandId(r.odds)!==f.odds)return false; if(f.q){const hay=[r.member,r.betName,r.option,r.betType,r.sport,r.sportGroup,r.year,r.result,r.notes,r.killer].join(' ').toLowerCase(); if(!hay.includes(f.q))return false;} return true;});}
function table(rows,cols){if(!rows.length)return '<p class="hint">No records match the current filters.</p>'; return '<div class="tablewrap"><table><thead><tr>'+cols.map(c=>`<th class="${c.cls||''}">${esc(c.h)}</th>`).join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr>'+cols.map(c=>`<td data-label="${esc(c.h)}" class="${c.cls||''}">${c.f?c.f(r):esc(r[c.k])}</td>`).join('')+'</tr>').join('')+'</tbody></table></div>'}
function perfCols(){return [{h:'Rank',f:(r,i)=>''},{h:'Name',f:r=>`<b>${esc(r.key)}</b>`},{h:'Picks',k:'picks',cls:'num'},{h:'Wins',k:'wins',cls:'num'},{h:'Losses',k:'losses',cls:'num'},{h:'Success',cls:'num',f:r=>`<span class="${r.sr>=.7?'good':r.sr<.6?'bad':''}">${pct(r.sr)}</span>`},{h:'Avg odds',cls:'num',f:r=>odds(r.avgOdds)},{h:'Confidence',f:r=>r.picks>=100?'High':r.picks>=40?'Moderate':'Low'}]}
function withRank(arr){return arr.map((x,i)=>({...x,rank:i+1}))}
function drawTable(id,arr,cols){$(id).innerHTML=table(arr,cols.map(c=>c.h==='Rank'?{h:'Rank',cls:'num',f:r=>r.rank}:c));}
function update(){const data=filtered(); const f=currentFilters(); $('dataStatus').textContent=`${data.length.toLocaleString()} resulted picks shown from ${rows.length.toLocaleString()} total`;
 $('summaryCards').innerHTML=cards(data);
 const members=withRank(aggregate(data,r=>r.member).filter(x=>x.picks>=f.min).sort(sortPerf));
 const sports=withRank(aggregate(data,r=>r.sportGroup).filter(x=>x.picks>=f.min).sort(sortPerf));
 renderHomeMembers(members);
 drawTable('homeSports',sports.slice(0,8),perfCols().map(c=>c.h==='Name'?{...c,h:'Sport'}:c).filter(c=>['Rank','Sport','Picks','Success','Avg odds'].includes(c.h)));
 drawTable('membersTable',members,perfCols());
 drawTable('sportsTable',sports,perfCols().map(c=>c.h==='Name'?{...c,h:'Sport'}:c));
 const bets=withRank(aggregate(data,r=>r.betType).filter(x=>x.picks>=f.min).sort(sortPerf)); drawTable('betsTable',bets,perfCols().map(c=>c.h==='Name'?{...c,h:'Bet type'}:c));
 const bands=withRank(aggregate(data,r=>bandLabel(r.odds)).filter(x=>x.key!=='Unknown'&&x.picks>=1).sort((a,b)=>BANDS.findIndex(x=>x[1]===a.key)-BANDS.findIndex(x=>x[1]===b.key))); drawTable('oddsTable',bands,perfCols().map(c=>c.h==='Name'?{...c,h:'Odds band'}:c));
 const bandMembers=withRank(aggregate(data,r=>bandLabel(r.odds)+' - '+r.member).filter(x=>!x.key.startsWith('Unknown')&&x.picks>=f.min).sort(sortPerf)).slice(0,50); drawTable('oddsMemberTable',bandMembers,perfCols().map(c=>c.h==='Name'?{...c,h:'Band - member'}:c));
 renderRecords(data); renderInsights(data,f.min); renderHistory(data); drawBar('memberChart',members.slice(0,10).map(x=>[x.key,x.sr,x.picks])); drawBar('oddsChart',bands.map(x=>[x.key,x.sr,x.picks]));}
function sortPerf(a,b){return (b.sr-a.sr)||(b.picks-a.picks)||(b.wins-a.wins)}
function cards(data){const picks=data.length,wins=data.filter(r=>r.result==='Yes').length,loss=picks-wins,avg=data.map(r=>r.odds).filter(Number.isFinite); const members=uniq(data.map(r=>r.member)).length; return [card('Resulted picks',picks.toLocaleString(),'Current filter'),card('Success rate',pct(picks?wins/picks:0),`${wins} wins / ${loss} losses`),card('Average odds',odds(avg.length?avg.reduce((a,b)=>a+b,0)/avg.length:null),'Known odds only'),card('Members',members,'In filtered data')].join('')}
function card(l,v,n){return `<div class="card"><div class="label">${esc(l)}</div><div class="value">${esc(v)}</div><div class="note">${esc(n)}</div></div>`}
function renderRecords(data){
 const bestByMember=new Map();
 data.filter(r=>r.result==='Yes'&&Math.abs(r.streak)>0).forEach(r=>{
  const v=Math.abs(r.streak); const cur=bestByMember.get(r.member);
  if(!cur||v>cur.bestStreak||(v===cur.bestStreak&&r.ts>cur.ts)) bestByMember.set(r.member,{...r,bestStreak:v});
 });
 const wins=[...bestByMember.values()].sort((a,b)=>b.bestStreak-a.bestStreak||a.member.localeCompare(b.member)).map((r,i)=>({...r,rank:i+1}));
 $('winStreaks').innerHTML=streakTable(wins);
 const best=data.filter(r=>r.result==='Yes'&&Number.isFinite(r.odds)).sort((a,b)=>b.odds-a.odds).slice(0,20).map(r=>({...r,rank:r.odds})); $('bestOdds').innerHTML=pickTable(best,'Odds');
 const crash=data.filter(r=>r.result==='No'&&Number.isFinite(r.odds)).sort((a,b)=>b.odds-a.odds).slice(0,20).map(r=>({...r,rank:r.odds})); $('crashOdds').innerHTML=pickTable(crash,'Odds');
}

function renderHomeMembers(members){
 const arr=[...members].sort((a,b)=>{
  const k=topMemberSort.key, d=topMemberSort.dir==='asc'?1:-1;
  const av=k==='name'?a.key:(a[k]??0), bv=k==='name'?b.key:(b[k]??0);
  if(typeof av==='string') return d*av.localeCompare(bv,undefined,{numeric:true});
  return d*((av||0)-(bv||0)) || a.key.localeCompare(b.key,undefined,{numeric:true});
 }).map((x,i)=>({...x,rank:i+1}));
 const arrow=k=>topMemberSort.key===k?(topMemberSort.dir==='asc'?' ▲':' ▼'):'';
 $('homeMembers').innerHTML='<div class="tablewrap"><table><thead><tr>'+
  `<th class="num">Rank</th><th><button class="sortHead" data-sort="name">Name${arrow('name')}</button></th><th class="num"><button class="sortHead" data-sort="picks">Picks${arrow('picks')}</button></th><th class="num"><button class="sortHead" data-sort="sr">Success${arrow('sr')}</button></th><th class="num"><button class="sortHead" data-sort="avgOdds">Avg odds${arrow('avgOdds')}</button></th>`+
  '</tr></thead><tbody>'+arr.map(r=>`<tr><td class="num">${r.rank}</td><td><b>${esc(r.key)}</b></td><td class="num">${r.picks}</td><td class="num"><span class="${r.sr>=.7?'good':r.sr<.6?'bad':''}">${pct(r.sr)}</span></td><td class="num">${odds(r.avgOdds)}</td></tr>`).join('')+'</tbody></table></div>';
}
function streakTable(arr){return table(arr,[{h:'Rank',cls:'num',f:r=>r.rank},{h:'Member',k:'member'},{h:'Best streak',cls:'num',f:r=>r.bestStreak},{h:'Date achieved',k:'date'},{h:'Bet',f:r=>esc(r.betName)},{h:'Sport',k:'sport'},{h:'Odds',cls:'num',f:r=>odds(r.odds)}])}

function pickTable(arr,metric){return table(arr,[{h:metric,cls:'num',f:r=>metric==='Odds'?odds(r.rank):esc(r.rank)},{h:'Member',k:'member'},{h:'Date',k:'date'},{h:'Bet',f:r=>esc(r.betName)},{h:'Type',k:'betType'},{h:'Sport',k:'sport'},{h:'Result',f:r=>`<span class="${r.result==='Yes'?'good':'bad'}">${r.result}</span>`}])}
function renderInsights(data,min){const sports=aggregate(data,r=>r.sportGroup).filter(x=>x.picks>=min).sort(sortPerf); const members=aggregate(data,r=>r.member).filter(x=>x.picks>=min).sort(sortPerf); const weak=aggregate(data,r=>r.sportGroup).filter(x=>x.picks>=min).sort((a,b)=>a.sr-b.sr); const high=aggregate(data.filter(r=>r.odds>=2),r=>r.member).filter(x=>x.picks>=Math.max(3,Math.floor(min/2))).sort(sortPerf); const notes=[]; if(members[0])notes.push(`<div class="insight"><b>Best member in current filter:</b> ${esc(members[0].key)} at ${pct(members[0].sr)} from ${members[0].picks} picks.</div>`); if(sports[0])notes.push(`<div class="insight"><b>Best sport group:</b> ${esc(sports[0].key)} at ${pct(sports[0].sr)} from ${sports[0].picks} picks.</div>`); if(weak[0])notes.push(`<div class="insight"><b>Weakest sport group:</b> ${esc(weak[0].key)} at ${pct(weak[0].sr)} from ${weak[0].picks} picks.</div>`); if(high[0])notes.push(`<div class="insight"><b>Best $2+ member:</b> ${esc(high[0].key)} at ${pct(high[0].sr)} from ${high[0].picks} picks.</div>`); notes.push('<div class="insight"><b>Rule for use:</b> treat any result under 40 picks as low confidence. Do not let one hot streak override sample size.</div>'); $('insightsList').innerHTML=notes.join(''); const combos=withRank(aggregate(data,r=>`${r.member} - ${r.sportGroup} - ${r.betType}`).filter(x=>x.picks>=min).sort(sortPerf).slice(0,50)); drawTable('combosTable',combos,perfCols().map(c=>c.h==='Name'?{...c,h:'Combination'}:c));}
function renderHistory(data){const arr=[...data].sort((a,b)=>b.ts-a.ts).slice(0,500); $('historyTable').innerHTML=table(arr,[{h:'Date',k:'date'},{h:'Member',k:'member'},{h:'Bet',k:'betName'},{h:'Type',k:'betType'},{h:'Sport',k:'sport'},{h:'Odds',cls:'num',f:r=>odds(r.odds)},{h:'Result',f:r=>`<span class="${r.result==='Yes'?'good':'bad'}">${r.result}</span>`},{h:'Year',k:'year'}]);}
function drawBar(id,items){const c=$(id); if(!c||!c.getContext)return; const ctx=c.getContext('2d'); const w=c.width=c.clientWidth||600,h=c.height=220; ctx.clearRect(0,0,w,h); ctx.fillStyle='#0d1430';ctx.fillRect(0,0,w,h); if(!items.length){ctx.fillStyle='#aeb8d4';ctx.fillText('No data',20,30);return;} const max=Math.max(...items.map(x=>x[1]),.01); const bw=Math.max(12,(w-60)/items.length-8); ctx.font='12px Arial'; items.forEach((x,i)=>{const val=x[1],barH=(h-60)*(val/max); const x0=42+i*(bw+8),y0=h-34-barH; ctx.fillStyle='#7dd3fc';ctx.fillRect(x0,y0,bw,barH); ctx.fillStyle='#eef3ff';ctx.save();ctx.translate(x0+bw/2,h-18);ctx.rotate(-0.55);ctx.fillText(String(x[0]).slice(0,12),0,0);ctx.restore(); ctx.fillStyle='#aeb8d4';ctx.fillText(Math.round(val*100)+'%',x0,y0-4);});}
async function init(){
 try{
  RAW = await loadRawData();
  rows = RAW.map(normalise).filter(r=>r.member && (r.result==='Yes'||r.result==='No'));
  if(!rows.length){$('dataStatus').textContent='No resulted picks found. Check Website_Data headers and Result values.';return;}
  populate(); bind(); update();
 }catch(err){
  console.error(err);
  $('dataStatus').textContent='Could not load Google Sheet data: '+err.message;
 }
}
function populate(){fill('memberFilter',uniq(rows.map(r=>r.member))); fill('sportFilter',uniq(rows.map(r=>r.sportGroup))); fill('betFilter',uniq(rows.map(r=>r.betType))); fill('yearFilter',uniq(rows.map(r=>r.year)).reverse()); BANDS.forEach(b=>{const o=document.createElement('option');o.value=b[0];o.textContent=b[1];$('oddsFilter').appendChild(o)}); $('quickButtons').innerHTML=PRESETS.map(([label],i)=>`<button type="button" data-preset="${i}">${esc(label)}</button>`).join('');}
function fill(id,vals){const el=$(id); vals.forEach(v=>{const o=document.createElement('option');o.value=v;o.textContent=v;el.appendChild(o);});}
function bind(){document.querySelectorAll('.tabs button').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('.tabs button').forEach(x=>x.classList.remove('active')); b.classList.add('active'); document.querySelectorAll('.page').forEach(x=>x.classList.remove('active')); $(b.dataset.page).classList.add('active'); page=b.dataset.page; update();})); ['memberFilter','sportFilter','betFilter','yearFilter','oddsFilter','resultFilter','textFilter','minPicks'].forEach(id=>$(id).addEventListener('input',update)); $('resetBtn').addEventListener('click',()=>{['memberFilter','sportFilter','betFilter','yearFilter','oddsFilter','resultFilter'].forEach(id=>$(id).value=''); $('textFilter').value=''; $('minPicks').value=10; update();}); const mf=$('mobileFiltersBtn'); if(mf)mf.addEventListener('click',()=>{const panel=$('filtersPanel'); panel.classList.toggle('open'); mf.setAttribute('aria-expanded',panel.classList.contains('open')?'true':'false'); mf.textContent=panel.classList.contains('open')?'Hide advanced filters':'Advanced filters';}); $('quickButtons').addEventListener('click',e=>{const btn=e.target.closest('button[data-preset]'); if(!btn)return; const p=PRESETS[+btn.dataset.preset][1]; if(p.sport)$('sportFilter').value=p.sport; if(p.bet)$('betFilter').value=p.bet; if(p.odds)$('oddsFilter').value=p.odds; if(p.result)$('resultFilter').value=p.result; if(p.q)$('textFilter').value=p.q; update();}); document.addEventListener('click',e=>{const b=e.target.closest('.sortHead'); if(!b)return; const key=b.dataset.sort; if(topMemberSort.key===key)topMemberSort.dir=topMemberSort.dir==='asc'?'desc':'asc'; else topMemberSort={key,dir:key==='name'?'asc':'desc'}; update();});}
try{init()}catch(e){console.error(e); const s=$('dataStatus'); if(s)s.textContent='Error loading dashboard: '+e.message;}
})();
