// Per-page, non-secret creative history. Never invent evidence when a search repeats.
export function evidenceKeys(item) {
  const title = String(item.title ?? '').toLowerCase().replace(/\s+-\s+[^\n]+$/, '').replace(/[^\p{Letter}\p{Number}]/gu, '');
  const keys = [];
  if (item.sourceUrl) keys.push(`url:${item.sourceUrl}`);
  if (title) keys.push(`title:${title.slice(0,32)}`);
  return keys;
}
export function newEvidenceOnly(observations, seen = []) {
  const keys = new Set(seen);
  return observations.filter(item => {
    const current = evidenceKeys(item);
    if (current.some(key => keys.has(key))) return false;
    current.forEach(key => keys.add(key)); return true;
  });
}
export function rememberCreativeReport(history, report) {
  if (!report?.category?.id) return;
  const prior = history[report.category.id] ?? { evidenceKeys: [], plans: [] };
  const observations = report.trendClusters?.[0]?.observations ?? [];
  const plans = (report.creativePlans ?? []).filter(plan => plan.aiDesign?.status === 'done').map(plan => ({ title:plan.titleCandidates?.[0], premise:plan.premise, protagonist:plan.creatorBrief?.protagonist, conflict:plan.creatorBrief?.conflict, payoff:plan.creatorBrief?.payoff }));
  history[report.category.id] = { evidenceKeys:[...new Set([...prior.evidenceKeys,...observations.flatMap(evidenceKeys)])].slice(-800), plans:[...prior.plans,...plans].filter((plan,index,all)=>all.findIndex(p=>p.title===plan.title&&p.premise===plan.premise)===index).slice(-18) };
}
export function assertDifferentPlans(plans, previous = []) {
  const normalize = text => String(text ?? '').replace(/[^\p{Letter}\p{Number}]/gu,'').toLowerCase();
  const grams = text => { const t=normalize(text); return new Set(Array.from({length:Math.max(0,t.length-2)},(_,i)=>t.slice(i,i+3))); };
  const similar = (a,b) => { const aa=grams(a),bb=grams(b); if(!aa.size||!bb.size)return false; const overlap=[...aa].filter(x=>bb.has(x)).length;return overlap/Math.min(aa.size,bb.size)>.78; };
  for(const plan of plans) for(const old of previous) {
    if(normalize(plan.titleCandidates?.[0])===normalize(old.title) || similar(plan.premise,old.premise) || (similar(plan.creatorBrief?.conflict,old.conflict)&&similar(plan.creatorBrief?.payoff,old.payoff))) throw new Error('前回と同じ題材・展開に近い企画が返りました。別案としては採用しません。');
  }
}
