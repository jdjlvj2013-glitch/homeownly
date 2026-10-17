// "Where's the data tag?" — generic line drawings (no brands/photos). Theme: green #006C43 on cream.
import React, { useState } from 'react';
const G = '#006C43', C = '#FFF7EA', T = '#E0A800';
const Tag = ({ x, y, w = 22, h = 14 }) => <><rect x={x} y={y} width={w} height={h} rx="2" fill={T} stroke={G} strokeWidth="1.5" /><line x1={x + 4} y1={y + 5} x2={x + w - 4} y2={y + 5} stroke={G} /><line x1={x + 4} y1={y + 9} x2={x + w - 7} y2={y + 9} stroke={G} /></>;
const Arrow = ({ x, y }) => <path d={`M${x - 26} ${y - 22} L${x - 4} ${y - 3}`} stroke={G} strokeWidth="2" markerEnd="url(#ah)" fill="none" />;
const Defs = () => <defs><marker id="ah" markerUnits="userSpaceOnUse" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto"><path d="M0,0 L9,4.5 L0,9 z" fill={G} /></marker></defs>;
const svgP = { viewBox: '0 0 160 130', width: '100%', role: 'img', style: { maxWidth: 220, display: 'block', margin: '0 auto', background: C, borderRadius: 12 } };

export const Outdoor = () => (<svg {...svgP} aria-label="Outdoor unit with tag on the side panel near the service corner"><Defs />
  <rect x="25" y="30" width="95" height="80" rx="6" fill="#fff" stroke={G} strokeWidth="2.5" />
  {[0, 1, 2, 3, 4, 5, 6].map((i) => <line key={i} x1="35" y1={42 + i * 9} x2="95" y2={42 + i * 9} stroke={G} strokeOpacity=".35" />)}
  <circle cx="65" cy="70" r="22" fill="none" stroke={G} strokeWidth="1.5" strokeOpacity=".6" />
  <rect x="100" y="36" width="20" height="44" fill="#eef6f1" stroke={G} strokeWidth="1.5" /><text x="110" y="24" fontSize="7" textAnchor="middle" fill={G}>service panel</text>
  <line x1="120" y1="92" x2="145" y2="92" stroke={G} strokeWidth="3" /><line x1="120" y1="100" x2="145" y2="100" stroke={G} strokeWidth="3" />
  <Tag x={101} y={58} w={18} /><Arrow x={100} y={60} />
  <rect x="20" y="110" width="105" height="6" fill={G} fillOpacity=".25" /></svg>);

export const Furnace = () => (<svg {...svgP} aria-label="Furnace with tag inside the lower blower door or on the cabinet side"><Defs />
  <rect x="45" y="10" width="70" height="112" rx="4" fill="#fff" stroke={G} strokeWidth="2.5" />
  <line x1="45" y1="60" x2="115" y2="60" stroke={G} strokeWidth="1.5" /><text x="80" y="38" fontSize="8" textAnchor="middle" fill={G}>burner door</text>
  <rect x="52" y="66" width="56" height="50" rx="2" fill="#eef6f1" stroke={G} strokeWidth="1.5" strokeDasharray="4 2" /><text x="80" y="110" fontSize="7" textAnchor="middle" fill={G}>blower door</text>
  <Tag x={69} y={78} /><Arrow x={70} y={80} />
  <path d="M115 22 L130 14 L130 112 L115 122" fill="none" stroke={G} strokeWidth="1.5" strokeOpacity=".6" /><Tag x={117} y={44} w={12} h={18} /></svg>);

export const AirHandler = () => (<svg {...svgP} aria-label="Air handler with tag on the access panel or cabinet side"><Defs />
  <rect x="50" y="8" width="62" height="114" rx="4" fill="#fff" stroke={G} strokeWidth="2.5" />
  <rect x="56" y="16" width="50" height="48" rx="2" fill="#eef6f1" stroke={G} strokeWidth="1.5" /><text x="81" y="58" fontSize="7" textAnchor="middle" fill={G}>access panel</text>
  <rect x="56" y="70" width="50" height="46" rx="2" fill="none" stroke={G} strokeWidth="1.5" strokeOpacity=".6" />
  <Tag x={70} y={28} /><Arrow x={71} y={30} />
  <path d="M112 18 L126 12 L126 112 L112 122" fill="none" stroke={G} strokeWidth="1.5" strokeOpacity=".6" /><Tag x={114} y={70} w={11} h={18} />
  <line x1="40" y1="122" x2="122" y2="122" stroke={G} strokeOpacity=".3" strokeWidth="4" /></svg>);

const ITEMS = {
  outdoor: [Outdoor, 'Outdoor AC / heat pump', 'On a side panel, usually near the corner with the electrical box and the copper service valves. Sometimes on or behind the small service panel.'],
  furnace: [Furnace, 'Gas furnace', 'Inside the lower blower door, or on the side of the cabinet. Look only — don’t remove panels with the power on.'],
  airhandler: [AirHandler, 'Air handler / fan coil', 'On the front access panel or the side of the cabinet, sometimes on the inside of the door.'],
};
// which: 'outdoor' | 'indoor' (shows furnace + air handler) | indoor type
export default function TagHelp({ which = 'outdoor', open: o = false }) {
  const [open, setOpen] = useState(o);
  const keys = which === 'outdoor' ? ['outdoor'] : which === 'furnace' ? ['furnace'] : which === 'airhandler' || which === 'fancoil' ? ['airhandler'] : ['furnace', 'airhandler'];
  return (<div className="taghelp">
    <button className="link" onClick={() => setOpen(!open)}>{open ? '▾' : '▸'} Where’s the data tag?</button>
    {open && <div>
      {keys.map((k) => { const [Pic, title, cap] = ITEMS[k]; return <figure key={k} className="tagfig"><Pic /><figcaption><b>{title}</b><br />{cap}</figcaption></figure>; })}
      <p className="muted small">Tags may be in a different spot on your model.</p>
      <div className="banner warn small">🔌 Most tags can be read without opening anything. Don’t open any panel unless the power to that unit is turned off first.</div>
    </div>}
  </div>);
}
