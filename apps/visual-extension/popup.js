var core = window.AutoPubExtension;

var statusEl = document.querySelector("#status");
var summaryEl = document.querySelector("#summary");
var itemsEl = document.querySelector("#items");
var errorMsgEl = document.querySelector("#error-msg");
var errorHintEl = document.querySelector("#error-hint");
var promptWorkspaceEl = document.querySelector("#prompt-workspace");
var promptOutputEl = document.querySelector("#prompt-output");
var promptBackBtn = document.querySelector("#prompt-back");
var creditsBadgeEl = document.querySelector("#credits-badge");
var planBadgeEl = document.querySelector("#user-plan-badge");
var accountStatusEl = document.querySelector("#account-status");
var galleryTitleEl = document.querySelector("#gallery-title");
var gallerySubtitleEl = document.querySelector("#gallery-subtitle");
var selectionCountEl = document.querySelector("#selection-count");
var selectionPanelEl = document.querySelector("#selection-panel");
var selectionTitleEl = document.querySelector("#selection-title");
var selectionHintEl = document.querySelector("#selection-hint");
var selectionReverseBtn = document.querySelector("#selection-reverse");
var selectionDownloadBtn = document.querySelector("#selection-download");
var selectionGenerateBtn = document.querySelector("#selection-generate");

var lastImages = [];
var selectedIndexes = new Set();
var focusedIndex = null;
var currentEntitlements = null;
var promptReady = false;
var promptReferenceImage = null;
var USE_REFERENCE_IMAGE_FOR_GENERATION = true;
var MAX_BATCH_DOWNLOADS = 200;
var autoScanTimer = null;
var scanRequestId = 0;
var observedTabId = null;
var observedTabUrl = "";
var observedTabStatus = "";
var lastPollScanAt = 0;

function debugAi(label, payload) {
  console.debug("[AutoPub Visual] " + label, payload);
}

function isScannableUrl(url) {
  return /^https?:\/\//i.test(String(url || ""));
}

var FALLBACK_LIMITS = {
  anonymous: { credits: 3, dailyCredits: 0, visualBatchLimit: 50, aiDailyLimit: 3, features: ["scan", "single_download"] },
  free: { credits: 0, dailyCredits: 3, visualBatchLimit: 200, aiDailyLimit: 3, features: ["scan", "single_download", "basic_report"] },
  pro: { credits: 500, dailyCredits: 0, visualBatchLimit: 1000, aiDailyLimit: 100, features: ["scan", "bulk_download", "ai_prompt", "ai_generation"] },
  pro_plus: { credits: 2000, dailyCredits: 0, visualBatchLimit: 5000, aiDailyLimit: 500, features: ["scan", "bulk_download", "ai_prompt", "ai_generation"] }
};

function setStatus(message, detail) {
  statusEl.textContent = message;
  if (detail != null) summaryEl.textContent = detail;
}

function normalizeErrorMessage(error) {
  var message = error && error.message ? error.message : String(error || "Unknown error.");
  if (/Failed to fetch|NetworkError/i.test(message)) {
    return "API request failed. Check that AutoPub API is running at " + core.appBaseUrl + ", then reload the extension.";
  }
  if (/could not download this image|could not proxy|Download multimodal file timed out|multimodal/i.test(message)) {
    return "AI could not read this image from the source site. Try another image, or use an image that is publicly accessible.";
  }
  if (/image length and width|height:.*width:|must be larger than/i.test(message)) {
    return "The captured image is too small for AI analysis. Select a larger image on the page and retry.";
  }
  if (/Selected image is not visible|outside the visible viewport|Could not capture the visible page image/i.test(message)) {
    return "Could not capture the selected image from the page. Click Refresh, select the image again, then retry.";
  }
  return message;
}

function getErrorHint(message) {
  if (/API request failed/i.test(message)) {
    return "Start the local API/web server or rebuild/reload the extension after changing APP_BASE_URL.";
  }
  if (/capture|selected image|visible page|too small/i.test(message)) {
    return "Refresh the webpage, click Refresh in the plugin, select the image again, then retry.";
  }
  return "Refresh the current webpage or click Refresh in the plugin.";
}

function showError(message, hint) {
  core.showState("error");
  errorMsgEl.textContent = message;
  errorHintEl.textContent = hint || "Refresh the current webpage or click Refresh in the plugin.";
}

