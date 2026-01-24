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

/* ===== 右クリックメニュー共通 ===== */
const contextMenu = document.createElement("div");
contextMenu.id = "contextMenu";
contextMenu.style.position = "fixed";
contextMenu.style.zIndex = "9999";
contextMenu.style.background = "#fff";
contextMenu.style.border = "1px solid #ccc";
contextMenu.style.boxShadow = "0 2px 6px rgba(0,0,0,0.2)";
contextMenu.style.display = "none";
contextMenu.style.minWidth = "160px";
contextMenu.style.fontFamily = "Segoe UI, system-ui, sans-serif";
document.body.appendChild(contextMenu);

document.addEventListener("click", () => {
  contextMenu.style.display = "none";
});

/* ===== タブバー右クリック ===== */
tabsEl.addEventListener("contextmenu", e => {
  e.preventDefault();
  contextMenu.innerHTML = "";

  const openTab = document.createElement("div");
  openTab.textContent = "新しいタブを開く";
  openTab.style.padding = "8px";
  openTab.style.cursor = "pointer";
  openTab.onmouseenter = () => openTab.style.background="#eee";
  openTab.onmouseleave = () => openTab.style.background="#fff";
  openTab.onclick = () => { createTab(); contextMenu.style.display="none"; };

  const closeAll = document.createElement("div");
  closeAll.textContent = "すべてのタブを閉じる";
  closeAll.style.padding = "8px";
  closeAll.style.cursor = "pointer";
  closeAll.onmouseenter = () => closeAll.style.background="#eee";
  closeAll.onmouseleave = () => closeAll.style.background="#fff";
  closeAll.onclick = () => {
    while(tabs.length) closeTab(tabs[0].id);
    contextMenu.style.display="none";
  };

  contextMenu.appendChild(openTab);
  contextMenu.appendChild(closeAll);

  contextMenu.style.left = e.pageX + "px";
  contextMenu.style.top = e.pageY + "px";
  contextMenu.style.display = "block";
});

/* ===== URLバー右クリック ===== */
urlbar.addEventListener("contextmenu", e => {
  e.preventDefault();
  contextMenu.innerHTML = "";

  const copyItem = document.createElement("div");
  copyItem.textContent = "コピー";
  copyItem.style.padding = "8px";
  copyItem.style.cursor = "pointer";
  copyItem.onmouseenter = () => copyItem.style.background="#eee";
  copyItem.onmouseleave = () => copyItem.style.background="#fff";
  copyItem.onclick = () => { navigator.clipboard.writeText(urlbar.value); contextMenu.style.display="none"; };

  const pasteItem = document.createElement("div");
  pasteItem.textContent = "貼り付け";
  pasteItem.style.padding = "8px";
  pasteItem.style.cursor = "pointer";
  pasteItem.onmouseenter = () => pasteItem.style.background="#eee";
  pasteItem.onmouseleave = () => pasteItem.style.background="#fff";
  pasteItem.onclick = async () => {
    const text = await navigator.clipboard.readText();
    urlbar.value = text;
    contextMenu.style.display="none";
  };

  const searchItem = document.createElement("div");
  searchItem.textContent = "検索";
  searchItem.style.padding = "8px";
  searchItem.style.cursor = "pointer";
  searchItem.onmouseenter = () => searchItem.style.background="#eee";
  searchItem.onmouseleave = () => searchItem.style.background="#fff";
  searchItem.onclick = () => {
    let v = urlbar.value.trim();
    if(!v.startsWith("http")) v="https://www.google.com/search?q="+encodeURIComponent(v);
    activeWebview().src = v;
    contextMenu.style.display="none";
  };

  contextMenu.appendChild(copyItem);
  contextMenu.appendChild(pasteItem);
  contextMenu.appendChild(searchItem);

  contextMenu.style.left = e.pageX + "px";
  contextMenu.style.top = e.pageY + "px";
  contextMenu.style.display = "block";
});

