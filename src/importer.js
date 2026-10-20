/* ================= importer: read a P&L file (PDF / Excel / CSV), sort every account into the standard categories, check the totals ================= */
var IMP_SECS={"營業收入":1,"營業成本":1,"營業費用":1};
var IMP_PLATS=[[/uber/i,"UBER"],[/熊貓|foodpanda|panda/i,"熊貓"],[/gomaji|夠麻吉/i,"夠麻吉"],[/lalamove|啦啦/i,"Lalamove"]];
var IMP_COSTCATS=["食材成本","包材耗材","人事費用","租金","水電燃料","金流手續費","行銷費用","修繕與清潔","一般營運費用","折舊攤提","營業稅","內部交易"];
/* keyword rules for expense accounts, checked in order (first hit wins) */
var IMP_RULES=[
  [/營業稅|營業税/,"營業稅"],
  [/折舊|攤提|攤銷/,"折舊攤提"],
  [/免洗|餐具|包材|包裝|耗材|紙盒|紙袋|塑膠袋|吸管/,"包材耗材"],
  [/徵才|求才|人力銀行/,"一般營運費用"],
  [/薪|津貼|勞健保|勞保|健保|勞退|退休金|員工福利|福利金|加班|獎金|伙食|工讀|鐘點|二代健保|職工/,"人事費用"],
  [/租金|房租|租賃|管理費/,"租金"],
  [/水費|電費|水電|瓦斯|燃料|天然氣|燃氣/,"水電燃料"],
  [/手續費|刷卡|金流|支付/,"金流手續費"],
  [/廣告|行銷|宣傳|促銷|會員|網紅|Ocard|印刷|設計費/i,"行銷費用"],
  [/修繕|維修|維護|消毒|清潔|洗滌|除蟲|保養/,"修繕與清潔"],
  [/文具|電腦|通訊|電話|網路|會計|記帳|保險|公播|拜拜|供品|郵電|郵資|運費|規費|稅捐|雜|其他|交際|書報|訓練|旅費|差旅|車資|交通|捐贈|軟體|系統|服務費|顧問|律師|罰款|佣金/,"一般營運費用"]
];
var IMP_REASONS={mismatch_R:"營業收入加總和原表的總計對不上",mismatch_C:"營業成本加總和原表對不上",mismatch_O:"營業費用加總和原表對不上",mismatch_N:"淨利和原表對不上",
  no_totals:"檔案裡沒有總計可以核對",unknown_accounts:"有系統沒看過的科目，需要確認分類",month_exists:"這個月份已經有資料，要確認是否取代",
  name_mismatch:"檔案上的公司名稱和這家店不一樣",new_store:"這是新的分店名稱"};

function impNum(t){
  if(typeof t==="number")return isFinite(t)?t:null;
  var s=String(t==null?"":t).trim();if(!s||/%$/.test(s))return null;
  var neg=/^\(.*\)$/.test(s)||/^[-−－]/.test(s);s=s.replace(/^\(|\)$/g,"").replace(/^[-−－]/,"").replace(/[,，\s]/g,"");
  if(!/^\d+(\.\d+)?$/.test(s))return null;var v=parseFloat(s);return neg?-v:v;
}
function impPlat(n){for(var i=0;i<IMP_PLATS.length;i++)if(IMP_PLATS[i][0].test(n))return IMP_PLATS[i][1];return ""}
function impYM(y,m){y=+y;m=+m;if(y<200)y+=1911;if(y<2000||y>2100||m<1||m>12)return "";return y+"-"+(m<10?"0":"")+m}
/* month from text such as 2026/06/01至2026/06/30, 115年6月, 115-06, 2026-07 */
function impPeriod(t){
  t=String(t||"");var m,a,b;
  m=/(\d{3,4})[\/.\-年](\d{1,2})[\/.\-月](\d{1,2})日?\s*(?:至|~|～|-|－|到)\s*(\d{3,4})[\/.\-年](\d{1,2})[\/.\-月](\d{1,2})/.exec(t);
  if(m){a=impYM(m[1],m[2]);b=impYM(m[4],m[5]);return a&&a===b?a:(a&&b?"RANGE:"+a+"~"+b:"")}
  m=/(\d{3,4})\s*年\s*(\d{1,2})\s*月/.exec(t);if(m)return impYM(m[1],m[2]);
  m=/(?:^|[^\d])(\d{4}|1[01]\d)[\/\-.](\d{1,2})(?![\d\/\-.]*\d{2}[\/\-.]\d)/.exec(t);if(m)return impYM(m[1],m[2]);
  return "";
}
function impSecOf(label){
  if(/營業外/.test(label))return "skip";
  if(/收入|營收/.test(label))return "營業收入";
  if(/成本|進貨|進料/.test(label))return "營業成本";
  if(/費用|支出/.test(label))return "營業費用";
  return null;
}