function getFallbackEntitlements(session) {
  var isLoggedIn = !!(session && session.token);
  var user = session && session.user;
  var plan = (user && user.plan) || (isLoggedIn ? "free" : "anonymous");
  var limits = FALLBACK_LIMITS[plan] || FALLBACK_LIMITS.anonymous;
  return {
    user_id: (user && user.user_id) || null,
    plan: plan,
    credits_balance: (user && user.credits_balance != null) ? user.credits_balance : limits.credits,
    limits: limits,
    features: limits.features
  };
}

async function loadSession() {
  try {
    var stored = await chrome.storage.local.get(["autopub_session", "autopub_entitlements"]);
    var raw = stored && stored.autopub_session;
    currentEntitlements = raw && raw.token && stored && stored.autopub_entitlements ? stored.autopub_entitlements : null;
    if (raw && raw.token && !currentEntitlements) currentEntitlements = await core.refreshEntitlements();
    if (!currentEntitlements) currentEntitlements = getFallbackEntitlements(raw);
    updateAccountUi(raw, currentEntitlements);
  } catch (error) {
    console.error("loadSession failed:", error);
    currentEntitlements = getFallbackEntitlements(null);
    updateAccountUi(null, currentEntitlements);
  }
}

function updateAccountUi(session, entitlements) {
  var isLoggedIn = !!(session && session.token);
  var plan = (entitlements && entitlements.plan) || "anonymous";
  var credits = (entitlements && entitlements.credits_balance != null) ? entitlements.credits_balance : "?";
  var daily = (entitlements && entitlements.limits && entitlements.limits.dailyCredits) || 0;

  planBadgeEl.textContent = plan === "anonymous" ? "Guest" : plan === "free" ? "Free" : plan === "pro" ? "Pro" : "Pro+";
  planBadgeEl.className = "status-pill plan-" + plan;
  creditsBadgeEl.textContent = credits + " cr" + (daily > 0 ? " +" + daily + "/d" : "");
  creditsBadgeEl.className = "status-pill" + ((typeof credits === "number" && credits <= 2) ? " low-credits" : "");
  accountStatusEl.textContent = isLoggedIn
    ? ((session.user && session.user.email) || "Signed in")
    : "Guest mode";

  document.querySelector("#btn-login").hidden = isLoggedIn;
  document.querySelector("#btn-register").hidden = isLoggedIn;
  document.querySelector("#btn-logout").hidden = !isLoggedIn;
}

function getPlan() {
  return (currentEntitlements && currentEntitlements.plan) || "anonymous";
}

function getCreditsBalance() {
  return currentEntitlements && currentEntitlements.credits_balance ? currentEntitlements.credits_balance : 0;
}

function showAuthModal(reason) {
  var modal = document.querySelector("#upgrade-modal");
  var msgEl = document.querySelector("#upgrade-modal-msg");
  var ctaBtn = document.querySelector("#upgrade-modal-cta");
  msgEl.textContent = reason;
  ctaBtn.textContent = "Continue with Google or Email";
  var next = ctaBtn.cloneNode(true);
  ctaBtn.parentNode.replaceChild(next, ctaBtn);
  next.addEventListener("click", function () {
    modal.hidden = true;
    core.openRegister("visual-extension");
  });
  modal.hidden = false;
}

async function withCreditGate(cost, actionName, taskFn) {
  try {
    var fresh = await core.refreshEntitlements();
    if (fresh) currentEntitlements = fresh;
  } catch (_error) {}

  if (getCreditsBalance() < cost) {
    showAuthModal("Free trial usage is finished. Continue with Google or email to keep using " + actionName + ".");
    core.showState("results");
    setStatus("Sign in required.", actionName + " needs " + cost + " credits.");
    return;
  }

  try {
    await taskFn();
    try {
      var updated = await core.refreshEntitlements();
      if (updated) currentEntitlements = updated;
      var stored = await chrome.storage.local.get("autopub_session");
      updateAccountUi(stored && stored.autopub_session, currentEntitlements);
    } catch (_refreshError) {}
  } catch (error) {
    var message = normalizeErrorMessage(error);
    showError(message, getErrorHint(message));
    debugAi("AI task failed", { actionName: actionName, error: message });
  }
}

function getImageArea(image) {
  return (image.width || 0) * (image.height || 0);
}

function isLargeImage(image) {
  return getImageArea(image) >= 512 * 512;
}

