function hid(t){var x=5381;for(var i=0;i<t.length;i++)x=((x<<5)+x+t.charCodeAt(i))>>>0;return "b"+x.toString(36)}
function bidOf(cl,br){return hid(cl+"|"+br)}
var BASECOST=["食材成本","包材耗材","人事費用","租金","水電燃料"],TAILCOST=["金流手續費","行銷費用","修繕與清潔","一般營運費用","折舊攤提","營業稅"];
var REV=[],REVLBL={},REVCOL={},PLAT={},COST=[];
var PAL=["var(--s1)","var(--s2)","var(--s3)","var(--s4)"];
function isPlat(c){return /平台費用$/.test(c)}
function isDeliv(c){return /外送$/.test(c)}
/* channels and cost lines are derived from whatever rows are in view, so each brand keeps its own */
function setCats(rows){
  var tot={},pl={};rows.forEach(function(r){if(r.s==="營業收入"&&r.c!=="其他收入")tot[r.c]=(tot[r.c]||0)+r.a;if(r.s==="營業費用"&&isPlat(r.c))pl[r.c]=1});
  var all=Object.keys(tot).sort(function(a,b){return (isDeliv(a)-isDeliv(b))||tot[b]-tot[a]});
  REV=all.slice(0,4);REVLBL={"其他收入":"其他收入"};REVCOL={"其他收入":"var(--s5)"};PLAT={};
  REV.forEach(function(c,i){REVLBL[c]=c.replace("/","／").replace(/外送$/,"");REVCOL[c]=PAL[i];var f=c.replace(/外送$/,"")+"平台費用";if(isDeliv(c)&&pl[f])PLAT[c]=f});
  COST=BASECOST.concat(Object.keys(pl).sort(),TAILCOST);
}
var BT=[["火鍋／石鍋（單點、個人鍋）",45,28,65,12],["吃到飽（火鍋、燒肉、自助）",50,28,70,12],["燒肉（單點）",38,30,65,12],["中式合菜／熱炒／一般內用餐廳",40,28,65,12],["日式料理／迴轉壽司",45,30,70,12],["拉麵／麵店",40,30,65,10],["便當／自助餐",48,24,68,10],["早午餐",35,28,62,10],["傳統早餐店",42,25,62,12],["咖啡廳",35,35,65,15],["手搖飲",40,32,65,10],["烘焙／甜點",35,28,62,10],["西式／義式／精緻餐廳",36,35,68,12],["連鎖速食／漢堡炸物",45,30,68,10],["小吃／麵攤",50,25,65,10],["酒吧／餐酒館",32,32,62,15],["純外送／雲端廚房",35,22,55,6]];
function bmFromType(i){var t=BT[i]||BT[0];return {food:[t[1],t[1]+3],labor:[t[2],t[2]+3],prime:[t[3],t[3]+5],rent:[t[4],t[4]+3],plat:[38,45],net:[8,3]}}
function labelOfType(i){return (BT[i]||BT[0])[0].replace(/（.*$/,"")+"業態基準（業界一般參考值）"}
var DEF={bm:bmFromType(0),vu:50,label:labelOfType(0),type:0};
var BMN={food:"食材＋包材",labor:"人事費用",prime:"主要成本",rent:"租金",plat:"外送有效抽成",net:"營業淨利率"},BMK=["food","labor","prime","rent","plat","net"];
var CFG=JSON.parse(JSON.stringify(DEF)),BR={};
function bmOf(k){var b=CFG.bm[k];return [b[0]/100,b[1]/100,(k==="net"?"≥ ":"≤ ")+b[0]+"%"]}
function normCfg(d){
  var c=JSON.parse(JSON.stringify(DEF));
  if(d&&isFinite(+d.type)&&BT[+d.type]){c.type=+d.type;c.bm=bmFromType(c.type);c.label=labelOfType(c.type)}
  if(d&&d.bm)BMK.forEach(function(k){var b=d.bm[k];if(Array.isArray(b)&&isFinite(+b[0])&&isFinite(+b[1]))c.bm[k]=[+b[0],+b[1]]});
  if(d&&isFinite(+d.vu)&&+d.vu>=0&&+d.vu<=100)c.vu=+d.vu;
  if(d&&typeof d.label==="string"&&d.label)c.label=d.label.slice(0,60);
  return c;
}
function cfgOf(bid){return normCfg(BR[bid]||null)}
var S={rows:[],month:"ALL",adj:false,sc:""};
function scParse(t){if(!t||t==="all")return {t:"all"};var k=t.slice(0,2),v=t.slice(2);if(k==="c:")return {t:"client",cl:v};if(k==="b:")return {t:"brand",bid:v};var i=v.indexOf("|");return {t:"store",bid:v.slice(0,i),st:v.slice(i+1)}}
function rowsFor(p){return S.rows.filter(function(r){if(p.t==="all")return true;if(p.t==="client")return r.cl===p.cl&&r.c!=="內部交易";return bidOf(r.cl,r.br)===p.bid&&(p.t==="brand"||r.st===p.st)})}
function ents(){
  var E={};S.rows.forEach(function(r){var id=bidOf(r.cl,r.br),e=E[id]||(E[id]={id:id,cl:r.cl,br:r.br,hq:false,st:{},data:true});e.st[r.st]=1;if(r.ut==="總部")e.hq=true});
  Object.keys(BR).forEach(function(id){var d=BR[id];if(!E[id])E[id]={id:id,cl:d.cl,br:d.br,hq:!!d.hq,st:{},data:false};else if(d.hq)E[id].hq=true});
  return Object.keys(E).map(function(k){E[k].stores=Object.keys(E[k].st).sort();return E[k]}).sort(function(a,b){return a.cl.localeCompare(b.cl,"zh-Hant")||(a.hq-b.hq)||a.br.localeCompare(b.br,"zh-Hant")});
}
function entOf(bid){return ents().filter(function(e){return e.id===bid})[0]||null}
function scName(p){if(p.t==="all")return "全部品牌";if(p.t==="client")return p.cl+"（合併）";var e=entOf(p.bid);return e?(e.br+(p.t==="store"?"・"+p.st:"")):"（找不到這個品牌）"}
function curP(){return scParse(S.sc)}
var $=function(id){return document.getElementById(id)};
var NS="http://www.w3.org/2000/svg";
function el(t,a,txt){var e=document.createElementNS(NS,t);for(var k in a)e.setAttribute(k,a[k]);if(txt!=null)e.textContent=txt;return e}
function h(t,cls,txt){var e=document.createElement(t);if(cls)e.className=cls;if(txt!=null)e.textContent=txt;return e}
function wan(n,d){var v=n/10000;return (d==null?1:d)===0?Math.round(v)+" 萬":v.toFixed(d==null?1:d)+" 萬"}
function swan(n){return (n>=0?"+":"−")+(Math.abs(n)/10000).toFixed(1)+" 萬"}
function full(n){return Math.round(n).toLocaleString("en-US")}
function pct(x){return isFinite(x)?(x<0?"−":"")+Math.abs(x*100).toFixed(1)+"%":"—"}
function mlabel(m){return +m.slice(5)+" 月"}

