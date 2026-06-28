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
  if (message.type !== "AUTOPUB_SEO_AUDIT") return;
  const issues = [];
  const title = document.title || "";
  const description = document.querySelector('meta[name="description"]')?.content || "";
  const h1Count = document.querySelectorAll("h1").length;
  const imagesWithoutAlt = [...document.images].filter((img) => !img.alt).length;
  const canonical = document.querySelector('link[rel="canonical"]')?.href;
  if (title.length < 10 || title.length > 65) issues.push({ level: "P1", message: "Title length should be between 10 and 65 characters." });
  if (description.length < 50 || description.length > 160) issues.push({ level: "P1", message: "Description length should be between 50 and 160 characters." });
  if (h1Count !== 1) issues.push({ level: "P1", message: "Page should have exactly one H1." });
  if (imagesWithoutAlt > 0) issues.push({ level: "P2", message: `${imagesWithoutAlt} images are missing alt text.` });
  if (!canonical) issues.push({ level: "P2", message: "Canonical URL is missing." });
  sendResponse({ score: Math.max(0, 100 - issues.length * 12), issues });
  return true;
});