function getImageFormat(src) {
  var clean = String(src || "").split("?")[0].split("#")[0].toLowerCase();
  var match = clean.match(/\.([a-z0-9]{2,5})$/);
  if (match) return match[1].toUpperCase();
  if (clean.indexOf("data:image/") === 0) return clean.split("data:image/")[1].split(";")[0].toUpperCase();
  return "IMG";
}

function getDownloadFilename(src, index) {
  var format = getImageFormat(src).toLowerCase();
  var extension = format === "jpg" || format === "jpeg" || format === "png" || format === "webp" || format === "gif" || format === "svg"
    ? format.replace("jpeg", "jpg")
    : "jpg";
  return "autopub-images/autopub-image-" + String(index + 1).padStart(3, "0") + "." + extension;
}

async function downloadImage(src, index) {
  try {
    await chrome.downloads.download({
      url: src,
      filename: getDownloadFilename(src, index),
      saveAs: false,
      conflictAction: "uniquify"
    });
    return true;
  } catch (error) {
    setStatus("Download failed.", error.message);
    return false;
  }
}

async function imageToDataUrl(src) {
  if (!src) throw new Error("Image source is missing.");
  if (/^data:image\/(png|jpeg|webp)/.test(src)) return src;
  if (src.indexOf("data:image/svg") === 0) return await rasterizeImage(src);
  var response = await fetch(src, { mode: "cors", credentials: "omit" });
  if (!response.ok) throw new Error("Could not fetch the selected image.");
  var blob = await response.blob();
  if (blob.type === "image/svg+xml") return await rasterizeImage(URL.createObjectURL(blob));
  return await new Promise(function (resolve, reject) {
    var reader = new FileReader();
    reader.onload = function () { resolve(reader.result); };
    reader.onerror = function () { reject(new Error("Could not read the selected image.")); };
    reader.readAsDataURL(blob);
  });
}

async function getVisionImageUrl(src) {
  if (!src) throw new Error("Image source is missing.");
  if (/^https?:\/\//i.test(src)) return src;
  return await imageToDataUrl(src);
}

async function cropVisibleTabImage(rectInfo) {
  if (!rectInfo || !rectInfo.rect) {
    throw new Error("Could not capture the selected image from the page.");
  }
  var screenshotUrl = await chrome.tabs.captureVisibleTab({ format: "png" });
  return await new Promise(function (resolve, reject) {
    var img = new Image();
    img.onload = function () {
      try {
        var ratio = rectInfo.devicePixelRatio || 1;
        var rect = rectInfo.rect;
        var sx = Math.max(0, Math.round(rect.left * ratio));
        var sy = Math.max(0, Math.round(rect.top * ratio));
        var sw = Math.max(1, Math.round(rect.width * ratio));
        var sh = Math.max(1, Math.round(rect.height * ratio));
        var canvas = document.createElement("canvas");
        canvas.width = Math.min(sw, img.naturalWidth - sx);
        canvas.height = Math.min(sh, img.naturalHeight - sy);
        if (canvas.width < 16 || canvas.height < 16) {
          reject(new Error("The captured image is too small for AI analysis."));
          return;
        }
        canvas.getContext("2d").drawImage(img, sx, sy, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
        resolve({
          dataUrl: canvas.toDataURL("image/png"),
          width: canvas.width,
          height: canvas.height
        });
      } catch (error) {
        reject(error);
      }
    };
    img.onerror = function () {
      reject(new Error("Could not capture the visible page image."));
    };
    img.src = screenshotUrl;
  });
}

async function normalizeReferenceImageForGeneration(capturedImage) {
  if (!capturedImage || !capturedImage.dataUrl) return capturedImage;
  if ((capturedImage.width || 0) >= 240 && (capturedImage.height || 0) >= 240) return capturedImage;
  return await new Promise(function (resolve, reject) {
    var img = new Image();
    img.onload = function () {
      try {
        var sourceWidth = img.naturalWidth || capturedImage.width || 240;
        var sourceHeight = img.naturalHeight || capturedImage.height || 240;
        var scale = Math.max(240 / sourceWidth, 240 / sourceHeight);
        var canvas = document.createElement("canvas");
        canvas.width = Math.round(sourceWidth * scale);
        canvas.height = Math.round(sourceHeight * scale);
        var ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve({
          dataUrl: canvas.toDataURL("image/png"),
          width: canvas.width,
          height: canvas.height
        });
      } catch (error) {
        reject(error);
      }
    };
    img.onerror = function () {
      reject(new Error("Could not normalize the reference image for generation."));
    };
    img.src = capturedImage.dataUrl;
  });
}

async function captureRenderedImageForVision(image) {
  try {
    var tab = await core.getActiveTab();
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"]
    });
  } catch (_injectError) {}
  var rectInfo = await core.sendToActiveTab("AUTOPUB_CAPTURE_IMAGE_RECT", { src: image.src, captureId: image.captureId || "" });
  if (rectInfo && rectInfo.error) throw new Error(rectInfo.error);
  if (!rectInfo || !rectInfo.rect) throw new Error("Could not capture the selected image from the page.");
  return await cropVisibleTabImage(rectInfo);
}

