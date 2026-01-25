document.addEventListener("DOMContentLoaded", () => {

    /* ===== 要素取得 ===== */
    const tabsEl = document.getElementById("tabs");
    const viewContainer = document.getElementById("view-container");
    const newTabBtn = document.getElementById("newTabBtn");
    const urlbar = document.getElementById("urlbar");
    const backBtn = document.getElementById("backBtn");
    const forwardBtn = document.getElementById("forwardBtn");
    const homeBtn = document.getElementById("homeBtn");
    const bookmarkBar = document.getElementById("bookmarkBar");
    const bookmarkBtn = document.getElementById("bookmarkBtn");
    const historyBtn = document.getElementById("historyBtn");
    const historyPopup = document.getElementById("historyPopup");
    const settingsBtn = document.getElementById("settingsBtn");
    const settingsSidebar = document.getElementById("settingsSidebar");
    const closeSettingsBtn = document.getElementById("closeSettingsBtn");
    const toggleBookmarkBar = document.getElementById("toggleBookmarkBar");
    const searchEngineSelect = document.getElementById("searchEngine");
    const bgUpload = document.getElementById("bgUpload");
    const newTabUpload = document.getElementById("newTabUpload");
    const resetBtn = document.getElementById("resetSettingsBtn");

    let tabs = [];
    let activeTabId = null;
    let bookmarks = JSON.parse(localStorage.getItem("bookmarks") || "[]");
    let historyList = JSON.parse(localStorage.getItem("history") || "[]");

    /* ===== ユーティリティ ===== */
    const activeWebview = () => tabs.find(t=>t.id===activeTabId)?.webview;

    /* ===== NewTab HTML ===== */
    const DEFAULT_NEWTAB_HTML = `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<title>New Tab</title>
<style>
  * { box-sizing: border-box; font-family: "Segoe UI", system-ui, sans-serif; }
  body { margin:0; height:100vh; display:flex; justify-content:center; align-items:center; background:transparent; }
  .container { text-align:center; }
  .clock { font-size:72px; font-weight:300; color:#222; letter-spacing:2px; }
  .date { margin-top:6px; font-size:14px; color:#666; }
  .search-box { margin-top:32px; }
  input { width:420px; height:42px; border-radius:21px; border:1px solid #ccc; padding:0 18px; font-size:15px; outline:none; background:#fff; }
  input:focus { border-color:#999; }
  .footer { margin-top:40px; font-size:12px; color:#aaa; }
</style>
</head>
<body>
  <div class="container">
    <div class="clock" id="clock">--:--:--</div>
    <div class="date" id="date"></div>
    <div class="search-box">
      <input id="search" placeholder="検索または URL を入力" autofocus />
    </div>
    <div class="footer">MCBrowser NewTab</div>
  </div>
<script>
  function updateClock() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2,'0');
    const m = String(now.getMinutes()).padStart(2,'0');
    const s = String(now.getSeconds()).padStart(2,'0');
    document.getElementById("clock").textContent = h+":"+m+":"+s;
    document.getElementById("date").textContent = now.toLocaleDateString("ja-JP",{year:"numeric",month:"long",day:"numeric",weekday:"short"});
  }
  updateClock();
  setInterval(updateClock,1000);
  document.getElementById("search").addEventListener("keydown", e=>{
    if(e.key==="Enter"){
      let v=e.target.value.trim();
      if(!v) return;
      if(!v.startsWith("http")) v="https://www.google.com/search?q="+encodeURIComponent(v);
      location.href=v;
    }
  });
</script>
</body>
</html>`;

    const getNewTabHTML = () => localStorage.getItem("customNewTab") || DEFAULT_NEWTAB_HTML;

    /* ===== タブ作成 ===== */
    function createTab(url="newtab"){
        const id=Date.now().toString();
        const tabBtn=document.createElement("div");
        tabBtn.className="tab";
        tabBtn.innerHTML=`<span>New Tab</span><span class="tab-close">×</span>`;
        tabsEl.appendChild(tabBtn);

        const webview=document.createElement("webview");
        webview.className="webview";
        webview.src=url==="newtab"?"data:text/html,"+encodeURIComponent(getNewTabHTML()):url;
        webview.style.display="none";
        viewContainer.appendChild(webview);

        tabBtn.onclick=()=>activateTab(id);
        tabBtn.querySelector(".tab-close").onclick=e=>{ e.stopPropagation(); closeTab(id); };

        webview.addEventListener("page-title-updated", e=>{
            tabBtn.querySelector("span").textContent = e.title || "New Tab";
        });
        webview.addEventListener("did-navigate", e=>{
            urlbar.value = e.url;
            addHistory(e.url, webview.getTitle());
            saveTabs();
        });

        tabs.push({id, tabBtn, webview});
        activateTab(id);
    }

    /* ===== タブアクティブ化 ===== */
    function activateTab(id){
        tabs.forEach(t=>{ t.tabBtn.classList.remove("active"); t.webview.style.display="none"; });
        const t=tabs.find(t=>t.id===id);
        if(!t) return;
        t.tabBtn.classList.add("active");
        t.webview.style.display="flex";
        activeTabId=id;
        scrollActiveTabIntoView(t.tabBtn);
    }

    /* ===== タブ閉じる ===== */
    function closeTab(id){
        const i=tabs.findIndex(t=>t.id===id);
        if(i===-1) return;
        tabs[i].tabBtn.remove();
        tabs[i].webview.remove();
        tabs.splice(i,1);
        if(!tabs.length) createTab();
        else activateTab(tabs[Math.max(0,i-1)].id);
    }

    /* ===== URL入力・ナビ ===== */
    urlbar.onkeydown=e=>{
        if(e.key!=="Enter") return;
        let v=urlbar.value.trim();
        if(!v.startsWith("http")) v=buildSearchUrl(encodeURIComponent(v));
        activeWebview().src=v;
    };
    backBtn.onclick=()=>activeWebview()?.goBack();
    forwardBtn.onclick=()=>activeWebview()?.goForward();
    homeBtn.onclick=()=>{ activeWebview().src="data:text/html,"+encodeURIComponent(getNewTabHTML()); saveTabs(); };

    /* ===== 履歴 ===== */
    function addHistory(url,title){
        if(url.startsWith("data:")) return;
        historyList.unshift({title,url});
        historyList=historyList.slice(0,100);
        localStorage.setItem("history",JSON.stringify(historyList));
    }
    historyBtn.onclick=()=>{
        historyPopup.innerHTML="";
        historyList.forEach(h=>{
            const d=document.createElement("div");
            d.textContent=h.title;
            d.onclick=()=>{ activeWebview().src=h.url; historyPopup.classList.add("hidden"); };
            historyPopup.appendChild(d);
        });
        historyPopup.classList.toggle("hidden");
    };

    /* ===== タブスクロール ===== */
    function scrollActiveTabIntoView(tabBtn){
        const rect=tabBtn.getBoundingClientRect();
        const container=tabsEl.getBoundingClientRect();
        const scrollLeft=tabsEl.scrollLeft;
        if(rect.left<container.left) tabsEl.scrollTo({left:scrollLeft+rect.left-container.left-10,behavior:"smooth"});
        else if(rect.right>container.right) tabsEl.scrollTo({left:scrollLeft+(rect.right-container.right)+10,behavior:"smooth"});
    }

    /* ===== タブドラッグ（完全安全版） ===== */
function initTabDrag() {
    let dragTab = null;
    let startX = 0;
    let placeholder = null;
    let isDragging = false;
    let longPressTimer = null;
    const LONG_PRESS_DELAY = 200; // 長押し判定 (ms)

    tabsEl.addEventListener("pointerdown", e => {
        const tab = e.target.closest(".tab");
        if (!tab || e.target.classList.contains("tab-close")) return;

        dragTab = tab;
        startX = e.clientX;
        isDragging = false;

        longPressTimer = setTimeout(() => {
            isDragging = true;

            // placeholder 作成
            placeholder = document.createElement("div");
            placeholder.style.width = dragTab.offsetWidth + "px";
            placeholder.style.height = dragTab.offsetHeight + "px";
            tabsEl.insertBefore(placeholder, dragTab.nextSibling);

            dragTab.classList.add("dragging");
            dragTab.style.pointerEvents = "none";
            dragTab.setPointerCapture(e.pointerId);
        }, LONG_PRESS_DELAY);
    });

    document.addEventListener("pointermove", e => {
        if (!dragTab) return;

        if (!isDragging) return; // 長押し前は何もしない

        // transform だけで軽く移動
        const dx = e.clientX - startX;
        dragTab.style.transform = `translateX(${dx}px)`;

        // placeholder 入れ替え
        const rect = dragTab.getBoundingClientRect();
        Array.from(tabsEl.children).forEach(t => {
            if (t === placeholder || t === dragTab) return;
            const r = t.getBoundingClientRect();
            const mid = r.left + r.width / 2;
            if (dx > 0 && rect.right > mid) tabsEl.insertBefore(placeholder, t.nextSibling);
            if (dx < 0 && rect.left < mid) tabsEl.insertBefore(placeholder, t);
        });
    });

    document.addEventListener("pointerup", e => {
        clearTimeout(longPressTimer);

        if (!dragTab) return;

        if (!isDragging) {
            // 長押しじゃなければクリックとして扱う
            dragTab.click();
        } else {
            // ドラッグ終了 → placeholder の位置に移動
            tabsEl.insertBefore(dragTab, placeholder);
            dragTab.style.transform = "";
            dragTab.style.pointerEvents = "";
            dragTab.classList.remove("dragging");
            placeholder.remove();
            dragTab.releasePointerCapture(e.pointerId);
        }

        dragTab = null;
        placeholder = null;
        isDragging = false;
    });
}
initTabDrag();

    
    /* ===== ブックマーク ===== */
    function renderBookmarks(){
        bookmarkBar.innerHTML="";
        bookmarks.forEach((b,i)=>{
            const btn=document.createElement("div");
            btn.className="bookmark-btn";
            const img=document.createElement("img");
            try{ img.src=`https://www.google.com/s2/favicons?domain=${new URL(b.url).hostname}&sz=32`; } catch{ img.src=""; }
            img.width=16; img.height=16;
            const span=document.createElement("span");
            span.textContent=b.title;
            btn.appendChild(img); btn.appendChild(span);
            btn.onclick=()=>activeWebview().src=b.url;
            btn.oncontextmenu=e=>{ e.preventDefault(); bookmarks.splice(i,1); localStorage.setItem("bookmarks",JSON.stringify(bookmarks)); renderBookmarks(); };
            bookmarkBar.appendChild(btn);
        });
    }
    renderBookmarks();
    bookmarkBtn.onclick = ()=>{
        const wv = activeWebview(); if(!wv||wv.src.startsWith("data:")) return;
        const url = wv.src;
        if(bookmarks.some(b=>b.url===url)) return;
        bookmarks.unshift({title: wv.getTitle()||url, url});
        localStorage.setItem("bookmarks", JSON.stringify(bookmarks));
        renderBookmarks();
    };

    /* ===== 設定サイドバー ===== */
    settingsBtn.onclick=e=>{ e.stopPropagation(); settingsSidebar.classList.add("open"); };
    closeSettingsBtn.onclick = ()=>settingsSidebar.classList.remove("open");
    settingsSidebar.addEventListener("click", e=>e.stopPropagation());
    document.addEventListener("click", e=>{
        if(settingsSidebar.classList.contains("open") && !settingsSidebar.contains(e.target) && e.target!==settingsBtn)
            settingsSidebar.classList.remove("open");
    });

    /* ===== 設定保存・復元 ===== */
    searchEngineSelect.value = localStorage.getItem("searchEngine") || "google";
    searchEngineSelect.onchange = ()=>localStorage.setItem("searchEngine", searchEngineSelect.value);

    toggleBookmarkBar.checked = localStorage.getItem("showBookmarkBar")!=="false";
    bookmarkBar.style.display = toggleBookmarkBar.checked?"flex":"none";
    toggleBookmarkBar.onchange = ()=>{
        const show = toggleBookmarkBar.checked;
        bookmarkBar.style.display = show?"flex":"none";
        localStorage.setItem("showBookmarkBar", show);
    };

    const savedBg = localStorage.getItem("bgImage");
    if(savedBg) document.body.style.backgroundImage=`url(${savedBg})`;
    bgUpload.onchange=e=>{
        const file = e.target.files[0]; if(!file) return;
        const reader = new FileReader();
        reader.onload=()=>{ document.body.style.backgroundImage=`url(${reader.result})`; localStorage.setItem("bgImage", reader.result); };
        reader.readAsDataURL(file);
    };
    newTabUpload.onchange=e=>{
        const file = e.target.files[0]; if(!file) return;
        const reader = new FileReader();
        reader.onload=()=>localStorage.setItem("customNewTab", reader.result);
        reader.readAsText(file);
    };

    function buildSearchUrl(q){
        const engine = localStorage.getItem("searchEngine") || "google";
        if(engine==="bing") return "https://www.bing.com/search?q="+q;
        if(engine==="duck") return "https://duckduckgo.com/?q="+q;
        return "https://www.google.com/search?q="+q;
    }

    /* ===== 起動時タブ復元 ===== */
    const savedTabs = JSON.parse(localStorage.getItem("savedTabs") || "null");
    if(savedTabs && savedTabs.tabs.length){
        savedTabs.tabs.forEach(url=>createTab(url));
        activateTab(tabs[savedTabs.active]?.id||tabs[0].id);
    } else createTab();

    /* ===== タブ保存 ===== */
    function saveTabs(){
        const data = { tabs: tabs.map(t=>t.webview.src), active: tabs.findIndex(t=>t.id===activeTabId) };
        localStorage.setItem("savedTabs", JSON.stringify(data));
    }

const { ipcRenderer } = require('electron');

resetBtn.onclick = () => {
    if (!confirm("本当に設定をリセットしますか？")) return;

    localStorage.removeItem("bgImage");
    localStorage.removeItem("theme");
    localStorage.removeItem("searchEngine");
    localStorage.removeItem("savedTabs");
    localStorage.removeItem("customNewTab");

    document.body.style.backgroundImage = "";
    document.body.classList.remove("dark-mode");

    toggleBookmarkBar.checked = true;
    bookmarkBar.style.display = "flex";

    // タブを閉じずにそのまま閉じる
    ipcRenderer.send('close-app');
};


    /* ===== 新しいタブボタン ===== */
    newTabBtn.onclick = ()=>createTab();

// 右クリックメニュー共通
const contextMenu = document.createElement("div");
contextMenu.style.cssText = "position:fixed;z-index:9999;background:#fff;border:1px solid #ccc;display:none;min-width:160px;";
document.body.appendChild(contextMenu);

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

// 右クリック全体イベント
document.addEventListener("contextmenu", e => {
    e.preventDefault();
    contextMenu.innerHTML = "";

    const tab = e.target.closest(".tab");
    const bookmark = e.target.closest(".bookmark-btn");

    if(tab){
        // タブ用メニュー
        const t = tabs.find(t=>t.tabBtn===tab);
        contextMenu.appendChild(createMenuItem("新しいタブを開く", ()=>createTab()));
        contextMenu.appendChild(createMenuItem("タブを閉じる", ()=>closeTab(t.id)));
        contextMenu.appendChild(createMenuItem("タブを複製", ()=>createTab(t.webview.src)));
    } else if(bookmark){
        // ブックマーク用メニュー
        const index = Array.from(bookmarkBar.children).indexOf(bookmark);
        contextMenu.appendChild(createMenuItem("開く", ()=>activeWebview().src=bookmarks[index].url));
        contextMenu.appendChild(createMenuItem("削除", ()=>{ 
            bookmarks.splice(index, 1); 
            localStorage.setItem("bookmarks", JSON.stringify(bookmarks));
            renderBookmarks();
        }));
    } else if(e.target === urlbar){
        // URLバー用メニュー
        contextMenu.appendChild(createMenuItem("コピー", ()=>navigator.clipboard.writeText(urlbar.value)));
        contextMenu.appendChild(createMenuItem("貼り付け", async ()=>{ 
            const text = await navigator.clipboard.readText();
            urlbar.value = text; 
        }));
        contextMenu.appendChild(createMenuItem("リロード", ()=>activeWebview()?.reload()));
    } else {
        // それ以外 → タブなし全体用メニュー
        contextMenu.appendChild(createMenuItem("新しいタブを開く", ()=>createTab()));
        contextMenu.appendChild(createMenuItem("すべてのタブを閉じる", ()=>{while(tabs.length) closeTab(tabs[0].id);}));
    }

    contextMenu.style.left = e.pageX + "px";
    contextMenu.style.top = e.pageY + "px";
    contextMenu.style.display = "block";
});

// クリックでメニューを閉じる
document.addEventListener("click", ()=>contextMenu.style.display="none")});
