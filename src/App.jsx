import React, { useEffect, useState } from 'react';
import { APP_NAME, PRICING, FILTER_PARTNER, CATEGORIES, REFERRAL } from './config.js';
import { backend, STATE_KEY, supabase, cloud, redirectUrl, SetupMissing } from './storage.js';
import { makeSeed, makeEmpty, uid } from './seed.js';
import { parseTag, makeSnapshot, decodeSnapshot, unitUrl, liveUnitUrl, PART_RE } from './unit.js';
import QRCode from 'qrcode';
import { BRANDS, decodeSerial, decodeTonnage, estimateRefrigerant } from './decode.js';
import { costStats, VISIT_TYPES, MIN_FOR_TYPICAL, SYMPTOMS, symptom, unlockStatus, historyInsights } from './insights.js';
import { planStatus, filterUrl, analyzeBills, fmtMonth, fmtDate, money, addMonths, daysUntil } from './logic.js';

const PAID = ['qr', 'company', 'callhelper', 'insights', 'bills', 'reorder', 'beforecall', 'tips', 'warranty', 'homes', 'report', 'replace'];
const TABS = [['home', 'Home', '⌂'], ['equipment', 'Equipment', '⚙'], ['log', 'Log', '☰'], ['plus', 'Plus', '★'], ['settings', 'Account', '◉']];
const TITLES = { home: APP_NAME, equipment: 'My Equipment', nameplate: 'Nameplate Lookup', log: 'Service Log', addlog: 'Add Service',
  filter: 'Air Filter', agreement: 'Maintenance Agreement', plus: `${APP_NAME} Plus`, bills: 'Power Bill & Comfort', reorder: 'Filter Reorder',
  beforecall: 'Thinking About a Call?', tips: 'Power Bill & Comfort', warranty: 'Warranty Tracker', homes: 'Homes & Equipment',
  report: 'Service History Report', replace: 'Replacement Planning', settings: 'Account', company: 'Company', callhelper: 'Thinking About a Call?', insights: 'What Might Be Going On', signup: 'Create Account', auth: 'Sign In', scan: 'Scan the Data Tag', qr: 'Unit QR Label', unit: 'Unit History', paywall: `${APP_NAME} Plus` };

const parseHash = () => { const [s, p] = location.hash.replace(/^#\/?/, '').split('/'); return { screen: s || 'home', param: p }; };

export default function App() {
  const [st, setSt] = useState(null);
  const [route, setRoute] = useState(parseHash());
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { backend.load(STATE_KEY).then((s) => {
    // Blank account: #/?fresh=1 (or ?fresh=1 in the page URL) always opens an empty account.
    if (/[?&]fresh=1/.test(location.hash + location.search)) { s = makeEmpty(); history.replaceState(null, '', location.pathname + '#/signup'); }
    // A unit QR opened on a device with no account must not create demo data.
    else if (!s && parseHash().screen === 'unit') s = null; else s = s || makeSeed();
    setSt(s); setLoaded(true); }); }, []);
  useEffect(() => { if (st) backend.save(STATE_KEY, st); }, [st]);
  // ---- Accounts + cloud sync ----
  const [session, setSession] = useState(null);
  const [sync, setSync] = useState({ status: 'off' }); // off | loading | ok | saving | error | setup | ask
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (/[?&](code|error)=/.test(location.search)) history.replaceState(null, '', location.pathname + (location.hash || '#/home'));
    });
    return () => sub.subscription.unsubscribe();
  }, []);
  const userId = session?.user?.id;
  useEffect(() => { if (!userId || !loaded) { setSync({ status: 'off' }); return; }
    let dead = false; setSync({ status: 'loading' });
    const email = session.user.email;
    const own = (s) => { s = structuredClone(s); s.user = { ...s.user, email: s.user?.email || email, signedUp: true }; return s; };
    cloud.load(userId).then((row) => { if (dead) return;
      if (row?.data && Object.keys(row.data).length) { setSt(own(row.data)); setSync({ status: 'ok', at: row.updated_at }); return; }
      const local = JSON.parse(localStorage.getItem(STATE_KEY) || 'null');
      const hasLocal = local && !local.demo && (local.equipment?.some((e) => e.model || e.serial) || local.services?.length);
      if (hasLocal) setSync({ status: 'ask', local });
      else { const e = own(makeEmpty()); setSt(e); cloud.save(userId, e).then(() => setSync({ status: 'ok' }), fail); }
    }, fail);
    function fail(e) { if (!dead) setSync({ status: e instanceof SetupMissing ? 'setup' : 'error', msg: e.message }); }
    return () => { dead = true; };
  }, [userId, loaded]);
  useEffect(() => { if (!userId || !st || !['ok', 'saving', 'error'].includes(sync.status)) return;
    const t = setTimeout(async () => {
      setSync((x) => ({ ...x, status: 'saving' }));
      try {
        await cloud.save(userId, st);
        await cloud.shareUnits(userId, st.equipment.filter((e) => e.unitId).map((e) => ({ unit_id: e.unitId, snapshot: { ...makeSnapshot(e, st.services, 50), live: 1 } })));
        setSync({ status: 'ok', at: new Date().toISOString() });
      } catch (e) { setSync({ status: e instanceof SetupMissing ? 'setup' : 'error', msg: e.message }); }
    }, 1500);
    return () => clearTimeout(t);
  }, [st, userId, sync.status === 'ask' || sync.status === 'loading' || sync.status === 'setup']);
  const resolveUpload = (upload) => { const base = upload ? sync.local : makeEmpty(); const s = structuredClone(base); s.user = { ...s.user, email: s.user?.email || session.user.email, signedUp: true };
    setSt(s); setSync({ status: 'saving' }); cloud.save(userId, s).then(() => setSync({ status: 'ok' }), (e) => setSync({ status: e instanceof SetupMissing ? 'setup' : 'error', msg: e.message })); };
  useEffect(() => { const f = () => { setRoute(parseHash()); window.scrollTo(0, 0); }; addEventListener('hashchange', f); return () => removeEventListener('hashchange', f); }, []);
  if (!loaded) return null;
  if (route.screen === 'unit') return <UnitPage st={st} up={setSt} param={route.param} />;
  if (!st && route.screen === 'auth') return <div className="app"><main><Auth ctx={{ session, go: (s) => { location.hash = '/' + s; } }} /></main></div>;
  if (!st) return null;
  const go = (s, p) => { location.hash = `/${s}${p ? '/' + p : ''}`; };
  const up = (fn) => setSt((s) => { const c = structuredClone(s); fn(c); return c; });
  const eq = st.equipment.find((e) => e.id === st.activeEquipmentId) || st.equipment[0];
  const ctx = { st, up, go, eq, plan: planStatus(st.plan), session, sync };
  let { screen } = route;
  if (!st.user.signedUp && screen !== 'auth') screen = 'signup';
  const S = SCREENS[screen] || Home;
  const gated = PAID.includes(screen);
  const tab = TABS.find(([t]) => t === screen) ? screen : ({ nameplate: 'equipment', addlog: 'log', company: 'log', filter: 'home', agreement: 'home' }[screen] || (gated ? 'plus' : 'home'));
  return (
    <div className="app">
      <header className="top">
        {!TABS.find(([t]) => t === screen) && screen !== 'signup' ? <button className="back" onClick={() => history.back()} aria-label="Back">‹</button> : <img className="logo" src={import.meta.env.BASE_URL + 'icon-192.png'} alt="" width="32" height="32" />}
        <h1>{TITLES[screen] || APP_NAME}</h1>
        {gated && <span className="pill">PLUS</span>}
      </header>
      {st.demo && screen !== 'signup' && <div className="demo">EXAMPLE DEMO DATA — not a real home</div>}
      {sync.status === 'setup' && <div className="banner warn">☁️ Cloud setup isn’t finished yet, so your data is only saved on this device for now. (The database tables haven’t been created.)</div>}
      {sync.status === 'error' && <div className="banner warn">☁️ Couldn’t reach the cloud — changes are saved on this device and will sync when you’re back online.</div>}
      {sync.status === 'ask' && <div className="banner ok"><b>Welcome!</b> This device already has {APP_NAME} data. Upload it to your account?
        <div className="two"><button className="btn" onClick={() => resolveUpload(true)}>⬆️ Upload my data</button><button className="btn ghost" onClick={() => { if (confirm('Start with an empty account? Data on this device will be replaced.')) resolveUpload(false); }}>Start empty</button></div></div>}
      <main>{gated ? <Gate ctx={ctx}><S key={screen + (route.param || "")} ctx={ctx} param={route.param} /></Gate> : <S key={screen + (route.param || "")} ctx={ctx} param={route.param} />}</main>
      {screen !== 'signup' && <nav className="tabs">{TABS.map(([t, l, i]) => (
        <button key={t} className={tab === t ? 'on' : ''} onClick={() => go(t)}><span>{i}</span>{l}</button>))}</nav>}
    </div>
  );
}

