/* EnviroMulch shared script. Data mirrors the live order form (order form1.htm).
   order.ashx relies on field names pg0..pg5 / pq0..pq5 / pl4 pw4 ph4 and on the PRICE_GROUPS order.
   Never put API keys in this file; RESEND_API_KEY lives only in web.config on the server. */
var PRICE_GROUPS=[{"g":"Mulch","sel":"Mulch Selection","q":"Yards/Scoops","items":[["Double Ground Hardwood (Best Seller)","$26"],["Single Ground Hardwood","$26"],["Pro-Scape Hardwood","$35"],["EnviroMulch Hardwood Blend","$27"],["Contractors Blend","$22"],["Double Natural Mulch","$25"],["Single Ground Pine","$30"],["Double Pine Bark","$32"],["Red Mulch","$38"],["Brown Mulch","$38"],["Black Mulch","$38"],["Bedding Mulch (Sawdust)","$20"],["Wood / Play Chips","$28"],["Sawdust Load","$275.00 / load"]]},{"g":"Soils","sel":"Soils Selection","q":"Yards/Scoops","items":[["Organic Soil Blend","$45"],["Screened Top Soil","$50.00"],["Soil Amendment","$35"],["Fill Dirt","$25"],["Bioretention Soil","Call for quote"]]},{"g":"Sand & Stone","sel":"Aggregates Selection","q":"Yards/Scoops","items":[["Crusher Run","$55"],["Pea Stone 3/8\"-1/2\"","$65"],["#57 Stone 3/4\"-1\"","$65"],["Surge Stone 2\"-4\"","$65"],["Rip Rap 4\"-8\"","$65"],["3\"-4\" Construction Surge (full load only)","$32"],["Asphalt Millings","$60"],["River Rock 3/8\"-3/4\"","$145"],["River Rock 1\"-3\"","$145"],["River Rock 2\"-5\"","$155"],["River Rock 4\"-7\"","$155"],["River Rock 7\"-14\"","$145"],["River Boulders 18\"-36\"","$100"],["River Sand","$55"],["Columbia Mason Sand","$75"],["Granite White Beach Sand","$75"],["Screened Fines","$50"],["Gravel, full load","Call for delivered quote"]]},{"g":"Baled Products","sel":"Baled Products","q":"No. of Bales","items":[["Red Golden Long Needle Pine Straw","$6.25 / bale"],["Wheat Straw","$8.00 / bale"],["Bale delivery","$1.05 / bale + FSC"]]},{"g":"IPEMA Playground Surfacing","sel":"IPEMA Certified Playground Surfacing","q":"Yds./Scoops","dims":true,"items":[["Picked up","$30 / yd"],["Delivered","$30 / yd + freight"],["Installed (inspection required)","Call for quote"]]},{"g":"Certified Wear Mats","sel":"Certified Wear Mats","q":"Quantity","items":[["Picked Up","$99.95 each"],["Shipped","$106.95 each + freight"],["Installed","$139.95 each + freight"]]}];
/* Site root derived from this script's URL so links work at a domain root or a subpath (GitHub Pages). */
var EM_ROOT=(function(){try{var c=document.currentScript;if(c&&c.src)return new URL('../',c.src).href;}catch(e){}return '/';})();
var SLUGS=['mulch','soils','aggregates','baled','playground','wear-mats'];
var CALC_MATERIALS=[['Mulch',3,'mulch'],['Soils',4,'soils'],['Aggregates',3,'aggregates'],['IPEMA Playground Surfacing',12,'playground']];
var NOTE_ITEMS=['Bale delivery','Gravel, full load'];

