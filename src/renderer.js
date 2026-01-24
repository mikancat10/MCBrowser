const tabsEl = document.getElementById("tabs");
const viewContainer = document.getElementById("view-container");
const urlbar = document.getElementById("urlbar");

const backBtn = document.getElementById("backBtn");
const forwardBtn = document.getElementById("forwardBtn");
const homeBtn = document.getElementById("homeBtn");
const historyBtn = document.getElementById("historyBtn");
const newTabBtn = document.getElementById("newTabBtn");
const historyPopup = document.getElementById("historyPopup");

let tabs = [];
let activeTabId = null;
let historyList = JSON.parse(localStorage.getItem("history") || "[]");

/* ===== NewTab HTML ===== */
function newTabHTML() {
  return `<!DOCTYPE html>
<html lang="ja">
<head><meta charset="UTF-8"><title>New Tab</title>
<style>
*{box-sizing:border-box;font-family:Segoe UI,system-ui}
body{margin:0;height:100vh;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#f5f5f5,#e9e9e9)}
.clock{font-size:72px;font-weight:300}
.date{font-size:14px;color:#666}
input{width:420px;height:42px;margin-top:28px;border-radius:21px;border:1px solid #ccc;padding:0 18px;font-size:15px}
</style></head>
<body>
<div style="text-align:center">
<div id="clock" class="clock"></div>
<div id="date" class="date"></div>
<input id="search" placeholder="検索または URL を入力" autofocus>
</div>
<script>
function u(){const n=new Date();clock.textContent=String(n.getHours()).padStart(2,'0')+":"+String(n.getMinutes()).padStart(2,'0')+":"+String(n.getSeconds()).padStart(2,'0');date.textContent=n.toLocaleDateString("ja-JP",{weekday:"short",year:"numeric",month:"long",day:"numeric"});}
u();setInterval(u,1000);
search.onkeydown=e=>{if(e.key!=="Enter")return;let v=e.target.value.trim();if(!v.startsWith("http"))v="https://www.google.com/search?q="+encodeURIComponent(v);location.href=v;}
</script></body></html>`;
}

/* ===== タブ作成 ===== */
function createTab(url = "newtab") {
  const id = Date.now().toString();
  const tabBtn = document.createElement("div");
  tabBtn.className = "tab";
  tabBtn.innerHTML = `<span>New Tab</span><span class="tab-close">×</span>`;
  tabBtn.onclick = () => activateTab(id);
  tabBtn.querySelector(".tab-close").onclick = e => { e.stopPropagation(); closeTab(id); };

  const webview = document.createElement("webview");
  webview.className = "webview";
  webview.style.display = "none";
  webview.src = url === "newtab" ? "data:text/html," + encodeURIComponent(newTabHTML()) : url;

  webview.addEventListener("page-title-updated", e => { tabBtn.querySelector("span").textContent = e.title || "New Tab"; });
  webview.addEventListener("did-navigate", e => { urlbar.value = e.url; addHistory(e.url, webview.getTitle()); });

  tabsEl.appendChild(tabBtn);
  viewContainer.appendChild(webview);
  tabs.push({ id, tabBtn, webview });

  activateTab(id);

  initTabDrag(tabBtn);
}

