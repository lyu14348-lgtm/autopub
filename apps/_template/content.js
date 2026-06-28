chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) { if (message.type !== "AUTOPUB_[ACTION]") return; sendResponse({}); return true; });
