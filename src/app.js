
/* ================= site shell: sign-in, account gate, data loading, export, admin ================= */
var SB_URL="https://thxqncpkkzmpktwuvzvz.supabase.co",SB_KEY="sb_publishable_gn13sLmGJzsrv-V9Rmfuxw_OLp6jP4l";
var WHO="品牌加辣餐飲顧問工作室";
var sb=null,USER=null,ME=null,CUR=null,RECOVER=false,PG="home";
var ACC=[],PROFS=[],MAIL=[],SKIPPED=0,LOADED_AT="",UPL=[],AMAP=[],FEAT_UP=true;
var STN={pending:"待開通",active:"使用中",suspended:"停權",rejected:"不開通"},STC={pending:"y",active:"g",suspended:"r",rejected:"r"};
var SECS=["營業收入","營業成本","營業費用"];
function REDIR(){return location.origin+location.pathname}
function show(id){["scrLoad","scrAuth","scrReset","scrGate","app"].forEach(function(x){$(x).hidden=x!==id})}
function today(){try{return new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Taipei",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date())}catch(e){return new Date().toISOString().slice(0,10)}}
function dfmt(iso){var d=new Date(iso);if(isNaN(d))return "";var p=function(n){return String(n).padStart(2,"0")};return d.getFullYear()+"-"+p(d.getMonth()+1)+"-"+p(d.getDate())}
function tfmt(iso){var d=new Date(iso);if(isNaN(d))return "";var p=function(n){return String(n).padStart(2,"0")};return dfmt(iso)+" "+p(d.getHours())+":"+p(d.getMinutes())}
function isAdmin(){return !!ME&&ME.role==="admin"&&ME.status==="active"}
function lsGet(k){try{return localStorage.getItem(k)}catch(e){return null}}
function lsSet(k,v){try{localStorage.setItem(k,v)}catch(e){}}
function loading(t,fail){$("loadMsg").textContent=t;$("loadActs").hidden=!fail;show("scrLoad")}
function errText(e){
  var raw=String((e&&e.message)||e||""),m=raw.toLowerCase();
  if(m.indexOf("failed to fetch")>=0||m.indexOf("network")>=0||m.indexOf("load failed")>=0)return "連不上伺服器。請確認網路正常後再試一次；如果用的是公司網路，可以改用手機網路試試。";
  if(m.indexOf("invalid login")>=0)return "Email 或密碼不正確。請檢查大小寫和有沒有多打空白（可勾「顯示密碼」）。忘記密碼請按上面的「忘記密碼」；還沒註冊請按「註冊」。";
  if(m.indexOf("not confirmed")>=0){$("auResend").hidden=false;return "這個 Email 還沒完成驗證。請到信箱點確認信裡的連結；找不到信的話，按下面的「重寄驗證信」。"}
  if(m.indexOf("already registered")>=0||m.indexOf("already been registered")>=0)return "這個 Email 已經註冊過，請直接登入。忘記密碼可按「忘記密碼」。";
  if(m.indexOf("email rate limit")>=0)return "短時間內寄信次數太多。請等一小時後再試，或聯絡"+WHO+"協助。";
  if(m.indexOf("rate limit")>=0||m.indexOf("security purposes")>=0)return "操作太頻繁，請等一分鐘再試。";
  if(m.indexOf("different from the old")>=0)return "新密碼不能和原本的密碼一樣，請換一組。";
  if(m.indexOf("session missing")>=0||m.indexOf("expired")>=0)return "這個連結已經失效，或登入已過期。請回登入頁重新操作。";
  if(m.indexOf("invalid")>=0&&m.indexOf("email")>=0)return "Email 格式不正確，請檢查有沒有打錯。";
  if(m.indexOf("pl_admin_locked")>=0)return "管理員帳號不能被停用。";
  if(m.indexOf("pl_role_locked")>=0)return "帳號的身分不能在這裡更改。";
  if(m.indexOf("password")>=0)return "密碼不符合規定，請至少輸入 8 個字。";
  return "沒有完成（"+raw.slice(0,80)+"）。請稍後再試一次；還是不行的話，把這段訊息告訴"+WHO+"。";
}

/* ---------- sign in / register / forgot ---------- */
var MODE="in";
function setMode(m){
  MODE=m;[["in","tabIn"],["up","tabUp"],["fg","tabFg"]].forEach(function(x){$(x[1]).setAttribute("aria-pressed",String(x[0]===m))});
  $("auNameL").hidden=m!=="up";$("auName").required=m==="up";
  $("auPassL").hidden=$("auShowL").hidden=m==="fg";$("auPass").required=m!=="fg";
  $("auPass").setAttribute("autocomplete",m==="up"?"new-password":"current-password");
  $("auBtn").textContent=m==="in"?"登入":m==="up"?"註冊":"寄出重設密碼信";
  $("auHint").textContent=m==="in"?"請輸入註冊時的 Email 和密碼。":m==="up"?"填好後送出，我們會寄一封確認信給你；點信裡的連結完成驗證後，等顧問開通就能使用。密碼至少 8 個字。":"輸入註冊時的 Email，我們會寄一封重設密碼的信給你。";
}
function auMsg(t){$("auMsg").textContent=t}
async function authSubmit(ev){
  ev.preventDefault();var email=$("auEmail").value.trim(),pass=$("auPass").value,name=$("auName").value.trim();
  auMsg("處理中…");$("auBtn").disabled=true;
  try{
    if(MODE==="fg"){var f=await sb.auth.resetPasswordForEmail(email,{redirectTo:REDIR()});if(f.error)throw f.error;auMsg("如果這個 Email 有註冊過，重設密碼的信已經寄出。請在一小時內點信裡的連結；沒收到請看垃圾信匣。");return}
    if(MODE==="up"){
      var u=await sb.auth.signUp({email:email,password:pass,options:{data:{app:"pl",display_name:name},emailRedirectTo:REDIR()}});if(u.error)throw u.error;
      if(u.data.user&&u.data.user.identities&&!u.data.user.identities.length){setMode("in");auMsg("這個 Email 已經註冊過（如果你用過 BOM 運算中心，兩邊是同一組帳號密碼），請直接登入。忘記密碼可按「忘記密碼」。");return}
      if(!u.data.session){setMode("in");$("auResend").hidden=false;$("auPass").value="";auMsg("註冊成功。確認信已寄到 "+email+"，請點信裡的連結完成驗證，再回來登入。沒收到請看垃圾信匣，或按「重寄驗證信」。");return}
      auMsg("");return;
    }
    var r=await sb.auth.signInWithPassword({email:email,password:pass});if(r.error)throw r.error;auMsg("");$("auPass").value="";
  }catch(e){auMsg(errText(e))}finally{$("auBtn").disabled=false}
}
async function resend(){
  var email=$("auEmail").value.trim();if(!email){auMsg("請先在上面填入註冊用的 Email，再按「重寄驗證信」。");return}
  auMsg("處理中…");
  try{var r=await sb.auth.resend({type:"signup",email:email,options:{emailRedirectTo:REDIR()}});if(r.error)throw r.error;auMsg("如果 "+email+" 是尚未驗證的帳號，驗證信已重新寄出。請到信箱點最新那封信的連結，也看一下垃圾信匣。")}catch(e){auMsg(errText(e))}
}
async function resetSubmit(ev){
  ev.preventDefault();$("rsMsg").textContent="處理中…";$("rsBtn").disabled=true;
  try{var r=await sb.auth.updateUser({password:$("rsPass").value});if(r.error)throw r.error;$("rsPass").value="";$("rsMsg").textContent="";RECOVER=false;route(true)}
  catch(e){$("rsMsg").textContent=errText(e)}finally{$("rsBtn").disabled=false}
}
async function signOut(){try{await sb.auth.signOut()}catch(e){}try{history.replaceState(null,"",location.pathname+location.search)}catch(e){}USER=null;ME=null;CUR=null;S.rows=[];ACC=[];PROFS=[];MAIL=[];BR={};show("scrAuth")}

/* ---------- routing: who is this, and may they come in ---------- */
var routing=false,again=false;
async function route(force){
  if(RECOVER)return;if(routing){again=again||!!force;return}routing=true;
  try{
    var g=await sb.auth.getSession();if(g.error)throw g.error;var s=g.data.session;
    if(!s){USER=null;ME=null;CUR=null;S.rows=[];show("scrAuth");return}
    if(!force&&CUR===s.user.id&&(!$("app").hidden||!$("scrGate").hidden))return;
    USER=s.user;loading("讀取帳號中…");
    var r=await sb.from("pl_profiles").select("*").eq("user_id",USER.id).maybeSingle();if(r.error)throw r.error;
    var p=r.data;
    if(!p){
      /* an account that signed up elsewhere (e.g. the BOM site) asks for access here: it starts as a pending owner */
      var nm=String((USER.user_metadata&&USER.user_metadata.display_name)||"").slice(0,60);
      var i=await sb.from("pl_profiles").insert({user_id:USER.id,display_name:nm}).select().maybeSingle();
      if(i.error||!i.data){var r2=await sb.from("pl_profiles").select("*").eq("user_id",USER.id).maybeSingle();if(r2.error||!r2.data)throw (i.error||r2.error||new Error("profile missing"));p=r2.data}else p=i.data;
    }
    ME=p;CUR=USER.id;
    if(gate())return;
    loading("讀取損益資料中…");
    await loadData();
    if(!isAdmin()&&!S.rows.length){gate("noaccess");return}
    enterApp();
  }catch(e){loading(errText(e),true)}
  finally{routing=false;if(again){again=false;route(true)}}
}
function gate(kind){
  var st=ME.status,exp=!!ME.expires_on&&ME.expires_on<today()&&ME.role!=="admin";
  var k=kind||(st==="pending"?"pending":st==="rejected"?"rejected":st==="suspended"?"suspended":exp?"expired":null);
  if(!k)return false;
  var T={
    pending:["帳號等待開通","你的帳號已經建立，目前在等顧問確認。",["註冊完成 ✓","Email 驗證完成 ✓","等待"+WHO+"開通（目前在這一步）","收到開通通知信後，回到這裡按「重新檢查」或重新登入"]],
    rejected:["帳號尚未開通","這個帳號目前沒有開通使用。如果認為這是誤會，歡迎和"+WHO+"聯絡。",[]],
    suspended:["使用授權已停用","這個帳號目前暫時無法查看損益資料。",["你的資料都完整保存著，沒有被刪除","聯絡"+WHO+"辦理恢復","處理完成後回到這裡按「重新檢查」"]],
    expired:["使用期限已到","這個帳號的使用期限到 "+(ME.expires_on||"")+" 為止，目前暫時無法查看。",["你的資料都完整保存著，沒有被刪除","聯絡"+WHO+"辦理續用","處理完成後回到這裡按「重新檢查」"]],
    noaccess:["帳號已開通，資料準備中","帳號可以使用了，但顧問還沒有把你的品牌損益資料掛上來。",["請稍後按「重新檢查」","等了一陣子還是這個畫面，請和"+WHO+"聯絡"]]
  }[k];
  $("gTitle").textContent=T[0];$("gText").textContent=T[1];
  var ol=$("gSteps");ol.textContent="";ol.hidden=!T[2].length;T[2].forEach(function(x){ol.appendChild(h("li",null,x))});
  $("gWho").textContent="目前登入的帳號："+(ME.email||"");
  show("scrGate");return true;
}

/* ---------- data ---------- */
async function fetchStatements(){
  var out=[],from=0,step=200;
  for(;;){
    var r=await sb.from("pl_statements").select("client_name,brand_name,store_name,unit_type,period_month,pl_line_items(section,category,account_name,amount)").order("period_month").order("id").range(from,from+step-1);
    if(r.error)throw r.error;out=out.concat(r.data||[]);if(!r.data||r.data.length<step||from>20000)break;from+=step;
  }
  return out;
}
async function loadData(){
  var jobs=[fetchStatements(),sb.from("pl_brand_settings").select("*"),sb.from("pl_access").select("*")];
  if(isAdmin()){jobs.push(sb.from("pl_profiles").select("*").order("created_at",{ascending:false}));jobs.push(sb.from("pl_mail_log").select("*").order("created_at",{ascending:false}).limit(10))}
  var R=await Promise.all(jobs);
  for(var i=1;i<R.length;i++)if(R[i].error)throw R[i].error;
  var br={};(R[1].data||[]).forEach(function(d){
    if(typeof d.client_name!=="string"||typeof d.brand_name!=="string")return;
    br[bidOf(d.client_name,d.brand_name)]={cl:d.client_name,br:d.brand_name,hq:!!d.is_hq,type:d.biz_type,bm:d.thresholds||null,vu:d.util_variable_pct,label:d.label||"",unset:!d.label,annual:Array.isArray(d.annual_accounts)?d.annual_accounts:[]};
  });
  BR=br;ACC=R[2].data||[];PROFS=isAdmin()?(R[3].data||[]):[];MAIL=isAdmin()?(R[4].data||[]):[];
  /* upload records and learned account categories; missing until the upload tables exist, and the rest of the site keeps working without them */
  UPL=[];AMAP=[];
  if(canUpload()){
    var U=await Promise.all([sb.from("pl_uploads").select("*").order("created_at",{ascending:false}).limit(80),sb.from("pl_account_map").select("client_name,account_name,section,category")]);
    FEAT_UP=!U[0].error&&!U[1].error;if(FEAT_UP){UPL=U[0].data||[];AMAP=U[1].data||[]}
  }
  var rows=[];SKIPPED=0;
  R[0].forEach(function(s){
    var m=String(s.period_month||"").slice(0,7),cl=s.client_name,brn=s.brand_name,st=s.store_name||"本店",ut=s.unit_type==="總部"?"總部":"門市";
    if(!/^\d{4}-\d{2}$/.test(m)||typeof cl!=="string"||typeof brn!=="string"){SKIPPED++;return}
    var ann=(br[bidOf(cl,brn)]||{}).annual||[];
    (s.pl_line_items||[]).forEach(function(li){
      var a=Number(li.amount);if(SECS.indexOf(li.section)<0||!isFinite(a)){SKIPPED++;return}
      var n=String(li.account_name||"");
      rows.push({m:m,cl:cl,br:brn,st:st,ut:ut,s:li.section,c:String(li.category||"一般營運費用"),n:n,a:a,y:ann.indexOf(n)>=0});
    });
  });
  S.rows=rows;LOADED_AT=tfmt(new Date().toISOString());
}

/* ---------- shell ---------- */
function scopeOpts(){
  var out=[];ents().filter(function(e){return e.data}).forEach(function(e){
    out.push({v:"b:"+e.id,t:e.br+(e.hq?"（總部）":""),cl:e.cl});
    if(e.stores.length>1)e.stores.forEach(function(st){out.push({v:"s:"+e.id+"|"+st,t:"　└ "+st,cl:e.cl})});
  });return out;
}
function titleOf(p){var e=entOf(p.bid);if(!e)return "";if(p.t==="store")return e.br+"・"+p.st;return e.br+(e.stores.length===1&&e.stores[0]!=="本店"?"・"+e.stores[0]:"")}
function renderShell(){
  var sel=$("scSel"),O=scopeOpts();sel.textContent="";
  var cls=[];O.forEach(function(o){if(cls.indexOf(o.cl)<0)cls.push(o.cl)});
  cls.forEach(function(cl){var par=sel;if(cls.length>1){par=document.createElement("optgroup");par.label=cl;sel.appendChild(par)}
    O.filter(function(o){return o.cl===cl}).forEach(function(o){var x=document.createElement("option");x.value=o.v;x.textContent=o.t;par.appendChild(x)})});
  if(!O.some(function(o){return o.v===S.sc}))S.sc=O.length?O[0].v:"";
  sel.value=S.sc;sel.hidden=O.length<2;
  $("navScope").textContent=O.length?titleOf(curP()):"尚無資料";
  $("navAdmin").hidden=$("navAdminH").hidden=$("navReview").hidden=$("navProj").hidden=!isAdmin();$("navUpload").hidden=!canUpload();
  var nrev=UPL.filter(function(x){return x.status==="review"}).length,nunset=isAdmin()?projList().filter(function(p){return p.unset}).length:0;
  $("nRev").textContent=isAdmin()&&nrev?String(nrev):"";$("nProj").textContent=nunset?String(nunset):"";
  var pend=PROFS.filter(function(p){return p.status==="pending"}).length;$("nPend").textContent=pend?String(pend):"";
  $("sideWho").textContent=ME?(ME.display_name||ME.email):"";
  var box=$("alerts"),A=[];
  if(isAdmin()&&pend)A.push({lv:"y",x:"有 "+pend+" 個帳號等待開通",go:"admin"});
  if(isAdmin()&&nrev)A.push({lv:"y",x:"有 "+nrev+" 份上傳的損益表等你確認",go:"review"});
  if(isAdmin()&&nunset)A.push({lv:"y",x:"有 "+nunset+" 個專案還沒設定業態，燈號暫用預估值",go:"proj"});
  if(ME&&ME.role!=="admin"&&ME.expires_on){var days=Math.round((new Date(ME.expires_on+"T00:00:00")-new Date(today()+"T00:00:00"))/864e5);if(days<=30)A.push({lv:"y",x:"使用期限到 "+ME.expires_on+"，還有 "+days+" 天。需要續用請與顧問聯絡。",go:"account"})}
  box.textContent="";box.hidden=!A.length;
  A.forEach(function(a){var b=h("button","alert "+a.lv);b.type="button";b.innerHTML=ICON[a.lv];b.appendChild(h("span",null,a.x));b.appendChild(h("em",null,"前往 ›"));b.addEventListener("click",function(){go(a.go)});box.appendChild(b)});
}
/* every page or month change gets its own browser-history entry, so the phone's or browser's back button steps back inside the site */
var HDEPTH=0;
function hashOf(){return "#"+PG+(PG==="home"&&S.month!=="ALL"?"/"+S.month:"")}
function remember(how){
  var url=location.pathname+location.search+hashOf();
  if(how==="push"){if(location.hash===hashOf())return;HDEPTH++;history.pushState({plc:1,d:HDEPTH},"",url)}
  else history.replaceState({plc:1,d:HDEPTH},"",url);
}
function readHash(){
  var m=/^#(home|upload|account|admin|review|proj)(?:\/(\d{4}-\d{2}))?$/.exec(location.hash||"");
  return m?{pg:m[1],month:m[2]||"ALL"}:null;
}
function goBack(){if(history.state&&history.state.plc&&history.state.d>0)history.back();else go("home")}
function go(pg,fromHist){
  if((pg==="admin"||pg==="review"||pg==="proj")&&!isAdmin())pg="home";if(pg==="upload"&&!canUpload())pg="home";if(!$("pg-"+pg))pg="home";
  var changed=pg!==PG;PG=pg;
  Array.prototype.forEach.call(document.querySelectorAll(".page"),function(p){p.hidden=p.id!=="pg-"+pg});
  Array.prototype.forEach.call(document.querySelectorAll("button.nav"),function(b){if(b.dataset.pg===pg)b.setAttribute("aria-current","page");else b.removeAttribute("aria-current")});
  lsSet("plc_pg",pg);renderAll();if(!fromHist)remember(changed?"push":"replace");window.scrollTo(0,0);
}
function renderAll(){renderShell();if(PG==="home")renderHome();else if(PG==="account")renderAccount();else if(PG==="admin")renderAdmin();else if(PG==="upload")renderUpload();else if(PG==="review")renderReview();else if(PG==="proj")renderProj()}
function setMonth(m){S.month=S.month===m&&m!=="ALL"?"ALL":m;lsSet("plc_month",S.month);renderAll();remember("push")}
var MONTHS=[];
function stepMonth(k){
  if(!MONTHS.length)return;var i=S.month==="ALL"?(k<0?MONTHS.length:-1):MONTHS.indexOf(S.month),j=i+k;
  if(j<0||j>=MONTHS.length)return;setMonth(MONTHS[j]);
}
function enterApp(){
  var sc=lsGet("plc_sc");if(sc)S.sc=sc;var sm=lsGet("plc_month");if(sm)S.month=sm;
  var hs=readHash(),pg=hs?hs.pg:(lsGet("plc_pg")||"home");if(hs&&hs.pg==="home")S.month=hs.month;
  HDEPTH=0;PG="";show("app");go(pg,true);remember("replace");
}
function cfgFor(bid){var d=BR[bid];if(d&&!d.unset)return normCfg(d);var c=normCfg(d||null);c.label="顧問尚未設定這個品牌的業態，燈號暫以火鍋業態預估值顯示";return c}

/* ---------- dashboard ---------- */
function renderHome(){
  var p=curP(),rows=(p.t==="brand"||p.t==="store")?rowsFor(p):[];
  $("dashEmpty").hidden=!!rows.length;$("dashBody").hidden=!rows.length;
  if(!rows.length){$("dashTitle").textContent="損益儀表板";$("bmLabel").textContent="";$("dashEmptyTxt").textContent=isAdmin()?"資料庫裡還沒有任何損益資料。資料由內部系統與每週檢查寫入，寫入後回到這裡按重新整理就會出現。":"顧問還沒有把這個範圍的損益資料掛上來。";return}
  CFG=cfgFor(p.bid);setCats(rows);
  var D=build(rows,S.adj),n=D.months.length;
  if(S.month!=="ALL"&&D.months.indexOf(S.month)<0)S.month="ALL";
  MONTHS=D.months;var mi=D.months.indexOf(S.month);
  $("mPrev").disabled=n<2||mi===0;$("mNext").disabled=n<2||S.month==="ALL"||mi===n-1;
  $("dashTitle").textContent=titleOf(p)+"　損益儀表板";
  $("bmLabel").textContent=CFG.label+"　資料期間："+D.months[0]+(n>1?" 到 "+D.months[n-1]:"");
  var seg=$("segMonth");seg.textContent="";
  [["ALL",n+" 個月"]].concat(D.months.map(function(m){return [m,mlabel(m)]})).forEach(function(x){
    var b=h("button",null,x[1]);b.type="button";b.setAttribute("aria-pressed",String(S.month===x[0]));b.addEventListener("click",function(){setMonth(x[0])});seg.appendChild(b)});
  $("adjOff").setAttribute("aria-pressed",String(!S.adj));$("adjOn").setAttribute("aria-pressed",String(S.adj));
  var FL=monthFlags(D);
  Array.prototype.forEach.call(seg.children,function(b,i){var m=i?D.months[i-1]:null;if(m&&FL[m]){b.textContent="⚠ "+b.textContent;b.title="資料可能不完整："+FL[m].join("；")}});
  renderDiag(D,FL,S.adj?[]:rows);renderKpis(D);renderLights(D);renderRev(D);renderNet(D);renderPrime(D,FL);renderWf(D);renderBe(D);renderCh(D);renderTable(D);
  if(n<2)$("tRev").textContent=mlabel(D.months[0])+"營業收入 "+wan(rev(D.M[D.months[0]]));
  var ann=(BR[p.bid]||{}).annual||[],an=ann.join("、");
  $("adjNote").textContent=S.adj?"還原後口徑做了調整：營業稅依各月營收比例攤平；水電燃料與修繕清潔常隔月或兩個月合併入帳，改為期間內每月平均"+(an?"；"+an+"這類一年付一次的費用，改為每月認列十二分之一（只認列畫面上這段期間的月份，所以累計數字會和帳面不同）。":"。"):"帳面口徑：與原始損益表完全一致。營業稅通常兩個月入帳一次"+(an?"，"+an+"一年只記一次":"")+"，單月數字會因此忽高忽低；切到「還原後」可以攤平。";
  $("calcNote").textContent="怎麼算的：食材率含包材（免洗餐具）。外送有效抽成＝平台服務費、廣告、促銷折扣、上架費、退款合計 ÷ 該平台營業額。損益兩平把食材、包材、平台費、金流、營業稅與一部分水電（目前算 "+CFG.vu+"%，由顧問設定）視為變動成本，人事、租金、其餘水電與其他費用視為固定費用。通路留存以全店平均食材包材率估算。損益表上沒有記的項目（例如折舊、負責人自己的薪資、自有店面的租金），這裡不會自動補上。";
  $("status").textContent=LOADED_AT?"資料讀取時間 "+LOADED_AT+(SKIPPED?"（有 "+SKIPPED+" 筆格式不符的資料沒有顯示，請通知顧問）":""):"";
}
async function refreshData(){
  var b=$("btnRefresh");b.disabled=true;$("status").textContent="讀取中…";
  try{
    var r=await sb.from("pl_profiles").select("*").eq("user_id",CUR).maybeSingle();if(r.error)throw r.error;if(r.data)ME=r.data;
    if(gate())return;
    await loadData();if(!isAdmin()&&!S.rows.length){gate("noaccess");return}
    renderAll();
  }catch(e){$("status").textContent=errText(e)}finally{b.disabled=false}
}

/* ---------- Excel export: the same numbers as the table, plus the original account lines ---------- */
function exportXlsx(){
  var X=window.XLSX,p=curP(),rows=(p.t==="brand"||p.t==="store")?rowsFor(p):[];
  if(!X){$("status").textContent="匯出元件沒有載入成功。請重新整理頁面後再按一次。";return}
  if(!rows.length)return;
  CFG=cfgFor(p.bid);setCats(rows);
  var D=build(rows,false),n=D.months.length,r2=function(v){return Math.round(v*100)/100};
  var cats=REV.slice();if(D.months.some(function(m){return D.M[m]["其他收入"]}))cats.push("其他收入");
  var A=[["科目"].concat(D.months).concat(["合計","月平均"])];
  var line=function(name,fn){var r=[name],s=0;D.months.forEach(function(m){var v=r2(fn(D.M[m]));s+=v;r.push(v)});r.push(r2(s),r2(s/n));A.push(r)};
  cats.forEach(function(c){line(REVLBL[c],function(o){return o[c]||0})});
  line("營業收入合計",rev);
  COST.forEach(function(c){line(c,function(o){return o[c]||0})});
  line("成本費用合計",function(o){var s=0;COST.forEach(function(c){s+=o[c]||0});return s});
  line("營業淨利",function(o){return met(o).net});
  var B=[["指標"].concat(D.months).concat(["全期間","綠燈門檻","黃燈門檻"])],per=D.months.map(function(m){return lightRows(met(D.M[m]))}),all=lightRows(met(avg(D)));
  var q=function(v){return isFinite(v)?Math.round(v*10000)/10000:""};
  all.forEach(function(r,i){var k=BMK[i];B.push([r[0]].concat(per.map(function(x){return q(x[i][1])})).concat([q(r[1]),CFG.bm[k][0]/100,CFG.bm[k][1]/100]))});
  B.push([]);
  all.forEach(function(r,i){B.push([r[0]+" 燈號"].concat(per.map(function(x){return x[i].L?LNAME[x[i].L]:"—"})).concat([r.L?LNAME[r.L]:"—","",""]))});
  var C=[["月份","分店","大類","標準科目","原始科目","金額"]];
  rows.slice().sort(function(a,b){return a.m.localeCompare(b.m)||a.st.localeCompare(b.st,"zh-Hant")||SECS.indexOf(a.s)-SECS.indexOf(b.s)||a.c.localeCompare(b.c,"zh-Hant")}).forEach(function(r){C.push([r.m,r.st,r.s,r.c,r.n,r.a])});
  var e=entOf(p.bid),I=[["損益分析中心　匯出"],["客戶",e?e.cl:""],["範圍",titleOf(p)],["期間",D.months[0]+(n>1?" 到 "+D.months[n-1]:"")+"（"+n+" 個月）"],["口徑","帳面：與原始損益表一致"],["匯出時間",tfmt(new Date().toISOString())],["燈號基準",CFG.label],
    ["核對方式","「月損益彙總」的營業收入合計 − 成本費用合計 ＝ 營業淨利；「原始科目明細」的金額加總會等於彙總表的合計。"],["提醒","燈號基準是業界一般參考值，超標代表值得追問，不代表一定有問題。"]];
  var wb=X.utils.book_new(),fmt=function(ws,f,c0,test){var rg=X.utils.decode_range(ws["!ref"]);for(var R=1;R<=rg.e.r;R++)for(var Cc=c0;Cc<=rg.e.c;Cc++){var cell=ws[X.utils.encode_cell({r:R,c:Cc})];if(cell&&cell.t==="n"&&(!test||test(R)))cell.z=f}};
  var w1=X.utils.aoa_to_sheet(A);fmt(w1,"#,##0",1);w1["!cols"]=[{wch:18}].concat(D.months.map(function(){return {wch:12}})).concat([{wch:14},{wch:12}]);
  var w2=X.utils.aoa_to_sheet(B);fmt(w2,"0.0%",1);w2["!cols"]=[{wch:20}].concat(D.months.map(function(){return {wch:10}})).concat([{wch:10},{wch:10},{wch:10}]);
  var w3=X.utils.aoa_to_sheet(C);fmt(w3,"#,##0",5);w3["!cols"]=[{wch:9},{wch:10},{wch:10},{wch:16},{wch:26},{wch:12}];
  var w4=X.utils.aoa_to_sheet(I);w4["!cols"]=[{wch:12},{wch:80}];
  X.utils.book_append_sheet(wb,w1,"月損益彙總");X.utils.book_append_sheet(wb,w2,"比率與燈號");X.utils.book_append_sheet(wb,w3,"原始科目明細");X.utils.book_append_sheet(wb,w4,"說明");
  var name="損益_"+titleOf(p).replace(/[\\\/:*?"<>|]/g,"")+"_"+D.months[0]+(n>1?"_"+D.months[n-1]:"")+"_"+today().replace(/-/g,"")+".xlsx";
  X.writeFile(wb,name);
  renderHome();$("status").textContent="已匯出 "+name;
}

/* ---------- my account ---------- */
function accText(list){
  if(!list.length)return "尚未授權任何品牌";
  return list.map(function(a){return a.brand_name+(a.store_name?"・"+a.store_name:"（整個品牌）")}).join("、");
}
function renderAccount(){
  var kv=$("kvMe");kv.textContent="";
  var mine=isAdmin()?"全部品牌（管理員）":accText(ACC.filter(function(a){return a.user_id===ME.user_id}));
  [["名稱",ME.display_name||"（未填）"],["Email",ME.email],["狀態",STN[ME.status]||ME.status],["使用期限",ME.role==="admin"?"不限期":ME.expires_on?"到 "+ME.expires_on+" 為止":"不限期"],["可以查看",mine],["目前功能",canUpload()?"查看儀表板、匯出 Excel、上傳損益表":"查看儀表板與匯出 Excel"]].forEach(function(r){kv.appendChild(h("dt",null,r[0]));kv.appendChild(h("dd",null,r[1]))});
}
async function pwSubmit(ev){
  ev.preventDefault();$("pwMsg").textContent="處理中…";$("pwBtn").disabled=true;
  try{var r=await sb.auth.updateUser({password:$("pwNew").value});if(r.error)throw r.error;$("pwNew").value="";$("pwMsg").textContent="密碼已更新，下次請用新密碼登入。"}
  catch(e){$("pwMsg").textContent=errText(e)}finally{$("pwBtn").disabled=false}
}

/* ---------- admin: accounts and which brands each may see ---------- */
var EDIT=null,ARMED="";
var SEP="\u0001";
function ukey(cl,br,st){return cl+SEP+br+SEP+(st||"")}
function unitList(){
  var U={},order=[];
  var add=function(cl,br,st){var k=cl+SEP+br;if(!U[k]){U[k]={cl:cl,br:br,stores:[]};order.push(k)}if(st&&U[k].stores.indexOf(st)<0)U[k].stores.push(st)};
  ents().forEach(function(e){add(e.cl,e.br);e.stores.forEach(function(st){add(e.cl,e.br,st)})});
  ACC.forEach(function(a){add(a.client_name,a.brand_name,a.store_name)});
  return order.map(function(k){U[k].stores.sort();return U[k]});
}
function renderAdmin(){
  var box=$("lUsers"),pend=PROFS.filter(function(p){return p.status==="pending"}).length;
  $("tUsers").textContent="共 "+PROFS.length+" 個帳號"+(pend?"，"+pend+" 個等待開通":"，沒有等待開通的帳號");
  box.textContent="";
  PROFS.slice().sort(function(a,b){return (b.status==="pending")-(a.status==="pending")||String(b.created_at).localeCompare(String(a.created_at))}).forEach(function(p){
    var d=h("div","item"),b=h("div","body"),a=h("div","acts"),top=h("div");d.appendChild(b);d.appendChild(a);
    top.appendChild(h("span","tag "+(STC[p.status]||""),STN[p.status]||p.status));if(p.role==="admin")top.appendChild(h("span","tag","管理員"));
    top.appendChild(document.createTextNode(p.display_name||"（未填名稱）"));b.appendChild(top);
    var late=p.expires_on&&p.expires_on<today();
    b.appendChild(h("div","meta",[p.email,"註冊 "+dfmt(p.created_at),p.role==="admin"?"":(p.expires_on?"到期 "+p.expires_on+(late?"（已過期）":""):"不限期")].filter(Boolean).join("　")));
    if(p.role!=="admin")b.appendChild(h("div","meta","可以看："+accText(ACC.filter(function(x){return x.user_id===p.user_id}))));
    if(p.note)b.appendChild(h("div","meta","備註："+p.note));
    if(p.role!=="admin"){
      if(p.status==="pending"){var ok=h("button","btn sm pri","開通");ok.type="button";ok.addEventListener("click",function(){openEdit(p.user_id,"active")});a.appendChild(ok)}
      var ed=h("button","btn sm","設定");ed.type="button";ed.addEventListener("click",function(){openEdit(p.user_id)});a.appendChild(ed);
    }
    box.appendChild(d);
  });
  if(!PROFS.length)box.appendChild(h("div","empty","還沒有任何帳號。"));
  var lm=$("lMail");lm.textContent="";
  var KN={signup:"新註冊通知",approval:"開通通知",suspended:"停權通知"};
  MAIL.forEach(function(m){var d=h("div","item"),b=h("div","body");d.appendChild(b);var top=h("div");top.appendChild(h("span","tag",KN[m.kind]||m.kind));top.appendChild(document.createTextNode(m.subject));b.appendChild(top);b.appendChild(h("div","meta",m.recipient+"　"+tfmt(m.created_at)));lm.appendChild(d)});
  if(!MAIL.length)lm.appendChild(h("div","empty","還沒有寄出任何系統信。"));
  if(EDIT&&!PROFS.some(function(p){return p.user_id===EDIT}))closeEdit();
}
function closeEdit(){EDIT=null;ARMED="";$("edCard").hidden=true;$("edMsg").textContent=""}
function openEdit(uid,preset){
  var p=PROFS.filter(function(x){return x.user_id===uid})[0];if(!p)return;EDIT=uid;ARMED="";
  $("edTitle").textContent="設定："+(p.display_name||p.email);$("edSub").textContent=p.email+"　目前狀態："+(STN[p.status]||p.status);
  $("eStatus").value=preset||p.status;$("eExp").value=p.expires_on||"";$("eAccess").value=p.access==="edit"?"edit":"view";$("eNote").value=p.note||"";
  var have={};ACC.filter(function(a){return a.user_id===uid}).forEach(function(a){have[ukey(a.client_name,a.brand_name,a.store_name)]=1});
  var box=$("eUnits"),U=unitList(),lastCl=null;box.textContent="";
  if(!U.length)box.appendChild(h("div","empty","資料庫裡還沒有任何品牌。"));
  U.forEach(function(u){
    if(u.cl!==lastCl){box.appendChild(h("div","cl",u.cl));lastCl=u.cl}
    var mk=function(st,cls,txt){var l=h("label",cls),c=document.createElement("input");c.type="checkbox";c.dataset.cl=u.cl;c.dataset.br=u.br;c.dataset.st=st||"";c.checked=!!have[ukey(u.cl,u.br,st)];l.appendChild(c);l.appendChild(document.createTextNode(txt));box.appendChild(l);return c};
    var whole=mk("",null,u.br+"（整個品牌）"),subs=[];
    if(u.stores.length>1||u.stores.some(function(st){return have[ukey(u.cl,u.br,st)]}))subs=u.stores.map(function(st){return mk(st,"sub1","只看 "+st)});
    var sync=function(){subs.forEach(function(c){c.disabled=whole.checked;if(whole.checked)c.checked=false})};
    whole.addEventListener("change",sync);sync();
  });
  $("edMsg").textContent=preset==="active"&&p.status!=="active"?"請勾選他可以看的品牌，確認到期日後按「儲存」，就會開通並寄通知信給對方。":"";
  $("edCard").hidden=false;$("edCard").scrollIntoView({block:"start"});
}
async function saveEdit(ev){
  ev.preventDefault();var p=PROFS.filter(function(x){return x.user_id===EDIT})[0],msg=$("edMsg");if(!p)return;
  var st=$("eStatus").value,exp=$("eExp").value||null,ac=$("eAccess").value,note=$("eNote").value.trim().slice(0,500);
  var want={};Array.prototype.forEach.call($("eUnits").querySelectorAll("input[type=checkbox]"),function(c){if(c.checked&&!c.disabled)want[ukey(c.dataset.cl,c.dataset.br,c.dataset.st)]={user_id:EDIT,client_name:c.dataset.cl,brand_name:c.dataset.br,store_name:c.dataset.st||null}});
  var mine=ACC.filter(function(a){return a.user_id===EDIT}),haveK={};mine.forEach(function(a){haveK[ukey(a.client_name,a.brand_name,a.store_name)]=a.id});
  var ins=Object.keys(want).filter(function(k){return !(k in haveK)}).map(function(k){return want[k]}),del=Object.keys(haveK).filter(function(k){return !(k in want)}).map(function(k){return haveK[k]});
  var sig=[st,exp,Object.keys(want).sort().join(",")].join("|"),warn="";
  if((st==="suspended"||st==="rejected")&&p.status!==st)warn="確定要改成「"+STN[st]+"」嗎？對方會無法查看資料"+(st==="suspended"&&p.status==="active"?"，系統也會寄停權通知信給他":"")+"。確定的話再按一次「儲存」。";
  else if(st==="active"&&!Object.keys(want).length)warn="還沒有勾選任何品牌：開通後對方登入只會看到「資料準備中」。要先開通的話，再按一次「儲存」。";
  else if(st==="active"&&exp&&exp<today())warn="到期日已經過了，對方登入會看到「使用期限已到」。確定的話再按一次「儲存」。";
  if(warn&&ARMED!==sig){ARMED=sig;msg.textContent=warn;return}
  ARMED="";msg.textContent="儲存中…";$("edSave").disabled=true;
  try{
    if(del.length){var d=await sb.from("pl_access").delete().in("id",del);if(d.error)throw d.error}
    if(ins.length){var i=await sb.from("pl_access").insert(ins);if(i.error)throw i.error}
    var ch=p.status!==st||(p.expires_on||null)!==exp||p.access!==ac||(p.note||"")!==note;
    if(ch){var u=await sb.from("pl_profiles").update({status:st,expires_on:exp,access:ac,note:note}).eq("user_id",EDIT).select();if(u.error)throw u.error;if(!u.data||!u.data.length)throw new Error("沒有改到這個帳號，請重新整理後再試")}
    var was=p.status;await reloadAdmin();
    msg.textContent="已儲存。"+(st==="active"&&was!=="active"?"系統已寄開通通知信給對方。":st==="suspended"&&was==="active"?"系統已寄停權通知信給對方。":"");
    $("edSub").textContent=p.email+"　目前狀態："+(STN[st]||st);
  }catch(e){msg.textContent=errText(e);try{await reloadAdmin()}catch(e2){}}
  finally{$("edSave").disabled=false}
}
async function reloadAdmin(){
  var R=await Promise.all([sb.from("pl_profiles").select("*").order("created_at",{ascending:false}),sb.from("pl_access").select("*"),sb.from("pl_mail_log").select("*").order("created_at",{ascending:false}).limit(10)]);
  for(var i=0;i<R.length;i++)if(R[i].error)throw R[i].error;
  PROFS=R[0].data||[];ACC=R[1].data||[];MAIL=R[2].data||[];renderShell();renderAdmin();
}

/* ---------- boot ---------- */
function boot(){
  if(!window.supabase||!window.supabase.createClient){loading("網頁需要的元件沒有載入成功。請確認網路正常後重新整理；如果用的是公司網路，可以改用手機網路試試。",false);return}
  sb=window.supabase.createClient(SB_URL,SB_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storageKey:"plc-auth"}});
  setMode("in");
  $("tabIn").addEventListener("click",function(){setMode("in");auMsg("")});$("tabUp").addEventListener("click",function(){setMode("up");auMsg("")});$("tabFg").addEventListener("click",function(){setMode("fg");auMsg("")});
  $("fAuth").addEventListener("submit",authSubmit);$("auResend").addEventListener("click",resend);
  $("auShow").addEventListener("change",function(){$("auPass").type=$("auShow").checked?"text":"password"});
  $("rsShow").addEventListener("change",function(){$("rsPass").type=$("rsShow").checked?"text":"password"});
  $("fReset").addEventListener("submit",resetSubmit);$("fPw").addEventListener("submit",pwSubmit);
  $("btnRetry").addEventListener("click",function(){route(true)});$("gReload").addEventListener("click",function(){route(true)});
  document.addEventListener("click",function(e){var t=e.target&&e.target.closest?e.target.closest("[data-out]"):null;if(t)signOut()});
  Array.prototype.forEach.call(document.querySelectorAll("button.nav[data-pg]"),function(b){b.addEventListener("click",function(){go(b.dataset.pg)})});
  document.addEventListener("click",function(e){var t=e.target&&e.target.closest?e.target.closest("[data-back]"):null;if(t)goBack()});
  $("mPrev").addEventListener("click",function(){stepMonth(-1)});$("mNext").addEventListener("click",function(){stepMonth(1)});
  window.addEventListener("popstate",function(e){
    if($("app").hidden)return;var hs=readHash();if(!hs)return;
    HDEPTH=e.state&&e.state.plc?e.state.d:0;
    if(hs.pg==="home"){S.month=hs.month;lsSet("plc_month",S.month)}
    go(hs.pg,true);
  });
  $("scSel").addEventListener("change",function(){S.sc=$("scSel").value;S.month="ALL";lsSet("plc_sc",S.sc);go("home")});
  $("adjOff").addEventListener("click",function(){S.adj=false;renderAll()});$("adjOn").addEventListener("click",function(){S.adj=true;renderAll()});
  $("btnRefresh").addEventListener("click",refreshData);$("btnExport").addEventListener("click",exportXlsx);
  $("fEd").addEventListener("submit",saveEdit);initUpload();$("edCancel").addEventListener("click",closeEdit);
  var rz;window.addEventListener("resize",function(){clearTimeout(rz);rz=setTimeout(function(){if(!$("app").hidden&&PG==="home")renderHome()},150)});
  sb.auth.onAuthStateChange(function(ev){
    if(ev==="PASSWORD_RECOVERY"){RECOVER=true;show("scrReset");return}
    if(ev==="TOKEN_REFRESHED"||ev==="USER_UPDATED")return;
    setTimeout(function(){route(ev==="SIGNED_OUT")},0);
  });
}
if(document.readyState==="complete")boot();else window.addEventListener("load",boot);
