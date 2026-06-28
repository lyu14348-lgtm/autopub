var core = window.AutoPubExtension;
var statusEl = document.querySelector("#status");
var resultEl = document.querySelector("#result");
var urlEl = document.querySelector("#url");

document.querySelector("#scan").addEventListener("click", async function() {
  core.showState("loading");
  statusEl.textContent = "Scanning page video metadata...";
  try {
    var response = await core.sendToActiveTab("AUTOPUB_SCAN_VIDEO");
    urlEl.value = response?.video?.src || "";
    resultEl.textContent = response?.video ? "Detected: " + (response.video.title || response.video.src) : "No public video metadata found.";
    core.showState("results");
    statusEl.textContent = "Scan complete.";
  } catch (error) {
    core.showState("error");
    document.querySelector("#error-msg").textContent = "Scan failed: " + error.message;
  }
});

document.querySelector("#analyze").addEventListener("click", async function() {
  var url = urlEl.value.trim();
  if (!url) { statusEl.textContent = "Enter a video URL first."; return; }
  core.showState("loading");
  statusEl.textContent = "Checking credits...";
  try {
    var data = await core.runAiTask("video_analysis", { url: url });
    resultEl.textContent = data.output.summary;
    core.showState("results");
    statusEl.textContent = "Analysis complete. Credits used: " + data.cost;
  } catch (error) {
    core.showState("error");
    document.querySelector("#error-msg").textContent = "Analysis failed: " + error.message;
  }
});

document.querySelector("#upgrade").addEventListener("click", function() { core.openUpgrade("video-extension"); });
document.querySelector("#btn-retry").addEventListener("click", async function() {
  document.querySelector("#analyze").click();
});
