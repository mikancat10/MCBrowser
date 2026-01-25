document.addEventListener("contextmenu", e => {
  const tab = e.target.closest(".tab");
  if (!tab) return;

  e.preventDefault();
  window.api.showTabMenu(tab.dataset.tabId);
});
