/* LinkBox floating AI chat. API requests go through a server-side proxy; no OpenAI secret is shipped. */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const panel = $('lb-chat-panel'), toggle = $('lb-chat-toggle'), close = $('lb-chat-close');
  const messages = $('lb-chat-messages'), form = $('lb-chat-form'), input = $('lb-chat-input');
  const status = $('lb-chat-status'), send = $('lb-chat-send');
  if (!panel || !toggle || !form) return;
  const STORE = 'linkbox-ai-chat-v1';
  let history = [], busy = false, aborter = null;
  try { history = JSON.parse(localStorage.getItem(STORE) || '[]'); if (!Array.isArray(history)) history = []; } catch { history = []; }
  const save = () => { try { localStorage.setItem(STORE, JSON.stringify(history.slice(-40))); } catch {} };
  const open = () => { panel.classList.add('is-open'); panel.setAttribute('aria-hidden','false'); toggle.setAttribute('aria-expanded','true'); input.focus(); };
  const shut = () => { panel.classList.remove('is-open'); panel.setAttribute('aria-hidden','true'); toggle.setAttribute('aria-expanded','false'); };
  toggle.addEventListener('click', () => panel.classList.contains('is-open') ? shut() : open());
  close.addEventListener('click', shut);
  $('lb-chat-new').addEventListener('click', () => { history=[]; save(); render(); status.textContent='گفت‌وگوی جدید آماده است.'; });
  document.querySelectorAll('.lb-chat-suggestions button').forEach(b => b.addEventListener('click', () => { input.value=b.textContent; input.focus(); }));
  function addBubble(role, text, saveIt=true) { history.push({role, content:text}); if(saveIt) save(); render(); }
  function render() {
    messages.replaceChildren();
    if (!history.length) {
      const welcome=document.createElement('div'); welcome.className='lb-chat-welcome';
      const icon=document.createElement('span'); icon.className='lb-chat-welcome-icon'; icon.textContent='✧';
      const h=document.createElement('h3'); h.textContent='سلام! چطور می‌تونم کمک کنم؟';
      const p=document.createElement('p'); p.textContent='هر سوالی داری بپرس؛ از ایده‌پردازی و نوشتن تا برنامه‌نویسی و تحلیل.';
      welcome.append(icon,h,p); messages.append(welcome);
      return;
    }
    history.forEach(m => { const bubble=document.createElement('div'); bubble.className='lb-chat-bubble '+(m.role==='user'?'from-user':'from-assistant'); bubble.textContent=m.content; messages.append(bubble); });
    messages.scrollTop=messages.scrollHeight;
  }
  function setBusy(value) { busy=value; send.textContent=value?'■':'↑'; send.setAttribute('aria-label',value?'توقف پاسخ':'ارسال پیام'); input.disabled=value; }
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (busy) { aborter?.abort(); return; }
    const text=input.value.trim(); if(!text) return;
    input.value=''; status.textContent=''; addBubble('user',text); setBusy(true); aborter=new AbortController();
    const pending=document.createElement('div'); pending.className='lb-chat-bubble from-assistant lb-chat-pending'; pending.textContent='در حال فکر کردن…'; messages.append(pending); messages.scrollTop=messages.scrollHeight;
    try {
      const cfg=window.LINKBOX_CONFIG || {};
      const endpoint=cfg.aiChatEndpoint || (cfg.supabaseUrl ? cfg.supabaseUrl.replace(/\/$/,'') + '/functions/v1/linkbox-ai' : '/api/ai-chat');
      const headers={'Content-Type':'application/json'}; if(cfg.supabaseAnonKey) headers.apikey=cfg.supabaseAnonKey;
      const response=await fetch(endpoint,{method:'POST',headers,body:JSON.stringify({messages:history.slice(-20)}),signal:aborter.signal});
      const data=await response.json().catch(()=>({}));
      if(!response.ok) throw new Error(data.error || 'ارتباط با دستیار برقرار نشد.');
      const answer=String(data.reply || data.output_text || '').trim(); if(!answer) throw new Error('پاسخ خالی از سرویس دریافت شد.');
      history.push({role:'assistant',content:answer}); save(); render();
    } catch(err) {
      if(err.name==='AbortError') status.textContent='پاسخ متوقف شد.';
      else { status.textContent=err.message || 'خطا در ارتباط. لطفاً دوباره تلاش کن.'; const errBubble=document.createElement('div'); errBubble.className='lb-chat-error'; errBubble.textContent='فعلاً امکان دریافت پاسخ وجود ندارد. پس از تنظیم سرویس سمت سرور دوباره امتحان کن.'; messages.append(errBubble); }
    } finally { setBusy(false); aborter=null; input.focus(); }
  });
  input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();form.requestSubmit();}});
  render();
})();
