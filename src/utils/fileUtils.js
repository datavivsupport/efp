export const extensionToMime = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  txt: "text/plain",
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

  "application/pdf": "pdf",

  "application/zip": "zip",

  "application/vnd.ms-outlook": "msg",
  "application/msg": "msg",
  "message/rfc822": "eml",
  "application/eml": "eml",

  "application/msword": "word",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "word",

  "application/vnd.ms-excel": "excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "excel",

  "text/plain": "text",
  "text/csv": "excel",
};

export const getFileCategory = (fileTypeOrUrl) => {
  if (!fileTypeOrUrl) return "other";
  const lower = fileTypeOrUrl.toLowerCase();
  const ext = lower.split("?")[0].split(".").pop() || "";
  const mime = extensionToMime[ext] || lower;
  return MIME_CATEGORY[mime] || "other";
};