// Trial starts automatically the first time any paid feature is opened.
function Gate({ ctx, children }) {
  const { plan, up, st } = ctx;
  useEffect(() => { if (plan.notStarted) up((s) => { s.plan.trialStart = new Date().toISOString(); }); }, [plan.notStarted]);
  if (plan.notStarted) return null;
  if (!plan.entitled) return <Paywall ctx={ctx} />;
  return <>{plan.trial && <div className="trial">🎁 Free trial active · {plan.daysLeft} days left</div>}{children}</>;
}

const Card = ({ title, children, onClick, right }) => (
  <section className={'card' + (onClick ? ' tap' : '')} onClick={onClick}>
    {title && <div className="ch"><h2>{title}</h2>{right}</div>}{children}</section>);
const Row = ({ k, v }) => <div className="row"><span>{k}</span><b>{v}</b></div>;
const Field = ({ label, children }) => <label className="field"><span>{label}</span>{children}</label>;

function eqInfo(e) {
  const d = decodeSerial(e.brand, e.serial); const t = decodeTonnage(e.model);
  return { d, t, refrigerant: estimateRefrigerant(d.ok ? d.year : e.installDate && +e.installDate.slice(0, 4)) };
}
const filterDue = (e) => addMonths(e.lastFilterChange, e.filterMonths);
const agreementVisitsLeft = (a) => a ? a.visitsIncluded - a.visitsUsed : 0;

/* ---------------- FREE SCREENS ---------------- */
function Home({ ctx }) {
  const { st, eq, go } = ctx; const { d, t } = eqInfo(eq);
  const spent = st.services.filter((s) => s.equipmentId === eq.id).reduce((a, s) => a + +s.cost, 0);
  const due = daysUntil(filterDue(eq)); const left = agreementVisitsLeft(st.agreement); const w = daysUntil(eq.warranty.endDate);
  return (<>
    <p className="hello">Hi {st.user.name.split(' ')[0]} 👋</p>
    <Card title={`${CATEGORIES[eq.category].icon} ${eq.name}`} onClick={() => go('nameplate', eq.id)} right={<span className="chev">›</span>}>
      <div className="stats">
        <div><b>{d.ok ? `~${Math.floor(d.ageYears)} yrs` : '—'}</b><small>est. age</small></div>
        <div><b>{t ? `${t.tons} ton` : '—'}</b><small>est. size</small></div>
        <div><b>{money(spent)}</b><small>total spent</small></div>
      </div>
    </Card>
    <h3 className="sect">Reminders</h3>
    <Card onClick={() => go('filter')}><div className={'rem ' + (due < 14 ? 'warn' : '')}><span>🌬️</span><div><b>Filter {eq.filterSize}</b><small>{due < 0 ? `Overdue by ${-due} days` : `Change in ${due} days · ${fmtDate(filterDue(eq))}`}</small></div><span className="chev">›</span></div></Card>
    {st.agreement && left > 0 && <Card onClick={() => go('agreement')}><div className="rem"><span>📅</span><div><b>{left} included visit{left > 1 ? 's' : ''} left</b><small>Book with {st.agreement.provider} — already paid for</small></div><span className="chev">›</span></div></Card>}
    {!eq.warranty.registered && w > 0 && <Card onClick={() => go('warranty')}><div className="rem warn"><span>🛡️</span><div><b>Warranty not registered</b><small>Ends {fmtDate(eq.warranty.endDate)} · tap to review</small></div><span className="chev">›</span></div></Card>}
    <h3 className="sect">Quick actions</h3>
    <div className="grid">
      <button className="tile" onClick={() => go('addlog')}>➕<span>Log a service</span></button>
      <button className="tile" onClick={() => go('callhelper')}>☎️<span>Thinking about a call?</span></button>
      <button className="tile" onClick={() => go('bills')}>⚡<span>Power bill check</span></button>
      <button className="tile" onClick={() => go('log')}>💵<span>Your typical costs</span></button>
      <button className="tile" onClick={() => go('report')}>📄<span>Home-sale report</span></button>
    </div>
  </>);
}

function Equipment({ ctx }) {
  const { st, go, up, plan } = ctx;
  const list = plan.entitled ? st.equipment : st.equipment.slice(0, 1);
  return (<>
    {list.map((e) => { const { d, t } = eqInfo(e); return (
      <Card key={e.id} onClick={() => { up((s) => { s.activeEquipmentId = e.id; }); go('nameplate', e.id); }}>
        <div className="rem"><span>{CATEGORIES[e.category].icon}</span><div><b>{e.name}</b>
          <small>{BRANDS.find((b) => b.id === e.brand)?.label} · {d.ok ? `~${Math.floor(d.ageYears)} yrs` : 'age unknown'}{t ? ` · ${t.tons} ton` : ''}</small></div>
          {e.id === st.activeEquipmentId && <span className="pill g">Active</span>}<span className="chev">›</span></div>
      </Card>); })}
    {!plan.entitled && st.equipment.length > 1 && <p className="muted">{st.equipment.length - 1} more saved item(s) hidden — multiple systems & homes are a Plus feature.</p>}
    <button className="btn ghost" onClick={() => go('homes')}>＋ Add equipment or another home <span className="pill">PLUS</span></button>
    <h3 className="sect">Coming later</h3>
    <div className="chips">{Object.entries(CATEGORIES).filter(([, c]) => !c.enabled).map(([k, c]) => <span key={k} className="chip">{c.icon} {c.label}</span>)}</div>
  </>);
}

function Nameplate({ ctx, param }) {
  const { st, up } = ctx; const e = st.equipment.find((x) => x.id === param) || ctx.eq;
  const set = (k) => (ev) => up((s) => { s.equipment.find((x) => x.id === e.id)[k] = ev.target.value; });
  const { d, t, refrigerant } = eqInfo(e);
  return (<>
    <Card title="From the outdoor unit’s label">
      <Field label="Nickname"><input value={e.name} onChange={set('name')} /></Field>
      <Field label="Brand"><select value={e.brand} onChange={set('brand')}>{BRANDS.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}</select></Field>
      <Field label="Model number"><input value={e.model} onChange={set('model')} autoCapitalize="characters" /></Field>
      <Field label="Serial number"><input value={e.serial} onChange={set('serial')} autoCapitalize="characters" /></Field>
      <button className="btn ghost" onClick={() => ctx.go('scan', e.id)}>📷 Scan the data tag</button>
    </Card>
    <button className="btn ghost" onClick={() => ctx.go('qr', e.id)}>🔳 Unit QR label <span className="pill">PLUS</span></button>
    <Card title="Estimated details">
      <Row k="Manufactured" v={d.ok ? `${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.month - 1]} ${d.year} (est.)` : 'Not decoded'} />
      <Row k="Age" v={d.ok ? `About ${d.ageYears} years` : '—'} />
      <Row k="Size" v={t ? `${t.tons} ton (est.)` : 'Not decoded'} />
      <Row k="Refrigerant" v={refrigerant} />
      {d.ok ? <p className="muted">How we read it: {d.rule}. {t && t.note}.</p> : <p className="muted">{d.message}</p>}
      <p className="note">These are estimates from public serial-number patterns. Your HVAC tech can confirm from the nameplate.</p>
    </Card>
  </>);
}

