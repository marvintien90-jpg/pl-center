// 把 src/ 裡的版面、樣式、計算核心與網站程式合成一個 index.html（GitHub Pages 直接提供這個檔）
const fs=require("fs"),path=require("path"),d=__dirname;
const rd=f=>fs.readFileSync(path.join(d,f),"utf8");
let html=rd("page.html");
const put=(mark,body)=>{if(html.split(mark).length!==2)throw new Error("marker not found exactly once: "+mark);html=html.split(mark).join(body)};
put("/*BASE_CSS*/",rd("base.css"));
put("/*CORE_JS*/",rd("core.js"));
put("/*APP_JS*/",rd("app.js"));
const js=html.slice(html.lastIndexOf("<script>")+8,html.lastIndexOf("</script>"));
new Function(js);
fs.writeFileSync(path.join(d,"..","index.html"),html);
console.log("syntax ok, index.html "+html.length+" chars");
