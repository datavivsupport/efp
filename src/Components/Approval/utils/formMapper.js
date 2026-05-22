import dayjs from "dayjs";

/**
 * Maps a job API response object to Antd form field values.
 * Used inside fetchJobDetails → form.setFieldsValue(mapJobToFormValues(data))
 */
export const mapJobToFormValues = (data) => ({
  export_number:          data.export_number || "N/A",
  export_created_date:    data.export_created_date ? dayjs(data.export_created_date) : null,
  created_by_name:        data.created_by_name || "N/A",
  carrier_name:           data.carrier_name,
  customer_name:          data.customer_name,
  contact_pic:            data.contact_pic,
  phone_no:               data.phone_no,
  email:                  data.email,
  overseas_agent_name:    data.overseas_agent_name,
  commodity:              data.commodities?.map((c) => c.name).join(", "),
  port_of_loading:        data.port_of_loading,
  port_of_discharge:      data.port_of_discharge,
  final_pod:              data.final_pod,
  terms_of_shipment:      data.terms_of_shipment,
  haulier_code:           data.haulier_code,
  special_instructions:   data.special_instructions,
  documentation:          data.documentation,
  transportation:         data.transportation,
  is_lpo_required:        data.is_lpo_required,
  is_invoice_required:    data.is_invoice_required,
  is_release_order_required:       data.is_release_order_required,
  is_payment_processing_required:  data.is_payment_processing_required,
  is_load_list_required:           data.is_load_list_required,
  is_haulier_note_required:        data.is_haulier_note_required,
  is_payment_docs_required:        data.is_payment_docs_required,
  fac:    data.fac,
  hbl:    data.hbl,
  remarks: data.remarks,
  carrier_remarks:         data.carrier_remarks,
  vessel_voyage_remarks:   data.vessel_voyage_remarks,
  pol_remarks:             data.pol_remarks,
  name_of_executive:       data.name_of_executive,
  pod_remarks:             data.pod_remarks,
  is_export:               data.is_export ?? null,

  // ETA fields
  vsl_initial_eta: data.vsl_initial_eta ? dayjs(data.vsl_initial_eta) : null,
  vsl_latest_eta:  data.vsl_latest_eta  ? dayjs(data.vsl_latest_eta)  : null,
  vsl_etd:         data.vsl_etd         ? dayjs(data.vsl_etd)         : null,
  pod_eta:         data.pod_eta         ? dayjs(data.pod_eta)         : null,

  // Accounts fields
  carrier_name_2: data.carrier_name_2,
  invoice_date:   data.invoice_date ? dayjs(data.invoice_date) : null,

  // Container rows
  containerRows: [...(data.container_details || [])]
    .sort((a, b) => {
      const aId = Number(a?.id);
      const bId = Number(b?.id);
      if (Number.isFinite(aId) && Number.isFinite(bId)) return aId - bId;
      if (Number.isFinite(aId)) return -1;
      if (Number.isFinite(bId)) return 1;
      return 0;
    })
    .map((c) => ({
    id:             c.id,
    equipment_type: c.equipment_type,
    quantity:       c.quantity,
    category:       c.category,
    quote:          c.quote,
    cost:           c.cost,
  })) || [{}],

  // Placement rows (normalize order so reopened forms don't appear reversed)
  placementRows: [...(data.transportation_rows || [])]
    .sort((a, b) => {
      const aId = Number(a?.id);
      const bId = Number(b?.id);
      if (Number.isFinite(aId) && Number.isFinite(bId)) return aId - bId;
      if (Number.isFinite(aId)) return -1;
      if (Number.isFinite(bId)) return 1;
      return 0;
    })
    .map((t) => ({
    id:               t.id,
    equipment_type:   t.equipment_type,
    no_of_containers: t.no_of_containers,
    category:         t.category,
    placement_time:   t.placement_time ? dayjs(String(t.placement_time).replace(/([zZ]|[+-]\d\d:\d\d)$/, "")) : null,
    pickup_location:  t.pickup_location,
    special_remarks:  t.special_remarks,
  })) || [{}],

  // Booking details
  afsys_job_no:    data.approval_details?.afsys_job_no,
  booking_vessel:  data.approval_details?.booking_vessel,
  booking_voyage:  data.approval_details?.booking_voyage,
  vessel_eta:      data.approval_details?.vessel_eta ? dayjs(data.approval_details.vessel_eta) : null,
  booking_ref_no:  data.approval_details?.booking_ref_no,
  ll_cut_off_datetime: data.approval_details?.ll_cut_off_datetime ? dayjs(data.approval_details.ll_cut_off_datetime) : null,
  si_cut_off_date: (() => {
    const d = data.approval_details?.si_cut_off_date;
    const t = data.approval_details?.si_cut_off_time;
    if (!d) return null;
    return t ? dayjs(`${d} ${t}`) : dayjs(d);
  })(),
  booking_remarks: data.approval_details?.booking_remarks,
  cnf_remarks:     data.approval_details?.cnf_remarks,
  account_remarks: data.approval_details?.account_remarks,
  cs_hod:          data.cs_hod,
});

