/* ================= upload page, upload review, per-project light thresholds ================= */
var UPF=[],UPSEQ=0,UPBUSY=false,PJ=null;
function canUpload(){return isAdmin()||(!!ME&&ME.access==="edit"&&ME.status==="active")}
function upClean(t){return String(t||"").replace(/\s+/g,"").replace(/(股份)?有限公司|企業社|商行|工作室|餐飲|小吃店|小吃部/g,"")}
function upMaps(cl){var own={},any={};AMAP.forEach(function(m){var v={s:m.section,c:m.category};if(m.client_name===cl)own[m.account_name]=v;else if(!any[m.account_name])any[m.account_name]=v});return {own:own,any:any}}
function upUnits(){
  var out=[],seen={},add=function(cl,br,st,ut){var k=ukey(cl,br,st);if(seen[k])return;seen[k]=1;out.push({cl:cl,br:br,st:st,ut:ut||"門市"})};
  var utOf=function(cl,br,st){var r=S.rows.filter(function(x){return x.cl===cl&&x.br===br&&x.st===st})[0];return r?r.ut:((BR[bidOf(cl,br)]||{}).hq?"總部":"門市")};
  if(isAdmin())unitList().forEach(function(u){(u.stores.length?u.stores:["本店"]).forEach(function(st){add(u.cl,u.br,st,utOf(u.cl,u.br,st))})});
  else ACC.filter(function(a){return a.user_id===ME.user_id}).forEach(function(a){
    if(a.store_name)add(a.client_name,a.brand_name,a.store_name,utOf(a.client_name,a.brand_name,a.store_name));
    else{var e=entOf(bidOf(a.client_name,a.brand_name)),sts=e&&e.stores.length?e.stores:["本店"];sts.forEach(function(st){add(a.client_name,a.brand_name,st,utOf(a.client_name,a.brand_name,st))})}});
  return out;
}
function upUnit(){
  var v=$("upUnit").value;
  if(v==="new")return {cl:$("upCl").value.trim(),br:$("upBr").value.trim(),st:$("upSt").value.trim()||"本店",ut:$("upUt").value,isNew:true};
  return upUnits().filter(function(u){return ukey(u.cl,u.br,u.st)===v})[0]||null;
}
function upCats(sec,items){
  var c=sec==="營業收入"?["內用/外帶","其他收入","內部交易"]:sec==="營業成本"?["食材成本","包材耗材"]:IMP_COSTCATS.slice();
  var extra={};(items||[]).forEach(function(i){if(i.s===sec&&c.indexOf(i.c)<0)extra[i.c]=1});
  S.rows.forEach(function(r){if(r.s===sec&&c.indexOf(r.c)<0&&(sec!=="營業收入"||isDeliv(r.c)))extra[r.c]=1});
  return c.concat(Object.keys(extra).sort());
}
function upClassify(F,u){
  var maps=upMaps(u?u.cl:"");
  F.items=F.parsed.items.map(function(it,i){var old=F.items&&F.items[i];if(old&&old.k==="admin")return old;var r=impClassify(it,maps);return {s:it.s,n:it.n,a:it.a,c:r.c,k:r.k}});
}
function upExists(u,ym){return !!u&&S.rows.some(function(r){return r.cl===u.cl&&r.br===u.br&&r.st===u.st&&r.m===ym})}