/* ---------- data model ---------- */
function build(rows,adj){
  var M={},months=[],A={};
  rows.forEach(function(r){
    if(!M[r.m]){M[r.m]={};months.push(r.m)}
    var c=r.c;
    if(r.s==="營業收入"&&REV.indexOf(c)<0)c="其他收入";
    if(r.s==="營業成本")c="食材成本";
    if(r.s==="營業費用"&&COST.indexOf(c)<0)c="一般營運費用";
    if(adj&&r.y)return;
    M[r.m][c]=(M[r.m][c]||0)+r.a;
    var ac=A[c]||(A[c]={}),an=ac[r.n]||(ac[r.n]={});an[r.m]=(an[r.m]||0)+r.a;
  });
  months.sort();
  if(adj){
    var ann={};rows.forEach(function(r){if(r.y){var c=COST.indexOf(r.c)<0?"一般營運費用":r.c;ann[c]=(ann[c]||0)+r.a}});
    var tax=0,revAll=0;
    months.forEach(function(m){tax+=M[m]["營業稅"]||0;revAll+=rev(M[m])});
    months.forEach(function(m){
      for(var c in ann)M[m][c]=(M[m][c]||0)+ann[c]/12;
      M[m]["營業稅"]=revAll?tax*rev(M[m])/revAll:0;
    });
  }
  return {M:M,months:months,A:A};
}
function rev(o){var t=o["其他收入"]||0;REV.forEach(function(c){t+=o[c]||0});return t}
function avg(D){var o={},n=D.months.length;D.months.forEach(function(m){for(var c in D.M[m])o[c]=(o[c]||0)+D.M[m][c]/n});return o}
function met(o){
  var g=function(c){return o[c]||0};
  var R=rev(o),food=g("食材成本")+g("包材耗材"),labor=g("人事費用"),rent=g("租金"),util=g("水電燃料");
  var plat=0,deliv=0;for(var kk in o){if(isPlat(kk))plat+=o[kk];else if(isDeliv(kk))deliv+=o[kk]}
  var vu=CFG.vu/100;
  var othV=g("金流手續費")+g("營業稅")+util*vu;
  var othF=util*(1-vu)+g("修繕與清潔")+g("一般營運費用")+g("行銷費用")+g("折舊攤提");
  var V=food+plat+othV,F=labor+rent+othF,net=R-V-F;
  var cm=R?1-V/R:0;
  return {R:R,food:food,labor:labor,rent:rent,util:util,plat:plat,deliv:deliv,othV:othV,othF:othF,V:V,F:F,net:net,cm:cm,be:cm>0?F/cm:NaN};
}
function cur(D){return S.month==="ALL"?avg(D):D.M[S.month]}
function periodName(D){return S.month==="ALL"?D.months.length+" 個月月平均":mlabel(S.month)}

