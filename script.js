/* Yasmin.lab.rez — кітапты парақтау және байланыс формасы */
(function(){
const book=document.getElementById('book'),scaler=document.getElementById('scaler'),src=document.getElementById('src');
const pages=[...src.querySelectorAll(':scope > .pg-src')];
const N=pages.length;
let mode=null,leaves=[],cur=0,maxCur=0,seq=0,pending=[];

/* page numbers: index in book (cover = 0, not printed) */
const pageNo={};pages.forEach((p,i)=>{if(p.id)pageNo[p.id]=i});
document.querySelectorAll('[data-pn]').forEach(el=>{const n=pageNo[el.dataset.pn];if(n!=null)el.textContent=n});

function el(tag,cls){const e=document.createElement(tag);if(cls)e.className=cls;return e}

function makeFace(page,side,idx){
  const f=el('div','face '+side);
  if(page){
    if(page.classList.contains('hard'))f.classList.add('hard');
    f.appendChild(page);
    if(!page.classList.contains('hard')){
      const fo=el('div','folio');
      fo.innerHTML='<span>Yasmin.lab.rez</span><span class="no">'+idx+'</span>';
      f.appendChild(fo);
      if(!/^toc/.test(page.id)){const r=el('button','ribbon');r.dataset.goto='toc1';r.title='Мазмұнына өту';r.innerHTML='☰<span class="rl">Мазмұны</span>';f.appendChild(r);}
    }
  }
  f.appendChild(el('div','shade'));
  return f;
}

function currentPage(){ if(mode==='d') return cur===0?0:Math.min(N-1,2*cur-1); return cur; }
function targetFor(p){ return mode==='d'?Math.ceil(p/2):p; }

function build(){
  const desktop=innerWidth>=900 && innerWidth/innerHeight>1.05;
  const newMode=desktop?'d':'m';
  const keepPage=mode?currentPage():0;
  if(newMode!==mode){
    pages.forEach(p=>src.appendChild(p));
    book.innerHTML='';
    mode=newMode;
    book.classList.toggle('single',mode==='m');
    const bl=el('div','base left'),br=el('div','base right');
    bl.appendChild(el('div','edge'));br.appendChild(el('div','edge'));
    book.append(bl,br);
    leaves=[];
    const step=mode==='d'?2:1,count=Math.ceil(N/step);
    for(let k=0;k<count;k++){
      const lf=el('div','leaf');
      const fi=k*step;
      lf.appendChild(makeFace(pages[fi],'front',fi));
      if(mode==='d') lf.appendChild(makeFace(pages[fi+1]||null,'back',fi+1));
      else lf.appendChild(makeFace(null,'back'));
      lf.addEventListener('transitionend',e=>{if(e.target===lf&&e.propertyName==='transform'){lf.classList.remove('turning');setZ(lf)}});
      leaves.push(lf);book.appendChild(lf);
    }
    const zp=el('div','zone prev'),zn=el('div','zone next');
    zp.textContent='‹';zn.textContent='›';
    zp.onclick=prev;zn.onclick=next;
    zn.onmouseenter=()=>peek(1,true);zn.onmouseleave=()=>peek(1,false);
    zp.onmouseenter=()=>peek(-1,true);zp.onmouseleave=()=>peek(-1,false);
    book.append(zp,zn);
    maxCur=mode==='d'?leaves.length:leaves.length-1;
    cur=Math.max(0,Math.min(maxCur,targetFor(keepPage)));
    leaves.forEach((lf,i)=>{lf.style.transition='none';lf.classList.toggle('flipped',i<cur)});
    void book.offsetWidth;
    leaves.forEach(lf=>lf.style.transition='');
    leaves.forEach(setZ);
    document.getElementById('scrub').max=maxCur;
  }
  fit();update();
}

function setZ(lf){
  if(lf.classList.contains('turning'))return;
  const i=leaves.indexOf(lf);
  lf.style.zIndex=lf.classList.contains('flipped')?(i+1):(leaves.length-i+1);
}

function fit(){
  const top=56,bottom=84,W=innerWidth-24,H=innerHeight-top-bottom-18;
  let pw,ph,bw;
  if(mode==='d'){pw=480;ph=680;bw=pw*2;}
  else{pw=380;ph=Math.round(Math.max(560,Math.min(760,pw*H/W)));bw=pw;}
  document.documentElement.style.setProperty('--pw',pw+'px');
  document.documentElement.style.setProperty('--ph',ph+'px');
  const extra=mode==='d'?40:6;
  const s=Math.min(W/(bw+extra),H/ph);
  scaler.style.width=bw+'px';scaler.style.height=ph+'px';
  scaler.style.transform='scale('+s+')';
}

function update(){
  // centre a closed book
  let shift=0;
  if(mode==='d'){ if(cur===0)shift=-240; else if(cur===maxCur)shift=240; }
  book.style.transform='translateX('+shift+'px)';
  const bl=book.querySelector('.base.left'),br=book.querySelector('.base.right');
  if(mode==='d'){
    bl.style.opacity=cur>0?1:0; br.style.opacity=cur<maxCur?1:0;
    bl.querySelector('.edge').style.width=(cur>0?Math.max(1,Math.round(cur/maxCur*9)):0)+'px';
    br.querySelector('.edge').style.width=(cur<maxCur?Math.max(1,Math.round((maxCur-cur)/maxCur*9)):0)+'px';
  }else{
    bl.style.opacity=0;br.style.opacity=1;
    br.querySelector('.edge').style.width=Math.max(1,Math.round((maxCur-cur)/maxCur*7))+'px';
  }
  book.querySelector('.zone.prev').hidden=cur===0||(mode==='d'&&cur===maxCur&&false);
  book.querySelector('.zone.next').hidden=cur===maxCur||cur===0;
  const ind=document.getElementById('indicator');
  if(cur===0) ind.innerHTML='<b>Мұқаба</b>';
  else if(mode==='d'&&cur===maxCur) ind.innerHTML='<b>Артқы мұқаба</b>';
  else if(mode==='d'){const a=2*cur-1,b=Math.min(2*cur,N-1);ind.innerHTML='Беттер <b>'+a+'–'+b+'</b> / '+(N-1);}
  else if(cur===N-1&&pages[cur].classList.contains('hard')) ind.innerHTML='<b>Артқы мұқаба</b>';
  else ind.innerHTML='Бет <b>'+cur+'</b> / '+(N-1);
  document.getElementById('btnPrev').disabled=cur===0;
  document.getElementById('btnStart').disabled=cur===0;
  document.getElementById('btnNext').disabled=cur===maxCur;
  document.getElementById('scrub').value=cur;
}

function flush(){const p=pending;pending=[];p.forEach(o=>{clearTimeout(o.t);o.fn()})}

function go(target){
  target=Math.max(0,Math.min(maxCur,target|0));
  flush();
  if(target===cur)return;
  leaves.forEach(l=>l.classList.remove('peek'));
  const dir=target>cur?1:-1,list=[];
  if(dir>0)for(let i=cur;i<target;i++)list.push(i);else for(let i=cur-1;i>=target;i--)list.push(i);
  const n=list.length;
  const dur=n>1?Math.max(.5,.95-n*.02):.95;
  const step=n>1?Math.min(115,1500/n):0;
  cur=target;update();
  list.forEach((i,k)=>{
    const fn=()=>{const lf=leaves[i];lf.style.setProperty('--dur',dur+'s');lf.classList.add('turning');lf.style.zIndex=1000+(++seq);lf.classList.toggle('flipped',dir>0);};
    if(k===0)fn();else{const o={fn};o.t=setTimeout(()=>{pending=pending.filter(x=>x!==o);fn()},k*step);pending.push(o);}
  });
}
function next(){go(cur+1)}
function prev(){go(cur-1)}
function goToPage(p){go(targetFor(p))}
function goToId(id){if(id==='__start')return go(0);const i=pageNo[id];if(i!=null)goToPage(i)}
window.goToId=goToId;

function peek(dir,on){
  if(mode!=='d')return;
  const i=dir>0?cur:cur-1;const lf=leaves[i];
  if(!lf||lf.classList.contains('turning'))return;
  lf.classList.toggle('peek',on);
}

/* events */
document.getElementById('btnNext').onclick=next;
document.getElementById('btnPrev').onclick=prev;
document.getElementById('btnStart').onclick=()=>go(0);
document.getElementById('btnToc').onclick=()=>goToId('toc1');
document.getElementById('scrub').addEventListener('input',e=>go(+e.target.value));
document.addEventListener('click',e=>{
  const g=e.target.closest('[data-goto]');
  if(g){e.preventDefault();e.stopPropagation();goToId(g.dataset.goto);return}
  if(e.target.closest('.cover-wrap.front-cover')&&cur===0){next()}
});
document.addEventListener('keydown',e=>{
  if(/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;
  if(e.key==='ArrowRight'||e.key==='PageDown'){e.preventDefault();next()}
  else if(e.key==='ArrowLeft'||e.key==='PageUp'){e.preventDefault();prev()}
  else if(e.key==='Home'){go(0)}else if(e.key==='End'){go(maxCur)}
});
let tx=null,ty=null;
const stage=document.getElementById('stage');
stage.addEventListener('touchstart',e=>{tx=e.changedTouches[0].clientX;ty=e.changedTouches[0].clientY},{passive:true});
stage.addEventListener('touchend',e=>{if(tx===null)return;const dx=e.changedTouches[0].clientX-tx,dy=e.changedTouches[0].clientY-ty;
  if(Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy)*1.3){dx<0?next():prev()}tx=null},{passive:true});
let rt;addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(build,120)});

build();

/* ===== Байланыс формасы: хабарлама Java серверіне жіберіледі ===== */
const API = location.protocol === 'file:' ? 'http://localhost:8080/api/messages' : '/api/messages';
const form=document.getElementById('contactForm');
if(form)form.addEventListener('submit',async e=>{
  e.preventDefault();
  const status=document.getElementById('formStatus');
  const data=Object.fromEntries(new FormData(form).entries());
  status.textContent='Жіберіліп жатыр...';
  try{
    const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json; charset=utf-8'},body:JSON.stringify(data)});
    const res=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(res.error||'Қате');
    status.textContent='Хабарлама сәтті жіберілді. Рақмет!';
    form.reset();
  }catch(err){
    status.textContent=err.message&&err.message!=='Failed to fetch'?err.message:'Java серверіне қосылмады. README.md нұсқаулығы бойынша серверді іске қосыңыз.';
  }
});
})();
