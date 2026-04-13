import {
  ANCHOR_MARKER,
  CONTACT_MARKER,
  CONTRAST_MARKER,
  IMAGE_RETRY_MARKER,
  LEAD_ALIGN_MARKER,
} from "./landingHtmlPostprocessMarkers.js";
import { FALLBACK_IMAGE_SRC } from "./landingHtmlPostprocessImageUrl.js";

export const ANCHOR_SCRIPT = `<script ${ANCHOR_MARKER}="1">
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

export const CONTACT_SCRIPT = `<script ${CONTACT_MARKER}="1">
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

export const CONTRAST_SCRIPT = `<script ${CONTRAST_MARKER}="1">
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

export const LEAD_ALIGN_SCRIPT = `<script ${LEAD_ALIGN_MARKER}="1">
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

export const IMAGE_RETRY_SCRIPT = `<script ${IMAGE_RETRY_MARKER}="1">
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
