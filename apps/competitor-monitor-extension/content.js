function syncAutoPubSessionFromPage() {
  try {
    if (window.localStorage?.getItem("autopub_origin") !== "autopub-web") return;
    const token = window.localStorage.getItem("autopub_token");
    if (!token) return;
    const user = JSON.parse(window.localStorage.getItem("autopub_user") || "{}");
    chrome.storage.local.set({
      autopub_session: { token, user, source: "web", synced_at: new Date().toISOString() }
    });
  } catch (_error) {}
}

syncAutoPubSessionFromPage();
window.addEventListener("autopub-session-updated", syncAutoPubSessionFromPage);

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type !== "AUTOPUB_COMPETITOR_SNAPSHOT") return;
  const shortText = (node) => (node.textContent || "").replace(/\s+/g, " ").trim();
  const cta = [...document.querySelectorAll("a,button")]
    .find((node) => /buy|start|trial|demo|contact|sign up|subscribe/i.test(shortText(node)));
  const price = [...document.querySelectorAll("body *")]
    .filter((node) => {
      const text = shortText(node);
      return text.length > 0 && text.length <= 160 && node.children.length <= 2;
    })
    .find((node) => /\$\d+|\d+\s*\/\s*mo|free trial/i.test(shortText(node)));
  sendResponse({
    url: location.href,
    title: document.title,
    description: document.querySelector('meta[name="description"]')?.content || "",
    h1: document.querySelector("h1")?.textContent?.trim() || "",
    priceText: price ? shortText(price).slice(0, 120) : "",
    ctaText: cta ? shortText(cta).slice(0, 80) : "",
    captured_at: new Date().toISOString()
  });
  return true;
});
