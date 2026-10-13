/* Al-Ba Cook utalványrendszer: közös adatok és segédek (bolt + CRM).
   Tesztüzem: az adatok a böngészőben (localStorage) tárolódnak, valódi fizetés, számla és e-mail nincs. */
(function(){
const TEMA_AR = 18000, PAROS_AR = 36000; // Alexszel véglegesítendő
const ISSUERS = { mag:{name:"Ambrus Alex EV", key:"AAE"}, ceg:{name:"Mastercook Kft", key:"MCK"} };
const PRODUCTS = [
  {id:"v5",  kind:"ertek", name:"5 000 Ft értékutalvány",  price:5000,  img:"img/Altalanos_01_5000.jpg", tpl:"strip"},
  {id:"v10", kind:"ertek", name:"10 000 Ft értékutalvány", price:10000, img:"img/Altalanos_01_10000.jpg", tpl:"strip"},
  {id:"v15", kind:"ertek", name:"15 000 Ft értékutalvány", price:15000, img:"img/Altalanos_01_15000.jpg", tpl:"strip"},
  {id:"v18", kind:"ertek", name:"18 000 Ft értékutalvány", price:18000, img:"img/18ezer.jpg", tpl:"lines"},
  {id:"v20", kind:"ertek", name:"20 000 Ft értékutalvány", price:20000, img:"img/Altalanos_01_20000_1.jpg", tpl:"strip"},
  {id:"steak", kind:"tema", cat:"fozes", name:"Steak sütő", price:TEMA_AR, img:"img/Steak_01.jpg", tpl:"strip"},
  {id:"sushi", kind:"tema", cat:"fozes", name:"Sushi", price:TEMA_AR, img:"img/Sushi_01.jpg", tpl:"strip"},
  {id:"tavol", kind:"tema", cat:"fozes", name:"Távol-Kelet ízei", price:TEMA_AR, img:"img/Tavol_Kelet_izei_01.jpg", tpl:"strip"},
  {id:"thai", kind:"tema", cat:"fozes", name:"Thai food", price:TEMA_AR, img:"img/ThaiFood_01.jpg", tpl:"strip"},
  {id:"olasz", kind:"tema", cat:"fozes", name:"Olasz tészta", price:TEMA_AR, img:"img/OlaszTeszta_01.jpg", tpl:"strip"},
  {id:"burger", kind:"tema", cat:"fozes", name:"Burger mánia", price:TEMA_AR, img:"img/BurgerMania_01.jpg", tpl:"strip"},
  {id:"kozel", kind:"tema", cat:"fozes", name:"Közel-Kelet ízei", price:TEMA_AR, img:"img/altalanos_osszegbeiros.jpg", tpl:"blank"},
  {id:"mex", kind:"tema", cat:"fozes", name:"Mexikói", price:TEMA_AR, img:"img/altalanos_osszegbeiros.jpg", tpl:"blank"},
  {id:"paros", kind:"tema", cat:"fozes", name:"Páros tanfolyam (2 fő)", price:PAROS_AR, img:"img/Paros_tanfolyam_01.jpg", tpl:"strip"},
  {id:"torta", kind:"tema", cat:"cukrasz", name:"Alap torta", price:TEMA_AR, img:"img/AlapTorta_01.jpg", tpl:"strip"},
  {id:"sajt", kind:"tema", cat:"cukrasz", name:"Sajttorta", price:TEMA_AR, img:"img/Sajttorta_01.jpg", tpl:"strip"},
  {id:"macaron", kind:"tema", cat:"cukrasz", name:"Macaron sütő", price:TEMA_AR, img:"img/Macaron_01.jpg", tpl:"strip"},
  {id:"bonbon", kind:"tema", cat:"cukrasz", name:"Bonbon", price:TEMA_AR, img:"img/Bonbon_01.jpg", tpl:"strip"},
  {id:"pite", kind:"tema", cat:"cukrasz", name:"Pite", price:TEMA_AR, img:"img/Pite_01.jpg", tpl:"strip"},
  {id:"keksz", kind:"tema", cat:"cukrasz", name:"Alkalmi keksz", price:TEMA_AR, img:"img/AlkalmiKeksz_01.jpg", tpl:"strip"}
];
const P = Object.fromEntries(PRODUCTS.map(p=>[p.id,p]));

const pad = n=>String(n).padStart(2,"0");
const ft = n=>String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g," ")+" Ft";
const iso = d=>d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());
const parse = s=>{ if(s instanceof Date) return s; const [y,m,d]=String(s).slice(0,10).split("-").map(Number); return new Date(y,m-1,d,12); };
const huDate = d=>{d=parse(d); return d.getFullYear()+". "+pad(d.getMonth()+1)+". "+pad(d.getDate())+".";};
const hm = t=>{t=new Date(t); return pad(t.getHours())+":"+pad(t.getMinutes())+":"+pad(t.getSeconds());};
function addMonths(d,m){d=parse(d);const r=new Date(d.getFullYear(),d.getMonth()+m,1,12);const last=new Date(r.getFullYear(),r.getMonth()+1,0).getDate();r.setDate(Math.min(d.getDate(),last));return r}
const expiryOf = d=>addMonths(d,6);
function reminders(buy){const exp=expiryOf(buy);return [addMonths(buy,2), new Date(exp.getFullYear(),exp.getMonth()-1,1,12)]}
function extFee(exp,today){exp=parse(exp); if(today<=exp)return {months:0,fee:0}; let m=0; while(addMonths(exp,m)<today)m++; return {months:m,fee:m*5000}}
const esc = s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
function today(){ try{const s=sessionStorage.getItem("albacook-today"); if(s) return parse(s);}catch(e){} const t=new Date(); t.setHours(12,0,0,0); return t; }

