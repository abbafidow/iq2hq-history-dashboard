const RAW = Array.isArray(window.IQ2GQ_DATA) ? window.IQ2GQ_DATA : [];
const ODDS_BANDS = [
  { id: "under1.20", label: "Under 1.20", min: 0, max: 1.199999 },
  { id: "1.20-1.39", label: "1.20-1.39", min: 1.2, max: 1.399999 },
  { id: "1.40-1.59", label: "1.40-1.59", min: 1.4, max: 1.599999 },
  { id: "1.60-1.89", label: "1.60-1.89", min: 1.6, max: 1.899999 },
  { id: "1.90-1.99", label: "1.90-1.99", min: 1.9, max: 1.999999 },
  { id: "2plus", label: "2.00+", min: 2, max: 999 },
  { id: "3plus", label: "3.00+", min: 3, max: 999 }
];
const PRESETS = [
  { label: "Best NRL", sport: "Rugby League", search: "NRL" },
  { label: "Best NFL", sport: "American Football", search: "NFL" },
  { label: "Best Rugby Union", sport: "Rugby Union" },
  { label: "Best Football", sport: "Football" },
  { label: "Best H2H", bet: "H2H" },
  { label: "Best Point Starts", bet: "Point Start" },
  { label: "Best Anytime Scorers", bet: "Anytime Scorer" },
  { label: "Odds $2+", odds: "2plus" },
  { label: "Low odds anchors", odds: "1.20-1.39" },
  { label: "MM killers", result: "No", search: "" }
];

const rows = RAW.map(normalise).filter(r => r.result === "Yes" || r.result === "No");
const $ = id => document.getElementById(id);

function normalise(r) {
  const odds = parseFloat(r.Odds);
  const sport = clean(r.Sport);
  const sportGroup = clean(r["Sport Group"]) || inferSportGroup(sport);
  const betTypeRaw = clean(r["Bet Type"]) || clean(r["Cleaned up option"]) || clean(r.Option);
  const date = clean(r.Date);
  return {
    key: clean(r.Key),
    date,
    ts: Date.parse(date) || 0,
    round: clean(r.Round),
    year: clean(r.FY) || clean(r["Annual Year"]),
    member: clean(r["Member code"]),
    betName: clean(r["Bet Name"]),
    option: clean(r["Cleaned up option"]) || clean(r.Option),
    betType: betTypeRaw,
    betCategory: categoriseBet(betTypeRaw),
    sport,
    sportGroup,
    odds: Number.isFinite(odds) ? odds : null,
    result: clean(r.Result),
    notes: clean(r["Special notes"]),
    killer: clean(r["MM Killer/Sole Survivor"])
  };
}
function clean(v) { return (v === null || v === undefined) ? "" : String(v).replace(/\s+/g, " ").trim(); }
function inferSportGroup(sport) {
  if (sport.includes("Rugby League")) return "Rugby League";
  if (sport.includes("Rugby Union")) return "Rugby Union";
  if (sport.includes("American Football")) return "American Football";
  if (sport.includes("Football")) return "Football";
  if (sport.includes("Basketball")) return "Basketball";
  return sport.split("(")[0].trim() || "Other";
}
function categoriseBet(s) {
  const x = s.toLowerCase();
  if (!x) return "Other";
  if (x.includes("h2h") || x.includes("match result") || x.includes("match betting")) return "H2H";
  if (x.includes("point start") || x.includes("line") || /\d+(\.\d+)? point/.test(x)) return "Point Start";
  if (x.includes("anytime") || x.includes("try scorer") || x.includes("to score")) return "Anytime Scorer";
  if (x.includes("total goals")) return "Total Goals";
  if (x.includes("total combined") || x.includes("total points") || x.includes("over") || x.includes("under")) return "Totals";
  if (x.includes("winning margin") || x.includes("13 and over") || x.includes("12 and under") || x.includes("1-12")) return "Winning Margin";
  if (x.includes("tri bet")) return "Tri Bet";
  if (x.includes("first")) return "First Scoring";
  if (x.includes("half") || x.includes("full time") || x.includes("double") || x.includes("to win and")) return "Combo";
  return "Other";
}
function oddsBand(odds) {
  if (!Number.isFinite(odds)) return "Unknown";
  return ODDS_BANDS.find(b => odds >= b.min && odds <= b.max)?.label || "Unknown";
}
function pct(v) { return `${(v * 100).toFixed(1)}%`; }
function money(v) { return `$${v.toFixed(2)}`; }

