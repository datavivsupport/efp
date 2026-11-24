

const createdAtMs = (file) => {
  const t = new Date(file?.created_at || 0).getTime();
  return Number.isFinite(t) ? t : 0;
};

/** Additional (non-original) files within one doc-type bucket, e.g. all LPO files. */
export const getAdditionalDocs = (files) => {
  if (!Array.isArray(files) || files.length <= 1) return [];
  const sorted = [...files].sort((a, b) => createdAtMs(a) - createdAtMs(b) || (a.id ?? 0) - (b.id ?? 0));
  return sorted.slice(1);
};


export const isDocPendingApproval = (file) => file?.is_cs_hod_approved === false;


export const isMandatoryDocDeleteLocked = (file, submitted, submittedAtStage) =>
  !!file?.is_cs_hod_approved ||
  (submitted && (parseInt(file?.stage_uploaded, 10) || 0) <= submittedAtStage);
