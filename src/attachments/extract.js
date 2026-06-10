const MIME_EXTENSION_PRIORITY = [
  ["image/png", ".png"],
  ["image/jpeg", ".jpg"],
  ["image/gif", ".gif"],
  ["image/webp", ".webp"],
  ["image/svg+xml", ".svg"],
];

function extractAttachments(ipynbBytes, options = {}) {
  const parsed = parseNotebook(ipynbBytes);
  const now = options.now instanceof Date ? options.now : new Date();
  const takenAssetPaths = new Set(normalizeTakenAssetPaths(options.takenAssetPaths));
  const nextJson = cloneJson(parsed);
  const assets = [];

  for (const cell of nextJson.cells || []) {
    if (cell?.cell_type !== "markdown" || !cell.attachments || typeof cell.attachments !== "object") {
      continue;
    }

    if (Object.keys(cell.attachments).length === 0) {
      delete cell.attachments;
      continue;
    }

    const originalSource = normalizeSource(cell.source);
    let nextSource = originalSource;
    let changed = false;

    for (const [attachmentName, attachmentValue] of Object.entries(cell.attachments)) {
      const { bytes, extension, mimeType } = decodeAttachment(attachmentName, attachmentValue);
      const assetPath = allocateAssetPath({
        now,
        extension,
        takenAssetPaths,
      });

      const attachmentReference = `attachment:${attachmentName}`;
      if (nextSource.includes(attachmentReference)) {
        nextSource = nextSource.split(attachmentReference).join(assetPath);
        changed = true;
      }

      assets.push({
        path: assetPath,
        bytes,
        mimeType,
      });
    }

    if (!changed) {
      throw new Error("Notebook cell contains attachments that are not referenced from the markdown source.");
    }

    cell.source = reserializeSource(cell.source, nextSource);
    delete cell.attachments;
    if (cell.attachments && Object.keys(cell.attachments).length === 0) {
      delete cell.attachments;
    }
  }

  return {
    nextJson,
    assets,
  };
}

function parseNotebook(ipynbBytes) {
  if (typeof ipynbBytes === "string") {
    return JSON.parse(ipynbBytes);
  }

  if (Buffer.isBuffer(ipynbBytes) || ipynbBytes instanceof Uint8Array) {
    return JSON.parse(Buffer.from(ipynbBytes).toString("utf8"));
  }

  if (ipynbBytes && typeof ipynbBytes === "object") {
    return cloneJson(ipynbBytes);
  }

  throw new Error("Unsupported notebook input type.");
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeTakenAssetPaths(paths) {
  return Array.isArray(paths)
    ? paths
        .map((item) => String(item || "").replaceAll("\\", "/").trim())
        .filter(Boolean)
    : [];
}

function normalizeSource(source) {
  if (Array.isArray(source)) {
    return source.join("");
  }

  return String(source || "");
}

function reserializeSource(originalSource, nextSource) {
  return Array.isArray(originalSource)
    ? nextSource.split(/(?<=\n)/)
    : nextSource;
}

function decodeAttachment(attachmentName, attachmentValue) {
  if (!attachmentValue || typeof attachmentValue !== "object" || Array.isArray(attachmentValue)) {
    throw new Error(`Attachment "${attachmentName}" has an invalid MIME map.`);
  }

  const mimeType = selectMimeType(Object.keys(attachmentValue));
  const base64 = attachmentValue[mimeType];
  if (typeof base64 !== "string" || !base64.trim()) {
    throw new Error(`Attachment "${attachmentName}" is missing base64 data for MIME "${mimeType}".`);
  }

  return {
    bytes: Buffer.from(base64, "base64"),
    extension: extensionForMimeType(mimeType),
    mimeType,
  };
}

function selectMimeType(mimeTypes) {
  for (const [mimeType] of MIME_EXTENSION_PRIORITY) {
    if (mimeTypes.includes(mimeType)) {
      return mimeType;
    }
  }

  const unsupported = mimeTypes.join(", ") || "<none>";
  throw new Error(`Unsupported attachment MIME type(s): ${unsupported}`);
}

function extensionForMimeType(mimeType) {
  const match = MIME_EXTENSION_PRIORITY.find(([candidate]) => candidate === mimeType);
  if (!match) {
    throw new Error(`Unsupported attachment MIME type: ${mimeType}`);
  }

  return match[1];
}

function allocateAssetPath({ now, extension, takenAssetPaths }) {
  const timestamp = formatTimestamp(now);
  const basePath = `./assets/paste-${timestamp}${extension}`;
  let candidate = basePath;
  let counter = 2;

  while (takenAssetPaths.has(candidate)) {
    candidate = `./assets/paste-${timestamp}-${counter}${extension}`;
    counter += 1;
  }

  takenAssetPaths.add(candidate);
  return candidate;
}

function formatTimestamp(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  const second = String(date.getSeconds()).padStart(2, "0");
  return `${year}${month}${day}-${hour}${minute}${second}`;
}

module.exports = {
  extractAttachments,
  formatTimestamp,
  normalizeSource,
};
