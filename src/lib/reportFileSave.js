export async function saveBytesWithDialog({ fileName, mimeType, bytes, nativeDialog }) {
  if (window.navigator?.userActivation?.isActive === false) {
    throw new DOMException('保存ボタンから操作してください。', 'SecurityError');
  }

  const blob = new Blob([bytes], { type: mimeType });

  if (typeof window.showSaveFilePicker === 'function') {
    const extension = fileName.endsWith('.docx') ? '.docx' : '.json';
    let handle;
    try {
      handle = await window.showSaveFilePicker({
        id: 'monogatari-buzz-report',
        startIn: 'downloads',
        suggestedName: fileName,
        types: [
          {
            description: extension === '.docx' ? 'Word文書' : 'JSONファイル',
            accept: {
              [mimeType.split(';')[0]]: [extension],
            },
          },
        ],
      });
    } catch (error) {
      // A browser can expose the picker even when this page cannot open it.
      if (error?.name !== 'NotSupportedError') throw error;
    }

    if (handle) {
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return { mode: 'picker', fileName };
    }
  }

  if (nativeDialog) {
    const result = await saveViaNativeDialog({
      fileName,
      mimeType,
      contentBase64: bytesToBase64(bytes),
    });
    if (result?.cancelled) throw new DOMException('Save cancelled', 'AbortError');
    if (result) return { mode: 'native', fileName: result.fileName ?? fileName };
  }

  return saveWithBrowserDownload({ fileName, blob });
}

async function saveViaNativeDialog(payload) {
  const response = await fetch('/api/save-file-dialog', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (response.status === 404 || response.status === 501) return null;
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.ok) {
    throw new Error(result.error ?? 'HTTP ' + response.status);
  }
  return result;
}

function saveWithBrowserDownload({ fileName, blob }) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  try {
    link.click();
  } finally {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
  return { mode: 'download', fileName };
}

function bytesToBase64(bytes) {
  let binary = '';
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.slice(index, index + chunkSize));
  }
  return btoa(binary);
}