async function loadSourceImageForVision(image) {
  var dataUrl = await imageToDataUrl(image.src);
  return {
    dataUrl: dataUrl,
    width: image.width || null,
    height: image.height || null,
    sourceUrl: image.src,
    captureMethod: "source"
  };
}

async function getImageForVision(image) {
  try {
    var captured = await captureRenderedImageForVision(image);
    captured.sourceUrl = image.src;
    captured.captureMethod = "screenshot";
    return captured;
  } catch (captureError) {
    debugAi("Rendered screenshot failed; falling back to image source", {
      error: captureError.message || String(captureError),
      srcPreview: String(image.src || "").slice(0, 120)
    });
    try {
      return await loadSourceImageForVision(image);
    } catch (sourceError) {
      debugAi("Image source fallback failed; using provider source URL", {
        error: sourceError.message || String(sourceError),
        srcPreview: String(image.src || "").slice(0, 120)
      });
      return {
        dataUrl: null,
        width: image.width || null,
        height: image.height || null,
        sourceUrl: image.src,
        captureMethod: "provider-url"
      };
    }
  }
}

async function rasterizeImage(src) {
  return await new Promise(function (resolve, reject) {
    var img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = function () {
      try {
        var maxSide = 1200;
        var scale = Math.min(1, maxSide / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
        var canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round((img.naturalWidth || 512) * scale));
        canvas.height = Math.max(1, Math.round((img.naturalHeight || 512) * scale));
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/png"));
      } catch (_error) {
        reject(new Error("Could not prepare this image for AI analysis."));
      }
    };
    img.onerror = function () { reject(new Error("Could not load the selected image.")); };
    img.src = src;
  });
}

function getSelectedImages() {
  return Array.from(selectedIndexes).map(function (index) { return lastImages[index]; }).filter(Boolean);
}

function resetPrompt() {
  promptReady = false;
  promptReferenceImage = null;
  promptOutputEl.value = "";
  var existing = promptWorkspaceEl.querySelector(".gen-preview");
  if (existing) existing.remove();
  promptWorkspaceEl.hidden = true;
}

function returnToGallery() {
  selectedIndexes.clear();
  focusedIndex = null;
  resetPrompt();
  core.showState("results");
  setStatus(
    lastImages.length ? "Images ready." : "No images found.",
    lastImages.length ? "Select one image to reverse a prompt, or select multiple images to download." : "Click Refresh to scan this page again."
  );
  updateSelectionUi();
}

function setImageSelected(index, selected) {
  if (selected) selectedIndexes.add(index);
  else selectedIndexes.delete(index);
  focusedIndex = index;
  resetPrompt();
  updateSelectionUi();
}

function toggleImageSelected(index) {
  setImageSelected(index, !selectedIndexes.has(index));
}

function updateOverview() {
  var largeCount = lastImages.filter(isLargeImage).length;
  galleryTitleEl.textContent = lastImages.length ? "Images" : "No scan yet";
  gallerySubtitleEl.textContent = lastImages.length
    ? lastImages.length + " found / " + largeCount + " large"
    : "Scan the page first.";
}

