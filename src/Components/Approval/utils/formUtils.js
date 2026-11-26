
export const normalizeBoolean = (val, initial) => {
  const parse = (v) => {
    if (v === true  || v === "true"  || v === "Yes" || v === "yes") return true;
    if (v === false || v === "false" || v === "No"  || v === "no")  return false;
    return null;
  };
  const parsed = parse(val);
  if (parsed !== null) return parsed;
  return parse(initial) === true;
};

/**
 * Liner / Cross Trade Yes/No switches are saved only by Save / Submit / Verify & Confirm, while an
 * upload is saved at once. A slot that already holds files therefore opens on Yes, so a page refresh
 * before saving can't flip it back to No (which would also close the slot and hide its Delete icon).
 * @param fileLists     partitionDocuments() result
 * @param switchToFiles { switchFieldName: fileListKey }
 * @returns             { switchFieldName: true } for every slot that has files
 */
export const yesWhereFilesExist = (fileLists, switchToFiles) =>
  Object.fromEntries(
    Object.entries(switchToFiles)
      .filter(([, filesKey]) => fileLists?.[filesKey]?.length > 0)
      .map(([field]) => [field, true])
  );
