const tabsEl = document.getElementById("tabs");
const viewContainer = document.getElementById("view-container");
const urlbar = document.getElementById("urlbar");
const newTabBtn = document.getElementById("newTabBtn");

let tabs = [];
let activeTabId = null;

// NewTab のコンテンツ
function getNewTabContent() {
    return `
    <body style="background:#0a0a0a; color:white; font-family:sans-serif; display:flex; flex-direction:column; justify-content:center; align-items:center; height:100vh; margin:0;">
        <h1 id="clock" style="font-size:80px; font-weight:200;">00:00</h1>
        <div style="width:60%; max-width:500px;">
            <input id="s" placeholder="Search with Google..." style="width:100%; padding:15px 25px; border-radius:30px; border:1px solid #333; background:#1a1a1a; color:white; outline:none; font-size:16px;">
        </div>
        <script>
            setInterval(() => { document.getElementById('clock').textContent = new Date().toTimeString().split(' ')[0]; }, 1000);
            document.getElementById('s').onkeydown = e => {
                if(e.key === 'Enter') window.location.href = 'https://www.google.com/search?q=' + encodeURIComponent(e.target.value);
            }
        </script>
    </body>`;
}

function createTab(url = "newtab") {
    const id = Date.now().toString();
    const tabBtn = document.createElement("div");
    tabBtn.className = "tab";
    tabBtn.innerHTML = `<span>New Tab</span><i class="fas fa-times tab-close"></i>`;
    
    tabBtn.onclick = () => activateTab(id);
    tabBtn.querySelector(".tab-close").onclick = (e) => { e.stopPropagation(); closeTab(id); };

    const iframe = document.createElement("iframe");
    if(url === "newtab") {
        iframe.srcdoc = getNewTabContent();
    } else {
        iframe.src = url;
    }

    viewContainer.appendChild(iframe);
    tabsEl.appendChild(tabBtn);
    tabs.push({ id, tabBtn, iframe });
    activateTab(id);
}

function activateTab(id) {
    tabs.forEach(t => {
        t.tabBtn.classList.remove("active");
        t.iframe.style.display = "none";
    });
    const target = tabs.find(t => t.id === id);
    if(target) {
        target.tabBtn.classList.add("active");
        target.iframe.style.display = "block";
        activeTabId = id;
    }
}

function closeTab(id) {
    const index = tabs.findIndex(t => t.id === id);
    if(index === -1) return;
    tabs[index].tabBtn.remove();
    tabs[index].iframe.remove();
    tabs.splice(index, 1);
    if(tabs.length === 0) createTab();
    else activateTab(tabs[Math.max(0, index - 1)].id);
}

// Event Listeners
newTabBtn.onclick = () => createTab();

urlbar.onkeydown = e => {
    if(e.key === "Enter") {
        let val = urlbar.value.trim();
        if(!val.startsWith("http")) val = "https://www.google.com/search?q=" + encodeURIComponent(val);
        const current = tabs.find(t => t.id === activeTabId);
        if(current) current.iframe.src = val;
    }
};

// 初期タブ作成
createTab();
