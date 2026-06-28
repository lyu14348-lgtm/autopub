export function createLogEvent({ userId, anonymousId, plugin, eventName, metadata = {} }) {
  return {
    user_id: userId || null,
    anonymous_id: anonymousId || null,
    plugin,
    event_name: eventName,
    metadata,
    created_at: new Date().toISOString()
  };
}

export function logError(error, context = {}) {
  return {
    level: "error",
    message: error?.message || String(error),
    context,
    created_at: new Date().toISOString()
  };
}