/* ---------- tooltip ---------- */
function tipFor(box){
  var t=box.querySelector(".tip");if(!t){t=h("div","tip");t.hidden=true;box.appendChild(t)}
  return {show:function(ev,lines){
      t.textContent="";lines.forEach(function(l,i){if(i)t.appendChild(document.createElement("br"));t.appendChild(document.createTextNode(l))});
      t.hidden=false;var b=box.getBoundingClientRect();var x=ev.clientX-b.left+12,y=ev.clientY-b.top-10;
      if(x+t.offsetWidth>b.width)x=Math.max(0,ev.clientX-b.left-t.offsetWidth-12);
      t.style.left=x+"px";t.style.top=Math.max(0,y-t.offsetHeight)+"px"},
    hide:function(){t.hidden=true}};
}
function hover(node,tip,lines){
  node.addEventListener("pointermove",function(e){tip.show(e,lines)});
  node.addEventListener("pointerleave",tip.hide);
}
function svgIn(box,W,H){var old=box.querySelector("svg");if(old)old.remove();var s=el("svg",{viewBox:"0 0 "+W+" "+H,width:W,height:H,role:"img"});box.insertBefore(s,box.firstChild);return s}
function niceMax(v){var steps=[5,10,15,20,25,30,40,50,75,100,150,200,250,500,1000];var w=v/10000;for(var i=0;i<steps.length;i++){if(steps[i]*4>=w)return steps[i]*4*10000}return Math.ceil(w/1000)*1000*10000}
function topRound(x,y,w,hh,r){r=Math.min(r,w/2,hh);return "M"+x+","+(y+hh)+"V"+(y+r)+"Q"+x+","+y+" "+(x+r)+","+y+"H"+(x+w-r)+"Q"+(x+w)+","+y+" "+(x+w)+","+(y+r)+"V"+(y+hh)+"Z"}
function botRound(x,y,w,hh,r){r=Math.min(r,w/2,hh);return "M"+x+","+y+"H"+(x+w)+"V"+(y+hh-r)+"Q"+(x+w)+","+(y+hh)+" "+(x+w-r)+","+(y+hh)+"H"+(x+r)+"Q"+x+","+(y+hh)+" "+x+","+(y+hh-r)+"Z"}

/* ---------- KPIs & lights ---------- */
function renderKpis(D){
  var o=cur(D),m=met(o),box=$("kpis");box.textContent="";
  var gap=m.be-m.R;
  var items=[
    ["hero","營業淨利（"+periodName(D)+"）",(m.net<0?"−":"")+wan(Math.abs(m.net)),"淨利率 "+pct(m.net/m.R)],
    ["","營業收入",wan(m.R),"外送占 "+pct(m.deliv/m.R)],
    ["","損益兩平月營業額",isFinite(m.be)?wan(m.be):"—","約每天 "+(isFinite(m.be)?wan(m.be/30):"—")],
    ["",gap>0?"距損平還差":"超過損平",isFinite(gap)?wan(Math.abs(gap)):"—",isFinite(gap)?(gap>0?"營收需成長 "+pct(gap/m.R):"安全邊際 "+pct(-gap/m.R)):""]
  ];
  items.forEach(function(it){var c=h("div","card kpi "+it[0]);c.appendChild(h("div","k",it[1]));c.appendChild(h("div","v",it[2]));c.appendChild(h("div","d",it[3]));box.appendChild(c)});
}
function lightOf(v,b,rev){ if(rev)return v>=b[0]?"g":v>=b[1]?"y":"r"; return v<=b[0]?"g":v<=b[1]?"y":"r"}
var ICON={g:'<svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="5" fill="var(--good)"/></svg>',
          y:'<svg width="10" height="10" viewBox="0 0 10 10"><path d="M5 0L10 10H0Z" fill="var(--warn)"/></svg>',
          r:'<svg width="10" height="10" viewBox="0 0 10 10"><rect width="10" height="10" fill="var(--crit)"/></svg>'};