function Log({ ctx }) {
  const { st, eq, go, plan } = ctx; const list = st.services.filter((s) => s.equipmentId === eq.id).sort((a, b) => b.date.localeCompare(a.date));
  const sum = (t) => list.filter((s) => !t || s.type === t).reduce((a, s) => a + +s.cost, 0);
  const stats = costStats(st.services); const usual = [];
  Object.entries(stats).forEach(([c, ts]) => { const t = ts.diagnostic; if (t?.ready) usual.push([c, t]); });
  return (<>
    <Card><div className="stats"><div><b>{money(sum())}</b><small>total spent</small></div><div><b>{money(sum('repair'))}</b><small>repairs</small></div><div><b>{money(sum('maintenance'))}</b><small>maintenance</small></div></div></Card>
    <Card title="Your usual costs" right={<span className="pill">PLUS</span>}>
      {plan.entitled ? (usual.length ? usual.map(([c, t]) => <p key={c} className="usual">Your usual service call with <b>{c}</b>: about <b>{money(t.median)}</b> ({t.count} visits)</p>)
        : <p className="muted">Log at least {MIN_FOR_TYPICAL} paid service calls with a company to see your typical cost.</p>)
        : <p className="muted">See what you usually pay each company, based on your own records.</p>}
      <p className="muted small">Based on your records · tap a company below for details</p>
      <div className="chips">{Object.keys(stats).map((c) => <button key={c} className="chip" onClick={() => go('company', encodeURIComponent(c))}>{c} ›</button>)}</div>
    </Card>
    <button className="btn" onClick={() => go('addlog')}>＋ Add service visit</button>
    {list.map((s) => <Card key={s.id}><div className="log"><div><b>{s.work}</b><small>{fmtDate(s.date)} · {s.company}</small></div>
      <div className="r"><b>{money(s.cost)}</b><span className={'tag ' + s.type}>{VISIT_TYPES[s.type]}</span></div></div></Card>)}
  </>);
}

function Company({ ctx, param }) {
  const { st, go } = ctx; const name = decodeURIComponent(param || ''); const ts = costStats(st.services)[name] || {};
  const visits = st.services.filter((s) => s.company === name).sort((a, b) => b.date.localeCompare(a.date));
  const isAgr = st.agreement?.provider === name;
  return (<>
    <Card title={name}>{isAgr && <span className="pill g">Your maintenance agreement</span>}
      {Object.keys(VISIT_TYPES).map((k) => { const t = ts[k]; if (!t) return null; return (
        <div key={k} className="cost"><div className="cl">{VISIT_TYPES[k]}</div>
          {t.ready ? <><div className="cv">about {money(t.median)}</div><small>typical · range {money(t.min)}–{money(t.max)} · {t.count} visits</small></>
            : <small>{t.count ? `${t.count} paid visit — need ${MIN_FOR_TYPICAL} to show a typical cost` : 'no paid visits yet'}</small>}
          {t.covered > 0 && <small>{t.covered} covered visit{t.covered > 1 ? 's' : ''} ($0)</small>}</div>); })}
      <p className="note">Based on your records only — the middle (median) of what you paid this company. Every visit is different; this is just your own history.</p>
    </Card>
    <Card title="Visits">{visits.map((s) => <Row key={s.id} k={`${fmtDate(s.date)} · ${s.work}`} v={money(s.cost)} />)}</Card>
    <button className="btn ghost" onClick={() => go('callhelper')}>☎️ Thinking about a call?</button>
  </>);
}

const SWITCH_HELP = 'A small safety switch on the drain line or drain pan near the indoor unit. If water backs up, it shuts the system off so it won’t overflow. Not every system has one.';
function CallHelper({ ctx, param }) {
  const { st, eq, go } = ctx; const [k, setK] = useState(param || ''); const [a, setA] = useState({});
  const sym = symptom(k); const set = (q, v) => setA({ ...a, [q]: v });
  const company = st.preferredCompany || { name: st.agreement?.provider || 'your HVAC company', phone: '' };
  const CallBtn = ({ label }) => <a className="btn" href={company.phone ? `tel:${company.phone}` : undefined}>{label || `📞 Call ${company.name}`}</a>;
  const YN = ({ q, opts = [['yes', 'Yes'], ['no', 'No'], ['unsure', 'Not sure']] }) => <div className="seg">{opts.map(([v, l]) => <button key={v} className={a[q] === v ? 'on' : ''} onClick={() => set(q, v)}>{l}</button>)}</div>;
  if (!sym) return (<>
    <p className="muted">What’s going on? Pick the closest match.</p>
    <div className="symgrid">{SYMPTOMS.map((x) => <button key={x.k} className={'sym' + (x.safety ? ' s' : '')} onClick={() => { setK(x.k); setA({}); }}><span>{x.i}</span>{x.l}</button>)}</div>
  </>);
  const extremeSafety = sym.extreme && a.vuln === 'yes';
  if (sym.safety || extremeSafety) return (<>
    <button className="link" onClick={() => setK('')}>‹ Change symptom</button>
    <div className="safety"><div className="big">{sym.emergency ? '🚨' : '📞'}</div><h2>{sym.emergency ? 'Emergency — act now' : 'Call a tech now'}</h2>
      <p>{sym.safety || `With ${sym.extreme === 'heat' ? 'freezing' : 'extreme heat'} temperatures and someone vulnerable at home, this is urgent. Call a tech now. If anyone feels unwell, call 911.`}</p>
      {sym.emergency ? <a className="btn red" href="tel:911">Call 911</a> : <CallBtn />}
      {sym.emergency && <CallBtn label={`Then call ${company.name}`} />}</div>
    <p className="note">Safety first. Don’t open panels, touch wiring or reset breakers repeatedly.</p>
  </>);
  // Non-safety: context side by side
  const { d } = eqInfo(eq); const mine = st.services.filter((s) => s.equipmentId === eq.id);
  const yr = new Date(Date.now() - 365 * 864e5).toISOString().slice(0, 10);
  const recent = mine.filter((s) => (s.type === 'repair' || /replaced|repair/i.test(s.work)) && s.date >= yr);
  const typ = costStats(st.services)[company.name]?.diagnostic; const ag = st.agreement?.provider === company.name ? st.agreement : null;
  const w = daysUntil(eq.warranty.endDate); const overdue = -daysUntil(filterDue(eq));
  const needSwitch = sym.water; const waterNow = k === 'leak' || a.water === 'yes';
  return (<>
    <button className="link" onClick={() => setK('')}>‹ Change symptom</button>
    <Card title={`${sym.i} ${sym.l}`}>
      {sym.extreme && <><p>Is it {sym.extreme === 'heat' ? 'freezing outside' : 'extremely hot'} and is someone at home elderly, an infant, ill, or medically fragile?</p><YN q="vuln" opts={[['yes', 'Yes'], ['no', 'No']]} /></>}
      {needSwitch && <>
        {k !== 'leak' && <><p>Do you see water around the indoor unit or drain?</p><YN q="water" opts={[['yes', 'Yes'], ['no', 'No']]} /></>}
        <p>Do you have a drain safety switch?</p><p className="muted small">{SWITCH_HELP}</p><YN q="sw" />
        {a.sw === 'yes' && <div className="banner ok">If the drain backs up, that switch can stop the system on purpose. Mention it to your tech — it’s a common call.</div>}
        {waterNow && (a.sw === 'no' || a.sw === 'unsure') && <>
          <div className="panelsafety"><h3>⚠️ Before you open the indoor unit panel</h3><ol>
            <li>Turn the system <b>OFF</b> at the thermostat.</li>
            <li>Turn the <b>breaker or disconnect for the indoor unit OFF</b> before touching or opening anything.</li>
            <li>Watch for <b>sharp sheet-metal edges</b> — gloves recommended.</li>
            <li><b>Don’t touch wiring or any parts.</b> Only look.</li></ol>
            {a.ack ? <p className="ackd">✓ Acknowledged</p> : <button className="btn" onClick={() => set('ack', true)}>I’ve turned off the power and understand I do this at my own risk</button>}</div>
          {a.ack && <><p>Open the indoor unit panel and look at the coil and the refrigerant line. Any ice or frost?</p><YN q="ice" /></>}
          {a.ack && a.ice === 'yes' && <div className="banner warn"><b>Ice found:</b> leave cooling OFF and let it thaw. Check your air filter, then call a tech. Ice usually points to an airflow or refrigerant issue.</div>}
        </>}
      </>}
      {k === 'ice' && <div className="banner warn">Turn cooling OFF at the thermostat, leave it off and let it thaw. Check your air filter, then call a tech. Ice usually points to an airflow or refrigerant issue.</div>}
    </Card>
    <Card title="Your info, side by side">
      <Row k="Usual service call" v={typ?.ready ? `about ${money(typ.median)} (${typ.count} visits)` : 'not enough records yet'} />
      {ag && <Row k="Agreement" v={`${agreementVisitsLeft(ag)} included visit(s) left`} />}
      {ag && <Row k="Perks" v={ag.perks.join(' · ')} />}
      <Row k="System age" v={d.ok ? `about ${Math.floor(d.ageYears)} years` : 'unknown'} />
      <Row k="Repairs, last 12 months" v={recent.length ? `${recent.length} (${recent.map((s) => s.work.replace(/^service call:\s*/i, '')).join('; ')})` : 'none'} />
      <Row k="Warranty" v={w > 0 ? `until ${fmtDate(eq.warranty.endDate)}${eq.warranty.registered ? '' : ' (not registered)'}` : 'ended'} />
      <Row k="Air filter" v={overdue > 0 ? `${overdue} days overdue` : 'up to date'} />
      <p className="muted small">Cost is based on your records.</p>
    </Card>
    <details className="checks"><summary>✅ Owner’s-manual checks <small>thermostat, filter, vents, outdoor area</small></summary><BeforeChecks /></details>
    <p className="neutral">You know your home best. Whenever you’re ready, your tech is a call away.</p>
    <CallBtn />
    <button className="btn ghost" onClick={() => go('insights', k)}>🔎 Not calling yet? See what your history suggests</button>
  </>);
}

