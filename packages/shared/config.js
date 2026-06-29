export const PLAN_LIMITS = {
  anonymous: {
    credits: 3,
    dailyCredits: 0,
    visualBatchLimit: 50,
    monitoredUrls: 0,
    aiDailyLimit: 3,
    features: ["scan", "single_download"]
  },
  free: {
    credits: 0,
    dailyCredits: 3,
    visualBatchLimit: 200,
    monitoredUrls: 3,
    aiDailyLimit: 3,
    features: ["scan", "single_download", "basic_report"]
  },
  pro: {
    credits: 500,
    dailyCredits: 0,
    visualBatchLimit: 1000,
    monitoredUrls: 25,
    aiDailyLimit: 100,
    features: ["scan", "bulk_download", "ai_prompt", "ai_generation", "export", "monitoring"]
  },
  pro_plus: {
    credits: 2000,
    dailyCredits: 0,
    visualBatchLimit: 5000,
    monitoredUrls: 100,
    aiDailyLimit: 500,
    features: ["scan", "bulk_download", "ai_prompt", "ai_generation", "export", "monitoring", "deep_analysis"]
  }
};

export const EXTENSIONS = [
  "visual-extension",
  "video-extension",
  "seo-audit-extension",
  "competitor-monitor-extension"
];

/*
 * FUTURE_EXTENSIONS — reserved extension slots for V1.1 / V2.
 * These names are reserved in:
 *   - extension_login_codes.extension_id
 *   - plugin_usage_logs.plugin
 *   - the build/lint/package scripts (which iterate EXTENSIONS + FUTURE_EXTENSIONS)
 * To activate a future extension:
 *   1. Move its name from FUTURE_EXTENSIONS to EXTENSIONS
 *   2. Create apps/<name>/ with manifest.json, popup.html, popup.js, background.js, content.js, styles.css, icon.svg
 *   3. Add its AI task costs to packages/ai/provider.js COSTS
 *   4. Run npm run build
 */
export const FUTURE_EXTENSIONS = [
  "keyword-research-extension",
  "backlink-monitor-extension",
  "content-planner-extension",
  "social-analyzer-extension",
  "schema-generator-extension"
];

export const V2_RESERVED = ["project_id", "site_url", "audit_task_id", "report_id", "content_plan_id", "publish_queue_id"];

export function getPublicConfig() {
  return {
    appBaseUrl: process.env.APP_BASE_URL || "http://localhost:4173",
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    mockMode: process.env.MOCK_MODE === "true"
  };
}

export function requireServerEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error("Missing required server environment variable: " + name);
  }
  return value;
}
