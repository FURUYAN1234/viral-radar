export function loadSettingsFromStorage(serializedSettings) {
  // Parse legacy payloads only to tolerate malformed values; secret fields are intentionally discarded.
  parseStoredSettings(serializedSettings);
  return {
    apiKey: '',
    rememberKeys: false,
    openaiKey: '',
    geminiKey: '',
  };
}

export function settingsForStorage() {
  return {
    rememberKeys: false,
  };
}

function parseStoredSettings(serializedSettings) {
  if (!serializedSettings) return {};
  try {
    return JSON.parse(serializedSettings) ?? {};
  } catch {
    return {};
  }
}