function Insights({ ctx, param }) {
  const { st, eq, go } = ctx; const mine = st.services.filter((s) => s.equipmentId === eq.id); const u = unlockStatus(mine);
  const company = st.preferredCompany || { name: st.agreement?.provider || 'your HVAC company', phone: '' };
  const call = <a className="btn" href={company.phone ? `tel:${company.phone}` : undefined}>📞 Call {company.name}</a>;
  if (!u.unlocked) return (<>
    <Card title={`🔒 Unlocks with a little more history`}>
      <p>To suggest anything useful we need either <b>3 service records</b> or <b>6 months</b> of history for “{eq.name}”.</p>
      <div className="prog"><span>Records</span><div><i style={{ width: `${Math.min(100, u.n / 3 * 100)}%` }} /></div><b>{u.n} / 3</b></div>
      <div className="prog"><span>History</span><div><i style={{ width: `${Math.min(100, u.months / 6 * 100)}%` }} /></div><b>{u.months} / 6 mo</b></div>
      <button className="btn ghost" onClick={() => go('addlog')}>＋ Log a past service visit</button>
    </Card>
    {call}
  </>);
  const { d } = eqInfo(eq); const sym = symptom(param);
  const list = historyInsights(mine, eq, d.ok ? d.ageYears : 0, param, -daysUntil(filterDue(eq)));
  return (<>
    <div className="banner warn"><b>A guess, not a diagnosis.</b> These are possibilities to mention to your tech, based only on your records.</div>
    {sym && <p className="muted">For: {sym.i} {sym.l}</p>}
    {list.map((x, i) => <Card key={x.k} title={`${i + 1}. ${x.title}`}><p className="muted">{x.why}</p>
      <ul className="ev">{x.evidence.map((e) => <li key={e}>{e}</li>)}</ul></Card>)}
    <p className="note">How this works: airflow is listed first because it’s one of the most common issues; then parts that appear in your records (repeats rank higher), summer patterns and system age. No repair steps here — your tech will check it properly.</p>
    {call}
  </>);
}

function AddLog({ ctx }) {
  const { up, eq, st } = ctx;
  const [f, setF] = useState({ date: new Date().toISOString().slice(0, 10), company: st.agreement?.provider || '', work: '', cost: '', type: 'maintenance' });
  const s = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (<Card>
    <Field label="Date"><input type="date" value={f.date} onChange={s('date')} /></Field>
    <Field label="Company"><input value={f.company} onChange={s('company')} /></Field>
    <Field label="Work done"><textarea rows="3" value={f.work} onChange={s('work')} placeholder="e.g. Spring tune-up" /></Field>
    <Field label="Cost ($)"><input inputMode="decimal" value={f.cost} onChange={s('cost')} placeholder="0" /></Field>
    <div className="seg">{Object.entries(VISIT_TYPES).map(([t, l]) => <button key={t} className={f.type === t ? 'on' : ''} onClick={() => setF({ ...f, type: t })}>{l}</button>)}</div>
    <button className="btn" disabled={!f.work} onClick={() => { up((x) => { x.services.push({ ...f, id: uid(), cost: +f.cost || 0, equipmentId: eq.id });
      if (f.type === 'maintenance' && x.agreement && f.company === x.agreement.provider && x.agreement.visitsUsed < x.agreement.visitsIncluded) x.agreement.visitsUsed++; }); history.back(); }}>Save</button>
  </Card>);
}

function Filter({ ctx }) {
  const { eq, up, go } = ctx; const due = filterDue(eq); const n = daysUntil(due);
  const set = (k) => (e) => up((s) => { s.equipment.find((x) => x.id === eq.id)[k] = k === 'filterMonths' ? +e.target.value : e.target.value; });
  return (<>
    <Card><div className="big">{eq.filterSize}</div><p className="center muted">Your filter size (W × H × D, inches)</p>
      <div className={'banner ' + (n < 14 ? 'warn' : 'ok')}>{n < 0 ? `Overdue by ${-n} days` : `Next change in ${n} days — ${fmtDate(due)}`}</div>
      <button className="btn" onClick={() => up((s) => { s.equipment.find((x) => x.id === eq.id).lastFilterChange = new Date().toISOString().slice(0, 10); })}>✓ I changed it today</button>
      <button className="btn ghost" onClick={() => go('reorder')}>🛒 Reorder / Auto-ship <span className="pill">PLUS</span></button></Card>
    <Card title="Settings">
      <Field label="Filter size"><input value={eq.filterSize} onChange={set('filterSize')} /></Field>
      <Field label="Remind me every"><select value={eq.filterMonths} onChange={set('filterMonths')}>{[1, 2, 3, 6].map((m) => <option key={m} value={m}>{m} month{m > 1 ? 's' : ''}</option>)}</select></Field>
      <Field label="Last changed"><input type="date" value={eq.lastFilterChange} onChange={set('lastFilterChange')} /></Field>
    </Card>
  </>);
}

