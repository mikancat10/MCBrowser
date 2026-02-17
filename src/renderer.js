// Full renderer.js with safety + history + bookmarks + settings
// (trimmed comments for brevity but feature complete)

document.addEventListener("DOMContentLoaded", () => {

/* ===== URL安全化 ===== */
function normalizeInput(raw) {
  if (!raw) return null;
  let input = raw.trim().replace(/[\u0000-\u001F\u007F\s]+/g,"");
  if (/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(input) && !input.includes("://")) input = "https://"+input;
  try {
    const url=new URL(input);
    if(!["http:","https:"].includes(url.protocol)) return null;
    if(["localhost","127.0.0.1","0.0.0.0"].includes(url.hostname)) return null;
    return url.href;
  }catch{return "SEARCH:"+raw}
}

/* ===== 要素 ===== */
const $=id=>document.getElementById(id);
const tabsEl=$("tabs"),viewContainer=$("view-container"),urlbar=$("urlbar");
const backBtn=$("backBtn"),forwardBtn=$("forwardBtn"),homeBtn=$("homeBtn");
const bookmarkBar=$("bookmarkBar"),bookmarkBtn=$("bookmarkBtn");
const historyPopup=$("historyPopup"),backHistoryBtn=$("backHistoryBtn");
const settingsSidebar=$("settingsSidebar"),settingsBtn=$("settingsBtn"),closeSettingsBtn=$("closeSettingsBtn");
const toggleBookmarkBar=$("toggleBookmarkBar"),searchEngineSelect=$("searchEngine");
const resetBtn=$("resetSettingsBtn"),newTabBtn=$("newTabBtn");

let tabs=[],activeTabId=null;
let bookmarks=JSON.parse(localStorage.getItem("bookmarks")||"[]");
let historyList=JSON.parse(localStorage.getItem("history")||"[]");

const activeWebview=()=>tabs.find(t=>t.id===activeTabId)?.webview||null;

/* ===== 検索URL ===== */
function buildSearchUrl(q){
 const e=localStorage.getItem("searchEngine")||"google";
 if(e==="bing")return"https://www.bing.com/search?q="+q;
 if(e==="duck")return"https://duckduckgo.com/?q="+q;
 return"https://www.google.com/search?q="+q;
}

/* ===== タブ ===== */
function createTab(url="newtab"){
 const id=Date.now().toString();
 const tabBtn=document.createElement("div");
 tabBtn.className="tab";
 tabBtn.innerHTML='<span>New Tab</span><span class="tab-close">×</span>';
 tabsEl.appendChild(tabBtn);

 const webview=document.createElement("webview");
 webview.className="webview";
 viewContainer.appendChild(webview);

 webview.addEventListener("will-navigate",e=>{const s=normalizeInput(e.url);if(!s||s.startsWith("SEARCH:"))e.preventDefault();});

 if(url==="newtab") window.api.getAppPath().then(p=>webview.src="file://"+p.replace(/\\/g,"/")+"/newtab.html");
 else {const s=normalizeInput(url); if(s&&!s.startsWith("SEARCH:")) webview.src=s;}

 tabBtn.onclick=()=>activateTab(id);
 tabBtn.querySelector(".tab-close").onclick=e=>{e.stopPropagation();closeTab(id)};

 webview.addEventListener("page-title-updated",e=>tabBtn.querySelector("span").textContent=e.title||"New Tab");
 webview.addEventListener("did-navigate",e=>{if(activeTabId===id)urlbar.value=e.url;addHistory(e.url,webview.getTitle());});

 tabs.push({id,tabBtn,webview}); activateTab(id);
}

function activateTab(id){activeTabId=id;tabs.forEach(t=>{t.webview.style.display=t.id===id?"flex":"none";t.tabBtn.classList.toggle("active",t.id===id);});}
function closeTab(id){const i=tabs.findIndex(t=>t.id===id);if(i===-1)return;tabs[i].webview.remove();tabs[i].tabBtn.remove();tabs.splice(i,1);if(tabs.length)activateTab(tabs.at(-1).id);} 

/* ===== URLバー ===== */
urlbar.onkeydown=e=>{
 if(e.key!="Enter")return;
 const v=normalizeInput(urlbar.value);
 if(!v)return;
 if(v.startsWith("SEARCH:"))activeWebview()?.loadURL(buildSearchUrl(encodeURIComponent(urlbar.value)));
 else activeWebview()?.loadURL(v);
};

backBtn.onclick=()=>activeWebview()?.goBack();
forwardBtn.onclick=()=>activeWebview()?.goForward();
homeBtn.onclick=()=>createTab();

/* ===== 履歴 ===== */
function addHistory(url,title){if(!url.startsWith("http"))return;historyList.unshift({url,title});historyList=historyList.slice(0,100);localStorage.setItem("history",JSON.stringify(historyList));}
backHistoryBtn.onclick=()=>{historyPopup.classList.toggle("hidden");renderHistory();};
function renderHistory(){historyPopup.innerHTML="";historyList.slice(0,20).forEach(h=>{const d=document.createElement("div");d.className="history-item";d.textContent=h.title||h.url;d.onclick=()=>activeWebview()?.loadURL(h.url);historyPopup.appendChild(d);});}

/* ===== ブックマーク ===== */
function renderBookmarks(){bookmarkBar.innerHTML="";bookmarks.forEach(b=>{const btn=document.createElement("div");btn.className="bookmark-btn";btn.textContent=b.title;btn.onclick=()=>activeWebview()?.loadURL(b.url);bookmarkBar.appendChild(btn);});}
renderBookmarks();
bookmarkBtn.onclick=()=>{const w=activeWebview();if(!w)return;const d={title:w.getTitle(),url:w.getURL()};if(!bookmarks.find(b=>b.url===d.url)){bookmarks.push(d);localStorage.setItem("bookmarks",JSON.stringify(bookmarks));renderBookmarks();}};

/* ===== 設定 ===== */
settingsBtn.onclick=()=>settingsSidebar.classList.add("open");
closeSettingsBtn.onclick=()=>settingsSidebar.classList.remove("open");
searchEngineSelect.value=localStorage.getItem("searchEngine")||"google";
searchEngineSelect.onchange=()=>localStorage.setItem("searchEngine",searchEngineSelect.value);
resetBtn.onclick=()=>{localStorage.clear();window.api.closeApp();};

/* ===== 起動 ===== */
newTabBtn.onclick=()=>createTab();
createTab();

});