/* ---- tároló ---- */
const KEY="albacook-db-v1";
function sampleDB(){
  const o=(id,inv,buyer,b,cmail,rname,rmail,buy,items,pay,extra={})=>{
    const total=items.reduce((s,i)=>s+P[i.pid].price*i.q,0), n=items.reduce((s,i)=>s+i.q,0); let k=0; const vouchers=[];
    items.forEach(i=>{for(let j=0;j<i.q;j++){k++;vouchers.push({serial:n>1?inv+"/"+k:inv,pid:i.pid,value:P[i.pid].price,status:"active"})}});
    return Object.assign({id,created:buy+"T10:12:00",buyerType:b,issuer:ISSUERS[b].name,invoice:inv,status:"paid",items,total,cname:buyer,cmail,rname,rmail,direct:false,msg:"",pay,buy,vouchers,log:[]},extra);
  };
  const orders=[
    o("R-1001","AAE-2025-0201","Szabó Gábor","mag","gabor.szabo@example.hu","Szabó Eszter","eszter.szabo@example.hu","2025-12-18",[{pid:"steak",q:1}],"card"),
    o("R-1002","AAE-2025-0207","Tóth Judit","mag","judit.toth@example.hu","Tóth Bence","bence.toth@example.hu","2025-12-21",[{pid:"v10",q:2}],"apple"),
    o("R-1003","MCK-2026-0009","Példa Bau Kft","ceg","iroda@peldabau.example","Kiss Márton","marton.kiss@example.hu","2026-05-30",[{pid:"paros",q:1}],"transfer"),
    o("R-1004","AAE-2026-0031","Varga Nóra","mag","nora.varga@example.hu","Varga Nóra","nora.varga@example.hu","2026-07-02",[{pid:"macaron",q:1}],"card"),
    o("R-1005","AAE-2026-0044","Molnár Ádám","mag","adam.molnar@example.hu","Fekete Réka","reka.fekete@example.hu","2026-09-14",[{pid:"sushi",q:1}],"google")
  ];
  orders[1].vouchers[0].status="used"; orders[1].vouchers[0].usedAt="2026-03-07";
  return {orders, counters:{AAE:48, MCK:12, R:1006, DB:7}};
}
function load(){ try{const s=localStorage.getItem(KEY); if(s) return JSON.parse(s);}catch(e){} const d=sampleDB(); save(d); return d; }
function save(db){ try{localStorage.setItem(KEY,JSON.stringify(db));}catch(e){} }
function resetDB(){ const d=sampleDB(); save(d); return d; }

/* ---- rendelés lezárása (fizetés után) ---- */
function completeOrder(db, order, how){
  const key=ISSUERS[order.buyerType].key; const yr=parse(today()).getFullYear();
  const inv=key+"-"+yr+"-"+pad4(db.counters[key]++); order.invoice=inv; order.status="paid"; order.buy=iso(today());
  const n=order.items.reduce((s,i)=>s+i.q,0); let k=0; order.vouchers=[];
  order.items.forEach(i=>{for(let j=0;j<i.q;j++){k++;order.vouchers.push({serial:n>1?inv+"/"+k:inv,pid:i.pid,value:P[i.pid].price,status:"active"})}});
  const t=Date.now(), s=x=>new Date(t+x*1000).toISOString(), [r1,r2]=reminders(order.buy);
  const payName={card:"bankkártya",apple:"Apple Pay",google:"Google Pay",transfer:"átutalás"}[order.pay];
  order.log=(order.log||[]).concat([
    {t:s(0),c:"",h: how==="transfer" ? "<b>Bank:</b> utalás beérkezett, díjbekérő "+esc(order.proforma)+" kiegyenlítve" : "<b>Stripe:</b> fizetés sikeres ("+payName+"), "+ft(order.total)},
    {t:s(1),c:"",h:"<b>Számlázz.hu ("+esc(order.issuer)+"):</b> számla "+inv+" kiállítva, fizetve jelöléssel"},
    {t:s(2),c:"",h:"<b>Utalványkép:</b> "+order.vouchers.length+" db legenerálva, sorszám = számlaszám"+(n>1?" + /sorszám":"")},
    {t:s(3),c:"",h:"<b>E-mail:</b> elküldve: "+[order.cmail].concat(order.direct?[order.rmail]:[]).map(esc).join(", ")},
    {t:s(4),c:"w",h:"<b>Emlékeztetők ütemezve</b> "+esc(order.rmail)+" részére: "+huDate(r1)+" és "+huDate(r2)}
  ]);
  return order;
}
const pad4 = n=>String(n).padStart(4,"0");

