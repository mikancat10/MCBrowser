const tabsEl = document.getElementById("tabs");
const viewContainer = document.getElementById("view-container");
const urlbar = document.getElementById("urlbar");
const contextMenu = document.getElementById("contextMenu");
const newTabBtn = document.getElementById("newTabBtn");

let tabs = [];
let activeTabId = null;

// New Tabのコンテンツ
function getNewTabHTML() {
    return `<html><body style="background:#121212;color:white;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0;font-family:sans-serif;">
    <h1 style="font-size:4rem;font-weight:200;">${new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</h1>
    <p style="color:#888;">MCBrowser Interactive Demo</p>
    </body></html>`;
}

// タブ作成
function createTab(url = "newtab") {
    const id = "tab-" + Date.now();
    const tabBtn = document.createElement("div");
    tabBtn.className = "tab";
    tabBtn.id = id;
    tabBtn.innerHTML = `<span>New Tab</span><i class="fas fa-times tab-close" style="margin-left:auto; opacity:0.5;"></i>`;
    
    const iframe = document.createElement("iframe");
    if (url === "newtab") {
        iframe.srcdoc = getNewTabHTML();
    } else {
        iframe.src = url.startsWith('http') ? url : `https://${url}`;
    }

    tabBtn.onclick = () => activateTab(id);
    tabBtn.querySelector(".tab-close").onclick = (e) => { e.stopPropagation(); closeTab(id); };
    tabBtn.oncontextmenu = (e) => showContextMenu(e, id);

    tabsEl.appendChild(tabBtn);
    viewContainer.appendChild(iframe);
    tabs.push({ id, tabBtn, iframe });
    
    activateTab(id);
    initTabDrag(tabBtn);
}

// タブ切り替え
function activateTab(id) {
    tabs.forEach(t => {
        t.tabBtn.classList.remove("active");
        t.iframe.style.display = "none";
    });
    const target = tabs.find(t => t.id === id);
    if (target) {
        target.tabBtn.classList.add("active");
        target.iframe.style.display = "block";
        activeTabId = id;
        urlbar.value = target.iframe.src.startsWith('data') ? "" : target.iframe.src;
    }
}

// タブ削除
function closeTab(id) {
    const i = tabs.findIndex(t => t.id === id);
    if (i === -1) return;
    tabs[i].tabBtn.remove();
    tabs[i].iframe.remove();
    tabs.splice(i, 1);
    if (tabs.length === 0) createTab();
    else activateTab(tabs[Math.max(0, i - 1)].id);
}

// 右クリックメニュー
function showContextMenu(e, id) {
    e.preventDefault();
    contextMenu.innerHTML = "";
    const items = [
        { label: "複製", action: () => createTab(tabs.find(t=>t.id===id).iframe.src) },
        { label: "ピン留め切替", action: () => document.getElementById(id).classList.toggle("pinned") },
        { label: "このタブを閉じる", action: () => closeTab(id) }
    ];
    items.forEach(item => {
        const div = document.createElement("div");
        div.className = "context-item";
        div.textContent = item.label;
        div.onclick = item.action;
        contextMenu.appendChild(div);
    });
    contextMenu.style.left = e.pageX + "px";
    contextMenu.style.top = e.pageY + "px";
    contextMenu.classList.remove("hidden");
}

document.onclick = () => contextMenu.classList.add("hidden");

// ドラッグ＆ドロップ (Chrome風)
function initTabDrag(tab) {
    let startX, placeholder;
    tab.onpointerdown = e => {
        if (e.target.classList.contains("tab-close")) return;
        startX = e.clientX;
        tab.classList.add("dragging");
        tab.setPointerCapture(e.pointerId);
        
        tab.onpointermove = ev => {
            const dx = ev.clientX - startX;
            tab.style.transform = `translateX(${dx}px)`;
            tab.style.zIndex = 100;
        };
        
        tab.onpointerup = ev => {
            tab.classList.remove("dragging");
            tab.style.transform = "";
            tab.onpointermove = null;
            tab.releasePointerCapture(ev.pointerId);
        };
    };
}

// イベント
newTabBtn.onclick = () => createTab();
urlbar.onkeydown = e => {
    if (e.key === "Enter") {
        const target = tabs.find(t => t.id === activeTabId);
        let val = urlbar.value;
        if (!val.startsWith("http")) val = "https://www.google.com/search?q=" + encodeURIComponent(val);
        target.iframe.srcdoc = ""; // srcdocをクリア
        target.iframe.src = val;
    }
};

// 初期タブ
createTab();
