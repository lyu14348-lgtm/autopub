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

function toAbsoluteUrl(src) {
  try {
    return new URL(src, location.href).href;
  } catch (_error) {
    return "";
  }
}

function urlsMatch(a, b) {
  const left = toAbsoluteUrl(a);
  const right = toAbsoluteUrl(b);
  if (!left || !right) return false;
  if (left === right) return true;
  try {
    const leftUrl = new URL(left);
    const rightUrl = new URL(right);
    if (leftUrl.origin === rightUrl.origin && leftUrl.pathname === rightUrl.pathname) return true;
  } catch (_error) {}
  return false;
}

function getSrcsetUrls(srcset) {
  if (!srcset) return [];
  return srcset.split(",").map((candidate) => candidate.trim().split(/\s+/)[0]).filter(Boolean);
}

function getBackgroundUrls(node) {
  const bg = getComputedStyle(node).backgroundImage;
  if (!bg || bg === "none") return [];
  return [...bg.matchAll(/url\(["']?(.*?)["']?\)/g)].map((match) => match[1]);
}

function ensureCaptureId(node) {
  if (!node) return "";
  if (!node.dataset.autopubCaptureId) {
    node.dataset.autopubCaptureId = "apv-" + Math.random().toString(36).slice(2) + "-" + Date.now().toString(36);
  }
  return node.dataset.autopubCaptureId;
}

function findImageElementByCaptureId(captureId) {
  if (!captureId) return null;
  return document.querySelector('[data-autopub-capture-id="' + CSS.escape(captureId) + '"]');
}

function getNodeSignature(node) {
  if (!node || !node.getAttribute) return "";
  return [
    node.tagName,
    node.getAttribute("alt"),
    node.getAttribute("aria-label"),
    node.getAttribute("title"),
    node.getAttribute("role"),
    node.getAttribute("class"),
    node.getAttribute("id"),
    node.getAttribute("src"),
    node.getAttribute("currentSrc"),
    node.getAttribute("poster"),
    node.getAttribute("href"),
    node.getAttribute("data-testid"),
    node.getAttribute("data-test-id"),
    node.getAttribute("data-type")
  ].join(" ");
}

function getAncestorSignature(node, maxDepth) {
  const parts = [];
  let current = node;
  for (let depth = 0; current && depth < maxDepth; depth += 1) {
    parts.push(getNodeSignature(current));
    current = current.parentElement;
  }
  return parts.join(" ");
}

function isVideoAssetUrl(value) {
  const text = String(value || "");
  return /\.(mp4|webm|mov|m4v|m3u8)(\?|#|$)/i.test(text)
    || /(^|[\/_-])(video|videos|reel|reels|shorts|player|poster)([\/_-]|$)/i.test(text)
    || /video[_-]?(thumb|poster|preview)|ext_tw_video|amplify_video|tweet_video|animated_thumb|playback/i.test(text);
}

function hasPlayAffordance(node) {
  let current = node;
  for (let depth = 0; current && depth < 4; depth += 1) {
    if (current.querySelector && current.querySelector(
      "video, [aria-label*='play' i], [title*='play' i], [data-testid*='play' i], [class*='play' i], [class*='pause' i], [class*='duration' i], [class*='mute' i], [class*='volume' i], [class*='video' i]"
    )) {
      return true;
    }
    current = current.parentElement;
  }
  return false;
}

function isVideoLikeNode(node) {
  if (!node) return false;
  if (node.closest("video, [role='video'], [data-testid*='video' i], [class*='video' i], [class*='player' i], [class*='poster' i], [class*='reel' i], [class*='shorts' i]")) return true;
  const text = getAncestorSignature(node, 5);
  if (/video|poster|play button|watch video|reel|shorts|player|duration|mute|unmute|volume/i.test(text)) return true;
  if (isVideoAssetUrl(text)) return true;
  return hasPlayAffordance(node);
}

function findImageElementBySrc(src) {
  for (const img of document.images) {
    const candidates = [
      img.currentSrc,
      img.src,
      img.getAttribute("src"),
      img.getAttribute("data-src"),
      img.getAttribute("data-original"),
      img.getAttribute("data-lazy-src"),
      ...getSrcsetUrls(img.srcset || img.getAttribute("srcset") || img.getAttribute("data-srcset"))
    ];
    if (candidates.some((candidate) => urlsMatch(candidate, src))) return img;
  }

  for (const source of document.querySelectorAll("picture source, source[srcset]")) {
    if (!getSrcsetUrls(source.srcset || source.getAttribute("srcset")).some((candidate) => urlsMatch(candidate, src))) continue;
    const picture = source.closest("picture");
    const img = picture && picture.querySelector("img");
    if (img) return img;
  }

  for (const node of document.querySelectorAll("*")) {
    if (getBackgroundUrls(node).some((candidate) => urlsMatch(candidate, src))) return node;
  }
  return null;
}

async function getImageCaptureRect(src, captureId) {
  const node = findImageElementByCaptureId(captureId) || findImageElementBySrc(src);
  if (!node) throw new Error("Selected image is not visible on the current page.");
  node.scrollIntoView({ block: "center", inline: "center", behavior: "instant" });
  await new Promise((resolve) => setTimeout(resolve, 320));
  const rect = node.getBoundingClientRect();
  const left = Math.max(0, rect.left);
  const top = Math.max(0, rect.top);
  const right = Math.min(window.innerWidth, rect.right);
  const bottom = Math.min(window.innerHeight, rect.bottom);
  if (right - left < 8 || bottom - top < 8) throw new Error("Selected image is outside the visible viewport.");
  return {
    rect: {
      left,
      top,
      width: right - left,
      height: bottom - top
    },
    devicePixelRatio: window.devicePixelRatio || 1
  };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "AUTOPUB_CAPTURE_IMAGE_RECT") {
    getImageCaptureRect(message.src, message.captureId).then(sendResponse).catch((error) => {
      sendResponse({ error: error.message || "Could not locate selected image." });
    });
    return true;
  }

  if (message.type !== "AUTOPUB_SCAN_IMAGES") return;
  const seen = new Set();
  const images = [];
  const addImage = (src, width, height, kind, captureId) => {
    if (!src) return;
    const absolute = toAbsoluteUrl(src);
    if (!absolute) return;
    if (isVideoAssetUrl(absolute)) return;
    if (seen.has(absolute)) return;
    seen.add(absolute);
    images.push({
      src: absolute,
      width: width || null,
      height: height || null,
      kind: kind || "image",
      captureId: captureId || ""
    });
  };
  const addSrcset = (srcset, width, height, kind, captureId) => {
    if (!srcset) return;
    srcset.split(",").forEach((candidate) => {
      const src = candidate.trim().split(/\s+/)[0];
      addImage(src, width, height, kind || "srcset", captureId);
    });
  };

  for (const img of document.images) {
    if (isVideoLikeNode(img)) continue;
    const captureId = ensureCaptureId(img);
    addImage(img.currentSrc || img.src, img.naturalWidth, img.naturalHeight, "img", captureId);
    addImage(img.getAttribute("data-src"), img.naturalWidth, img.naturalHeight, "lazy", captureId);
    addImage(img.getAttribute("data-original"), img.naturalWidth, img.naturalHeight, "lazy", captureId);
    addImage(img.getAttribute("data-lazy-src"), img.naturalWidth, img.naturalHeight, "lazy", captureId);
    addSrcset(img.srcset || img.getAttribute("data-srcset"), img.naturalWidth, img.naturalHeight, "srcset", captureId);
  }

  for (const source of document.querySelectorAll("picture source, source[srcset]")) {
    const picture = source.closest("picture");
    const img = picture && picture.querySelector("img");
    if (isVideoLikeNode(img || picture || source)) continue;
    addSrcset(source.srcset || source.getAttribute("srcset"), img ? img.naturalWidth : null, img ? img.naturalHeight : null, "srcset", img ? ensureCaptureId(img) : "");
  }

  for (const node of document.querySelectorAll("*")) {
    if (isVideoLikeNode(node)) continue;
    const bg = getComputedStyle(node).backgroundImage;
    if (!bg || bg === "none") continue;
    const matches = [...bg.matchAll(/url\(["']?(.*?)["']?\)/g)];
    const captureId = ensureCaptureId(node);
    for (const match of matches) {
      addImage(match[1], null, null, "background", captureId);
    }
  }
  sendResponse({ images });
  return true;
});
