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
  if (message.type !== "AUTOPUB_SCAN_VIDEO") return;
  const video = document.querySelector("video");
  const ogVideo = document.querySelector('meta[property="og:video"], meta[property="og:video:url"]');
  const title = document.title;
  sendResponse({
    video: video || ogVideo ? {
      src: video?.currentSrc || video?.src || ogVideo?.content,
      title,
      duration: Number.isFinite(video?.duration) ? video.duration : null
    } : null
  });
  return true;
});
