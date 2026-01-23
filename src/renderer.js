const tabsEl = document.getElementById("tabs");
const viewContainer = document.getElementById("view-container");
const newTabBtn = document.getElementById("newTabBtn");
const urlbar = document.getElementById("urlbar");

let tabs = [];
let activeTabId = null;

/* ===== タブ作成 ===== */
function createTab(url = "newtab") {
  const id = Date.now().toString();

  const tabBtn = document.createElement("div");
  tabBtn.className = "tab";

  const title = document.createElement("span");
  title.textContent = url === "newtab" ? "New Tab" : "Loading...";

  const closeBtn = document.createElement("span");
  closeBtn.textContent = "×";
  closeBtn.className = "tab-close";
  closeBtn.onclick = e => {
    e.stopPropagation();
    closeTab(id);
  };

  tabBtn.append(title, closeBtn);
  tabBtn.onclick = () => activateTab(id);

  tabBtn.oncontextmenu = e => {
    e.preventDefault();
    showTabMenu(e.pageX, e.pageY, id);
  };

  tabsEl.appendChild(tabBtn);

  const webview = document.createElement("webview");
  webview.className = "webview";
  webview.style.display = "none";

  webview.src =
    url === "newtab"
      ? "data:text/html," + encodeURIComponent(newTabHTML())
      : url;

  viewContainer.appendChild(webview);

  tabs.push({ id, tabBtn, webview });
  activateTab(id);
}

/* ===== タブ切替 ===== */
function activateTab(id) {
  tabs.forEach(t => {
    t.tabBtn.classList.remove("active");
    t.webview.style.display = "none";
  });

  const tab = tabs.find(t => t.id === id);
  if (!tab) return;

  tab.tabBtn.classList.add("active");
  tab.webview.style.display = "flex";
  activeTabId = id;
}

/* ===== タブを閉じる ===== */
function closeTab(id) {
  const index = tabs.findIndex(t => t.id === id);
  if (index === -1) return;

  const tab = tabs[index];
  tab.tabBtn.remove();
  tab.webview.remove();
  tabs.splice(index, 1);

  if (activeTabId === id && tabs.length) {
    activateTab(tabs[Math.max(0, index - 1)].id);
  }
}

/* ===== URLバー ===== */
urlbar.addEventListener("keydown", e => {
  if (e.key === "Enter" && activeTabId) {
    let url = urlbar.value.trim();
    if (!url.startsWith("http")) {
      url = "https://www.google.com/search?q=" + encodeURIComponent(url);
    }
    tabs.find(t => t.id === activeTabId).webview.src = url;
  }
});

/* ===== URLバー右クリック ===== */
urlbar.oncontextmenu = e => {
  e.preventDefault();
  showContextMenu(e.pageX, e.pageY, [
    { label: "コピー", action: () => navigator.clipboard.writeText(urlbar.value) },
    { label: "ペースト", action: async () => urlbar.value = await navigator.clipboard.readText() }
  ]);
};

/* ===== タブ右クリック ===== */
function showTabMenu(x, y, id) {
  showContextMenu(x, y, [
    { label: "タブを閉じる", action: () => closeTab(id) }
  ]);
}

/* ===== 共通メニュー ===== */
function showContextMenu(x, y, items) {
  removeContextMenu();
  const menu = document.createElement("div");
  menu.id = "context-menu";
  menu.style.left = x + "px";
  menu.style.top = y + "px";

  items.forEach(i => {
    const el = document.createElement("div");
    el.textContent = i.label;
    el.onclick = () => {
      i.action();
      removeContextMenu();
    };
    menu.appendChild(el);
  });

  document.body.appendChild(menu);
}

function removeContextMenu() {
  const m = document.getElementById("context-menu");
  if (m) m.remove();
}

document.addEventListener("click", removeContextMenu);

/* ===== NewTab ===== */
function newTabHTML() {
  return `
<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<title>New Tab</title>
<style>
  * {
    box-sizing: border-box;
    font-family: "Segoe UI", system-ui, sans-serif;
  }

  body {
    margin: 0;
    height: 100vh;
    background: linear-gradient(
      135deg,
      #f5f5f5,
      #e9e9e9
    );
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .container {
    text-align: center;
  }

  .clock {
    font-size: 72px;
    font-weight: 300;
    color: #222;
    letter-spacing: 2px;
  }

  .date {
    margin-top: 6px;
    font-size: 14px;
    color: #666;
  }

  .search-box {
    margin-top: 32px;
  }

  input {
    width: 420px;
    height: 42px;
    border-radius: 21px;
    border: 1px solid #ccc;
    padding: 0 18px;
    font-size: 15px;
    outline: none;
    background: #fff;
  }

  input:focus {
    border-color: #999;
  }

  .footer {
    margin-top: 40px;
    font-size: 12px;
    color: #aaa;
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

    <div class="footer">
      MCBrowser NewTab
    </div>
  </div>

<script>
  function updateClock() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    document.getElementById("clock").textContent = h + ":" + m + ":" + s;

    document.getElementById("date").textContent =
      now.toLocaleDateString("ja-JP", {
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "short"
      });
  }

  updateClock();
  setInterval(updateClock, 1000);

  document.getElementById("search").addEventListener("keydown", e => {
    if (e.key === "Enter") {
      let v = e.target.value.trim();
      if (!v) return;

      if (!v.startsWith("http")) {
        v = "https://www.google.com/search?q=" + encodeURIComponent(v);
      }
      location.href = v;
    }
  });
</script>
</body>
</html>`;
}

/* ===== 起動時 ===== */
newTabBtn.onclick = () => createTab();
createTab();