/* ===== タブバー右クリック（個別タブ対応） ===== */
tabsEl.addEventListener("contextmenu", e => {
  e.preventDefault();
  contextMenu.innerHTML = "";

  const tab = e.target.closest(".tab");
  if (!tab) return;

  const tabObj = tabs.find(t => t.tabBtn === tab);

  // 「新しいタブを開く」
  const openTab = document.createElement("div");
  openTab.textContent = "新しいタブを開く";
  openTab.style.padding = "8px";
  openTab.style.cursor = "pointer";
  openTab.onmouseenter = () => openTab.style.background = "#eee";
  openTab.onmouseleave = () => openTab.style.background = "#fff";
  openTab.onclick = () => { createTab(); contextMenu.style.display = "none"; };

  // 「このタブを閉じる」
  const closeTabItem = document.createElement("div");
  closeTabItem.textContent = "このタブを閉じる";
  closeTabItem.style.padding = "8px";
  closeTabItem.style.cursor = "pointer";
  closeTabItem.onmouseenter = () => closeTabItem.style.background = "#eee";
  closeTabItem.onmouseleave = () => closeTabItem.style.background = "#fff";
  closeTabItem.onclick = () => { closeTab(tabObj.id); contextMenu.style.display = "none"; };

  // 「タブを複製」
  const duplicateTab = document.createElement("div");
  duplicateTab.textContent = "タブを複製";
  duplicateTab.style.padding = "8px";
  duplicateTab.style.cursor = "pointer";
  duplicateTab.onmouseenter = () => duplicateTab.style.background = "#eee";
  duplicateTab.onmouseleave = () => duplicateTab.style.background = "#fff";
  duplicateTab.onclick = () => { createTab(tabObj.webview.src); contextMenu.style.display = "none"; };

  // 「すべてのタブを閉じる」
  const closeAll = document.createElement("div");
  closeAll.textContent = "すべてのタブを閉じる";
  closeAll.style.padding = "8px";
  closeAll.style.cursor = "pointer";
  closeAll.onmouseenter = () => closeAll.style.background = "#eee";
  closeAll.onmouseleave = () => closeAll.style.background = "#fff";
  closeAll.onclick = () => {
    while(tabs.length) closeTab(tabs[0].id);
    contextMenu.style.display = "none";
  };

  contextMenu.appendChild(openTab);
  contextMenu.appendChild(closeTabItem);
  contextMenu.appendChild(duplicateTab);
  contextMenu.appendChild(closeAll);

  contextMenu.style.left = e.pageX + "px";
  contextMenu.style.top = e.pageY + "px";
  contextMenu.style.display = "block";
});

/* ===== closeTab 修正（タブが0になったらアプリ終了） ===== */
function closeTab(id) {
  const i = tabs.findIndex(t => t.id === id);
  if (i === -1) return;

  tabs[i].tabBtn.remove();
  tabs[i].webview.remove();
  tabs.splice(i, 1);

  if (!tabs.length) {
    // すべて閉じたらアプリ終了
    window.close(); // Electron環境ならウィンドウ閉じる
    return;
  }

  activateTab(tabs[Math.max(0, i - 1)].id);
}