/* ---------- upload page ---------- */
function renderUpload(){
  var sel=$("upUnit"),keep=sel.value,U=upUnits();sel.textContent="";
  U.forEach(function(u){var o=document.createElement("option");o.value=ukey(u.cl,u.br,u.st);o.textContent=u.br+"・"+u.st+(u.ut==="總部"?"（總部）":"")+(isAdmin()?"　｜"+u.cl:"");sel.appendChild(o)});
  if(isAdmin()){var o=document.createElement("option");o.value="new";o.textContent="＋ 新增客戶／品牌／分店";sel.appendChild(o)}
  if(!U.length&&!isAdmin()){var o2=document.createElement("option");o2.value="";o2.textContent="顧問還沒有開放你可以上傳的品牌";sel.appendChild(o2)}
  if(keep&&Array.prototype.some.call(sel.options,function(o){return o.value===keep}))sel.value=keep;
  else{var cur=curP();if(cur.bid){var hit=U.filter(function(u){return bidOf(u.cl,u.br)===cur.bid&&(cur.t!=="store"||u.st===cur.st)})[0];if(hit)sel.value=ukey(hit.cl,hit.br,hit.st)}}
  Array.prototype.forEach.call(document.querySelectorAll("[data-newunit]"),function(x){x.hidden=sel.value!=="new"});
  renderUpCards();renderUpHist();
}
function upReason(list){return (list||[]).map(function(k){return IMP_REASONS[k]||k})}
function renderUpCards(){
  var box=$("upList"),u=upUnit();box.textContent="";
  UPF.forEach(function(F){
    var c=h("div","upc");box.appendChild(c);
    var top=h("div","row");top.style.justifyContent="space-between";top.appendChild(h("h3",null,F.name));
    if(F.status!=="sending"){var rm=h("button","btn sm",F.status==="done"?"收起":"移除");rm.type="button";rm.addEventListener("click",function(){UPF=UPF.filter(function(x){return x!==F});renderUpCards()});top.appendChild(rm)}
    c.appendChild(top);
    if(F.status==="reading"){c.appendChild(h("p","msg","讀取中…"));return}
    if(F.status==="error"){c.appendChild(h("p","msg bad",F.err));return}
    if(F.status==="done"){var ok=F.result.status==="imported";var p=h("p","msg "+(ok?"ok":""),ok?"已建檔，儀表板已更新（"+F.period+"）。":"已送出，等顧問確認後建檔（"+F.period+"）。");c.appendChild(p);
      if(!ok){var ul=h("ul","issues");upReason(F.result.reasons).forEach(function(t){ul.appendChild(h("li",null,t))});c.appendChild(ul)}return}
    var P=F.parsed,sums=impSums(F.items),chk=impCheck(P.stated,sums);
    var row=h("div","row");
    var lm=h("label");lm.appendChild(document.createTextNode("損益表月份"));var mi=document.createElement("input");mi.type="month";mi.value=F.period||"";mi.required=true;
    mi.addEventListener("change",function(){F.period=mi.value;renderUpCards()});lm.appendChild(mi);row.appendChild(lm);
    if(P.company)row.appendChild(h("span","note","檔案上的公司：")).appendChild(document.createTextNode(P.company));
    c.appendChild(row);
    var g=h("div","chk4");[["R","營業收入"],["C","營業成本"],["O","營業費用"],["N","營業淨利"]].forEach(function(x){
      var d=h("div");d.appendChild(document.createTextNode(x[1]));d.appendChild(h("b",null,full(sums[x[0]])));
      var st=P.stated[x[0]];d.appendChild(h("span",st==null?"":Math.abs(st-sums[x[0]])<=0.5?"ok":"bad",st==null?"原表沒有總計":Math.abs(st-sums[x[0]])<=0.5?"✓ 與原表相符":"✗ 原表 "+full(st)));g.appendChild(d)});
    c.appendChild(g);
    var issues=[],warn=[];
    if(!F.period)issues.push("讀不到月份，請在上面選擇。");
    if(/^RANGE/.test(P.period||""))issues.push("這份檔案的期間超過一個月（"+P.period.slice(6)+"），請改傳單月的損益表。");
    chk.forEach(function(k){if(k!=="no_totals")issues.push(IMP_REASONS[k]+"，會請顧問確認。");else warn.push("檔案裡沒有總計，系統無法和原表核對，請自己確認上面四個數字對不對。")});
    var nG=F.items.filter(function(i){return i.k==="guess"}).length;if(nG)(isAdmin()?warn:issues).push(nG+" 個科目系統沒看過，已先放進最接近的分類（明細裡黃色那幾列）"+(isAdmin()?"，請確認或改分類後再建檔。":"，會請顧問確認。"));
    if(u&&!u.isNew&&P.company&&upClean(P.company)&&upClean(u.cl)&&upClean(P.company).indexOf(upClean(u.cl))<0&&upClean(u.cl).indexOf(upClean(P.company))<0)warn.push("檔案上的公司是「"+P.company+"」，和選的「"+u.cl+"」不一樣，請確認有沒有選錯店。");
    var ex=upExists(u,F.period);
    if(ex&&isAdmin()){var lb=h("label","chk");var cb=document.createElement("input");cb.type="checkbox";cb.checked=!!F.replace;cb.addEventListener("change",function(){F.replace=cb.checked});lb.appendChild(cb);lb.appendChild(document.createTextNode("這個月份已經有資料，用這份取代"));c.appendChild(lb)}
    else if(ex)warn.push("這個月份已經有資料，送出後會請顧問確認是否取代。");
    P.notes.forEach(function(t){warn.push(t)});
    if(issues.length||warn.length){var ul=h("ul","issues");issues.forEach(function(t){ul.appendChild(h("li","bad",t))});warn.forEach(function(t){ul.appendChild(h("li",null,t))});c.appendChild(ul)}
    c.appendChild(upItemsTable(F.items,isAdmin(),function(){renderUpCards()},nG>0));
    var acts=h("div","form"),go1=h("button","btn pri",F.status==="sending"?"送出中…":"確認建檔");go1.type="button";go1.disabled=F.status==="sending"||!F.period||!u||/^RANGE/.test(F.period);
    go1.addEventListener("click",function(){upSend(F)});acts.appendChild(go1);
    if(F.err2)acts.appendChild(h("span","msg bad",F.err2));
    c.appendChild(acts);
  });
  var ready=UPF.filter(function(F){return F.status==="ready"&&F.period}).length;
  if(ready>1){var all=h("button","btn pri","全部確認建檔（"+ready+" 份）");all.type="button";all.addEventListener("click",async function(){for(var i=0;i<UPF.length;i++)if(UPF[i].status==="ready"&&UPF[i].period)await upSend(UPF[i],true);await upAfter()});box.appendChild(all)}
}
function upItemsTable(items,editable,onChange,open){
  var d=document.createElement("details");if(open)d.open=true;
  var nG=items.filter(function(i){return i.k==="guess"}).length;
  d.appendChild(h("summary",null,"看明細與分類（"+items.length+" 個科目"+(nG?"，"+nG+" 個需確認":"")+"）"));
  var w=h("div","tblwrap"),t=h("table","itbl");w.appendChild(t);d.appendChild(w);
  var hr=t.insertRow();["原始科目","大類","分類","金額"].forEach(function(x){var th=document.createElement("th");th.textContent=x;hr.appendChild(th)});
  items.forEach(function(it){
    var tr=t.insertRow();if(it.k==="guess")tr.className="new";
    tr.insertCell().textContent=it.n;tr.insertCell().textContent=it.s;
    var td=tr.insertCell();
    if(editable){var sel=document.createElement("select");upCats(it.s,items).forEach(function(c){var o=document.createElement("option");o.value=c;o.textContent=c;sel.appendChild(o)});sel.value=it.c;
      sel.addEventListener("change",function(){it.c=sel.value;it.k="admin";onChange&&onChange()});td.appendChild(sel)}
    else td.textContent=it.c+(it.k==="guess"?"（待確認）":"");
    tr.insertCell().textContent=full(it.a);
  });
  return d;
}
async function upAddFiles(list){
  var u=upUnit();
  Array.prototype.forEach.call(list,function(file){
    var F={id:++UPSEQ,file:file,name:file.name,status:"reading"};UPF.push(F);
    impReadFile(file).then(function(P){F.parsed=P;F.period=/^\d{4}-\d{2}$/.test(P.period)?P.period:"";F.status="ready";upClassify(F,upUnit());renderUpCards()})
      .catch(function(e){F.status="error";F.err=(e&&e.message)||"讀取失敗";renderUpCards()});
  });
  renderUpCards();
}
async function upSend(F,batch){
  var u=upUnit();if(!u||F.status!=="ready")return;
  if(u.isNew&&(!u.cl||!u.br)){F.err2="請填客戶名稱與品牌名稱。";renderUpCards();return}
  F.status="sending";F.err2="";renderUpCards();
  try{
    var path=null,ext=(F.name.split(".").pop()||"bin").toLowerCase().replace(/[^a-z0-9]/g,"");
    try{var key=USER.id+"/"+F.period+"_"+Date.now().toString(36)+Math.random().toString(36).slice(2,6)+"."+ext;
      var up=await sb.storage.from("pl-uploads").upload(key,F.file,{upsert:false,contentType:F.file.type||"application/octet-stream"});if(!up.error)path=key}catch(e){}
    var P=F.parsed,mism=!isAdmin()&&P.company&&upClean(P.company)&&upClean(u.cl)&&upClean(P.company).indexOf(upClean(u.cl))<0&&upClean(u.cl).indexOf(upClean(P.company))<0;
    var r=await sb.rpc("pl_submit_upload",{p:{client_name:u.cl,brand_name:u.br,store_name:u.st,unit_type:u.ut,period_month:F.period+"-01",file_name:F.name,file_path:path,
      stated:P.stated,items:F.items.map(function(i){return {s:i.s,c:i.c,n:i.n,a:i.a,k:isAdmin()&&i.k==="guess"?"admin":i.k}}),replace:!!F.replace,name_mismatch:!!mism}});
    if(r.error)throw r.error;
    F.result=r.data;F.status="done";
  }catch(e){F.status="ready";F.err2=upErr(e)}
  renderUpCards();
  if(!batch)await upAfter();
}
function upErr(e){var m=String((e&&e.message)||e||"");
  if(/PL_NO_UPLOAD_RIGHT/.test(m))return "你的帳號目前沒有上傳這家店的權限，請和顧問聯絡。";
  if(/PL_BAD_MONTH/.test(m))return "月份不正確（不能是未來的月份）。";
  if(/PL_NOT_ACTIVE/.test(m))return "帳號目前不是使用中狀態。";
  if(/PL_BAD/.test(m))return "檔案內容有格式問題，沒有送出。請把檔案傳給顧問處理。";
  if(/function .*does not exist|Could not find the function/i.test(m))return "上傳功能的資料庫還沒啟用，請通知顧問。";
  return errText(e)}
