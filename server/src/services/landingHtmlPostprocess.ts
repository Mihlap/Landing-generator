const ANCHOR_MARKER = "data-landing-anchor-fix";
const FOOTER_MARKER = "data-landing-footer-fix";
const LEAD_FORM_MARKER = "data-landing-lead-form-fix";
const CONTACT_MARKER = "data-landing-contact-fix";
const CONTRAST_MARKER = "data-landing-contrast-fix";
const LEAD_ALIGN_MARKER = "data-landing-lead-align-fix";
const IMAGE_RETRY_MARKER = "data-landing-image-retry-fix";
const LAYOUT_MARKER = "data-landing-layout-fix";
const STRUCTURE_MARKER = "data-landing-structure-fix";

export const LANDING_CONTENT_WIDTH = "min(118rem, calc(100% - 2rem))";

const LANDING_CONTENT_REM = /^min\((\d+(?:\.\d+)?)rem/.exec(LANDING_CONTENT_WIDTH)?.[1] ?? "118";

export function normalizeLayoutWidths(html: string): string {
  const W = LANDING_CONTENT_WIDTH;
  return html
    .replace(/max-width\s*:\s*7[0-2](?:\.\d+)?rem\b/gi, `max-width: ${W}`)
    .replace(/max-width\s*:\s*11[0-9]{2}px\b/gi, `max-width: ${W}`)
    .replace(/max-width\s*:\s*1200px\b/gi, `max-width: ${W}`)
    .replace(/max-width\s*:\s*1140px\b/gi, `max-width: ${W}`)
    .replace(/min\s*\(\s*7[0-2]rem\s*,/gi, `min(${LANDING_CONTENT_REM}rem,`);
}

const FALLBACK_IMAGE_SRC =
  "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1600&q=80";
const INLINE_IMAGE_FALLBACK =
  "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 700'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop stop-color='%232563eb'/%3E%3Cstop offset='1' stop-color='%234f46e5'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='1200' height='700' fill='url(%23g)'/%3E%3Ctext x='50%25' y='50%25' fill='white' font-size='48' text-anchor='middle' dominant-baseline='middle' font-family='system-ui,sans-serif'%3EPreview image%3C/text%3E%3C/svg%3E";

const ANCHOR_SCRIPT = `<script ${ANCHOR_MARKER}="1">
(function(){
  function normalize(v){
    return decodeURIComponent(String(v||""))
      .trim()
      .toLowerCase()
      .replace(/\\\\/g,"/")
      .replace(/^\\.?\\//,"")
      .replace(/\\/$/,"")
      .replace(/\\.html?$/i,"")
      .replace(/[^a-z0-9_-]+/g,"-")
      .replace(/^-+|-+$/g,"");
  }
  function findTargetFromHref(href){
    var cleaned=String(href||"").trim();
    if(!cleaned)return null;
    if(cleaned[0]==="#"){
      var hashId=normalize(cleaned.slice(1));
      return hashId?document.getElementById(hashId):null;
    }
    var hashIdx=cleaned.indexOf("#");
    if(hashIdx>=0&&hashIdx<cleaned.length-1){
      var hashTail=normalize(cleaned.slice(hashIdx+1));
      if(hashTail){
        var byHash=document.getElementById(hashTail);
        if(byHash)return byHash;
      }
    }
    var byPath=normalize(cleaned);
    if(byPath){
      var byId=document.getElementById(byPath);
      if(byId)return byId;
    }
    var fallbackIds=["lead-form","newsletter-form","contact-form","contact","contacts","signup","cta"];
    for(var i=0;i<fallbackIds.length;i++){
      var f=document.getElementById(fallbackIds[i]);
      if(f)return f;
    }
    return null;
  }
  function isLeadCtaText(text){
    var t=String(text||"").trim().toLowerCase();
    if(!t)return false;
    return /(оставьте заявку|записаться|запишитесь|заказать|оставить заявку|собрать букет|оформить заказ|подписаться|book|order|contact us|send request|get started)/i.test(t);
  }
  document.addEventListener("click",function(e){
    var anchor=e.target&&e.target.closest&&e.target.closest("a[href]");
    if(anchor){
      var href=anchor.getAttribute("href");
      if(!href)return;
      if(/^(https?:|mailto:|tel:|javascript:|data:)/i.test(href))return;
      var target=findTargetFromHref(href);
      if(target){
        e.preventDefault();
        target.scrollIntoView({behavior:"smooth",block:"start"});
        return;
      }    
      e.preventDefault();
      return;
    }
    var cta=e.target&&e.target.closest&&e.target.closest("button,[role='button'],.btn,.button,.cta");
    if(!cta)return;
    if(!isLeadCtaText(cta.textContent))return;
    var form=document.getElementById("lead-form");
    if(form){
      e.preventDefault();
      form.scrollIntoView({behavior:"smooth",block:"start"});
    }
  });
})();
</script>`;

const CONTACT_SCRIPT = `<script ${CONTACT_MARKER}="1">
(function(){
  function hasAncestor(el,tag){
    var p=el&&el.parentElement;
    while(p){ if(p.tagName===tag)return true; p=p.parentElement; }
    return false;
  }
  function linkifyTextNodes(){
    var walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
    var nodes=[];
    while(walker.nextNode()){ nodes.push(walker.currentNode); }
    var phoneRe=/(\\+?\\d[\\d\\s\\-()]{7,}\\d)/g;
    var emailRe=/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[A-Za-z]{2,})/g;
    nodes.forEach(function(node){
      var txt=node.nodeValue||"";
      if(!txt.trim())return;
      var parent=node.parentElement;
      if(!parent)return;
      if(hasAncestor(node,"A")||hasAncestor(node,"SCRIPT")||hasAncestor(node,"STYLE"))return;
      var replaced=txt
        .replace(emailRe,'<a href="mailto:$1">$1<\\/a>')
        .replace(phoneRe,function(m){
          var tel=m.replace(/[^\\d+]/g,"");
          if(!tel)return m;
          return '<a href="tel:'+tel+'">'+m+'<\\/a>';
        });
      if(replaced===txt)return;
      var span=document.createElement("span");
      span.innerHTML=replaced;
      parent.replaceChild(span,node);
    });
  }
  function normalizeExistingContactLinks(){
    document.querySelectorAll('a[href]').forEach(function(a){
      var href=(a.getAttribute('href')||'').trim();
      var text=(a.textContent||'').trim();
      if(/^(tel:|mailto:)/i.test(href))return;
      var email=/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[A-Za-z]{2,}$/.exec(text);
      if(email){ a.setAttribute('href','mailto:'+email[0]); return; }
      var phone=text.replace(/[^\\d+]/g,'');
      if(phone.length>=8&&/^\\+?\\d+$/.test(phone)){ a.setAttribute('href','tel:'+phone); }
    });
  }
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',function(){ normalizeExistingContactLinks(); linkifyTextNodes(); });
  } else {
    normalizeExistingContactLinks();
    linkifyTextNodes();
  }
})();
</script>`;

const CONTRAST_SCRIPT = `<script ${CONTRAST_MARKER}="1">
(function(){
  function parseRgb(raw){
    var s=String(raw||"").trim();
    var m=s.match(/^rgba?\\(([^)]+)\\)$/i);
    if(!m)return null;
    var p=m[1].split(",").map(function(x){return Number(x.trim());});
    if(p.length<3)return null;
    return {r:Math.max(0,Math.min(255,p[0]||0)),g:Math.max(0,Math.min(255,p[1]||0)),b:Math.max(0,Math.min(255,p[2]||0)),a:p.length>3?Math.max(0,Math.min(1,p[3]||0)):1};
  }
  function luminance(c){
    function ch(v){ v/=255; return v<=0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055,2.4); }
    return 0.2126*ch(c.r)+0.7152*ch(c.g)+0.0722*ch(c.b);
  }
  function ratio(fg,bg){
    var l1=luminance(fg), l2=luminance(bg);
    var hi=Math.max(l1,l2), lo=Math.min(l1,l2);
    return (hi+0.05)/(lo+0.05);
  }
  function getOpaqueBg(el){
    var cur=el;
    while(cur&&cur!==document.documentElement){
      var c=parseRgb(getComputedStyle(cur).backgroundColor);
      if(c&&c.a>0.05)return c;
      cur=cur.parentElement;
    }
    return {r:255,g:255,b:255,a:1};
  }
  function fixContrast(){
    var nodes=document.querySelectorAll("h1,h2,h3,p,li,span,a,blockquote,figcaption,label,button");
    nodes.forEach(function(el){
      if(!(el instanceof HTMLElement))return;
      var text=(el.textContent||"").trim();
      if(!text)return;
      var fg=parseRgb(getComputedStyle(el).color);
      if(!fg)return;
      var bg=getOpaqueBg(el);
      if(ratio(fg,bg)>=4.2)return;
      var bgLum=luminance(bg);
      el.style.color=bgLum>0.58 ? "#0f172a" : "#f8fafc";
    });
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",fixContrast);
  else fixContrast();
})();
</script>`;

const LEAD_ALIGN_SCRIPT = `<script ${LEAD_ALIGN_MARKER}="1">
(function(){
  function getCandidate(){
    var selectors=["main",".container","[class*=container]","header section","section"];
    var best=null;
    var vw=Math.max(document.documentElement.clientWidth,window.innerWidth||0);
    selectors.forEach(function(sel){
      document.querySelectorAll(sel).forEach(function(el){
        if(!(el instanceof HTMLElement))return;
        if(el.id==="lead-form")return;
        var r=el.getBoundingClientRect();
        if(r.width<320||r.width>vw*0.96)return;
        var score=(r.width>500?2:0)+(r.top<window.innerHeight?1:0);
        if(!best||score>best.score)best={el:el,rect:r,score:score};
      });
    });
    return best&&best.rect?best.rect:null;
  }
  function alignLeadForm(){
    var form=document.getElementById("lead-form");
    if(!form)return;
    var vw=Math.max(document.documentElement.clientWidth,window.innerWidth||0);
    var rect=getCandidate();
    if(!rect){ form.style.maxWidth="min(640px, calc(100% - 2rem))"; form.style.margin="2rem auto"; return; }
    var left=Math.max(16,Math.round(rect.left));
    var right=Math.max(16,Math.round(vw-rect.right));
    var maxW=Math.round(Math.min(680,Math.max(360,rect.width)));
    var centered=Math.abs(left-right)<=32;
    form.style.maxWidth=maxW+"px";
    if(centered){
      form.style.marginTop="2rem"; form.style.marginBottom="2rem";
      form.style.marginLeft="auto"; form.style.marginRight="auto";
      return;
    }
    if(left<right){
      form.style.marginTop="2rem"; form.style.marginBottom="2rem";
      form.style.marginLeft=left+"px"; form.style.marginRight="auto";
      return;
    }
    form.style.marginTop="2rem"; form.style.marginBottom="2rem";
    form.style.marginLeft="auto"; form.style.marginRight=right+"px";
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",alignLeadForm);
  else alignLeadForm();
  window.addEventListener("resize",alignLeadForm,{passive:true});
})();
</script>`;

const IMAGE_RETRY_SCRIPT = `<script ${IMAGE_RETRY_MARKER}="1">
(function(){
  var FALLBACK=${JSON.stringify(FALLBACK_IMAGE_SRC)};
  var MAX = 14;
  var DELAYS = [350, 700, 1200, 2000, 3200, 5000, 8000];
  function isProxySrc(src){
    var s = String(src||"");
    return /^\\/image\\?/i.test(s) || /https?:\\/\\/[^/]+\\/image\\?/i.test(s);
  }
  function stripRetryParams(u){
    var s = String(u||"").split("#")[0];
    s = s.replace(/([?&])retry=[^&]*/gi, function(_, a){ return a === "?" ? "?" : ""; });
    s = s.replace(/[?&]$/,"");
    return s;
  }
  function ok(img){ return (img.naturalWidth||0) > 0; }
  function schedule(img){
    if(!(img instanceof HTMLImageElement)) return;
    var raw = img.getAttribute("src") || "";
    if(!isProxySrc(raw)) return;
    if(img.dataset.landingImgRetry === "1") return;
    img.dataset.landingImgRetry = "1";
    var base = stripRetryParams(raw);
    var n = 0;
    var busy = false;
    function bump(){
      if(ok(img)) return;
      if(busy) return;
      if(n >= MAX){
        img.removeAttribute("src");
        img.src = FALLBACK;
        return;
      }
      busy = true;
      n += 1;
      var sep = base.indexOf("?") >= 0 ? "&" : "?";
      img.src = base + sep + "retry=" + n + "-" + Date.now();
      window.setTimeout(function(){ busy = false; }, 80);
    }
    img.addEventListener("error", function(){
      window.setTimeout(bump, DELAYS[Math.min(n, DELAYS.length-1)] || 2500);
    });
    if(img.complete && !ok(img)){
      window.setTimeout(bump, DELAYS[0]);
    }
    if("IntersectionObserver" in window){
      var io = new IntersectionObserver(function(entries){
        entries.forEach(function(e){
          if(e.isIntersecting && !ok(img) && img.dataset.landingImgIo !== "1"){
            img.dataset.landingImgIo = "1";
            bump();
          }
        });
      }, { rootMargin: "120px", threshold: 0.01 });
      io.observe(img);
    }
  }
  function init(){
    document.querySelectorAll("img[src]").forEach(schedule);
  }
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
</script>`;

const FOOTER_STYLE = `<style ${FOOTER_MARKER}="1">
html, body { min-height: 100%; max-width: 100%; overflow-x: hidden; }
body { min-height: 100vh; display: flex; flex-direction: column; width: 100%; }
footer { position: static; margin-top: auto; width: 100%; }
</style>`;

const LAYOUT_STYLE = `<style ${LAYOUT_MARKER}="1">
header, nav { width: 100%; }
</style>`;

const STRUCTURE_STYLE = `<style ${STRUCTURE_MARKER}="1">
main, section, .container {
  width: ${LANDING_CONTENT_WIDTH} !important;
  max-width: ${LANDING_CONTENT_WIDTH} !important;
  margin-left: auto !important;
  margin-right: auto !important;
  box-sizing: border-box;
}
header {
  width: 100%;
  margin-left: 0;
  margin-right: 0;
}
header nav,
header .nav,
header [class*="nav"] {
  width: 100% !important;
  max-width: none !important;
  background: transparent !important;
  border-radius: 0 !important;
  box-shadow: none !important;
}
header > *:not(style):not(script) {
  width: ${LANDING_CONTENT_WIDTH} !important;
  max-width: ${LANDING_CONTENT_WIDTH} !important;
  margin-left: auto !important;
  margin-right: auto !important;
}
footer {
  align-self: stretch;
  width: ${LANDING_CONTENT_WIDTH} !important;
  max-width: ${LANDING_CONTENT_WIDTH} !important;
  margin-left: auto !important;
  margin-right: auto !important;
  box-sizing: border-box;
}
section {
  padding-top: clamp(1.25rem, 3vw, 2rem);
  padding-bottom: clamp(1.25rem, 3vw, 2rem);
  padding-left: clamp(1rem, 3vw, 1.5rem);
  padding-right: clamp(1rem, 3vw, 1.5rem);
}
[data-landing-title-fix="1"] > div:first-child,
section[class*="hero" i] > div:first-child {
  padding-left: clamp(.5rem, 2vw, 1.25rem);
  padding-right: clamp(.5rem, 2vw, 1.25rem);
}
section ul:not(nav ul):not(header ul) {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: .85rem;
  list-style: none;
  padding-left: 0;
}
section .cards, section .grid, section .services, section .reviews, section .benefits, section .process {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  gap: 1rem;
}
section [class*="list"],
section [class*="cards"],
section [class*="grid"],
section [class*="container"] {
  display: grid;
  gap: clamp(.85rem, 2vw, 1.25rem);
}
section [class*="list"] > *,
section [class*="cards"] > *,
section [class*="grid"] > *,
section [class*="container"] > * {
  margin: 0;
}
section > :not(style):not(script) + :not(style):not(script) {
  margin-top: clamp(.85rem, 2vw, 1.25rem);
}
section > div:has(> img + img),
section > div:has(> figure + figure),
section > div:has(> .card + .card),
section > div:has(> [class*="card"] + [class*="card"]) {
  display: grid;
  gap: clamp(.85rem, 2vw, 1.25rem);
}
section .review,
section .review-card,
section .benefit-card,
section .product-card,
section .service-card,
section .faq-item {
  margin: 0;
}
section .review-card + .review-card,
section .card + .card,
section [class*="card"] + [class*="card"] {
  margin-top: clamp(.85rem, 2vw, 1.25rem);
}
footer form,
section[id*="footer" i] form,
section[class*="footer" i] form {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: .75rem;
}
footer form > *,
section[id*="footer" i] form > *,
section[class*="footer" i] form > * {
  margin: 0 !important;
}
footer form input + button,
footer form textarea + button,
footer form select + button,
section[id*="footer" i] form input + button,
section[id*="footer" i] form textarea + button,
section[id*="footer" i] form select + button,
section[class*="footer" i] form input + button,
section[class*="footer" i] form textarea + button,
section[class*="footer" i] form select + button {
  margin-left: .75rem !important;
}
@media (max-width: 640px) {
  footer form input + button,
  footer form textarea + button,
  footer form select + button,
  section[id*="footer" i] form input + button,
  section[id*="footer" i] form textarea + button,
  section[id*="footer" i] form select + button,
  section[class*="footer" i] form input + button,
  section[class*="footer" i] form textarea + button,
  section[class*="footer" i] form select + button {
    margin-left: 0 !important;
    margin-top: .75rem !important;
  }
}
section .card:not(:has(.content)),
section [class*="card"]:not(:has(.content)):not(:has(> img:only-child)),
section .review:not(:has(.content)) {
  padding: clamp(1rem, 2.5vw, 1.35rem);
  box-sizing: border-box;
}
section .service-card,
section .review-card,
section .benefit-card,
section .product-card,
section .grid-item,
section .faq-item,
section .review {
  padding: clamp(1rem, 2.5vw, 1.35rem) !important;
  box-sizing: border-box;
}
img { display: block; max-width: 100%; height: auto; border-radius: 12px; }
*, *::before, *::after { box-sizing: border-box; }
*:not(iframe), *::before, *::after { max-width: 100%; }
iframe {
  box-sizing: border-box;
  max-width: ${LANDING_CONTENT_WIDTH};
  width: 100%;
  min-height: 280px;
  border: 0;
}
[data-landing-hero-image="1"] {
  width: ${LANDING_CONTENT_WIDTH};
  margin: 1.25rem auto 0;
}
[data-landing-hero-image="1"] img {
  width: 100%;
  min-height: clamp(220px, 34vw, 420px);
  object-fit: cover;
}
[data-landing-title-fix="1"] h1 {
  background: none !important;
  box-shadow: none !important;
  border: 0 !important;
  -webkit-text-fill-color: inherit !important;
}
section[class*="hero" i] {
  text-align: center;
}
[data-landing-title-fix="1"] .hero-text,
[data-landing-title-fix="1"] .hero-content,
section[class*="hero" i] .hero-text,
section[class*="hero" i] .hero-content {
  text-align: center;
}
[data-landing-title-fix="1"] > div:first-child,
section[class*="hero" i] > div:first-child {
  text-align: center !important;
}
[data-landing-title-fix="1"] h1,
[data-landing-title-fix="1"] p,
[data-landing-title-fix="1"] button {
  text-align: center !important;
}
[data-landing-visuals="1"] {
  width: ${LANDING_CONTENT_WIDTH};
  margin: 1rem auto 0;
  display: grid;
  gap: .9rem;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}
@media (max-width: 1024px) {
  section {
    padding-left: clamp(0.65rem, 2.5vw, 1rem) !important;
    padding-right: clamp(0.65rem, 2.5vw, 1rem) !important;
  }
  section ul:not(nav ul):not(header ul),
  section .cards, section .grid, section .services, section .reviews, section .benefits, section .process {
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 200px), 1fr)) !important;
  }
}
@media (max-width: 767px) {
  html { -webkit-text-size-adjust: 100%; }
  section ul:not(nav ul):not(header ul),
  section .cards, section .grid, section .services, section .reviews, section .benefits, section .process {
    grid-template-columns: 1fr !important;
  }
  section [class*="list"]:not(nav *):not(header *),
  section [class*="cards"],
  section [class*="grid"]:not(.container) {
    grid-template-columns: 1fr !important;
  }
  [data-landing-title-fix="1"],
  header[class*="hero" i],
  section[class*="hero" i] {
    flex-direction: column !important;
  }
}
[data-landing-visuals="1"] img {
  width: 100%;
  height: clamp(170px, 24vw, 280px);
  object-fit: cover;
  border-radius: 12px;
}
</style>`;

const LEAD_FORM_STYLE = `<style ${LEAD_FORM_MARKER}="1">
#lead-form {
  max-width: min(640px, calc(100% - 2rem));
  margin: 2rem auto;
  padding: clamp(1rem, 2.5vw, 1.5rem);
  border-radius: 16px;
  background: linear-gradient(180deg, rgba(255,255,255,.96), rgba(248,250,252,.96));
  border: 1px solid rgba(148,163,184,.28);
  box-shadow: 0 18px 45px -28px rgba(15,23,42,.45);
}
#lead-form h2 {
  margin: 0 0 .35rem;
  font-size: clamp(1.15rem, 2.2vw, 1.45rem);
  line-height: 1.2;
}
#lead-form p { margin: 0 0 1rem; opacity: .78; line-height: 1.45; }
#lead-form form { display: grid; gap: .85rem; }
#lead-form .lf-grid {
  display: grid;
  gap: .85rem;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
#lead-form, #lead-form * { box-sizing: border-box; }
#lead-form label { display: block; font-size: .9rem; margin: 0 0 .35rem; opacity: .86; }
#lead-form input,
#lead-form textarea {
  width: 100%;
  padding: .75rem .85rem;
  border-radius: 12px;
  border: 1px solid rgba(148,163,184,.55);
  background: #fff;
  color: #0f172a;
  font: inherit;
  outline: none;
}
#lead-form input:focus,
#lead-form textarea:focus {
  border-color: rgba(99,102,241,.75);
  box-shadow: 0 0 0 3px rgba(99,102,241,.15);
}
#lead-form .lf-col-2 { grid-column: 1 / -1; }
#lead-form .lf-actions { margin-top: .35rem; }
#lead-form .lf-submit {
  width: auto;
  min-width: 180px;
  max-width: 100%;
  border: 0;
  border-radius: 12px;
  padding: .7rem 1rem;
  font: inherit;
  font-size: .95rem;
  line-height: 1.2;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(135deg, #4f46e5, #2563eb);
  cursor: pointer;
}
#lead-form .lf-submit:hover { filter: brightness(1.05); }
#lead-form button[type="submit"] {
  width: auto;
  min-width: 180px;
  border: 0;
  border-radius: 12px;
  padding: .7rem 1rem;
  font: inherit;
  font-size: .95rem;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(135deg, #4f46e5, #2563eb);
  cursor: pointer;
}
#lead-form button[type="submit"]:hover { filter: brightness(1.05); }
@media (max-width: 640px) {
  #lead-form .lf-grid { grid-template-columns: 1fr; }
}

form {
  width: min(680px, calc(100% - 2rem));
  margin: 1.5rem auto;
  padding: clamp(1rem, 2.2vw, 1.4rem);
  border-radius: 14px;
  background: linear-gradient(180deg, rgba(255,255,255,.96), rgba(248,250,252,.96));
  border: 1px solid rgba(148,163,184,.28);
  box-shadow: 0 16px 40px -30px rgba(15,23,42,.45);
}
form label { display: block; margin: 0 0 .35rem; font-size: .92rem; opacity: .86; }
form input, form textarea, form select {
  width: 100%;
  padding: .72rem .85rem;
  border-radius: 12px;
  border: 1px solid rgba(148,163,184,.55);
  background: #fff;
  color: #0f172a;
  font: inherit;
  outline: none;
}
form input:focus, form textarea:focus, form select:focus {
  border-color: rgba(99,102,241,.75);
  box-shadow: 0 0 0 3px rgba(99,102,241,.15);
}
form button[type="submit"] {
  width: auto;
  min-width: 180px;
  border: 0;
  border-radius: 12px;
  padding: .7rem 1rem;
  font: inherit;
  font-size: .95rem;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(135deg, #4f46e5, #2563eb);
  cursor: pointer;
}
form button[type="submit"]:hover { filter: brightness(1.05); }
</style>`;

function normalizeId(value: string): string {
  return decodeURIComponent(value)
    .trim()
    .toLowerCase()
    .replace(/\\/g, "/")
    .replace(/^\.?\//, "")
    .replace(/\/$/, "")
    .replace(/\.html?$/i, "")
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function collectIds(html: string): Set<string> {
  const ids = new Set<string>();
  const idRegex = /\sid\s*=\s*["']([^"']+)["']/gi;
  let match: RegExpExecArray | null = idRegex.exec(html);
  while (match) {
    const normalized = normalizeId(match[1] ?? "");
    if (normalized) ids.add(normalized);
    match = idRegex.exec(html);
  }
  return ids;
}

function rewriteInternalLinksToAnchors(html: string): string {
  const ids = collectIds(html);
  if (ids.size === 0) return html;

  return html.replace(/\shref\s*=\s*(["'])([^"']+)\1/gi, (full, quote: string, hrefRaw: string) => {
    const href = hrefRaw.trim();
    if (!href) return full;
    if (/^(#|https?:|mailto:|tel:|javascript:|data:)/i.test(href)) return full;

    const hashIndex = href.indexOf("#");
    if (hashIndex >= 0 && hashIndex < href.length - 1) {
      const hashPart = href.slice(hashIndex + 1);
      const normalizedHash = normalizeId(hashPart);
      if (normalizedHash && ids.has(normalizedHash)) {
        return ` href=${quote}#${normalizedHash}${quote}`;
      }
    }

    const normalizedPath = normalizeId(href);
    if (normalizedPath && ids.has(normalizedPath)) {
      return ` href=${quote}#${normalizedPath}${quote}`;
    }

    return full;
  });
}

function ensureImageTagsHaveSource(html: string): string {
  return html.replace(/<img\b[^>]*>/gi, (tag) => {
    const srcMatch = /\ssrc\s*=\s*(["'])(.*?)\1/i.exec(tag);
    const dataSrcMatch = /\sdata-src\s*=\s*(["'])(.*?)\1/i.exec(tag);
    const srcValue = srcMatch?.[2]?.trim() ?? "";
    const dataSrcValue = dataSrcMatch?.[2]?.trim() ?? "";
    const preferred = srcValue || dataSrcValue;
    if (!/^(https?:\/\/|data:image\/)/i.test(preferred)) {
      return "";
    }
    let resolvedSrc = preferred;
  
    if (/^data:image\//i.test(resolvedSrc) && resolvedSrc.length > 2048) {
      resolvedSrc = FALLBACK_IMAGE_SRC;
    }

    let updated = tag;
    if (srcMatch) {
      updated = updated.replace(/\ssrc\s*=\s*(["'])(.*?)\1/i, ` src="${resolvedSrc}"`);
    } else {
      updated = updated.replace(/<img/i, `<img src="${resolvedSrc}"`);
    }
    if (!/\sloading\s*=/i.test(updated)) {
      updated = updated.replace(/<img/i, '<img loading="eager"');
    }
    if (!/\sdecoding\s*=/i.test(updated)) {
      updated = updated.replace(/<img/i, '<img decoding="async"');
    }
    if (!/\sreferrerpolicy\s*=/i.test(updated)) {
      updated = updated.replace(/<img/i, '<img referrerpolicy="no-referrer"');
    }
    const altMatch = /\salt\s*=\s*(["'])(.*?)\1/i.exec(updated);
    if (!altMatch || !altMatch[2]?.trim()) {
      if (altMatch) {
        updated = updated.replace(/\salt\s*=\s*(["'])(.*?)\1/i, ' alt="Section image"');
      } else {
        updated = updated.replace(/<img/i, '<img alt="Section image"');
      }
    }

    return updated;
  });
}

function ensureBackgroundImagesHaveSource(html: string): string {
  return html.replace(/background-image\s*:\s*url\((["']?)\s*\1\)\s*;?/gi, "background-image:none;");
}

function sanitizeInlineCssDataUrls(html: string): string {
  return html
    .replace(/cursor\s*:[^;{}]*data:image[\s\S]*?(?:;|(?=\}))/gi, "cursor:auto;")  
    .replace(/url\((["']?)\s*data:[\s\S]*?\1\)/gi, "none") 
    .replace(/data:image\/[a-z0-9.+-]+;base64,[a-z0-9+/=\s]+/gi, INLINE_IMAGE_FALLBACK)
    .replace(/cursor\s*:\s*none\s*;?/gi, "cursor:auto;");
}

function ensureContactSectionAnchors(html: string): string {
  const hasContactId = /\sid\s*=\s*["']contacts?["']/i.test(html);
  if (hasContactId) return html;

  if (/<footer\b[^>]*>/i.test(html)) {
    return html.replace(/<footer\b([^>]*)>/i, `<footer$1 id="contact"><span id="contacts" style="display:none"></span>`);
  }
  return html;
}

function collectHtmlIds(html: string): Set<string> {
  const set = new Set<string>();
  const re = /\sid\s*=\s*["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) set.add(m[1].toLowerCase());
  return set;
}

function fixIncompleteSectionAnchors(html: string): string {
  const ids = collectHtmlIds(html);
  const has = (id: string) => ids.has(id.toLowerCase());
  if (has("services")) return html;
  const target = has("gallery") ? "gallery" : has("benefits") ? "benefits" : has("contact") ? "contact" : "";
  if (!target) return html;
  return html.replace(/href\s*=\s*(["'])#services\1/gi, `href="#${target}"`);
}

function ensureFooterNewsletterForm(html: string): string {
  if (/\bid\s*=\s*["']newsletter-form["']/i.test(html)) return html;
  return html.replace(/<footer\b([^>]*)>([\s\S]*?)<\/footer>/gi, (full, attrs: string, inner: string) => {
    if (/<form\b/i.test(inner)) return full;
    if (!/type\s*=\s*["']email["']/i.test(inner)) return full;
    return `<footer${attrs}><form id="newsletter-form" class="landing-newsletter-form" method="get" action="#">${inner}</form></footer>`;
  });
}

function shouldReplaceStockWithAi(): boolean {
  return process.env.LANDING_REPLACE_STOCK_WITH_AI?.trim().toLowerCase() === "true";
}

function fillEmptyImagePlaceholders(html: string): string {
  return html.replace(
    /<div\b([^>]*class=["'][^"']*(?:image|img|photo|media|hero)[^"']*["'][^>]*)>([\s\n\r]*)<\/div>/gi,
    "",
  );
}

function normalizeHeroHeadingSurface(html: string): string {
  if (/data-landing-title-fix=["']1["']/i.test(html)) return html;
  if (/<header\b[^>]*>/i.test(html)) {
    return html.replace(/<header\b([^>]*)>/i, `<header$1 data-landing-title-fix="1">`);
  }
  if (/<section\b[^>]*class=["'][^"']*hero[^"']*["'][^>]*>/i.test(html)) {
    return html.replace(
      /<section\b([^>]*class=["'][^"']*hero[^"']*["'][^>]*)>/i,
      `<section$1 data-landing-title-fix="1">`,
    );
  }
  return html;
}

function ensureAtLeastOneHeroImage(html: string): string {
  return html;
}

function ensureVisualCoverage(html: string): string {
  return html;
}

function ensureLeadForm(html: string): string {
  return html;
}

function toLocalImageUrl(prompt: string, size: { width: number; height: number }): string {
  const encoded = encodeURIComponent(prompt.trim().slice(0, 600));
  const width = Math.max(256, Math.min(2048, Math.round(size.width)));
  const height = Math.max(256, Math.min(2048, Math.round(size.height)));
  return `/image?prompt=${encoded}&w=${width}&h=${height}`;
}

function replaceStockImagesWithAi(html: string): string {
  const title =
    /<title[^>]*>([^<]{1,160})<\/title>/i.exec(html)?.[1]?.trim() ||
    /<h1[^>]*>([^<]{1,160})<\/h1>/i.exec(html)?.[1]?.trim() ||
    "";

  const heroSize = { width: 1280, height: 720 };
  const cardSize = { width: 1024, height: 768 };

  return html.replace(/<img\b[^>]*>/gi, (tag) => {
    const srcMatch = /\ssrc\s*=\s*(["'])(.*?)\1/i.exec(tag);
    const src = srcMatch?.[2]?.trim() ?? "";
    if (!src) return tag;
  
    if (/^\/image\?/i.test(src)) return tag;
    if (!/^(https?:\/\/)/i.test(src)) return tag;
    if (!/(images\.unsplash\.com|images\.pexels\.com|image\.pollinations\.ai)/i.test(src)) return tag;

    const altMatch = /\salt\s*=\s*(["'])(.*?)\1/i.exec(tag);
    const alt = altMatch?.[2]?.trim() ?? "";

    const isHero = /data-landing-title-fix\s*=\s*(["'])1\1/i.test(html) && /class\s*=\s*(["'])[^"']*\bhero\b/i.test(html)
      ? /class\s*=\s*(["'])[^"']*\bhero\b[^"']*\1/i.test(html.slice(Math.max(0, html.indexOf(tag) - 400), html.indexOf(tag) + 400))
      : /class\s*=\s*(["'])[^"']*\bhero\b/i.test(tag);

    const basePrompt = alt || "Website section illustration";
    const fullPrompt = title ? `${basePrompt}. ${title}.` : basePrompt;
    const aiUrl = toLocalImageUrl(fullPrompt, isHero ? heroSize : cardSize);

    if (srcMatch) {
      return tag.replace(/\ssrc\s*=\s*(["'])(.*?)\1/i, ` src="${aiUrl}"`);
    }
    return tag.replace(/<img/i, `<img src="${aiUrl}"`);
  });
}

export function enhanceLandingHtml(html: string, fallbackImageSrc: string = FALLBACK_IMAGE_SRC): string {
  const withLayoutWidths = normalizeLayoutWidths(html);
  const withSanitizedCssDataUrls = sanitizeInlineCssDataUrls(withLayoutWidths);
  const withSafeBgImages = ensureBackgroundImagesHaveSource(withSanitizedCssDataUrls);
  const withSafeImages = ensureImageTagsHaveSource(withSafeBgImages);
  const withFixedSectionAnchors = fixIncompleteSectionAnchors(withSafeImages);
  const withContactAnchors = ensureContactSectionAnchors(withFixedSectionAnchors);
  const withNewsletterForm = ensureFooterNewsletterForm(withContactAnchors);
  const withImagePlaceholders = fillEmptyImagePlaceholders(withNewsletterForm);
  const withHeroTitleFix = normalizeHeroHeadingSurface(withImagePlaceholders);
  const withHeroImage = ensureAtLeastOneHeroImage(withHeroTitleFix);
  const withAiImages = shouldReplaceStockWithAi() ? replaceStockImagesWithAi(withHeroImage) : withHeroImage;
  const withVisualCoverage = ensureVisualCoverage(withAiImages);
  const withLeadForm = ensureLeadForm(withVisualCoverage);
  const normalizedLinks = rewriteInternalLinksToAnchors(withLeadForm);
  const trimmed = normalizedLinks.trim();
  if (!trimmed) return trimmed;
  if (
    trimmed.includes(`${ANCHOR_MARKER}="1"`) &&
    trimmed.includes(`${FOOTER_MARKER}="1"`) &&
    trimmed.includes(`${LEAD_FORM_MARKER}="1"`) &&
    trimmed.includes(`${CONTACT_MARKER}="1"`) &&
    trimmed.includes(`${CONTRAST_MARKER}="1"`) &&
    trimmed.includes(`${LEAD_ALIGN_MARKER}="1"`) &&
    trimmed.includes(`${IMAGE_RETRY_MARKER}="1"`) &&
    trimmed.includes(`${LAYOUT_MARKER}="1"`) &&
    trimmed.includes(`${STRUCTURE_MARKER}="1"`)
  ) {
    return trimmed;
  }

  const injections = [
    !trimmed.includes(`${FOOTER_MARKER}="1"`) ? FOOTER_STYLE : "",
    !trimmed.includes(`${LAYOUT_MARKER}="1"`) ? LAYOUT_STYLE : "",
    !trimmed.includes(`${STRUCTURE_MARKER}="1"`) ? STRUCTURE_STYLE : "",
    !trimmed.includes(`${LEAD_FORM_MARKER}="1"`) ? LEAD_FORM_STYLE : "",
    !trimmed.includes(`${ANCHOR_MARKER}="1"`) ? ANCHOR_SCRIPT : "",
    !trimmed.includes(`${CONTACT_MARKER}="1"`) ? CONTACT_SCRIPT : "",
    !trimmed.includes(`${CONTRAST_MARKER}="1"`) ? CONTRAST_SCRIPT : "",
    !trimmed.includes(`${LEAD_ALIGN_MARKER}="1"`) ? LEAD_ALIGN_SCRIPT : "",
    !trimmed.includes(`${IMAGE_RETRY_MARKER}="1"`) ? IMAGE_RETRY_SCRIPT : "",
  ]
    .filter(Boolean)
    .join("");

  if (/<\/body\s*>/i.test(trimmed)) {
    return trimmed.replace(/<\/body\s*>/i, `${injections}</body>`);
  }
  if (/<\/html\s*>/i.test(trimmed)) {
    return trimmed.replace(/<\/html\s*>/i, `${injections}</html>`);
  }
  return `${trimmed}\n${injections}`;
}