function updateSelectionUi() {
  var selectedCount = selectedIndexes.size;
  selectionCountEl.textContent = selectedCount + " selected";
  selectionReverseBtn.hidden = selectedCount !== 1;
  selectionDownloadBtn.hidden = selectedCount <= 1;
  selectionGenerateBtn.hidden = !promptReady;
  selectionDownloadBtn.textContent = "Download " + selectedCount;

  selectionPanelEl.classList.toggle("is-empty", selectedCount === 0);
  selectionPanelEl.classList.toggle("is-single", selectedCount === 1);
  selectionPanelEl.classList.toggle("is-batch", selectedCount > 1);

  if (!lastImages.length) {
    selectionTitleEl.textContent = "Scan a page to collect images.";
    selectionHintEl.textContent = "The workflow has only three actions: scan, reverse prompt, generate image.";
  } else if (selectedCount === 0) {
    selectionTitleEl.textContent = "Select image assets.";
    selectionHintEl.textContent = "Select one image for prompt reverse. Select multiple images for batch download.";
  } else if (selectedCount === 1) {
    selectionTitleEl.textContent = "1 image selected.";
    selectionHintEl.textContent = promptReady
      ? "Prompt is ready. Generate a new image from it."
      : "Reverse this image into a generation prompt.";
  } else {
    selectionTitleEl.textContent = selectedCount + " images selected.";
    selectionHintEl.textContent = "Batch download is the only action for multiple selected images.";
  }

  document.querySelectorAll(".asset-card").forEach(function (card) {
    var index = Number(card.getAttribute("data-index"));
    card.classList.toggle("is-selected", selectedIndexes.has(index));
    card.classList.toggle("is-focused", focusedIndex === index);
    var checkbox = card.querySelector('input[type="checkbox"]');
    if (checkbox) checkbox.checked = selectedIndexes.has(index);
  });
  updateOverview();
}

function renderImages(images) {
  itemsEl.innerHTML = "";
  updateOverview();

  if (!images.length) {
    itemsEl.innerHTML = '<div class="glass-panel">No images found yet.</div>';
    updateSelectionUi();
    return;
  }

  images.forEach(function (image) {
    var index = image.pageIndex;
    var card = document.createElement("article");
    card.className = "asset-card";
    card.setAttribute("data-index", String(index));

    var thumb = document.createElement("div");
    thumb.className = "asset-thumb";
    var img = document.createElement("img");
    img.src = image.src;
    img.alt = "Page image " + (index + 1);
    img.loading = "lazy";
    img.referrerPolicy = "no-referrer";
    img.onerror = function () {
      thumb.textContent = "No preview";
    };
    thumb.append(img);

    var meta = document.createElement("div");
    meta.className = "asset-meta";
    var title = document.createElement("strong");
    title.textContent = getImageFormat(image.src) + " / " + (image.width && image.height ? image.width + "x" + image.height : "Unknown");
    var detail = document.createElement("span");
    detail.textContent = isLargeImage(image) ? "Large asset" : "Page asset";
    meta.append(title, detail);

    var actions = document.createElement("div");
    actions.className = "asset-actions";
    var checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.title = "Select";
    checkbox.checked = selectedIndexes.has(index);
    checkbox.addEventListener("click", function (event) {
      event.stopPropagation();
    });
    checkbox.addEventListener("change", function (event) {
      event.stopPropagation();
      setImageSelected(index, checkbox.checked);
    });
    actions.append(checkbox);

    card.addEventListener("click", function () {
      toggleImageSelected(index);
    });
    card.append(thumb, meta, actions);
    itemsEl.append(card);
  });

  updateSelectionUi();
}

function prepareImages(images) {
  lastImages = images.map(function (image, index) {
    return {
      src: image.src,
      width: image.width || null,
      height: image.height || null,
      kind: image.kind || "image",
      pageIndex: index,
      captureId: image.captureId || ""
    };
  });
}

async function scanImages(reason) {
  var requestId = ++scanRequestId;
  core.showState("loading");
  setStatus("Auto scanning...", reason ? "Finding page images after " + reason + "." : "Finding page images.");
  try {
    var tab = await core.getActiveTab();
    if (!isScannableUrl(tab.url)) {
      lastImages = [];
      selectedIndexes.clear();
      focusedIndex = null;
      resetPrompt();
      showError(
        "This page cannot be scanned.",
        "Open a normal http or https webpage. Chrome internal pages and extension pages cannot be scanned."
      );
      setStatus("Cannot scan this page.", "Chrome internal pages, extension pages, and local browser screens are not available to content scripts.");
      updateSelectionUi();
      return;
    }
    var response = await core.sendToActiveTab("AUTOPUB_SCAN_IMAGES");
    if (requestId !== scanRequestId) return;
    prepareImages((response && response.images) || []);
    selectedIndexes.clear();
    focusedIndex = null;
    resetPrompt();

    if (!lastImages.length) {
      core.showState("empty");
      setStatus("No images found.", "Try another product or content page.");
      renderImages([]);
      return;
    }

    core.showState("results");
    setStatus("Scan complete.", lastImages.length + " images found.");
    renderImages(lastImages);
  } catch (error) {
    if (requestId !== scanRequestId) return;
    showError(
      "Scan failed: " + normalizeErrorMessage(error),
      "Click Refresh after the page finishes loading. If the message mentions API request failed, start the AutoPub server and reload the extension."
    );
  }
}