async function upAfter(){try{await loadData()}catch(e){}renderAll()}
function renderUpHist(){
  var box=$("upHist");box.textContent="";
  var mine=UPL.filter(function(x){return isAdmin()||x.user_id===ME.user_id}).slice(0,30);
  var SN={imported:["已建檔","g"],review:["待確認","y"],rejected:["退回","r"]};
  mine.forEach(function(x){var d=h("div","item"),b=h("div","body");d.appendChild(b);var top=h("div");var s=SN[x.status]||[x.status,""];top.appendChild(h("span","tag "+s[1],s[0]));
    top.appendChild(document.createTextNode(x.brand_name+"・"+x.store_name+"　"+String(x.period_month).slice(0,7)));b.appendChild(top);
    b.appendChild(h("div","meta",[x.file_name,tfmt(x.created_at),isAdmin()?x.uploader:""].filter(Boolean).join("　")));
    if(x.status!=="imported"&&x.reasons&&x.reasons.length)b.appendChild(h("div","meta","原因："+upReason(x.reasons).join("；")));
    if(x.note)b.appendChild(h("div","meta","顧問備註："+x.note));
    box.appendChild(d)});
  if(!mine.length)box.appendChild(h("div","empty",FEAT_UP?"還沒有上傳紀錄。":"上傳功能的資料庫還沒啟用。"));
}

