(() => {
'use strict';
const C = QuitCore;
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const icons = {
 leaf:'M12 21V12M12 15C4 15 3 9 3 5c7 0 10 4 9 10ZM12 12C12 5 16 3 22 3c0 6-4 10-10 9Z',
 home:'m3 10 9-7 9 7v10H15v-6H9v6H3Z',
 plan:'M6 3v4M18 3v4M3 10h18M4 5h16v16H4Z',
 chart:'M4 21V13h4v8ZM10 21V7h4v14ZM16 21V3h4v18Z',
 settings:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1Z',
 plus:'M12 5v14M5 12h14',
 arrow:'m9 5 7 7-7 7',
 back:'m14 5-7 7 7 7M7 12h14',
 check:'m5 12 4 4L19 6',
 close:'m6 6 12 12M6 18 18 6',
 water:'M12 3S5 11 5 15a7 7 0 0 0 14 0c0-4-7-12-7-12Z',
 walk:'M14 4a2 2 0 1 0 0 .1M8 12l4-5 4 5 4 1M12 7l-2 9-5 5M10 16l6 2 1 4M8 10l-4 2',
 wind:'M3 8h13a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h6a3 3 0 1 1-3 3',
 smoke:'M3 14h15v5H3ZM18 14h3v5h-3M13 3c-4 4 5 4 1 8M18 3c-3 4 5 4 2 8',
 vape:'M8 8h8v14H8ZM10 3h4v5M10 13h4',
 clock:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM12 7v5l3 2',
 info:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM12 11v6M12 7v1'
};
const icon = name => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${icons[name] || icons.leaf}"/></svg>`;
function sprout(level=1) {
 return `<svg class="sprout" viewBox="0 0 120 140" fill="none" aria-hidden="true"><path d="M22 128c17-5 25-4 38-2 12-4 22-2 36 1M60 126c0-25 0-40 5-62" stroke="var(--leaf-stroke)" stroke-width="1.5" stroke-linecap="round"/><path d="M63 88C38 91 25 75 23 58c24 2 39 10 40 30Z" fill="var(--leaf-light)" stroke="var(--leaf-stroke)" stroke-width="1.3"/><path d="M63 83C61 56 73 34 96 25c-1 29-12 47-33 58Z" fill="var(--leaf-main)" stroke="var(--leaf-stroke)" stroke-width="1.3"/><path d="M64 83 88 39M60 85 33 67" stroke="var(--leaf-stroke)" stroke-width="1.2"/>${level>=2?'<path d="M61 110c-23 0-33-8-35-20 20-1 32 6 35 20Z" fill="var(--leaf-mid)" stroke="var(--leaf-stroke)"/>':''}${level>=3?'<path d="M62 104c24-1 34-11 36-25-20 1-33 10-36 25Z" fill="var(--leaf-soft)" stroke="var(--leaf-stroke)"/>':''}${level>=4?'<circle cx="66" cy="29" r="8" fill="var(--leaf-bud)"/><path d="M65 64V37" stroke="var(--leaf-stroke)" stroke-width="1.5"/>':''}</svg>`;
}
let storageError = '';
let state;
try {
 const raw = window.Android ? Android.loadState() : localStorage.getItem('shag-v1');
 state = raw ? C.validate(JSON.parse(raw)) : C.initial();
} catch(e) {
 storageError='Не удалось прочитать дневник. Данные не перезаписаны. Перезапусти приложение или очисти их в настройках.';
 state=C.initial();
}
let page='today', selected=state.profile?.products[0] || 'cigarettes', diaryDate=C.dayKey();
let calendarMonth=C.dayKey().slice(0,7);
let setupStep=1, draft={products:['cigarettes'],amounts:{cigarettes:12,vape:15,sticks:10},mode:'reduce',quitDate:C.dayOffset(14),reason:''};
let toastTimeout, undoAction, timerInterval;
function save() {
 if(storageError) throw Error(storageError);
 const raw=JSON.stringify(state);
 if(window.Android) { if(!Android.saveState(raw)) throw Error('Не удалось сохранить данные на устройстве.'); }
 else localStorage.setItem('shag-v1',raw);
}
function change(fn) {
 const previous=JSON.stringify(state);
 try { fn(); save(); return true; }
 catch(e) { state=JSON.parse(previous); toast(e.message || 'Не удалось сохранить.'); return false; }
}
function toast(message, action=null) {
 clearTimeout(toastTimeout); undoAction=action;
 $('#toast').innerHTML=`<span>${esc(message)}</span>${action?'<button data-action="undo">Отменить</button>':''}`;
 $('#toast').classList.add('show');
 toastTimeout=setTimeout(()=>{$('#toast').classList.remove('show');undoAction=null;},action?8000:4500);
}
function formatDate(day, options={day:'numeric',month:'long'}) { return new Date(day+'T12:00:00').toLocaleDateString('ru-RU',options); }
function timeString(at) { return new Date(at).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'}); }
function inputTime(at=Date.now()) { const d=new Date(at); return `${C.dayKey(d)}T${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; }
function top() { return `<header class="top row between"><div class="logo row">${icon('leaf')}<span>Бросить курить</span></div><button class="icon-button" data-action="settings" aria-label="Настройки">${icon('settings')}</button></header>`; }
function nav() { return `<nav class="nav" aria-label="Разделы">${[['today','Сегодня','home'],['plan','План','plan'],['progress','Прогресс','chart']].map(([key,label,i])=>`<button data-page="${key}" class="${page===key?'active':''}" ${page===key?'aria-current="page"':''}>${icon(i)}${label}</button>`).join('')}</nav>`; }
function chips() { return state.profile.products.length>1?`<div class="chip-group" aria-label="Продукт">${state.profile.products.map(p=>`<button class="chip ${p===selected?'active':''}" data-product="${p}" aria-pressed="${p===selected}">${C.PRODUCTS[p].name}</button>`).join('')}</div>`:''; }
function applyTheme() {
 const dark=state.theme==='dark';
 document.documentElement.dataset.theme=dark?'dark':'light';
 document.querySelector('meta[name="theme-color"]').content=dark?'#151c17':'#f8f9f4';
 if(window.Android && typeof Android.setDarkMode==='function') Android.setDarkMode(dark);
}
function render() {
 applyTheme();
 if(storageError) {
  $('#app').innerHTML=`${top()}<h1>Дневник недоступен</h1><p>${esc(storageError)}</p><p class="hint">Чтобы не потерять записи, приложение не создаёт новый дневник поверх существующего.</p><button class="btn light" data-action="settings">Настройки</button>`;
  return;
 }
 if(!state.profile) { renderSetup(); return; }
 if(page==='craving') { renderCraving(); return; }
 const content=page==='plan'?renderPlan():page==='progress'?renderProgress():renderToday();
 $('#app').innerHTML=top()+content+nav();
}
function renderSetup() {
 const head=`<div class="row between top"><span class="logo row">${icon('leaf')}Бросить курить</span><span class="muted small">${setupStep} / 3</span></div><div class="setup-progress">${[1,2,3].map(n=>`<span class="${n<=setupStep?'done':''}"></span>`).join('')}</div>`;
 let content='';
 if(setupStep===1) content=`<div class="setup-art">${sprout()}</div><p class="eyebrow">Твой первый шаг</p><h1>С чего начнём?</h1><p class="muted">Что ты используешь? Можно выбрать несколько вариантов.</p><div class="stack" style="margin-top:26px">${Object.entries(C.PRODUCTS).map(([p,v])=>`<button class="choice ${draft.products.includes(p)?'selected':''}" data-select="${p}" aria-pressed="${draft.products.includes(p)}">${icon(p==='vape'?'vape':'smoke')}<span>${v.name}</span><span class="check">${draft.products.includes(p)?icon('check'):''}</span></button>`).join('')}</div><p class="hint">Сигареты, стики и вейп считаются отдельно. Первая версия предназначена для взрослых.</p>`;
 if(setupStep===2) content=`<p class="eyebrow">Без точности до мелочей</p><h1>Как обычно<br>проходит день?</h1><p class="muted">Примерная оценка поможет выбрать первый ориентир. Позже её уточнит дневник.</p>${draft.products.map(p=>`<div class="field"><label for="amount-${p}">${C.PRODUCTS[p].name} · ${C.PRODUCTS[p].unit} в день</label><div class="stepper"><button data-step="${p}:-1" aria-label="Уменьшить ${C.PRODUCTS[p].name}">−</button><input id="amount-${p}" data-amount="${p}" type="number" inputmode="numeric" min="1" max="200" value="${draft.amounts[p]}" aria-label="${C.PRODUCTS[p].name} в день"><button data-step="${p}:1" aria-label="Увеличить ${C.PRODUCTS[p].name}">+</button></div></div>`).join('')}${draft.products.includes('vape')?'<div class="note">Эпизод вейпа — серия отметок с перерывами менее 10 минут. Это условная единица привычки, а не доза никотина.</div>':''}`;
 if(setupStep===3) content=`<p class="eyebrow">В своём темпе</p><h1>Выбери свой путь</h1><p class="muted">Можно отказаться сегодня или сокращать количество к выбранной дате.</p><div class="stack" style="margin-top:24px"><button class="choice ${draft.mode==='reduce'?'selected':''}" data-mode="reduce"><span class="choice-copy"><strong>Сокращать постепенно</strong><p class="small muted">С пределом, который выберешь сам</p></span><span class="check">${draft.mode==='reduce'?icon('check'):''}</span></button><button class="choice ${draft.mode==='quit'?'selected':''}" data-mode="quit"><span class="choice-copy"><strong>Отказаться сегодня</strong><p class="small muted">Начать с нуля уже сейчас</p></span><span class="check">${draft.mode==='quit'?icon('check'):''}</span></button></div>${draft.mode==='reduce'?`<div class="field"><label for="quit-date">Дата полного отказа</label><input id="quit-date" type="date" min="${C.dayKey()}" value="${draft.quitDate}"></div>`:''}<div class="field"><label for="reason">Ради чего ты хочешь бросить? Необязательно</label><input id="reason" maxlength="120" value="${esc(draft.reason)}" placeholder="Например, свободнее дышать"></div><p class="hint">Приложение помогает с привычкой. Темп сокращения выбираешь ты; это не схема лечения.</p>`;
 $('#app').innerHTML=head+content+`<div class="setup-footer"><p class="muted small" style="text-align:center">Без аккаунта. Данные на устройстве.</p><button class="btn green" data-action="setup-next" ${!draft.products.length?'disabled':''}>${setupStep===3?'Начать свой путь':'Продолжить'}${icon('arrow')}</button>${setupStep>1?'<button class="text-btn" style="width:100%" data-action="setup-back">Назад</button>':''}</div>`;
}
function renderToday() {
 const today=C.dayKey(), n=C.count(state,selected,today), lim=C.limit(state,selected), p=C.PRODUCTS[selected], over=n>lim;
 const list=C.eventsFor(state,selected,today).reverse().slice(0,3);
 const ach=C.achievements(state);
 const avg=C.average(state,selected);
 return `<p class="muted small date-label">${formatDate(today,{weekday:'long',day:'numeric',month:'long'})}</p><h1>Сегодня —<br>ещё один шаг.</h1>${chips()}<div class="hero"><div><div class="hero-number"><span class="num ${over?'over':''}">${n}</span><span class="den"> / ${lim}</span></div><p class="muted">${p.unit} сегодня</p></div>${sprout(ach.level)}</div><div class="progress-track" role="progressbar" aria-label="Использовано относительно предела" aria-valuemin="0" aria-valuemax="${Math.max(1,lim,n)}" aria-valuenow="${n}"><div class="progress-fill ${over?'overbar':''}" style="width:${lim?Math.min(100,n/lim*100):n?100:0}%"></div></div><div class="goal-line"><p>${lim===0?'Твоя цель — день без употребления':`Твоя цель — не более <strong>${lim}</strong>`}</p><p class="muted small">${avg.value===null?`Начальный ориентир — ${state.profile.plans[selected].baseline} в день`:`Среднее за ${avg.days.length} записанных дня — ${avg.value.toFixed(1)} в день`}</p></div>${over?'<div class="note neutral">Сегодня получилось больше предела. Записи помогают увидеть причину — продолжай с ближайшего шага.</div>':''}<div class="actions"><button class="btn" data-action="quick-log">${icon('plus')}Отметить ${p.single}</button><button class="btn outline" data-action="craving">Хочу курить</button></div><div class="section-head"><h2>Последние отметки</h2><button class="text-btn" data-action="diary">Все записи</button></div>${list.length?`<ul class="event-list">${list.map(eventRow).join('')}</ul>`:`<p class="empty">Пока нет отметок.<br>Если используешь ${selected==='vape'?'вейп':p.name.toLowerCase()}, запиши эпизод одним нажатием.</p>`}<div class="note row">${sprout(ach.level)}<div><strong>Бросить курить</strong><br><span>${state.profile.reason?esc(state.profile.reason):'Каждая пауза — возможность выбрать иначе.'}</span></div></div><button class="text-btn" data-action="day-review">${C.hasTotal(state,selected,today)?'Изменить итог за сегодня':'Указать итог за сегодня'}</button>${selected==='vape'?'<p class="hint">Отметки с перерывом менее 10 минут объединяются в эпизод. Частота не показывает точную дозу никотина.</p>':''}`;
}
function eventRow(e) {
 return `<li><button class="event" data-edit="${e.id}"><span class="event-time">${timeString(e.at)}</span><span class="event-title">${esc(e.trigger || C.PRODUCTS[e.product].name)}${e.quantity>1?` <span class="muted">× ${e.quantity}</span>`:''}</span>${icon('arrow')}</button></li>`;
}
function renderPlan() {
 const p=C.PRODUCTS[selected], plan=state.profile.plans[selected], lim=C.limit(state,selected), avg=C.average(state,selected);
 return `<p class="eyebrow">Маленькие изменения</p><h1>Твой план</h1><p class="muted">Предел — ориентир сверху. Меньше можно всегда.</p>${chips()}<div class="card"><div class="row between"><span class="small muted">${p.name} · текущий предел</span>${icon('plan')}</div><div class="big-stat">${lim} <span class="small muted" style="letter-spacing:0">${p.unit} в день</span></div><p class="hint">${lim===0?'На первом месте — помощь при тяге.':'Не нужно добирать до этого количества.'}</p><button class="btn light" data-action="edit-limit">Изменить предел</button></div><div class="day-row"><div><span class="muted small">Полный отказ</span><p>${formatDate(state.profile.quitDate,{day:'numeric',month:'long',year:'numeric'})}</p></div><button class="text-btn" data-action="edit-date" style="display:block">Изменить</button></div><h2>Следующий шаг</h2>${avg.value===null?'<p class="muted small">Пока нет записанных прошедших дней. Можно начать с оценки из анкеты — курить ради статистики не нужно.</p>':`<p class="muted small">Среднее за последние ${avg.days.length} записанных дня: <strong>${avg.value.toFixed(1)}</strong>. Дни без итогового числа пропущены. Ориентир из анкеты: ${plan.baseline}.</p>`}<p class="small">${lim>0?'Когда будешь готов, выбери следующий предел. Он не изменится без твоего подтверждения.':'Продолжай без употребления. При трудностях можно обратиться за поддержкой.'}</p>${lim>0?`<button class="btn outline" data-action="next-step">Выбрать следующий шаг</button>`:''}<div class="note">Не сравнивай себя только со вчерашним днём: обстоятельства бывают разными. Один трудный день не повышает твой предел автоматически.</div><h2>Если хочется курить</h2><button class="help-action" data-action="craving">${icon('wind')}Сделать паузу${icon('arrow')}</button><button class="help-action" data-action="help">${icon('info')}Что ещё может помочь${icon('arrow')}</button><p class="legal" style="margin-top:24px">Алгоритм — инструмент самопомощи, его эффективность отдельно не проверена. Сокращение — этап к полному отказу. Темп выбираешь ты.</p>`;
}
function renderProgress() {
 const today=C.dayKey(), ach=C.achievements(state), avg=C.average(state,selected,today,7);
 return `<p class="eyebrow">Видеть свой путь</p><h1>Твой прогресс</h1><div class="row between"><p class="muted">Каждый день —<br>часть твоего пути.</p>${sprout(ach.level)}</div><div class="stat-grid"><div><p class="big-stat">${ach.zeroDays}</p><p class="muted small">дней без употребления</p></div><div><p class="big-stat">${state.pauses.length}</p><p class="muted small">пауз с отметкой «легче»</p></div></div>${chips()}<h2>Календарь</h2><p class="muted small">Нажми на день и укажи, сколько получилось.</p>${renderCalendar()}${avg.value!==null?`<p class="small">Среднее за ${avg.days.length} записанных прошедших дней: <strong>${avg.value.toFixed(1)}</strong></p>`:''}<div class="note">Ноль — не курил. Пустое поле — не помнишь количество. Отдельно подтверждать записи не нужно.</div><p class="hint">Росток развивается за дни без употребления и паузы, которые помогли. Достижения сохраняются после срыва.</p>`;
}
function renderCalendar() {
 const today=C.dayKey(), [year,month]=calendarMonth.split('-').map(Number);
 const first=new Date(year,month-1,1,12), last=new Date(year,month,0,12).getDate(), offset=(first.getDay()+6)%7;
 const cells=Array.from({length:offset},()=>'<span class="calendar-blank" aria-hidden="true"></span>');
 for(let n=1;n<=last;n++) {
  const day=calendarMonth+'-'+String(n).padStart(2,'0'), known=C.hasTotal(state,selected,day), logged=C.eventsFor(state,selected,day).length>0, value=C.count(state,selected,day), future=day>today;
  const status=known?(value===0?'zero':'saved'):logged?'logged':'empty';
  cells.push(`<button class="calendar-day ${status} ${day===today?'is-today':''}" data-calendar-day="${day}" ${future?'disabled':''} aria-label="${esc(formatDate(day))}: ${future?'будущий день':known?value+' '+C.PRODUCTS[selected].unit:logged?'отмечено '+value:'нет записи'}"><span class="calendar-number">${n}</span><strong>${future?'':known||logged?value:'—'}</strong>${!known&&logged?'<span class="calendar-dot" aria-label="отдельные отметки"></span>':''}</button>`);
 }
 return `<section class="calendar" aria-label="Календарь употребления"><div class="row between calendar-header"><button class="icon-button" data-month="-1" aria-label="Предыдущий месяц">${icon('back')}</button><strong class="date-label">${first.toLocaleDateString('ru-RU',{month:'long',year:'numeric'})}</strong><button class="icon-button" data-month="1" aria-label="Следующий месяц" ${calendarMonth>=today.slice(0,7)?'disabled':''}>${icon('arrow')}</button></div><p class="small muted">${C.PRODUCTS[selected].name} · ${C.PRODUCTS[selected].unit} за день</p><div class="calendar-grid">${['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map(x=>'<span class="calendar-weekday">'+x+'</span>').join('')}${cells.join('')}</div><div class="calendar-legend"><span><i class="legend-zero"></i>Не курил</span><span><i class="legend-saved"></i>Есть итог</span><span>— Нет записи</span></div><p class="hint">Число с точкой — отдельные отметки за день. Можно открыть дату и указать общий итог.</p></section>`;
}
function renderCraving() {
 $('#app').innerHTML=`<div class="back-row"><button data-action="back" aria-label="Назад">${icon('back')}</button><span class="muted small">Пауза для себя</span></div><p class="eyebrow">Один момент за раз</p><h1>Давай переждём</h1><p class="muted">Попробуй переключиться на пару минут. Ты можешь повторить паузу.</p><div class="timer-wrap"><svg class="timer-ring" viewBox="0 0 240 240"><circle cx="120" cy="120" r="110" fill="none" stroke="var(--line)" stroke-width="4"/><circle id="timer-arc" cx="120" cy="120" r="110" fill="none" stroke="var(--green)" stroke-width="4" stroke-linecap="round" stroke-dasharray="691.15"/></svg><div class="timer-center"><span class="timer-number" id="timer-number">03:00</span><p id="timer-label">немного пространства для себя</p></div></div><div><button class="help-action" data-tip="water">${icon('water')}Выпить воды${icon('arrow')}</button><button class="help-action" data-tip="walk">${icon('walk')}Немного пройтись${icon('arrow')}</button><button class="help-action" data-tip="wind">${icon('wind')}Спокойно подышать${icon('arrow')}</button></div><div class="actions"><button class="btn green" data-action="timer-start" id="timer-start">Начать паузу</button><button class="text-btn" data-action="felt-better">Уже стало легче</button></div><p class="hint" style="text-align:center">Таймер не измеряет тягу. Если она осталась, попробуй другой способ или попроси поддержки.</p>`;
 updateTimer();
 clearInterval(timerInterval); timerInterval=setInterval(updateTimer,500);
}
function updateTimer() {
 if(!$('#timer-number')) {clearInterval(timerInterval);return;}
 const remaining=state.timer?Math.max(0,Math.ceil((state.timer.end-Date.now())/1000)):180;
 $('#timer-number').textContent=`${String(Math.floor(remaining/60)).padStart(2,'0')}:${String(remaining%60).padStart(2,'0')}`;
 $('#timer-arc').style.strokeDashoffset=String(691.15*(1-remaining/180));
 $('#timer-start').textContent=state.timer?(remaining?'Начать заново':'Повторить паузу'):'Начать паузу';
 $('#timer-label').textContent=remaining?'немного пространства для себя':'пауза завершена';
}
function showModal(content) {
 const d=$('#modal'); d.innerHTML=`<button class="modal-close" data-action="close" aria-label="Закрыть">${icon('close')}</button>${content}`;
 if(!d.open)d.showModal();
}
function closeModal() {$('#modal').close();}
function formError(message) {const el=$('#form-error');if(el)el.textContent=message;else toast(message);}
function eventForm(id=null) {
 const e=state.events.find(x=>x.id===id);
 showModal(`<h2>${e?'Изменить запись':'Добавить запись'}</h2><form id="event-form"><input type="hidden" name="id" value="${esc(e?.id||'')}"><div class="field"><label for="event-product">Продукт</label><select id="event-product" name="product">${state.profile.products.map(p=>`<option value="${p}" ${p===(e?.product||selected)?'selected':''}>${C.PRODUCTS[p].name}</option>`).join('')}</select></div><div class="field"><label for="event-at">Дата и время</label><input id="event-at" name="at" type="datetime-local" required min="${state.profile.started}T00:00" max="${inputTime()}" value="${inputTime(e?.at|| (diaryDate===C.dayKey()?Date.now():new Date(diaryDate+'T12:00:00').getTime()))}"></div><div class="field" id="quantity-field"><label for="event-quantity">Количество · для вейпа всегда одна отметка</label><input id="event-quantity" name="quantity" type="number" min="1" max="200" inputmode="numeric" required value="${e?.quantity||1}"></div><div class="field"><label for="event-trigger">Что стало причиной? Необязательно</label><select id="event-trigger" name="trigger">${['','После кофе','Перерыв','Стресс','После еды','Компания','Скука','Другая причина'].map(v=>`<option ${v===e?.trigger?'selected':''} value="${v}">${v||'Не указывать'}</option>`).join('')}</select></div><p class="inline-error" id="form-error" role="alert"></p><button class="btn green" type="submit">Сохранить запись</button>${e?`<button class="btn danger" type="button" data-delete="${e.id}">Удалить запись</button>`:''}</form>`);
 updateQuantity();
}
function updateQuantity() {if($('#event-product')) {const isVape=$('#event-product').value==='vape';$('#event-quantity').disabled=isVape;if(isVape)$('#event-quantity').value='1';}}
function showDiary() {
 const list=C.eventsFor(state,selected,diaryDate).reverse();
 showModal(`<h2>Дневник</h2><p class="small muted">${C.PRODUCTS[selected].name}</p><div class="date-strip"><input id="diary-date" aria-label="Дата дневника" type="date" min="${state.profile.started}" max="${C.dayKey()}" value="${diaryDate}"><button class="icon-button" data-action="add-event" aria-label="Добавить запись">${icon('plus')}</button></div><p class="small">Итого за день: <strong>${C.count(state,selected,diaryDate)}</strong> · ${C.PRODUCTS[selected].unit}</p>${list.length?`<ul class="event-list">${list.map(eventRow).join('')}</ul>`:'<p class="empty">В этот день нет отдельных отметок. Общее количество можно указать итогом за день.</p>'}<button class="btn light" data-review="${diaryDate}">Указать итог за день</button>`);
}
function reviewDay(day) {
 showModal(`<h2>Сколько за день?</h2><p class="muted">${formatDate(day,{day:'numeric',month:'long',year:'numeric'})}</p><form id="day-total-form" data-day="${day}">${state.profile.products.map(p=>{const has=C.hasTotal(state,p,day)||C.eventsFor(state,p,day).length>0;return `<div class="field"><label for="total-${p}">${C.PRODUCTS[p].name} · ${C.PRODUCTS[p].unit}</label><input id="total-${p}" data-total="${p}" type="number" inputmode="numeric" min="0" max="200" placeholder="Не помню" value="${has?C.count(state,p,day):''}"></div>`;}).join('')}<p class="hint">Укажи общее количество за день, включая отдельные отметки. Ноль — не курил, пустое поле — не помню. Новые отметки после сохранения прибавятся к этому итогу.</p>${state.profile.products.includes('vape')?'<p class="hint">Для вейпа считаем эпизоды использования, а не затяжки.</p>':''}<p class="inline-error" id="form-error" role="alert"></p><button class="btn green" type="submit">Сохранить количество</button><button class="text-btn" type="button" data-add-day="${day}" style="width:100%">Добавить отдельную отметку</button></form>`);
}
function limitForm(next=false) {
 const lim=C.limit(state,selected), value=next?Math.max(0,lim-1):lim;
 showModal(`<h2>${next?'Следующий шаг':'Предел на день'}</h2><p class="muted">${C.PRODUCTS[selected].name}. Это верхний предел, а не обязательное количество.</p><form id="limit-form"><div class="field"><label for="new-limit">Не более · ${C.PRODUCTS[selected].unit} в день</label><input id="new-limit" name="limit" type="number" inputmode="numeric" min="0" max="200" required value="${value}"></div><p class="hint">Действует с сегодняшнего дня до следующего изменения или даты полного отказа. Темп выбираешь ты. ${next?'«Минус один» — пример шага, а не медицинское назначение.':''}</p>${C.dayKey()>=state.profile.quitDate?'<p class="inline-error">Наступила дата полного отказа: предел остаётся нулевым. Чтобы вернуться к сокращению, сначала измени дату в плане.</p>':''}<p class="inline-error" id="form-error" role="alert"></p><button class="btn green" type="submit">Подтвердить предел</button></form>`);
}
function dateForm() {
 showModal(`<h2>Дата полного отказа</h2><form id="date-form"><div class="field"><label for="new-date">Выбери дату</label><input id="new-date" type="date" required min="${C.dayKey()}" value="${state.profile.quitDate}"></div><p class="hint">С этой даты цель для всех выбранных продуктов — ноль. Записи и достижения сохранятся.</p><p class="inline-error" id="form-error" role="alert"></p><button class="btn green">Сохранить дату</button></form>`);
}
function help() {
 showModal(`<h2>Поддержка рядом</h2><p>План помогает работать с привычкой. Если тяга сильная или попытки повторяются, обсуди помощь с врачом.</p><h3>Что может помочь</h3><p class="small">Консультации специалиста и подходящие лекарства повышают шансы отказаться от курения. Никотинзаместительная терапия уменьшает симптомы отмены; варианты и инструкции стоит обсудить с врачом или фармацевтом.</p><h3>После срыва</h3><p class="small">Запиши эпизод, посмотри на его причину и выбери ближайшее действие. Одно событие не стирает сделанные шаги.</p><h3>Если сокращаешь</h3><p class="small">Меньше сигарет не означает пропорционально меньше вреда. Не компенсируй сокращение более глубокими затяжками. Число эпизодов вейпа не показывает точную дозу никотина.</p><p class="legal">При беременности, грудном вскармливании и возрасте до 18 лет нужна отдельная консультация. Приложение не назначает лечение.</p><hr class="divider"><p class="small"><a href="https://gnicpm.ru/articles/zdorovyj-obraz-zhizni/vy-uzhe-zadumyvaetes-brosit-kurit.html" target="_blank" rel="noreferrer">НМИЦ ТПМ Минздрава России: подготовка к отказу</a></p><p class="small"><a href="https://takzdorovo-to.ru/actual/kak-brosit-kurit-za-5-shagov" target="_blank" rel="noreferrer">Центр медпрофилактики Тюменской области: 5 шагов к отказу</a></p><p class="hint">Медицинский контент проверен 1 ноября 2026. Эффективность этого приложения отдельно не исследована.</p>`);
}
function settings() {
 showModal(`<h2>Твоё пространство</h2><div class="reminder-row"><label for="theme-toggle">Тёмная тема<br><span class="small muted">Выбор сохраняется на устройстве</span></label><input id="theme-toggle" class="theme-switch" type="checkbox" role="switch" ${state.theme==='dark'?'checked':''}></div><p class="muted small">Бросить курить · первая версия</p><div class="note">Данные хранятся только на этом устройстве. Нет аккаунта, рекламы, аналитики и передачи записей на сервер.</div>${state.profile?`<div class="field"><label for="settings-reason">Твоя причина бросить</label><input id="settings-reason" maxlength="120" value="${esc(state.profile.reason)}" placeholder="Что для тебя важно"></div><button class="btn light" data-action="save-reason">Сохранить причину</button>${window.Android?'<div class="reminder-row"><label for="reminder">Напоминать записать итог дня<br><span class="small muted">Около 20:30, по времени устройства</span></label><input id="reminder" type="checkbox"></div><p class="hint">Android может задержать уведомление из-за энергосбережения.</p>':'<p class="hint">Вечерние уведомления доступны в Android-приложении. Здесь открыта браузерная версия интерфейса.</p>'}<button class="help-action" data-action="help">${icon('info')}О помощи и лечении${icon('arrow')}</button>`:''}<hr class="divider"><p class="legal">При удалении приложения локальные записи будут потеряны. Экспорт и синхронизация в эту версию не включены.</p><button class="text-btn over" data-action="reset-confirm">Удалить все данные</button><p class="version">0.1.0 · офлайн · для взрослых</p>`);
 refreshReminder();
}
window.refreshReminder=function(){if($('#reminder') && window.Android)$('#reminder').checked=Android.reminderEnabled();};
window.handleBack=function(){if($('#modal').open)closeModal();else if(!state.profile && setupStep>1){setupStep--;render();}else {page='today';render();}};
window.onAppResume=function(){updateTimer();if(state.profile && page!=='craving')render();refreshReminder();};

document.addEventListener('click',e=>{
 const el=e.target.closest('button'); if(!el || el.disabled)return;
 if(el.dataset.page){page=el.dataset.page;render();$('#app').scrollTo(0,0);return;}
 if(el.dataset.product){selected=el.dataset.product;render();return;}
 if(el.dataset.select){const p=el.dataset.select;draft.products=draft.products.includes(p)?draft.products.filter(x=>x!==p):[...draft.products,p];render();return;}
 if(el.dataset.step){readDraft();const[p,delta]=el.dataset.step.split(':');draft.amounts[p]=Math.max(1,Math.min(200,(Number(draft.amounts[p])||1)+Number(delta)));render();return;}
 if(el.dataset.mode){readDraft();draft.mode=el.dataset.mode;render();return;}
 if(el.dataset.edit){eventForm(el.dataset.edit);return;}
 if(el.dataset.delete){const id=el.dataset.delete, old=state.events.find(x=>x.id===id);if(change(()=>C.deleteEvent(state,id))){closeModal();render();toast('Запись удалена',()=>{change(()=>{C.addEvent(state,old);});render();});}return;}
 if(el.dataset.calendarDay){reviewDay(el.dataset.calendarDay);return;}
 if(el.dataset.month){const [y,m]=calendarMonth.split('-').map(Number);calendarMonth=C.dayKey(new Date(y,m-1+Number(el.dataset.month),1,12)).slice(0,7);render();return;}
 if(el.dataset.review){reviewDay(el.dataset.review);return;}
 if(el.dataset.addDay){diaryDate=el.dataset.addDay;eventForm();return;}
 if(el.dataset.tip){const tips={water:['Выпить воды','Сделай несколько глотков в удобном темпе. Это способ переключиться, а не лечение тяги.'],walk:['Сменить обстановку','Если можешь, отойди от привычного места курения и немного пройдись. Выбери безопасный маршрут.'],wind:['Спокойное дыхание','Дыши в комфортном темпе, без усилий и задержки дыхания. Расслабь плечи. Если кружится голова — остановись.']};const [h,p]=tips[el.dataset.tip];showModal(`<h2>${h}</h2><p>${p}</p><button class="btn light" data-action="close">Попробую</button>`);return;}
 switch(el.dataset.action){
 case 'setup-next': readDraft(); if(setupStep<3){if(setupStep===2 && draft.products.some(p=>!Number.isInteger(draft.amounts[p])||draft.amounts[p]<1||draft.amounts[p]>200)){toast('Укажи целое количество от 1 до 200.');break;}setupStep++;render();$('#app').scrollTo(0,0);}else finishSetup();break;
 case 'setup-back':readDraft();setupStep--;render();break;
 case 'quick-log':{const before=C.count(state,selected,C.dayKey());let entry;if(change(()=>{entry=C.addEvent(state,{product:selected,at:Date.now(),quantity:1});})){render();toast(selected==='vape' && C.count(state,selected,C.dayKey())===before?'Отметка добавлена в текущий эпизод':'Запись сохранена',()=>{change(()=>C.deleteEvent(state,entry.id));render();});}break;}
 case 'undo':if(undoAction){const undo=undoAction;undoAction=null;undo();$('#toast').classList.remove('show');}break;
 case 'craving':page='craving';render();$('#app').scrollTo(0,0);break;
 case 'back':page='today';render();break;
 case 'close':closeModal();break;
 case 'diary':diaryDate=C.dayKey();showDiary();break;
 case 'add-event':eventForm();break;
 case 'day-review':reviewDay(C.dayKey());break;
 case 'edit-limit':limitForm();break;
 case 'next-step':limitForm(true);break;
 case 'edit-date':dateForm();break;
 case 'timer-start':if(!state.timer || state.timer.end<=Date.now()){if(change(()=>{state.timer={id:String(Date.now()),end:Date.now()+180000};}))updateTimer();}else showModal('<h2>Начать паузу заново?</h2><p class="muted">Таймер снова начнёт отсчёт с трёх минут.</p><button class="btn green" data-action="timer-restart">Начать заново</button><button class="text-btn" data-action="close">Продолжить текущую паузу</button>');break;
 case 'timer-restart':if(change(()=>{state.timer={id:String(Date.now()),end:Date.now()+180000};})){closeModal();updateTimer();}break;
 case 'felt-better':if(change(()=>{state.pauses.push(Date.now());state.timer=null;})){page='today';render();toast('Здорово, что удалось переключиться');}break;
 case 'settings':settings();break;
 case 'save-reason':if(change(()=>{state.profile.reason=$('#settings-reason').value.trim().slice(0,120);})){closeModal();render();toast('Причина сохранена');}break;
 case 'help':help();break;
 case 'reset-confirm':showModal('<h2>Удалить весь дневник?</h2><p>Профиль, записи и достижения будут удалены с этого устройства. Восстановить их не получится.</p><button class="btn danger" data-action="reset">Удалить все данные</button><button class="btn light" data-action="close">Оставить дневник</button>');break;
 case 'reset':{const old=state;state=C.initial();storageError='';try{save();if(window.Android)Android.setReminder(false);setupStep=1;closeModal();render();toast('Данные удалены');}catch(err){state=old;toast(err.message);}break;}
 }
});
function readDraft(){document.querySelectorAll('[data-amount]').forEach(i=>{draft.amounts[i.dataset.amount]=Number(i.value);});if($('#quit-date'))draft.quitDate=$('#quit-date').value;if($('#reason'))draft.reason=$('#reason').value;}
function finishSetup(){
 readDraft();const today=C.dayKey(),date=draft.mode==='quit'?today:draft.quitDate;
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||date<today){toast('Выбери сегодняшнюю или будущую дату.');return;}
 if(change(()=>{state.profile={products:[...draft.products],started:today,quitDate:date,reason:draft.reason.trim().slice(0,120),plans:Object.fromEntries(draft.products.map(p=>[p,{baseline:draft.amounts[p],steps:[{from:today,limit:draft.mode==='quit'?0:draft.amounts[p]}]}]))};})){
 selected=draft.products[0];page='today';render();$('#app').scrollTo(0,0);
 if(draft.mode==='reduce')toast('Выбери первый шаг сокращения в разделе «План»');
 }
}
document.addEventListener('change',e=>{
 if(e.target.getAttribute('id')==='theme-toggle'){
  if(change(()=>{state.theme=e.target.checked?'dark':'light';}))applyTheme();
  else e.target.checked=state.theme==='dark';
 }
 if(e.target.getAttribute('id')==='event-product')updateQuantity();
 if(e.target.getAttribute('id')==='diary-date'){diaryDate=e.target.value;if(diaryDate>=state.profile.started && diaryDate<=C.dayKey())showDiary();}
 if(e.target.getAttribute('id')==='reminder' && window.Android)Android.setReminder(e.target.checked);
});
document.addEventListener('submit',e=>{
 e.preventDefault();
 try{
 if(e.target.getAttribute('id')==='day-total-form'){
 const values={};document.querySelectorAll('[data-total]').forEach(input=>{values[input.dataset.total]=input.value;});
 if(change(()=>C.setDayTotals(state,e.target.dataset.day,values))){closeModal();render();toast('Количество за день сохранено');}
 }else if(e.target.getAttribute('id')==='event-form'){
 const f=e.target;const at=new Date(f.elements.at.value).getTime();
 const data={id:f.elements.namedItem('id').value,at,product:f.elements.product.value,quantity:f.elements.product.value==='vape'?1:Number(f.elements.quantity.value),trigger:f.elements.trigger.value};
 if(change(()=>C.addEvent(state,data))){closeModal();render();toast('Запись сохранена');}
 }else if(e.target.getAttribute('id')==='limit-form'){
 const value=Number($('#new-limit').value);
 if(C.dayKey()>=state.profile.quitDate && value!==0){formError('Сначала измени дату полного отказа в плане.');return;}
 if(value>C.limit(state,selected) && !e.target.dataset.confirmed){e.target.dataset.confirmed='yes';formError('Новый предел выше текущего. Если это осознанное изменение, нажми «Подтвердить предел» ещё раз.');return;}
 if(change(()=>C.setLimit(state,selected,value))){closeModal();render();toast('Предел сохранён');}
 }else if(e.target.getAttribute('id')==='date-form'){
 const date=$('#new-date').value;if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||date<C.dayKey()){formError('Выбери сегодняшнюю или будущую дату.');return;}
 if(change(()=>{state.profile.quitDate=date;})){closeModal();render();toast('Дата сохранена');}
 }
 }catch(err){formError(err.message);}
});
$('#modal').addEventListener('click',e=>{if(e.target===$('#modal')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeModal();}});
document.addEventListener('visibilitychange',()=>{if(!document.hidden){updateTimer();if(state.profile && page!=='craving')render();}});
setInterval(()=>{if(state.profile && page==='today' && !$('#modal').open)render();},60000);
render();
})();