/* lines: array of arrays of cells (strings or numbers). Returns everything the upload page needs. */
function impParse(lines,fileName){
  var out={items:[],stated:{},period:"",company:"",nonop:[],notes:[]},sec=null,T={},head=[];
  lines.forEach(function(cells,li){
    cells=cells.filter(function(c){return c!==null&&c!==undefined&&String(c).trim()!==""});
    if(!cells.length)return;
    var nums=[],labs=[];
    cells.forEach(function(c){var v=impNum(c);if(v===null)labs.push(String(c).trim());else nums.push(v)});
    var text=labs.join(" ");
    if(/^公司(名稱)?$/.test(labs[0]||"")&&labs[1])out.company=labs.slice(1).join("");
    if(li<25&&sec===null&&!nums.length)head.push(text);
    if(!out.period&&(li<25||/區間|期間|年月|月份/.test(text))){var pd=impPeriod(text.replace(/(列印|製表|印表)(日期)?[：:]?\s*[\d\/\-.]+/g,""));if(pd)out.period=pd}
    if(!labs.length)return;
    var first=labs[0];
    if(IMP_SECS[first]&&labs.length>1&&nums.length){sec=first;labs=labs.slice(1);text=labs.join(" ");first=labs[0]}
    var label=text.replace(/^[*＊\s]+/,"").replace(/[：:]\s*$/,"").trim();
    var isTot=/^[*＊]/.test(text)||/合計|總計|小計|毛利|淨利|淨損|本期損益|稅前/.test(label)||/[：:]/.test(text);
    if(isTot){
      if(!nums.length){var s0=impSecOf(label);if(s0)sec=s0;return}
      var v=nums[0];
      if(/本期損益|稅前|稅後/.test(label))T.NN=v;
      else if(/營業淨利|營業淨損|營業損益/.test(label))T.N=v;
      else if(/毛利/.test(label))T.GP=v;
      else if(/營業外/.test(label)){}
      else if(/(銷貨|營業)?收入/.test(label)&&!/成本|費用/.test(label))T.R=v;
      else if(/成本/.test(label))T.C=v;
      else if(/費用/.test(label))T.O=v;
      return;
    }
    if(!nums.length){var s1=impSecOf(label);if(s1&&label.length<=12)sec=s1;return}
    if(!sec)return;
    if(/^(期間|月份|年月|公司名稱|大類|科目|金額)/.test(label))return;
    var amt=nums[0];if(!amt)return;
    if(sec==="skip"){out.nonop.push({n:label,a:amt});return}
    out.items.push({s:sec,n:label.slice(0,80),a:Math.round(amt*100)/100});
  });
  /* company name: first heading line that is not a title */
  for(var i=0;i<head.length&&!out.company;i++){var x=head[i].replace(/\s+/g,"");if(x&&!/損益|頁|日期|區間|期間|部門|科目|QRLabel|^[\d\/\-.]+$|公司名稱|收入|成本|費用|大類|金額|說明/.test(x)&&x.length<=40&&/[一-鿿]/.test(x)){out.company=x;break}}
  if(!out.period&&fileName){var f=String(fileName).replace(/\.[^.]+$/,"");var m=/(\d{3,4})[\-_.年](\d{1,2})/.exec(f);if(m)out.period=impYM(m[1],m[2])}
  if(T.R!=null)out.stated.R=T.R;
  if(T.C!=null)out.stated.C=T.C;else if(T.R!=null&&T.GP!=null)out.stated.C=T.R-T.GP;
  if(T.N!=null)out.stated.N=T.N;else if(T.NN!=null&&!out.nonop.length)out.stated.N=T.NN;
  if(T.O!=null)out.stated.O=T.O;else if(T.GP!=null&&out.stated.N!=null)out.stated.O=T.GP-out.stated.N;
  if(out.nonop.length)out.notes.push("營業外收支（"+out.nonop.map(function(x){return x.n}).join("、")+"）不列入營業損益。");
  return out;
}