/* ===== タブドラッグ Chrome級 ===== */
/* ===== 磁石＋Chrome級タブドラッグ + 横スクロール ===== */
function initTabDrag() {
  let dragTab = null;
  let startX = 0;
  let currentX = 0;
  let dragIndex = 0;
  let animationFrame = null;

  function onPointerMove(e) {
    if (!dragTab) return;
    currentX = e.clientX;
    const dx = currentX - startX;
    dragTab.style.transform = `translateX(${dx}px)`;

    const rect = dragTab.getBoundingClientRect();
    const containerRect = tabsEl.getBoundingClientRect();

    // 自動横スクロール
    const edgeThreshold = 50;
    const scrollSpeed = 8;
    if (rect.left < containerRect.left + edgeThreshold) {
      tabsEl.scrollLeft -= scrollSpeed;
    } else if (rect.right > containerRect.right - edgeThreshold) {
      tabsEl.scrollLeft += scrollSpeed;
    }

    // タブ入れ替え
    const index = tabs.findIndex(t => t.tabBtn === dragTab);
    tabs.forEach((t, i) => {
      if (t.tabBtn === dragTab) return;
      const r = t.tabBtn.getBoundingClientRect();
      const mid = r.left + r.width / 2;

      if (dx > 0 && rect.right > mid && i > index) reorderTabs(index, i);
      if (dx < 0 && rect.left < mid && i < index) reorderTabs(index, i);
    });
  }

  function onPointerUp(e) {
    if (!dragTab) return;
    dragTab.releasePointerCapture(e.pointerId);
    dragTab.classList.remove("dragging");
    dragTab.style.transform = "";
    dragTab = null;
    if (animationFrame) cancelAnimationFrame(animationFrame);
  }

  tabsEl.addEventListener("pointerdown", e => {
    const tab = e.target.closest(".tab");
    if (!tab || e.target.classList.contains("tab-close")) return;

    dragTab = tab;
    startX = e.clientX;
    dragIndex = tabs.findIndex(t => t.tabBtn === dragTab);

    dragTab.classList.add("dragging");
    dragTab.setPointerCapture(e.pointerId);

    function frame() {
      onPointerMove(e);
      animationFrame = requestAnimationFrame(frame);
    }
    frame();
  });

  document.addEventListener("pointermove", onPointerMove);
  document.addEventListener("pointerup", onPointerUp);
}


/* ===== 並び替え ===== */
function reorderTabs(from, to) {
  if (from === to) return;
  const moved = tabs.splice(from, 1)[0];
  tabs.splice(to, 0, moved);
  tabsEl.insertBefore(moved.tabBtn, tabsEl.children[to]);
  viewContainer.insertBefore(moved.webview, viewContainer.children[to]);
}

/* ===== タブ制御 ===== */
function activateTab(id) {
  tabs.forEach(t => { t.tabBtn.classList.remove("active"); t.webview.style.display = "none"; });
  const t = tabs.find(t => t.id === id);
  if (!t) return;
  t.tabBtn.classList.add("active");
  t.webview.style.display = "flex";
  activeTabId = id;
  scrollActiveTabIntoView(t.tabBtn);
}

function closeTab(id) {
  const i = tabs.findIndex(t => t.id === id);
  if (i === -1) return;
  tabs[i].tabBtn.remove();
  tabs[i].webview.remove();
  tabs.splice(i, 1);
  if (!tabs.length) createTab();
  else activateTab(tabs[Math.max(0, i - 1)].id);
}

/* ===== ナビ ===== */
function activeWebview() { return tabs.find(t => t.id === activeTabId)?.webview; }
backBtn.onclick = () => activeWebview()?.goBack();
forwardBtn.onclick = () => activeWebview()?.goForward();
homeBtn.onclick = () => activeWebview().src = "data:text/html," + encodeURIComponent(newTabHTML());
urlbar.onkeydown = e => { if (e.key!=="Enter") return; let v=urlbar.value.trim(); if(!v.startsWith("http")) v="https://www.google.com/search?q="+encodeURIComponent(v); activeWebview().src=v; };

/* ===== 履歴 ===== */
function addHistory(url,title){if(url.startsWith("data:"))return;historyList.unshift({title,url});historyList=historyList.slice(0,100);localStorage.setItem("history",JSON.stringify(historyList));}
historyBtn.onclick=()=>{historyPopup.innerHTML="";historyList.forEach(h=>{const d=document.createElement("div");d.className="history-item";d.textContent=h.title;d.onclick=()=>{activeWebview().src=h.url;historyPopup.classList.add("hidden");};historyPopup.appendChild(d);});historyPopup.classList.toggle("hidden");};

/* ===== 起動 ===== */
newTabBtn.onclick = () => createTab();
createTab();

/* ===== アクティブタブを常に表示 ===== */
function scrollActiveTabIntoView(tabBtn){
  const rect = tabBtn.getBoundingClientRect();
  const container = tabsEl.getBoundingClientRect();
  const scrollLeft = tabsEl.scrollLeft;

  if(rect.left < container.left){
    tabsEl.scrollTo({left: scrollLeft + rect.left - container.left -10, behavior:"smooth"});
  } else if(rect.right > container.right){
    tabsEl.scrollTo({left: scrollLeft + (rect.right - container.right)+10, behavior:"smooth"});
  }
}