function Agreement({ ctx }) {
  const { st, up } = ctx; const a = st.agreement; const left = agreementVisitsLeft(a);
  const set = (k, num) => (e) => up((s) => { s.agreement[k] = num ? +e.target.value : e.target.value; });
  return (<>
    <Card><div className="stats"><div><b>{a.visitsIncluded}</b><small>included</small></div><div><b>{a.visitsUsed}</b><small>used</small></div><div><b className="accent">{left}</b><small>left</small></div></div>
      {left > 0 && <div className="banner ok">You have {left} visit{left > 1 ? 's' : ''} already included. Call {a.provider} to book — fall is a great time for a heating check.</div>}
      <div className="chips">{a.perks.map((p) => <span key={p} className="chip">✓ {p}</span>)}</div></Card>
    <Card title="Agreement details">
      <Field label="Provider"><input value={a.provider} onChange={set('provider')} /></Field>
      <Field label="Start date"><input type="date" value={a.start} onChange={set('start')} /></Field>
      <Field label="Visits included / year"><input inputMode="numeric" value={a.visitsIncluded} onChange={set('visitsIncluded', 1)} /></Field>
      <Field label="Visits used"><input inputMode="numeric" value={a.visitsUsed} onChange={set('visitsUsed', 1)} /></Field>
      <Field label="Perks (comma separated)"><input value={a.perks.join(', ')} onChange={(e) => up((s) => { s.agreement.perks = e.target.value.split(',').map((x) => x.trim()).filter(Boolean); })} /></Field>
      <p className="muted">Renews {fmtDate(addMonths(a.start, 12))}</p>
    </Card>
  </>);
}

/* ---------------- PLUS ---------------- */
function Plus({ ctx }) {
  const { go, plan } = ctx;
  const items = [['callhelper', '☎️', 'Thinking about a call?', 'Safety checks, owner’s-manual checks, your costs & perks, and what your history suggests — one flow'],
    ['bills', '⚡', 'Power bill & comfort', 'Spot unusual bill jumps, plus thermostat tips'], ['reorder', '🛒', 'Filter auto-ship', 'Right size, delivered on schedule'],
    ['warranty', '🛡️', 'Warranty tracker', 'End date & registration reminder'], ['replace', '🗓️', 'Replacement planning', 'Plan and budget ahead by system age'],
    ['homes', '🏘️', 'Multiple homes & equipment', 'Track every system you own'], ['report', '📄', 'Home-sale history report', 'Printable / PDF service record'],
    ['log', '💵', 'Your typical costs', 'Per-company costs from your own records']];
  return (<>
    <Card><p className="center"><b>{plan.label}</b></p><p className="center muted">{plan.notStarted ? `Your ${PRICING.trialDays / 30}-month free trial starts the first time you open a Plus feature.` : `${money(PRICING.monthly)}/mo or ${money(PRICING.yearly)}/yr`}</p></Card>
    {items.map(([k, i, t, d]) => <Card key={k} onClick={() => go(k)}><div className="rem"><span>{i}</span><div><b>{t}</b><small>{d}</small></div><span className="chev">›</span></div></Card>)}
  </>);
}

function Paywall({ ctx }) {
  const { up } = ctx; const sub = (i) => up((s) => { s.plan.subscribed = true; s.plan.interval = i; });
  return (<Card>
    <div className="big">★</div><h2 className="center">Your free trial has ended</h2>
    <p className="center muted">Keep Power Bill Check, warranty tracking, multi-home, reports and more.</p>
    <button className="btn" onClick={() => sub('yearly')}>{money(PRICING.yearly)} / year <small>(save 35%)</small></button>
    <button className="btn ghost" onClick={() => sub('monthly')}>{money(PRICING.monthly)} / month</button>
    <p className="note">Prototype: no real payment is taken.</p>
  </Card>);
}

function Bills({ ctx }) {
  const { st, up } = ctx; const rows = analyzeBills(st.bills);
  const [f, setF] = useState({ month: '2026-10', kwh: '', dollars: '' });
  return (<>
    {rows.filter((r) => r.flag).slice(0, 1).map((r) => <div key={r.id} className="banner warn"><b>{fmtMonth(r.month)} looks higher than usual.</b> {r.yoy !== null && `Usage was ${Math.round(r.yoy * 100)}% above ${fmtMonth(r.prev.month)}`}, more than the typical weather for that month would explain. Weather, guests or new appliances can do this too — but if it keeps up, it may be worth having a tech take a look.</div>)}
    <Card title="Add a bill">
      <div className="three"><input type="month" value={f.month} onChange={(e) => setF({ ...f, month: e.target.value })} />
        <input placeholder="kWh" inputMode="numeric" value={f.kwh} onChange={(e) => setF({ ...f, kwh: e.target.value })} />
        <input placeholder="$" inputMode="decimal" value={f.dollars} onChange={(e) => setF({ ...f, dollars: e.target.value })} /></div>
      <button className="btn" disabled={!f.kwh} onClick={() => { up((s) => { s.bills = s.bills.filter((b) => b.month !== f.month); s.bills.push({ id: uid(), month: f.month, kwh: +f.kwh, dollars: +f.dollars || 0 }); }); setF({ ...f, kwh: '', dollars: '' }); }}>Add bill</button>
    </Card>
    <Card title="Your bills">
      {rows.slice(0, 12).map((r) => <div key={r.id} className={'bill' + (r.flag ? ' flag' : '')}>
        <div><b>{fmtMonth(r.month)}</b><small>{r.cdd > r.hdd ? `${r.cdd} cooling` : `${r.hdd} heating`} degree-days (typical)</small></div>
        <div className="r"><b>{r.kwh.toLocaleString()} kWh</b><small>{money(r.dollars)}{r.yoy !== null && ` · ${r.yoy >= 0 ? '▲' : '▼'}${Math.abs(Math.round(r.yoy * 100))}% vs last yr`}</small></div></div>)}
    </Card>
    <TipsList />
    <p className="note">Compared with the same month last year and with typical Monroe, LA weather (NOAA 1991–2020 normals, approximate). This is not a diagnosis.</p>
  </>);
}

function Reorder({ ctx }) {
  const { eq } = ctx; const url = filterUrl(eq.filterSize);
  return (<Card><div className="big">{eq.filterSize}</div><p className="center muted">Exact size for “{eq.name}” · every {eq.filterMonths} months</p>
    <a className="btn" href={url} target="_blank" rel="noopener sponsored">Reorder / Auto-ship</a>
    <p className="note">Partner: {FILTER_PARTNER.name}. Link: <code>{url}</code></p>
    <p className="muted">Double-check the size printed on the edge of your current filter before ordering.</p></Card>);
}

function BeforeChecks() {
  const checks = [['🌡️', 'Thermostat', 'Set to Cool or Heat (not Off), fan on Auto, and the set temperature a few degrees past room temperature. Replace thermostat batteries if the display is blank or dim.'],
    ['🌬️', 'Air filter', 'A clogged filter can choke airflow. Slide it out — if it’s gray and dusty, put in a fresh one (size is in your app).'],
    ['🚪', 'Vents & returns', 'Open supply vents and make sure furniture, rugs or curtains aren’t blocking vents or the return grille.'],
    ['🌳', 'Outdoor unit', 'From the outside only, clear leaves, grass clippings and stored items so there’s about 2 feet of open space around it. Don’t remove panels.'],
    ['💧', 'Drain pan', 'If your owner’s manual shows a visible drain pan and it’s full of water, the system may have a safety switch that shut it off. Note it for your tech.']];
  return (<>
    <div className="banner danger"><b>Safety rule:</b> anything electrical or touching wiring = call a tech. Don’t open panels, except the guided ice check (power off first). If you smell gas or burning, leave and call for help.</div>
    {checks.map(([i, t, d]) => <Card key={t}><div className="rem start"><span>{i}</span><div><b>{t}</b><small className="wrap">{d}</small></div></div></Card>)}
    <p className="note">These are general owner’s-manual items, not repair instructions. Always follow your equipment’s manual. Still not working? Call your HVAC company.</p>
  </>);
}

function TipsList() {
  const tips = [['Summer', 'Around 78°F when home is a common comfort/savings starting point (ENERGY STAR). Each degree warmer can save a little on cooling.'],
    ['Winter', 'Around 68°F while awake, cooler while asleep (ENERGY STAR).'], ['Humidity', 'In Louisiana, leaving the fan on “Auto” (not “On”) usually helps the system remove more moisture.'],
    ['Big swings', 'Setting back 7–10°F for 8 hrs a day can trim heating/cooling costs (DOE estimate).'], ['Ceiling fans', 'Fans cool people, not rooms — turn them off when you leave.'],
    ['Sun', 'Close blinds on west-facing windows on summer afternoons.']];
  return <Card title="🌡️ Comfort & savings tips">{tips.map(([t, d]) => <p key={t}><b>{t}:</b> {d}</p>)}<p className="muted small">General guidance; your comfort and your tech’s advice come first.</p></Card>;
}

