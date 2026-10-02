
/* ---------- utils ---------- */
const STORAGE_KEY = 'vita-app-state-v2';
function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,8); }
function esc(s){ return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function todayStr(){ return new Date().toISOString().slice(0,10); }
function daysAgo(n){ const d = new Date(); d.setDate(d.getDate()-n); return d.toISOString().slice(0,10); }
const WD = ['dom','seg','ter','qua','qui','sex','sáb'];
const MO = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
function fmtDatePt(ds){ const [y,m,d] = ds.split('-').map(Number); const dt = new Date(y,m-1,d); return `${WD[dt.getDay()]}, ${d} ${MO[m-1]}`; }
const MO_FULL = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const WEEKDAY_LABELS = ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'];
function isoDow(date){ return (date.getDay() + 6) % 7; }
function ymd(y, m, d){ return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`; }
function daysInMonth(y, m){ return new Date(y, m + 1, 0).getDate(); }
function blankSchedule(){ return { 0:null, 1:null, 2:null, 3:null, 4:null, 5:null, 6:null }; }
function autoScheduleFromPlans(planIds){
  const schedule = blankSchedule();
  const n = planIds.length;
  if(n === 0) return schedule;
  const patterns = { 1:[0,1,2,3,4], 2:[0,3], 3:[0,2,4], 4:[0,1,3,4], 5:[0,1,2,3,4], 6:[0,1,2,3,4,5], 7:[0,1,2,3,4,5,6] };
  const days = patterns[Math.min(n, 7)] || [0,1,2,3,4,5,6].slice(0, n);
  days.forEach((d, i) => { schedule[d] = planIds[i % n]; });
  return schedule;
}
function clamp01(n){ return Math.max(0, Math.min(1, n)); }
function clamp(n, min, max){ return Math.max(min, Math.min(max, n)); }
function pct(v,max){ return max>0 ? clamp01(v/max)*100 : 0; }
function round(n){ return Math.round(n); }
function round1(n){ return Math.round(n*10)/10; }
function toNum(s, fallback){ const n = parseFloat(String(s).replace(',','.')); return isNaN(n) ? (fallback ?? 0) : n; }

/* ---------- calc ---------- */
const ACTIVITY_FACTORS = { sedentario:1.2, leve:1.375, moderado:1.55, ativo:1.725, muito_ativo:1.9 };
const ACTIVITY_LABELS = { sedentario:'Sedentário', leve:'Leve (1-3x/sem)', moderado:'Moderado (3-5x/sem)', ativo:'Ativo (6-7x/sem)', muito_ativo:'Muito ativo (2x/dia)' };
const GOAL_LABELS = {
  perder_peso:'Perder peso', perder_gordura:'Perder gordura', manter:'Manter peso',
  manter_massa:'Manter massa', ganhar_massa:'Ganhar massa',
};
const GOAL_HINTS = {
  perder_peso:'Déficit calórico padrão (-500 kcal/dia).',
  perder_gordura:'Déficit mais moderado (-300 kcal/dia) com proteína alta para preservar músculo.',
  manter:'Sem déficit ou superávit — mantém o peso atual.',
  manter_massa:'Déficit leve (-100 kcal/dia) com proteína bem alta, para recomposição corporal.',
  ganhar_massa:'Superávit calórico (+300 kcal/dia) com proteína alta para ganho muscular.',
};
const GOAL_ADJUST = { perder_peso:-500, perder_gordura:-300, manter:0, manter_massa:-100, ganhar_massa:300 };
const GOAL_PROTEIN_MULT = { perder_peso:1.8, perder_gordura:2.2, manter:1.6, manter_massa:2.2, ganhar_massa:2.0 };
const MUSCLE_GROUPS = ['Peito','Costas','Ombro','Bíceps','Tríceps','Pernas','Glúteos','Abdômen','Corpo inteiro'];
const MUSCLE_TAG_COLORS = ['var(--accent)','var(--teal)','var(--violet)','var(--amber)','var(--good)'];
function muscleTagColor(group){ const i = MUSCLE_GROUPS.indexOf(group); return MUSCLE_TAG_COLORS[(i < 0 ? 0 : i) % MUSCLE_TAG_COLORS.length]; }
function muscleTag(group){ return `<span class="mtag" style="--tag-color:${muscleTagColor(group)};">${esc(group)}</span>`; }
const CARDIO_TYPES = ['Corrida','Caminhada','Bicicleta','Natação','Elíptico','Outro'];

function calcBMR(p){
  if(p.bodyFatPct != null && p.bodyFatPct > 0){
    const lean = p.weightKg * (1 - p.bodyFatPct/100);
    return 370 + 21.6*lean;
  }
  const base = 10*p.weightKg + 6.25*p.heightCm - 5*p.age;
  return p.sex === 'M' ? base+5 : base-161;
}
function calcEnergy(p){
  const bmr = calcBMR(p);
  const tdee = bmr * ACTIVITY_FACTORS[p.activityLevel];
  const targetKcal = Math.max(1200, Math.round(tdee + GOAL_ADJUST[p.goal]));
  const targetProteinG = Math.round(p.weightKg * (GOAL_PROTEIN_MULT[p.goal] ?? 1.8));
  const targetFatG = Math.round(p.weightKg*1);
  const targetCarbsG = Math.max(0, Math.round((targetKcal - (targetProteinG*4 + targetFatG*9))/4));
  return { bmr:Math.round(bmr), tdee:Math.round(tdee), targetKcal, targetProteinG, targetCarbsG, targetFatG };
}
function calcBMI(w,h){ const m = h/100; return w/(m*m); }
function macrosForGrams(food, g){ const f = g/100; return { kcal:food.kcal100*f, proteinG:food.protein100*f, carbsG:food.carbs100*f, fatG:food.fat100*f }; }
/* Resolve quanto em gramas uma quantidade informada representa — em gramas direto, ou em unidades
   (ex: "2 ovos") multiplicado pelo peso de 1 unidade do alimento. Usado em todo lugar que deixa
   escolher um alimento do catálogo e informar quantidade (avulso, prato, plano alimentar). */
function resolveQtyGrams(food, qty){
  if(qty.mode === 'un' && food && food.unitGrams) return toNum(qty.unitQty, 0) * food.unitGrams;
  return toNum(qty.grams, 0);
}
/* Campos de quantidade pra um alimento do catálogo: só gramas quando o alimento não tem unidade
   definida; gramas OU unidade (com um seletor) quando tem — ex: ovo, fatia de pão, scoop de whey.
   `path` é o caminho (string) do objeto Drafts.*.qty correspondente, interpolado direto no onclick/
   oninput — mesmo padrão já usado em todo o resto da tela de dieta. */
function qtyFieldsHTML(food, qty, path){
  if(!food || !food.unitLabel){
    return `<div class="field"><label>Quantidade (g)</label><input inputmode="numeric" value="${esc(qty.grams)}" oninput="${path}.grams=this.value"/></div>`;
  }
  return `
    <div class="chips" style="margin-bottom:2px;">
      <button class="chip ${qty.mode!=='un'?'active':''}" onclick="${path}.mode='g'; refresh();">Gramas</button>
      <button class="chip ${qty.mode==='un'?'active':''}" onclick="${path}.mode='un'; refresh();">${esc(food.unitLabel)}(s)</button>
    </div>
    ${qty.mode === 'un'
      ? `<div class="field"><label>Quantidade (${esc(food.unitLabel)}s)</label><input inputmode="decimal" value="${esc(qty.unitQty)}" oninput="${path}.unitQty=this.value"/></div>`
      : `<div class="field"><label>Quantidade (g)</label><input inputmode="numeric" value="${esc(qty.grams)}" oninput="${path}.grams=this.value"/></div>`}
  `;
}

/* ---------- icons ---------- */
const ICON = {
  home:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9a1 1 0 0 0 1 1H10v-5.5a2 2 0 0 1 2-2v0a2 2 0 0 1 2 2V20h3.5a1 1 0 0 0 1-1v-9"/></svg>`,
  dumbbell:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 8v8M4 9.3v5.4M17.5 8v8M20 9.3v5.4M8.3 12h7.4"/></svg>`,
  plate:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="9.3" cy="13" r="6"/><path d="M17 4v5M19 4v5M21 4v5M19 9v11"/></svg>`,
  heart:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20s-7.5-4.6-10-9.3C.5 7.3 2.4 4 5.8 4c2 0 3.4 1.1 4.2 2.4C10.8 5.1 12.2 4 14.2 4c3.4 0 5.3 3.3 3.8 6.7C15.5 15.4 12 20 12 20Z"/><path d="M4 12h3l1.5-3L11 15l1.8-4.5H20"/></svg>`,
  user:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8.2" r="3.4"/><path d="M4.8 19.5c1.2-3.6 4-5.4 7.2-5.4s6 1.8 7.2 5.4"/></svg>`,
  back:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 6 8 12l6.5 6"/></svg>`,
  check:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5 9.5 17 19 7"/></svg>`,
  trash:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-8 0 1 12.5A1.5 1.5 0 0 0 8.5 21h7a1.5 1.5 0 0 0 1.5-1.5L18 7"/></svg>`,
  drop:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.5s6 6.7 6 11a6 6 0 1 1-12 0c0-4.3 6-11 6-11Z"/></svg>`,
};

/* ---------- exercise catalog (ilustrações) ---------- */
/* Sem acesso a fotos externas (política de segurança da página), cada exercício usa uma
   ilustração de personagem colorido (estilo flat design) mostrando a execução real do
   movimento — postura do corpo + equipamento — desenhada como um "boneco" articulado por
   ângulos de junta (ombro/cotovelo/quadril/joelho), para manter proporções e comprimentos de
   membro consistentes entre poses. A cor da camiseta muda conforme o grupo muscular do exercício
   (mesma cor usada nas etiquetas de músculo no resto do app). */
const CH_SKIN = '#F0B08C', CH_HAIR = '#4A3327', CH_SHORTS = '#2B3A55', CH_SHOE = '#232C3D';
const CH_STEEL = '#9AA5B1', CH_STEEL_D = '#6B7686';
const CH_LEN = { thigh:24, shin:22, upperarm:17, forearm:17, torso:30, neck:5 };
function chRad(d){ return d * Math.PI / 180; }
function chPt(base, angleDeg, len){ const r = chRad(angleDeg); return [base[0]+Math.sin(r)*len, base[1]+Math.cos(r)*len]; }
function chPerp(dx, dy){ const l = Math.hypot(dx,dy) || 1; return [-dy/l, dx/l]; }
function chLimb(x1,y1,x2,y2,bend,width,color){
  const mx=(x1+x2)/2, my=(y1+y2)/2;
  const [nx,ny] = chPerp(x2-x1, y2-y1);
  const cx=mx+nx*bend, cy=my+ny*bend;
  return `<path d="M${x1},${y1} Q${cx},${cy} ${x2},${y2}" stroke="${color}" stroke-width="${width}" fill="none" stroke-linecap="round"/>`;
}
function chCircle(x,y,r,color){ return `<circle cx="${x}" cy="${y}" r="${r}" fill="${color}"/>`; }
function chEllipse(x,y,rx,ry,color,rot){ return `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${color}" transform="rotate(${rot||0} ${x} ${y})"/>`; }
function chTorso(hip, shoulder, width, shirt){
  const [nx,ny] = chPerp(shoulder[0]-hip[0], shoulder[1]-hip[1]);
  const hw=width/2, sw=width*0.46;
  const hL=[hip[0]-nx*hw,hip[1]-ny*hw], hR=[hip[0]+nx*hw,hip[1]+ny*hw];
  const sL=[shoulder[0]-nx*sw,shoulder[1]-ny*sw], sR=[shoulder[0]+nx*sw,shoulder[1]+ny*sw];
  return `<path d="M${hL[0]},${hL[1]} L${sL[0]},${sL[1]} Q${shoulder[0]},${shoulder[1]} ${sR[0]},${sR[1]} L${hR[0]},${hR[1]} Z" fill="${shirt}"/>`;
}
function chShorts(hip, legDirPt, width, color){
  const [nx,ny] = chPerp(legDirPt[0]-hip[0], legDirPt[1]-hip[1]);
  const hw=width/2;
  const ex=hip[0]+(legDirPt[0]-hip[0])*0.55, ey=hip[1]+(legDirPt[1]-hip[1])*0.55;
  const p1=[hip[0]-nx*hw,hip[1]-ny*hw], p2=[hip[0]+nx*hw,hip[1]+ny*hw];
  const p3=[ex+nx*hw*0.8,ey+ny*hw*0.8], p4=[ex-nx*hw*0.8,ey-ny*hw*0.8];
  return `<path d="M${p1[0]},${p1[1]} L${p3[0]},${p3[1]} L${p4[0]},${p4[1]} L${p2[0]},${p2[1]} Z" fill="${color}"/>`;
}
/* Monta o personagem a partir de ÂNGULOS de junta (0=para baixo,90=direita,180=cima,270=esquerda)
   em vez de coordenadas soltas por pose — garante que membros/torso tenham sempre o mesmo
   "tamanho de osso", só mudando de orientação conforme o exercício (em pé, sentado, deitado...). */
function chRig(hip, torsoAngle, a, shirt){
  const shoulder = chPt(hip, torsoAngle, CH_LEN.torso);
  const head = chPt(shoulder, torsoAngle, 12 + CH_LEN.neck);
  const knee1 = chPt(hip, a.thigh1, CH_LEN.thigh), foot1 = chPt(knee1, a.shin1, CH_LEN.shin);
  const knee2 = chPt(hip, a.thigh2, CH_LEN.thigh), foot2 = chPt(knee2, a.shin2, CH_LEN.shin);
  const elbow1 = chPt(shoulder, a.upperarm1, CH_LEN.upperarm), hand1 = chPt(elbow1, a.forearm1, CH_LEN.forearm);
  const elbow2 = chPt(shoulder, a.upperarm2, CH_LEN.upperarm), hand2 = chPt(elbow2, a.forearm2, CH_LEN.forearm);
  let s = '';
  s += chLimb(hip[0],hip[1],knee1[0],knee1[1], a.bendT1??6, 12, CH_SKIN);
  s += chLimb(knee1[0],knee1[1],foot1[0],foot1[1], a.bendS1??3, 9, CH_SKIN);
  s += chLimb(hip[0],hip[1],knee2[0],knee2[1], a.bendT2??-6, 12, CH_SKIN);
  s += chLimb(knee2[0],knee2[1],foot2[0],foot2[1], a.bendS2??-3, 9, CH_SKIN);
  s += chEllipse(foot1[0],foot1[1],7,4.5,CH_SHOE, a.shoeRot1 ?? (a.shin1-90));
  s += chEllipse(foot2[0],foot2[1],7,4.5,CH_SHOE, a.shoeRot2 ?? (a.shin2-90));
  s += chShorts(hip, chPt(hip,(a.thigh1+a.thigh2)/2,CH_LEN.thigh), 26, CH_SHORTS);
  s += chTorso(hip, shoulder, 24, shirt);
  s += chLimb(shoulder[0],shoulder[1],elbow1[0],elbow1[1], a.bendU1??5, 8.5, CH_SKIN);
  s += chLimb(elbow1[0],elbow1[1],hand1[0],hand1[1], a.bendF1??3, 7.5, CH_SKIN);
  s += chCircle(hand1[0],hand1[1],5,CH_SKIN);
  s += chCircle(head[0],head[1],12,CH_SKIN);
  s += `<path d="M${head[0]-12},${head[1]} a12,12 0 0 1 24,0 q-2,-8 -12,-8 t-12,8 Z" fill="${CH_HAIR}"/>`;
  s += chLimb(shoulder[0],shoulder[1],elbow2[0],elbow2[1], a.bendU2??-5, 8.5, CH_SKIN);
  s += chLimb(elbow2[0],elbow2[1],hand2[0],hand2[1], a.bendF2??-3, 7.5, CH_SKIN);
  s += chCircle(hand2[0],hand2[1],5,CH_SKIN);
  return { svg:s, j:{hip,shoulder,head,knee1,foot1,knee2,foot2,elbow1,hand1,elbow2,hand2} };
}
const POSE_SCENES = {
  'press-bench': (shirt) => {
    const r = chRig([92,80], 270, { thigh1:55,shin1:355,thigh2:15,shin2:315, upperarm1:172,forearm1:180,upperarm2:188,forearm2:180 }, shirt);
    let s = `<rect x="18" y="86" width="66" height="9" rx="3" fill="${CH_STEEL}"/><rect x="24" y="95" width="6" height="16" fill="${CH_STEEL_D}"/><rect x="48" y="95" width="6" height="16" fill="${CH_STEEL_D}"/>`;
    s += r.svg;
    s += `<line x1="${r.j.hand1[0]}" y1="${r.j.hand1[1]}" x2="${r.j.hand2[0]}" y2="${r.j.hand2[1]}" stroke="${CH_STEEL_D}" stroke-width="6"/>`;
    s += chCircle(r.j.hand1[0],r.j.hand1[1],9,CH_STEEL) + chCircle(r.j.hand2[0],r.j.hand2[1],9,CH_STEEL);
    return s;
  },
  'fly': (shirt) => {
    const r = chRig([92,80], 270, { thigh1:55,shin1:355,thigh2:15,shin2:315, upperarm1:112,forearm1:118,upperarm2:248,forearm2:242 }, shirt);
    let s = `<rect x="18" y="86" width="66" height="9" rx="3" fill="${CH_STEEL}"/><rect x="24" y="95" width="6" height="16" fill="${CH_STEEL_D}"/><rect x="48" y="95" width="6" height="16" fill="${CH_STEEL_D}"/>`;
    s += r.svg;
    s += chCircle(r.j.hand1[0],r.j.hand1[1],7,CH_STEEL_D) + chCircle(r.j.hand2[0],r.j.hand2[1],7,CH_STEEL_D);
    return s;
  },
  'pushup': (shirt) => {
    const r = chRig([70,66], 270, { thigh1:95,shin1:88,thigh2:85,shin2:92, upperarm1:350,forearm1:340,upperarm2:10,forearm2:20 }, shirt);
    return `<path d="M8,116 h124" stroke="${CH_STEEL_D}" stroke-width="2" opacity=".4"/>` + r.svg;
  },
  'dip': (shirt) => {
    const r = chRig([65,78], 180, { thigh1:350,shin1:280,thigh2:10,shin2:80, upperarm1:20,forearm1:8,upperarm2:340,forearm2:352 }, shirt);
    return `<path d="M${r.j.hand1[0]-2},34 v${r.j.hand1[1]-22}" stroke="${CH_STEEL}" stroke-width="4"/><path d="M${r.j.hand2[0]+2},34 v${r.j.hand2[1]-22}" stroke="${CH_STEEL}" stroke-width="4"/>` + r.svg;
  },
  'pulldown': (shirt) => {
    const r = chRig([62,86], 175, { thigh1:100,shin1:15,thigh2:95,shin2:5, upperarm1:112,forearm1:52,upperarm2:248,forearm2:308 }, shirt);
    let s = `<path d="M20,16 h84" stroke="${CH_STEEL}" stroke-width="5"/><circle cx="62" cy="16" r="4" fill="${CH_STEEL_D}"/>`;
    s += `<path d="M${r.j.hand1[0]},${r.j.hand1[1]} L44,16 M${r.j.hand2[0]},${r.j.hand2[1]} L80,16" stroke="${CH_STEEL_D}" stroke-width="2"/>`;
    s += r.svg;
    return s;
  },
  'row-seated': (shirt) => {
    const r = chRig([46,92], 172, { thigh1:100,shin1:15,thigh2:95,shin2:5, upperarm1:205,forearm1:140,upperarm2:190,forearm2:120 }, shirt);
    let s = `<rect x="30" y="98" width="30" height="9" rx="3" fill="${CH_STEEL_D}"/>`;
    s += `<rect x="120" y="12" width="6" height="96" fill="${CH_STEEL}"/>`;
    s += `<path d="M120,24 L${r.j.hand1[0]},${r.j.hand1[1]}" stroke="${CH_STEEL_D}" stroke-width="2.2"/>`;
    s += r.svg;
    return s;
  },
  'row-bent': (shirt) => {
    const r = chRig([62,88], 145, { thigh1:358,shin1:2,thigh2:2,shin2:358, upperarm1:30,forearm1:90,upperarm2:330,forearm2:270 }, shirt);
    let s = r.svg;
    s += `<line x1="${r.j.hand1[0]}" y1="${r.j.hand1[1]}" x2="${r.j.hand2[0]}" y2="${r.j.hand2[1]}" stroke="${CH_STEEL_D}" stroke-width="5"/>`;
    s += chCircle(r.j.hand1[0],r.j.hand1[1],6,CH_STEEL) + chCircle(r.j.hand2[0],r.j.hand2[1],6,CH_STEEL);
    return s;
  },
  'pullup': (shirt) => {
    const r = chRig([65,92], 180, { thigh1:355,shin1:5,thigh2:5,shin2:355, upperarm1:170,forearm1:178,upperarm2:190,forearm2:182 }, shirt);
    return `<path d="M14,18 h100" stroke="${CH_STEEL}" stroke-width="5"/>` + r.svg;
  },
  'hinge': (shirt) => {
    const r = chRig([70,84], 140, { thigh1:5,shin1:355,thigh2:355,shin2:5, upperarm1:25,forearm1:15,upperarm2:335,forearm2:345 }, shirt);
    let s = r.svg;
    s += `<line x1="${r.j.hand1[0]}" y1="${r.j.hand1[1]}" x2="${r.j.hand2[0]}" y2="${r.j.hand2[1]}" stroke="${CH_STEEL_D}" stroke-width="5"/>`;
    s += chCircle(r.j.hand1[0],r.j.hand1[1],7,CH_STEEL) + chCircle(r.j.hand2[0],r.j.hand2[1],7,CH_STEEL);
    return s;
  },
  'hip-thrust': (shirt) => {
    const r = chRig([78,74], 290, { thigh1:60,shin1:30,thigh2:70,shin2:20, upperarm1:300,forearm1:302,upperarm2:282,forearm2:280 }, shirt);
    return `<rect x="6" y="80" width="40" height="9" rx="3" fill="${CH_STEEL}"/>` + r.svg;
  },
  'press-overhead': (shirt) => {
    const r = chRig([65,88], 180, { thigh1:353,shin1:358,thigh2:7,shin2:2, upperarm1:170,forearm1:178,upperarm2:190,forearm2:182 }, shirt);
    let s = r.svg;
    s += `<line x1="${r.j.hand1[0]}" y1="${r.j.hand1[1]}" x2="${r.j.hand2[0]}" y2="${r.j.hand2[1]}" stroke="${CH_STEEL_D}" stroke-width="5"/>`;
    s += chCircle(r.j.hand1[0],r.j.hand1[1],7,CH_STEEL) + chCircle(r.j.hand2[0],r.j.hand2[1],7,CH_STEEL);
    return s;
  },
  'raise-lateral': (shirt) => {
    const r = chRig([65,88], 180, { thigh1:353,shin1:358,thigh2:7,shin2:2, upperarm1:90,forearm1:92,upperarm2:270,forearm2:268 }, shirt);
    let s = r.svg;
    s += chCircle(r.j.hand1[0],r.j.hand1[1],6,CH_STEEL_D) + chCircle(r.j.hand2[0],r.j.hand2[1],6,CH_STEEL_D);
    return s;
  },
  'curl': (shirt) => {
    const r = chRig([65,92], 180, { thigh1:352,shin1:358,thigh2:8,shin2:2, upperarm1:12,forearm1:135,upperarm2:348,forearm2:225 }, shirt);
    let s = r.svg;
    s += chCircle(r.j.hand1[0],r.j.hand1[1],6,CH_STEEL_D) + chCircle(r.j.hand2[0],r.j.hand2[1],6,CH_STEEL_D);
    return s;
  },
  'triceps': (shirt) => {
    const r = chRig([65,88], 180, { thigh1:353,shin1:358,thigh2:7,shin2:2, upperarm1:15,forearm1:350,upperarm2:345,forearm2:10 }, shirt);
    const mx=(r.j.hand1[0]+r.j.hand2[0])/2, my=(r.j.hand1[1]+r.j.hand2[1])/2;
    let s = `<path d="M${mx},14 L${mx},${my-8}" stroke="${CH_STEEL}" stroke-width="3" opacity=".55"/>`;
    s += r.svg;
    return s;
  },
  'squat': (shirt) => {
    const r = chRig([80,88], 175, { thigh1:345,shin1:20,thigh2:15,shin2:340, upperarm1:95,forearm1:95,upperarm2:265,forearm2:265 }, shirt);
    let s = `<line x1="${r.j.hand1[0]}" y1="${r.j.hand1[1]}" x2="${r.j.hand2[0]}" y2="${r.j.hand2[1]}" stroke="${CH_STEEL_D}" stroke-width="6"/>`;
    s += chCircle(r.j.hand1[0],r.j.hand1[1],9,CH_STEEL) + chCircle(r.j.hand2[0],r.j.hand2[1],9,CH_STEEL);
    s += r.svg;
    return s;
  },
  'leg-machine': (shirt) => {
    const r = chRig([55,90], 175, { thigh1:100,shin1:95,thigh2:110,shin2:15, upperarm1:20,forearm1:15,upperarm2:340,forearm2:345 }, shirt);
    return r.svg + `<rect x="${r.j.foot1[0]-4}" y="${r.j.foot1[1]-8}" width="8" height="16" rx="2" fill="${CH_STEEL}"/>`;
  },
  'lunge': (shirt) => {
    const r = chRig([65,80], 180, { thigh1:85,shin1:10,thigh2:320,shin2:340, upperarm1:15,forearm1:10,upperarm2:345,forearm2:350 }, shirt);
    let s = r.svg;
    s += chCircle(r.j.hand1[0],r.j.hand1[1],6,CH_STEEL_D) + chCircle(r.j.hand2[0],r.j.hand2[1],6,CH_STEEL_D);
    return s;
  },
  'calf-raise': (shirt) => {
    const r = chRig([65,90], 180, { thigh1:355,shin1:358,thigh2:5,shin2:2, shoeRot1:-55, shoeRot2:55, upperarm1:15,forearm1:10,upperarm2:345,forearm2:350 }, shirt);
    return r.svg;
  },
  'core': (shirt) => {
    const r = chRig([70,66], 270, { thigh1:95,shin1:88,thigh2:85,shin2:92, upperarm1:8,forearm1:265,upperarm2:352,forearm2:275 }, shirt);
    return r.svg;
  },
  'dynamic': (shirt) => {
    const r = chRig([70,80], 165, { thigh1:345,shin1:15,thigh2:15,shin2:345, upperarm1:45,forearm1:70,upperarm2:315,forearm2:290 }, shirt);
    const mx=(r.j.hand1[0]+r.j.hand2[0])/2, my=(r.j.hand1[1]+r.j.hand2[1])/2;
    return r.svg + chCircle(mx,my,8,CH_STEEL_D);
  },
};
const MUSCLE_DEFAULT_ILLUST = { 'Peito':'press-bench', 'Costas':'row-bent', 'Ombro':'press-overhead', 'Bíceps':'curl', 'Tríceps':'triceps', 'Pernas':'squat', 'Glúteos':'hip-thrust', 'Abdômen':'core', 'Corpo inteiro':'dynamic' };
const MUSCLE_REGION_LABEL = {
  chest:'Peitoral', shoulder:'Deltoide', bicep:'Bíceps', abs:'Abdômen', quad:'Quadríceps',
  lats:'Dorsais', triceps:'Tríceps', glute:'Glúteos', hamstring:'Post. de coxa', calf:'Panturrilha',
};
const MUSCLE_GROUP_REGION = {
  'Peito':'chest', 'Costas':'lats', 'Ombro':'shoulder', 'Bíceps':'bicep', 'Tríceps':'triceps',
  'Pernas':'quad', 'Glúteos':'glute', 'Abdômen':'abs',
};
const MUSCLE_SUBGROUP_REGION = { hamstring:'hamstring', calf:'calf' };
const EQUIPMENT_LABELS = { barbell:'Barra', dumbbell:'Halteres', machine:'Máquina', cable:'Cabo', bodyweight:'Peso corporal', kettlebell:'Kettlebell' };
function muscleBodyRegion(muscleGroup, exerciseKey){
  const found = exerciseKey ? ALL_EXERCISES_BY_KEY[exerciseKey] : null;
  if(found && found.subgroup && MUSCLE_SUBGROUP_REGION[found.subgroup]) return MUSCLE_SUBGROUP_REGION[found.subgroup];
  return MUSCLE_GROUP_REGION[muscleGroup] || null;
}
function muscleBodySvg(muscleGroup, exerciseKey){
  const found = exerciseKey ? ALL_EXERCISES_BY_KEY[exerciseKey] : null;
  const illust = found ? found.illust : (MUSCLE_DEFAULT_ILLUST[muscleGroup] || 'press-bench');
  const scene = POSE_SCENES[illust] || POSE_SCENES['press-bench'];
  const shirt = muscleTagColor(muscleGroup);
  return `<svg viewBox="0 0 140 150">${scene(shirt)}</svg>`;
}

const EXERCISE_PHOTOS = {
  'supino-reto-barra': 'exercise-photos/supino-reto-barra.jpg',
  'supino-inclinado-barra': 'exercise-photos/supino-inclinado-barra.jpg',
  'supino-reto-halteres': 'exercise-photos/supino-reto-halteres.jpg',
  'supino-inclinado-halteres': 'exercise-photos/supino-inclinado-halteres.jpg',
  'crucifixo-halteres': 'exercise-photos/crucifixo-halteres.jpg',
  'crossover-cabo': 'exercise-photos/crossover-cabo.jpg',
  'peck-deck': 'exercise-photos/peck-deck.jpg',
  'supino-maquina': 'exercise-photos/supino-maquina.jpg',
  'flexao-braco': 'exercise-photos/flexao-braco.jpg',
  'paralelas-peito': 'exercise-photos/paralelas-peito.jpg',
  'puxada-frente': 'exercise-photos/puxada-frente.jpg',
  'remada-curvada-barra': 'exercise-photos/remada-curvada-barra.jpg',
  'remada-cavalinho': 'exercise-photos/remada-cavalinho.jpg',
  'remada-unilateral-halter': 'exercise-photos/remada-unilateral-halter.jpg',
  'remada-baixa-cabo': 'exercise-photos/remada-baixa-cabo.jpg',
  'barra-fixa': 'exercise-photos/barra-fixa.jpg',
  'levantamento-terra': 'exercise-photos/levantamento-terra.jpg',
  'pulldown-reto': 'exercise-photos/pulldown-reto.jpg',
  'hiperextensao-lombar': 'exercise-photos/hiperextensao-lombar.jpg',
  'desenvolvimento-militar-barra': 'exercise-photos/desenvolvimento-militar-barra.jpg',
  'desenvolvimento-halteres': 'exercise-photos/desenvolvimento-halteres.jpg',
  'desenvolvimento-maquina': 'exercise-photos/desenvolvimento-maquina.jpg',
  'elevacao-lateral-halteres': 'exercise-photos/elevacao-lateral-halteres.jpg',
  'elevacao-frontal-halteres': 'exercise-photos/elevacao-frontal-halteres.jpg',
  'crucifixo-invertido': 'exercise-photos/crucifixo-invertido.jpg',
  'elevacao-lateral-cabo': 'exercise-photos/elevacao-lateral-cabo.jpg',
  'encolhimento-ombros': 'exercise-photos/encolhimento-ombros.jpg',
  'rosca-direta-barra': 'exercise-photos/rosca-direta-barra.jpg',
  'rosca-alternada-halteres': 'exercise-photos/rosca-alternada-halteres.jpg',
  'rosca-martelo': 'exercise-photos/rosca-martelo.jpg',
  'rosca-scott': 'exercise-photos/rosca-scott.jpg',
  'rosca-concentrada': 'exercise-photos/rosca-concentrada.jpg',
  'rosca-cabo': 'exercise-photos/rosca-cabo.jpg',
  'triceps-corda': 'exercise-photos/triceps-corda.jpg',
  'triceps-testa': 'exercise-photos/triceps-testa.jpg',
  'triceps-frances': 'exercise-photos/triceps-frances.jpg',
  'triceps-coice': 'exercise-photos/triceps-coice.jpg',
  'mergulho-banco': 'exercise-photos/mergulho-banco.jpg',
  'paralelas-triceps': 'exercise-photos/paralelas-triceps.jpg',
  'triceps-barra-reta-cabo': 'exercise-photos/triceps-barra-reta-cabo.jpg',
  'agachamento-livre': 'exercise-photos/agachamento-livre.jpg',
  'agachamento-smith': 'exercise-photos/agachamento-smith.jpg',
  'leg-press': 'exercise-photos/leg-press.jpg',
  'cadeira-extensora': 'exercise-photos/cadeira-extensora.jpg',
  'cadeira-flexora': 'exercise-photos/cadeira-flexora.jpg',
  'stiff-barra': 'exercise-photos/stiff-barra.jpg',
  'afundo-halteres': 'exercise-photos/afundo-halteres.jpg',
  'passada': 'exercise-photos/passada.jpg',
  'cadeira-adutora-perna': 'exercise-photos/cadeira-adutora-perna.jpg',
  'cadeira-abdutora-perna': 'exercise-photos/cadeira-abdutora-perna.jpg',
  'panturrilha-em-pe': 'exercise-photos/panturrilha-em-pe.jpg',
  'panturrilha-sentado': 'exercise-photos/panturrilha-sentado.jpg',
  'elevacao-pelvica': 'exercise-photos/elevacao-pelvica.jpg',
  'agachamento-sumo': 'exercise-photos/agachamento-sumo.jpg',
  'cadeira-abdutora-gluteo': 'exercise-photos/cadeira-abdutora-gluteo.jpg',
  'coice-cabo-gluteo': 'exercise-photos/coice-cabo-gluteo.jpg',
  'elevacao-pelvica-maquina': 'exercise-photos/elevacao-pelvica-maquina.jpg',
  'abdominal-supra': 'exercise-photos/abdominal-supra.jpg',
  'abdominal-infra': 'exercise-photos/abdominal-infra.jpg',
  'prancha': 'exercise-photos/prancha.jpg',
  'abdominal-cabo': 'exercise-photos/abdominal-cabo.jpg',
  'abdominal-obliquo': 'exercise-photos/abdominal-obliquo.jpg',
  'elevacao-pernas-barra': 'exercise-photos/elevacao-pernas-barra.jpg',
  'burpee': 'exercise-photos/burpee.jpg',
  'kettlebell-swing': 'exercise-photos/kettlebell-swing.jpg',
  'clean-and-press': 'exercise-photos/clean-and-press.jpg',
  'thruster': 'exercise-photos/thruster.jpg',
  'corda-naval': 'exercise-photos/corda-naval.jpg',
};
const EXERCISE_CATALOG = {
  'Peito': [
    { key:'supino-reto-barra', name:'Supino reto (barra)', illust:'press-bench', equipment:'barbell', desc:'Deite no banco e empurre a barra do peito até estender os braços.' },
    { key:'supino-inclinado-barra', name:'Supino inclinado (barra)', illust:'press-bench', equipment:'barbell', desc:'Banco inclinado (~30°) para dar mais ênfase à parte superior do peito.' },
    { key:'supino-reto-halteres', name:'Supino reto (halteres)', illust:'press-bench', equipment:'dumbbell', desc:'Como o supino com barra, mas com halteres — maior amplitude de movimento.' },
    { key:'supino-inclinado-halteres', name:'Supino inclinado (halteres)', illust:'press-bench', equipment:'dumbbell', desc:'Supino em banco inclinado com halteres, focando o peito superior.' },
    { key:'crucifixo-halteres', name:'Crucifixo (halteres)', illust:'fly', equipment:'dumbbell', desc:'Deitado, abra os braços em arco sem descer os cotovelos abaixo da linha dos ombros, e junte os halteres acima do peito.' },
    { key:'crossover-cabo', name:'Crucifixo no cross-over (cabo)', illust:'fly', equipment:'cable', desc:'Em pé entre polias altas, traga os cabos à frente do corpo em arco.' },
    { key:'peck-deck', name:'Peck deck (voador)', illust:'fly', equipment:'machine', desc:'Sentado na máquina, junte os braços à frente isolando o peito.' },
    { key:'supino-maquina', name:'Supino máquina', illust:'press-bench', equipment:'machine', desc:'Empurre os apoios à frente, sentado, controlando a descida.' },
    { key:'flexao-braco', name:'Flexão de braço', illust:'pushup', equipment:'bodyweight', desc:'Corpo reto, desça o peito até quase tocar o chão e empurre de volta.' },
    { key:'paralelas-peito', name:'Paralelas (mergulho peito)', illust:'dip', equipment:'bodyweight', desc:'Nas paralelas, incline o tronco à frente para focar o peito ao descer — não desça além de um ângulo confortável no ombro.' },
  ],
  'Costas': [
    { key:'puxada-frente', name:'Puxada frente (pulley)', illust:'pulldown', equipment:'cable', desc:'Sentado, puxe a barra até a altura do peito, cotovelos para baixo.' },
    { key:'remada-curvada-barra', name:'Remada curvada (barra)', illust:'row-bent', equipment:'barbell', desc:'Tronco inclinado à frente com a coluna neutra (sem arredondar as costas), puxe a barra até o abdômen.' },
    { key:'remada-cavalinho', name:'Remada cavalinho (T-bar)', illust:'row-seated', equipment:'machine', desc:'Apoie o peito e puxe a barra em T em direção ao tronco.' },
    { key:'remada-unilateral-halter', name:'Remada unilateral (halter)', illust:'row-bent', equipment:'dumbbell', desc:'Apoiado no banco com um joelho, puxe o halter até a cintura.' },
    { key:'remada-baixa-cabo', name:'Remada baixa (cabo)', illust:'row-seated', equipment:'cable', desc:'Sentado, puxe o cabo até o abdômen mantendo as costas retas.' },
    { key:'barra-fixa', name:'Barra fixa', illust:'pullup', equipment:'bodyweight', desc:'Pendurado na barra, puxe o corpo até o queixo passar a barra.' },
    { key:'levantamento-terra', name:'Levantamento terra', illust:'hinge', equipment:'barbell', desc:'Com a barra no chão, levante mantendo a coluna neutra até ficar em pé.' },
    { key:'pulldown-reto', name:'Pulldown reto (cabo)', illust:'pulldown', equipment:'cable', desc:'Puxe a barra reta para baixo com os braços quase estendidos.' },
    { key:'hiperextensao-lombar', name:'Hiperextensão lombar', illust:'hinge', equipment:'bodyweight', desc:'No banco romano, flexione o tronco à frente e volte controlando com a lombar, sem hiperestender além de uma linha reta no topo.' },
  ],
  'Ombro': [
    { key:'desenvolvimento-militar-barra', name:'Desenvolvimento militar (barra)', illust:'press-overhead', equipment:'barbell', desc:'Em pé ou sentado, empurre a barra por à frente do rosto até estender os braços acima da cabeça.' },
    { key:'desenvolvimento-halteres', name:'Desenvolvimento com halteres', illust:'press-overhead', equipment:'dumbbell', desc:'Empurre os halteres acima da cabeça até quase estender os cotovelos.' },
    { key:'desenvolvimento-maquina', name:'Desenvolvimento máquina', illust:'press-overhead', equipment:'machine', desc:'Sentado na máquina, empurre os apoios para cima.' },
    { key:'elevacao-lateral-halteres', name:'Elevação lateral (halteres)', illust:'raise-lateral', equipment:'dumbbell', desc:'Eleve os halteres lateralmente até a altura dos ombros.' },
    { key:'elevacao-frontal-halteres', name:'Elevação frontal (halteres)', illust:'raise-lateral', equipment:'dumbbell', desc:'Eleve o halter à frente até a altura dos ombros.' },
    { key:'crucifixo-invertido', name:'Crucifixo invertido (halteres)', illust:'row-bent', equipment:'dumbbell', desc:'Inclinado à frente, abra os braços para trás focando o deltoide posterior.' },
    { key:'elevacao-lateral-cabo', name:'Elevação lateral no cabo', illust:'raise-lateral', equipment:'cable', desc:'Eleve o cabo lateralmente, mantendo tensão constante no deltoide.' },
    { key:'encolhimento-ombros', name:'Encolhimento de ombros', illust:'raise-lateral', equipment:'dumbbell', desc:'Segure o peso e eleve os ombros em direção às orelhas.' },
  ],
  'Bíceps': [
    { key:'rosca-direta-barra', name:'Rosca direta (barra)', illust:'curl', equipment:'barbell', desc:'Cotovelos fixos ao lado do corpo, flexione a barra até o peito.' },
    { key:'rosca-alternada-halteres', name:'Rosca alternada (halteres)', illust:'curl', equipment:'dumbbell', desc:'Flexione um halter de cada vez, girando o punho ao subir.' },
    { key:'rosca-martelo', name:'Rosca martelo (halteres)', illust:'curl', equipment:'dumbbell', desc:'Flexione o halter com a pegada neutra, como um martelo.' },
    { key:'rosca-scott', name:'Rosca Scott (barra W)', illust:'curl', equipment:'barbell', desc:'No banco Scott, flexione a barra apoiando bem o braço.' },
    { key:'rosca-concentrada', name:'Rosca concentrada', illust:'curl', equipment:'dumbbell', desc:'Sentado, apoie o cotovelo na coxa e flexione o halter isolando o bíceps.' },
    { key:'rosca-cabo', name:'Rosca no cabo', illust:'curl', equipment:'cable', desc:'Flexione o cabo mantendo os cotovelos parados ao lado do corpo.' },
  ],
  'Tríceps': [
    { key:'triceps-corda', name:'Tríceps corda (cabo)', illust:'triceps', equipment:'cable', desc:'Cotovelos fixos, estenda a corda para baixo até os braços ficarem retos.' },
    { key:'triceps-testa', name:'Tríceps testa (barra)', illust:'triceps', equipment:'barbell', desc:'Deitado, desça a barra com controle em direção à testa e estenda de volta, sem usar cargas altas demais para manter a técnica.' },
    { key:'triceps-frances', name:'Tríceps francês (halter)', illust:'triceps', equipment:'dumbbell', desc:'Segure o halter atrás da cabeça e estenda o braço para cima com controle, sem hiperestender o cotovelo.' },
    { key:'triceps-coice', name:'Tríceps coice (halter)', illust:'triceps', equipment:'dumbbell', desc:'Tronco inclinado, estenda o halter para trás mantendo o cotovelo fixo.' },
    { key:'mergulho-banco', name:'Mergulho no banco', illust:'dip', equipment:'bodyweight', desc:'Mãos no banco atrás do corpo, pés apoiados no chão, desça só até um ângulo confortável no cotovelo — pare se sentir dor no ombro.' },
    { key:'paralelas-triceps', name:'Paralelas (tríceps)', illust:'dip', equipment:'bodyweight', desc:'Nas paralelas, mantenha o tronco ereto e desça só até um ângulo confortável para focar no tríceps sem sobrecarregar o ombro.' },
    { key:'triceps-barra-reta-cabo', name:'Tríceps pulley (barra reta)', illust:'triceps', equipment:'cable', desc:'Como o tríceps corda, mas com barra reta presa ao cabo.' },
  ],
  'Pernas': [
    { key:'agachamento-livre', name:'Agachamento livre (barra)', illust:'squat', equipment:'barbell', desc:'Barra nas costas, desça flexionando quadril e joelhos até coxas paralelas ao chão.' },
    { key:'agachamento-smith', name:'Agachamento Smith', illust:'squat', equipment:'machine', desc:'Agachamento guiado pela máquina Smith — mantenha os pés um pouco à frente da barra para respeitar a trajetória fixa sem forçar o joelho.' },
    { key:'leg-press', name:'Leg press 45°', illust:'leg-machine', equipment:'machine', desc:'Empurre a plataforma com os pés, sem travar os joelhos no topo nem tirar a lombar do encosto na descida.' },
    { key:'cadeira-extensora', name:'Cadeira extensora', illust:'leg-machine', equipment:'machine', desc:'Sentado, estenda os joelhos elevando o peso até quase travar.' },
    { key:'cadeira-flexora', name:'Cadeira flexora', illust:'leg-machine', equipment:'machine', desc:'Deitado ou sentado, flexione os joelhos trazendo o peso em direção ao glúteo.', subgroup:'hamstring' },
    { key:'stiff-barra', name:'Stiff (barra)', illust:'hinge', equipment:'barbell', desc:'Pernas quase retas e coluna neutra, desça a barra rente às pernas sentindo o posterior de coxa.', subgroup:'hamstring' },
    { key:'afundo-halteres', name:'Afundo (halteres)', illust:'lunge', equipment:'dumbbell', desc:'Dê um passo à frente e desça até o joelho de trás quase tocar o chão.' },
    { key:'passada', name:'Passada (avanço)', illust:'lunge', equipment:'dumbbell', desc:'Alterne passos à frente descendo o quadril a cada passada.' },
    { key:'cadeira-adutora-perna', name:'Cadeira adutora', illust:'leg-machine', equipment:'machine', desc:'Sentado, feche as pernas contra a resistência da máquina.' },
    { key:'cadeira-abdutora-perna', name:'Cadeira abdutora', illust:'leg-machine', equipment:'machine', desc:'Sentado, abra as pernas contra a resistência da máquina.' },
    { key:'panturrilha-em-pe', name:'Panturrilha em pé', illust:'calf-raise', equipment:'machine', desc:'Em pé, eleve os calcanhares o máximo possível e desça controlado.', subgroup:'calf' },
    { key:'panturrilha-sentado', name:'Panturrilha sentado', illust:'calf-raise', equipment:'machine', desc:'Sentado, eleve os calcanhares com o peso apoiado nos joelhos.', subgroup:'calf' },
  ],
  'Glúteos': [
    { key:'elevacao-pelvica', name:'Elevação pélvica (hip thrust)', illust:'hip-thrust', equipment:'barbell', desc:'Costas apoiadas no banco, eleve o quadril com a barra apoiada nele.' },
    { key:'agachamento-sumo', name:'Agachamento sumô', illust:'squat', equipment:'dumbbell', desc:'Pés bem afastados e apontados para fora, agache segurando o peso entre as pernas.' },
    { key:'cadeira-abdutora-gluteo', name:'Cadeira abdutora', illust:'leg-machine', equipment:'machine', desc:'Sentado, abra as pernas contra a resistência focando o glúteo médio.' },
    { key:'coice-cabo-gluteo', name:'Coice no cabo (glúteo)', illust:'leg-machine', equipment:'cable', desc:'Em pé, estenda a perna para trás contra o cabo, focando o glúteo.' },
    { key:'elevacao-pelvica-maquina', name:'Elevação pélvica (máquina)', illust:'hip-thrust', equipment:'machine', desc:'Eleve o quadril na máquina específica, apertando o glúteo no topo.' },
  ],
  'Abdômen': [
    { key:'abdominal-supra', name:'Abdominal supra (crunch)', illust:'core', equipment:'bodyweight', pattern:'flexao', desc:'Deitado, flexione o tronco em direção aos joelhos.' },
    { key:'abdominal-infra', name:'Abdominal infra (elevação de pernas)', illust:'core', equipment:'bodyweight', pattern:'flexao', desc:'Deitado, mantenha a lombar apoiada no chão e eleve as pernas em direção ao teto contraindo o abdômen inferior.' },
    { key:'prancha', name:'Prancha (plank)', illust:'core', equipment:'bodyweight', pattern:'anti-extensao', desc:'Apoiado nos antebraços e pés, mantenha o corpo reto e o abdômen contraído.' },
    { key:'abdominal-cabo', name:'Abdominal na polia (cabo)', illust:'core', equipment:'cable', pattern:'flexao', desc:'Ajoelhado, flexione o tronco puxando o cabo para baixo com o abdômen.' },
    { key:'abdominal-obliquo', name:'Abdominal oblíquo', illust:'core', equipment:'bodyweight', pattern:'rotacao', desc:'Gire o tronco lateralmente para trabalhar os oblíquos.' },
    { key:'elevacao-pernas-barra', name:'Elevação de pernas na barra', illust:'core', equipment:'bodyweight', pattern:'flexao', desc:'Pendurado na barra, eleve as pernas com controle (sem balançar o corpo) contraindo o abdômen.' },
  ],
  'Corpo inteiro': [
    { key:'burpee', name:'Burpee', illust:'dynamic', equipment:'bodyweight', desc:'Agache, jogue as pernas para trás, faça uma flexão e salte de volta em pé.' },
    { key:'kettlebell-swing', name:'Kettlebell swing', illust:'dynamic', equipment:'kettlebell', desc:'Balance o kettlebell entre as pernas até a altura dos ombros usando o quadril.' },
    { key:'clean-and-press', name:'Clean and press', illust:'dynamic', equipment:'barbell', desc:'Puxe a barra do chão aos ombros e empurre acima da cabeça — movimento técnico, comece com cargas leves até dominar a forma.' },
    { key:'thruster', name:'Thruster', illust:'dynamic', equipment:'barbell', desc:'Agachamento seguido de um desenvolvimento explosivo acima da cabeça — movimento técnico, comece com cargas leves até dominar a forma.' },
    { key:'corda-naval', name:'Corda naval (battle rope)', illust:'dynamic', equipment:'kettlebell', desc:'Bata as cordas alternadamente em ondas, mantendo o core estável.' },
  ],
};
const ALL_EXERCISES_BY_KEY = {};
Object.values(EXERCISE_CATALOG).forEach(list => list.forEach(ex => { ALL_EXERCISES_BY_KEY[ex.key] = ex; }));

function progressRingSvg(id, pct, color, size, stroke){
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, offset = c * (1 - clamp01(pct));
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="transform:rotate(-90deg);">
    <circle cx="${size/2}" cy="${size/2}" r="${r}" stroke="var(--surface-sunken)" stroke-width="${stroke}" fill="none"/>
    <circle id="${id}" cx="${size/2}" cy="${size/2}" r="${r}" stroke="${color}" stroke-width="${stroke}" fill="none"
      stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${offset}"/>
  </svg>`;
}
function setRingProgress(id, pct){
  const el = document.getElementById(id); if(!el) return;
  const r = el.r.baseVal.value, c = 2 * Math.PI * r;
  el.setAttribute('stroke-dashoffset', c * (1 - clamp01(pct)));
}
function exerciseIconSvg(muscleGroup, exerciseKey){
  const photo = exerciseKey ? EXERCISE_PHOTOS[exerciseKey] : null;
  if(photo) return `<img src="${photo}" alt="" style="object-fit:cover;display:block;">`;
  return muscleBodySvg(muscleGroup, exerciseKey);
}
function exerciseDesc(exerciseKey){
  const found = exerciseKey ? ALL_EXERCISES_BY_KEY[exerciseKey] : null;
  return found ? found.desc : 'Execute o movimento com controle, sem travar as articulações no fim do curso.';
}

/* ---------- gerador dinâmico de treinos (objetivo x nível x variação) ---------- */
const LEVELS = ['iniciante','intermediario','avancado'];
const LEVEL_LABELS = { iniciante:'Iniciante', intermediario:'Intermediário', avancado:'Avançado' };
const LEVEL_NOTES = {
  iniciante:'Poucos exercícios por treino, priorizando aprender o movimento com cargas leves a moderadas.',
  intermediario:'Volume moderado, já incluindo exercícios compostos mais desafiadores.',
  avancado:'Volume alto e exercícios compostos pesados — para quem já tem experiência de treino.',
};
const LEVEL_DAYS = { iniciante:3, intermediario:4, avancado:5 };
const LEVEL_SET_ADJUST = { iniciante:-1, intermediario:0, avancado:1 };
const LEVEL_REP_ADJUST = { iniciante:2, intermediario:0, avancado:-1 };
const LEVEL_EXCOUNT_ADJUST = { iniciante:-1, intermediario:0, avancado:1 };
const TIME_OPTIONS = [60, 90, 120];
const TIME_LABELS = { 60:'60 min', 90:'90 min', 120:'120 min' };
const TIME_EX_PER_DAY = { 60:5, 90:7, 120:9 };
const TIME_SET_ADJUST = { 60:-1, 90:0, 120:0 };
const TIME_NOTES = {
  60:'Sessão enxuta — foco nos exercícios compostos principais, com menos séries e variações.',
  90:'Volume equilibrado entre compostos e acessórios — a duração mais comum para a maioria dos objetivos.',
  120:'Sessão completa — mais variações de exercícios e séries extras para quem tem mais tempo disponível.',
};
const ROTATION_TEXT = {
  iniciante:'Troque de variação a cada 6 a 8 semanas — dê tempo para o corpo aprender bem os movimentos antes de mudar.',
  intermediario:'Troque de variação a cada 4 a 6 semanas para continuar progredindo sem estagnar.',
  avancado:'Troque de variação a cada 3 a 4 semanas para manter o estímulo sempre novo.',
};
const REP_RANGE_BY_GOAL = {
  perder_peso:{ sets:3, reps:13 }, perder_gordura:{ sets:3, reps:14 }, manter:{ sets:3, reps:11 },
  manter_massa:{ sets:4, reps:10 }, ganhar_massa:{ sets:4, reps:9 },
};
const COMPOUND_KEYS = new Set([
  'supino-reto-barra','supino-inclinado-barra','supino-reto-halteres','supino-inclinado-halteres','supino-maquina','flexao-braco','paralelas-peito',
  'puxada-frente','remada-curvada-barra','remada-cavalinho','remada-unilateral-halter','remada-baixa-cabo','barra-fixa','levantamento-terra','pulldown-reto',
  'desenvolvimento-militar-barra','desenvolvimento-halteres','desenvolvimento-maquina',
  'agachamento-livre','agachamento-smith','leg-press','stiff-barra','afundo-halteres','passada',
  'elevacao-pelvica','agachamento-sumo','elevacao-pelvica-maquina',
]);
/* Cada dia separa grupos primários (compostos, multiarticulares — recebem a maior fatia do volume)
   dos grupos acessórios (isolados, monoarticulares — sempre com volume igual ou menor que o primário pareado).
   Os "arquétipos" abaixo são os blocos de dia reconhecidos na literatura de treinamento (push/pull/legs,
   upper/lower, dia dedicado por grupo) — a semana é montada escolhendo entre eles, não de um molde fixo,
   para que o foco muscular do usuário realmente determine quais grupos viram primários e com que frequência
   aparecem, em vez de só ajustar levemente um layout sempre igual. */
const DAY_ARCHETYPES = {
  peito:   { primary:['Peito'],            accessory:['Tríceps'] },
  costas:  { primary:['Costas'],           accessory:['Bíceps'] },
  ombro:   { primary:['Ombro'],            accessory:['Abdômen'] },
  pernas:  { primary:['Pernas'],           accessory:['Abdômen'] },
  gluteos: { primary:['Glúteos','Pernas'], accessory:['Abdômen'] },
  push:    { primary:['Peito','Ombro'],    accessory:['Tríceps'] },
  upper:   { primary:['Peito','Costas'],   accessory:['Ombro'] },
  bracos:  { primary:['Bíceps','Tríceps'], accessory:['Abdômen'] },
};
/* 'pull' (Costas/Bíceps) e 'lower' (Pernas+Glúteos/Abdômen) foram removidos por serem duplicatas
   exatas de 'costas' e 'gluteos' — duas chaves com a mesma composição inflavam sem querer a chance
   de um mesmo grupo (ex: Costas) ser escolhido duas vezes na semana, com nomes diferentes. */
/* Abdômen nunca vira "dia principal" (não existe arquétipo com Abdômen em primary): evidência de
   treinadores e literatura (NASM, NSCA; McGill sobre evitar volume alto de flexão de coluna repetida)
   aponta 1 a 3 exercícios diretos de core por sessão, com frequência de 2 a 4x/semana — não uma
   sessão inteira de 6+ exercícios do mesmo padrão de movimento. Por isso o core entra sempre como
   acessório de outro grupo.
   Teto de exercícios DIRETOS por grupo muscular numa mesma sessão — mesmo num "dia dedicado"
   (ex: dia de ombro), volume direto além disso é sobreposição de estímulo com retorno decrescente
   (Schoenfeld et al. sobre volume por sessão) e mais fadiga/risco em articulações menores, sem
   ganho extra de hipertrofia. Grupos grandes (Peito/Costas/Pernas) toleram mais exercícios diretos
   num dia clássico de "bro split"; Ombro/Glúteos/Braços ficam um pouco abaixo; Abdômen no mínimo
   da faixa (1 a 3) por ser um grupo pequeno treinado com muita frequência via acessório. */
const GROUP_MAX_PER_SESSION = {
  'Peito':5, 'Costas':5, 'Pernas':5,
  'Ombro':4, 'Glúteos':4, 'Bíceps':4, 'Tríceps':4,
  'Abdômen':3,
};
function archetypesFeaturingPrimary(group){
  return Object.keys(DAY_ARCHETYPES).filter(k => DAY_ARCHETYPES[k].primary.includes(group));
}
function shuffleSeeded(arr, rng){
  const copy = arr.slice();
  for(let i = copy.length - 1; i > 0; i--){
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
function focusToGroups(focus){
  const groups = [];
  (focus || []).forEach(f => (FOCUS_GROUPS[f] || []).forEach(g => { if(!groups.includes(g)) groups.push(g); }));
  return groups;
}
/* Evita repetir o mesmo grupo primário em dias consecutivos: a ordem da estrutura vira a ordem da semana
   (segunda, terça, ...), então dois dias seguidos batendo no mesmo grupo cortam o descanso entre estímulos. */
function orderAvoidingAdjacentRepeats(keys, rng){
  const arr = shuffleSeeded(keys, rng);
  const groupsOf = k => DAY_ARCHETYPES[k].primary;
  const conflicts = (a, b) => a != null && b != null && groupsOf(a).some(g => groupsOf(b).includes(g));
  for(let pass = 0; pass < 8; pass++){
    let ok = true;
    for(let i = 0; i < arr.length - 1; i++){
      if(conflicts(arr[i], arr[i + 1])){
        ok = false;
        for(let j = i + 2; j < arr.length; j++){
          if(!conflicts(arr[i], arr[j]) && !conflicts(arr[j], arr[i + 1])){
            [arr[i + 1], arr[j]] = [arr[j], arr[i + 1]];
            break;
          }
        }
      }
    }
    if(ok) break;
  }
  return arr;
}
/* Quanto um grupo muscular já está "carregado" na semana em construção — cada aparição como grupo
   primário conta 1, como acessório conta meio ponto. Usado pra escolher entre arquétipos concorrentes
   sem deixar a semana concentrar demais num só grupo (ex: Ombro entrando via 'ombro', 'push' e 'upper'
   ao mesmo tempo) — a literatura (Schoenfeld et al.) aponta ~2x/semana por grupo como a frequência que
   maximiza hipertrofia num dado volume semanal, então a estrutura preza por distribuir, não empilhar. */
function weeklyLoadScore(chosenKeys, group){
  return chosenKeys.reduce((n, k) => {
    const a = DAY_ARCHETYPES[k];
    return n + (a.primary.includes(group) ? 1 : 0) + (a.accessory.includes(group) ? 0.5 : 0);
  }, 0);
}
function archetypeLoadCost(key, chosenKeys){
  return DAY_ARCHETYPES[key].primary.reduce((s, g) => s + weeklyLoadScore(chosenKeys, g), 0);
}
function buildSmartStructure(level, focus, levelDays, variationIndex, nonce){
  const rng = seededRng(`struct|${level}|${(focus || []).join(',')}|${levelDays}|${variationIndex}|${nonce}`);
  const focusGroups = focusToGroups(focus);
  // grupos que nunca viram "dia principal" (hoje só o Abdômen — sempre entra como acessório de outro dia)
  const structuralFocusGroups = focusGroups.filter(g => archetypesFeaturingPrimary(g).length > 0);
  const wantsCoreFocus = focusGroups.includes('Abdômen');
  const chosen = [];
  // entre os arquétipos candidatos pro grupo pedido, prefere o que menos sobrepõe grupos já usados na semana
  // (ex: pra Pernas, prioriza 'pernas' puro em vez de 'gluteos'/'lower' se Glúteos já apareceu bastante)
  const pickFor = (group, avoidKeys) => {
    const candidates = archetypesFeaturingPrimary(group).filter(k => !avoidKeys.includes(k));
    const pool = candidates.length ? candidates : archetypesFeaturingPrimary(group);
    if(pool.length === 0) return undefined;
    const shuffled = shuffleSeeded(pool, rng);
    return shuffled.reduce((best, k) => archetypeLoadCost(k, chosen) < archetypeLoadCost(best, chosen) ? k : best, shuffled[0]);
  };

  // 1ª passada: garante ao menos 1x/semana pra cada grupo de foco escolhido pelo usuário
  structuralFocusGroups.forEach(g => { if(chosen.length < levelDays) chosen.push(pickFor(g, [])); });
  // passadas extras: dá uma 2ª (e, com semana de 5+ dias, até 3ª) aparição pros grupos de foco —
  // frequência maior é o principal driver de mais estímulo semanal por grupo.
  const extraRounds = levelDays >= 5 ? 2 : 1;
  for(let r = 0; r < extraRounds; r++){
    structuralFocusGroups.forEach(g => {
      if(chosen.length >= levelDays) return;
      const already = chosen.filter(k => DAY_ARCHETYPES[k].primary.includes(g));
      chosen.push(pickFor(g, already));
    });
  }
  // cobertura mínima: Peito, Costas e Pernas aparecem ao menos 1x/semana mesmo sem foco nelas
  ['Peito', 'Costas', 'Pernas'].forEach(g => {
    if(chosen.length >= levelDays) return;
    const covered = chosen.some(k => DAY_ARCHETYPES[k].primary.includes(g));
    if(!covered) chosen.push(pickFor(g, []));
  });
  // preenche o restante da semana priorizando, a cada vaga, o arquétipo ainda não usado que menos
  // sobrecarrega grupos já presentes — evita que a ordem aleatória do pool empilhe por acaso o mesmo
  // grupo (ex: Ombro) em 3 dos 5 dias. Se o usuário pediu foco em Core, ainda dá uma leve preferência
  // pra arquétipos que trazem Abdômen de acessório, pra aumentar a frequência semanal de core.
  const remainingPool = shuffleSeeded(Object.keys(DAY_ARCHETYPES), rng);
  while(chosen.length < levelDays){
    const candidates = remainingPool.filter(k => !chosen.includes(k));
    const pool = candidates.length ? candidates : remainingPool;
    const cost = k => archetypeLoadCost(k, chosen) + (wantsCoreFocus && !DAY_ARCHETYPES[k].accessory.includes('Abdômen') ? 0.75 : 0);
    chosen.push(pool.reduce((best, k) => cost(k) < cost(best) ? k : best, pool[0]));
  }

  const ordered = orderAvoidingAdjacentRepeats(chosen.slice(0, levelDays), rng);
  return ordered.map((key, i) => {
    const a = DAY_ARCHETYPES[key];
    return { name:`Treino ${String.fromCharCode(65 + i)}`, primary:a.primary.slice(), accessory:a.accessory.slice() };
  });
}
const SPLIT_TYPE_OPTIONS = ['padrao','fullbody'];
const SPLIT_TYPE_LABELS = { padrao:'Divisão por grupo', fullbody:'Corpo inteiro (Fullbody)' };
const SPLIT_TYPE_NOTES = {
  padrao:'Cada treino foca um ou dois grupos musculares principais, com acessórios complementares.',
  fullbody:'Cada treino passa por vários grupos musculares no mesmo dia, em vez de dividir por partes do corpo.',
};
const FOCUS_OPTIONS = ['peitoral','costas','ombros','bracos','gluteos','posterior_pernas','inferior_pernas','core'];
const FOCUS_LABELS = {
  peitoral:'Peitoral', costas:'Costas', ombros:'Ombros', bracos:'Braços', gluteos:'Glúteos',
  posterior_pernas:'Posterior de pernas', inferior_pernas:'Inferior de pernas', core:'Core',
};
const FOCUS_GROUPS = {
  peitoral:['Peito'], costas:['Costas'], ombros:['Ombro'], bracos:['Bíceps','Tríceps'], gluteos:['Glúteos'],
  posterior_pernas:['Pernas'], inferior_pernas:['Pernas'], core:['Abdômen'],
};
const FOCUS_SUBGROUP = { posterior_pernas:'hamstring', inferior_pernas:'calf' };
const FOCUS_MAX = 3;
function weightsForFocus(focus){
  const weights = {};
  (focus || []).forEach(f => { (FOCUS_GROUPS[f] || []).forEach(g => { weights[g] = Math.max(weights[g] || 1, 1.7); }); });
  return weights;
}
function preferFnForGroup(group, focus){
  const subgroups = (focus || []).filter(f => (FOCUS_GROUPS[f] || []).includes(group) && FOCUS_SUBGROUP[f]).map(f => FOCUS_SUBGROUP[f]);
  if(subgroups.length === 0) return null;
  return x => subgroups.includes(x.subgroup);
}
function focusNote(focus){
  if(!focus || focus.length === 0) return 'Volume distribuído normalmente entre os grupos de cada dia.';
  return `Mais exercícios e prioridade para: ${focus.map(f => FOCUS_LABELS[f]).join(', ')} — sempre respeitando a estrutura e o equilíbrio primário/acessório do treino.`;
}
const FULLBODY_GROUP_CYCLE = ['Pernas','Peito','Costas','Ombro','Glúteos','Bíceps','Tríceps','Abdômen'];
const SEX_REP_ADJUST = { M:0, F:1 };
function buildFullbodyStructure(days, focus, variationIndex, nonce){
  const focusGroups = focusToGroups(focus);
  const rng = seededRng(`fullbody|${days}|${(focus || []).join(',')}|${variationIndex}|${nonce}`);
  const others = shuffleSeeded(FULLBODY_GROUP_CYCLE.filter(g => !focusGroups.includes(g)), rng);
  const groupsPerDay = 3;
  const structure = [];
  let otherIdx = 0;
  for(let d = 0; d < days; d++){
    // no fullbody, cada sessão passa pelo corpo inteiro — os grupos de foco entram em TODA sessão
    // (máxima frequência possível), o resto do slot roda entre os demais grupos pra variar.
    const groups = focusGroups.slice(0, groupsPerDay);
    while(groups.length < groupsPerDay){
      groups.push(others[otherIdx % others.length]);
      otherIdx++;
    }
    structure.push({ name:`Treino ${String.fromCharCode(65 + d)}`, primary:Array.from(new Set(groups)), accessory:[] });
  }
  return structure;
}
function allocateExerciseCounts(groups, total, weightsMap, capsMap){
  if(groups.length === 0) return [];
  weightsMap = weightsMap || {};
  capsMap = capsMap || {};
  const weights = groups.map(g => weightsMap[g] || 1);
  const sumW = weights.reduce((a,b) => a + b, 0);
  const counts = weights.map(w => Math.max(1, Math.round(total * w / sumW)));
  let diff = total - counts.reduce((a,b) => a + b, 0);
  while(diff > 0){
    const i = weights.indexOf(Math.max(...weights));
    counts[i]++; diff--;
  }
  while(diff < 0){
    let idx = -1, minW = Infinity;
    counts.forEach((c,i) => { if(c > 1 && weights[i] < minW){ minW = weights[i]; idx = i; } });
    if(idx === -1) break;
    counts[idx]--; diff++;
  }
  // teto por grupo (ex: Abdômen no máx. 3/sessão) — excedente é redistribuído pros demais grupos do dia
  let overflow = 0;
  groups.forEach((g, i) => {
    const cap = capsMap[g];
    if(cap != null && counts[i] > cap){ overflow += counts[i] - cap; counts[i] = cap; }
  });
  while(overflow > 0){
    const eligible = groups.map((_, i) => i).filter(i => { const cap = capsMap[groups[i]]; return cap == null || counts[i] < cap; });
    if(eligible.length === 0) break;
    let idx = eligible[0], maxW = -1;
    eligible.forEach(i => { if(weights[i] > maxW){ maxW = weights[i]; idx = i; } });
    counts[idx]++; overflow--;
  }
  return counts;
}
/* Reparte o total de exercícios do dia entre grupos primários (compostos) e acessórios (isolados).
   O volume acessório nunca ultrapassa metade do total (logo, nunca ultrapassa o volume primário) —
   evita o desequilíbrio de um grupo acessório (ex: Bíceps) superar o grupo primário pareado (ex: Costas).
   Quando não há espaço para todos os acessórios no dia, o rng escolhe quais entram (rotação entre variações). */
function allocateDaySlots(primary, accessory, total, weightsMap, rng, capsMap){
  const nPrimary = primary.length, nAcc = accessory.length;
  if(nAcc === 0) return { primaryCounts: allocateExerciseCounts(primary, total, weightsMap, capsMap), accessoryCounts: [] };
  const accSlots = Math.max(0, Math.min(nAcc, Math.floor(total / 2), total - nPrimary));
  const primarySlots = total - accSlots;
  const primaryCounts = allocateExerciseCounts(primary, primarySlots, weightsMap, capsMap);
  const accessoryCounts = accessory.map(() => 0);
  if(accSlots > 0){
    const order = accessory.map((_, i) => i);
    for(let i = order.length - 1; i > 0; i--){
      const j = Math.floor(rng() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    const chosen = order.slice(0, Math.min(accSlots, nAcc));
    const chosenGroups = chosen.map(i => accessory[i]);
    const counts = allocateExerciseCounts(chosenGroups, accSlots, weightsMap, capsMap);
    chosen.forEach((idx, ci) => { accessoryCounts[idx] = counts[ci]; });
  }
  return { primaryCounts, accessoryCounts };
}

function strToSeed(str){ let h = 0; for(let i=0;i<str.length;i++){ h = (Math.imul(31,h) + str.charCodeAt(i)) | 0; } return h >>> 0; }
function mulberry32(seed){ return function(){ seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function seededRng(str){ return mulberry32(strToSeed(str)); }
function pickN(pool, n, rng, excludeSet, preferFn){
  const copy = pool.filter(x => !excludeSet.has(x.key));
  const chosen = [];
  const usedIllust = new Set();
  const usedPattern = new Set();
  while(chosen.length < n && copy.length){
    // além de variar o desenho (illust), quando o exercício carrega um "pattern" de movimento
    // (hoje só o Abdômen: flexão / anti-extensão / rotação) prioriza cobrir padrões diferentes
    // em vez de repetir o mesmo — McGill (core training) recomenda variar o tipo de estímulo do
    // core em vez de empilhar só exercícios de flexão de coluna (ex: várias variações de crunch).
    const scored = copy.map(x => (preferFn && preferFn(x) ? 2 : 0)
      + (usedIllust.has(x.illust) ? 0 : 1)
      + (x.pattern && !usedPattern.has(x.pattern) ? 1 : 0));
    const maxScore = Math.max(...scored);
    const candidates = copy.filter((x, i) => scored[i] === maxScore);
    const idx = Math.floor(rng() * candidates.length);
    const picked = candidates[idx];
    chosen.push(picked);
    usedIllust.add(picked.illust);
    if(picked.pattern) usedPattern.add(picked.pattern);
    copy.splice(copy.indexOf(picked), 1);
  }
  chosen.forEach(c => excludeSet.add(c.key));
  return chosen;
}
const INTENSITY_TIERS = [
  { name:'Aquecimento Ativo', emoji:'🌤️', tag:'Leve', setAdj:-1, repAdj:2, exAdj:-1 },
  { name:'Ritmo de Cruzeiro', emoji:'⚙️', tag:'Padrão', setAdj:0, repAdj:0, exAdj:0 },
  { name:'Modo Guerreiro', emoji:'🔥', tag:'Forte', setAdj:0, repAdj:-1, exAdj:0 },
  { name:'Fúria Máxima', emoji:'💥', tag:'Intenso', setAdj:1, repAdj:-1, exAdj:1 },
  { name:'Desafio Insano', emoji:'☠️', tag:'Insano', setAdj:1, repAdj:-2, exAdj:1 },
];
const DAY_THEMES = {
  'Peito|Pernas':'🦍 Força Bruta',
  'Costas|Ombro':'🦅 Asas de Aço',
  'Abdômen|Bíceps|Pernas|Tríceps':'⚡ Combo Relâmpago',
  'Costas|Peito':'🛡️ Blindagem Total',
  'Glúteos|Pernas':'🔥 Fornalha das Pernas',
  'Abdômen|Bíceps|Ombro|Tríceps':'💪 Braços de Ferro',
  'Ombro|Peito|Tríceps':'🚀 Push Supremo',
  'Bíceps|Costas':'🪝 Puxada Poderosa',
  'Abdômen|Pernas':'🧨 Core Explosivo',
  'Abdômen|Bíceps|Tríceps':'🦾 Braços & Core',
  'Peito|Tríceps':'💥 Impacto Frontal',
  'Abdômen|Ombro':'🌪️ Ombros em Fúria',
  'Pernas':'🐘 Dia da Perna',
  'Costas|Ombro|Peito':'🏔️ Superior Completo',
  'Abdômen|Glúteos|Pernas':'⛰️ Inferior Completo',
  'Abdômen':'🔥 Core em Chamas',
};
function groupSignature(groups){ return [...groups].sort().join('|'); }
function dayThemeName(groups){ return DAY_THEMES[groupSignature(groups)] || `💪 ${groups.join(' & ')}`; }
const ROTATION_WEEKS = { iniciante:'6 a 8 semanas', intermediario:'4 a 6 semanas', avancado:'3 a 4 semanas' };
const ROTATION_WEEKS_MAX = { iniciante:8, intermediario:6, avancado:4 };
const GOAL_TRAINING_NOTE = {
  perder_peso:'repetições mais altas e descansos mais curtos, priorizando o gasto calórico total da sessão',
  perder_gordura:'repetições moderadas-altas com intensidade progressiva, preservando força e massa magra',
  manter:'volume moderado, focado em manter a forma física e a saúde articular',
  manter_massa:'repetições moderadas com foco em preservar (ou ganhar) massa magra durante o déficit leve',
  ganhar_massa:'repetições mais baixas com cargas e séries mais altas, priorizando sobrecarga progressiva',
};
const GOAL_EXPECTED_RESULT = {
  perder_peso:'perda de peso corporal com preservação da massa magra',
  perder_gordura:'redução do percentual de gordura corporal mantendo a massa muscular',
  manter:'manutenção do condicionamento físico atual, com ganhos discretos de força',
  manter_massa:'recomposição corporal — leve perda de gordura com manutenção ou pequeno ganho de massa magra',
  ganhar_massa:'hipertrofia muscular e ganho de força visíveis',
};
function splitLogicText(days, splitType){
  if(splitType === 'fullbody'){
    return `Fullbody rotativo: cada um dos ${days.length} treinos passa por um trio diferente de grupos musculares, revezando em ciclo — o corpo inteiro recebe estímulo em cada sessão, ideal para quem tem frequência semanal mais flexível.`;
  }
  const freq = {};
  days.forEach(d => d.groups.forEach(g => { freq[g] = (freq[g] || 0) + 1; }));
  const freqParts = Object.entries(freq).sort((a, b) => b[1] - a[1]).map(([g, c]) => `${g} ${c}x`);
  return `Divisão em ${days.length} dias, cada um com 1 a 2 grupos primários (compostos) e acessórios complementares. Frequência semanal por grupo: ${freqParts.join(', ')} — intercale com descanso ou outro grupo antes de repetir o mesmo grupo primário, para dar tempo de recuperação.`;
}
function expectedResultText(goal, level){
  return `Seguindo esse plano com consistência e progressão de carga por ${ROTATION_WEEKS[level] || '4 a 6 semanas'} (antes de trocar de variação), o resultado esperado é: ${GOAL_EXPECTED_RESULT[goal] || GOAL_EXPECTED_RESULT.manter}.`;
}
function variationDescription(v){
  const goalLabel = GOAL_LABELS[v.goal] || 'Objetivo geral';
  const goalNote = GOAL_TRAINING_NOTE[v.goal] || GOAL_TRAINING_NOTE.manter;
  return `
    <div class="tiny" style="margin-top:4px;line-height:1.5;">
      <div><strong>🎯 Objetivo:</strong> ${goalLabel} — ${goalNote}.</div>
      <div style="margin-top:3px;"><strong>🗓️ Divisão:</strong> ${splitLogicText(v.days, v.splitType)}</div>
      <div style="margin-top:3px;"><strong>🔎 Foco:</strong> ${focusNote(v.focus)}</div>
      <div style="margin-top:3px;"><strong>📈 Resultado esperado:</strong> ${expectedResultText(v.goal, v.level)}</div>
    </div>
  `;
}
function generateVariation(goal, level, variationIndex, nonce, focus, sex, duration, splitType, exOffset){
  focus = Array.isArray(focus) ? focus.slice(0, FOCUS_MAX) : [];
  splitType = splitType === 'fullbody' ? 'fullbody' : 'padrao';
  duration = TIME_EX_PER_DAY[duration] ? duration : 90;
  const levelDays = LEVEL_DAYS[level] || 4;
  const structure = splitType === 'fullbody'
    ? buildFullbodyStructure(levelDays, focus, variationIndex, nonce)
    : buildSmartStructure(level, focus, levelDays, variationIndex, nonce);
  const tier = INTENSITY_TIERS[variationIndex % INTENSITY_TIERS.length];
  const goalCfg = REP_RANGE_BY_GOAL[goal] || REP_RANGE_BY_GOAL.manter;
  const sets = Math.max(2, goalCfg.sets + (LEVEL_SET_ADJUST[level] || 0) + tier.setAdj + (TIME_SET_ADJUST[duration] || 0));
  const reps = Math.max(6, goalCfg.reps + (LEVEL_REP_ADJUST[level] || 0) + tier.repAdj + (SEX_REP_ADJUST[sex] || 0));
  const exPerDay = clamp(
    (TIME_EX_PER_DAY[duration] || 7) + (LEVEL_EXCOUNT_ADJUST[level] || 0) + (tier.exAdj || 0) + (exOffset || 0),
    4, 9
  );
  const weightsMap = weightsForFocus(focus);
  const seedBase = `${goal}|${level}|${variationIndex}|${nonce}|${focus.join(',')}|${duration}|${splitType}`;
  const days = structure.map((day, dayIdx) => {
    const rng = seededRng(`${seedBase}|${dayIdx}`);
    const used = new Set();
    const primary = day.primary || day.groups || [];
    const accessory = day.accessory || [];
    const groups = [...primary, ...accessory];
    const { primaryCounts, accessoryCounts } = allocateDaySlots(primary, accessory, exPerDay, weightsMap, rng, GROUP_MAX_PER_SESSION);
    const exercises = [];
    primary.forEach((g, gi) => {
      const picks = pickN(EXERCISE_CATALOG[g] || [], primaryCounts[gi], rng, used, preferFnForGroup(g, focus));
      picks.forEach(p => exercises.push({ id:uid(), name:p.name, exerciseKey:p.key, muscleGroup:g, targetSets:sets, targetReps:(COMPOUND_KEYS.has(p.key) ? reps : reps + 2) }));
    });
    accessory.forEach((g, gi) => {
      const picks = pickN(EXERCISE_CATALOG[g] || [], accessoryCounts[gi], rng, used, preferFnForGroup(g, focus));
      picks.forEach(p => exercises.push({ id:uid(), name:p.name, exerciseKey:p.key, muscleGroup:g, targetSets:sets, targetReps:(COMPOUND_KEYS.has(p.key) ? reps : reps + 2) }));
    });
    exercises.sort((a, b) => (COMPOUND_KEYS.has(a.exerciseKey) ? 0 : 1) - (COMPOUND_KEYS.has(b.exerciseKey) ? 0 : 1));
    const intensity = exercises.some(e => COMPOUND_KEYS.has(e.exerciseKey)) ? 'Alta' : 'Moderada';
    return { name:dayThemeName(groups), groups, intensity, exercises, sets, reps };
  });
  return { label:`${tier.emoji} ${tier.name}`, tierTag:tier.tag, goal, level, focus, splitType, duration, days };
}
function useGeneratedDay(goal, level, vIdx, nonce, focus, sex, duration, splitType, dayIdx, exOffset){
  const variation = generateVariation(goal, level, vIdx, nonce, focus, sex, duration, splitType, exOffset);
  const day = variation.days[dayIdx];
  archiveActivePlans();
  state.workoutPlans.push({ id:uid(), name:`${day.name} — ${variation.label}`, exercises:day.exercises, createdAt:todayStr(), level:variation.level });
  state.workoutSchedule = autoScheduleFromPlans(state.workoutPlans.map(p => p.id));
  saveState(); toast(`"${day.name} — ${variation.label}" é seu novo treino — o anterior foi para o histórico`); treinoGo('list');
}
function useGeneratedVariation(goal, level, vIdx, nonce, focus, sex, duration, splitType, exOffset){
  const variation = generateVariation(goal, level, vIdx, nonce, focus, sex, duration, splitType, exOffset);
  archiveActivePlans();
  variation.days.forEach(day => {
    state.workoutPlans.push({ id:uid(), name:`${day.name} — ${variation.label}`, exercises:day.exercises, createdAt:todayStr(), level:variation.level });
  });
  state.workoutSchedule = autoScheduleFromPlans(state.workoutPlans.map(p => p.id));
  saveState(); toast(`${variation.days.length} treinos de "${variation.label}" são seu novo programa`); treinoGo('list');
}

/* ---------- seed data ---------- */
/* unitLabel + unitGrams: quando o alimento normalmente é contado em unidades (ovo, fatia, scoop...)
   em vez de pesado — permite lançar "2 ovos" na interface em vez de ter que adivinhar os gramas. */
const BASE_FOODS = [
  // proteínas
  { name:'Peito de frango grelhado',  kcal100:165, protein100:31,  carbs100:0,    fat100:3.6 },
  { name:'Coxa de frango assada',     kcal100:209, protein100:26,  carbs100:0,    fat100:10.9 },
  { name:'Carne bovina (patinho)',    kcal100:163, protein100:31,  carbs100:0,    fat100:4.2 },
  { name:'Carne moída (acém)',        kcal100:212, protein100:26,  carbs100:0,    fat100:11.5 },
  { name:'Picanha grelhada',          kcal100:289, protein100:25,  carbs100:0,    fat100:21 },
  { name:'Lombo suíno grelhado',      kcal100:210, protein100:28,  carbs100:0,    fat100:10 },
  { name:'Tilápia grelhada',          kcal100:128, protein100:26,  carbs100:0,    fat100:2.7 },
  { name:'Salmão grelhado',           kcal100:208, protein100:20,  carbs100:0,    fat100:13 },
  { name:'Atum em lata (água)',       kcal100:116, protein100:26,  carbs100:0,    fat100:1 },
  { name:'Ovo cozido',                kcal100:155, protein100:13,  carbs100:1.1,  fat100:11,  unitLabel:'ovo', unitGrams:50 },
  { name:'Ovo frito',                 kcal100:196, protein100:14,  carbs100:0.8,  fat100:15,  unitLabel:'ovo', unitGrams:50 },
  { name:'Clara de ovo',              kcal100:52,  protein100:11,  carbs100:0.7,  fat100:0.2, unitLabel:'clara', unitGrams:33 },
  { name:'Whey protein (pó)',         kcal100:400, protein100:80,  carbs100:8,    fat100:5,   unitLabel:'scoop', unitGrams:30 },
  { name:'Tofu firme',                kcal100:76,  protein100:8,   carbs100:1.9,  fat100:4.8 },
  // carboidratos e cereais
  { name:'Arroz branco cozido',       kcal100:128, protein100:2.5, carbs100:28,   fat100:0.2 },
  { name:'Arroz integral cozido',     kcal100:124, protein100:2.6, carbs100:25.8, fat100:1 },
  { name:'Macarrão cozido',           kcal100:158, protein100:5.8, carbs100:31,   fat100:0.9 },
  { name:'Batata doce cozida',        kcal100:86,  protein100:1.6, carbs100:20,   fat100:0.1 },
  { name:'Batata inglesa cozida',     kcal100:87,  protein100:1.9, carbs100:20,   fat100:0.1 },
  { name:'Mandioca cozida',           kcal100:125, protein100:0.6, carbs100:30,   fat100:0.3 },
  { name:'Aveia em flocos',           kcal100:389, protein100:16.9,carbs100:66,   fat100:6.9 },
  { name:'Granola',                   kcal100:471, protein100:10,  carbs100:64,   fat100:20 },
  { name:'Tapioca (goma)',            kcal100:240, protein100:0.2, carbs100:59,   fat100:0 },
  { name:'Pão integral',              kcal100:247, protein100:13,  carbs100:41,   fat100:3.4,  unitLabel:'fatia', unitGrams:25 },
  { name:'Pão francês',               kcal100:300, protein100:8,   carbs100:58,   fat100:3.1,  unitLabel:'unidade', unitGrams:50 },
  { name:'Pão de forma branco',       kcal100:266, protein100:9,   carbs100:49,   fat100:3.3,  unitLabel:'fatia', unitGrams:25 },
  { name:'Cuscuz de milho cozido',    kcal100:112, protein100:2.3, carbs100:24,   fat100:0.3 },
  // leguminosas
  { name:'Feijão carioca cozido',     kcal100:76,  protein100:4.8, carbs100:13.6, fat100:0.5 },
  { name:'Feijão preto cozido',       kcal100:77,  protein100:4.5, carbs100:14,   fat100:0.5 },
  { name:'Lentilha cozida',           kcal100:116, protein100:9,   carbs100:20,   fat100:0.4 },
  { name:'Grão de bico cozido',       kcal100:164, protein100:8.9, carbs100:27,   fat100:2.6 },
  // vegetais e saladas
  { name:'Alface',                    kcal100:15,  protein100:1.4, carbs100:2.9,  fat100:0.2 },
  { name:'Tomate',                    kcal100:18,  protein100:0.9, carbs100:3.9,  fat100:0.2 },
  { name:'Pepino',                    kcal100:15,  protein100:0.7, carbs100:3.6,  fat100:0.1 },
  { name:'Cenoura crua',              kcal100:41,  protein100:0.9, carbs100:9.6,  fat100:0.2 },
  { name:'Brócolis cozido',           kcal100:35,  protein100:2.4, carbs100:7.2,  fat100:0.4 },
  { name:'Couve refogada',            kcal100:50,  protein100:3,   carbs100:6,    fat100:2 },
  { name:'Abobrinha refogada',        kcal100:27,  protein100:1.5, carbs100:4.6,  fat100:0.5 },
  { name:'Salada mista (folhas e legumes)', kcal100:25, protein100:1.3, carbs100:4.5, fat100:0.3 },
  // frutas
  { name:'Banana',                    kcal100:89,  protein100:1.1, carbs100:23,   fat100:0.3, unitLabel:'unidade', unitGrams:100 },
  { name:'Maçã',                      kcal100:52,  protein100:0.3, carbs100:14,   fat100:0.2, unitLabel:'unidade', unitGrams:130 },
  { name:'Laranja',                   kcal100:47,  protein100:0.9, carbs100:12,   fat100:0.1, unitLabel:'unidade', unitGrams:150 },
  { name:'Mamão',                     kcal100:43,  protein100:0.5, carbs100:11,   fat100:0.3 },
  { name:'Abacaxi',                   kcal100:50,  protein100:0.5, carbs100:13,   fat100:0.1 },
  { name:'Morango',                   kcal100:32,  protein100:0.7, carbs100:7.7,  fat100:0.3 },
  { name:'Abacate',                   kcal100:160, protein100:2,   carbs100:8.5,  fat100:14.7 },
  // laticínios
  { name:'Leite integral',            kcal100:61,  protein100:3.2, carbs100:4.8,  fat100:3.3 },
  { name:'Leite desnatado',           kcal100:35,  protein100:3.4, carbs100:5,    fat100:0.2 },
  { name:'Iogurte natural',           kcal100:61,  protein100:3.5, carbs100:4.7,  fat100:3.3 },
  { name:'Iogurte grego natural',     kcal100:97,  protein100:9,   carbs100:4,    fat100:5 },
  { name:'Queijo minas frescal',      kcal100:264, protein100:17,  carbs100:3.2,  fat100:20,  unitLabel:'fatia', unitGrams:30 },
  { name:'Queijo muçarela',           kcal100:330, protein100:22,  carbs100:2.2,  fat100:26,  unitLabel:'fatia', unitGrams:20 },
  { name:'Requeijão',                 kcal100:264, protein100:9,   carbs100:3.2,  fat100:24 },
  { name:'Cottage',                   kcal100:98,  protein100:11,  carbs100:3.4,  fat100:4.3 },
  // gorduras e oleaginosas
  { name:'Azeite de oliva',           kcal100:884, protein100:0,   carbs100:0,    fat100:100, unitLabel:'colher de sopa', unitGrams:13 },
  { name:'Castanha do Pará',          kcal100:656, protein100:14,  carbs100:12,   fat100:66,  unitLabel:'unidade', unitGrams:5 },
  { name:'Amendoim torrado',          kcal100:567, protein100:26,  carbs100:16,   fat100:49 },
  { name:'Pasta de amendoim',         kcal100:588, protein100:25,  carbs100:20,   fat100:50,  unitLabel:'colher de sopa', unitGrams:16 },
];
/* Estado limpo para quem está começando agora (cada instalação/dispositivo tem seu próprio
   localStorage, então cada pessoa que abre o app no próprio celular já parte de um estado
   independente) — mantém a biblioteca de alimentos de referência, mas nenhum dado pessoal fictício. */
function buildEmptyState(profile){
  const foods = BASE_FOODS.map(f => ({ id:uid(), ...f }));
  const energy = calcEnergy(profile);
  const dietPlan = {
    targetKcal: energy.targetKcal, targetProteinG: energy.targetProteinG,
    targetCarbsG: energy.targetCarbsG, targetFatG: energy.targetFatG,
    meals: ['Café da manhã','Almoço','Lanche da tarde','Jantar'].map(name => ({ id:uid(), name, items:[] })),
  };
  return {
    profile, bodyMetrics:[], workoutPlans:[], workoutLogs:[], planHistory:[], workoutSchedule:{},
    cardioSessions:[], cardioLogs:[], foods, dietPlan, dietLogs:[], waterLogs:[], dishes:[],
  };
}
function buildSeed(){
  const profile = { name:'Fernando', sex:'M', age:29, heightCm:178, weightKg:82, bodyFatPct:19, activityLevel:'moderado', goal:'perder_gordura', waterGoalMl:3000 };

  const bodyMetrics = [
    { id:uid(), date:daysAgo(21), weightKg:84.6, bodyFatPct:20.5 },
    { id:uid(), date:daysAgo(14), weightKg:83.8, bodyFatPct:20.0 },
    { id:uid(), date:daysAgo(7),  weightKg:83.1, bodyFatPct:19.4 },
    { id:uid(), date:todayStr(),  weightKg:82.0, bodyFatPct:19.0 },
  ];

  const seedVariation = generateVariation(profile.goal, 'intermediario', 0, 0, [], profile.sex);
  const workoutPlans = seedVariation.days.map(day => ({ id:uid(), name:day.name, exercises:day.exercises }));

  const workoutLogs = [workoutPlans[0], workoutPlans[1]].map((plan, i) => ({
    id:uid(), planId:plan.id, planName:plan.name, date:daysAgo(i===0?2:4),
    entries: plan.exercises.map(ex => ({
      exerciseId:ex.id, exerciseName:ex.name, exerciseKey:ex.exerciseKey, muscleGroup:ex.muscleGroup,
      sets: Array.from({length:ex.targetSets}, () => ({ reps:ex.targetReps, weightKg:ex.targetLoadKg || 20 })),
    })),
  }));

  const cardioSessions = [ { id:uid(), type:'Corrida', targetDurationMin:30, targetDistanceKm:5 } ];
  const cardioLogs = [ { id:uid(), sessionId:cardioSessions[0].id, type:'Corrida', date:daysAgo(3), durationMin:32, distanceKm:5.1, caloriesKcal:340 } ];

  const foods = BASE_FOODS.map(f => ({ id:uid(), ...f }));
  const byName = n => foods.find(f => f.name === n);

  const dietPlan = (() => {
    const energy = calcEnergy(profile);
    return {
      targetKcal: energy.targetKcal, targetProteinG: energy.targetProteinG,
      targetCarbsG: energy.targetCarbsG, targetFatG: energy.targetFatG,
      meals: [
        { id:uid(), name:'Café da manhã', items:[
          { foodId: byName('Ovo cozido').id, foodName:'Ovo cozido', grams:100 },
          { foodId: byName('Pão integral').id, foodName:'Pão integral', grams:60 },
          { foodId: byName('Banana').id, foodName:'Banana', grams:120 },
        ]},
        { id:uid(), name:'Almoço', items:[
          { foodId: byName('Peito de frango grelhado').id, foodName:'Peito de frango grelhado', grams:150 },
          { foodId: byName('Arroz branco cozido').id, foodName:'Arroz branco cozido', grams:150 },
          { foodId: byName('Feijão carioca cozido').id, foodName:'Feijão carioca cozido', grams:100 },
        ]},
        { id:uid(), name:'Lanche da tarde', items:[
          { foodId: byName('Whey protein (pó)').id, foodName:'Whey protein (pó)', grams:30 },
          { foodId: byName('Aveia em flocos').id, foodName:'Aveia em flocos', grams:40 },
        ]},
        { id:uid(), name:'Jantar', items:[
          { foodId: byName('Peito de frango grelhado').id, foodName:'Peito de frango grelhado', grams:120 },
          { foodId: byName('Batata doce cozida').id, foodName:'Batata doce cozida', grams:200 },
        ]},
      ],
    };
  })();

  const breakfast = dietPlan.meals[0];
  const dietLogs = breakfast.items.map(item => {
    const food = foods.find(f => f.id === item.foodId);
    const m = macrosForGrams(food, item.grams);
    return { id:uid(), date:todayStr(), foodId:food.id, foodName:item.foodName, grams:item.grams,
      kcal:m.kcal, proteinG:m.proteinG, carbsG:m.carbsG, fatG:m.fatG, mealName:breakfast.name };
  });

  const waterLogs = [ { id:uid(), date:todayStr(), ml:500 }, { id:uid(), date:todayStr(), ml:300 } ];

  const lunch = dietPlan.meals[1];
  const dishes = [{
    id:uid(), name:'Marmita de frango com arroz e feijão', source:'manual', createdAt:todayStr(),
    items: lunch.items.map(item => {
      const food = foods.find(f => f.id === item.foodId);
      return { id:uid(), name:item.foodName, kcal100:food.kcal100, protein100:food.protein100, carbs100:food.carbs100, fat100:food.fat100, grams:item.grams };
    }),
  }];

  const workoutSchedule = autoScheduleFromPlans(workoutPlans.map(p => p.id));
  return { profile, bodyMetrics, workoutPlans, workoutLogs, planHistory:[], workoutSchedule, cardioSessions, cardioLogs, foods, dietPlan, dietLogs, waterLogs, dishes };
}

/* ---------- persistence ---------- */
let state = null;
let AUTH_USER = null;
function saveState(){
  state.updatedAt = Date.now();
  try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }catch(e){}
  if(typeof AppCloud !== 'undefined' && AppCloud.isConfigured()) AppCloud.saveRemoteState(state);
}
function loadState(){ try{ const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : null; }catch(e){ return null; } }

/* ---------- ui/draft state (not persisted) ---------- */
let UI = { tab:'inicio', treinoView:{v:'today'}, dietaView:{v:'overview'}, onboarding:false };
let Drafts = {
  treinoPlan:null, execute:null,
  profileForm:null, newMetric:{ weight:'', bodyFat:'' },
  onboardingForm:{ name:'', sex:'F', age:'', heightCm:'', weightKg:'', bodyFatPct:'', activityLevel:'moderado', goal:'manter', waterGoalMl:3000 },
  dietPlanForm:null, dietaPlanUI:{ pickingMealId:null, pickFoodId:null, pickGrams:'100', newMealName:'' },
  foodForm:{ name:'', kcal:'', protein:'', carbs:'', fat:'' },
  registerPicker:{ foodId:null, mode:'g', grams:'100', unitQty:'1' },
  home:{ customWater:'', monthOffset:0 },
  assigningDow:null,
  cardioForm:{ type:'Corrida', duration:'30', distance:'' },
  cardioLoggingId:null, cardioExec:{ duration:'', distance:'', calories:'' },
  generator:{ goal:null, level:'intermediario', focus:[], splitType:'padrao', duration:90, nonce:0, tierIndex:1, exOffset:0 },
  execHome:{ expandedDow:null },
  restTimer:{ running:false, duration:90, remaining:90, intervalId:null },
  photoMeal:{ status:'idle', error:null }, // status: idle | loading | error (sucesso navega pro editor de prato)
  dishBuilder:{
    name:'', items:[], pickFoodId:null, qty:{ mode:'g', grams:'100', unitQty:'1' },
    customItem:{ name:'', kcal:'', protein:'', carbs:'', fat:'' },
    editingDishId:null,
  },
};

/* ---------- toast ---------- */
let toastTimer = null;
function toast(msg, kind){
  const el = document.getElementById('toast'); if(!el) return;
  el.textContent = msg;
  el.style.background = kind === 'error' ? 'var(--danger)' : 'var(--toast-bg)';
  el.style.color = kind === 'error' ? '#fff' : 'var(--toast-ink)';
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
}

/* ---------- navigation ---------- */
function goTab(tab){
  UI.tab = tab;
  if(tab === 'treino') UI.treinoView = { v:'today' };
  if(tab === 'dieta') UI.dietaView = { v:'overview' };
  if(tab === 'perfil') Drafts.profileForm = JSON.parse(JSON.stringify(state.profile));
  renderShell();
}
function treinoSectionOf(v){ return (v === 'today' || v === 'execute') ? 'executar' : 'montar'; }
function treinoSectionHome(v){ return treinoSectionOf(v) === 'executar' ? 'today' : 'list'; }
function goBack(){
  if(UI.tab === 'treino'){
    const home = treinoSectionHome(UI.treinoView.v);
    if(UI.treinoView.v !== home) UI.treinoView = { v: home };
  }
  else if(UI.tab === 'dieta' && UI.dietaView.v === 'dishBuilder') UI.dietaView = { v:'register' };
  else if(UI.tab === 'dieta' && UI.dietaView.v !== 'overview') UI.dietaView = { v:'overview' };
  refresh();
}
function treinoGo(v, id){
  UI.treinoView = id ? { v, id } : { v };
  if(v === 'plan') Drafts.treinoPlan = buildPlanDraft(id);
  if(v === 'execute') resumeOrStartExecution(id);
  if(v === 'gerador' && !Drafts.generator.goal) Drafts.generator.goal = state.profile.goal || 'manter';
  refresh();
}
/* Série marcada, peso digitado, exercício extra adicionado — nada disso valia nada até "Finalizar
   treino" ser tocado: se o app fosse fechado ou recarregado no meio do treino (muito comum no
   celular — tela trava, liga a tela e troca de app pra olhar o descanso, etc.), tudo era perdido.
   Agora o progresso vive em state.activeExecution (persistido), e reabrir o mesmo plano retoma de
   onde parou em vez de começar do zero. */
function resumeOrStartExecution(planId){
  if(state.activeExecution && state.activeExecution.planId === planId){
    Drafts.execute = state.activeExecution;
    return;
  }
  Drafts.execute = buildExecuteDraft(planId);
  state.activeExecution = Drafts.execute;
  saveState();
}
function dietaGo(v){
  UI.dietaView = { v };
  if(v === 'plan'){ Drafts.dietPlanForm = JSON.parse(JSON.stringify(state.dietPlan)); Drafts.dietaPlanUI = { pickingMealId:null, pickFoodId:null, pickGrams:'100', newMealName:'' }; }
  if(v === 'foods') Drafts.foodForm = { name:'', kcal:'', protein:'', carbs:'', fat:'' };
  if(v === 'register'){ Drafts.registerPicker = { foodId:null, mode:'g', grams:'100', unitQty:'1' }; Drafts.photoMeal = { status:'idle', error:null }; }
  refresh();
}
function goDietaRegister(){ UI.tab='dieta'; dietaGo('register'); renderShell(); }
function goTreinoTab(){ goTab('treino'); }
function goCardioTab(){ goTab('cardio'); }
function goPerfilTab(){ goTab('perfil'); }

/* ---------- shell / render ---------- */
function renderShell(){
  const root = document.getElementById('root');
  if(UI.onboarding){
    root.innerHTML = `<div class="stage"><div class="phone" id="phone">
        <div class="content" id="content" style="padding-top:22px;">${renderOnboarding()}</div>
        <div class="toast" id="toast"></div>
      </div></div>`;
    return;
  }
  root.innerHTML = `<div class="stage"><div class="phone" id="phone">
      <div id="topbar"></div>
      <div class="content" id="content"></div>
      <div class="toast" id="toast"></div>
      <div class="tabbar" id="tabbar"></div>
    </div></div>`;
  refresh();
  document.getElementById('tabbar').innerHTML = tabbarHTML();
}
function refresh(){
  document.getElementById('topbar').innerHTML = renderTopbar();
  document.getElementById('content').innerHTML = renderContent();
}
function tabbarHTML(){
  const tabs = [ ['inicio','Início',ICON.home], ['treino','Treino',ICON.dumbbell], ['dieta','Dieta',ICON.plate], ['cardio','Cardio',ICON.heart], ['perfil','Perfil',ICON.user] ];
  return tabs.map(([key,label,icon]) => `<button class="tab ${UI.tab===key?'active':''}" onclick="goTab('${key}')">${icon}<span>${label}</span></button>`).join('');
}
function canGoBack(){
  if(UI.tab === 'treino') return UI.treinoView.v !== treinoSectionHome(UI.treinoView.v);
  if(UI.tab === 'dieta') return UI.dietaView.v !== 'overview';
  return false;
}
function headerTitle(){
  if(UI.tab === 'treino'){
    if(UI.treinoView.v === 'today') return 'Executar';
    if(UI.treinoView.v === 'list') return 'Montar treino';
    if(UI.treinoView.v === 'plan') return (Drafts.treinoPlan && Drafts.treinoPlan.id !== 'novo') ? 'Editar plano' : 'Novo plano';
    if(UI.treinoView.v === 'execute') return 'Executar treino';
    if(UI.treinoView.v === 'history') return 'Histórico';
    if(UI.treinoView.v === 'gerador') return 'Gerador de treinos';
    if(UI.treinoView.v === 'novo') return 'Novo treino';
  }
  if(UI.tab === 'dieta'){
    if(UI.dietaView.v === 'overview') return 'Dieta';
    if(UI.dietaView.v === 'plan') return 'Plano alimentar';
    if(UI.dietaView.v === 'foods') return 'Alimentos';
    if(UI.dietaView.v === 'register') return 'Registrar refeição';
    if(UI.dietaView.v === 'dishBuilder') return Drafts.dishBuilder.editingDishId ? 'Editar prato' : 'Novo prato';
  }
  if(UI.tab === 'cardio') return 'Cardio';
  if(UI.tab === 'perfil') return 'Perfil';
  return '';
}
function treinoSegmentedHTML(){
  const sec = treinoSectionOf(UI.treinoView.v);
  return `<div class="treino-seg">
    <button class="${sec==='executar'?'active':''}" onclick="treinoGo('today')">▶ Executar</button>
    <button class="${sec==='montar'?'active':''}" onclick="treinoGo('list')">🛠️ Montar</button>
  </div>`;
}
function renderTopbar(){
  if(UI.tab === 'inicio') return `<div class="topbar"><div class="brand">VITA</div><div class="muted cap">${fmtDatePt(todayStr())}</div></div>`;
  const back = canGoBack() ? `<button class="back-btn" onclick="goBack()">${ICON.back}</button>` : '';
  const showSeg = UI.tab === 'treino' && (UI.treinoView.v === 'today' || UI.treinoView.v === 'list');
  return `<div class="topbar">${back}<div class="page-title">${headerTitle()}</div></div>${showSeg ? treinoSegmentedHTML() : ''}`;
}
function renderContent(){
  if(UI.tab === 'inicio') return renderInicio();
  if(UI.tab === 'treino'){
    if(UI.treinoView.v === 'today') return renderTreinoToday();
    if(UI.treinoView.v === 'list') return renderTreinoList();
    if(UI.treinoView.v === 'plan') return renderTreinoPlanForm();
    if(UI.treinoView.v === 'execute') return renderTreinoExecute();
    if(UI.treinoView.v === 'history') return renderTreinoHistory();
    if(UI.treinoView.v === 'gerador') return renderTreinoGerador();
    if(UI.treinoView.v === 'novo') return renderTreinoNovoChoice();
  }
  if(UI.tab === 'dieta'){
    if(UI.dietaView.v === 'overview') return renderDietaOverview();
    if(UI.dietaView.v === 'plan') return renderDietaPlanForm();
    if(UI.dietaView.v === 'foods') return renderDietaFoods();
    if(UI.dietaView.v === 'register') return renderDietaRegister();
    if(UI.dietaView.v === 'dishBuilder') return renderDishBuilder();
  }
  if(UI.tab === 'cardio') return renderCardio();
  if(UI.tab === 'perfil') return renderPerfil();
  return '';
}

/* ---------- INÍCIO ---------- */
function renderInicio(){
  const today = todayStr();
  const kcalToday = state.dietLogs.filter(l => l.date === today).reduce((s,l) => s+l.kcal, 0);
  const waterMl = state.waterLogs.filter(w => w.date === today).reduce((s,w) => s+w.ml, 0);
  const workoutToday = state.workoutLogs.some(w => w.date === today);
  const cardioToday = state.cardioLogs.some(c => c.date === today);
  const metrics = [...state.bodyMetrics].sort((a,b) => a.date < b.date ? 1 : -1);
  const last = metrics[0];

  return `
    <div>
      <div style="font-size:21px;font-weight:800;">Olá${state.profile.name ? ', '+esc(state.profile.name) : ''} 👋</div>
      <div class="muted">Aqui está o resumo do seu dia.</div>
    </div>

    <div class="card">
      <h3>Calorias</h3>
      <div class="between"><span class="muted">Consumido hoje</span><span class="num">${round(kcalToday)} / ${state.dietPlan.targetKcal} kcal</span></div>
      <div class="track"><div class="fill" style="width:${pct(kcalToday, state.dietPlan.targetKcal)}%;background:var(--accent);"></div></div>
      <button class="btn btn-secondary" onclick="goDietaRegister()">Registrar alimentação</button>
    </div>

    <div class="card">
      <h3>Água</h3>
      <div class="between"><span class="muted">Consumido hoje</span><span class="num">${waterMl} / ${state.profile.waterGoalMl} ml</span></div>
      <div class="track"><div class="fill" style="width:${pct(waterMl, state.profile.waterGoalMl)}%;background:var(--teal);"></div></div>
      <div class="row">
        ${[200,300,500].map(ml => `<button class="btn btn-ghost" onclick="addWater(${ml})">+${ml}ml</button>`).join('')}
      </div>
      <div class="row" style="align-items:flex-end;">
        <div class="field"><label>Outra quantidade (ml)</label><input inputmode="numeric" value="${esc(Drafts.home.customWater)}" oninput="Drafts.home.customWater=this.value" placeholder="ex: 350"/></div>
        <button class="btn btn-primary" style="max-width:110px;" onclick="customWaterAdd()">Adicionar</button>
      </div>
    </div>

    ${renderTodayWorkoutCard(workoutToday)}
    ${renderHomeCalendar()}

    <div class="card">
      <h3>Cardio</h3>
      <div style="font-weight:700;color:${cardioToday?'var(--good)':'var(--ink-soft)'};">${cardioToday ? 'Feito hoje ✓' : 'Pendente'}</div>
      <button class="btn btn-ghost" onclick="goCardioTab()">Ir para cardio</button>
    </div>

    <div class="card">
      <h3>Composição corporal</h3>
      ${last
        ? `<div class="muted">Último registro (${fmtDatePt(last.date)}): <span class="num">${last.weightKg} kg</span>${last.bodyFatPct!=null ? ` · <span class="num">${last.bodyFatPct}%</span> gordura` : ''}</div>`
        : `<div class="muted">Nenhum registro de peso ainda.</div>`}
      <button class="btn btn-ghost" onclick="goPerfilTab()">Ver perfil e análise calórica</button>
    </div>
  `;
}
function renderTodayWorkoutCard(workoutToday, showTreinoLink){
  if(showTreinoLink === undefined) showTreinoLink = true;
  const dow = isoDow(new Date());
  const planId = state.workoutSchedule[dow];
  const plan = state.workoutPlans.find(p => p.id === planId);
  return `
    <div class="card">
      <h3>Treino de hoje</h3>
      ${plan ? `
        <div class="between"><span style="font-weight:700;">${esc(plan.name)}</span>${workoutToday ? '<span class="eq-tag-inline" style="color:var(--good);">Feito ✓</span>' : ''}</div>
        <div class="muted">${plan.exercises.length} exercício(s)</div>
        ${planGroupPills(plan)}
        <button class="btn ${workoutToday ? 'btn-ghost' : 'btn-primary'}" onclick="startWorkout('${plan.id}')">${workoutToday ? 'Treinar de novo' : 'Treinar agora'}</button>
      ` : `<div class="muted">Hoje é dia de descanso no seu programa.</div>`}
      ${showTreinoLink ? `<button class="btn btn-ghost" onclick="goTreinoTab()">${plan ? 'Escolher outro treino' : 'Ver treinos'}</button>` : ''}
    </div>
  `;
}
function startWorkout(planId){
  UI.tab = 'treino';
  UI.treinoView = { v:'execute', id:planId };
  resumeOrStartExecution(planId);
  renderShell();
}
function renderHomeCalendar(){
  const offset = Drafts.home.monthOffset || 0;
  const now = new Date();
  const base = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const y = base.getFullYear(), m = base.getMonth();
  const totalDays = daysInMonth(y, m);
  const firstDow = isoDow(new Date(y, m, 1));
  const todayStrVal = todayStr();
  const monthKey = `${y}-${String(m + 1).padStart(2, '0')}`;

  let cells = '';
  for(let i = 0; i < firstDow; i++) cells += `<div></div>`;
  for(let d = 1; d <= totalDays; d++){
    const ds = ymd(y, m, d);
    const dow = isoDow(new Date(y, m, d));
    const scheduledPlanId = state.workoutSchedule[dow];
    const trained = state.workoutLogs.some(l => l.date === ds);
    const isToday = ds === todayStrVal;
    const isPast = ds < todayStrVal;
    let dot = '';
    if(trained) dot = `<i style="background:var(--good);"></i>`;
    else if(scheduledPlanId && isPast) dot = `<i style="background:var(--danger);"></i>`;
    else if(scheduledPlanId && !isPast) dot = `<i style="background:var(--teal);"></i>`;
    cells += `<div class="cal-cell ${isToday ? 'today' : ''}"><span>${d}</span>${dot}</div>`;
  }
  const trainedCount = new Set(state.workoutLogs.filter(l => l.date.startsWith(monthKey)).map(l => l.date)).size;

  return `
    <div class="card">
      <div class="between">
        <button class="icon-btn" onclick="Drafts.home.monthOffset=(Drafts.home.monthOffset||0)-1; refresh();">${ICON.back}</button>
        <h3 style="text-transform:capitalize;">${MO_FULL[m]} ${y}</h3>
        <button class="icon-btn" style="transform:scaleX(-1);" onclick="Drafts.home.monthOffset=(Drafts.home.monthOffset||0)+1; refresh();">${ICON.back}</button>
      </div>
      <div class="cal-grid cal-head">${WEEKDAY_LABELS.map(l => `<div>${l[0]}</div>`).join('')}</div>
      <div class="cal-grid">${cells}</div>
      <div class="cal-legend">
        <span><i style="background:var(--good);"></i>treinado</span>
        <span><i style="background:var(--danger);"></i>perdido</span>
        <span><i style="background:var(--teal);"></i>agendado</span>
      </div>
      <div class="tiny">${trainedCount} treino${trainedCount !== 1 ? 's' : ''} registrado${trainedCount !== 1 ? 's' : ''} em ${MO_FULL[m].toLowerCase()}</div>
    </div>
  `;
}
function addWater(ml){
  state.waterLogs.push({ id:uid(), date:todayStr(), ml });
  saveState(); refresh(); toast(`+${ml}ml de água registrados`);
}
function customWaterAdd(){
  const ml = toNum(Drafts.home.customWater, 0);
  if(!ml || ml <= 0){ toast('Informe uma quantidade válida em ml', 'error'); return; }
  addWater(round(ml));
  Drafts.home.customWater = '';
}

/* ---------- TREINO ---------- */
function planGroups(plan){ return Array.from(new Set(plan.exercises.map(e => e.muscleGroup))); }
function muscleSummary(plan){
  const groups = planGroups(plan);
  return groups.length ? groups.join(', ') : 'Sem exercícios';
}
function planGroupPills(plan){
  const groups = planGroups(plan);
  return groups.length ? `<div class="mtag-row">${groups.map(muscleTag).join('')}</div>` : `<div class="tiny">Sem exercícios</div>`;
}
function daysSince(dateStr){
  const [y,m,d] = dateStr.split('-').map(Number);
  const then = new Date(y, m-1, d);
  const now = new Date(); now.setHours(0,0,0,0);
  return Math.max(0, Math.round((now - then) / 86400000));
}
function fmtKg(n){ return (Math.round(n*10)/10).toFixed(1).replace(/\.0$/,''); }
function exerciseStatsLine(ex){
  const st = exerciseStats(ex);
  if(!st) return '';
  const evo = st.delta > 0 ? `evoluiu +${fmtKg(st.delta)}kg` : (st.delta < 0 ? `variou ${fmtKg(st.delta)}kg` : 'carga estável');
  return `<div class="tiny" style="color:var(--teal);">Feito ${st.count}x · ${evo} desde o início · último em ${fmtDatePt(st.lastDate)}</div>`;
}
function planExercisePreviewHTML(plan){
  return plan.exercises.map(e => `
    <div class="list-row" style="align-items:flex-start;justify-content:flex-start;">
      <span class="ex-mini">${exerciseIconSvg(e.muscleGroup, e.exerciseKey)}</span>
      <div style="flex:1;">
        <div style="font-weight:600;">${esc(e.name)}</div>
        <div class="tiny">${esc(e.muscleGroup)} · meta ${e.targetSets}x${e.targetReps}</div>
        ${exerciseStatsLine(e)}
      </div>
    </div>
  `).join('');
}
function programRotationLine(){
  const withDates = state.workoutPlans.filter(p => p.createdAt);
  if(withDates.length === 0) return '';
  const oldest = withDates.reduce((a,b) => a.createdAt < b.createdAt ? a : b);
  const weeks = Math.floor(daysSince(oldest.createdAt) / 7);
  const weeksLabel = weeks === 0 ? 'menos de 1 semana' : `${weeks} semana${weeks>1?'s':''}`;
  const levelPlan = state.workoutPlans.find(p => p.level);
  let hint = '';
  if(levelPlan){
    const maxWeeks = ROTATION_WEEKS_MAX[levelPlan.level];
    if(maxWeeks){
      const left = maxWeeks - weeks;
      hint = left > 0 ? ` · sugestão: variar em ~${left} semana${left>1?'s':''}` : ' · já passou da janela sugerida — bom momento para variar 🔀';
    }
  }
  return `<div class="tiny" style="margin-top:6px;">📅 Treinando este programa há ${weeksLabel}${hint}</div>`;
}
function toggleExecDay(dow){
  Drafts.execHome.expandedDow = Drafts.execHome.expandedDow === dow ? null : dow;
  refresh();
}
function renderTreinoToday(){
  const dow = isoDow(new Date());
  const today = todayStr();
  const workoutToday = state.workoutLogs.some(w => w.date === today);
  const todayPlan = state.workoutPlans.find(p => p.id === state.workoutSchedule[dow]);

  if(state.workoutPlans.length === 0){
    return `<div class="card">
      <h3>Treino de hoje</h3>
      <div class="empty">Você ainda não montou nenhum treino.</div>
      <button class="btn btn-primary" onclick="treinoGo('list')">🛠️ Ir para Montar treino</button>
    </div>`;
  }

  const todayCard = todayPlan ? `
    <div class="card">
      <h3>Treino de hoje</h3>
      <div class="between"><span style="font-weight:700;font-size:16px;">${esc(todayPlan.name)}</span>${workoutToday ? '<span class="eq-tag-inline" style="color:var(--good);">Feito ✓</span>' : ''}</div>
      <div class="muted">${todayPlan.exercises.length} exercício(s)</div>
      ${planGroupPills(todayPlan)}
      ${planExercisePreviewHTML(todayPlan)}
      ${programRotationLine()}
      <button class="btn ${workoutToday ? 'btn-ghost' : 'btn-primary'}" style="margin-top:10px;" onclick="startWorkout('${todayPlan.id}')">${workoutToday ? 'Treinar de novo' : 'Treinar agora'}</button>
    </div>
  ` : `
    <div class="card">
      <h3>Treino de hoje</h3>
      <div class="empty">Hoje é dia de descanso no seu programa.</div>
      ${programRotationLine()}
    </div>
  `;

  const otherDaysHTML = WEEKDAY_LABELS.map((label, d) => {
    if(d === dow) return '';
    const plan = state.workoutPlans.find(p => p.id === state.workoutSchedule[d]);
    if(!plan){
      return `<div class="list-row"><div style="width:38px;">${label}</div><div class="muted" style="flex:1;">Descanso</div></div>`;
    }
    const expanded = Drafts.execHome.expandedDow === d;
    return `
      <div class="list-row" style="cursor:pointer;" onclick="toggleExecDay(${d})">
        <div style="width:38px;font-weight:700;">${label}</div>
        <div style="flex:1;">${esc(plan.name)}</div>
        <span class="tiny" style="color:var(--accent);">${expanded ? '▲' : '▼'}</span>
      </div>
      ${expanded ? `
        <div style="padding:0 0 10px;">
          ${planGroupPills(plan)}
          ${planExercisePreviewHTML(plan)}
          <button class="btn btn-secondary" style="margin-top:8px;" onclick="startWorkout('${plan.id}')">Treinar o treino de ${label}</button>
        </div>
      ` : ''}
    `;
  }).join('');

  return `
    ${todayCard}
    <div class="card">
      <h3>Outros dias da semana</h3>
      <div class="tiny">Toque em um dia para ver os exercícios e, se quiser, treinar mesmo fora da ordem.</div>
      ${otherDaysHTML}
    </div>
  `;
}
function renderTreinoList(){
  if(state.workoutPlans.length === 0){
    return `<div class="card"><div class="empty">Você ainda não tem um treino montado. Crie um manualmente ou deixe o sistema sugerir um.</div></div>
      <button class="btn btn-primary" onclick="treinoGo('novo')">+ Criar novo treino</button>`;
  }
  const planDays = plan => Object.keys(state.workoutSchedule)
    .filter(d => state.workoutSchedule[d] === plan.id)
    .map(d => WEEKDAY_LABELS[d]);
  const cards = state.workoutPlans.map(plan => `
    <div class="card">
      <h4>${esc(plan.name)}</h4>
      <div class="muted">${plan.exercises.length} exercício(s)</div>
      ${planGroupPills(plan)}
      ${planDays(plan).length ? `<div class="tiny">Agendado: ${planDays(plan).join(', ')}</div>` : `<div class="tiny">Não agendado em nenhum dia fixo</div>`}
      <button class="btn btn-secondary" onclick="treinoGo('plan','${plan.id}')">Editar</button>
      <button class="btn-link" onclick="deleteWorkoutPlan('${plan.id}')">Excluir plano</button>
    </div>
  `).join('');
  return `
    ${renderScheduleCard()}
    ${cards}
    <button class="btn btn-primary" onclick="treinoGo('novo')">+ Criar novo treino</button>
    <button class="btn btn-ghost" onclick="treinoGo('history')">Ver histórico de treinos</button>`;
}
function renderScheduleCard(){
  const dow = isoDow(new Date());
  const rows = WEEKDAY_LABELS.map((label, d) => {
    const planId = state.workoutSchedule[d];
    const plan = state.workoutPlans.find(p => p.id === planId);
    const isToday = d === dow;
    return `
      <div class="list-row">
        <div style="width:38px;${isToday ? 'font-weight:800;color:var(--accent);' : ''}">${label}</div>
        <div style="flex:1;">${plan ? esc(plan.name) : '<span class="muted">Descanso</span>'}${isToday ? ' <span class="eq-tag-inline">hoje</span>' : ''}</div>
        <button class="btn-link ok" style="width:auto;" onclick="Drafts.assigningDow = Drafts.assigningDow===${d} ? null : ${d}; refresh();">trocar</button>
      </div>
      ${Drafts.assigningDow === d ? `
        <div class="chips" style="padding:0 0 10px;">
          <button class="chip ${!planId ? 'active' : ''}" onclick="assignDay(${d}, null)">Descanso</button>
          ${state.workoutPlans.map(p => `<button class="chip ${planId===p.id?'active':''}" onclick="assignDay(${d}, '${p.id}')">${esc(p.name)}</button>`).join('')}
        </div>` : ''}
    `;
  }).join('');
  return `<div class="card"><h3>Agenda da semana</h3><div class="tiny">Toque em "trocar" para escolher qual treino acontece em cada dia.</div>${rows}</div>`;
}
function assignDay(dow, planId){
  state.workoutSchedule[dow] = planId;
  Drafts.assigningDow = null;
  saveState(); refresh();
}
function renderTreinoNovoChoice(){
  const hasActive = state.workoutPlans.length > 0;
  return `
    ${hasActive ? `<div class="card"><div class="muted">Ao confirmar o novo treino, o programa atual (${state.workoutPlans.length} treino${state.workoutPlans.length>1?'s':''}) vai para o histórico automaticamente.</div></div>` : ''}
    <div class="card" style="align-items:stretch;">
      <h3>Como você quer montar?</h3>
      <button class="btn btn-primary" onclick="treinoGo('plan','novo')">🧩 Montar manualmente</button>
      <div class="tiny">Você escolhe cada exercício, grupo muscular por grupo muscular.</div>
      <button class="btn btn-secondary" style="margin-top:8px;" onclick="treinoGo('gerador')">✨ Gerar automaticamente</button>
      <div class="tiny">Você escolhe objetivo e nível, o sistema sugere o treino.</div>
    </div>
  `;
}
function toggleFocus(key){
  const focus = Drafts.generator.focus;
  const idx = focus.indexOf(key);
  if(idx >= 0){ focus.splice(idx, 1); }
  else{
    if(focus.length >= FOCUS_MAX){ toast(`Você pode selecionar até ${FOCUS_MAX} grupos de foco`); return; }
    focus.push(key);
  }
  refresh();
}
function genAdjustTier(delta){
  const g = Drafts.generator;
  g.tierIndex = clamp((g.tierIndex ?? 1) + delta, 0, INTENSITY_TIERS.length - 1);
  refresh();
}
function genAdjustExCount(delta){
  const g = Drafts.generator;
  g.exOffset = clamp((g.exOffset ?? 0) + delta, -2, 2);
  refresh();
}
function renderTreinoGerador(){
  const g = Drafts.generator;
  const sex = state.profile.sex;
  g.tierIndex = clamp(g.tierIndex ?? 1, 0, INTENSITY_TIERS.length - 1);
  g.exOffset = clamp(g.exOffset ?? 0, -2, 2);
  const variation = generateVariation(g.goal, g.level, g.tierIndex, g.nonce, g.focus, sex, g.duration, g.splitType, g.exOffset);
  const tier = INTENSITY_TIERS[g.tierIndex];
  const goalChips = Object.keys(GOAL_LABELS).map(k => `<button class="chip ${g.goal===k?'active':''}" onclick="Drafts.generator.goal='${k}'; refresh();">${GOAL_LABELS[k]}</button>`).join('');
  const levelChips = LEVELS.map(k => `<button class="chip ${g.level===k?'active':''}" onclick="Drafts.generator.level='${k}'; refresh();">${LEVEL_LABELS[k]}</button>`).join('');
  const splitTypeChips = SPLIT_TYPE_OPTIONS.map(k => `<button class="chip ${g.splitType===k?'active':''}" onclick="Drafts.generator.splitType='${k}'; refresh();">${SPLIT_TYPE_LABELS[k]}</button>`).join('');
  const focusChips = [`<button class="chip ${g.focus.length===0?'active':''}" onclick="Drafts.generator.focus=[]; refresh();">Equilibrado</button>`]
    .concat(FOCUS_OPTIONS.map(k => `<button class="chip ${g.focus.includes(k)?'active':''}" onclick="toggleFocus('${k}')">${FOCUS_LABELS[k]}</button>`))
    .join('');
  const durationChips = TIME_OPTIONS.map(d => `<button class="chip ${g.duration===d?'active':''}" onclick="Drafts.generator.duration=${d}; refresh();">${TIME_LABELS[d]}</button>`).join('');
  const focusArgs = `[${g.focus.map(f => `'${f}'`).join(',')}]`;
  const atMinTier = g.tierIndex === 0, atMaxTier = g.tierIndex === INTENSITY_TIERS.length - 1;
  const atMinEx = g.exOffset <= -2, atMaxEx = g.exOffset >= 2;

  return `
    <div class="card">
      <div class="muted">Escolha objetivo, nível, estrutura, foco e duração — depois use as setas para navegar entre os graus de intensidade (do aquecimento ao insano) e ajuste o número de exercícios à vontade. Reps já ajustadas ao seu perfil.</div>
      <h3 style="margin-top:2px;">Objetivo</h3>
      <div class="chips">${goalChips}</div>
      <h3 style="margin-top:6px;">Nível</h3>
      <div class="chips">${levelChips}</div>
      <div class="tiny">${LEVEL_NOTES[g.level]}</div>
      <div class="tiny" style="margin-top:4px;"><strong>Periodização sugerida:</strong> ${ROTATION_TEXT[g.level]}</div>
      <h3 style="margin-top:6px;">Estrutura do treino</h3>
      <div class="chips">${splitTypeChips}</div>
      <div class="tiny">${SPLIT_TYPE_NOTES[g.splitType]}</div>
      <h3 style="margin-top:6px;">Foco muscular <span class="tiny">(escolha até ${FOCUS_MAX} ou Equilibrado)</span></h3>
      <div class="chips">${focusChips}</div>
      <div class="tiny">${focusNote(g.focus)}</div>
      <h3 style="margin-top:6px;">Duração do treino</h3>
      <div class="chips">${durationChips}</div>
      <div class="tiny">${TIME_NOTES[g.duration]}</div>
    </div>
    <div class="card">
      <div class="between">
        <button class="icon-btn" ${atMinTier ? 'disabled' : ''} onclick="genAdjustTier(-1)" title="Opção mais leve">◀</button>
        <div style="text-align:center;">
          <div style="font-weight:800;font-size:16px;">${tier.emoji} ${tier.name}</div>
          <div class="tiny">Opção ${g.tierIndex + 1} de ${INTENSITY_TIERS.length} · ${tier.tag}</div>
        </div>
        <button class="icon-btn" ${atMaxTier ? 'disabled' : ''} onclick="genAdjustTier(1)" title="Opção mais desafiadora">▶</button>
      </div>
      <div class="row" style="margin-top:8px;">
        <button class="btn btn-ghost" style="flex:1;" ${atMinEx ? 'disabled' : ''} onclick="genAdjustExCount(-1)">➖ Menos exercícios</button>
        <button class="btn btn-ghost" style="flex:1;" ${atMaxEx ? 'disabled' : ''} onclick="genAdjustExCount(1)">➕ Mais exercícios</button>
      </div>
      <button class="btn-link" style="width:auto;margin-top:6px;" onclick="Drafts.generator.nonce++; refresh();">🔀 Sortear outros exercícios</button>
    </div>
    <div class="card tpl-set">
      <div class="between"><h3>${variation.label}</h3><span class="eq-tag-inline">${variation.days.length}x / semana</span></div>
      <details style="margin-top:2px;">
        <summary class="tiny" style="cursor:pointer;color:var(--accent);font-weight:600;">ℹ️ Como esse treino funciona</summary>
        ${variationDescription(variation)}
      </details>
      ${variation.days.map((day, dayIdx) => `
        <div class="tpl-day">
          <div class="between">
            <div>
              <div style="font-weight:700;">${esc(day.name)}</div>
              <div class="mtag-row" style="margin-top:3px;">${day.groups.map(muscleTag).join('')}<span class="eq-tag-inline">${day.sets}x${day.reps}</span></div>
            </div>
            <span class="eq-tag-inline" style="color:${day.intensity==='Alta'?'var(--danger)':'var(--teal)'};">${day.intensity}</span>
          </div>
          <div class="wrap" style="margin-top:6px;">
            ${day.exercises.map(e => `<span class="ex-mini" title="${esc(e.name)}">${exerciseIconSvg(e.muscleGroup, e.exerciseKey)}</span>`).join('')}
          </div>
          <div class="tiny" style="margin-top:4px;">${day.exercises.map(e => esc(e.name)).join(', ')}</div>
          <button class="btn-link ok" style="width:auto;margin-top:4px;" onclick="useGeneratedDay('${g.goal}','${g.level}',${g.tierIndex},${g.nonce},${focusArgs},'${sex}',${g.duration},'${g.splitType}',${dayIdx},${g.exOffset})">Usar este dia</button>
        </div>
      `).join('')}
      <button class="btn btn-primary" onclick="useGeneratedVariation('${g.goal}','${g.level}',${g.tierIndex},${g.nonce},${focusArgs},'${sex}',${g.duration},'${g.splitType}',${g.exOffset})">Usar os ${variation.days.length} treinos da ${variation.label}</button>
    </div>
  `;
}
function fmtShort(ds){ const [y,m,d] = ds.split('-'); return `${d}/${m}`; }
function archiveActivePlans(){
  if(state.workoutPlans.length === 0) return;
  const archivedPlans = state.workoutPlans.map(p => {
    const logs = state.workoutLogs.filter(l => l.planId === p.id);
    const dates = logs.map(l => l.date).sort();
    return {
      id:p.id, name:p.name, exerciseCount:p.exercises.length,
      timesExecuted:logs.length, firstDate:dates[0] || null, lastDate:dates[dates.length - 1] || null,
    };
  });
  state.planHistory.unshift({ id:uid(), archivedAt:todayStr(), plans:archivedPlans });
  state.workoutPlans = [];
  state.activeExecution = null;
}
function deleteWorkoutPlan(id){
  if(!confirm('Excluir este plano de treino?')) return;
  if(state.activeExecution && state.activeExecution.planId === id) state.activeExecution = null;
  state.workoutPlans = state.workoutPlans.filter(p => p.id !== id);
  Object.keys(state.workoutSchedule).forEach(k => { if(state.workoutSchedule[k] === id) state.workoutSchedule[k] = null; });
  saveState(); refresh(); toast('Plano excluído');
}
function buildPlanDraft(id){
  const blankNewEx = { muscleGroup:'Peito', exerciseKey:null, customName:'', sets:'3', reps:'10', load:'' };
  if(id === 'novo') return { id:'novo', name:'', exercises:[], newEx:{ ...blankNewEx } };
  const p = state.workoutPlans.find(pl => pl.id === id);
  return { id:p.id, name:p.name, exercises:JSON.parse(JSON.stringify(p.exercises)), newEx:{ ...blankNewEx } };
}
function renderTreinoPlanForm(){
  const d = Drafts.treinoPlan;
  const exRows = d.exercises.length === 0
    ? `<div class="empty">Nenhum exercício adicionado ainda.</div>`
    : d.exercises.map(ex => `
      <div class="list-row">
        <div class="ex-mini">${exerciseIconSvg(ex.muscleGroup, ex.exerciseKey)}</div>
        <div style="flex:1;">
          <div style="font-weight:700;">${esc(ex.name)}</div>
          <div class="tiny">${esc(ex.muscleGroup)} · ${ex.targetSets}x${ex.targetReps}${ex.targetLoadKg ? ' · '+ex.targetLoadKg+'kg' : ''}</div>
        </div>
        <button class="icon-btn danger" title="Remover" onclick="removeExerciseFromDraft('${ex.id}')">${ICON.trash}</button>
      </div>`).join('');
  const chipRow = MUSCLE_GROUPS.map(g => `<button class="chip ${d.newEx.muscleGroup===g?'active':''}" onclick="setNewExGroup('${g}')">${g}</button>`).join('');
  const catalog = EXERCISE_CATALOG[d.newEx.muscleGroup] || [];
  const catalogGrid = catalog.map(c => `
    <div class="ex-card ${d.newEx.exerciseKey===c.key?'active':''}" onclick="pickCatalogExercise('${c.key}')">
      ${exerciseIconSvg(d.newEx.muscleGroup, c.key)}
      <div class="ex-name">${esc(c.name)}</div>
      <div class="eq-tag">${EQUIPMENT_LABELS[c.equipment]}</div>
    </div>`).join('');

  return `
    <div class="card"><div class="field"><label>Nome do plano</label>
      <input value="${esc(d.name)}" oninput="Drafts.treinoPlan.name=this.value" placeholder="Ex: Treino A - Peito/Tríceps"/></div></div>

    <div class="card"><h3>Exercícios</h3>${exRows}</div>

    <div class="card">
      <h3>Adicionar exercício</h3>
      <div class="tiny uppercase" style="font-weight:700;">Grupo muscular alvo</div>
      <div class="chips">${chipRow}</div>
      <div class="tiny uppercase" style="font-weight:700;margin-top:2px;">Escolha na academia</div>
      <div class="ex-grid">${catalogGrid}</div>
      <div class="field"><label>Ou digite um exercício personalizado</label>
        <input value="${esc(d.newEx.customName)}" oninput="Drafts.treinoPlan.newEx.customName=this.value" placeholder="opcional"/></div>
      <div class="row">
        <div class="field"><label>Séries</label><input inputmode="numeric" value="${esc(d.newEx.sets)}" oninput="Drafts.treinoPlan.newEx.sets=this.value"/></div>
        <div class="field"><label>Reps</label><input inputmode="numeric" value="${esc(d.newEx.reps)}" oninput="Drafts.treinoPlan.newEx.reps=this.value"/></div>
        <div class="field"><label>Carga (kg)</label><input inputmode="decimal" value="${esc(d.newEx.load)}" oninput="Drafts.treinoPlan.newEx.load=this.value" placeholder="opcional"/></div>
      </div>
      <button class="btn btn-secondary" onclick="addExerciseToDraft()">+ Adicionar exercício</button>
    </div>

    <button class="btn btn-primary" onclick="saveTreinoPlan()">Salvar plano</button>
    ${d.id !== 'novo' ? `<button class="btn-link" onclick="deleteWorkoutPlan('${d.id}'); treinoGo('list');">Excluir plano</button>` : ''}
  `;
}
function setNewExGroup(g){ Drafts.treinoPlan.newEx.muscleGroup = g; Drafts.treinoPlan.newEx.exerciseKey = null; refresh(); }
function pickCatalogExercise(key){ Drafts.treinoPlan.newEx.exerciseKey = key; Drafts.treinoPlan.newEx.customName = ''; refresh(); }
function addExerciseToDraft(){
  const ne = Drafts.treinoPlan.newEx;
  const catalogEx = ne.exerciseKey ? ALL_EXERCISES_BY_KEY[ne.exerciseKey] : null;
  const name = ne.customName.trim() || (catalogEx ? catalogEx.name : '');
  if(!name){ toast('Escolha um exercício da lista ou digite um nome', 'error'); return; }
  Drafts.treinoPlan.exercises.push({
    id:uid(), name, exerciseKey: ne.customName.trim() ? null : ne.exerciseKey, muscleGroup:ne.muscleGroup,
    targetSets: parseInt(ne.sets)||1, targetReps: parseInt(ne.reps)||1,
    targetLoadKg: ne.load ? toNum(ne.load) : undefined,
  });
  Drafts.treinoPlan.newEx = { muscleGroup:ne.muscleGroup, exerciseKey:null, customName:'', sets:'3', reps:'10', load:'' };
  refresh();
}
function removeExerciseFromDraft(exId){
  Drafts.treinoPlan.exercises = Drafts.treinoPlan.exercises.filter(e => e.id !== exId);
  refresh();
}
function saveTreinoPlan(){
  const d = Drafts.treinoPlan;
  if(!d.name.trim()){ toast('Dê um nome ao plano', 'error'); return; }
  if(d.exercises.length === 0){ toast('Adicione ao menos um exercício', 'error'); return; }
  const isNew = d.id === 'novo';
  const existing = isNew ? null : state.workoutPlans.find(p => p.id === d.id);
  const plan = { id: isNew ? uid() : d.id, name:d.name.trim(), exercises:d.exercises,
    createdAt: isNew ? todayStr() : (existing ? existing.createdAt : todayStr()),
    level: existing ? existing.level : undefined };
  if(isNew) archiveActivePlans();
  const idx = state.workoutPlans.findIndex(p => p.id === plan.id);
  if(idx >= 0) state.workoutPlans[idx] = plan; else state.workoutPlans.push(plan);
  if(isNew) state.workoutSchedule = autoScheduleFromPlans(state.workoutPlans.map(p => p.id));
  saveState();
  toast(isNew ? 'Novo treino salvo — o anterior foi para o histórico' : 'Plano salvo');
  treinoGo('list');
}
function exerciseLogMatches(ex){
  const matchEntry = log => log.entries.find(e =>
    e.exerciseId === ex.id ||
    (ex.exerciseKey && e.exerciseKey === ex.exerciseKey) ||
    e.exerciseName.trim().toLowerCase() === ex.name.trim().toLowerCase()
  );
  return state.workoutLogs
    .map(log => ({ date: log.date, entry: matchEntry(log) }))
    .filter(m => m.entry && m.entry.sets.length)
    .sort((a, b) => a.date < b.date ? -1 : 1); // mais antigo -> mais recente
}
function findLastExerciseHistory(ex){
  const matches = exerciseLogMatches(ex);
  return matches.length ? matches[matches.length - 1] : null;
}
function exerciseStats(ex){
  const matches = exerciseLogMatches(ex);
  if(matches.length === 0) return null;
  const maxOf = m => Math.max(...m.entry.sets.map(s => s.weightKg || 0));
  const first = matches[0], last = matches[matches.length - 1];
  return { count:matches.length, firstDate:first.date, lastDate:last.date, firstMax:maxOf(first), lastMax:maxOf(last), delta: maxOf(last) - maxOf(first) };
}
function buildExecuteDraft(planId){
  const p = state.workoutPlans.find(pl => pl.id === planId);
  return { planId:p.id, planName:p.name, entries: p.exercises.map(ex => {
    const hist = findLastExerciseHistory(ex);
    return {
      exerciseId:ex.id, exerciseName:ex.name, exerciseKey:ex.exerciseKey, muscleGroup:ex.muscleGroup,
      targetSets:ex.targetSets, targetReps:ex.targetReps, forceExpanded:false, lastHistory:hist, stats:exerciseStats(ex),
      sets: Array.from({length:ex.targetSets}, (_, i) => {
        const lastWeight = hist && hist.entry.sets[i] ? hist.entry.sets[i].weightKg : null;
        const weight = lastWeight != null ? lastWeight : ex.targetLoadKg;
        return { reps:String(ex.targetReps), weightKg: weight != null ? String(weight) : '', done:false };
      }),
    };
  }) };
}
function formatTimer(s){ return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`; }
let audioCtx = null;
function warmUpAudio(){
  try{
    if(!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if(audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
  }catch(e){}
}
function playBeep(){
  if(!audioCtx) return;
  try{
    for(let i = 0; i < 3; i++){
      const t0 = audioCtx.currentTime + i * 0.3;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.35, t0 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.22);
      osc.connect(gain); gain.connect(audioCtx.destination);
      osc.start(t0); osc.stop(t0 + 0.25);
    }
  }catch(e){}
}
function tickRestTimer(){
  const t = Drafts.restTimer;
  if(t.remaining <= 0){
    clearInterval(t.intervalId); t.running = false; t.intervalId = null;
    const el = document.getElementById('rest-timer-display'); if(el) el.textContent = '0:00';
    setRingProgress('rest-timer-ring', 0);
    playBeep();
    toast('Descanso terminado — bora pra próxima! 💪');
    return;
  }
  t.remaining -= 1;
  const el = document.getElementById('rest-timer-display');
  if(el){ el.textContent = formatTimer(t.remaining); setRingProgress('rest-timer-ring', t.remaining / t.duration); }
  else clearInterval(t.intervalId);
}
function startRestTimer(seconds){
  warmUpAudio();
  const t = Drafts.restTimer;
  clearInterval(t.intervalId);
  t.duration = seconds; t.remaining = seconds; t.running = true;
  t.intervalId = setInterval(tickRestTimer, 1000);
  refresh();
}
function pauseRestTimer(){ const t = Drafts.restTimer; clearInterval(t.intervalId); t.intervalId = null; t.running = false; refresh(); }
function resumeRestTimer(){ warmUpAudio(); const t = Drafts.restTimer; if(t.remaining <= 0) return; clearInterval(t.intervalId); t.running = true; t.intervalId = setInterval(tickRestTimer, 1000); refresh(); }
function resetRestTimer(){ const t = Drafts.restTimer; clearInterval(t.intervalId); t.intervalId = null; t.running = false; t.remaining = t.duration; refresh(); }
function renderRestTimerWidget(){
  const t = Drafts.restTimer;
  const mainLabel = t.running ? 'Pausar' : (t.remaining > 0 && t.remaining < t.duration ? 'Continuar' : 'Iniciar');
  const mainAction = t.running ? 'pauseRestTimer()' : (t.remaining > 0 && t.remaining < t.duration ? 'resumeRestTimer()' : `startRestTimer(${t.duration})`);
  return `
    <div class="card">
      <div class="between">
        <h3>Descanso</h3>
        <div class="ring-wrap">
          ${progressRingSvg('rest-timer-ring', t.remaining / t.duration, 'var(--teal)', 64, 6)}
          <div class="ring-center"><div id="rest-timer-display" class="num" style="font-size:15px;">${formatTimer(t.remaining)}</div></div>
        </div>
      </div>
      <div class="chips">
        ${[30,60,90,120,180].map(s => `<button class="chip ${t.duration===s?'active':''}" onclick="startRestTimer(${s})">${s}s</button>`).join('')}
      </div>
      <div class="row">
        <button class="btn btn-primary" onclick="${mainAction}">${mainLabel}</button>
        <button class="btn btn-ghost" onclick="resetRestTimer()">Reiniciar</button>
      </div>
    </div>
  `;
}
function renderTreinoExecute(){
  const d = Drafts.execute;
  const totalSets = d.entries.reduce((s,e) => s + e.sets.length, 0);
  const doneSets = d.entries.reduce((s,e) => s + e.sets.filter(x=>x.done).length, 0);
  const uniqueGroups = Array.from(new Set(d.entries.map(e => e.muscleGroup)));
  const pct = totalSets > 0 ? doneSets / totalSets : 0;

  const blocks = d.entries.map((ex, exIdx) => {
    const allDone = ex.sets.length > 0 && ex.sets.every(s => s.done);
    const collapsed = allDone && !ex.forceExpanded;
    const firstPendingIdx = ex.sets.findIndex(s => !s.done);
    if(collapsed){
      return `
        <div class="card" style="flex-direction:row;align-items:center;gap:10px;opacity:.7;">
          <div class="check-btn done" style="cursor:default;">${ICON.check}</div>
          <div class="ex-mini">${exerciseIconSvg(ex.muscleGroup, ex.exerciseKey)}</div>
          <div style="flex:1;font-weight:700;text-decoration:line-through;color:var(--ink-soft);">${esc(ex.exerciseName)}</div>
          <button class="btn-link ok" style="width:auto;" onclick="Drafts.execute.entries[${exIdx}].forceExpanded=true; refresh();">ver</button>
        </div>`;
    }
    return `
      <div class="card">
        <div class="between">
          <div class="ex-badge">${exIdx+1}</div>
          <div class="ex-mini">${exerciseIconSvg(ex.muscleGroup, ex.exerciseKey)}</div>
          <div style="flex:1;">
            <h4>${esc(ex.exerciseName)}</h4>
            <div class="tiny">${esc(ex.muscleGroup)} · meta ${ex.targetSets}x${ex.targetReps}</div>
          </div>
          ${allDone ? `<button class="btn-link ok" style="width:auto;" onclick="collapseExercise(${exIdx})">recolher</button>` : ''}
        </div>
        <details style="margin-top:2px;">
          <summary class="tiny" style="cursor:pointer;color:var(--accent);font-weight:600;">🖼️ Ver guia de execução</summary>
          <div class="ex-guide-lg">
            ${exerciseIconSvg(ex.muscleGroup, ex.exerciseKey)}
            <div class="tiny">Foco: ${esc(MUSCLE_REGION_LABEL[muscleBodyRegion(ex.muscleGroup, ex.exerciseKey)] || ex.muscleGroup)}</div>
          </div>
        </details>
        <div class="tiny">${esc(exerciseDesc(ex.exerciseKey))}</div>
        ${ex.lastHistory ? `<div class="tiny" style="color:var(--teal);">Última vez (${fmtDatePt(ex.lastHistory.date)}): ${ex.lastHistory.entry.sets.map(s => `${s.reps}x${s.weightKg}kg`).join(', ')}</div>` : ''}
        ${ex.stats ? `<div class="tiny">Feito ${ex.stats.count}x no total · ${ex.stats.delta > 0 ? `evoluiu +${fmtKg(ex.stats.delta)}kg` : (ex.stats.delta < 0 ? `variou ${fmtKg(ex.stats.delta)}kg` : 'carga estável')} desde ${fmtDatePt(ex.stats.firstDate)}</div>` : ''}
        ${ex.sets.map((s, setIdx) => `
          <div class="set-row ${s.done ? 'is-done' : ''} ${!s.done && setIdx === firstPendingIdx ? 'is-current' : ''}">
            <div class="ex-badge" style="width:20px;height:20px;font-size:10px;background:transparent;">${setIdx+1}</div>
            <input inputmode="numeric" value="${esc(s.reps)}" oninput="updateSet(${exIdx},${setIdx},'reps',this.value)" placeholder="reps" style="flex:1;" ${s.done?'disabled':''}/>
            <span class="tiny">x</span>
            <input inputmode="decimal" value="${esc(s.weightKg)}" oninput="updateSet(${exIdx},${setIdx},'weightKg',this.value)" placeholder="kg" style="flex:1;" ${s.done?'disabled':''}/>
            <button class="check-btn ${s.done?'done':''}" title="Marcar série como executada" onclick="toggleSetDone(${exIdx},${setIdx})">${ICON.check}</button>
          </div>`).join('')}
        <button class="btn btn-ghost" onclick="addSetToExec(${exIdx})">+ Série extra</button>
      </div>
    `;
  }).join('');

  return `
    <div class="card">
      <div class="between">
        <h3>${esc(d.planName)}</h3>
        <span class="num" style="color:var(--accent);">${doneSets}/${totalSets}</span>
      </div>
      <div class="track"><div class="fill" style="width:${pct*100}%;background:var(--accent);"></div></div>
      <div class="mtag-row">${uniqueGroups.map(muscleTag).join('')}</div>
    </div>
    ${renderRestTimerWidget()}
    ${blocks}
    <div class="sticky-footer">
      <button class="btn btn-primary" onclick="finishWorkout()">Concluir treino${doneSets>0?` (${doneSets}/${totalSets})`:''}</button>
    </div>`;
}
function updateSet(exIdx, setIdx, field, val){ Drafts.execute.entries[exIdx].sets[setIdx][field] = val; }
function toggleSetDone(exIdx, setIdx){
  const entry = Drafts.execute.entries[exIdx];
  entry.sets[setIdx].done = !entry.sets[setIdx].done;
  entry.forceExpanded = false;
  saveState(); refresh();
}
function collapseExercise(exIdx){ Drafts.execute.entries[exIdx].forceExpanded = false; refresh(); }
function addSetToExec(exIdx){ Drafts.execute.entries[exIdx].sets.push({ reps:'', weightKg:'', done:false }); saveState(); refresh(); }
function finishWorkout(){
  const d = Drafts.execute;
  const entries = d.entries.map(ex => ({
    exerciseId:ex.exerciseId, exerciseName:ex.exerciseName, exerciseKey:ex.exerciseKey, muscleGroup:ex.muscleGroup,
    sets: ex.sets.filter(s => s.done).map(s => ({ reps: parseInt(s.reps)||0, weightKg: toNum(s.weightKg) })),
  }));
  if(!entries.some(e => e.sets.length > 0)){ toast('Marque ao menos uma série como concluída', 'error'); return; }
  state.workoutLogs.push({ id:uid(), planId:d.planId, planName:d.planName, date:todayStr(), entries });
  state.activeExecution = null;
  clearInterval(Drafts.restTimer.intervalId); Drafts.restTimer = { running:false, duration:90, remaining:90, intervalId:null };
  saveState(); toast('Treino registrado!'); treinoGo('today');
}
function totalVolume(log){ return log.entries.reduce((s,e) => s + e.sets.reduce((s2,st) => s2 + st.reps*st.weightKg, 0), 0); }
function renderTreinoHistory(){
  const programsBlock = state.planHistory.length === 0 ? '' : `
    <div class="card"><h3>Programas anteriores</h3>
      ${state.planHistory.map(h => `
        <div class="list-row" style="display:block;">
          <div class="tiny uppercase" style="font-weight:700;">Substituído em ${fmtDatePt(h.archivedAt)}</div>
          ${h.plans.map(p => `
            <div class="between" style="padding:3px 0;">
              <span>${esc(p.name)}</span>
              <span class="tiny">${p.timesExecuted > 0
                ? `executado ${p.timesExecuted}x${p.firstDate && p.lastDate && p.firstDate !== p.lastDate ? ` (${fmtShort(p.firstDate)}–${fmtShort(p.lastDate)})` : ''}`
                : 'nunca executado'}</span>
            </div>`).join('')}
        </div>
      `).join('')}
    </div>`;

  const logs = [...state.workoutLogs].sort((a,b) => a.date < b.date ? 1 : -1);
  const logsBlock = logs.length === 0
    ? `<div class="card"><div class="empty">Nenhuma execução de treino registrada ainda.</div></div>`
    : logs.map(log => `
      <div class="card">
        <div class="between"><h4>${esc(log.planName)}</h4><span class="muted">${fmtDatePt(log.date)}</span></div>
        <div class="muted">Volume total: <span class="num">${round(totalVolume(log))} kg</span></div>
        ${log.entries.map(e => `<div class="tiny" style="display:flex;align-items:center;gap:6px;"><span class="ex-mini" style="width:16px;height:16px;">${exerciseIconSvg(e.muscleGroup, e.exerciseKey)}</span>${esc(e.exerciseName)}: ${e.sets.map(s => `${s.reps}x${s.weightKg}kg`).join(', ')}</div>`).join('')}
        <button class="btn-link" onclick="removeWorkoutLog('${log.id}')">Excluir registro</button>
      </div>`).join('');

  return programsBlock + logsBlock;
}
function removeWorkoutLog(id){
  if(!confirm('Excluir este registro de treino?')) return;
  state.workoutLogs = state.workoutLogs.filter(l => l.id !== id);
  saveState(); refresh();
}

/* ---------- DIETA ---------- */
function renderDietaOverview(){
  const today = todayStr();
  const logs = state.dietLogs.filter(l => l.date === today);
  const totals = logs.reduce((a,l) => ({ kcal:a.kcal+l.kcal, protein:a.protein+l.proteinG, carbs:a.carbs+l.carbsG, fat:a.fat+l.fatG }), { kcal:0, protein:0, carbs:0, fat:0 });
  const plan = state.dietPlan;
  const row = (label, val, target, color) => `
    <div class="between"><span class="muted">${label}</span><span class="num">${round(val)} / ${target}${label==='Calorias'?' kcal':'g'}</span></div>
    <div class="track"><div class="fill" style="width:${pct(val,target)}%;background:${color};"></div></div>`;

  return `
    <div class="card">
      <h3>Hoje</h3>
      ${row('Calorias', totals.kcal, plan.targetKcal, 'var(--accent)')}
      ${row('Proteína', totals.protein, plan.targetProteinG, 'var(--danger)')}
      ${row('Carboidrato', totals.carbs, plan.targetCarbsG, 'var(--amber)')}
      ${row('Gordura', totals.fat, plan.targetFatG, 'var(--violet)')}
      <button class="btn btn-primary" onclick="dietaGo('register')">Registrar alimentação</button>
    </div>

    <div class="card">
      <h3>Plano alimentar</h3>
      ${plan.meals.length === 0 ? `<div class="empty">Você ainda não montou seu plano de refeições.</div>` :
        plan.meals.map(m => `<div class="list-row" style="display:block;">
            <div style="font-weight:700;">${esc(m.name)}</div>
            <div class="tiny">${m.items.length ? m.items.map(it => `${esc(it.foodName)} (${it.grams}g)`).join(', ') : 'Sem alimentos'}</div>
          </div>`).join('')}
      <button class="btn btn-ghost" onclick="dietaGo('plan')">Editar plano alimentar</button>
      <button class="btn btn-ghost" onclick="dietaGo('foods')">Gerenciar alimentos</button>
    </div>

    <div class="card">
      <h3>Registrado hoje</h3>
      ${logs.length === 0 ? `<div class="empty">Nenhum alimento registrado hoje.</div>` :
        logs.map(l => `<div class="list-row"><span>${esc(l.foodName)} · ${l.grams}g</span><button class="btn-link" onclick="removeDietLog('${l.id}')">remover</button></div>`).join('')}
    </div>
  `;
}
function removeDietLog(id){ state.dietLogs = state.dietLogs.filter(l => l.id !== id); saveState(); refresh(); }

function renderDietaPlanForm(){
  const d = Drafts.dietPlanForm, ui = Drafts.dietaPlanUI;
  const mealsHtml = d.meals.map(meal => `
    <div class="list-row" style="display:block;">
      <div class="between"><div style="font-weight:700;">${esc(meal.name)}</div><button class="btn-link" onclick="removeMealDraft('${meal.id}')">Remover refeição</button></div>
      ${meal.items.map((it,idx) => `<div class="between" style="padding:2px 0;"><span class="muted">${esc(it.foodName)} · ${it.grams}g</span><span class="btn-link ok" style="cursor:pointer;" onclick="removeMealItemDraft('${meal.id}',${idx})">remover</span></div>`).join('')}
      ${ui.pickingMealId === meal.id ? `
        <div class="stack" style="margin-top:6px;">
          <div class="chips" style="max-height:140px;overflow-y:auto;">${state.foods.map(f => `<button class="chip ${ui.pickFoodId===f.id?'active':''}" onclick="pickFoodForMeal('${f.id}')">${esc(f.name)}</button>`).join('')}</div>
          ${state.foods.length===0 ? '<div class="tiny">Cadastre alimentos em "Gerenciar alimentos" primeiro.</div>' : ''}
          <div class="field"><label>Quantidade (g)</label><input inputmode="numeric" value="${esc(ui.pickGrams)}" oninput="Drafts.dietaPlanUI.pickGrams=this.value"/></div>
          <div class="row"><button class="btn btn-primary" onclick="confirmAddFoodToMeal('${meal.id}')">Confirmar</button><button class="btn btn-ghost" onclick="Drafts.dietaPlanUI.pickingMealId=null; refresh();">Cancelar</button></div>
        </div>` : `<button class="btn btn-ghost" style="margin-top:6px;" onclick="Drafts.dietaPlanUI.pickingMealId='${meal.id}'; Drafts.dietaPlanUI.pickFoodId=null; refresh();">+ Adicionar alimento</button>`}
    </div>
  `).join('');

  return `
    <div class="card">
      <h3>Metas diárias</h3>
      <div class="row">
        <div class="field"><label>Calorias (kcal)</label><input inputmode="numeric" value="${d.targetKcal}" oninput="Drafts.dietPlanForm.targetKcal=parseInt(this.value)||0"/></div>
        <div class="field"><label>Proteína (g)</label><input inputmode="numeric" value="${d.targetProteinG}" oninput="Drafts.dietPlanForm.targetProteinG=parseInt(this.value)||0"/></div>
      </div>
      <div class="row">
        <div class="field"><label>Carboidrato (g)</label><input inputmode="numeric" value="${d.targetCarbsG}" oninput="Drafts.dietPlanForm.targetCarbsG=parseInt(this.value)||0"/></div>
        <div class="field"><label>Gordura (g)</label><input inputmode="numeric" value="${d.targetFatG}" oninput="Drafts.dietPlanForm.targetFatG=parseInt(this.value)||0"/></div>
      </div>
      <button class="btn btn-ghost" onclick="useCalculatedTarget()">Usar meta calculada do meu perfil</button>
    </div>

    <div class="card">
      <h3>Refeições</h3>
      ${mealsHtml}
      <div class="field"><label>Nova refeição</label><input value="${esc(ui.newMealName)}" oninput="Drafts.dietaPlanUI.newMealName=this.value" placeholder="Ex: Café da manhã"/></div>
      <button class="btn btn-ghost" onclick="addMealDraft()">+ Adicionar refeição</button>
    </div>

    <button class="btn btn-primary" onclick="saveDietPlan()">Salvar plano alimentar</button>
  `;
}
function useCalculatedTarget(){
  const e = calcEnergy(state.profile);
  Drafts.dietPlanForm.targetKcal = e.targetKcal; Drafts.dietPlanForm.targetProteinG = e.targetProteinG;
  Drafts.dietPlanForm.targetCarbsG = e.targetCarbsG; Drafts.dietPlanForm.targetFatG = e.targetFatG;
  refresh(); toast('Meta calculada aplicada');
}
function addMealDraft(){
  const name = Drafts.dietaPlanUI.newMealName.trim();
  if(!name) return;
  Drafts.dietPlanForm.meals.push({ id:uid(), name, items:[] });
  Drafts.dietaPlanUI.newMealName = '';
  refresh();
}
function removeMealDraft(mealId){ Drafts.dietPlanForm.meals = Drafts.dietPlanForm.meals.filter(m => m.id !== mealId); refresh(); }
function removeMealItemDraft(mealId, idx){
  const meal = Drafts.dietPlanForm.meals.find(m => m.id === mealId);
  meal.items.splice(idx,1); refresh();
}
function pickFoodForMeal(foodId){ Drafts.dietaPlanUI.pickFoodId = foodId; refresh(); }
function confirmAddFoodToMeal(mealId){
  const ui = Drafts.dietaPlanUI;
  const food = state.foods.find(f => f.id === ui.pickFoodId);
  const grams = toNum(ui.pickGrams, 0);
  if(!food || !grams){ toast('Escolha um alimento e a quantidade', 'error'); return; }
  const meal = Drafts.dietPlanForm.meals.find(m => m.id === mealId);
  meal.items.push({ foodId:food.id, foodName:food.name, grams });
  ui.pickingMealId = null; ui.pickFoodId = null; ui.pickGrams = '100';
  refresh();
}
function saveDietPlan(){
  state.dietPlan = JSON.parse(JSON.stringify(Drafts.dietPlanForm));
  saveState(); toast('Plano alimentar salvo');
}

function renderDietaFoods(){
  const f = Drafts.foodForm;
  const rows = state.foods.length === 0 ? `<div class="empty">Nenhum alimento cadastrado ainda.</div>` :
    state.foods.map(food => `
      <div class="list-row">
        <div><div style="font-weight:700;">${esc(food.name)}</div>
          <div class="tiny">${food.kcal100} kcal · P${food.protein100}g · C${food.carbs100}g · G${food.fat100}g (100g)</div></div>
        <button class="icon-btn danger" onclick="removeFood('${food.id}')">${ICON.trash}</button>
      </div>`).join('');
  return `
    <div class="card">
      <h3>Novo alimento (por 100g)</h3>
      <div class="field"><label>Nome</label><input value="${esc(f.name)}" oninput="Drafts.foodForm.name=this.value" placeholder="Ex: Peito de frango"/></div>
      <div class="row">
        <div class="field"><label>Kcal</label><input inputmode="decimal" value="${esc(f.kcal)}" oninput="Drafts.foodForm.kcal=this.value"/></div>
        <div class="field"><label>Proteína (g)</label><input inputmode="decimal" value="${esc(f.protein)}" oninput="Drafts.foodForm.protein=this.value"/></div>
      </div>
      <div class="row">
        <div class="field"><label>Carboidrato (g)</label><input inputmode="decimal" value="${esc(f.carbs)}" oninput="Drafts.foodForm.carbs=this.value"/></div>
        <div class="field"><label>Gordura (g)</label><input inputmode="decimal" value="${esc(f.fat)}" oninput="Drafts.foodForm.fat=this.value"/></div>
      </div>
      <button class="btn btn-secondary" onclick="addFood()">+ Adicionar alimento</button>
    </div>
    <div class="card"><h3>Meus alimentos</h3>${rows}</div>
  `;
}
function addFood(){
  const f = Drafts.foodForm;
  if(!f.name.trim() || !f.kcal){ toast('Informe nome e calorias por 100g', 'error'); return; }
  state.foods.push({ id:uid(), name:f.name.trim(), kcal100:toNum(f.kcal), protein100:toNum(f.protein), carbs100:toNum(f.carbs), fat100:toNum(f.fat) });
  saveState(); Drafts.foodForm = { name:'', kcal:'', protein:'', carbs:'', fat:'' }; refresh();
}
function removeFood(id){
  if(!confirm('Excluir este alimento?')) return;
  state.foods = state.foods.filter(f => f.id !== id); saveState(); refresh();
}

function renderDietaRegister(){
  const today = todayStr();
  const logs = state.dietLogs.filter(l => l.date === today);
  const picker = Drafts.registerPicker;
  const pm = Drafts.photoMeal;
  const photoBlock = `
    <div class="card">
      <h3>📷 Registrar por foto do prato</h3>
      <div class="muted" style="margin-bottom:4px;">Tire uma foto da refeição e a IA identifica os ingredientes, a quantidade e as calorias de cada um — você ajusta e registra, ou salva como um prato do seu cardápio.</div>
      <input type="file" id="meal-photo-input" accept="image/*" capture="environment" style="display:none" onchange="handleMealPhotoSelected(this)"/>
      ${pm.status === 'loading'
        ? `<button class="btn btn-ghost" disabled>Analisando foto…</button>`
        : `<button class="btn btn-secondary" onclick="document.getElementById('meal-photo-input').click()">Tirar ou escolher foto</button>`}
      ${pm.status === 'error' ? `<div class="tiny" style="color:var(--danger);margin-top:6px;">${esc(pm.error)}</div>` : ''}
    </div>`;
  const mealsBlock = state.dietPlan.meals.length === 0 ? '' : `
    <div class="card"><h3>Refeições do plano</h3>
      ${state.dietPlan.meals.map(meal => `
        <div style="margin-bottom:8px;">
          <div style="font-weight:700;">${esc(meal.name)}</div>
          ${meal.items.length === 0 ? '<div class="tiny">Sem alimentos definidos</div>' :
            meal.items.map(it => `<div class="between" style="padding:3px 0;">
                <span class="muted">${esc(it.foodName)} · ${it.grams}g</span>
                <span class="btn-link ok" style="cursor:pointer;" onclick="logMealItem('${esc(meal.name)}','${it.foodId}','${esc(it.foodName)}',${it.grams})">+ registrar</span>
              </div>`).join('')}
        </div>`).join('')}
    </div>`;
  const pickedFoodForAvulso = state.foods.find(f => f.id === picker.foodId);
  const dishesBlock = `
    <div class="card">
      <div class="between"><h3>🍽 Pratos salvos</h3><span class="btn-link ok" style="width:auto;cursor:pointer;" onclick="startNewDish()">+ Criar prato</span></div>
      ${state.dishes.length === 0 ? `<div class="empty">Nenhum prato salvo ainda — tire uma foto ou crie um manualmente.</div>` :
        state.dishes.map(d => {
          const totals = dishTotals(d);
          return `<div class="list-row">
            <div><div style="font-weight:700;">${esc(d.name)}</div>
              <div class="tiny">${d.items.map(i => esc(i.name)).join(', ')}</div>
              <div class="tiny">${round(totals.kcal)} kcal · P${round(totals.proteinG)} C${round(totals.carbsG)} G${round(totals.fatG)}</div></div>
            <div class="row" style="gap:6px;width:auto;">
              <button class="icon-btn" onclick="editDish('${d.id}')">${ICON.edit || '✏️'}</button>
              <button class="icon-btn danger" onclick="deleteDish('${d.id}')">${ICON.trash}</button>
            </div>
          </div>
          <button class="btn btn-secondary" style="margin:4px 0 8px;" onclick="logDishToday('${d.id}')">+ Registrar hoje</button>`;
        }).join('')}
    </div>`;
  return `
    ${photoBlock}
    ${dishesBlock}
    ${mealsBlock}
    <div class="card">
      <h3>Adicionar alimento avulso</h3>
      ${state.foods.length === 0 ? `<div class="empty">Cadastre alimentos na biblioteca para registrá-los aqui.</div>` :
        `<div class="chips" style="max-height:150px;overflow-y:auto;">${state.foods.map(f => `<button class="chip ${picker.foodId===f.id?'active':''}" onclick="Drafts.registerPicker.foodId='${f.id}'; refresh();">${esc(f.name)}</button>`).join('')}</div>`}
      ${qtyFieldsHTML(pickedFoodForAvulso, picker, 'Drafts.registerPicker')}
      <button class="btn btn-primary" onclick="logCustomFood()">Registrar alimento</button>
    </div>
    <div class="card"><h3>Registrado hoje</h3>
      ${logs.length === 0 ? `<div class="empty">Nada registrado ainda hoje.</div>` :
        logs.map(l => `<div class="list-row">
            <div><div>${esc(l.foodName)}${l.grams?` · ${l.grams}g`:''}${l.mealName?` (${esc(l.mealName)})`:''}</div>
              <div class="tiny">${round(l.kcal)} kcal · P${round(l.proteinG)} C${round(l.carbsG)} G${round(l.fatG)}</div></div>
            <button class="icon-btn danger" onclick="removeDietLog('${l.id}')">${ICON.trash}</button>
          </div>`).join('')}
    </div>
  `;
}
function logMealItem(mealName, foodId, foodName, grams){
  const food = state.foods.find(f => f.id === foodId);
  if(!food){ toast('Alimento não encontrado na biblioteca', 'error'); return; }
  const m = macrosForGrams(food, grams);
  state.dietLogs.push({ id:uid(), date:todayStr(), foodId:food.id, foodName, grams, kcal:m.kcal, proteinG:m.proteinG, carbsG:m.carbsG, fatG:m.fatG, mealName });
  saveState(); refresh(); toast(`Registrado: ${foodName}`);
}
function logCustomFood(){
  const picker = Drafts.registerPicker;
  const food = state.foods.find(f => f.id === picker.foodId);
  const grams = food ? resolveQtyGrams(food, picker) : 0;
  if(!food || !grams){ toast('Escolha um alimento e a quantidade', 'error'); return; }
  const m = macrosForGrams(food, grams);
  state.dietLogs.push({ id:uid(), date:todayStr(), foodId:food.id, foodName:food.name, grams:round(grams), kcal:m.kcal, proteinG:m.proteinG, carbsG:m.carbsG, fatG:m.fatG });
  saveState(); Drafts.registerPicker = { foodId:null, mode:'g', grams:'100', unitQty:'1' }; refresh(); toast('Alimento registrado');
}

/* ---------- registro de refeição por foto (Claude com visão, via Edge Function) ---------- */
function resizeImageFile(file, maxDim){
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if(width > maxDim || height > maxDim){
        const scale = maxDim / Math.max(width, height);
        width = Math.round(width * scale); height = Math.round(height * scale);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Não foi possível ler a imagem.')); };
    img.src = url;
  });
}
async function handleMealPhotoSelected(input){
  const file = input.files && input.files[0];
  input.value = '';
  if(!file) return;
  if(!file.type.startsWith('image/')){ toast('Escolha um arquivo de imagem', 'error'); return; }
  if(!AppCloud.isConfigured()){ toast('Esse recurso precisa da nuvem configurada', 'error'); return; }
  Drafts.photoMeal = { status:'loading', error:null };
  refresh();
  try{
    // reduz a imagem antes de enviar: mais rápido no celular e evita estourar o limite da função
    const dataUrl = await resizeImageFile(file, 1024);
    const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
    const result = await AppCloud.analyzeMealPhoto(base64, 'image/jpeg');
    // cada ingrediente identificado vira um item do montador de prato (mesma tela usada pra criar
    // um prato manualmente) — dá pra ajustar a gramatura de cada um, remover ou adicionar mais itens
    // do catálogo antes de registrar ou salvar como prato do cardápio.
    Drafts.dishBuilder = {
      name: result.items.map(i => i.name).join(', '),
      items: result.items.map(it => {
        const grams = Math.max(1, round(it.estimated_grams));
        return {
          id:uid(), name:it.name, grams,
          kcal100: it.kcal / grams * 100, protein100: it.protein_g / grams * 100,
          carbs100: it.carbs_g / grams * 100, fat100: it.fat_g / grams * 100,
          mode:'g', unitQty:null, unitLabel:null, unitGrams:null,
        };
      }),
      pickFoodId:null, qty:{ mode:'g', grams:'100', unitQty:'1' },
      customItem:{ name:'', kcal:'', protein:'', carbs:'', fat:'' },
      editingDishId:null, photoNote:`${result.note} (confiança ${result.confidence})`,
    };
    Drafts.photoMeal = { status:'idle', error:null };
    dietaGo('dishBuilder');
    return;
  }catch(e){
    Drafts.photoMeal = { status:'error', error:(e && e.message) || 'Não foi possível analisar a foto.' };
  }
  refresh();
}

/* ---------- pratos (cardápio de refeições reutilizáveis) ---------- */
function sumMacros(items){
  return items.reduce((acc, it) => {
    const m = macrosForGrams(it, it.grams);
    acc.kcal += m.kcal; acc.proteinG += m.proteinG; acc.carbsG += m.carbsG; acc.fatG += m.fatG;
    return acc;
  }, { kcal:0, proteinG:0, carbsG:0, fatG:0 });
}
function dishTotals(dish){ return sumMacros(dish.items); }
function startNewDish(){
  Drafts.dishBuilder = {
    name:'', items:[], pickFoodId:null, qty:{ mode:'g', grams:'100', unitQty:'1' },
    customItem:{ name:'', kcal:'', protein:'', carbs:'', fat:'' }, editingDishId:null, photoNote:null,
  };
  dietaGo('dishBuilder');
}
function editDish(id){
  const dish = state.dishes.find(d => d.id === id);
  if(!dish) return;
  Drafts.dishBuilder = {
    name:dish.name, items:JSON.parse(JSON.stringify(dish.items)),
    pickFoodId:null, qty:{ mode:'g', grams:'100', unitQty:'1' },
    customItem:{ name:'', kcal:'', protein:'', carbs:'', fat:'' }, editingDishId:dish.id, photoNote:null,
  };
  dietaGo('dishBuilder');
}
function deleteDish(id){
  if(!confirm('Excluir este prato salvo?')) return;
  state.dishes = state.dishes.filter(d => d.id !== id);
  saveState(); refresh(); toast('Prato excluído');
}
function logDishToday(id){
  const dish = state.dishes.find(d => d.id === id);
  if(!dish) return;
  dish.items.forEach(it => {
    const m = macrosForGrams(it, it.grams);
    state.dietLogs.push({ id:uid(), date:todayStr(), foodId:null, foodName:it.name, grams:round(it.grams), kcal:m.kcal, proteinG:m.proteinG, carbsG:m.carbsG, fatG:m.fatG, dishName:dish.name });
  });
  saveState(); refresh(); toast(`"${dish.name}" registrado hoje`);
}
function addCatalogItemToDish(){
  const db = Drafts.dishBuilder;
  const food = state.foods.find(f => f.id === db.pickFoodId);
  if(!food){ toast('Escolha um alimento', 'error'); return; }
  const grams = resolveQtyGrams(food, db.qty);
  if(!grams){ toast('Informe a quantidade', 'error'); return; }
  db.items.push({
    id:uid(), name:food.name, grams:round(grams),
    kcal100:food.kcal100, protein100:food.protein100, carbs100:food.carbs100, fat100:food.fat100,
    mode:db.qty.mode, unitQty: db.qty.mode === 'un' ? toNum(db.qty.unitQty, 0) : null,
    unitLabel: db.qty.mode === 'un' ? food.unitLabel : null, unitGrams: food.unitGrams || null,
  });
  db.pickFoodId = null; db.qty = { mode:'g', grams:'100', unitQty:'1' };
  refresh();
}
function addCustomItemToDish(){
  const db = Drafts.dishBuilder;
  const c = db.customItem;
  const name = (c.name || '').trim();
  const kcal = toNum(c.kcal, 0);
  if(!name || kcal <= 0){ toast('Informe o nome e as calorias do ingrediente', 'error'); return; }
  // ingrediente avulso (fora do catálogo): os valores digitados já são os totais da porção —
  // guarda como se fosse a "taxa por 100g" com grams fixo em 100, assim o mesmo cálculo
  // (macrosForGrams) funciona igual pros outros itens, inclusive se o usuário editar a gramatura depois.
  db.items.push({
    id:uid(), name, grams:100,
    kcal100:kcal, protein100:toNum(c.protein, 0), carbs100:toNum(c.carbs, 0), fat100:toNum(c.fat, 0),
    mode:'g', unitQty:null, unitLabel:null, unitGrams:null,
  });
  db.customItem = { name:'', kcal:'', protein:'', carbs:'', fat:'' };
  refresh();
}
function removeDishBuilderItem(idx){ Drafts.dishBuilder.items.splice(idx, 1); refresh(); }
function updateDishBuilderItemQty(idx, field, val){
  const it = Drafts.dishBuilder.items[idx];
  if(!it) return;
  if(field === 'unitQty'){ it.unitQty = toNum(val, 0); it.grams = it.unitGrams ? round(it.unitQty * it.unitGrams) : it.grams; }
  else { it.grams = toNum(val, 0); }
  refresh();
}
function saveDishBuilderAsDish(){
  const db = Drafts.dishBuilder;
  const name = (db.name || '').trim();
  if(!name){ toast('Dê um nome pro prato', 'error'); return; }
  if(db.items.length === 0){ toast('Adicione pelo menos um ingrediente', 'error'); return; }
  const itemsSnapshot = db.items.map(it => ({ id:it.id, name:it.name, grams:it.grams, kcal100:it.kcal100, protein100:it.protein100, carbs100:it.carbs100, fat100:it.fat100 }));
  if(db.editingDishId){
    const dish = state.dishes.find(d => d.id === db.editingDishId);
    if(dish){ dish.name = name; dish.items = itemsSnapshot; }
  } else {
    state.dishes.push({ id:uid(), name, items:itemsSnapshot, source:db.photoNote ? 'photo' : 'manual', createdAt:todayStr() });
  }
  saveState();
  toast('Prato salvo no cardápio!');
  dietaGo('register');
}
function logDishBuilderToday(){
  const db = Drafts.dishBuilder;
  if(db.items.length === 0){ toast('Adicione pelo menos um ingrediente', 'error'); return; }
  const dishName = (db.name || '').trim() || null;
  db.items.forEach(it => {
    const m = macrosForGrams(it, it.grams);
    state.dietLogs.push({ id:uid(), date:todayStr(), foodId:null, foodName:it.name, grams:round(it.grams), kcal:m.kcal, proteinG:m.proteinG, carbsG:m.carbsG, fatG:m.fatG, dishName });
  });
  saveState();
  toast('Refeição registrada hoje!');
  dietaGo('register');
}
function renderDishBuilder(){
  const db = Drafts.dishBuilder;
  const totals = sumMacros(db.items);
  const pickedFood = state.foods.find(f => f.id === db.pickFoodId);
  return `
    ${db.photoNote ? `<div class="card"><div class="tiny">📷 ${esc(db.photoNote)} — confira e ajuste os ingredientes abaixo antes de registrar.</div></div>` : ''}
    <div class="card">
      <div class="field"><label>Nome do prato</label><input value="${esc(db.name)}" oninput="Drafts.dishBuilder.name=this.value" placeholder="Ex: Marmita de frango com arroz"/></div>
      <div class="stat-grid g4">
        <div class="stat"><b>${round(totals.kcal)}</b><span>kcal</span></div>
        <div class="stat"><b>${round(totals.proteinG)}</b><span>proteína</span></div>
        <div class="stat"><b>${round(totals.carbsG)}</b><span>carbo</span></div>
        <div class="stat"><b>${round(totals.fatG)}</b><span>gordura</span></div>
      </div>
    </div>
    <div class="card">
      <h3>Ingredientes</h3>
      ${db.items.length === 0 ? `<div class="empty">Nenhum ingrediente ainda — adicione abaixo.</div>` :
        db.items.map((it, idx) => {
          const m = macrosForGrams(it, it.grams);
          const qtyField = it.unitLabel
            ? `<input inputmode="decimal" style="width:52px;" value="${it.unitQty}" oninput="updateDishBuilderItemQty(${idx},'unitQty',this.value)"/> ${esc(it.unitLabel)}(s)`
            : `<input inputmode="numeric" style="width:60px;" value="${it.grams}" oninput="updateDishBuilderItemQty(${idx},'grams',this.value)"/> g`;
          return `<div class="list-row">
            <div style="flex:1;">
              <div style="font-weight:700;">${esc(it.name)}</div>
              <div class="tiny between" style="gap:8px;">
                <span>${qtyField}</span>
                <span class="num">${round(m.kcal)} kcal</span>
              </div>
            </div>
            <button class="icon-btn danger" onclick="removeDishBuilderItem(${idx})">${ICON.trash}</button>
          </div>`;
        }).join('')}
    </div>
    <div class="card">
      <h3>Adicionar ingrediente do catálogo</h3>
      <div class="chips" style="max-height:140px;overflow-y:auto;">${state.foods.map(f => `<button class="chip ${db.pickFoodId===f.id?'active':''}" onclick="Drafts.dishBuilder.pickFoodId='${f.id}'; refresh();">${esc(f.name)}</button>`).join('')}</div>
      ${qtyFieldsHTML(pickedFood, db.qty, 'Drafts.dishBuilder.qty')}
      <button class="btn btn-secondary" onclick="addCatalogItemToDish()">+ Adicionar ingrediente</button>
    </div>
    <div class="card">
      <h3>Ingrediente avulso (fora do catálogo)</h3>
      <div class="field"><label>Nome</label><input value="${esc(db.customItem.name)}" oninput="Drafts.dishBuilder.customItem.name=this.value" placeholder="Ex: Molho caseiro"/></div>
      <div class="row">
        <div class="field"><label>Calorias (da porção)</label><input inputmode="numeric" value="${esc(db.customItem.kcal)}" oninput="Drafts.dishBuilder.customItem.kcal=this.value"/></div>
        <div class="field"><label>Proteína (g)</label><input inputmode="decimal" value="${esc(db.customItem.protein)}" oninput="Drafts.dishBuilder.customItem.protein=this.value"/></div>
      </div>
      <div class="row">
        <div class="field"><label>Carboidrato (g)</label><input inputmode="decimal" value="${esc(db.customItem.carbs)}" oninput="Drafts.dishBuilder.customItem.carbs=this.value"/></div>
        <div class="field"><label>Gordura (g)</label><input inputmode="decimal" value="${esc(db.customItem.fat)}" oninput="Drafts.dishBuilder.customItem.fat=this.value"/></div>
      </div>
      <button class="btn btn-ghost" onclick="addCustomItemToDish()">+ Adicionar ingrediente avulso</button>
    </div>
    <div class="row">
      <button class="btn btn-secondary" onclick="saveDishBuilderAsDish()">💾 Salvar no cardápio</button>
      <button class="btn btn-primary" onclick="logDishBuilderToday()">Registrar hoje</button>
    </div>
  `;
}

/* ---------- CARDIO ---------- */
function renderCardio(){
  const cf = Drafts.cardioForm;
  const sessions = state.cardioSessions;
  const logs = [...state.cardioLogs].sort((a,b) => a.date < b.date ? 1 : -1);
  return `
    <div class="card">
      <h3>Planejar sessão de cardio</h3>
      <div class="chips">${CARDIO_TYPES.map(t => `<button class="chip ${cf.type===t?'active':''}" onclick="Drafts.cardioForm.type='${t}'; refresh();">${t}</button>`).join('')}</div>
      <div class="row">
        <div class="field"><label>Duração alvo (min)</label><input inputmode="numeric" value="${esc(cf.duration)}" oninput="Drafts.cardioForm.duration=this.value"/></div>
        <div class="field"><label>Distância (km)</label><input inputmode="decimal" value="${esc(cf.distance)}" oninput="Drafts.cardioForm.distance=this.value" placeholder="opcional"/></div>
      </div>
      <button class="btn btn-secondary" onclick="addCardioSession()">+ Adicionar sessão planejada</button>
    </div>

    <div class="card">
      <h3>Sessões planejadas</h3>
      ${sessions.length === 0 ? `<div class="empty">Nenhuma sessão de cardio planejada ainda.</div>` :
        sessions.map(s => `
          <div class="list-row" style="display:block;">
            <div class="between"><div style="font-weight:700;">${s.type}</div><button class="btn-link" onclick="removeCardioSession('${s.id}')">Remover</button></div>
            <div class="muted">${s.targetDurationMin} min${s.targetDistanceKm?` · ${s.targetDistanceKm} km`:''}</div>
            ${Drafts.cardioLoggingId === s.id ? `
              <div class="stack" style="margin-top:6px;">
                <div class="row">
                  <div class="field"><label>Duração (min)</label><input inputmode="numeric" value="${esc(Drafts.cardioExec.duration)}" oninput="Drafts.cardioExec.duration=this.value"/></div>
                  <div class="field"><label>Distância (km)</label><input inputmode="decimal" value="${esc(Drafts.cardioExec.distance)}" oninput="Drafts.cardioExec.distance=this.value"/></div>
                </div>
                <div class="field"><label>Calorias (kcal)</label><input inputmode="numeric" value="${esc(Drafts.cardioExec.calories)}" oninput="Drafts.cardioExec.calories=this.value" placeholder="opcional"/></div>
                <div class="row"><button class="btn btn-primary" onclick="confirmCardioLog('${s.id}')">Confirmar</button><button class="btn btn-ghost" onclick="Drafts.cardioLoggingId=null; refresh();">Cancelar</button></div>
              </div>` : `<button class="btn btn-ghost" style="margin-top:6px;" onclick="startCardioLog('${s.id}')">Registrar execução</button>`}
          </div>`).join('')}
    </div>

    <div class="card">
      <h3>Histórico de cardio</h3>
      ${logs.length === 0 ? `<div class="empty">Nenhum cardio registrado ainda.</div>` :
        logs.map(l => `<div class="list-row">
            <div><div style="font-weight:700;">${l.type} · ${fmtDatePt(l.date)}</div>
              <div class="tiny">${l.durationMin} min${l.distanceKm?` · ${l.distanceKm} km`:''}${l.caloriesKcal?` · ${l.caloriesKcal} kcal`:''}</div></div>
            <button class="icon-btn danger" onclick="removeCardioLog('${l.id}')">${ICON.trash}</button>
          </div>`).join('')}
    </div>
  `;
}
function addCardioSession(){
  const cf = Drafts.cardioForm;
  if(!cf.duration){ toast('Informe a duração alvo', 'error'); return; }
  state.cardioSessions.push({ id:uid(), type:cf.type, targetDurationMin:parseInt(cf.duration)||0, targetDistanceKm: cf.distance ? toNum(cf.distance) : undefined });
  saveState(); Drafts.cardioForm = { type:cf.type, duration:'30', distance:'' }; refresh();
}
function removeCardioSession(id){
  if(!confirm('Remover esta sessão planejada?')) return;
  state.cardioSessions = state.cardioSessions.filter(s => s.id !== id); saveState(); refresh();
}
function startCardioLog(sessionId){
  const s = state.cardioSessions.find(x => x.id === sessionId);
  Drafts.cardioLoggingId = sessionId;
  Drafts.cardioExec = { duration:String(s.targetDurationMin), distance: s.targetDistanceKm ? String(s.targetDistanceKm) : '', calories:'' };
  refresh();
}
function confirmCardioLog(sessionId){
  const s = state.cardioSessions.find(x => x.id === sessionId);
  const e = Drafts.cardioExec;
  state.cardioLogs.push({ id:uid(), sessionId, type:s.type, date:todayStr(), durationMin:parseInt(e.duration)||0, distanceKm: e.distance?toNum(e.distance):undefined, caloriesKcal: e.calories?parseInt(e.calories):undefined });
  saveState(); Drafts.cardioLoggingId = null; refresh(); toast('Cardio registrado!');
}
function removeCardioLog(id){
  if(!confirm('Excluir este registro de cardio?')) return;
  state.cardioLogs = state.cardioLogs.filter(l => l.id !== id); saveState(); refresh();
}

/* ---------- ONBOARDING ---------- */
function refreshOnboarding(){ document.getElementById('content').innerHTML = renderOnboarding(); }
function renderOnboarding(){
  const p = Drafts.onboardingForm;
  const activityChips = Object.keys(ACTIVITY_LABELS).map(k => `<button class="chip ${p.activityLevel===k?'active':''}" onclick="Drafts.onboardingForm.activityLevel='${k}'; refreshOnboarding();">${ACTIVITY_LABELS[k]}</button>`).join('');
  const goalChips = Object.keys(GOAL_LABELS).map(k => `<button class="chip ${p.goal===k?'active':''}" onclick="Drafts.onboardingForm.goal='${k}'; refreshOnboarding();">${GOAL_LABELS[k]}</button>`).join('');
  return `
    <div class="card">
      <h2 style="margin-top:0;">Bem-vindo(a) ao VITA 👋</h2>
      <div class="muted">Vamos configurar seu perfil — leva menos de 1 minuto. Seus dados ficam salvos só neste aparelho, ninguém mais vê ou usa essas informações.</div>
      <div class="field" style="margin-top:8px;"><label>Nome</label><input value="${esc(p.name)}" oninput="Drafts.onboardingForm.name=this.value" placeholder="Como podemos te chamar?"/></div>
      <div class="chips"><button class="chip ${p.sex==='M'?'active':''}" onclick="Drafts.onboardingForm.sex='M'; refreshOnboarding();">Masculino</button><button class="chip ${p.sex==='F'?'active':''}" onclick="Drafts.onboardingForm.sex='F'; refreshOnboarding();">Feminino</button></div>
      <div class="row">
        <div class="field"><label>Idade</label><input inputmode="numeric" value="${esc(p.age)}" oninput="Drafts.onboardingForm.age=this.value"/></div>
        <div class="field"><label>Altura (cm)</label><input inputmode="numeric" value="${esc(p.heightCm)}" oninput="Drafts.onboardingForm.heightCm=this.value"/></div>
      </div>
      <div class="row">
        <div class="field"><label>Peso atual (kg)</label><input inputmode="decimal" value="${esc(p.weightKg)}" oninput="Drafts.onboardingForm.weightKg=this.value"/></div>
        <div class="field"><label>% de gordura</label><input inputmode="decimal" value="${esc(p.bodyFatPct)}" oninput="Drafts.onboardingForm.bodyFatPct=this.value" placeholder="opcional"/></div>
      </div>
      <div class="tiny uppercase" style="font-weight:700;margin-top:4px;">Nível de atividade</div>
      <div class="chips">${activityChips}</div>
      <div class="tiny uppercase" style="font-weight:700;margin-top:4px;">Objetivo</div>
      <div class="chips">${goalChips}</div>
      <div class="tiny">${GOAL_HINTS[p.goal]}</div>
      <button class="btn btn-primary" style="margin-top:10px;" onclick="finishOnboarding()">Começar</button>
    </div>
  `;
}
function finishOnboarding(){
  const p = Drafts.onboardingForm;
  const age = toNum(p.age, 0), heightCm = toNum(p.heightCm, 0), weightKg = toNum(p.weightKg, 0);
  if(!age || !heightCm || !weightKg){ toast('Preencha idade, altura e peso para calcularmos suas metas', 'error'); return; }
  const profile = {
    name: p.name || '', sex: p.sex || 'F', age, heightCm, weightKg,
    bodyFatPct: p.bodyFatPct ? toNum(p.bodyFatPct) : undefined,
    activityLevel: p.activityLevel || 'moderado', goal: p.goal || 'manter',
    waterGoalMl: p.waterGoalMl || 3000,
  };
  state = buildEmptyState(profile);
  saveState();
  if(typeof AppCloud !== 'undefined' && AppCloud.isConfigured()) AppCloud.flushSave();
  UI.onboarding = false;
  Drafts.profileForm = JSON.parse(JSON.stringify(state.profile));
  goTab('inicio');
}

/* ---------- PERFIL ---------- */
function updateEnergyCard(){
  const p = Drafts.profileForm;
  const e = calcEnergy(p), bmi = calcBMI(p.weightKg, p.heightCm);
  const set = (id,val) => { const el = document.getElementById(id); if(el) el.textContent = val; };
  set('st-imc', round1(bmi)); set('st-bmr', e.bmr); set('st-tdee', e.tdee);
  set('st-kcal', e.targetKcal+' kcal'); set('st-protein', e.targetProteinG+'g'); set('st-carbs', e.targetCarbsG+'g'); set('st-fat', e.targetFatG+'g');
}
function renderPerfil(){
  const p = Drafts.profileForm;
  const e = calcEnergy(p), bmi = calcBMI(p.weightKg, p.heightCm);
  const metrics = [...state.bodyMetrics].sort((a,b) => a.date < b.date ? 1 : -1);

  const activityChips = Object.keys(ACTIVITY_LABELS).map(k => `<button class="chip ${p.activityLevel===k?'active':''}" onclick="setProfileChip('activityLevel','${k}')">${ACTIVITY_LABELS[k]}</button>`).join('');
  const goalChips = Object.keys(GOAL_LABELS).map(k => `<button class="chip ${p.goal===k?'active':''}" onclick="setProfileChip('goal','${k}')">${GOAL_LABELS[k]}</button>`).join('');

  const metricsRows = metrics.length === 0 ? `<div class="empty">Nenhum registro ainda.</div>` :
    metrics.map((m,idx) => {
      const prev = metrics[idx+1];
      const delta = prev ? round1(m.weightKg - prev.weightKg) : null;
      const deltaColor = delta == null ? 'var(--ink-soft)' : (delta > 0 ? 'var(--danger)' : 'var(--good)');
      return `<div class="list-row">
        <span class="tiny" style="width:76px;">${m.date}</span>
        <span class="num">${m.weightKg} kg</span>
        <span class="tiny">${m.bodyFatPct!=null ? m.bodyFatPct+'% gordura' : '-'}</span>
        <span class="num" style="color:${deltaColor};">${delta==null?'':(delta>0?'+'+delta:delta)}</span>
        <button class="icon-btn danger" onclick="removeBodyMetric('${m.id}')">${ICON.trash}</button>
      </div>`;
    }).join('');

  return `
    <div class="card">
      <h3>Seus dados</h3>
      <div class="field"><label>Nome</label><input value="${esc(p.name)}" oninput="Drafts.profileForm.name=this.value" placeholder="Como podemos te chamar?"/></div>
      <div class="chips"><button class="chip ${p.sex==='M'?'active':''}" onclick="setProfileChip('sex','M')">Masculino</button><button class="chip ${p.sex==='F'?'active':''}" onclick="setProfileChip('sex','F')">Feminino</button></div>
      <div class="row">
        <div class="field"><label>Idade</label><input inputmode="numeric" value="${p.age}" oninput="Drafts.profileForm.age=parseInt(this.value)||0; updateEnergyCard();"/></div>
        <div class="field"><label>Altura (cm)</label><input inputmode="numeric" value="${p.heightCm}" oninput="Drafts.profileForm.heightCm=parseInt(this.value)||0; updateEnergyCard();"/></div>
      </div>
      <div class="row">
        <div class="field"><label>Peso atual (kg)</label><input inputmode="decimal" value="${p.weightKg}" oninput="Drafts.profileForm.weightKg=parseFloat(this.value.replace(',','.'))||0; updateEnergyCard();"/></div>
        <div class="field"><label>% de gordura</label><input inputmode="decimal" value="${p.bodyFatPct??''}" oninput="Drafts.profileForm.bodyFatPct=this.value?parseFloat(this.value.replace(',','.')):undefined; updateEnergyCard();" placeholder="opcional"/></div>
      </div>
      <div class="tiny uppercase" style="font-weight:700;margin-top:4px;">Nível de atividade</div>
      <div class="chips">${activityChips}</div>
      <div class="tiny uppercase" style="font-weight:700;margin-top:4px;">Objetivo</div>
      <div class="chips">${goalChips}</div>
      <div class="tiny" id="goal-hint">${GOAL_HINTS[p.goal]}</div>
      <div class="field"><label>Meta de água diária (ml)</label><input inputmode="numeric" value="${p.waterGoalMl}" oninput="Drafts.profileForm.waterGoalMl=parseInt(this.value)||0"/></div>
      <button class="btn btn-primary" onclick="saveProfile()">Salvar perfil</button>
    </div>

    <div class="card">
      <h3>Análise calórica</h3>
      <div class="stat-grid">
        <div class="stat"><b id="st-imc">${round1(bmi)}</b><span>IMC</span></div>
        <div class="stat"><b id="st-bmr">${e.bmr}</b><span>TMB kcal</span></div>
        <div class="stat"><b id="st-tdee">${e.tdee}</b><span>Gasto total</span></div>
      </div>
      <div class="stat-grid g4" style="margin-top:4px;">
        <div class="stat"><b id="st-kcal" style="color:var(--accent);">${e.targetKcal} kcal</b><span>Meta</span></div>
        <div class="stat"><b id="st-protein" style="color:var(--danger);">${e.targetProteinG}g</b><span>Proteína</span></div>
        <div class="stat"><b id="st-carbs" style="color:var(--amber);">${e.targetCarbsG}g</b><span>Carbo</span></div>
        <div class="stat"><b id="st-fat" style="color:var(--violet);">${e.targetFatG}g</b><span>Gordura</span></div>
      </div>
      <div class="tiny">TMB via Katch-McArdle (quando há % de gordura) ou Mifflin-St Jeor, ajustada pelo nível de atividade e objetivo.</div>
    </div>

    <div class="card">
      <h3>Registrar peso de hoje</h3>
      <div class="row">
        <div class="field"><label>Peso (kg)</label><input inputmode="decimal" value="${esc(Drafts.newMetric.weight)}" oninput="Drafts.newMetric.weight=this.value" placeholder="ex: 78.5"/></div>
        <div class="field"><label>% gordura</label><input inputmode="decimal" value="${esc(Drafts.newMetric.bodyFat)}" oninput="Drafts.newMetric.bodyFat=this.value" placeholder="opcional"/></div>
      </div>
      <button class="btn btn-primary" onclick="registerBodyMetric()">Registrar</button>
    </div>

    <div class="card"><h3>Histórico de composição corporal</h3>${metricsRows}</div>

    <div class="card">
      ${AUTH_USER
        ? `<div class="tiny">Conectado como <strong>${esc(AUTH_USER.email)}</strong> — seus dados ficam salvos na nuvem.</div>`
        : `<div class="seed-note">Este ambiente guarda os dados no seu navegador (local, só neste dispositivo).</div>`}
      <button class="btn-link" onclick="resetSeed()">Restaurar dados de exemplo</button>
      ${AUTH_USER ? `<button class="btn-link" style="color:var(--danger);" onclick="logout()">Sair da conta</button>` : ''}
    </div>
  `;
}
function setProfileChip(field, val){ Drafts.profileForm[field] = val; refresh(); }
function saveProfile(){
  state.profile = JSON.parse(JSON.stringify(Drafts.profileForm));
  saveState(); toast('Perfil salvo');
}
function registerBodyMetric(){
  const weightKg = toNum(Drafts.newMetric.weight, 0);
  if(!weightKg || weightKg <= 0){ toast('Informe um peso válido em kg', 'error'); return; }
  const bodyFatPct = Drafts.newMetric.bodyFat ? toNum(Drafts.newMetric.bodyFat) : undefined;
  state.bodyMetrics.push({ id:uid(), date:todayStr(), weightKg, bodyFatPct });
  state.profile.weightKg = weightKg;
  if(bodyFatPct != null) state.profile.bodyFatPct = bodyFatPct;
  Drafts.profileForm = JSON.parse(JSON.stringify(state.profile));
  saveState(); Drafts.newMetric = { weight:'', bodyFat:'' }; refresh(); toast('Peso registrado');
}
function removeBodyMetric(id){
  if(!confirm('Excluir este registro?')) return;
  state.bodyMetrics = state.bodyMetrics.filter(m => m.id !== id); saveState(); refresh();
}
function resetSeed(){
  if(!confirm('Isso vai apagar seus dados atuais e recarregar os dados de exemplo. Continuar?')) return;
  state = buildSeed(); saveState(); goTab('inicio'); toast('Dados de exemplo restaurados');
}

/* ---------- init / autenticação ---------- */
function renderAuthGate(mode, errorMsg){
  mode = mode || 'login';
  const root = document.getElementById('root');
  root.innerHTML = `
    <div class="stage"><div class="phone" id="phone">
      <div class="content" id="content" style="padding-top:22px;">
        <div class="card">
          <h2 style="margin-top:0;">VITA</h2>
          <div class="muted">${mode==='signup' ? 'Crie sua conta para começar — seus dados ficam salvos na nuvem, disponíveis em qualquer aparelho.' : 'Entre na sua conta.'}</div>
          ${errorMsg ? `<div class="tiny" style="color:var(--danger);margin-top:6px;">${esc(errorMsg)}</div>` : ''}
          <div class="field" style="margin-top:10px;"><label>E-mail</label><input id="auth-email" type="email" placeholder="voce@email.com"/></div>
          <div class="field"><label>Senha</label><input id="auth-password" type="password" placeholder="mínimo 6 caracteres"/></div>
          <button class="btn btn-primary" style="margin-top:8px;" onclick="submitAuth('${mode}')">${mode==='signup' ? 'Criar conta' : 'Entrar'}</button>
          <button class="btn-link" style="margin-top:6px;" onclick="renderAuthGate('${mode==='signup'?'login':'signup'}')">${mode==='signup' ? 'Já tenho conta — entrar' : 'Ainda não tenho conta — criar'}</button>
        </div>
      </div>
      <div class="toast" id="toast"></div>
    </div></div>`;
}
async function submitAuth(mode){
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  if(!email || password.length < 6){ renderAuthGate(mode, 'Informe um e-mail e uma senha com pelo menos 6 caracteres.'); return; }
  try{
    if(mode === 'signup'){
      const result = await AppCloud.signUp(email, password);
      if(result.hasSession){
        await bootApp();
      } else {
        renderAuthGate('login', 'Conta criada! Confirme seu e-mail e depois entre.');
      }
    } else {
      await AppCloud.signIn(email, password);
      await bootApp();
    }
  }catch(err){
    renderAuthGate(mode, err.message || 'Erro ao autenticar.');
  }
}
function applyLoadedState(loaded){
  state = loaded;
  if(!state.planHistory) state.planHistory = [];
  if(!state.workoutSchedule) state.workoutSchedule = autoScheduleFromPlans(state.workoutPlans.map(p => p.id));
  if(!state.dishes) state.dishes = [];
  Drafts.profileForm = JSON.parse(JSON.stringify(state.profile));
}
async function bootApp(){
  AUTH_USER = AppCloud.getCurrentUser();
  const remote = await AppCloud.loadRemoteState();
  const local = loadState();
  // Nunca confia cegamente na nuvem: o envio pro Supabase é assíncrono (debounced), então se o app
  // recarregar logo depois de uma ação (ex: escolher um treino) o envio pode não ter chegado ainda —
  // nesse caso a cópia local, mais nova, não pode ser substituída pela cópia antiga da nuvem. Decide
  // por quem tem o "updatedAt" mais recente, não por qual fonte é a nuvem.
  const remoteTime = remote && remote.updatedAt || 0;
  const localTime = local && local.updatedAt || 0;
  if(remote && remoteTime >= localTime){
    applyLoadedState(remote);
  } else if(local){
    applyLoadedState(local);
    AppCloud.saveRemoteState(state); // local está mais atualizado (ou é a única cópia) — sincroniza de volta pra nuvem
  } else {
    UI.onboarding = true;
  }
  renderShell();
}
function logout(){
  AppCloud.signOut().then(() => { location.reload(); });
}
(async function init(){
  if(!AppCloud.isConfigured()){
    // Supabase não configurado (ver supabase-config.js): funciona só localmente neste dispositivo
    const loaded = loadState();
    if(loaded) applyLoadedState(loaded); else UI.onboarding = true;
    renderShell();
    return;
  }
  const user = await AppCloud.getSession();
  if(!user){ renderAuthGate('login'); return; }
  await bootApp();
})();
