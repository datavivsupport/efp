/**
 * Validates form values before performing an "Approved" action.
 *
 * Returns an error string if validation fails, or null if everything is OK.
 *
 * @param {object} values        - Antd form values
 * @param {object} ctx           - context flags & file arrays
 */
export const validateApprovalAction = (values, ctx) => {
  const {
    stage,
    isCS,
    isCNF,
    isForwarding,
    isLiner,
    needsLpoInvoice,
    releaseOrderFiles,
    lpoFiles,
    invoiceFiles,
    haulageCostFiles,
    haulierNoteFiles,
    loadListFiles,
  } = ctx;

  // ── Stage 2: CS must fill booking + upload RO ──────────────────────────────
  if (stage === "2" && isCS) {
    const missing = [];
    if (!values.afsys_job_no)       missing.push("AFSYS Job No.");
    if (!values.booking_vessel)     missing.push("Booking Vessel");
    if (!values.booking_voyage)     missing.push("Booking Voyage");
    if (!values.vessel_eta)         missing.push("Vessel ETA Date");
    if (!values.vsl_initial_eta)    missing.push("Initial ETA");
    if (!values.vsl_latest_eta)     missing.push("Latest ETA");
    if (!values.vsl_etd)            missing.push("ETD");
    if (!values.pod_eta)            missing.push("POD ETA");
    if (!values.booking_ref_no)     missing.push("Booking Reference No.");
    if (!values.ll_cut_off_datetime) missing.push("Load List Cut-Off Date & Time");
    if (!values.si_cut_off_date)    missing.push("SI Cut-Off Date & Time");
    if (!releaseOrderFiles.length)  missing.push("Release Order");
    if (missing.length) {
      return `Please fill/upload required fields: ${missing.join(", ")}`;
    }
  }

  // ── LPO / Invoice requirement ──────────────────────────────────────────────
  if (needsLpoInvoice && isCS) {
    const missing = [];
    if (!lpoFiles.length)     missing.push("LPO");
    if (!invoiceFiles.length) missing.push("Invoice");
    if (!values.cs_hod)       missing.push("CS HOD");
    if (missing.length) {
      return `Required at this stage: ${missing.join(", ")}`;
    }
  } else if (needsLpoInvoice && (!lpoFiles.length || !invoiceFiles.length)) {
    return "LPO and Invoice are required for Stage 4 and Stage 5";
  }

  // ── Forwarding-specific validations ───────────────────────────────────────
  if (isForwarding) {
    if (stage === "3" && !values.afsys_job_no) {
      return "AFSYS Job No. is required for Stage 3";
    }
    if (stage === "3" && isCNF) {
      const missing = [];
      if (!haulierNoteFiles.length) missing.push("Haulier Note");
      if (!loadListFiles.length)    missing.push("Load List");
      if (missing.length) {
        return `Please upload required CNF documents: ${missing.join(", ")}`;
      }
    }
    if (stage === "4" && isCNF) {
      const missing = [];
      if (!haulierNoteFiles.length) missing.push("Haulier Note");
      if (!loadListFiles.length)    missing.push("Load List");
      if (missing.length) {
        return `Please upload required CNF documents: ${missing.join(", ")}`;
      }
    }
    return null;
  }

  // ── Liner-specific validations ─────────────────────────────────────────────
  if (isLiner) {
    if (stage === "3" && !values.afsys_job_no) {
      return "AFSYS Job No. is required for Stage 3";
    }
    return null;
  }

  // ── Generic (all other job types) ─────────────────────────────────────────
  if (stage === "3" && !values.afsys_job_no) {
    return "AFSYS Job No. is required";
  }

  return null;
};