function init() {
  $("dataCount").textContent = rows.length.toLocaleString();
  fillSelect("memberFilter", unique(rows.map(r => r.member)).sort());
  fillSelect("yearFilter", unique(rows.map(r => r.year)).sort());
  fillSelect("sportGroupFilter", unique(rows.map(r => r.sportGroup)).sort());
  fillSelect("sportFilter", unique(rows.map(r => r.sport)).sort());
  fillSelect("betCategoryFilter", unique(rows.map(r => r.betCategory)).sort());
  fillSelect("oddsBandFilter", ODDS_BANDS.map(b => ({ value: b.id, label: b.label })));
  makePresets();
  document.querySelectorAll("input, select").forEach(el => el.addEventListener("input", update));
  $("resetBtn").addEventListener("click", reset);
  update();
}
function unique(arr) { return [...new Set(arr.filter(Boolean))]; }
function fillSelect(id, items) {
  const el = $(id);
  const first = el.querySelector("option")?.outerHTML || "";
  el.innerHTML = first;
  items.forEach(item => {
    const opt = document.createElement("option");
    opt.value = typeof item === "object" ? item.value : item;
    opt.textContent = typeof item === "object" ? item.label : item;
    el.appendChild(opt);
  });
}
function makePresets() {
  const wrap = $("presetButtons");
  PRESETS.forEach(p => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = p.label;
    btn.addEventListener("click", () => {
      reset(false);
      if (p.sport) $("sportGroupFilter").value = p.sport;
      if (p.bet) $("betCategoryFilter").value = p.bet;
      if (p.odds) $("oddsBandFilter").value = p.odds;
      if (p.result) $("resultFilter").value = p.result;
      if (p.search !== undefined) $("searchInput").value = p.search;
      update();
    });
    wrap.appendChild(btn);
  });
}
function reset(run = true) {
  ["searchInput","memberFilter","yearFilter","sportGroupFilter","sportFilter","betCategoryFilter","oddsBandFilter","resultFilter"].forEach(id => $(id).value = "");
  $("minPicks").value = 5;
  $("sortBy").value = "score";
  if (run) update();
}
function activeFilters() {
  return {
    q: $("searchInput").value.trim().toLowerCase(),
    member: $("memberFilter").value,
    year: $("yearFilter").value,
    sportGroup: $("sportGroupFilter").value,
    sport: $("sportFilter").value,
    betCategory: $("betCategoryFilter").value,
    oddsBand: $("oddsBandFilter").value,
    result: $("resultFilter").value,
    min: Math.max(1, Number($("minPicks").value || 1)),
    sortBy: $("sortBy").value
  };
}
function filteredRows() {
  const f = activeFilters();
  const band = ODDS_BANDS.find(b => b.id === f.oddsBand);
  return rows.filter(r => {
    if (f.member && r.member !== f.member) return false;
    if (f.year && r.year !== f.year) return false;
    if (f.sportGroup && r.sportGroup !== f.sportGroup) return false;
    if (f.sport && r.sport !== f.sport) return false;
    if (f.betCategory && r.betCategory !== f.betCategory) return false;
    if (f.result && r.result !== f.result) return false;
    if (band && !(r.odds >= band.min && r.odds <= band.max)) return false;
    if (f.q) {
      const hay = [r.member,r.betName,r.option,r.betType,r.betCategory,r.sport,r.sportGroup,r.year,r.notes].join(" ").toLowerCase();
      if (!hay.includes(f.q)) return false;
    }
    return true;
  });
}
function stats(list) {
  const picks = list.length;
  const wins = list.filter(r => r.result === "Yes").length;
  const losses = picks - wins;
  const avgOdds = avg(list.map(r => r.odds).filter(Number.isFinite));
  const tenReturn = list.reduce((sum, r) => sum + (r.result === "Yes" && Number.isFinite(r.odds) ? 10 * r.odds : 0), 0);
  const spend = picks * 10;
  const roi = spend ? (tenReturn - spend) / spend : 0;
  const success = picks ? wins / picks : 0;
  const score = balancedScore(success, picks, roi);
  return { picks, wins, losses, success, avgOdds, spend, tenReturn, roi, score };
}
function avg(nums) { return nums.length ? nums.reduce((a,b)=>a+b,0) / nums.length : 0; }
function balancedScore(success, picks, roi) {
  const confidence = 1 - Math.exp(-picks / 25);
  return (success * 75 + Math.max(-25, Math.min(25, roi * 100))) * confidence;
}
function groupBy(list, keyFn) {
  const map = new Map();
  list.forEach(r => {
    const key = keyFn(r);
    if (!key) return;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(r);
  });
  return [...map.entries()].map(([key, items]) => ({ key, items, ...stats(items) }));
}
function sortRows(items, sortBy) {
  return items.sort((a,b) => {
    if (sortBy === "success") return b.success - a.success || b.picks - a.picks;
    if (sortBy === "wins") return b.wins - a.wins || b.success - a.success;
    if (sortBy === "roi") return b.roi - a.roi || b.picks - a.picks;
    if (sortBy === "avgOdds") return b.avgOdds - a.avgOdds || b.success - a.success;
    return b.score - a.score || b.success - a.success || b.picks - a.picks;
  });
}
function update() {
  const list = filteredRows();
  const f = activeFilters();
  renderKpis(list);
  const members = sortRows(groupBy(list, r => r.member).filter(x => x.picks >= f.min), f.sortBy);
  renderMemberTable(members);
  renderMemberChart(members.slice(0, 13));
  renderComboTable(list, f.min);
  renderSportChart(list, f.min);
  renderHeatmap(list, f.min);
  renderFormTable(list);
  renderPickTable(list);
}
function renderKpis(list) {
  const s = stats(list);
  const best = sortRows(groupBy(list, r => r.member), "score").filter(x => x.picks >= activeFilters().min)[0];
  const sport = sortRows(groupBy(list, r => r.sportGroup), "score").filter(x => x.picks >= activeFilters().min)[0];
  const cards = [
    [s.picks.toLocaleString(), "Filtered picks"],
    [s.wins.toLocaleString(), "Wins"],
    [pct(s.success), "Success rate"],
    [s.avgOdds ? s.avgOdds.toFixed(2) : "-", "Average odds"],
    [money(s.tenReturn - s.spend), "$10 return less spend"],
    [best ? best.key : "-", "Top member"],
    [best ? pct(best.success) + " from " + best.picks : "-", "Top member record"],
    [sport ? sport.key : "-", "Top sport group"],
    [sport ? pct(sport.success) + " from " + sport.picks : "-", "Top sport record"],
    [pct(s.roi), "ROI using $10 metric"]
  ];
  $("kpiGrid").innerHTML = cards.map(c => `<div class="kpi"><b>${c[0]}</b><span>${c[1]}</span></div>`).join("");
}
function renderMemberTable(items) {
  $("rankingSummary").textContent = `${items.length} members qualify`;
  table("memberTable", ["Rank","Member","Picks","Wins","Losses","Success","Avg odds","$10 return","ROI","Score"],
    items.map((x,i) => [i+1, x.key, x.picks, x.wins, x.losses, pct(x.success), x.avgOdds.toFixed(2), money(x.tenReturn - x.spend), pct(x.roi), x.score.toFixed(1)]),
    [0,2,3,4,6,7,8,9]);
}
function renderComboTable(list, min) {
  const combos = sortRows(groupBy(list, r => `${r.sportGroup} - ${r.betCategory}`).filter(x => x.picks >= min), "score").slice(0, 20);
  table("comboTable", ["Rank","Combination","Picks","Wins","Success","Avg odds","$10 return","Best member"],
    combos.map((x,i) => {
      const best = sortRows(groupBy(x.items, r => r.member).filter(m => m.picks >= Math.min(min, 5)), "score")[0];
      return [i+1, x.key, x.picks, x.wins, pct(x.success), x.avgOdds.toFixed(2), money(x.tenReturn - x.spend), best ? `${best.key} (${pct(best.success)}, n=${best.picks})` : "-"];
    }), [0,2,3,5,6]);
}
function renderFormTable(list) {
  const byMember = groupBy(rows, r => r.member).map(g => {
    const last = g.items.slice().sort((a,b)=>b.ts-a.ts).slice(0,20);
    const s = stats(last);
    const filteredCount = list.filter(r => r.member === g.key).length;
    return { key: g.key, filteredCount, ...s };
  }).sort((a,b)=>b.success-a.success || b.wins-a.wins);
  table("formTable", ["Member","Last 20","Wins","Success","Avg odds","Included in current filter"],
    byMember.map(x => [x.key, x.picks, x.wins, pct(x.success), x.avgOdds.toFixed(2), x.filteredCount]), [1,2,4,5]);
}
function renderPickTable(list) {
  const latest = list.slice().sort((a,b)=>b.ts-a.ts).slice(0, 250);
  $("pickSummary").textContent = `showing ${latest.length} of ${list.length}`;
  table("pickTable", ["Date","Year","Member","Bet","Sport","Type","Odds","Band","Result"],
    latest.map(r => [r.date, r.year, r.member, r.betName, r.sport, r.betCategory, r.odds ? r.odds.toFixed(2) : "-", oddsBand(r.odds), r.result === "Yes" ? "Win" : "Loss"]), [6]);
}
function table(id, heads, data, numCols=[]) {
  const th = heads.map((h,i)=>`<th class="${numCols.includes(i)?"num":""}">${h}</th>`).join("");
  const tr = data.map(row => `<tr>${row.map((v,i)=> {
    const cls = numCols.includes(i) ? "num" : "";
    if (v === "Win") return `<td><span class="badge win">Win</span></td>`;
    if (v === "Loss") return `<td><span class="badge loss">Loss</span></td>`;
    return `<td class="${cls}">${escapeHtml(v)}</td>`;
  }).join("")}</tr>`).join("");
  $(id).innerHTML = `<thead><tr>${th}</tr></thead><tbody>${tr}</tbody>`;
}
function escapeHtml(v) { return String(v ?? "").replace(/[&<>"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m])); }

function renderMemberChart(items) {
  const labels = items.map(x => x.key);
  const values = items.map(x => x.success * 100);
  drawBar("memberChart", labels, values, items.map(x => `n=${x.picks}`), 100);
}
function renderSportChart(list, min) {
  const items = groupBy(list, r => r.sportGroup).filter(x => x.picks >= min).sort((a,b)=>b.picks-a.picks).slice(0,12).sort((a,b)=>b.success-a.success);
  drawBar("sportChart", items.map(x=>x.key), items.map(x=>x.success*100), items.map(x=>`n=${x.picks}`), 100);
}
function drawBar(id, labels, values, sublabels, maxValue) {
  const c = $(id), ctx = c.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const rect = c.getBoundingClientRect();
  c.width = rect.width * dpr; c.height = (c.getAttribute("height") || 300) * dpr;
  ctx.scale(dpr,dpr);
  const w = rect.width, h = Number(c.getAttribute("height") || 300);
  ctx.clearRect(0,0,w,h);
  ctx.fillStyle = "#0d1520"; ctx.fillRect(0,0,w,h);
  if (!labels.length) { ctx.fillStyle = "#aab8c8"; ctx.fillText("No qualifying data", 16, 28); return; }
  const left = 115, right = 18, top = 18, rowH = Math.max(20, (h - top - 12) / labels.length);
  labels.forEach((label,i) => {
    const y = top + i * rowH;
    const barW = (w - left - right) * (values[i] / maxValue);
    ctx.fillStyle = "#aab8c8"; ctx.font = "12px Arial"; ctx.fillText(label.slice(0,18), 8, y + rowH * .62);
    ctx.fillStyle = "#1f2d3d"; ctx.fillRect(left, y + 4, w-left-right, rowH - 8);
    ctx.fillStyle = values[i] >= 70 ? "#22c55e" : values[i] >= 60 ? "#f59e0b" : "#ef4444";
    ctx.fillRect(left, y + 4, barW, rowH - 8);
    ctx.fillStyle = "#f4f7fb"; ctx.fillText(`${values[i].toFixed(1)}% ${sublabels[i]}`, left + Math.min(barW + 8, w-left-right-80), y + rowH * .62);
  });
}
function renderHeatmap(list, min) {
  const members = unique(rows.map(r=>r.member)).sort();
  const bands = ODDS_BANDS.filter(b => b.id !== "3plus");
  let html = `<div class="heat-row"><div class="heat-cell heat-head">Member</div>${bands.map(b=>`<div class="heat-cell heat-head">${b.label}</div>`).join("")}</div>`;
  members.forEach(m => {
    html += `<div class="heat-row"><div class="heat-cell heat-head">${m}</div>`;
    bands.forEach(b => {
      const subset = list.filter(r => r.member === m && r.odds >= b.min && r.odds <= b.max);
      const s = stats(subset);
      const rate = s.picks ? s.success : 0;
      const bg = s.picks < min ? "#0d1520" : rate >= .7 ? "rgba(34,197,94,.32)" : rate >= .6 ? "rgba(245,158,11,.32)" : "rgba(239,68,68,.32)";
      html += `<div class="heat-cell" style="background:${bg}"><span class="heat-rate">${s.picks ? pct(rate) : "-"}</span><span class="heat-n">n=${s.picks}</span></div>`;
    });
    html += `</div>`;
  });
  $("heatmap").innerHTML = html;
}

window.addEventListener("resize", () => update());
init();
