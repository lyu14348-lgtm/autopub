chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ autopub_extension: "competitor-monitor-extension" });
});