/* ---- e-mail szöveg ---- */
function emailHTML(o){
  const exp=expiryOf(o.buy), to=[o.cmail].concat(o.direct?[o.rmail]:[]), self=o.rname===o.cname&&o.rmail===o.cmail;
  return `<div class="mail"><div class="mh"><span>Feladó</span><span>Al-Ba Cook Főzőiskola &lt;albacookfozoiskola@gmail.com&gt;</span><span>Címzett</span><span>${to.map(esc).join(", ")}</span><span>Tárgy</span><span>Ajándékutalványod megérkezett · ${esc(o.invoice)}</span></div>
  <p>Kedves ${esc(o.cname)}!</p>
  <p>Köszönjük, hogy minket választottál. Csatoltan küldjük a számlát és ${o.vouchers.length>1?o.vouchers.length+" ajándékutalványt":"az ajándékutalványt"}${self?"":` <b>${esc(o.rname)}</b> részére`}.</p>
  <p>Az utalvány <b>${huDate(exp)}</b>-ig váltható be. Időpontot a fozzvelunk.hu oldalon vagy a 06 30 220 5547 számon lehet foglalni, a sorszám megadásával.</p>
  ${o.msg?`<p><i>„${esc(o.msg)}”</i></p>`:""}
  <p>Ha lejárna, az utalvány hosszabbítási díjjal még beváltható: 5 000 Ft a lejárat óta megkezdett minden hónapra (a lejárat utáni első hónapban 5 000 Ft, a másodikban 10 000 Ft). Részletek: az utalvány felhasználási feltételei.</p><p>Helyszín: Székesfehérvár, Széchenyi utca 122.</p>
  <div class="att"><span>${esc(o.invoice)}.pdf</span><span>Felhasználási feltételek (link)</span>${o.vouchers.map(v=>`<span>utalvany_${v.serial.replace(/[^\w]+/g,"_")}.jpg</span>`).join("")}</div></div>`;
}

/* ---- utalványkép ---- */
const fontsReady = (document.fonts? Promise.all([document.fonts.load('700 26px "Cabin Sketch"')]).catch(()=>{}) : Promise.resolve());
const imgCache={};
function loadImg(src){return imgCache[src]||(imgCache[src]=new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=src}))}
async function drawVoucher(pid, serial, exp){
  const p=P[pid]; await fontsReady; const im=await loadImg(p.img);
  const c=document.createElement("canvas"); c.width=im.naturalWidth; c.height=im.naturalHeight;
  const g=c.getContext("2d"); g.drawImage(im,0,0); const sx=c.width/1200, date=huDate(exp);
  if(p.tpl==="strip"){
    const px=g.getImageData(Math.round(700*sx),Math.round(712*sx),1,1).data;
    g.fillStyle=`rgb(${px[0]},${px[1]},${px[2]})`; g.fillRect(560*sx,699*sx,392*sx,28*sx);
    g.fillStyle="#222"; g.textBaseline="middle"; g.font=`700 ${22*sx}px "Cabin Sketch", cursive`;
    g.textAlign="left"; g.fillText(date,446*sx,714*sx); g.textAlign="right"; g.fillText("SORSZÁM: "+serial,946*sx,714*sx);
  } else if(p.tpl==="lines"){
    g.fillStyle="#f2f1ea"; g.textAlign="left"; g.font=`700 22px "Cabin Sketch", cursive`; g.fillText(serial,272,344); g.fillText(date,360,399);
  } else {
    g.fillStyle="#2a2a2a"; g.textAlign="center"; g.textBaseline="middle"; g.font=`700 22px "Cabin Sketch", cursive`; g.fillText(p.name.toUpperCase()+" TANFOLYAM",396,174);
    g.fillStyle="#f2f1ea"; g.font=`400 18px "Cabin Sketch", cursive`; g.textAlign="left"; g.fillText("SORSZÁM: "+serial,300,448); g.fillText("ÉRVÉNYES: "+date,300,472);
  }
  try{ return c.toDataURL("image/jpeg",.86); }catch(e){ return p.img; }
}

window.AB = {PRODUCTS,P,ISSUERS,ft,iso,parse,huDate,hm,addMonths,expiryOf,reminders,extFee,esc,today,load,save,resetDB,completeOrder,emailHTML,drawVoucher,pad};
})();
