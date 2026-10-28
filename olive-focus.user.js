// ==UserScript==
// @name         Olive · 专注时光
// @namespace    https://github.com/xiongziyao/olive-focus
// @version      1.0.0
// @description  浏览器专注计时：今日、累计、暂停、拖拽、折叠、位置记忆
// @match        *://*/*
// @grant        GM_getValue
// @grant        GM_setValue
// @run-at       document-idle
// @noframes
// ==/UserScript==

(function () {
  'use strict';
  const ID = 'olive-focus-320';
  if (document.getElementById(ID)) return;
  const DATA = 'olive-focus-data-320';
  const VIEW = 'olive-focus-view-320';
  const LOCK = 'olive-focus-lock-320';
  const TAB = Math.random().toString(36).slice(2);
  const get = (key, fallback) => GM_getValue(key, fallback);
  const put = (key, value) => GM_setValue(key, value);
  const date = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  };
  function load() {
    const d = get(DATA, {}) || {};
    const result = { date: d.date || date(), today: Number(d.today)||0, total: Number(d.total)||0, paused: !!d.paused };
    if (result.date !== date()) {
      result.date = date(); result.today = 0; put(DATA, result);
    }
    return result;
  }
  const fmt = n => {
    n = Math.floor(Math.max(0,n));
    return [Math.floor(n/3600), Math.floor(n%3600/60), n%60].map(v=>String(v).padStart(2,'0')).join(':');
  };
  const css = document.createElement('style');
  css.textContent = `
    #${ID}{position:fixed!important;top:100px;right:24px;z-index:2147483647!important;width:232px;background:white;color:#334155;border:1px solid #d9e9de;border-radius:14px;box-shadow:0 6px 24px #0002;font:14px Arial,'Microsoft YaHei',sans-serif;overflow:hidden;box-sizing:border-box}
    #${ID} *{box-sizing:border-box}
    #${ID} .of-head{background:#e6f3e9;color:#286446;padding:12px;display:flex;align-items:center;justify-content:space-between;font-weight:bold;cursor:grab;touch-action:none;user-select:none}
    #${ID} .of-hide{background:none;border:0;color:#286446;font-size:20px;cursor:pointer}
    #${ID} .of-body{padding:16px;text-align:center}
    #${ID} .of-label{font-size:12px;color:#64748b;margin-bottom:5px}
    #${ID} .of-time{font-size:26px;font-weight:bold;font-variant-numeric:tabular-nums;margin-bottom:14px}
    #${ID} .of-today{color:#31845b}
    #${ID} .of-toggle{width:100%;background:#39875d;color:white;border:0;border-radius:8px;padding:10px;cursor:pointer}
    #${ID} .of-status{font-size:12px;color:#64748b;margin-top:10px}
    #${ID} .of-motto{font-size:11px;color:#94a3b8;margin-top:14px}
    #${ID} .of-bubble{display:none;width:116px;height:88px;border:0;border-radius:14px;background:#e6f3e9;color:#286446;cursor:grab;touch-action:none;user-select:none;padding:7px 4px;font-family:inherit;flex-direction:column;align-items:center;justify-content:center;gap:3px}
    #${ID} .of-bubble-icon{font-size:18px;line-height:19px}
    #${ID} .of-bubble-time{font-size:17px;line-height:21px;font-weight:700;font-variant-numeric:tabular-nums}
    #${ID} .of-bubble-status{font-size:11px;line-height:14px}
    #${ID}.of-small{width:116px!important;height:88px!important;border-radius:14px!important}
    #${ID}.of-small .of-head,#${ID}.of-small .of-body{display:none!important}
    #${ID}.of-small .of-bubble{display:flex!important}
  `;
  const panel = document.createElement('div');
  panel.id = ID;
  panel.innerHTML = `<div class="of-head"><span>🌱 Olive · 专注时光</span><button class="of-hide" title="折叠">−</button></div>
    <div class="of-body"><div class="of-label">今日专注</div><div class="of-time of-today">00:00:00</div>
    <div class="of-label">累计专注</div><div class="of-time of-total">00:00:00</div>
    <button class="of-toggle">暂停计时</button><div class="of-status">正在专注</div>
    <div class="of-motto">在正确的道路上，坚定地走下去</div></div>
    <button class="of-bubble" title="单击展开，拖动移动"><span class="of-bubble-icon">🌱</span><span class="of-bubble-time">00:00:00</span><span class="of-bubble-status">正在专注</span></button>`;
  document.documentElement.append(css, panel);
  const q = s => panel.querySelector(s);
  const head = q('.of-head'), bubble = q('.of-bubble');
  const view = get(VIEW, {}) || {};
  if (view.small) panel.classList.add('of-small');
  function position(x,y) {
    const w = panel.offsetWidth, h = panel.offsetHeight;
    panel.style.left = Math.max(0,Math.min(innerWidth-w,x))+'px';
    panel.style.top = Math.max(0,Math.min(innerHeight-h,y))+'px';
    panel.style.right = 'auto';
  }
  if (Number.isFinite(view.x) && Number.isFinite(view.y)) position(view.x,view.y);
  function saveView() {
    const r = panel.getBoundingClientRect();
    put(VIEW,{x:r.left,y:r.top,small:panel.classList.contains('of-small')});
  }
  function setSmall(small) {
    const r = panel.getBoundingClientRect();
    panel.classList.toggle('of-small',small);
    position(r.left,r.top);
    saveView();
  }
  q('.of-hide').addEventListener('click',e=>{e.stopPropagation();setSmall(true);});
  function drag(el,allowClick) {
    let state = null;
    el.addEventListener('pointerdown',e=>{
      if (e.button!==0 || e.target.closest('.of-hide')) return;
      const r=panel.getBoundingClientRect();
      state={id:e.pointerId,x:e.clientX,y:e.clientY,left:r.left,top:r.top,moved:false};
      el.setPointerCapture(e.pointerId);
    });
    el.addEventListener('pointermove',e=>{
      if (!state || state.id!==e.pointerId) return;
      const dx=e.clientX-state.x,dy=e.clientY-state.y;
      if (Math.hypot(dx,dy)>5) state.moved=true;
      if (state.moved) position(state.left+dx,state.top+dy);
    });
    function end(e,cancel=false) {
      if (!state || state.id!==e.pointerId) return;
      const moved=state.moved; state=null;
      if (moved) saveView();
      else if (allowClick && !cancel) setSmall(false);
    }
    el.addEventListener('pointerup',e=>end(e));
    el.addEventListener('pointercancel',e=>end(e,true));
  }
  drag(head,false);
  drag(bubble,true);
  q('.of-toggle').addEventListener('click',()=>{
    const d=load();d.paused=!d.paused;put(DATA,d);render();
  });
  const active=()=>document.visibilityState==='visible'&&document.hasFocus();
  function release() {
    const l=get(LOCK,null);
    if(l&&l.id===TAB) put(LOCK,null);
  }
  function leader(now) {
    const l=get(LOCK,null);
    if(l&&l.id!==TAB&&now-l.at<3000) return false;
    put(LOCK,{id:TAB,at:now});
    const check=get(LOCK,null);
    return check&&check.id===TAB;
  }
  function render() {
    const d=load();
    q('.of-today').textContent=fmt(d.today);
    q('.of-total').textContent=fmt(d.total);
    q('.of-toggle').textContent=d.paused?'▶ 继续计时':'Ⅱ 暂停计时';
    q('.of-status').textContent=d.paused?'⏸ 已暂停':active()?'🌱 正在专注':'等待返回网页';
    q('.of-bubble-time').textContent=fmt(d.today);
    q('.of-bubble-status').textContent=d.paused?'⏸ 已暂停':active()?'● 正在专注':'○ 等待专注';
  }
  let last=Date.now();
  setInterval(()=>{
    const now=Date.now(),elapsed=now-last;last=now;
    const d=load();
    if(!d.paused&&active()&&elapsed>0&&elapsed<2500&&leader(now)) {
      const latest=load();
      if(!latest.paused){latest.today+=elapsed/1000;latest.total+=elapsed/1000;put(DATA,latest);}
    } else if(d.paused||!active()) release();
    render();
  },1000);
  document.addEventListener('visibilitychange',()=>{last=Date.now();if(document.hidden)release();render();});
  window.addEventListener('blur',()=>{release();render();});
  window.addEventListener('focus',()=>{last=Date.now();render();});
  window.addEventListener('pagehide',release);
  window.addEventListener('resize',()=>{const r=panel.getBoundingClientRect();position(r.left,r.top);saveView();});
  render();
  console.log('[Olive] 专注时光 v3.3.0 已启动');
})();