/* ---------- admin: review queue ---------- */
var RVARM=0;
function renderReview(){
  var box=$("lRev"),pend=UPL.filter(function(x){return x.status==="review"});box.textContent="";
  $("tRev").textContent=pend.length?"待確認（"+pend.length+" 筆）":"待確認";
  pend.forEach(function(x){
    var c=h("div","upc");box.appendChild(c);
    c.appendChild(h("h3",null,x.brand_name+"・"+x.store_name+"　"+String(x.period_month).slice(0,7)+"　｜"+x.client_name));
    c.appendChild(h("div","meta",[x.uploader,tfmt(x.created_at),x.file_name].filter(Boolean).join("　")));
    var ul=h("ul","issues");upReason(x.reasons).forEach(function(t){ul.appendChild(h("li",null,t))});c.appendChild(ul);
    var items=(x.items||[]).map(function(i){return {s:i.s,c:i.c,n:i.n,a:+i.a,k:i.k||""}});
    var cmp=h("div","chk4");c.appendChild(cmp);
    var draw=function(){cmp.textContent="";var sm=impSums(items);[["R","營業收入"],["C","營業成本"],["O","營業費用"],["N","營業淨利"]].forEach(function(k){var d=h("div");d.appendChild(document.createTextNode(k[1]));d.appendChild(h("b",null,full(sm[k[0]])));var st=x.stated&&x.stated[k[0]];
      d.appendChild(h("span",st==null?"":Math.abs(st-sm[k[0]])<=0.5?"ok":"bad",st==null?"原表沒有總計":Math.abs(st-sm[k[0]])<=0.5?"✓ 與原表相符":"✗ 原表 "+full(st)));cmp.appendChild(d)})};
    draw();
    c.appendChild(upItemsTable(items,true,draw,true));
    var note=document.createElement("input");note.maxLength=500;note.placeholder="備註（會顯示給上傳的人看，可留空）";note.style.width="100%";c.appendChild(note);
    var acts=h("div","form"),ok=h("button","btn pri",x.reasons&&x.reasons.indexOf("month_exists")>=0?"確認建檔（取代原本的資料）":"確認建檔");ok.type="button";
    var no=h("button","btn",RVARM===x.id?"再按一次確認退回":"退回");no.type="button";
    var msg=h("span","msg");
    ok.addEventListener("click",async function(){ok.disabled=no.disabled=true;msg.textContent="建檔中…";
      try{var r=await sb.rpc("pl_review_upload",{upload_id:x.id,act:"approve",new_items:items.map(function(i){return {s:i.s,c:i.c,n:i.n,a:i.a,k:i.k==="guess"?"admin":i.k}}),note:note.value});if(r.error)throw r.error;await upAfter()}
      catch(e){msg.textContent=errText(e);ok.disabled=no.disabled=false}});
    no.addEventListener("click",async function(){if(RVARM!==x.id){RVARM=x.id;no.textContent="再按一次確認退回";return}
      ok.disabled=no.disabled=true;msg.textContent="處理中…";
      try{var r=await sb.rpc("pl_review_upload",{upload_id:x.id,act:"reject",note:note.value});if(r.error)throw r.error;RVARM=0;await upAfter()}
      catch(e){msg.textContent=errText(e);ok.disabled=no.disabled=false}});
    acts.appendChild(ok);acts.appendChild(no);
    if(x.file_path){var fb=h("button","btn","看原始檔");fb.type="button";fb.addEventListener("click",async function(){try{var r=await sb.storage.from("pl-uploads").createSignedUrl(x.file_path,300);if(r.error)throw r.error;window.open(r.data.signedUrl,"_blank","noopener")}catch(e){msg.textContent="原始檔打不開："+errText(e)}});acts.appendChild(fb)}
    acts.appendChild(msg);c.appendChild(acts);
  });
  if(!pend.length)box.appendChild(h("div","empty",FEAT_UP?"沒有等待確認的上傳。":"上傳功能的資料庫還沒啟用。"));
  var dn=$("lRevDone");dn.textContent="";var SN={imported:["已建檔","g"],rejected:["退回","r"]};
  UPL.filter(function(x){return x.status!=="review"}).slice(0,20).forEach(function(x){var d=h("div","item"),b=h("div","body");d.appendChild(b);var top=h("div"),s=SN[x.status]||[x.status,""];top.appendChild(h("span","tag "+s[1],s[0]));
    top.appendChild(document.createTextNode(x.brand_name+"・"+x.store_name+"　"+String(x.period_month).slice(0,7)));b.appendChild(top);
    b.appendChild(h("div","meta",[x.uploader,tfmt(x.created_at),x.file_name,x.reasons&&x.reasons.length?"（"+upReason(x.reasons).join("；")+"）":"自動建檔"].filter(Boolean).join("　")));dn.appendChild(d)});
  if(!dn.childNodes.length)dn.appendChild(h("div","empty","還沒有紀錄。"));
}

