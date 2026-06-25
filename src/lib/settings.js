export function loadSettingsFromStorage(serializedSettings) {
  const stored = parseStoredSettings(serializedSettings);
  return {
    apiKey: stored.apiKey ?? stored.openaiKey ?? stored.geminiKey ?? '',
    rememberKeys: true,
    openaiKey: '',
    geminiKey: '',
  };
}

export function settingsForStorage(settings) {
  return {
    apiKey: settings.apiKey ?? '',
    rememberKeys: true,
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