var LNAME={g:"綠燈",y:"黃燈",r:"紅燈"};
function lightRows(m){return [["食材＋包材",m.food/m.R,bmOf("food")],["人事費用",m.labor/m.R,bmOf("labor")],["主要成本",(m.food+m.labor)/m.R,bmOf("prime")],["租金",m.rent/m.R,bmOf("rent")],["外送有效抽成",m.deliv?m.plat/m.deliv:NaN,bmOf("plat")],["營業淨利率",m.net/m.R,bmOf("net"),true]].map(function(r){r.L=isFinite(r[1])?lightOf(r[1],r[2],r[3]):null;return r})}
function icon(L,title){var sp=h("span");sp.innerHTML=ICON[L];if(title)sp.title=title;return sp}
function renderLights(D){
  var m=met(cur(D)),box=$("lights");box.textContent="";
  var rows=lightRows(m);
  rows.forEach(function(r){
    var c=h("div","light");c.appendChild(h("div","k",r[0]));c.appendChild(h("div","v",pct(r[1])));c.appendChild(h("div","r","基準 "+r[2][2]));
    if(isFinite(r[1])){var L=lightOf(r[1],r[2],r[3]);var p=h("div","pill "+L);p.innerHTML=ICON[L];p.appendChild(document.createTextNode(LNAME[L]));c.appendChild(p)}
    box.appendChild(c)});
}