function scheduleAutoScan(reason, delay) {
  console.debug("[AutoPub Visual] Auto scan scheduled:", reason);
  clearTimeout(autoScanTimer);
  autoScanTimer = setTimeout(function () {
    scanImages(reason);
  }, delay == null ? 250 : delay);
}

async function observeActiveTabForAutoScan(reason) {
  try {
    var tab = await core.getActiveTab();
    var tabIdChanged = observedTabId !== tab.id;
    var urlChanged = observedTabUrl !== (tab.url || "");
    var completedAfterLoading = observedTabStatus === "loading" && tab.status === "complete";
    var firstReadyTab = observedTabId == null && tab.status === "complete";
    observedTabId = tab.id;
    observedTabUrl = tab.url || "";
    observedTabStatus = tab.status || "";

    if (!isScannableUrl(tab.url)) return;
    if (!(tabIdChanged || urlChanged || completedAfterLoading || firstReadyTab)) return;

    var now = Date.now();
    if (now - lastPollScanAt < 900) return;
    lastPollScanAt = now;
    scheduleAutoScan(reason || "active page ready", 250);
  } catch (_error) {}
}

async function reverseSelectedPrompt() {
  await withCreditGate(2, "Reverse Prompt", async function () {
    var selected = getSelectedImages();
    if (selected.length !== 1) {
      setStatus("Choose one image.", "Prompt reverse works on exactly one selected image.");
      return;
    }
    var image = selected[0];
    core.showState("loading");
    setStatus("Reading image...", "Preparing the selected image for prompt reverse.");
    debugAi("Reverse prompt input", {
      width: image.width || null,
      height: image.height || null,
      kind: image.kind || "image",
      srcPreview: String(image.src || "").slice(0, 120)
    });
    var capturedImage = await getImageForVision(image);
    debugAi("Using image for reverse prompt", {
      method: capturedImage.captureMethod,
      width: capturedImage.width,
      height: capturedImage.height
    });
    var data = await core.runAiTask("visual_prompt", {
      image: {
        data_url: capturedImage.dataUrl,
        source_url: image.src,
        width: capturedImage.width || image.width || null,
        height: capturedImage.height || image.height || null
      },
      instruction: [
        "Reverse-engineer this image into a complete image-generation control prompt for style-faithful generation.",
        "Do not write a short caption. Extract every factor that affects whether the generated image matches the source image's visual language.",
        "Output in English as one production-ready prompt with these exact labeled sections:",
        "STYLE LOCK: name the exact visual style family in plain language, for example anime cel illustration, manga illustration, 2D vector UI graphic, photorealistic product photo, 3D render, screenshot, poster design, watercolor illustration, etc. This style lock is mandatory for generation.",
        "MEDIUM LOCK: state the exact medium and explicitly forbid converting it to another medium. If the source is anime, manga, illustration, cartoon, 3D render, screenshot, UI graphic, poster, or product photo, the output must remain that same medium. Never convert anime/illustration/cartoon into a live-action or photorealistic human photo.",
        "SUBJECT AND SCENE: describe the visual category, subject type, setting, platform context, and intended asset type.",
        "MEDIUM AND STYLE: identify whether it is photo, screenshot, UI graphic, poster, anime/cel illustration, manga illustration, cartoon, 3D render, collage, product/ad creative, social-media visual, etc. Preserve this medium exactly.",
        "COMPOSITION AND LAYOUT: describe aspect ratio feel, crop, framing, camera/view angle, subject placement logic, hierarchy, spacing, foreground/background structure, and any grid/UI/card/banner layout.",
        "COLOR AND LIGHTING: describe palette, contrast, exposure, shadows, highlights, gradients, atmosphere, and color temperature.",
        "TEXTURE AND QUALITY: describe sharpness, detail level, lens/rendering behavior, noise/grain, material texture, edge quality, and resolution feel. Require crisp high-resolution output, not blurry or softened.",
        "TYPOGRAPHY AND TEXT RULES: if text, labels, captions, posters, UI words, or logos appear, describe the typography style and placement, but explicitly require new wording or abstract placeholder text, a different font family, different weight, different letter spacing, different scale, and different text placement. Never copy exact text, logos, or font.",
        "MUST PRESERVE: list the style anchors that must stay the same: medium, genre, platform aesthetic, campaign feel, palette, lighting, composition logic, detail level, and visual mood.",
        "MUST CHANGE: list the elements that must change: exact composition, exact text, exact typography, logos, faces, pose, object placement, UI layout, and watermark.",
        "NEGATIVE PROMPT: avoid style drift, blurry output, generic stock image, medium switch, photorealistic/live-action conversion when the source is anime or illustration, anime/cartoon conversion when the source is a photo, cartoonization, repainting, softened details, copied typography, copied text, copied logo, copied watermark, copied layout, near-duplicate composition.",
        "The generated image should be a new asset in the same visual system, not a duplicate.",
        "Output only the labeled prompt. No explanation outside the prompt."
      ].join(" ")
    });
    promptReady = true;
    if (capturedImage.dataUrl) {
      var generationReference = await normalizeReferenceImageForGeneration(capturedImage);
      promptReferenceImage = generationReference.dataUrl;
      debugAi("Generation reference image", { width: generationReference.width, height: generationReference.height });
    } else {
      promptReferenceImage = image.src;
      debugAi("Generation reference image uses source URL", { srcPreview: String(image.src || "").slice(0, 120) });
    }
    promptOutputEl.value = data.output.prompt || data.output.summary || "";
    promptWorkspaceEl.hidden = false;
    debugAi("Reverse prompt output", {
      cost: data.cost,
      model: data.output.model,
      usage: data.output.usage,
      prompt: promptOutputEl.value
    });
    core.showState("results");
    setStatus("Prompt ready.", (data.output.model ? data.output.model + " / " : "") + "Generate a new image from this prompt.");
    updateSelectionUi();
  });
}