function Warranty({ ctx }) {
  const { st, up } = ctx;
  return <>{st.equipment.map((e) => { const n = daysUntil(e.warranty.endDate); const set = (k, v) => up((s) => { s.equipment.find((x) => x.id === e.id).warranty[k] = v; });
    return (<Card key={e.id} title={e.name}>
      <div className={'banner ' + (e.warranty.registered ? 'ok' : 'warn')}>{e.warranty.registered ? '✓ Registered' : 'Not registered yet — many brands require registration (often within 60–90 days of install) for the longer parts warranty. Ask your installer.'}</div>
      <Field label="Warranty end date"><input type="date" value={e.warranty.endDate} onChange={(ev) => set('endDate', ev.target.value)} /></Field>
      <Row k="Time left" v={n > 0 ? `${Math.floor(n / 365)} yr ${Math.floor((n % 365) / 30)} mo` : 'Ended'} />
      <label className="check"><input type="checkbox" checked={e.warranty.registered} onChange={(ev) => set('registered', ev.target.checked)} /> I registered this warranty</label>
      {e.warranty.notes && <p className="muted">{e.warranty.notes}</p>}
    </Card>); })}</>;
}

function Homes({ ctx }) {
  const { st, up, go } = ctx; const [name, setName] = useState(''); const [home, setHome] = useState(st.homes[0].id);
  return (<>
    {st.homes.map((h) => <Card key={h.id} title={`🏠 ${h.name}`}>{st.equipment.filter((e) => e.homeId === h.id).map((e) =>
      <div key={e.id} className="row tap" onClick={() => { up((s) => { s.activeEquipmentId = e.id; }); go('nameplate', e.id); }}><span>{CATEGORIES[e.category].icon} {e.name}</span><b>›</b></div>)}</Card>)}
    <Card title="Add equipment">
      <Field label="Home"><select value={home} onChange={(e) => setHome(e.target.value)}>{st.homes.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}</select></Field>
      <Field label="Nickname"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Garage apartment" /></Field>
      <Field label="Category"><select>{Object.entries(CATEGORIES).map(([k, c]) => <option key={k} disabled={!c.enabled}>{c.label}{c.enabled ? '' : ' (coming soon)'}</option>)}</select></Field>
      <button className="btn" disabled={!name} onClick={() => { const id = uid(); up((s) => { s.equipment.push({ id, homeId: home, category: 'hvac', name, brand: 'other', model: '', serial: '', installDate: '', filterSize: '16x25x1', filterMonths: 3, lastFilterChange: new Date().toISOString().slice(0, 10), warranty: { endDate: '', registered: false, notes: '' } }); s.activeEquipmentId = id; }); go('nameplate', id); }}>Add</button>
      <button className="btn ghost" onClick={() => { const n = prompt('Home name / address'); if (n) up((s) => { s.homes.push({ id: uid(), name: n }); }); }}>＋ Add another home</button>
    </Card>
  </>);
}

function Report({ ctx }) {
  const { st } = ctx;
  return (<div className="report">
    <button className="btn noprint" onClick={() => window.print()}>🖨️ Print / Save as PDF</button>
    <div className="paper">
      <h2>Home Service History</h2><p className="muted">Prepared with {APP_NAME} · {new Date().toLocaleDateString()}</p>
      {st.homes.map((h) => <div key={h.id}><h3>{h.name}</h3>
        {st.equipment.filter((e) => e.homeId === h.id).map((e) => { const { d, t, refrigerant } = eqInfo(e); const sv = st.services.filter((s) => s.equipmentId === e.id).sort((a, b) => b.date.localeCompare(a.date));
          return (<div key={e.id} className="rep">
            <h4>{e.name}</h4>
            <p className="small">{BRANDS.find((b) => b.id === e.brand)?.label} · Model {e.model} · Serial {e.serial}<br />Est. built {d.ok ? d.year : '—'} · {t ? `${t.tons} ton` : ''} · {refrigerant} · Filter {e.filterSize}<br />
              Warranty to {fmtDate(e.warranty.endDate)} ({e.warranty.registered ? 'registered' : 'not registered'})</p>
            <table><thead><tr><th>Date</th><th>Work</th><th>By</th></tr></thead><tbody>{sv.map((s) => <tr key={s.id}><td>{fmtDate(s.date)}</td><td>{s.work}</td><td>{s.company}</td></tr>)}</tbody></table>
          </div>); })}</div>)}
      {st.agreement && <p className="small">Maintenance agreement: {st.agreement.provider}, since {fmtDate(st.agreement.start)}.</p>}
      <p className="note">Ages and sizes are estimates from the nameplate. Records entered by the homeowner.</p>
    </div></div>);
}

function Replace({ ctx }) {
  const { eq } = ctx; const { d } = eqInfo(eq); const age = d.ok ? d.ageYears : null;
  const [budget, setBudget] = useState(''); const [target, setTarget] = useState(15);
  const yrs = age !== null ? Math.max(1, target - age) : null; const monthly = budget && yrs ? +budget / (yrs * 12) : null;
  return (<>
    <Card title={eq.name}>
      <Row k="Estimated age" v={age !== null ? `About ${age} years` : 'Unknown'} />
      <p>Central systems in our humid climate commonly last somewhere around 12–17+ years, and good maintenance helps. Planning ahead just means no surprises.</p>
      <Field label="Plan for replacement around age"><select value={target} onChange={(e) => setTarget(+e.target.value)}>{[12, 13, 14, 15, 16, 17, 18, 20].map((y) => <option key={y}>{y}</option>)}</select></Field>
      <Field label="Budget amount (ask your tech for a number for your home)"><input inputMode="numeric" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="Enter your budget" /></Field>
      {monthly && <div className="banner ok">Setting aside about <b>{money(Math.round(monthly))}/month</b> for {yrs.toFixed(1)} years reaches your planning budget.</div>}
    </Card>
    <p className="note">This is a personal savings plan, not a recommendation to replace. Your HVAC tech is the best guide to your system’s condition and options.</p>
  </>);
}

/* ---------------- COSTS / CALL HELPER / INSIGHTS (PLUS) ---------------- */
function Settings({ ctx }) {
  const { st, up, plan } = ctx; const tech = st.techReferralCodes.find((c) => c.code === st.user.referredBy);
  return (<>
    <Card title="Profile"><Row k="Name" v={st.user.name} /><Row k="Email" v={st.user.email} /><Row k="Referred by" v={tech ? `${tech.techName} (${tech.code})` : st.user.referredBy || '—'} /></Card>
    <Card title="Cloud account">{ctx.session ? <>
      <Row k="Signed in as" v={ctx.session.user.email} /><Row k="Sync" v={{ ok: 'Saved to cloud ✓', saving: 'Saving…', loading: 'Loading…', ask: 'Waiting for your choice', setup: 'Setup not finished', error: 'Offline — saved on this device' }[ctx.sync.status] || '—'} />
      <button className="btn ghost" onClick={async () => { await supabase.auth.signOut(); if (confirm('Signed out. Also remove your data from this device?')) { localStorage.removeItem(STATE_KEY); location.hash = '/?fresh=1'; location.reload(); } }}>Sign out</button></>
      : <><p className="muted">Sign in to back up your data and use it on any device.</p><button className="btn" onClick={() => ctx.go('auth')}>Sign in / create account</button></>}</Card>
    <Card title="Plan"><Row k="Status" v={plan.label} />
      {!st.plan.subscribed && <button className="btn ghost" onClick={() => up((s) => { s.plan.trialStart = new Date(Date.now() - 61 * 864e5).toISOString(); })}>Demo: simulate trial ended</button>}
      <button className="btn ghost" onClick={() => up((s) => { s.plan = { subscribed: false, trialStart: null, interval: null }; })}>Demo: reset to free (no trial)</button></Card>
    <Card title="For techs: referral codes"><p className="muted">Share your code; homeowners enter it at signup.{REFERRAL.enabled ? '' : ` (Later: ${money(REFERRAL.commissionPerPaidSignup)} per paid signup.)`}</p>
      {st.techReferralCodes.map((c) => <Row key={c.code} k={c.techName} v={c.code} />)}</Card>
    <button className="btn ghost" onClick={() => { up((s) => { s.user.signedUp = false; }); }}>Demo: view signup screen</button>
    <button className="btn ghost" onClick={() => { if (confirm('Erase everything on this device and start with an empty account?')) startFresh(); }}>🧹 Start fresh (empty account)</button>
    <button className="btn ghost danger" onClick={() => { if (confirm('Replace everything with example demo data?')) { localStorage.clear(); location.hash = '/home'; location.reload(); } }}>Load example demo data</button>
    <p className="note center">{APP_NAME} prototype · {ctx.session ? 'synced to your account, cached on this device' : 'data stays on this device'}</p>
  </>);
}

