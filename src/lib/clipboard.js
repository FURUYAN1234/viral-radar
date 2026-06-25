export async function copyTextToClipboard(text, clipboardApi = globalThis.navigator?.clipboard) {
  if (!clipboardApi?.writeText) {
    return { ok: false, reason: 'clipboard-unavailable' };
  }

  try {
    await clipboardApi.writeText(text);
    return { ok: true };
  } catch (error) {
    if (error?.name === 'NotAllowedError') {
      return { ok: false, reason: 'clipboard-denied' };
    }
    return { ok: false, reason: 'clipboard-error', message: error?.message ?? 'Clipboard write failed.' };
  }
}
