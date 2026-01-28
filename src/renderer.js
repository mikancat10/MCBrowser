document.addEventListener("DOMContentLoaded", () => {

const { ipcRenderer } = require('electron');

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
const historyBtn = document.getElementById("backHistoryBtn");
const historyPopup = document.getElementById("historyPopup");
const settingsBtn = document.getElementById("settingsBtn");
const settingsSidebar = document.getElementById("settingsSidebar");
const closeSettingsBtn = document.getElementById("closeSettingsBtn");
const toggleBookmarkBar = document.getElementById("toggleBookmarkBar");
const searchEngineSelect = document.getElementById("searchEngine");
const bgUpload = document.getElementById("bgUpload");
const newTabUpload = document.getElementById("newTabUpload");
const resetBtn = document.getElementById("resetSettingsBtn");

/* ===== 状態 ===== */
let tabs = [];
let activeTabId = null;
let bookmarks = JSON.parse(localStorage.getItem("bookmarks") || "[]");
let historyList = JSON.parse(localStorage.getItem("history") || "[]");

const activeWebview = () => tabs.find(t => t.id === activeTabId)?.webview;

/* ================= NEW TAB ================= */
const DEFAULT_NEWTAB_HTML = `
<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<title>New Tab</title>
<style>
  * { box-sizing:border-box; font-family:"Segoe UI",system-ui,sans-serif; }

  body {
    margin: 0;
    height: 100vh;
    overflow: hidden;

    display: flex;
    justify-content: center;
    align-items: center;
  }

  .container { text-align:center; }

  .clock {
    font-size:72px;
    font-weight:300;
    color:#222;
    letter-spacing:2px;
  }

  .date {
    margin-top:6px;
    font-size:14px;
    color:#666;
  }

  .search-box { margin-top:32px; }

  input {
    width:420px;
    height:42px;
    border-radius:21px;
    border:1px solid #ccc;
    padding:0 18px;
    font-size:15px;
    outline:none;
    background:#fff;
  }

  input:focus { border-color:#999; }

  .footer {
    margin-top:40px;
    font-size:12px;
    color:#aaa;
  }
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
(function(){
  function updateClock(){
    const now=new Date();
    const h=String(now.getHours()).padStart(2,'0');
    const m=String(now.getMinutes()).padStart(2,'0');
    const s=String(now.getSeconds()).padStart(2,'0');
    document.getElementById("clock").textContent=h+":"+m+":"+s;
    document.getElementById("date").textContent=
      now.toLocaleDateString("ja-JP",{year:"numeric",month:"long",day:"numeric",weekday:"short"});
  }
  updateClock();
  setInterval(updateClock,1000);

  document.getElementById("search").addEventListener("keydown",function(e){
    if(e.key==="Enter"){
      var v=e.target.value.trim();
      if(!v) return;
      if(!v.startsWith("http")) v="https://www.google.com/search?q="+encodeURIComponent(v);
      location.href=v;
    }
  });
})();
</script>
</body>
</html>

`;

const getNewTabHTML = () => localStorage.getItem("customNewTab") || DEFAULT_NEWTAB_HTML;

/* ================= タブ ================= */
function createTab(url = "newtab") {
    const id = Date.now().toString();

    const tabBtn = document.createElement("div");
    tabBtn.className = "tab";
    tabBtn.innerHTML = `<span>New Tab</span><span class="tab-close">×</span>`;
    tabsEl.appendChild(tabBtn);

    const webview = document.createElement("webview");
    webview.className = "webview";
    webview.src = url === "newtab"
        ? "data:text/html," + encodeURIComponent(getNewTabHTML())
        : url;
    webview.style.display = "none";
    viewContainer.appendChild(webview);

    tabBtn.onclick = () => activateTab(id);
    tabBtn.querySelector(".tab-close").onclick = e => {
        e.stopPropagation();
        closeTab(id);
    };

    webview.addEventListener("page-title-updated", e => {
        tabBtn.querySelector("span").textContent = e.title || "New Tab";
    });

    webview.addEventListener("did-navigate", e => {
        urlbar.value = e.url;
        addHistory(e.url, webview.getTitle());
        saveTabs();
    });

    tabs.push({ id, tabBtn, webview });
    activateTab(id);
}

function activateTab(id) {
    tabs.forEach(t => {
        t.tabBtn.classList.remove("active");
        t.webview.style.display = "none";
    });
    const t = tabs.find(t => t.id === id);
    if (!t) return;
    t.tabBtn.classList.add("active");
    t.webview.style.display = "flex";
    activeTabId = id;
}

function closeTab(id) {
    const i = tabs.findIndex(t => t.id === id);
    if (i === -1) return;

    tabs[i].tabBtn.remove();
    tabs[i].webview.remove();
    tabs.splice(i, 1);

    if (tabs.length === 0) {
        ipcRenderer.send('close-app'); // ← 追加
        return;
    }

    activateTab(tabs[Math.max(0, i - 1)].id);
}

/* ================= ナビ ================= */
urlbar.onkeydown = e => {
    if (e.key !== "Enter") return;
    let v = urlbar.value.trim();
    if (!v.startsWith("http")) v = buildSearchUrl(encodeURIComponent(v));
    activeWebview().src = v;
};

backBtn.onclick = () => activeWebview()?.goBack();
forwardBtn.onclick = () => activeWebview()?.goForward();
homeBtn.onclick = () => activeWebview().src = "data:text/html," + encodeURIComponent(getNewTabHTML());

/* ================= 履歴 ================= */
function addHistory(url, title) {
    if (url.startsWith("data:")) return;
    historyList.unshift({ title, url });
    historyList = historyList.slice(0, 100);
    localStorage.setItem("history", JSON.stringify(historyList));
}

historyBtn.onclick = e => {
    e.stopPropagation();
    historyPopup.innerHTML = "";
    historyList.slice(0, 20).forEach(h => {
        const item = document.createElement("div");
        item.className = "history-item";
        item.textContent = h.title || h.url;
        item.onclick = () => activeWebview().src = h.url;
        historyPopup.appendChild(item);
    });
    historyPopup.classList.toggle("hidden");
};

/* ================= ブックマーク ================= */
function renderBookmarks() {
    bookmarkBar.innerHTML = "";
    bookmarks.forEach((b, i) => {
        const btn = document.createElement("div");
        btn.className = "bookmark-btn";
        btn.textContent = b.title;
        btn.onclick = () => activeWebview().src = b.url;
        btn.oncontextmenu = e => {
            e.preventDefault();
            bookmarks.splice(i, 1);
            localStorage.setItem("bookmarks", JSON.stringify(bookmarks));
            renderBookmarks();
        };
        bookmarkBar.appendChild(btn);
    });
}
renderBookmarks();

bookmarkBtn.onclick = () => {
    const wv = activeWebview();
    if (!wv || wv.src.startsWith("data:")) return;
    bookmarks.unshift({ title: wv.getTitle(), url: wv.src });
    localStorage.setItem("bookmarks", JSON.stringify(bookmarks));
    renderBookmarks();
};

/* ================= 設定 ================= */
settingsBtn.onclick = e => {
    e.stopPropagation();
    settingsSidebar.classList.add("open");
};
closeSettingsBtn.onclick = () => settingsSidebar.classList.remove("open");

toggleBookmarkBar.onchange = () => {
    bookmarkBar.style.display = toggleBookmarkBar.checked ? "flex" : "none";
    localStorage.setItem("showBookmarkBar", toggleBookmarkBar.checked);
};

searchEngineSelect.value = localStorage.getItem("searchEngine") || "google";
searchEngineSelect.onchange = () =>
    localStorage.setItem("searchEngine", searchEngineSelect.value);

bgUpload.onchange = e => {
    const reader = new FileReader();
    reader.onload = () => {
        document.body.style.backgroundImage = `url(${reader.result})`;
        localStorage.setItem("bgImage", reader.result);
    };
    reader.readAsDataURL(e.target.files[0]);
};

newTabUpload.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
        localStorage.setItem("customNewTab", reader.result); // ← 生HTML保存
        alert("NewTabデザインを更新しました。新しいタブで反映されます。");
    };
    reader.readAsText(file);
};


resetBtn.onclick = () => {
    if (!confirm("本当に設定をリセットしますか？")) return;
    localStorage.clear();
    ipcRenderer.send('close-app');
};

function buildSearchUrl(q) {
    const engine = localStorage.getItem("searchEngine") || "google";
    if (engine === "bing") return "https://www.bing.com/search?q=" + q;
    if (engine === "duck") return "https://duckduckgo.com/?q=" + q;
    return "https://www.google.com/search?q=" + q;
}

/* ================= タブ復元 ================= */
const savedTabs = JSON.parse(localStorage.getItem("savedTabs") || "null");
if (savedTabs && savedTabs.tabs.length) {
    savedTabs.tabs.forEach(url => createTab(url));
    activateTab(tabs[savedTabs.active]?.id || tabs[0].id);
} else createTab();

function saveTabs() {
    const data = {
        tabs: tabs.map(t => t.webview.src),
        active: tabs.findIndex(t => t.id === activeTabId)
    };
    localStorage.setItem("savedTabs", JSON.stringify(data));
}

newTabBtn.onclick = () => createTab();

});