/* ---------- admin: per-project thresholds ---------- */
function projList(){return ents().map(function(e){var d=BR[e.id];return {id:e.id,cl:e.cl,br:e.br,hq:e.hq,d:d,unset:!d||d.unset}})}
function projState(p){if(p.unset)return ["尚未設定業態","y"];var c=normCfg(p.d),est=bmFromType(c.type),tuned=BMK.some(function(k){return c.bm[k][0]!==est[k][0]||c.bm[k][1]!==est[k][1]});return [tuned?"已依實況調整":"預估值",tuned?"g":""]}
function renderProj(){
  var box=$("lProj");box.textContent="";
  projList().forEach(function(p){var d=h("div","item"),b=h("div","body"),a=h("div","acts");d.appendChild(b);d.appendChild(a);var st=projState(p),top=h("div");
    top.appendChild(h("span","tag "+st[1],st[0]));top.appendChild(document.createTextNode(p.br+(p.hq?"（總部）":"")));b.appendChild(top);
    b.appendChild(h("div","meta",p.cl+"　"+(p.unset?"燈號暫用火鍋業態預估值":normCfg(p.d).label)));
    var bt=h("button","btn sm"+(p.unset?" pri":""),"設定");bt.type="button";bt.addEventListener("click",function(){openProj(p.id)});a.appendChild(bt);box.appendChild(d)});
  if(!box.childNodes.length)box.appendChild(h("div","empty","還沒有任何專案。上傳第一份損益表後就會出現在這裡。"));
  if(PJ)fillProj();
}
function openProj(id){PJ={id:id};var p=projList().filter(function(x){return x.id===id})[0];if(!p)return;var c=p.unset?normCfg(null):normCfg(p.d);
  PJ.p=p;PJ.type=c.type;PJ.bm=JSON.parse(JSON.stringify(c.bm));PJ.vu=c.vu;PJ.ann=(p.d&&p.d.annual||[]).join("、");PJ.hq=p.hq;
  $("pjCard").hidden=false;fillProj();$("pjCard").scrollIntoView({block:"start"})}