/* pick a standard category for one account. maps: {own:{name:{s,c}}, any:{name:{s,c}}} */
function impClassify(it,maps){
  var n=it.n,o=maps.own[n]||null,a=maps.any[n]||null;
  if(o&&o.s===it.s)return {c:o.c,k:"learned"};
  if(a&&a.s===it.s)return {c:a.c,k:"learned"};
  var pl=impPlat(n);
  if(it.s==="營業收入"){
    if(pl)return {c:pl+"外送",k:"rule"};
    var g=/^(.+?)[-－]\s*營業額/.exec(n);if(g)return {c:g[1]+"外送",k:"rule"};
    if(/利息|補助|加盟|權利金|租金收入|其他|雜項|獎勵|退稅/.test(n))return {c:"其他收入",k:"rule"};
    if(/銷貨|營業|門市|內用|外帶|餐飲|收入|營收/.test(n))return {c:"內用/外帶",k:"rule"};
    return {c:"內用/外帶",k:"guess"};
  }
  if(it.s==="營業成本"){
    if(/免洗|餐具|包材|包裝|耗材/.test(n))return {c:"包材耗材",k:"rule"};
    return {c:"食材成本",k:"rule"};
  }
  if(pl&&!/營業額/.test(n))return {c:pl+"平台費用",k:"rule"};
  var g2=/^(.+?)[-－]\s*(服務費|廣告費|促銷|上架費|退款|抽成)/.exec(n);if(g2)return {c:g2[1]+"平台費用",k:"rule"};
  for(var i=0;i<IMP_RULES.length;i++)if(IMP_RULES[i][0].test(n))return {c:IMP_RULES[i][1],k:"rule"};
  return {c:"一般營運費用",k:"guess"};
}
function impSums(items){var t={R:0,C:0,O:0};items.forEach(function(i){t[i.s==="營業收入"?"R":i.s==="營業成本"?"C":"O"]+=i.a});t.N=t.R-t.C-t.O;["R","C","O","N"].forEach(function(k){t[k]=Math.round(t[k]*100)/100});return t}
function impCheck(stated,sums){var r=[];["R","C","O","N"].forEach(function(k){if(stated[k]!=null&&Math.abs(stated[k]-sums[k])>0.5)r.push("mismatch_"+k)});if(!Object.keys(stated).length)r.push("no_totals");return r}