function Signup({ ctx }) {
  const { st, up, go } = ctx; const [f, setF] = useState({ name: st.user.name, email: st.user.email, code: st.user.referredBy || '' });
  const tech = st.techReferralCodes.find((c) => c.code === f.code.trim().toUpperCase());
  return (<>
    <div className="hero"><img className="herologo" src={import.meta.env.BASE_URL + 'logo.png'} alt={APP_NAME} width="200" height="200" /><p>Keep your home’s equipment, service history and reminders in one place.</p></div>
    <Card>
      <Field label="Name"><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
      <Field label="Email"><input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
      <Field label="Referral code (from your tech, optional)"><input value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} autoCapitalize="characters" /></Field>
      {f.code && <p className={tech ? 'okt' : 'muted'}>{tech ? `✓ Referred by ${tech.techName}` : 'Code will be saved as entered.'}</p>}
      <button className="btn" onClick={() => { up((s) => { s.user = { name: f.name, email: f.email, referredBy: f.code.trim().toUpperCase(), signedUp: true }; }); go(st.demo ? 'home' : 'nameplate'); }}>Get started — it’s free</button>
    </Card>
    <button className="link" onClick={() => go('auth')}>Already have an account? Sign in ›</button>
    {st.demo ? <button className="btn ghost" onClick={startFresh}>🧹 Start fresh (empty account)</button>
      : <button className="btn ghost" onClick={() => { localStorage.clear(); location.hash = '/home'; location.reload(); }}>👀 Explore with example demo data</button>}
  </>);
}

const SCREENS = { scan: TagScan, qr: QrLabel, home: Home, equipment: Equipment, nameplate: Nameplate, log: Log, addlog: AddLog, filter: Filter, agreement: Agreement, plus: Plus,
  bills: Bills, reorder: Reorder, beforecall: CallHelper, tips: Bills, warranty: Warranty, homes: Homes, report: Report, replace: Replace,
  company: Company, callhelper: CallHelper, insights: Insights, settings: Settings, signup: Signup, paywall: Paywall, auth: Auth };

/* ---------------- SIGN IN (magic link or email + password) ---------------- */
function Auth({ ctx }) {
  const { session, go } = ctx; const [f, setF] = useState({ email: '', pw: '' }); const [msg, setMsg] = useState(null); const [busy, setBusy] = useState(false);
  const run = async (fn) => { setBusy(true); setMsg(null); try { const { error, data } = await fn(); if (error) throw error; return data; } catch (e) { setMsg({ k: 'danger', t: e.message }); } finally { setBusy(false); } };
  if (session) return <Card title="You’re signed in"><p>{session.user.email}</p><button className="btn" onClick={() => go('home')}>Continue</button></Card>;
  const email = f.email.trim();
  return (<>
    <Card title="Sign in or create an account">
      <Field label="Email"><input type="email" autoComplete="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
      <button className="btn" disabled={busy || !email} onClick={async () => { if (await run(() => supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectUrl() } })) !== undefined) setMsg({ k: 'ok', t: `Check ${email} for a sign-in link. Open it on this device.` }); }}>✉️ Email me a sign-in link</button>
      <p className="muted small center">— or use a password —</p>
      <Field label="Password (8+ characters)"><input type="password" autoComplete="current-password" value={f.pw} onChange={(e) => setF({ ...f, pw: e.target.value })} /></Field>
      <div className="two">
        <button className="btn ghost" disabled={busy || !email || f.pw.length < 8} onClick={async () => { const d = await run(() => supabase.auth.signInWithPassword({ email, password: f.pw })); if (d?.session) go('home'); }}>Sign in</button>
        <button className="btn ghost" disabled={busy || !email || f.pw.length < 8} onClick={async () => { const d = await run(() => supabase.auth.signUp({ email, password: f.pw, options: { emailRedirectTo: redirectUrl() } })); if (d) { if (d.session) go('home'); else setMsg({ k: 'ok', t: `Almost done — confirm your email from the link we sent to ${email}.` }); } }}>Create account</button>
      </div>
      {msg && <div className={'banner ' + msg.k}>{msg.t}</div>}
    </Card>
    <p className="note center">No account needed to try {APP_NAME} — <a href="#/home">keep using it on this device</a>.</p>
  </>);
}

function startFresh() { localStorage.setItem(STATE_KEY, JSON.stringify(makeEmpty())); location.hash = '/signup'; location.reload(); }

/* ---------------- DATA TAG SCAN (FREE) ---------------- */
function TagScan({ ctx, param }) {
  const { st, up, go } = ctx; const e = st.equipment.find((x) => x.id === param) || ctx.eq;
  const [img, setImg] = useState(''); const [busy, setBusy] = useState(0); const [err, setErr] = useState('');
  const [f, setF] = useState(null);
  const read = async (src) => {
    setImg(src); setErr(''); setF(null); setBusy(1);
    try {
      const { default: Tesseract } = await import('tesseract.js');   // loaded only when used; OCR runs in the browser
      const r = await Tesseract.recognize(src, 'eng', { logger: (m) => m.status === 'recognizing text' && setBusy(Math.max(1, Math.round(m.progress * 100))) });
      const p = parseTag(r.data.text);
      if (!p.found) setErr('We couldn’t read a model or serial number. Try a closer, straight-on photo, or type them below.');
      setF({ brand: p.brand, model: p.model, serial: p.serial, raw: r.data.text });
    } catch (x) { setErr('Reading the photo didn’t work on this device. Please type the numbers below.'); setF({ brand: e.brand, model: '', serial: '' }); }
    setBusy(0);
  };
  const file = (ev) => { const fl = ev.target.files?.[0]; if (fl) { const r = new FileReader(); r.onload = () => read(r.result); r.readAsDataURL(fl); } };
  const d = f ? decodeSerial(f.brand, f.serial) : null;
  return (<>
    <Card title="Photo of the data tag">
      <p className="muted">The data tag is the metal or sticker label on the side of the outdoor unit (or inside the furnace closet door area). Take the photo from outside the unit — no need to open anything.</p>
      <label className="btn">📷 Take or upload a photo<input type="file" accept="image/*" capture="environment" onChange={file} hidden /></label>
      <button className="btn ghost" onClick={() => read(`${import.meta.env.BASE_URL}example-tag.png`)}>Try with an example tag</button>
      {img && <img className="tagimg" src={img} alt="Data tag" />}
      {busy > 0 && <p className="muted">Reading the tag… {busy > 1 ? busy + '%' : ''} (runs on your phone, first time may take a moment)</p>}
      {err && <div className="banner warn">{err}</div>}
      {!f && !busy && <button className="link" onClick={() => setF({ brand: e.brand, model: e.model, serial: e.serial })}>Or type them in instead ›</button>}
    </Card>
    {f && <Card title="Check these match your tag">
      <div className="banner warn">Photos can be misread (0/O, 1/I, 5/S, 8/B). Compare each one with the tag and fix anything that’s off before saving.</div>
      <Field label="Brand"><select value={f.brand} onChange={(ev) => setF({ ...f, brand: ev.target.value })}>{BRANDS.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}</select></Field>
      <Field label="Model number"><input value={f.model} onChange={(ev) => setF({ ...f, model: ev.target.value.toUpperCase() })} /></Field>
      <Field label="Serial number"><input value={f.serial} onChange={(ev) => setF({ ...f, serial: ev.target.value.toUpperCase() })} /></Field>
      {d && <p className="muted small">{d.ok ? `Looks like it was built around ${MONTHS_S[d.month - 1]} ${d.year} (estimate).` : 'Age can’t be estimated from this serial yet.'}</p>}
      <button className="btn" disabled={!f.model && !f.serial} onClick={() => { up((s) => { const x = s.equipment.find((q) => q.id === e.id); x.brand = f.brand; x.model = f.model; x.serial = f.serial; }); go('nameplate', e.id); }}>Save to “{e.name}”</button>
    </Card>}
  </>);
}
const MONTHS_S = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

