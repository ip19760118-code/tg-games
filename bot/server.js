/* 🎮 Игровой Центр — сервер бота Telegram. Node 18+, без обязательных зависимостей.
   Запуск:  node server.js
   Настройки: config.json {"token":"...","support":"@...","proxy":"http://host:port"(не обяз.)}
              ИЛИ token.txt, ИЛИ переменная TG_BOT_TOKEN. */
const fs=require('fs'),path=require('path');
const CFG=Object.assign({
  token:'',
  support:'@trend_catch_support',
  base:'https://ip19760118-code.github.io/tg-games/',
  fb:'https://tg-games-69c06-default-rtdb.firebaseio.com',
  proxy:''
},(()=>{try{return JSON.parse(fs.readFileSync(path.join(__dirname,'config.json'),'utf8'));}catch(e){return{};}})());
if(!CFG.token){try{CFG.token=fs.readFileSync(path.join(__dirname,'token.txt'),'utf8').trim();}catch(e){}}
if(!CFG.token)CFG.token=process.env.TG_BOT_TOKEN||'';
if(!CFG.token){console.error('❌ Нет токена. Создай bot/config.json: {"token":"123456:ABC..."} (BotFather → /token)');process.exit(1);}
/* прокси, если указан (нужен npm i undici) */
if(CFG.proxy){try{const {ProxyAgent,setGlobalDispatcher}=require('undici');setGlobalDispatcher(new ProxyAgent(CFG.proxy));console.log('🌐 Используется прокси:',CFG.proxy);}catch(e){console.error('❌ Для прокси нужна библиотека undici: выполни в папке bot:  npm init -y && npm i undici');process.exit(1);}}
const API='https://api.telegram.org/bot'+CFG.token+'/';
const DBF=path.join(__dirname,'db.json'),OFFF=path.join(__dirname,'.offset');
let db={users:{}};try{db=JSON.parse(fs.readFileSync(DBF,'utf8'))||db;}catch(e){}
const save=()=>{try{fs.writeFileSync(DBF,JSON.stringify(db));}catch(e){}};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function api(method,params){return fetch(API+method,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(params||{})}).then(r=>r.json()).then(j=>{if(!j.ok)console.warn('TG error:',method,j.description);return j;}).catch(e=>{console.warn('net error:',method,e.cause&&e.cause.code||e.message);return{ok:false};});}
const esc=s=>String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
function send(chat,text,kb){return api('sendMessage',{chat_id:chat,text:text,parse_mode:'HTML',disable_web_page_preview:true,reply_markup:kb||undefined});}
const GAMES=[['🧺','Trend Catch','trend-catch/'],['💡','Выключи Свет','lights-out/'],['🧱','Arkanoid 3D','arkanoid/'],['🧩','Домино','domino/'],['🔫','3D Shooter','shooter/'],['🍉','Фруктовый самурай','fruit-samurai/'],['♟️','Шахматы','chess/'],['🃏','Дурак','durak/'],['🎲','Нарды','nardy/'],['🟤','Шашки','shashki/']];
function gamesKB(){const rows=[];for(let i=0;i<GAMES.length;i+=2){const row=[];row.push({text:GAMES[i][0]+' '+GAMES[i][1],url:CFG.base+GAMES[i][2]});if(GAMES[i+1])row.push({text:GAMES[i+1][0]+' '+GAMES[i+1][1],url:CFG.base+GAMES[i+1][2]});rows.push(row);}rows.push([{text:'📊 Моя статистика',callback_data:'stats'},{text:'📤 Пригласить друга',callback_data:'invite'}]);return{inline_keyboard:rows};}
const menuText='🎮 Игровой Центр — коллекция мини-игр в Telegram!\nИграй один или создавай комнаты и зови друзей онлайн.\n\nВыбирай игру 👇';
function touch(uid,name){const u=db.users[uid]||(db.users[uid]={firstSeen:Date.now(),starts:0,invites:0,refs:0});u.name=name||u.name;u.lastSeen=Date.now();return u;}
function recordRef(uid,refId){const u=touch(uid);if(u.refBy)return;u.refBy=refId;const r=touch(refId);r.refs=(r.refs||0)+1;save();send(refId,'🎉 По твоей ссылке пришёл новый игрок! Всего приглашено: '+r.refs);}
function inviteReply(chat,uid){const u=touch(uid);u.invites=(u.invites||0)+1;save();const link='https://t.me/trend_catch_game_bot?start=ref_'+uid;send(chat,'📤 Отправь эту ссылку другу — он попадёт прямо в бота, а ты получишь +1 в счётчик приглашений:\n'+link+'\n\n👥 Для партии онлайн зайди в любую игру с пометкой ONLINE, создай комнату и нажми «📤 Пригласить» — там своя ссылка на конкретный стол.');}
function helpReply(chat){send(chat,'❓ <b>Как играть</b>\n1. Нажми «Выбери игру» или /play и открой игру кнопкой — она запустится прямо в Telegram.\n2. Внутри игры: «Против компьютера» или «Создать комнату» / «Зайти по коду» для игры с друзьями.\n3. /invite — ссылка для приглашения друзей в бота.\n4. /stats — твоя статистика побед и серий.\n\nКоманды: /start /play /invite /stats /help\nЕсли что-то не работает — пиши: '+CFG.support);}
function statsReply(chat,uid){
 fetch(CFG.fb+'/userstats/'+uid+'.json').then(r=>r.json()).then(fs2=>{
  let w=0,l=0,st=0,best=0,g=0;
  if(fs2&&typeof fs2==='object'){for(const k in fs2){const s=fs2[k]||{};w+=s.w||0;l+=s.l||0;st=Math.max(st,s.st||0);best=Math.max(best,s.best||0);g+=s.g||0;}}
  const u=db.users[uid]||{};
  let t='📊 <b>Твоя статистика:</b>\n🏆 Побед: '+w+'\n❌ Поражений: '+l+'\n🔥 Серия побед: '+st+'\n⭐ Рекордная серия: '+best+'\n🎮 Всего партий: '+g+'\n\n🤖 В боте: запусков — '+(u.starts||0)+', приглашений — '+(u.invites||0)+(u.refBy?', пришёл по приглашению игрока '+u.refBy:'');
  if(g===0)t+='\n\n💡 Победы считаются в играх: Дурак, Шахматы, Шашки, Нарды, Домино. Сыграй партию — и цифры появятся здесь!';
  send(chat,t);
 }).catch(()=>send(chat,'⚠️ Не удалось прочитать статистику, попробуй позже.'));
}
function onMessage(m){
 if(!m||!m.from||m.chat.type!=='private')return;
 const uid=m.from.id,chat=m.chat.id,t=(m.text||'').trim(),name=m.from.first_name||'';
 touch(uid,name);
 if(t==='/start'||t.indexOf('/start ')===0){
  const u=db.users[uid];u.starts=(u.starts||0)+1;save();
  const payload=t.split(' ')[1]||'';
  if(payload.indexOf('ref_')===0){const ref=parseInt(payload.slice(4),10);if(ref&&ref!==uid)recordRef(uid,ref);}
  send(chat,'👋 Привет, '+esc(name)+'! Добро пожаловать в Игровой Центр.\nВыбирай игру и играй один или с друзьями! 🚀',gamesKB());
  return;
 }
 if(t==='/play'){send(chat,'🎮 Во что сыграем сегодня?',gamesKB());return;}
 if(t==='/invite'){inviteReply(chat,uid);return;}
 if(t==='/stats'){statsReply(chat,uid);return;}
 if(t==='/help'){helpReply(chat);return;}
 if(t.indexOf('/')===0){send(chat,'Не знаю такую команду 🤖 Список команд — /help');return;}
 send(chat,menuText,gamesKB());
}
function onCallback(c){
 try{
  const uid=c.from.id,chat=c.message&&c.message.chat.id;
  touch(uid,c.from.first_name||'');
  if(c.data==='stats')statsReply(chat,uid);
  else if(c.data==='invite')inviteReply(chat,uid);
  api('answerCallbackQuery',{callback_query_id:c.id});
 }catch(e){}
}
function handle(u){if(u.message)onMessage(u.message);else if(u.callback_query)onCallback(u.callback_query);}
(async function main(){
 console.log('🤖 Бот стартует...');
 /* самопроверка: сеть + токен */
 let me=null;
 try{me=await fetch(API+'getMe').then(r=>r.json());}catch(e){me={ok:false,description:'network: '+(e.cause&&e.cause.code||e.message)};}
 if(!me.ok){
  console.error('❌ НЕ УДАЛОСЬ связаться с api.telegram.org или токен неверен.');
  console.error('   Detail:',me.description);
  console.error('   Если это сеть (ENOTFOUND/ECONNREFUSED/UND_ERR): включи системный VPN на ПК');
  console.error('   или пропиши "proxy":"http://host:port" в config.json (после npm i undici),');
  console.error('   или запусти бота на хостинге вне блокировок (Render/VPS).');
  process.exit(1);
 }
 console.log('✅ Токен в порядке, бот:',me.result.username);
 await api('deleteWebhook',{});
 let offset=0;try{offset=parseInt(fs.readFileSync(OFFF,'utf8'),10)||0;}catch(e){}
 console.log('✅ Опрос запущен. Команды: /start /play /invite /stats /help');
 let fails=0;
 for(;;){
  try{
   const r=await fetch(API+'getUpdates?timeout=50&allowed_updates='+encodeURIComponent('["message","callback_query"]')+'&offset='+offset);
   const j=await r.json();
   fails=0;
   if(j.ok&&Array.isArray(j.result)){
    for(const u of j.result){offset=u.update_id+1;try{handle(u);}catch(e){console.warn('handler error:',e.message);}}
    try{fs.writeFileSync(OFFF,String(offset));}catch(e){}
   }else if(j&&j.parameters&&j.parameters.retry_after){console.warn('flood, ждём',j.parameters.retry_after);await sleep(j.parameters.retry_after*1000);}
   else{console.warn('getUpdates:',j&&j.description);await sleep(3000);}
  }catch(e){
   fails++;
   if(fails%10===1)console.warn('⚠️ Нет связи с api.telegram.org ('+(e.cause&&e.cause.code||e.message)+'), попытка '+fails+'... Проверь VPN/прокси.');
   await sleep(2000);
  }
 }
})();