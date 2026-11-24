// Renders the public website. Everything is built from site/content.js; nothing from visitors is ever shown.
const { contact, places, dest, tours, ui } = require('./content');
const { scene, panorama } = require('./scenes');
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = n => '$' + n.toLocaleString('en-US');

const CSS = `
:root{--ink:#12323a;--soft:#4b6368;--paper:#fffaf0;--card:#fff;--line:#e5d8bf;--river:#1f6f78;--clay:#a94a24;--sand:#f7e7c8;--focus:#1f6f78}
*{box-sizing:border-box}html{scroll-behavior:smooth}
body{margin:0;background:var(--paper);color:var(--ink);font:17px/1.65 "Readex Pro",Tahoma,Arial,sans-serif;font-weight:300}
h1,h2,h3,.brand{font-family:"El Messiri","Readex Pro",Georgia,serif;line-height:1.18;font-weight:600;text-wrap:balance;margin:0}
h1{font-size:clamp(2.1rem,5.4vw,4rem)}h2{font-size:clamp(1.6rem,3.2vw,2.4rem)}h3{font-size:1.2rem}
p{margin:0;max-width:62ch}a{color:inherit}svg{display:block;width:100%;height:100%}
.wrap{width:min(1160px,100% - 40px);margin-inline:auto}
.skip{position:absolute;inset-inline-start:-999px}.skip:focus{inset-inline-start:12px;top:12px;background:#fff;padding:8px 12px;z-index:9}
:focus-visible{outline:3px solid var(--focus);outline-offset:3px;border-radius:4px}
header{border-bottom:1px solid var(--line)}
.bar{display:flex;align-items:center;gap:8px 26px;flex-wrap:wrap;padding:14px 0}
.brand{font-size:1.45rem;text-decoration:none;margin-inline-end:auto}
nav{display:flex;gap:6px 22px;flex-wrap:wrap;align-items:center}nav a{text-decoration:none;padding:4px 0}nav a:hover,nav a[aria-current]{text-decoration:underline;text-underline-offset:6px;text-decoration-thickness:2px}
.btn{display:inline-block;border:0;background:var(--clay);color:#fff;font:inherit;font-weight:500;padding:12px 22px;border-radius:6px;text-decoration:none;cursor:pointer}.btn:hover{background:#8d3b1b}.btn:disabled{opacity:.6;cursor:default}
nav .btn{padding:8px 16px}
.hero{background:var(--sand)}.hero .top{padding:clamp(36px,6vw,76px) 0 0;display:grid;gap:18px}.hero p{font-size:1.15rem}.hero .pan{height:clamp(200px,34vw,460px);margin-top:10px}
.mad{display:flex;flex-wrap:wrap;gap:10px 12px;align-items:center;font-size:clamp(1.05rem,2vw,1.35rem);margin-top:8px}
.mad select,.mad input{font:inherit;color:var(--ink);background:var(--paper);border:0;border-bottom:3px solid var(--clay);padding:4px 8px;border-radius:4px 4px 0 0}.mad input{width:4.2em}
section{padding:clamp(44px,7vw,88px) 0}.head{display:grid;gap:10px;margin-bottom:30px}
.pk{display:grid;border-top:1px solid var(--line)}
.pk a{display:grid;grid-template-columns:170px 1fr auto;gap:8px 26px;align-items:center;padding:18px 0;border-bottom:1px solid var(--line);text-decoration:none}.pk .pic{height:112px;border-radius:6px;overflow:hidden}
.pk a:hover h3,.cards a:hover h3{text-decoration:underline;text-underline-offset:5px}
.stopline{color:var(--soft);font-size:.95rem}.price{font-weight:500;white-space:nowrap}.price small{display:block;font-weight:300;color:var(--soft);font-size:.85rem}
.cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:26px 22px}.cards a{text-decoration:none;display:grid;gap:8px;align-content:start}.cards .pic{aspect-ratio:4/3;border-radius:6px;overflow:hidden}
.filters{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:26px}.filters a{border:1px solid var(--line);background:var(--card);border-radius:6px;padding:6px 14px;text-decoration:none}.filters a[aria-current]{background:var(--ink);color:#fff;border-color:var(--ink)}
.river{background:var(--river);color:#fff}.river .stopline{color:#d9ece9}.steps{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:28px;counter-reset:s}.steps li{list-style:none;border-top:2px solid #8cc4bd;padding-top:14px}.steps{padding:0;margin:0}
.svc{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:30px 34px}.svc div{border-top:2px solid var(--clay);padding-top:12px}
.tour{display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:34px 56px;align-items:start}.tour .pic{height:clamp(220px,34vw,400px);border-radius:8px;overflow:hidden;margin-bottom:26px}
.way{list-style:none;margin:22px 0 0;padding:0}.way>li{position:relative;padding-inline-start:44px;padding-bottom:26px}
.way>li:before{content:"";position:absolute;inset-inline-start:11px;top:8px;bottom:-8px;width:4px;background:var(--river);border-radius:2px}.way>li:last-child:before{display:none}
.way>li:after{content:"";position:absolute;inset-inline-start:3px;top:6px;width:20px;height:20px;border-radius:50%;background:var(--paper);border:5px solid var(--clay)}
.way .d{font-size:.9rem;color:var(--soft)}.way .s{margin-top:8px}.way .s b{font-weight:500}
.side{position:sticky;top:20px;background:var(--card);border:1px solid var(--line);border-radius:8px;padding:22px;display:grid;gap:14px}[dir=rtl] .side .big{text-align:right}.side .big{display:block;font-size:1.9rem;font-family:"El Messiri",serif}.side p{font-size:.92rem;color:var(--soft)}
form.rq{display:grid;gap:18px;max-width:720px}.two{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:18px}
.rq label{display:grid;gap:6px;font-weight:500;font-size:.95rem}.rq input,.rq select,.rq textarea{font:inherit;font-weight:300;padding:11px 12px;border:1px solid #bda98a;border-radius:6px;background:#fff;color:var(--ink);width:100%}
.rq .ok{display:flex;gap:10px;align-items:flex-start;font-weight:300}.rq .ok input{width:auto;margin-top:7px}.hp{position:absolute;left:-9999px}.err{color:#9c1c10;min-height:1.6em;font-weight:500}
.done{background:var(--sand);border-radius:8px;padding:28px;display:grid;gap:8px;max-width:720px}.done b{font-size:1.4rem;direction:ltr;unicode-bidi:isolate}
footer{background:var(--ink);color:#e9f0ee;padding:40px 0;font-size:.95rem}footer .bar{align-items:flex-start;gap:24px 60px}footer a{color:#fff}.ltr{direction:ltr;unicode-bidi:isolate;display:inline-block}
@media(max-width:820px){.tour{grid-template-columns:1fr}.side{position:static}.pk a{grid-template-columns:96px 1fr}.pk .pic{height:84px}.pk .price{grid-column:2}}
@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
:root{color-scheme:light}[hidden]{display:none!important}`;