function renderGeneratedImage(output) {
  var existing = promptWorkspaceEl.querySelector(".gen-preview");
  if (existing) existing.remove();
  var preview = document.createElement("div");
  preview.className = "gen-preview";
  (output.images || []).forEach(function (url, index) {
    var item = document.createElement("div");
    item.className = "gen-image-item";
    var img = document.createElement("img");
    img.src = url;
    img.alt = "Generated image";
    var button = document.createElement("button");
    button.className = "primary-button";
    button.textContent = "Download generated";
    button.addEventListener("click", function () {
      downloadImage(url, index);
    });
    item.append(img, button);
    preview.append(item);
  });
  promptWorkspaceEl.append(preview);
}

async function generateNewImage() {
  await withCreditGate(8, "Generate Image", async function () {
    var prompt = promptOutputEl.value.trim();
    if (!prompt) {
      setStatus("Prompt is empty.", "Reverse one selected image first.");
      return;
    }
    core.showState("loading");
    setStatus("Generating...", "Creating a new image from the prompt.");
    debugAi("Generate image input", { prompt: prompt });
    var data = await core.runAiTask("image_generation", {
      ref_image: USE_REFERENCE_IMAGE_FOR_GENERATION ? promptReferenceImage : null,
      reference_mode: "style_variation",
      prompt: [
        "STYLE AND MEDIUM ARE LOCKED. The generated image must keep the same medium/style family identified in STYLE LOCK and MEDIUM LOCK.",
        "If the source/control prompt says anime, manga, cel illustration, illustration, cartoon, 3D render, screenshot, UI graphic, poster, or product photo, the output must remain that exact medium family.",
        "Never convert anime, manga, illustration, or cartoon into a real human photo, live-action photography, realistic portrait, cinematic still, or stock photo.",
        "Never convert a real photo into anime, cartoon, painting, or 3D unless the control prompt explicitly says the source is that medium.",
        "Use the following reverse-engineered control prompt as the source of truth for generation.",
        "Follow every section, especially STYLE LOCK, MEDIUM LOCK, MEDIUM AND STYLE, COMPOSITION AND LAYOUT, COLOR AND LIGHTING, TEXTURE AND QUALITY, TYPOGRAPHY AND TEXT RULES, MUST PRESERVE, MUST CHANGE, and NEGATIVE PROMPT.",
        "The attached reference image is only to verify the extracted visual system. Do not copy it exactly.",
        "Create one sharp, high-resolution new asset in the same visual system.",
        prompt,
        "Final hard rules: preserve style and quality; change exact content, typography, text, logo, layout, and composition enough that this is a new usable asset."
      ].join(" ")
    });
    if (data.output.images && data.output.images.length) renderGeneratedImage(data.output);
    debugAi("Generate image output", {
      cost: data.cost,
      model: data.output.model,
      taskId: data.output.taskId,
      images: data.output.images || []
    });
    core.showState("results");
    setStatus(
      "Image generated.",
      (data.output.model ? data.output.model + (data.output.taskId ? " / " + data.output.taskId : "") : "Generation complete.")
    );
  });
}