function $(id){return document.getElementById(id);}
function esc(t){return String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');}
function qs(){var s=(window.EM_QS!==undefined?window.EM_QS:location.search).replace(/^\?/,''),o={};
  s.split('&').forEach(function(p){if(!p)return;var kv=p.split('=');o[decodeURIComponent(kv[0])]=decodeURIComponent((kv[1]||'').replace(/\+/g,' '));});return o;}

/* MOBILE MENU */
function toggleMenu(){var m=$('mm');if(!m)return;var o=m.classList.toggle('open');document.body.style.overflow=o?'hidden':'';var b=document.querySelector('.hbg');if(b)b.setAttribute('aria-expanded',o?'true':'false');}
function closeMM(){var m=$('mm');if(m)m.classList.remove('open');document.body.style.overflow='';}
document.addEventListener('keydown',function(e){if(e.key==='Escape')closeMM();});

/* CALCULATOR: cubic yards = L(ft) x W(ft) x D(in)/12 / 27 */
var DEPTHS=[2,3,4,6,9,12];
function num(id){var el=$(id);var v=el?parseFloat(el.value):0;return isFinite(v)&&v>0?v:0;}
function calc(){
  if(!$('c-yd'))return;
  var L=num('c-len'),W=num('c-wid'),D=num('c-dep');
  var cf=L*W*D/12,yd=cf/27;
  $('c-yd').textContent=yd<10?yd.toFixed(1):Math.round(yd*10)/10;
  $('c-up').textContent=Math.ceil(yd*2)/2;
  $('c-area').textContent=Math.round(L*W).toLocaleString()+' sq ft';
  $('c-cf').textContent=Math.round(cf).toLocaleString()+' cu ft';
  $('c-bags').textContent=Math.ceil(cf/2).toLocaleString()+' bags';
  var cs=$('c-chips').children;for(var i=0;i<cs.length;i++)cs[i].classList.toggle('on',DEPTHS[i]===D);
}
function initCalc(){
  var cm=$('c-mat');if(!cm)return;
  cm.innerHTML='';CALC_MATERIALS.forEach(function(m){cm.add(new Option(m[0],m[2]));});
  var chips=$('c-chips');chips.innerHTML='';
  DEPTHS.forEach(function(d){var b=document.createElement('button');b.type='button';b.className='chip';b.textContent=d+' in';b.onclick=function(){$('c-dep').value=d;calc();};chips.appendChild(b);});
  ['c-len','c-wid','c-dep'].forEach(function(id){$(id).addEventListener('input',calc);});
  cm.addEventListener('change',function(){CALC_MATERIALS.forEach(function(m){if(m[2]===cm.value)$('c-dep').value=m[1];});calc();});
  var q=qs();
  if(q.material){cm.value=q.material;CALC_MATERIALS.forEach(function(m){if(m[2]===q.material)$('c-dep').value=m[1];});}
  if(q.depth)$('c-dep').value=q.depth;if(q.len)$('c-len').value=q.len;if(q.wid)$('c-wid').value=q.wid;
  var go=$('c-order');if(go)go.addEventListener('click',function(e){e.preventDefault();var y=Math.ceil(num('c-len')*num('c-wid')*num('c-dep')/12/27*2)/2;navTo(EM_ROOT+'order/?product='+cm.value+'&qty='+y);});
  calc();
}
function navTo(u){if(window.EM_NAV)window.EM_NAV(u);else location.href=u;}

/* ORDER FORM */
function opts(id,first,list){var e=$(id);e.innerHTML='';e.add(new Option(first,''));list.forEach(function(x){e.add(new Option(x,x));});}
function initOrder(){
  var pgEl=$('prodGroups');if(!pgEl)return;
  pgEl.innerHTML=PRICE_GROUPS.map(function(g,k){var its=g.items.filter(function(i){return NOTE_ITEMS.indexOf(i[0])<0;});
    return '<div class="fst" id="og-'+SLUGS[k]+'">'+esc(g.sel)+'</div><div class="fr"><div class="fg"><label class="flb" for="pg'+k+'">'+esc(g.sel)+'</label><select class="fsel pgsel" id="pg'+k+'" name="pg'+k+'" data-g="'+esc(g.sel)+'"><option value="">None</option>'+its.map(function(i){var v=i[0]+' - '+i[1];return '<option value="'+esc(v)+'">'+esc(v)+'</option>';}).join('')+'</select></div><div class="fg"><label class="flb" for="pq'+k+'">'+esc(g.q)+'</label><input class="fi" id="pq'+k+'" name="pq'+k+'" type="number" min="0" step="0.5"></div></div>'+(g.dims?'<div class="fr t"><div class="fg"><label class="flb" for="pl'+k+'">Length (ft.)</label><input class="fi" id="pl'+k+'" name="pl'+k+'" type="number" min="0"></div><div class="fg"><label class="flb" for="pw'+k+'">Width (ft.)</label><input class="fi" id="pw'+k+'" name="pw'+k+'" type="number" min="0"></div><div class="fg"><label class="flb" for="ph'+k+'">Height (inches)</label><input class="fi" id="ph'+k+'" name="ph'+k+'" type="number" min="0"></div></div>':'');}).join('');
  opts('f-time','Select',['8-10','10-12','12-2','2-5']);
  opts('f-pay','Select below',['Cash','Credit or Debit Card','Check']);
  opts('f-heard','Select Below',['Saw truck','Saw Location','Friend','Billboard','WCCP 105.5','103.1 Life FM','107.1 Golden Corner','Google','Email Constant Contact']);
  $('orderForm').addEventListener('submit',handleSubmit);
  var q=qs(),k=SLUGS.indexOf(q.product);
  if(k>=0){if(q.qty)$('pq'+k).value=q.qty;var h=$('og-'+SLUGS[k]);setTimeout(function(){if(h)window.scrollTo(0,h.getBoundingClientRect().top+window.scrollY-120);$('pg'+k).focus({preventScroll:true});},60);}
}
function setStatus(msg,ok){var el=$('submitStatus');el.style.display='block';el.style.background=ok?'rgba(125,181,67,.12)':'rgba(192,0,0,.07)';el.style.borderLeft='3px solid '+(ok?'var(--lime)':'#c00');el.style.color=ok?'var(--forest)':'#900';el.textContent=msg;}
var sending=false;
function handleSubmit(e){
  e.preventDefault();
  if(sending)return;
  var f=$('orderForm');
  var name=$('f-name').value.trim(),phone=$('f-phone').value.trim(),addr=$('f-addr').value.trim();
  if(!name||!phone||!addr){setStatus('Please add your name, phone number and delivery address.',false);return;}
  var req=['f-time','f-pay','f-heard'];for(var i=0;i<req.length;i++){if(!$(req[i]).value){setStatus('Please choose a delivery time period, payment method and how you heard about us.',false);return;}}
  var any=false;PRICE_GROUPS.forEach(function(g,k){if($('pg'+k).value)any=true;});
  if(!any){setStatus('Please choose at least one product.',false);return;}
  if(/(^|\.)github\.io$/.test(location.hostname)){setStatus('Online ordering works on the live site; call 864-843-2448',false);return;}
  var btn=f.querySelector('.fsub');sending=true;btn.disabled=true;btn.textContent='Sending...';
  setStatus('Sending your order...',true);
  fetch(EM_ROOT+'order.ashx',{method:'POST',body:new FormData(f),headers:{'Accept':'application/json'}})
    .then(function(r){return r.json().catch(function(){return {ok:false};});})
    .then(function(d){
      if(d&&d.ok){f.reset();setStatus('Thanks, '+name+'. Your order request was sent. We will call to confirm price, availability and timing.',true);}
      else setStatus((d&&d.error?d.error+' ':'Sorry, we could not send your order. ')+'Please call 864-843-2448.',false);
    })
    .catch(function(){setStatus('Sorry, we could not send your order. Please call 864-843-2448.',false);})
    .then(function(){sending=false;btn.disabled=false;btn.textContent='Submit Order';});
}
function emInit(){initCalc();initOrder();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',emInit);else emInit();
