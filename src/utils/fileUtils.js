export const extensionToMime = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  bmp: "image/bmp",
  svg: "image/svg+xml",
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  xlsm: "application/vnd.ms-excel.sheet.macroEnabled.12",
  xlsb: "application/vnd.ms-excel.sheet.binary.macroEnabled.12",
  txt: "text/plain",
  log: "text/plain",
  json: "application/json",
  xml: "text/xml",
  csv: "text/csv",
  zip: "application/zip",
  msg: "application/vnd.ms-outlook",
  eml: "message/rfc822",
};

export const MIME_CATEGORY = {
  "image/jpeg": "image",
  "image/jpg": "image",
  "image/png": "image",
  "image/gif": "image",
  "image/webp": "image",
  "image/bmp": "image",
  "image/svg+xml": "image",

  "application/pdf": "pdf",

  "application/zip": "zip",
  "application/x-zip-compressed": "zip",

  "application/vnd.ms-outlook": "msg",
  "application/msg": "msg",
  "message/rfc822": "eml",
  "application/eml": "eml",

  // Word and PowerPoint both render through the Office Online viewer
  "application/msword": "word",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "word",
  "application/vnd.ms-powerpoint": "word",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "word",

  "application/vnd.ms-excel": "excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "excel",
  "application/vnd.ms-excel.sheet.macroEnabled.12": "excel",
  "application/vnd.ms-excel.sheet.binary.macroEnabled.12": "excel",

  "text/plain": "text",
  "text/xml": "text",
  "application/json": "text",
  // Office Online cannot open CSV, so it is shown as a table by the text pane
  "text/csv": "text",
};

export const getFileCategory = (fileTypeOrUrl) => {
  if (!fileTypeOrUrl) return "other";
  const lower = fileTypeOrUrl.toLowerCase();
  const ext = lower.split("?")[0].split(".").pop() || "";
  const mime = extensionToMime[ext] || lower;
  if (MIME_CATEGORY[mime]) return MIME_CATEGORY[mime];
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("text/")) return "text";
  return "other";
};

/**
 * Pick the first hint (mime type, file name, url) that maps to a known
 * category. Saved documents often carry no mime type, and local blob: URLs
 * have no extension, so falling through to the name/url keeps the type.
 */
export const resolveFileType = (...hints) =>
  hints.find((h) => h && getFileCategory(h) !== "other") || hints.find(Boolean) || "";