const FORM_JS = `(()=>{const f=document.getElementById('rq');if(!f)return;const E=JSON.parse(f.dataset.err),b=f.querySelector('button'),e=document.getElementById('err');
const q=new URLSearchParams(location.search);['tour','adults'].forEach(k=>{const x=f.elements[k];if(x&&q.get(k)){const o=x.value;x.value=q.get(k);if(x.tagName==='SELECT'&&!x.value)x.value=o}});
const D=JSON.parse(f.dataset.dest),m=[];if(D[q.get('to')])m.push(D[q.get('to')]);if(/^\\d{1,2}$/.test(q.get('days')||''))m.push(q.get('days')+' '+f.dataset.days);if(m.length&&!f.elements.msg.value)f.elements.msg.value=m.join(' · ');
f.addEventListener('submit',async v=>{v.preventDefault();e.textContent='';const d=Object.fromEntries(new FormData(f));d.ok=f.elements.ok.checked;d.lang=document.documentElement.lang;b.disabled=true;const t=b.textContent;b.textContent=f.dataset.sending;
try{const r=await fetch('/api/site/request',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)});const j=await r.json();if(!r.ok)throw new Error(j.why||j.error);
document.getElementById('ref').textContent=j.ref;f.hidden=true;const x=document.getElementById('done');x.hidden=false;x.focus()}
catch(x){e.textContent=E[x.message]||E.other;const el=f.elements[x.message];if(el&&el.focus)el.focus()}b.disabled=false;b.textContent=t})})()`;