/* ---------------- UNIT QR LABEL (PLUS) ---------------- */
function QrLabel({ ctx, param }) {
  const { st, up } = ctx; const e = st.equipment.find((x) => x.id === param) || ctx.eq; const [svg, setSvg] = useState(''); const [png, setPng] = useState('');
  useEffect(() => { if (!e.unitId) up((s) => { s.equipment.find((x) => x.id === e.id).unitId = 'U' + uid() + uid(); }); }, [e.id]);
  const live = !!ctx.session && ['ok', 'saving'].includes(ctx.sync.status);
  const snap = e.unitId ? makeSnapshot(e, st.services) : null; const url = snap ? (live ? liveUnitUrl(e.unitId) : unitUrl(snap)) : '';
  useEffect(() => { if (url) { QRCode.toString(url, { type: 'svg', errorCorrectionLevel: 'L', margin: 1 }).then(setSvg); QRCode.toDataURL(url, { errorCorrectionLevel: 'L', margin: 2, width: 900 }).then(setPng); } }, [url]);
  if (!snap) return null; const { d } = eqInfo(e);
  return (<>
    <div className="qrlabel printarea">
      <div className="qrhead">⌂ {APP_NAME} · Unit history</div>
      <div className="qr" dangerouslySetInnerHTML={{ __html: svg }} />
      <p className="qrsub"><b>{BRANDS.find((b) => b.id === e.brand)?.label.split(' /')[0]}</b> · {e.model}<br />S/N {e.serial}{d.ok ? ` · built ~${d.year}` : ''}</p>
      <p className="qrnote">Scan for this unit’s service history{live ? '' : ` · Data as of ${fmtDate(snap.a)}`}</p>
    </div>
    <div className="two noprint"><button className="btn" onClick={() => window.print()}>🖨️ Print</button><a className="btn ghost" href={png} download={`homeownly-unit-${e.unitId}.png`}>⬇️ Download</a></div>
    <Card><p>📌 <b>Stick this on your unit</b> (outdoor unit side panel or near the indoor unit) so any tech can see the history.</p>
      {live ? <p className="muted small">✓ Live label — scanning it always shows the latest history from your account. No need to reprint.</p>
        : <p className="muted small">The label holds a snapshot of the {snap.h.length} most recent visits, as of today. <b>Reprint it after new service visits</b> so it stays current. <button className="link" onClick={() => ctx.go('auth')}>Sign in for a live label that updates itself ›</button></p>}
      <p className="muted small">Techs see equipment info and service history only — never your name, address, costs or notes.</p>
      {!live && <p className="muted small">Link length: {url.length} characters.</p>}</Card>
  </>);
}

/* ---------------- #/unit (read-only, outside the app shell) ---------------- */
function UnitPage({ st, up, param }) {
  const legacy = decodeSnapshot(param || ''); const isLegacy = !!(legacy && legacy.u);
  const [remote, setRemote] = useState(isLegacy ? null : 'loading');
  useEffect(() => { if (isLegacy || !param) return; cloud.getUnit(param).then((r) => setRemote(r ? { ...r.snapshot, a: r.updated_at.slice(0, 10) } : 'none'), (e) => setRemote(e instanceof SetupMissing ? 'setup' : 'error')); }, [param]);
  const snap = isLegacy ? legacy : (typeof remote === 'object' ? remote : null);
  const unitId = isLegacy ? legacy.u : param;
  const mine = unitId && st?.equipment.find((e) => e.unitId && e.unitId === unitId);
  useEffect(() => { if (mine && st.user.signedUp) { up((s) => ({ ...s, activeEquipmentId: mine.id })); location.replace('#/log'); } }, []);
  if (mine && st.user.signedUp) return null;
  const app = location.pathname;
  if (!snap) return <div className="app"><header className="top"><img className="logo" src={import.meta.env.BASE_URL + 'icon-192.png'} alt="" width="32" height="32" /><h1>Unit History</h1></header><main><Card><p>{
    { loading: 'Looking up this unit…', setup: 'Unit lookup isn’t set up yet. Please try again later.', error: 'Couldn’t reach the server. Check your connection and try again.', none: 'No history has been shared for this unit yet.' }[remote] || 'This label couldn’t be read. Ask the owner to reprint it.'}</p></Card></main></div>;
  const d = decodeSerial(snap.b, snap.s); const t = decodeTonnage(snap.m); const age = Math.floor((Date.now() - new Date(snap.a + 'T12:00')) / 864e5);
  const parts = [...new Set(snap.h.flatMap(([, w]) => (w.match(PART_RE) || []).map((p) => p.toLowerCase())))];
  return (<div className="app"><header className="top"><img className="logo" src={import.meta.env.BASE_URL + 'icon-192.png'} alt="" width="32" height="32" /><h1>Unit History</h1><span className="pill">READ-ONLY</span></header>
    <main>
      {snap.live ? <div className="banner ok">Live history · last updated <b>{fmtDate(snap.a)}</b>.</div>
        : <div className={'banner ' + (age > 90 ? 'warn' : 'ok')}>Data as of <b>{fmtDate(snap.a)}</b>{age > 90 ? ` (${Math.floor(age / 30)} months ago) — newer visits may not be shown.` : '.'}</div>}
      <Card title="Equipment">
        <Row k="Brand" v={BRANDS.find((b) => b.id === snap.b)?.label || '—'} /><Row k="Model" v={snap.m || '—'} /><Row k="Serial" v={snap.s || '—'} />
        <Row k="Built (est.)" v={d.ok ? `${MONTHS_S[d.month - 1]} ${d.year}` : '—'} /><Row k="Age (est.)" v={d.ok ? `about ${Math.floor(d.ageYears)} years` : '—'} />
        <Row k="Size (est.)" v={t ? `${t.tons} ton` : '—'} />{snap.i && <Row k="Installed" v={fmtDate(snap.i)} />}
      </Card>
      {parts.length > 0 && <Card title="Parts mentioned"><div className="chips">{parts.map((p) => <span key={p} className="chip">{p}</span>)}</div></Card>}
      <Card title={`Service history (${snap.h.length}${snap.n > snap.h.length ? ` most recent of ${snap.n}` : ''})`}>{snap.h.length ? snap.h.map(([dt, w, c], i) => <div key={i} className="log"><div><b>{w}</b><small>{fmtDate(dt)} · {c}</small></div></div>) : <p className="muted">No visits recorded yet.</p>}</Card>
      <p className="note">Entered by the homeowner. Estimates come from public serial-number patterns. Owner contact details, costs and notes are never included.</p>
      <p className="center small"><a href={st ? `${app}#/signup` : `${app}#/?fresh=1`}>Made with {APP_NAME}</a></p>
    </main></div>);
}