function fillProj(){
  var p=PJ.p;$("pjTitle").textContent=p.br+"　燈號設定";$("pjSub").textContent=p.cl+"。門檻是百分比，成本類「綠燈 ≤、黃燈 ≤」，淨利率是「綠燈 ≥、黃燈 ≥」，超過黃燈就是紅燈。";
  var ts=$("pjType");if(!ts.options.length)BT.forEach(function(t,i){var o=document.createElement("option");o.value=i;o.textContent=t[0];ts.appendChild(o)});ts.value=String(PJ.type);
  var est=bmFromType(PJ.type),t=$("pjTbl");t.textContent="";var hr=t.insertRow();["指標","綠燈","黃燈","預估值","狀態"].forEach(function(x){var th=document.createElement("th");th.textContent=x;hr.appendChild(th)});
  BMK.forEach(function(k){var tr=t.insertRow();tr.insertCell().textContent=BMN[k]+(k==="net"?"（≥）":"（≤）");
    [0,1].forEach(function(j){var td=tr.insertCell(),inp=document.createElement("input");inp.type="number";inp.step="0.5";inp.min="-50";inp.max="100";inp.value=PJ.bm[k][j];inp.setAttribute("aria-label",BMN[k]+(j?"黃燈":"綠燈"));
      inp.addEventListener("input",function(){var v=parseFloat(inp.value);if(isFinite(v))PJ.bm[k][j]=v;st.textContent=PJ.bm[k][0]===est[k][0]&&PJ.bm[k][1]===est[k][1]?"預估":"已調整"});td.appendChild(inp)});
    tr.insertCell().textContent=est[k][0]+"／"+est[k][1];var st=tr.insertCell();st.textContent=PJ.bm[k][0]===est[k][0]&&PJ.bm[k][1]===est[k][1]?"預估":"已調整"});
  $("pjVu").value=PJ.vu;$("pjAnn").value=PJ.ann;$("pjHq").checked=!!PJ.hq;
}
async function saveProj(ev){
  ev.preventDefault();var p=PJ.p,est=bmFromType(PJ.type),bad=false;
  BMK.forEach(function(k){var b=PJ.bm[k];if(!isFinite(b[0])||!isFinite(b[1])||(k==="net"?b[1]>b[0]:b[1]<b[0]))bad=true});
  if(bad){$("pjMsg").textContent="門檻不合理：成本類的黃燈要大於等於綠燈，淨利率的黃燈要小於等於綠燈。";return}
  var vu=parseFloat($("pjVu").value);if(!isFinite(vu)||vu<0||vu>100){$("pjMsg").textContent="水電變動比例要在 0 到 100 之間。";return}
  var ann=$("pjAnn").value.split(/[、,，;；\n]/).map(function(x){return x.trim()}).filter(function(x){return x&&!/['"\\;]/.test(x)}).slice(0,20);
  var tuned=BMK.some(function(k){return PJ.bm[k][0]!==est[k][0]||PJ.bm[k][1]!==est[k][1]});
  var label=tuned?(BT[PJ.type][0].replace(/（.*$/,"")+"業態（顧問依實況調整）"):labelOfType(PJ.type);
  $("pjSave").disabled=true;$("pjMsg").textContent="儲存中…";
  try{var r=await sb.from("pl_brand_settings").upsert({client_name:p.cl,brand_name:p.br,is_hq:$("pjHq").checked,biz_type:PJ.type,thresholds:PJ.bm,util_variable_pct:vu,label:label,annual_accounts:ann,updated_at:new Date().toISOString()},{onConflict:"client_name,brand_name"});
    if(r.error)throw r.error;await loadData();PJ.p=projList().filter(function(x){return x.id===p.id})[0]||p;renderAll();$("pjMsg").textContent="已儲存，儀表板已改用新的門檻。"}
  catch(e){$("pjMsg").textContent=/row-level security|permission/i.test(String(e&&e.message))?"資料庫還沒開放修改設定，請先套用這次的資料庫更新。":errText(e)}
  finally{$("pjSave").disabled=false}
}

function initUpload(){
  $("upUnit").addEventListener("change",function(){Array.prototype.forEach.call(document.querySelectorAll("[data-newunit]"),function(x){x.hidden=$("upUnit").value!=="new"});var u=upUnit();UPF.forEach(function(F){if(F.parsed&&F.status==="ready")upClassify(F,u)});renderUpCards()});
  ["upCl","upBr","upSt","upUt"].forEach(function(id){$(id).addEventListener("change",function(){var u=upUnit();UPF.forEach(function(F){if(F.parsed&&F.status==="ready")upClassify(F,u)});renderUpCards()})});
  $("upFile").addEventListener("change",function(){upAddFiles($("upFile").files);$("upFile").value=""});
  var dz=$("upDrop");
  ["dragenter","dragover"].forEach(function(t){dz.addEventListener(t,function(e){e.preventDefault();dz.classList.add("on")})});
  ["dragleave","drop"].forEach(function(t){dz.addEventListener(t,function(e){e.preventDefault();dz.classList.remove("on")})});
  dz.addEventListener("drop",function(e){if(e.dataTransfer&&e.dataTransfer.files)upAddFiles(e.dataTransfer.files)});
  $("upTpl").addEventListener("click",impTemplate);
  $("pjType").addEventListener("change",function(){var old=bmFromType(PJ.type),nt=+$("pjType").value,ne=bmFromType(nt);
    BMK.forEach(function(k){if(PJ.bm[k][0]===old[k][0]&&PJ.bm[k][1]===old[k][1])PJ.bm[k]=ne[k].slice()});PJ.type=nt;fillProj()});
  $("pjReset").addEventListener("click",function(){PJ.bm=bmFromType(PJ.type);fillProj();$("pjMsg").textContent="已恢復成預估值，按「儲存」才會生效。"});
  $("fPj").addEventListener("submit",saveProj);
}