/* ---------- charts ---------- */
function colGeom(D,W,padL,padR){var n=D.months.length,band=(W-padL-padR)/n,bw=Math.min(24,band*.6);return {band:band,bw:bw,x:function(i){return padL+band*i+band/2}}}
function renderRev(D){
  var box=$("cRev"),W=box.clientWidth||520,H=250,pL=44,pR=8,pT=18,pB=26,tip=tipFor(box);
  var svg=svgIn(box,W,H),g=colGeom(D,W,pL,pR),cats=REV.slice();
  if(D.months.some(function(m){return D.M[m]["其他收入"]}))cats.push("其他收入");
  var lg=$("lgRev");lg.textContent="";cats.forEach(function(c){var s=h("span");var i=h("i");i.style.background=REVCOL[c];s.appendChild(i);s.appendChild(document.createTextNode(REVLBL[c]));lg.appendChild(s)});
  var max=niceMax(Math.max.apply(null,D.months.map(function(m){return rev(D.M[m])})));
  var y=function(v){return pT+(H-pT-pB)*(1-v/max)};
  for(var t=0;t<=4;t++){var v=max*t/4;svg.appendChild(el("line",{x1:pL,x2:W-pR,y1:y(v),y2:y(v),stroke:t?"var(--grid)":"var(--axis)","stroke-width":1}));svg.appendChild(el("text",{x:pL-6,y:y(v)+4,"text-anchor":"end","font-size":11,fill:"var(--muted)"},Math.round(v/10000)+"萬"))}
  D.months.forEach(function(m,i){
    var o=D.M[m],acc=0,cx=g.x(i),sel=S.month===m,grp=el("g",{style:"cursor:pointer",opacity:S.month==="ALL"||sel?1:.45});
    var present=cats.filter(function(c){return (o[c]||0)>0});
    present.forEach(function(c,k){
      var v=o[c],y1=y(acc+v),y0=y(acc),hh=Math.max(0,y0-y1-(k<present.length-1?2:0)),top=k===present.length-1;
      var yy=y0-hh; if(k===present.length-1)yy=y1,hh=y0-y1;
      var node=top?el("path",{d:topRound(cx-g.bw/2,yy,g.bw,hh,4),fill:REVCOL[c]}):el("rect",{x:cx-g.bw/2,y:yy,width:g.bw,height:hh,fill:REVCOL[c]});
      grp.appendChild(node);acc+=v});
    var hit=el("rect",{x:cx-g.band/2,y:pT,width:g.band,height:H-pT-pB,fill:"transparent"});grp.appendChild(hit);
    var lines=[mlabel(m)+"　合計 "+full(rev(o))];cats.forEach(function(c){if(o[c])lines.push(REVLBL[c]+"　"+full(o[c])+"（"+pct(o[c]/rev(o))+"）")});
    hover(grp,tip,lines);grp.addEventListener("click",function(){setMonth(m)});
    svg.appendChild(grp);
    svg.appendChild(el("text",{x:cx,y:H-8,"text-anchor":"middle","font-size":12,fill:sel?"var(--ink)":"var(--ink2)","font-weight":sel?700:400},mlabel(m)));
    if(sel||(S.month==="ALL"&&(i===0||i===D.months.length-1)))svg.appendChild(el("text",{x:cx,y:y(rev(o))-5,"text-anchor":"middle","font-size":11,fill:"var(--ink)","font-weight":600},wan(rev(o))));
  });
  var a=rev(D.M[D.months[0]]),b=rev(D.M[D.months[D.months.length-1]]);
  $("tRev").textContent="營業收入從 "+mlabel(D.months[0])+"的 "+wan(a)+(b<a?"降到 ":"變為 ")+mlabel(D.months[D.months.length-1])+"的 "+wan(b)+"（"+(b>=a?"+":"−")+pct(Math.abs(b/a-1))+"）";
}
function renderNet(D){
  var box=$("cNet"),W=box.clientWidth||520,H=250,pL=44,pR=8,pT=18,pB=26,tip=tipFor(box);
  var svg=svgIn(box,W,H),g=colGeom(D,W,pL,pR);
  var vals=D.months.map(function(m){return met(D.M[m]).net});
  var lo=Math.min(0,Math.min.apply(null,vals)),hi=Math.max(0,Math.max.apply(null,vals));
  var step=[1,2,2.5,5,10,20,25,50,100].map(function(s){return s*10000}).filter(function(s){return (hi-lo)/s<=5})[0]||1e6;
  lo=Math.floor(lo/step)*step;hi=Math.ceil(hi/step)*step;if(hi===lo)hi=lo+step;
  var y=function(v){return pT+(H-pT-pB)*(hi-v)/(hi-lo)};
  for(var v=lo;v<=hi+1;v+=step){svg.appendChild(el("line",{x1:pL,x2:W-pR,y1:y(v),y2:y(v),stroke:v===0?"var(--axis)":"var(--grid)","stroke-width":1}));svg.appendChild(el("text",{x:pL-6,y:y(v)+4,"text-anchor":"end","font-size":11,fill:"var(--muted)"},(v<0?"−":"")+Math.abs(v/10000)+"萬"))}
  var worst=0;vals.forEach(function(v,i){if(v<vals[worst])worst=i});
  D.months.forEach(function(m,i){
    var v=vals[i],cx=g.x(i),sel=S.month===m,R=met(D.M[m]).R;
    var grp=el("g",{style:"cursor:pointer",opacity:S.month==="ALL"||sel?1:.45});
    var y0=y(0),y1=y(v),hh=Math.abs(y1-y0);
    grp.appendChild(el("path",{d:v>=0?topRound(cx-g.bw/2,y1,g.bw,hh,4):botRound(cx-g.bw/2,y0,g.bw,hh,4),fill:v>=0?"var(--good)":"var(--crit)"}));
    grp.appendChild(el("rect",{x:cx-g.band/2,y:pT,width:g.band,height:H-pT-pB,fill:"transparent"}));
    hover(grp,tip,[mlabel(m),"營業淨利　"+(v<0?"−":"")+full(Math.abs(v)),"淨利率　"+pct(v/R)]);
    grp.addEventListener("click",function(){setMonth(m)});svg.appendChild(grp);
    svg.appendChild(el("text",{x:cx,y:H-8,"text-anchor":"middle","font-size":12,fill:sel?"var(--ink)":"var(--ink2)","font-weight":sel?700:400},mlabel(m)));
    if(sel||(S.month==="ALL"&&i===worst))svg.appendChild(el("text",{x:cx,y:v>=0?y1-5:y1+14,"text-anchor":"middle","font-size":11,fill:"var(--ink)","font-weight":600},swan(v)));
  });
  var loss=vals.filter(function(v){return v<0}).length,sum=vals.reduce(function(a,b){return a+b},0);
  $("tNet").textContent=loss===vals.length?vals.length+" 個月每個月都虧，累計虧 "+wan(Math.abs(sum)):vals.length+" 個月中 "+loss+" 個月虧損，累計"+(sum<0?"虧 ":"賺 ")+wan(Math.abs(sum));
}
function renderWf(D){
  var box=$("cWf"),tip=tipFor(box),n=D.months.length;
  if(n<2){$("tWf").textContent="至少要兩個月的資料才能拆解差異";$("sWf").textContent="";var o=box.querySelector("svg");if(o)o.remove();return}
  var bi=S.month==="ALL"?n-1:D.months.indexOf(S.month),ai=S.month==="ALL"?0:bi-1;
  if(ai<0){ai=0;bi=1}
  var A=met(D.M[D.months[ai]]),B=met(D.M[D.months[bi]]),na=mlabel(D.months[ai]),nb=mlabel(D.months[bi]);
  var steps=[
    ["營業收入變動",(B.R-A.R)*A.cm],
    ["食材包材率變動",-(B.food/B.R-A.food/A.R)*B.R],
    ["外送平台費率變動",-(B.plat/B.R-A.plat/A.R)*B.R],
    ["稅、金流、變動水電",-(B.othV/B.R-A.othV/A.R)*B.R],
    ["人事費用",-(B.labor-A.labor)],
    ["租金",-(B.rent-A.rent)],
    ["其他固定費用",-(B.othF-A.othF)]];
  var rows=[[na+" 淨利",A.net,"start"]].concat(steps.map(function(s){return [s[0],s[1],"step"]})).concat([[nb+" 淨利",B.net,"end"]]);
  var W=box.clientWidth||900,rh=30,pT=6,H=pT+rows.length*rh+6,labW=Math.min(150,W*.36),valW=64,x0=labW+8,x1=W-valW-8;
  var cum=A.net,lo=Math.min(0,A.net,B.net),hi=Math.max(0,A.net,B.net);
  steps.forEach(function(s){cum+=s[1];lo=Math.min(lo,cum);hi=Math.max(hi,cum)});
  var pad=(hi-lo)*.04||1;lo-=pad;hi+=pad;
  var X=function(v){return x0+(x1-x0)*(v-lo)/(hi-lo)};
  var svg=svgIn(box,W,H);
  svg.appendChild(el("line",{x1:X(0),x2:X(0),y1:pT,y2:H-6,stroke:"var(--axis)","stroke-width":1}));
  cum=0;
  rows.forEach(function(r,i){
    var yy=pT+i*rh,bh=16,by=yy+(rh-bh)/2,a,b,fill;
    if(r[2]==="step"){a=cum;b=cum+r[1];cum=b;fill=r[1]>=0?"var(--good)":"var(--crit)"}
    else{a=0;b=r[1];cum=r[1];fill="var(--neutral)"}
    var xa=Math.min(X(a),X(b)),w=Math.max(2,Math.abs(X(b)-X(a)));
    var grp=el("g",{});
    grp.appendChild(el("rect",{x:0,y:yy,width:W,height:rh,fill:"transparent"}));
    grp.appendChild(el("text",{x:labW,y:yy+rh/2+4,"text-anchor":"end","font-size":12,fill:r[2]==="step"?"var(--ink2)":"var(--ink)","font-weight":r[2]==="step"?400:700},r[0]));
    grp.appendChild(el("rect",{x:xa,y:by,width:w,height:bh,rx:3,fill:fill}));
    grp.appendChild(el("text",{x:W,y:yy+rh/2+4,"text-anchor":"end","font-size":12,fill:"var(--ink)","font-weight":r[2]==="step"?500:700,"font-variant-numeric":"tabular-nums"},r[2]==="step"?swan(r[1]):(r[1]<0?"−":"")+wan(Math.abs(r[1]))));
    if(i<rows.length-1)svg.appendChild(el("line",{x1:X(cum),x2:X(cum),y1:by+bh,y2:by+rh,stroke:"var(--axis)","stroke-width":1}));
    hover(grp,tip,[r[0],(r[2]==="step"?"對淨利的影響　":"營業淨利　")+(r[1]<0?"−":r[2]==="step"?"+":"")+full(Math.abs(r[1]))+" 元"]);
    svg.appendChild(grp);
  });
  var d=B.net-A.net,big=steps.slice().sort(function(a,b){return d<0?a[1]-b[1]:b[1]-a[1]})[0];
  var chk=A.net+steps.reduce(function(s,x){return s+x[1]},0)-B.net;
  $("tWf").textContent=nb+"比 "+na+" "+(d<0?"少賺 ":"多賺 ")+wan(Math.abs(d))+"，最大因素是「"+big[0]+"」（"+swan(big[1])+"）";
  $("sWf").textContent="把兩個月的淨利差距拆成七段：綠色讓淨利變好，紅色讓淨利變差。各段加總與實際差距的誤差 "+Math.abs(Math.round(chk))+" 元。"+(S.month==="ALL"?"目前比較第一個月與最後一個月；選單一月份會改成與前一個月比較。":"");
}
function renderBe(D){
  var box=$("cBe"),m=met(cur(D)),W=box.clientWidth||520,H=260,pL=44,pR=12,pT=16,pB=30,tip=tipFor(box);
  var svg=svgIn(box,W,H),ok=isFinite(m.be),max=niceMax(Math.max(m.R,ok?m.be:0)*1.12),v=m.R?m.V/m.R:0;
  var X=function(x){return pL+(W-pL-pR)*x/max},Y=function(y){return pT+(H-pT-pB)*(1-y/max)};
  for(var t=0;t<=4;t++){var q=max*t/4;svg.appendChild(el("line",{x1:pL,x2:W-pR,y1:Y(q),y2:Y(q),stroke:t?"var(--grid)":"var(--axis)","stroke-width":1}));svg.appendChild(el("text",{x:pL-6,y:Y(q)+4,"text-anchor":"end","font-size":11,fill:"var(--muted)"},Math.round(q/10000)+"萬"));svg.appendChild(el("text",{x:X(q),y:H-10,"text-anchor":t===0?"start":t===4?"end":"middle","font-size":11,fill:"var(--muted)"},Math.round(q/10000)+"萬"))}
  svg.appendChild(el("line",{x1:X(0),y1:Y(0),x2:X(max),y2:Y(max),stroke:"var(--s1)","stroke-width":2,"stroke-linecap":"round"}));
  svg.appendChild(el("line",{x1:X(0),y1:Y(m.F),x2:X(max),y2:Y(Math.min(max,m.F+v*max)),stroke:"var(--s2)","stroke-width":2,"stroke-linecap":"round"}));
  svg.appendChild(el("line",{x1:X(m.R),x2:X(m.R),y1:Y(Math.max(m.R,m.F+v*m.R)),y2:Y(0),stroke:"var(--ink2)","stroke-width":1}));
  svg.appendChild(el("circle",{cx:X(m.R),cy:Y(m.R),r:5,fill:"var(--s1)",stroke:"var(--surface)","stroke-width":2}));
  svg.appendChild(el("circle",{cx:X(m.R),cy:Y(m.F+v*m.R),r:5,fill:"var(--s2)",stroke:"var(--surface)","stroke-width":2}));
  var left=X(m.R)>W*.55;
  svg.appendChild(el("text",{x:X(m.R)+(left?-8:8),y:Y(0)-8,"text-anchor":left?"end":"start","font-size":12,fill:"var(--ink)","font-weight":600},"目前 "+wan(m.R)));
  if(ok&&m.be<=max){svg.appendChild(el("circle",{cx:X(m.be),cy:Y(m.be),r:6,fill:"var(--ink)",stroke:"var(--surface)","stroke-width":2}));
    svg.appendChild(el("text",{x:X(m.be)-10,y:Y(m.be)-10,"text-anchor":"end","font-size":12,fill:"var(--ink)","font-weight":700},"損平 "+wan(m.be)))}
  var hit=el("rect",{x:pL,y:pT,width:W-pL-pR,height:H-pT-pB,fill:"transparent"});
  hit.addEventListener("pointermove",function(e){var b=box.getBoundingClientRect();var x=Math.max(0,Math.min(max,(e.clientX-b.left-pL)/(W-pL-pR)*max));tip.show(e,["若月營業額 "+wan(x),"總成本　"+wan(m.F+v*x),"淨利　"+swan(x-m.F-v*x)])});
  hit.addEventListener("pointerleave",tip.hide);svg.appendChild(hit);
  var gap=m.be-m.R;
  $("tBe").textContent=!ok?"變動成本已超過營收，賣再多也無法打平":gap>0?"要賣到 "+wan(m.be)+"才打平，"+periodName(D)+"只賣 "+wan(m.R):periodName(D)+"營收 "+wan(m.R)+"，已超過損平點 "+wan(m.be);
}
function renderCh(D){
  var box=$("cCh"),o=cur(D),m=met(o),tip=tipFor(box),fr=m.R?m.food/m.R:0;
  var rows=REV.filter(function(c){return (o[c]||0)>0}).map(function(c){var r=o[c],f=PLAT[c]?(o[PLAT[c]]||0):0;return {c:c,r:r,f:f,keep:(r-f-r*fr)/r*100}});
  var W=box.clientWidth||520,rh=34,H=rows.length*rh+8,labW=78,valW=52,x0=labW+8,x1=W-valW-6;
  var lo=Math.min(0,Math.min.apply(null,rows.map(function(r){return r.keep}))),hi=Math.max(60,Math.max.apply(null,rows.map(function(r){return r.keep})));
  var X=function(v){return x0+(x1-x0)*(v-lo)/(hi-lo)};
  var svg=svgIn(box,W,H);
  svg.appendChild(el("line",{x1:X(0),x2:X(0),y1:2,y2:H-4,stroke:"var(--axis)","stroke-width":1}));
  rows.forEach(function(r,i){
    var yy=4+i*rh,bh=18,by=yy+(rh-bh)/2,g=el("g",{});
    g.appendChild(el("rect",{x:0,y:yy,width:W,height:rh,fill:"transparent"}));
    g.appendChild(el("text",{x:labW,y:yy+rh/2+4,"text-anchor":"end","font-size":12,fill:"var(--ink2)"},REVLBL[r.c]));
    var xa=Math.min(X(0),X(r.keep)),w=Math.max(2,Math.abs(X(r.keep)-X(0)));
    g.appendChild(el("rect",{x:xa,y:by,width:w,height:bh,rx:3,fill:REVCOL[r.c]}));
    g.appendChild(el("text",{x:Math.max(X(r.keep),X(0))+6,y:yy+rh/2+4,"font-size":12,fill:"var(--ink)","font-weight":600},r.keep.toFixed(0)+" 元"));
    hover(g,tip,[REVLBL[r.c],"營收　"+full(r.r),"平台費用　"+full(r.f),"食材包材（估）　"+full(r.r*fr),"留下　"+full(r.r-r.f-r.r*fr)]);
    svg.appendChild(g)});
  var best=rows.slice().sort(function(a,b){return b.keep-a.keep})[0],worst=rows.slice().sort(function(a,b){return a.keep-b.keep})[0];
  $("tCh").textContent=rows.length>1?"每賣 100 元，"+REVLBL[best.c]+"留下 "+best.keep.toFixed(0)+" 元，"+REVLBL[worst.c]+"只留下 "+worst.keep.toFixed(0)+" 元":"通路留存";
  var t=$("tblCh");t.textContent="";var hd=t.insertRow();["通路","營收","占比","平台費用","有效抽成"].forEach(function(x){var th=document.createElement("th");th.textContent=x;hd.appendChild(th)});
  rows.forEach(function(r){var tr=t.insertRow();[REVLBL[r.c],full(r.r),pct(r.r/m.R),r.f?full(r.f):"—",r.f?pct(r.f/r.r):"—"].forEach(function(x){tr.insertCell().textContent=x})});
}
var TBLOPEN={};
function renderTable(D){
  var t=$("tbl");t.textContent="";var n=D.months.length,AV=avg(D),RV=rev(AV);
  var hd=document.createElement("thead"),hr=document.createElement("tr");hd.appendChild(hr);t.appendChild(hd);
  var th0=function(txt,cls,sub){var th=document.createElement("th");th.textContent=txt;if(cls)th.className=cls;if(sub)th.appendChild(h("small",null,sub));hr.appendChild(th)};
  th0("科目");th0("月平均","avg","占營收");D.months.forEach(function(m){th0(mlabel(m),m===S.month?"sel":"","占營收")});th0("合計");
  var tb=document.createElement("tbody");t.appendChild(tb);
  /* amount cell with its share of that month's revenue underneath */
  function cell(tr,v,R,cls){var td=tr.insertCell();td.textContent=full(v);if(R)td.appendChild(h("small",null,pct(v/R)));if(cls)td.className=cls;return td}
  function row(name,fn,o){o=o||{};var tr=document.createElement("tr");if(o.tot)tr.className="tot";else if(o.cls)tr.className=o.cls;
    var c0=tr.insertCell();c0.textContent=name;var sum=0;
    if(o.isPct){var a=fn(AV);tr.insertCell().textContent=pct(a);tr.cells[1].className="avg";D.months.forEach(function(m){var td=tr.insertCell();td.textContent=pct(fn(D.M[m]));if(m===S.month)td.className="sel"});tr.insertCell().textContent=pct(a)}
    else{D.months.forEach(function(m){sum+=fn(D.M[m])});cell(tr,sum/n,o.noPct?0:RV,"avg");
      D.months.forEach(function(m){cell(tr,fn(D.M[m]),o.noPct?0:rev(D.M[m]),m===S.month?"sel":"")});cell(tr,sum,0)}
    tb.appendChild(tr);return tr}
  function catRow(c,label){
    var acc=D.A&&!S.adj?D.A[c]:null,names=acc?Object.keys(acc):[];
    var tr=row(label,function(o){return o[c]||0},{cls:names.length>1||(names.length===1&&names[0]!==c)?"cat"+(TBLOPEN[c]?" open":""):""});
    if(!/cat/.test(tr.className))return;
    tr.cells[0].title="點一下看原始科目";
    tr.cells[0].addEventListener("click",function(){TBLOPEN[c]=!TBLOPEN[c];renderTable(D)});
    if(!TBLOPEN[c])return;
    names.sort(function(a,b){var sa=0,sb=0;D.months.forEach(function(m){sa+=acc[a][m]||0;sb+=acc[b][m]||0});return sb-sa}).forEach(function(nm){
      row(nm,function(o){var m=D.months.filter(function(x){return D.M[x]===o})[0];return m?(acc[nm][m]||0):D.months.reduce(function(s,x){return s+(acc[nm][x]||0)},0)/n},{cls:"acc"})});
  }
  var cats=REV.slice();if(D.months.some(function(m){return D.M[m]["其他收入"]}))cats.push("其他收入");
  cats.forEach(function(c){catRow(c,REVLBL[c])});
  row("營業收入合計",rev,{tot:true});
  COST.forEach(function(c){if(D.months.some(function(m){return D.M[m][c]}))catRow(c,c)});
  row("成本費用合計",function(o){var s=0;COST.forEach(function(c){s+=o[c]||0});return s},{tot:true});
  row("營業淨利",function(o){return met(o).net},{tot:true});
  row("食材＋包材率",function(o){var m=met(o);return m.food/m.R},{isPct:true});
  row("人事費用率",function(o){var m=met(o);return m.labor/m.R},{isPct:true});
  row("主要成本率",function(o){var m=met(o);return (m.food+m.labor)/m.R},{isPct:true});
  row("租金占比",function(o){var m=met(o);return m.rent/m.R},{isPct:true});
  row("水電燃料占比",function(o){var m=met(o);return m.util/m.R},{isPct:true});
  if(D.months.some(function(m){return met(D.M[m]).deliv})){
    row("外送占營收",function(o){var m=met(o);return m.deliv/m.R},{isPct:true});
    row("外送有效抽成",function(o){var m=met(o);return m.deliv?m.plat/m.deliv:NaN},{isPct:true});
  }
  row("淨利率",function(o){var m=met(o);return m.net/m.R},{isPct:true});

  $("sTbl").textContent=(S.adj?"還原後口徑":"帳面口徑")+"。每個金額下面的小字是占當月營業收入的百分比；「月平均」是 "+n+" 個月平均，比率列的「月平均」與「合計」以全期間計算。"+(S.adj?"":"有 ▸ 的科目點一下可以展開原始科目。");
}
