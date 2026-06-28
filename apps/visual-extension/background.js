chrome.runtime.onInstalled.addListener(function () {
  chrome.storage.local.set({ autopub_extension: "visual-extension" });
  if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  }
});

if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
}

// Listen for session push from AutoPub web app (externally_connectable pages)
chrome.runtime.onMessageExternal.addListener(function (message, sender, sendResponse) {
  if (message && message.type === "AUTOPUB_SESSION_SYNC" && message.session) {
    chrome.storage.local.set({ autopub_session: message.session }, function () {
      // Also refresh entitlements
      fetch(message.appBaseUrl + "/api/entitlements", {
        headers: message.session.token
          ? { "Authorization": "Bearer " + message.session.token }
          : {}
      })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          chrome.storage.local.set({ autopub_entitlements: data });
        })
        .catch(function () {
          // Silently ignore
        });
      sendResponse({ ok: true });
    });
    return true; // Keep message channel open for async response
  }
  return false;
});