function site(lang, origin) {
  const L = lang === 'ar' ? 1 : 0, t = v => v[L], base = L ? '/ar' : '';
  const url = p => base + (p === '/' ? (L ? '' : '/') : p) || '/';
  const pl = k => places[k];
  const tourUrl = x => url('/tours/' + x.id);
  const stops = x => [...new Set(x.plan.flat())].filter(k => !['arrive', 'depart', 'flycairo'].includes(k));
  const stopLine = (x, n = 5) => stops(x).slice(0, n).map(k => esc(pl(k)[L])).join(L ? '، ' : ', ') + (stops(x).length > n ? '…' : '');
  const len = x => x.kind === 'package' ? (L ? (x.days > 10 ? `${x.days} يومًا` : `${x.days} أيام`) : `${x.days} days`) : t(ui.kinds[x.kind]);

  function page({ path, title, desc, body, now, status, ld }) {
    const full = title ? `${title} · ${t(ui.brand)}` : t(ui.brand), other = (L ? '' : '/ar') + (path === '/' ? (L ? '/' : '') : path);
    const link = (p, k) => `<a href="${url(p)}"${now === p ? ' aria-current="page"' : ''}>${esc(t(ui[k]))}</a>`;
    const alt = status ? '' : `<link rel="canonical" href="${origin}${url(path)}"><link rel="alternate" hreflang="en" href="${origin}${path}"><link rel="alternate" hreflang="ar" href="${origin}/ar${path === '/' ? '' : path}">`;
    return `<!doctype html><html lang="${lang}" dir="${L ? 'rtl' : 'ltr'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(full)}</title><meta name="description" content="${esc(desc)}">${status ? '<meta name="robots" content="noindex">' : alt}<meta property="og:title" content="${esc(full)}"><meta property="og:description" content="${esc(desc)}"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=El+Messiri:wght@500;600&family=Readex+Pro:wght@300;500&display=swap"><style>${CSS}</style>${ld ? `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>` : ''}</head><body>
<a class="skip" href="#main">${L ? 'إلى المحتوى' : 'Skip to content'}</a>
<header><div class="wrap bar"><a class="brand" href="${url('/')}">${esc(t(ui.brand))}</a><nav aria-label="${esc(t(ui.menu))}">${link('/tours', 'tours')}${link('/services', 'services')}${link('/about', 'about')}<a href="${other || '/'}" lang="${L ? 'en' : 'ar'}" hreflang="${L ? 'en' : 'ar'}">${esc(t(ui.other))}</a><a class="btn" href="${url('/request')}">${esc(t(ui.request))}</a></nav></div></header>
<main id="main">${body}</main>
<footer><div class="wrap bar"><div><div class="brand">${esc(t(ui.brand))}</div>${esc(t(ui.licence))} ${contact.licence}</div><div><a class="ltr" href="tel:${contact.phone.replace(/\s/g, '')}">${contact.phone}</a><br><a class="ltr" href="mailto:${contact.email}">${contact.email}</a></div><div><a href="${contact.instagram}" rel="noopener">Instagram</a><br><a href="${contact.facebook}" rel="noopener">Facebook</a></div><div><a href="${url('/privacy')}">${esc(t(ui.prT))}</a><br><a href="/login">${esc(t(ui.staff))}</a></div></div></footer></body></html>`;
  }
  const row = x => `<a href="${tourUrl(x)}"><div class="pic">${scene(x.scene)}</div><div><h3>${esc(t(x.title))}</h3><div class="stopline">${stopLine(x, 7)}</div></div><div class="price"><small>${esc(t(ui.from))}</small><span class="ltr">${money(x.price)}</span></div></a>`;
  const card = x => `<a href="${tourUrl(x)}"><div class="pic">${scene(x.scene)}</div><h3>${esc(t(x.title))}</h3><div class="stopline">${esc(len(x))} · ${esc(t(ui.from))} <span class="ltr">${money(x.price)}</span></div></a>`;
  const how = `<section class="river"><div class="wrap"><div class="head"><h2>${esc(t(ui.howT))}</h2></div><ol class="steps">${ui.how.map(([h, p]) => `<li><h3>${esc(t(h))}</h3><div class="stopline">${esc(t(p))}</div></li>`).join('')}</ol></div></section>`;

  return {
    home() {
      const m = t(ui.mad);
      return page({ path: '/', title: '', desc: t(ui.heroP), body: `<div class="hero"><div class="wrap top"><h1>${esc(t(ui.heroT))}</h1><p>${esc(t(ui.heroP))}</p>
<form class="mad" action="${url('/request')}" method="get"><label for="m1">${esc(m[0])}</label><select id="m1" name="to">${Object.entries(dest).map(([k, v]) => `<option value="${k}">${esc(t(v))}</option>`).join('')}</select><label for="m2">${esc(m[1])}</label><input id="m2" name="days" type="number" min="1" max="30" value="7"><label for="m3">${esc(m[2])}</label><input id="m3" name="adults" type="number" min="1" max="60" value="2"><span>${esc(m[3])}</span><button class="btn">${esc(t(ui.madGo))}</button></form></div><div class="pan">${panorama()}</div></div>
<section><div class="wrap"><div class="head"><h2>${esc(t(ui.pkT))}</h2><p>${esc(t(ui.pkP))}</p></div><div class="pk">${tours.filter(x => x.kind === 'package').slice(0, 5).map(row).join('')}</div></div></section>${how}
<section><div class="wrap"><div class="head"><h2>${esc(t(ui.dyT))}</h2></div><div class="cards">${['half-day-giza-pyramids', 'pyramids-grand-egyptian-museum', 'coptic-islamic-cairo', 'alexandria-day'].map(id => card(tours.find(x => x.id === id))).join('')}</div><p style="margin-top:28px"><a href="${url('/tours')}">${esc(t(ui.allTours))}</a></p></div></section>` });
    },
    tours(kind) {
      const k = ui.kinds[kind] ? kind : '', L2 = tours.filter(x => !k || x.kind === k);
      return page({ path: '/tours', now: '/tours', title: t(ui.tours), desc: t(ui.pkP), body: `<section><div class="wrap"><div class="head"><h1>${esc(t(ui.tours))}</h1></div><div class="filters"><a href="${url('/tours')}"${k ? '' : ' aria-current="true"'}>${esc(t(ui.all))}</a>${Object.entries(ui.kinds).map(([a, v]) => `<a href="${url('/tours')}?kind=${a}"${a === k ? ' aria-current="true"' : ''}>${esc(t(v))}</a>`).join('')}</div><div class="cards">${L2.map(card).join('')}</div></div></section>` });
    },
    tour(id) {
      const x = tours.find(y => y.id === id);
      if (!x) return null;
      const many = x.kind === 'package', st = k => `<div class="s"><b>${esc(pl(k)[L])}</b><br><span class="stopline">${esc(pl(k)[2 + L])}</span></div>`;
      const way = many ? x.plan.map((d, i) => `<li><div class="d">${esc(t(ui.day))} ${i + 1}</div>${d.map(st).join('')}</li>`).join('') : x.plan[0].map(k => `<li>${st(k)}</li>`).join('');
      const near = tours.filter(y => y.id !== id && y.kind === x.kind).sort((a, b) => stops(b).filter(s => stops(x).includes(s)).length - stops(a).filter(s => stops(x).includes(s)).length).slice(0, 3);
      return page({ path: '/tours/' + id, now: '/tours', title: t(x.title), desc: stops(x).map(k => pl(k)[L]).join(', ').slice(0, 155),
        ld: { '@context': 'https://schema.org', '@type': 'TouristTrip', name: t(x.title), provider: { '@type': 'TravelAgency', name: 'Retage Travel' } },
        body: `<section><div class="wrap tour"><div><div class="pic">${scene(x.scene, esc(t(x.title)))}</div><h1>${esc(t(x.title))}</h1><p class="stopline">${esc(len(x))} · ${x.dests.map(d => esc(t(dest[d]))).join(' · ')}</p><h2 style="margin-top:34px">${esc(t(ui.route))}</h2><ol class="way">${way}</ol></div>
<aside class="side"><div>${esc(t(ui.from))}<div class="big ltr">${money(x.price)}</div></div><a class="btn" href="${url('/request')}?tour=${x.id}">${esc(t(ui.ask))}</a><p>${esc(t(ui.priceNote))}</p></aside></div></section>
<section style="padding-top:0"><div class="wrap"><div class="head"><h2>${esc(t(ui.like))}</h2></div><div class="cards">${near.map(card).join('')}</div></div></section>` });
    },
    services() { return page({ path: '/services', now: '/services', title: t(ui.services), desc: t(ui.sv[0][1]), body: `<section><div class="wrap"><div class="head"><h1>${esc(t(ui.svT))}</h1></div><div class="svc">${ui.sv.map(([h, p]) => `<div><h3>${esc(t(h))}</h3><p>${esc(t(p))}</p></div>`).join('')}</div><p style="margin-top:38px"><a class="btn" href="${url('/request')}">${esc(t(ui.request))}</a></p></div></section>${how}` }); },
    about() { return page({ path: '/about', now: '/about', title: t(ui.about), desc: t(ui.ab)[0], body: `<section><div class="wrap"><div class="head"><h1>${esc(t(ui.abT))}</h1>${t(ui.ab).map(p => `<p>${esc(p)}</p>`).join('')}</div></div></section>${how}` }); },
    privacy() { return page({ path: '/privacy', title: t(ui.prT), desc: t(ui.pr)[0], body: `<section><div class="wrap"><div class="head"><h1>${esc(t(ui.prT))}</h1>${t(ui.pr).map(p => `<p>${esc(p)}</p>`).join('')}<p><a class="ltr" href="mailto:${contact.email}">${contact.email}</a></p></div></div></section>` }); },
    request() {
      const f = ui.f, i = (k, a = '') => `<label>${esc(t(f[k]))}<input name="${k}" ${a}></label>`;
      const errs = Object.fromEntries(Object.entries(ui.err).map(([k, v]) => [k, t(v)])), names = Object.fromEntries(Object.entries(dest).map(([k, v]) => [k, t(v)]));
      return page({ path: '/request', title: t(ui.rqT), desc: t(ui.rqP), body: `<section><div class="wrap"><div class="head"><h1>${esc(t(ui.rqT))}</h1><p>${esc(t(ui.rqP))}</p></div>
<form class="rq" id="rq" novalidate data-err="${esc(JSON.stringify(errs))}" data-dest="${esc(JSON.stringify(names))}" data-days="${esc(t(ui.days))}" data-sending="${esc(t(f.sending))}"><div class="two">${i('name', 'autocomplete="name" maxlength="100" required')}${i('email', 'type="email" dir="ltr" autocomplete="email" maxlength="150" required')}</div><div class="two">${i('phone', 'type="tel" dir="ltr" autocomplete="tel" maxlength="40"')}${i('country', 'autocomplete="country-name" maxlength="60"')}</div>
<label>${esc(t(f.tour))}<select name="tour"><option value="">${esc(t(f.none))}</option>${Object.entries(ui.kinds).map(([k, v]) => `<optgroup label="${esc(t(v))}">${tours.filter(x => x.kind === k).map(x => `<option value="${x.id}">${esc(t(x.title))}</option>`).join('')}</optgroup>`).join('')}</select></label>
<div class="two">${i('date', 'type="date"')}${i('adults', 'type="number" min="1" max="200" value="2"')}${i('children', 'type="number" min="0" max="100" value="0"')}</div><label>${esc(t(f.msg))}<textarea name="msg" rows="5" maxlength="3000" required></textarea></label><div class="hp" aria-hidden="true"><label>Website<input name="website" tabindex="-1" autocomplete="off"></label></div>
<label class="ok"><input type="checkbox" name="ok"><span>${esc(t(f.ok))} <a href="${url('/privacy')}">${esc(t(ui.prT))}</a></span></label><div class="err" id="err" role="alert"></div><div><button class="btn">${esc(t(f.send))}</button></div></form>
<div class="done" id="done" tabindex="-1" hidden><h2>${esc(t(ui.done))}</h2><div>${esc(t(ui.doneP))} <b id="ref"></b></div><div>${esc(t(ui.doneQ))}</div></div></div></section><script>${FORM_JS}</script>` });
    },
    missing() { return page({ path: '/', status: 404, title: t(ui.nf), desc: '', body: `<section><div class="wrap head"><h1>${esc(t(ui.nf))}</h1><p><a href="${url('/')}">${esc(t(ui.home))}</a></p></div></section>` }); }
  };
}

// Returns { status, html } for a public address, or null when the address is not the website's.
function route(path, query, origin) {
  const ar = path === '/ar' || path.startsWith('/ar/'), p = (ar ? path.slice(3) : path) || '/', s = site(ar ? 'ar' : 'en', origin);
  const fixed = { '/': s.home, '/services': s.services, '/about': s.about, '/privacy': s.privacy, '/request': s.request };
  if (Object.prototype.hasOwnProperty.call(fixed, p)) return { status: 200, html: fixed[p]() };
  if (p === '/tours') return { status: 200, html: s.tours(query.get('kind') || '') };
  const m = p.match(/^\/tours\/([a-z0-9-]{1,80})$/), html = m && s.tour(m[1]);
  if (html) return { status: 200, html };
  return { status: 404, html: s.missing() };
}
const sitemap = origin => `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${['/', '/tours', '/services', '/about', '/request', '/privacy', ...tours.map(x => '/tours/' + x.id)].flatMap(p => [p, '/ar' + (p === '/' ? '' : p)]).map(p => `<url><loc>${origin}${p}</loc></url>`).join('')}</urlset>`;
module.exports = { route, sitemap, tours };
