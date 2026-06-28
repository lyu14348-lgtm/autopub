var core = window.AutoPubExtension;
var statusEl = document.querySelector("#status");
var resultEl = document.querySelector("#result");
var lastComparison = null;

async function snapshot() {
  return core.sendToActiveTab("AUTOPUB_COMPETITOR_SNAPSHOT");
}

document.querySelector("#capture").addEventListener("click", async function() {
  core.showState("loading");
  statusEl.textContent = "Capturing snapshot...";
  try {
    var snap = await snapshot();
    var key = "snapshot:" + snap.url;
    var item = {};
    item[key] = snap;
    await chrome.storage.local.set(item);
    resultEl.textContent = "Saved snapshot for " + (snap.title || snap.url);
    core.showState("results");
    statusEl.textContent = "Snapshot saved.";
  } catch (error) {
    core.showState("error");
    document.querySelector("#error-msg").textContent = "Capture failed: " + error.message;
  }
});

document.querySelector("#compare").addEventListener("click", async function() {
  core.showState("loading");
  statusEl.textContent = "Comparing...";
  try {
    var current = await snapshot();
    var key = "snapshot:" + current.url;
    var stored = (await chrome.storage.local.get(key))[key];
    if (!stored) {
      resultEl.textContent = "No previous snapshot for this URL. Capture first.";
      core.showState("results");
      statusEl.textContent = "Empty state.";
      return;
    }
    var changes = [];
    var fields = ["title", "description", "h1", "priceText", "ctaText"];
    for (var i = 0; i < fields.length; i++) {
      if ((stored[fields[i]] || "") !== (current[fields[i]] || "")) changes.push(fields[i]);
    }
    lastComparison = {
      changed_fields: changes,
      previous: stored,
      current: current
    };
    var comparisonText = changes.length ? "Changed fields: " + changes.join(", ") : "No major changes detected.";
    resultEl.textContent = changes.length ? comparisonText + ". Use AI Summary for Pro analysis." : comparisonText;
    core.showState("results");
    statusEl.textContent = "Compare complete.";
  } catch (error) {
    core.showState("error");
    document.querySelector("#error-msg").textContent = "Compare failed: " + error.message;
  }
});

document.querySelector("#ai").addEventListener("click", async function() {
  core.showState("loading");
  statusEl.textContent = "Generating AI summary...";
  try {
    if (!lastComparison) {
      statusEl.textContent = "Run Compare before requesting an AI summary.";
      core.showState("results");
      return;
    }
    var data = await core.runAiTask("competitor_summary", { comparison: lastComparison });
    resultEl.textContent = data.output.summary;
    core.showState("results");
    statusEl.textContent = "AI summary ready. Credits used: " + data.cost;
  } catch (error) {
    core.showState("error");
    document.querySelector("#error-msg").textContent = "AI failed: " + error.message;
  }
});

document.querySelector("#upgrade").addEventListener("click", function() { core.openUpgrade("competitor-monitor-extension"); });
document.querySelector("#btn-retry").addEventListener("click", function() { document.querySelector("#compare").click(); });