/**
 * ─── DOCUMENT TYPE CONFIG ────────────────────────────────────────────────────
 * Add a new document type here to partition it into its own file-state bucket.
 * Each entry: { key, types, keywords }
 *   - key:      camelCase name returned in the result object
 *   - types:    doc_type values to match (exact, uppercase)
 *   - keywords: filename substrings to match when doc_type is generic
 * ─────────────────────────────────────────────────────────────────────────────
 */
const DOC_TYPE_CONFIG = [
  { key: "releaseOrderFiles", types: ["RELEASE ORDER","FREIGHT MANIFEST"],                              keywords: ["RELEASE ORDER", "RELEORDER", "RELEASE_ORDER"] },
  { key: "bocFiles",          types: ["BOC"],                                        keywords: ["BOC_ATTACHMENT", "BOC"] },
  { key: "haulageCostFiles",  types: ["HAULAGE COST"],                               keywords: ["HAULAGE_COST", "COST_SHEET"] },
  { key: "loadListFiles",     types: ["LOAD LIST", "LOAD LIST UPLOADING"],           keywords: ["LOAD_LIST", "LOADLIST"] },
  { key: "lpoFiles",          types: ["LPO"],                                        keywords: ["LPO"] },
  { key: "invoiceFiles",      types: ["INVOICE"],                                    keywords: ["INVOICE"] },
  { key: "facFiles",          types: ["FAC"],                                        keywords: ["FAC"] },
  { key: "croFiles",          types: ["CRO", "CRO UPLOADING"],                       keywords: ["CRO"] },
  { key: "edFiles",           types: ["ED", "ED UPLOADING", "TDR/SAILING REPORT"],   keywords: ["ED"] },
  { key: "haulierNoteFiles",  types: ["HAULAGE NOTE", "HAULAGE NOTE UPLOADING"],     keywords: ["HAULAGE_NOTE", "HAULAGENOTE"] },
  { key: "bankSlips",         types: ["BANK SLIP"],                                  keywords: ["BANK_SLIP", "BANK SLIP"] },
  { key: "hblFiles",          types: ["HBL"],                                        keywords: ["HBL"] },
  { key: "preAlertFiles",     types: ["PRE-ALERT", "PRE ALERT", "PREALERT"],         keywords: ["PRE_ALERT", "PREALERT"] },
  { key: "otherDocsFiles",    types: ["OTHER DOCS", "OTHER"],                        keywords: ["OTHER_DOCS", "OTHER"] },
  { key: "salesExecutiveFiles", types: ["SALES EXECUTIVE"],                           keywords: [] },
];

/**
 * Partitions a flat documents array into typed buckets.
 * Anything not matched by DOC_TYPE_CONFIG goes into `attachments`.
 *
 * @param  {array} docs  - raw documents array from API
 * @param  {string} executiveName - name of the executive to filter executive documents
 * @returns {object}     - one key per DOC_TYPE_CONFIG entry + `executiveDocuments` + `attachments`
 */
export const partitionDocuments = (docs, executiveName = null) => {
  const normalizedDocs = [...(docs || [])].sort((a, b) => {
    const aId = Number(a?.id);
    const bId = Number(b?.id);
    if (Number.isFinite(aId) && Number.isFinite(bId)) return aId - bId;
    if (Number.isFinite(aId)) return -1;
    if (Number.isFinite(bId)) return 1;
    return 0;
  });

  const filterBy = (types, keywords) =>
    normalizedDocs.filter((d) => {
      const dt = d.doc_type?.toUpperCase();
      const cat = d.category?.toUpperCase();
      const fn = d.file_name?.toUpperCase();

      // Priority 1: Exact doc_type match
      if (dt && types.includes(dt)) return true;

      // Priority 2: Keyword match ONLY if doc_type and category are generic/missing.
      // We consider doc_type "Attachment" or "Other Docs" as specific classifications that belong in general attachments.
      const isGenericType = !dt || ["OTHER", "OTHERS"].includes(dt);
      const isGenericCat  = !cat || ["GENERAL", "OTHERS"].includes(cat);

      if (isGenericType && isGenericCat) {
        return keywords.some((k) => {
          if (!fn) return false;
          const index = fn.indexOf(k);
          if (index === -1) return false;

          // Short keywords strict boundary check
          if (k.length <= 3) {
            const prevChar = index > 0 ? fn[index - 1] : null;
            const nextChar = index + k.length < fn.length ? fn[index + k.length] : null;
            const isPrevBoundary = !prevChar || !/[A-Z0-9]/.test(prevChar);
            const isNextBoundary = !nextChar || !/[A-Z0-9]/.test(nextChar);
            return isPrevBoundary && isNextBoundary;
          }
          return true;
        });
      }
      return false;
    });

  const result = {};
  const capturedIds = new Set();

  DOC_TYPE_CONFIG.forEach(({ key, types, keywords }) => {
    const list = filterBy(types, keywords);
    result[key] = list;
    list.forEach((d) => capturedIds.add(d.id));
  });

  // Filter executive documents from the remaining pool
  if (executiveName) {
    result.executiveDocuments = normalizedDocs.filter(d =>
      !capturedIds.has(d.id) &&
      d.doc_type?.toLowerCase() === "sales executive"
    );
    result.executiveDocuments.forEach(d => capturedIds.add(d.id));
  } else {
    result.executiveDocuments = [];
  }

  result.attachments = normalizedDocs.filter((d) => !capturedIds.has(d.id));
  return result;
};
