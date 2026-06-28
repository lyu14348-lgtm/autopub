var core = window.AutoPubExtension;
var statusEl = document.querySelector("#status");
var scoreEl = document.querySelector("#score");
var issuesEl = document.querySelector("#issues");
var reportText = "";

document.querySelector("#audit").addEventListener("click", async function() {
  core.showState("loading");
  statusEl.textContent = "Auditing...";
  try {
    var response = await core.sendToActiveTab("AUTOPUB_SEO_AUDIT");
    var issues = response.issues || [];
    scoreEl.textContent = response.score;
    issuesEl.innerHTML = "";
    for (var i = 0; i < issues.length; i++) {
      var li = document.createElement("li");
      li.textContent = issues[i].level + ": " + issues[i].message;
      issuesEl.append(li);
    }
    reportText = "SEO score: " + response.score + "\n" + issues.map(function(issue) { return "- " + issue.level + ": " + issue.message; }).join("\n");
    core.showState("results");
    statusEl.textContent = issues.length ? "Audit complete with issues." : "Audit complete with no major issues.";
  } catch (error) {
    core.showState("error");
    document.querySelector("#error-msg").textContent = "Audit failed: " + error.message;
  }
});

document.querySelector("#ai").addEventListener("click", async function() {
  if (!reportText) {
    statusEl.textContent = "Run an audit before requesting AI suggestions.";
    return;
  }
  core.showState("loading");
  statusEl.textContent = "Generating AI suggestions...";
  try {
    var data = await core.runAiTask("seo_fix", { report: reportText || "No audit report yet." });
    reportText = reportText + "\n\nAI suggestions:\n" + data.output.summary;
    core.showState("results");
    statusEl.textContent = "AI suggestions ready. Credits used: " + data.cost;
  } catch (error) {
    core.showState("error");
    document.querySelector("#error-msg").textContent = "AI failed: " + error.message;
  }
});

document.querySelector("#copy").addEventListener("click", async function() {
  await navigator.clipboard.writeText(reportText || "Run an audit first.");
  statusEl.textContent = "Report copied.";
});

document.querySelector("#upgrade").addEventListener("click", function() { core.openUpgrade("seo-audit-extension"); });
document.querySelector("#btn-retry").addEventListener("click", function() { document.querySelector("#audit").click(); });
