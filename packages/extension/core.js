(function initAutoPubExtensionCore() {
  const APP_BASE_URL = "__AUTOPUB_APP_BASE_URL__";

  /* --- DOM helpers --- */
  function setStatus(selectorOrElement, message) {
    const element = typeof selectorOrElement === "string" ? document.querySelector(selectorOrElement) : selectorOrElement;
    if (element) element.textContent = message;
  }

  function showState(stateName) {
    document.querySelectorAll("[data-state]").forEach(function(el) { el.classList.remove("active"); });
    var el = document.querySelector('[data-state="' + stateName + '"]');
    if (el) el.classList.add("active");
  }

  /* --- Chrome tab helpers --- */
  async function getActiveTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) throw new Error("No active browser tab found.");
    return tab;
  }

  async function sendToActiveTab(type, payload) {
    if (!payload) payload = {};
    const tab = await getActiveTab();
    const message = Object.assign({ type: type }, payload);
    try {
      return await chrome.tabs.sendMessage(tab.id, message);
    } catch (error) {
      const messageText = error?.message || "";
      if (!/Receiving end does not exist|Could not establish connection/i.test(messageText)) {
        throw error;
      }
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ["content.js"]
        });
        return await chrome.tabs.sendMessage(tab.id, message);
      } catch (_injectError) {
        throw new Error("Open a normal webpage in Chrome, refresh the page, then try again. Extensions cannot scan Chrome internal pages or the Codex in-app browser.");
      }
    }
  }

  /* --- API helpers --- */
  async function getAuthHeaders() {
    const session = await chrome.storage.local.get("autopub_session");
    const headers = { "Content-Type": "application/json" };
    if (session?.autopub_session?.token) {
      headers["Authorization"] = "Bearer " + session.autopub_session.token;
    }
    return headers;
  }

  async function postJson(path, body) {
    try {
      const response = await fetch(APP_BASE_URL + path, {
        method: "POST",
        headers: await getAuthHeaders(),
        body: JSON.stringify(body)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Request failed.");
      return data;
    } catch (error) {
      if (/Failed to fetch|NetworkError/i.test(error?.message || "")) {
        throw new Error("API request failed. Check that AutoPub API is running at " + APP_BASE_URL + ".");
      }
      throw error;
    }
  }

  async function getJson(path) {
    const response = await fetch(APP_BASE_URL + path);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Request failed.");
    return data;
  }

  async function runAiTask(taskType, input) {
    return postJson("/api/ai/run-task", { task_type: taskType, input: input || {} });
  }

  async function refreshEntitlements() {
    try {
      const session = await chrome.storage.local.get("autopub_session");
      const headers = {};
      if (session?.autopub_session?.token) {
        headers["Authorization"] = "Bearer " + session.autopub_session.token;
      }
      const response = await fetch(APP_BASE_URL + "/api/entitlements", { headers: headers });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Entitlements refresh failed.");
      await chrome.storage.local.set({ autopub_entitlements: data });
      return data;
    } catch (error) {
      console.error("refreshEntitlements failed:", error);
      return null;
    }
  }

  /* --- Navigation --- */
  function openUpgrade(source) {
    chrome.tabs.create({ url: APP_BASE_URL + "/pricing.html?source=" + encodeURIComponent(source) });
  }

  function openLogin(source) {
    chrome.tabs.create({ url: APP_BASE_URL + "/login.html?source=" + encodeURIComponent(source) });
  }

  function openRegister(source) {
    chrome.tabs.create({ url: APP_BASE_URL + "/register.html?source=" + encodeURIComponent(source) });
  }

  /* --- Action wrapper --- */
  async function withStatus(statusTarget, loadingMessage, action, successMessage) {
    try {
      setStatus(statusTarget, loadingMessage);
      const result = await action();
      if (successMessage) setStatus(statusTarget, successMessage(result));
      return result;
    } catch (error) {
      setStatus(statusTarget, error.message);
      return null;
    }
  }

  window.AutoPubExtension = {
    appBaseUrl: APP_BASE_URL,
    getActiveTab: getActiveTab,
    getJson: getJson,
    openUpgrade: openUpgrade,
    openLogin: openLogin,
    openRegister: openRegister,
    postJson: postJson,
    refreshEntitlements: refreshEntitlements,
    runAiTask: runAiTask,
    sendToActiveTab: sendToActiveTab,
    setStatus: setStatus,
    showState: showState,
    withStatus: withStatus
  };

  function bindBuiltInButtons() {
    document.querySelectorAll("[data-open-login]").forEach(function(button) {
      button.addEventListener("click", function() {
        openLogin(button.getAttribute("data-open-login") || "extension");
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindBuiltInButtons);
  } else {
    bindBuiltInButtons();
  }
})();
