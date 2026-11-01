/* Pure diary / plan rules, shared by Android and the browser preview. */
(function(root) {
  'use strict';
  const PRODUCTS = {
    cigarettes: { name: 'Сигареты', unit: 'сигарет', single: 'сигарету', short: 'сигареты', initial: 12 },
    vape: { name: 'Вейп', unit: 'эпизодов', single: 'эпизод', short: 'эпизоды', initial: 15 },
    sticks: { name: 'Стики', unit: 'стиков', single: 'стик', short: 'стики', initial: 10 }
  };
  const dayKey = (value = Date.now()) => {
    const d = new Date(value);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  };
  const dayOffset = (offset, value = Date.now()) => {
    const d = new Date(value); d.setHours(12,0,0,0); d.setDate(d.getDate()+offset); return dayKey(d);
  };
  const initial = () => ({ version:1, theme:'light', profile:null, events:[], days:{}, totals:{}, pauses:[], timer:null });
  function eventsFor(s, product, day) { return s.events.filter(e => e.product === product && dayKey(e.at) === day).sort((a,b)=>a.at-b.at || a.id.localeCompare(b.id)); }
  function loggedCount(s, product, day) {
    const list = eventsFor(s,product,day);
    if(product !== 'vape') return list.reduce((sum,e)=>sum+e.quantity,0);
    let sessions=0, previous=-Infinity;
    for(const e of list) { if(e.at-previous >= 10*60*1000) sessions++; previous=e.at; }
    return sessions;
  }
  function count(s, product, day) {
    const logged=loggedCount(s,product,day), total=s.totals?.[day]?.[product];
    return total ? Math.max(0,total.value+logged-total.logged) : logged;
  }
  function hasTotal(s,product,day) { return !!s.totals?.[day]?.[product] || complete(s,day); }
  function setDayTotals(s,day,values,now=Date.now()) {
    const parsed=new Date(day+'T12:00:00');
    if(!/^\d{4}-\d{2}-\d{2}$/.test(day) || !Number.isFinite(parsed.getTime()) || dayKey(parsed)!==day || day>dayKey(now)) throw Error('Выбери прошедшую или сегодняшнюю дату.');
    const next={};
    for(const p of s.profile.products) {
      const value=values[p];
      if(value==='' || value===null || value===undefined) continue;
      const n=Number(value);
      if(!Number.isInteger(n) || n<0 || n>200) throw Error('Количество: целое число от 0 до 200.');
      next[p]={value:n,logged:loggedCount(s,p,day)};
    }
    s.totals ||= {};
    if(Object.keys(next).length)s.totals[day]=next;else delete s.totals[day];
    delete s.days[day];
  }
  function complete(s, day) { return s.days[day] === 'complete'; }
  function syncTotal(s,product,day) {
    const total=s.totals?.[day]?.[product];
    if(total) {
      const logged=loggedCount(s,product,day);
      total.value=Math.max(0,total.value+logged-total.logged);
      total.logged=logged;
    }
  }
  function average(s, product, before=dayKey(), n=3) {
    const days=[...new Set([...Object.keys(s.days),...Object.keys(s.totals||{})])].filter(d=>d<before && hasTotal(s,product,d)).sort().reverse().slice(0,n);
    return { days, value:days.length ? days.reduce((sum,d)=>sum+count(s,product,d),0)/days.length : null };
  }
  function limit(s,product,day=dayKey()) {
    const plan=s.profile.plans[product];
    if(day>=s.profile.quitDate) return 0;
    const step=plan.steps.filter(x=>x.from<=day).sort((a,b)=>b.from.localeCompare(a.from))[0];
    return step ? step.limit : plan.baseline;
  }
  function addEvent(s, data, now=Date.now()) {
    if(!s.profile || !s.profile.products.includes(data.product)) throw Error('Выбери продукт из профиля.');
    const at=Number(data.at), quantity=Number(data.quantity);
    if(!Number.isFinite(at) || at>now) throw Error('Нельзя добавить запись из будущего.');
    if(dayKey(at)<s.profile.started) throw Error('Дата раньше начала дневника.');
    if(!Number.isInteger(quantity) || quantity<1 || quantity>200) throw Error('Количество: целое число от 1 до 200.');
    const old=s.events.find(e=>e.id===data.id);
    if(old) delete s.days[dayKey(old.at)];
    const e={id:old?.id || `${now}-${Math.random().toString(36).slice(2,9)}`,product:data.product,at,quantity:data.product==='vape'?1:quantity,trigger:String(data.trigger||'').slice(0,100)};
    s.events=s.events.filter(x=>x.id!==e.id); s.events.push(e); delete s.days[dayKey(at)];
    if(old)syncTotal(s,old.product,dayKey(old.at));
    syncTotal(s,e.product,dayKey(e.at));
    return e;
  }
  function deleteEvent(s,id) { const e=s.events.find(x=>x.id===id); if(e) { s.events=s.events.filter(x=>x.id!==id); delete s.days[dayKey(e.at)]; syncTotal(s,e.product,dayKey(e.at)); } return e; }
  function setLimit(s, product, value, from=dayKey()) {
    const n=Number(value); if(!Number.isInteger(n) || n<0 || n>200) throw Error('Предел: целое число от 0 до 200.');
    if(!s.profile.products.includes(product)) throw Error('Неизвестный продукт.');
    s.profile.plans[product].steps=s.profile.plans[product].steps.filter(x=>x.from!==from).concat({from,limit:n});
  }
  function achievements(s, today=dayKey()) {
    const zeroDays=[...new Set([...Object.keys(s.days),...Object.keys(s.totals||{})])].filter(d=>d<today && s.profile.products.every(p=>hasTotal(s,p,d)&&count(s,p,d)===0)).length;
    const pauseDays=new Set(s.pauses.map(p=>dayKey(p))).size;
    return { zeroDays, pauseDays, level:Math.min(4,1+Math.floor((zeroDays+pauseDays)/3)) };
  }
  function validate(raw) {
    if(raw?.theme!==undefined && !['light','dark'].includes(raw.theme)) throw Error('Некорректные настройки темы.');
    if(!raw || raw.version!==1 || !Array.isArray(raw.events) || !raw.days || !Array.isArray(raw.pauses)) throw Error('Некорректные данные дневника.');
    if(raw.profile && (!Array.isArray(raw.profile.products) || !raw.profile.products.length || raw.profile.products.some(p=>!PRODUCTS[p]) || !raw.profile.plans || !/^\d{4}-\d{2}-\d{2}$/.test(raw.profile.quitDate))) throw Error('Некорректный профиль.');
    const date=s=>typeof s==='string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && Number.isFinite(new Date(s+'T12:00:00').getTime());
    if(raw.profile) {
      if(!date(raw.profile.started) || !date(raw.profile.quitDate) || typeof raw.profile.reason!=='string') throw Error('Некорректный профиль.');
      for(const product of raw.profile.products) {
        const p=raw.profile.plans[product];
        if(!p || !Number.isInteger(p.baseline) || p.baseline<1 || p.baseline>200 || !Array.isArray(p.steps) || p.steps.some(x=>!date(x.from)||!Number.isInteger(x.limit)||x.limit<0||x.limit>200)) throw Error('Некорректный план.');
      }
    }
    if(raw.events.some(e=>!e || typeof e.id!=='string' || !PRODUCTS[e.product] || !Number.isFinite(e.at) || !Number.isInteger(e.quantity) || e.quantity<1 || e.quantity>200 || typeof e.trigger!=='string')) throw Error('Некорректные записи.');
    if(raw.pauses.some(t=>!Number.isFinite(t)) || (raw.timer && (!Number.isFinite(raw.timer.end) || typeof raw.timer.id!=='string'))) throw Error('Некорректные данные пауз.');
    if(Object.entries(raw.days).some(([day,status])=>!date(day)||status!=='complete')) throw Error('Некорректные данные дней.');
    if(raw.totals && (typeof raw.totals!=='object' || Array.isArray(raw.totals) || Object.entries(raw.totals).some(([day,values])=>!date(day)||!values||typeof values!=='object'||Object.entries(values).some(([p,v])=>!PRODUCTS[p]||!v||!Number.isSafeInteger(v.value)||v.value<0||!Number.isInteger(v.logged)||v.logged<0)))) throw Error('Некорректные итоги дней.');
    return raw;
  }
  const api={PRODUCTS,dayKey,dayOffset,initial,eventsFor,loggedCount,count,hasTotal,setDayTotals,complete,average,limit,addEvent,deleteEvent,setLimit,achievements,validate};
  root.QuitCore=api;
  if(typeof module !== 'undefined') module.exports=api;
})(globalThis);