async function downloadSelected() {
  var selected = getSelectedImages();
  if (selected.length <= 1) {
    setStatus("Select multiple images.", "Batch download starts when more than one image is selected.");
    return;
  }
  if (selected.length > MAX_BATCH_DOWNLOADS) {
    setStatus("Batch limit reached.", "Select up to " + MAX_BATCH_DOWNLOADS + " images per batch.");
    return;
  }
  setStatus("Starting downloads...", "0 / " + selected.length + " images queued.");
  selectionDownloadBtn.disabled = true;
  var started = 0;
  for (var i = 0; i < selected.length; i++) {
    var ok = await downloadImage(selected[i].src, i);
    if (ok) started += 1;
    summaryEl.textContent = started + " / " + selected.length + " downloads started.";
  }
  selectionDownloadBtn.disabled = false;
  setStatus(
    started === selected.length ? "Downloads started." : "Some downloads failed.",
    started + " / " + selected.length + " images sent to Chrome downloads."
  );
}

selectionReverseBtn.addEventListener("click", reverseSelectedPrompt);
selectionDownloadBtn.addEventListener("click", downloadSelected);
selectionGenerateBtn.addEventListener("click", generateNewImage);
promptBackBtn.addEventListener("click", returnToGallery);
document.querySelector("#manual-refresh").addEventListener("click", function () {
  selectedIndexes.clear();
  focusedIndex = null;
  resetPrompt();
  updateSelectionUi();
  core.showState("loading");
  setStatus("Refreshing...", "Rescanning the current page.");
  scheduleAutoScan("manual refresh", 0);
});

chrome.tabs.onActivated.addListener(function () {
  observeActiveTabForAutoScan("tab switch");
});

chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
  core.getActiveTab().then(function (activeTab) {
    if (activeTab.id !== tabId) return;
    observedTabStatus = changeInfo.status || observedTabStatus;
    if (changeInfo.status === "loading") {
      resetPrompt();
      selectedIndexes.clear();
      focusedIndex = null;
      updateSelectionUi();
      setStatus("Page loading...", "AutoPub will scan when the page finishes loading.");
      return;
    }
    if (changeInfo.status === "complete") scheduleAutoScan("page load", 350);
    else if (tab && tab.url) observeActiveTabForAutoScan("page update");
  }).catch(function () {});
});

window.addEventListener("focus", function () {
  observeActiveTabForAutoScan("panel focus");
});

document.addEventListener("visibilitychange", function () {
  if (!document.hidden) observeActiveTabForAutoScan("panel visible");
});

document.querySelector("#upgrade-modal-close").addEventListener("click", function () {
  document.querySelector("#upgrade-modal").hidden = true;
});
document.querySelector("#btn-login").addEventListener("click", function () {
  core.openLogin("visual-extension");
});
document.querySelector("#btn-register").addEventListener("click", function () {
  core.openRegister("visual-extension");
});
document.querySelector("#btn-logout").addEventListener("click", async function () {
  try {
    await core.postJson("/api/auth/logout", {});
  } catch (_error) {}
  await chrome.storage.local.remove(["autopub_session", "autopub_entitlements"]);
  currentEntitlements = getFallbackEntitlements(null);
  updateAccountUi(null, currentEntitlements);
  setStatus("Signed out.", "Guest mode is active.");
});

chrome.storage.onChanged.addListener(function (changes, area) {
  if (area !== "local") return;
  if (changes.autopub_session || changes.autopub_entitlements) loadSession();
});

loadSession();
updateOverview();
updateSelectionUi();
scheduleAutoScan("open", 50);
observeActiveTabForAutoScan("open");
setInterval(function () {
  observeActiveTabForAutoScan("page observer");
}, 2500);