/* ---------- file readers ---------- */
async function impReadPdf(buf){
  var lib=window.pdfjsLib;if(!lib)throw new Error("PDF 讀取元件沒有載入成功，請重新整理頁面再試一次。");
  if(lib.GlobalWorkerOptions&&!lib.GlobalWorkerOptions.workerSrc)lib.GlobalWorkerOptions.workerSrc=PDF_WORKER;
  var doc=await lib.getDocument({data:buf}).promise,lines=[];
  for(var p=1;p<=doc.numPages;p++){
    var page=await doc.getPage(p),tc=await page.getTextContent(),rows=[];
    tc.items.forEach(function(it){if(!it.str||!it.str.trim())return;var y=it.transform[5],x=it.transform[4];
      var r=null;for(var i=0;i<rows.length;i++)if(Math.abs(rows[i].y-y)<=2.5){r=rows[i];break}
      if(!r){r={y:y,items:[]};rows.push(r)}r.items.push({x:x,w:it.width||0,s:it.str})});
    rows.sort(function(a,b){return b.y-a.y});
    rows.forEach(function(r){r.items.sort(function(a,b){return a.x-b.x});
      var cells=[],cur="",lastEnd=null;
      r.items.forEach(function(it){var gap=lastEnd==null?0:it.x-lastEnd;if(cur&&gap>3){cells.push(cur);cur=""}cur+=it.s;lastEnd=it.x+it.w});
      if(cur)cells.push(cur);
      var flat=[];cells.forEach(function(c){c.trim().split(/\s{2,}|\t/).forEach(function(part){
        /* split a trailing number off its label: "銷貨收入 407281.000" */
        var toks=part.trim().split(/\s+/),lab=[];toks.forEach(function(t){if(impNum(t)!==null){if(lab.length){flat.push(lab.join(" "));lab=[]}flat.push(t)}else lab.push(t)});if(lab.length)flat.push(lab.join(" "))})});
      lines.push(flat)});
  }
  return lines;
}
function impReadSheet(buf,isCsv){
  var X=window.XLSX;if(!X)throw new Error("Excel 讀取元件沒有載入成功，請重新整理頁面再試一次。");
  var wb=isCsv?X.read(new TextDecoder("utf-8").decode(buf),{type:"string"}):X.read(buf,{type:"array"});
  var ws=wb.Sheets[wb.SheetNames[0]];
  return X.utils.sheet_to_json(ws,{header:1,raw:true,defval:""}).map(function(r){return r.map(function(c){return typeof c==="string"?c.trim():c})});
}
async function impReadFile(file){
  var name=file.name||"",ext=(name.split(".").pop()||"").toLowerCase(),buf=await file.arrayBuffer();
  var lines;
  if(ext==="pdf")lines=await impReadPdf(new Uint8Array(buf));
  else if(ext==="xlsx"||ext==="xls"||ext==="csv")lines=impReadSheet(buf,ext==="csv");
  else throw new Error("只支援 PDF、Excel（.xlsx／.xls）與 CSV 檔。");
  var r=impParse(lines,name);
  if(!r.items.length)throw new Error(ext==="pdf"?"這份 PDF 讀不到任何科目與金額。如果是掃描或拍照的檔案，目前還讀不了，請改傳會計軟體直接匯出的 PDF 或 Excel。":"這個檔案讀不到任何科目與金額。請確認格式，或下載範本照著填。");
  return r;
}
function impTemplate(){
  var X=window.XLSX;if(!X)return;
  var A=[["期間","2026-07","← 請改成這份損益表的年月"],["公司名稱",""],[],["大類","科目","金額"],
    ["營業收入","銷貨收入",0],["營業收入","UBER-營業額",0],["營業收入","熊貓-營業額",0],
    ["營業成本","食材進貨",0],
    ["營業費用","薪資",0],["營業費用","勞健保費",0],["營業費用","租金支出",0],["營業費用","水電費",0],["營業費用","瓦斯費",0],
    ["營業費用","免洗餐具",0],["營業費用","UBER-服務費",0],["營業費用","熊貓-服務費",0],["營業費用","信用卡手續費",0],
    ["營業費用","廣告費",0],["營業費用","修繕費",0],["營業費用","清潔用品",0],["營業費用","營業稅",0],["營業費用","其他費用",0],
    [],["營業收入合計",""],["營業成本合計",""],["營業費用合計",""],["營業淨利",""],
    [],["說明：一個檔案放一個月份。科目名稱照會計帳上的寫法填就好，系統會自動分類；可以自己增減列。最下面的合計若有填，系統會拿來核對。"]];
  var ws=X.utils.aoa_to_sheet(A);ws["!cols"]=[{wch:14},{wch:22},{wch:14}];
  var wb=X.utils.book_new();X.utils.book_append_sheet(wb,ws,"損益表");X.writeFile(wb,"損益表上傳範本.xlsx");
}