/* ===== タブバー右クリックメニュー（Chrome風拡張版） ===== */
tabsEl.addEventListener("contextmenu", e => {
  e.preventDefault();
  contextMenu.innerHTML = "";

  const tab = e.target.closest(".tab");
  if (!tab) return;
  const tabObj = tabs.find(t => t.tabBtn === tab);

  function createMenuItem(label, onClick) {
    const item = document.createElement("div");
    item.textContent = label;
    item.style.padding = "8px";
    item.style.cursor = "pointer";
    item.onmouseenter = () => item.style.background = "#eee";
    item.onmouseleave = () => item.style.background = "#fff";
    item.onclick = () => { onClick(); contextMenu.style.display = "none"; };
    return item;
  }

  contextMenu.appendChild(createMenuItem("新しいタブを開く", () => createTab()));
  contextMenu.appendChild(createMenuItem("このタブを閉じる", () => closeTab(tabObj.id)));
  contextMenu.appendChild(createMenuItem("タブを複製", () => createTab(tabObj.webview.src)));
  contextMenu.appendChild(createMenuItem("左端に移動", () => {
    reorderTabs(tabs.findIndex(t => t.tabBtn===tabObj.tabBtn), 0);
  }));
  contextMenu.appendChild(createMenuItem("右端に移動", () => {
    reorderTabs(tabs.findIndex(t => t.tabBtn===tabObj.tabBtn), tabs.length-1);
  }));
  contextMenu.appendChild(createMenuItem("ピン留め/解除", () => {
    tabObj.tabBtn.classList.toggle("pinned");
    // ピン留めなら左端へ移動
    if(tabObj.tabBtn.classList.contains("pinned")) reorderTabs(tabs.findIndex(t => t.tabBtn===tabObj.tabBtn), 0);
  }));
  contextMenu.appendChild(createMenuItem("すべてのタブを閉じる", () => {
    while(tabs.length) closeTab(tabs[0].id);
  }));

  contextMenu.style.left = e.pageX + "px";
  contextMenu.style.top = e.pageY + "px";
  contextMenu.style.display = "block";
});

function initTabDrag() {
let dragTab=null,startX=0,placeholder=null;
tabsEl.addEventListener("pointerdown", e=>{
  const tab = e.target.closest(".tab");
  if(!tab || e.target.classList.contains("tab-close")) return;
  dragTab=tab; startX=e.clientX;
  placeholder=document.createElement("div"); placeholder.style.width=dragTab.offsetWidth+"px"; placeholder.style.height=dragTab.offsetHeight+"px";
  tabsEl.insertBefore(placeholder,dragTab.nextSibling);
  dragTab.classList.add("dragging"); dragTab.setPointerCapture(e.pointerId);
});

document.addEventListener("pointermove", e=>{
  if(!dragTab) return;
  const dx=e.clientX-startX; dragTab.style.transform=`translateX(${dx}px)`;
  const rect=dragTab.getBoundingClientRect();
  Array.from(tabsEl.children).forEach(t=>{
    if(t===placeholder || t===dragTab) return;
    const r=t.getBoundingClientRect(),mid=r.left+r.width/2;
    if(dx>0 && rect.right>mid) tabsEl.insertBefore(placeholder,t.nextSibling);
    if(dx<0 && rect.left<mid) tabsEl.insertBefore(placeholder,t);
  });
});

document.addEventListener("pointerup", e=>{
  if(!dragTab) return;
  tabsEl.insertBefore(dragTab,placeholder);
  dragTab.style.transform=""; dragTab.classList.remove("dragging"); placeholder.remove();
  dragTab.releasePointerCapture(e.pointerId);
  dragTab=null;
});
}


// タブ右クリックメニューに「タブをグループ化」を追加
tabsEl.addEventListener("contextmenu", e => {
  const tab = e.target.closest(".tab");
  if (!tab) return;
  const tabObj = tabs.find(t => t.tabBtn === tab);

  const groupItem = document.createElement("div");
  groupItem.textContent = "タブをグループ化";
  groupItem.style.padding = "8px";
  groupItem.style.cursor = "pointer";
  groupItem.onmouseenter = () => groupItem.style.background = "#eee";
  groupItem.onmouseleave = () => groupItem.style.background = "#fff";
  groupItem.onclick = () => {
    tabObj.tabBtn.classList.toggle("grouped");
    contextMenu.style.display = "none";
  };

  contextMenu.appendChild(groupItem);
});

const duplicateAllBtn = document.getElementById("duplicateAllBtn");
duplicateAllBtn?.addEventListener("click", () => {
  tabs.forEach(t => createTab(t.webview.src));
});

function saveBookmark(tabObj) {
  const bookmarks = JSON.parse(localStorage.getItem("bookmarks") || "[]");
  bookmarks.push({title: tabObj.webview.getTitle(), url: tabObj.webview.src});
  localStorage.setItem("bookmarks", JSON.stringify(bookmarks));
}

// タブ右クリックに追加
contextMenu.appendChild(createMenuItem("ブックマークに追加", () => saveBookmark(tabObj)));

