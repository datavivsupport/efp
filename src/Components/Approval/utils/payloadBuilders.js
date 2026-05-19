import dayjs from "dayjs";

/**
 * Builds the approval_details sub-object from form values.
 */
export const buildApprovalDetails = (values) => ({
  afsys_job_no: values.afsys_job_no,
  booking_vessel: values.booking_vessel,
  booking_voyage: values.booking_voyage,
  vessel_eta: values.vessel_eta ? values.vessel_eta.format("YYYY-MM-DD") : null,
  booking_ref_no: values.booking_ref_no,
  ll_cut_off_datetime: values.ll_cut_off_datetime ? values.ll_cut_off_datetime.format("YYYY-MM-DD HH:mm") : null,
  si_cut_off_date: values.si_cut_off_date ? values.si_cut_off_date.format("YYYY-MM-DD") : null,
  si_cut_off_time: values.si_cut_off_date ? values.si_cut_off_date.format("HH:mm") : null,
  booking_remarks: values.booking_remarks,
  cnf_remarks: values.cnf_remarks,
  account_remarks:       values.account_remarks,
  other_charges_remarks: values.other_charges_remarks,
  is_lpo_invoice_required: values.is_lpo_invoice_required,
  is_release_order_required: values.is_release_order_required,
  is_payment_processing_required: values.is_payment_processing_required,
});

/**
 * Builds the full POST/PATCH payload from form values + current file/doc state.
 *
 * @param {object} values        - Antd form values
 * @param {object} fileState     - all document file arrays
 * @param {object} extraState    - remarks, otherCharges, jobData, includeApprovalDetails
 */
export const buildCommonPayload = (values, fileState, extraState) => {
  const {
    releaseOrderFiles = [],
    bocFiles = [],
    haulageCostFiles = [],
    loadListFiles = [],
    lpoFiles = [],
    invoiceFiles = [],
    facFiles = [],
    croFiles = [],
    edFiles = [],
    haulierNoteFiles = [],
    preAlertFiles = [],
    bankSlips = [],
    attachments = [],
    hblFiles = [],
  } = fileState;

  const { remarks = [], otherCharges = [], jobData, includeApprovalDetails = false } = extraState;

  const allDocs = [
    ...releaseOrderFiles.map((f) => ({ ...f, doc_type: "Release Order", category: "booking" })),
    ...bocFiles.map((f) => ({ ...f, doc_type: "BOC", category: "booking" })),
    ...haulageCostFiles.map((f) => ({ ...f, doc_type: "Haulage Cost", category: "booking" })),
    ...loadListFiles.map((f) => ({ ...f, doc_type: "Load List", category: "booking" })),
    ...lpoFiles.map((f) => ({ ...f, doc_type: "LPO", category: "financial" })),
    ...invoiceFiles.map((f) => ({ ...f, doc_type: "Invoice", category: "financial" })),
    ...facFiles.map((f) => ({ ...f, doc_type: "FAC", category: "financial" })),
    ...croFiles.map((f) => ({ ...f, doc_type: "CRO", category: "financial" })),
    ...edFiles.map((f) => ({ ...f, doc_type: "ED", category: "financial" })),
    ...haulierNoteFiles.map((f) => ({ ...f, doc_type: "Haulage Note", category: "financial" })),
    ...preAlertFiles.map((f) => ({ ...f, doc_type: "Pre-Alert", category: "booking" })),
    ...bankSlips.map((f) => ({ ...f, doc_type: "Bank Slip", category: "financial" })),
    ...attachments.map((f) => ({ ...f, doc_type: "Attachment", category: "attachments" })),
    ...hblFiles.map((f) => ({ ...f, doc_type: "HBL", category: "financial" })),
  ];

  return {
    customer_name: values.customer_name,
    carrier_name: values.carrier_name,
    contact_pic: values.contact_pic,
    phone_no: values.phone_no,
    email: values.email,
    port_of_loading: values.port_of_loading,
    port_of_discharge: values.port_of_discharge,
    final_pod: values.final_pod,
    terms_of_shipment: values.terms_of_shipment,
    haulier_code: values.haulier_code,
    transportation: values.transportation,
    is_lpo_required: values.is_lpo_required,
    is_invoice_required: values.is_invoice_required,
    is_lpo_invoice_required: values.is_lpo_invoice_required,
    is_release_order_required: values.is_release_order_required,
    is_payment_processing_required: values.is_payment_processing_required,
    is_payment_docs_required: values.is_payment_docs_required,
    is_load_list_required: values.is_load_list_required,
    is_haulier_note_required: values.is_haulier_note_required,
    overseas_agent_name: values.overseas_agent_name,
    name_of_executive: values.name_of_executive,
    special_instructions: values.special_instructions,
    is_export: values.is_export ?? null,
    fac: values.fac,
    hbl: values.hbl,
    cs_hod: values.cs_hod,

    ...(values.vsl_initial_eta && {
      vsl_initial_eta: dayjs(values.vsl_initial_eta).format("YYYY-MM-DD"),
    }),
    ...(values.vsl_latest_eta && {
      vsl_latest_eta: dayjs(values.vsl_latest_eta).format("YYYY-MM-DD"),
    }),
    ...(values.vsl_etd && {
      vsl_etd: dayjs(values.vsl_etd).format("YYYY-MM-DD"),
    }),
    ...(values.pod_eta && {
      pod_eta: dayjs(values.pod_eta).format("YYYY-MM-DD"),
    }),

    carrier_name_2: values.carrier_name_2,
    invoice_date: values.invoice_date
      ? dayjs(values.invoice_date).format("YYYY-MM-DD")
      : null,

    commodities:
      values.commodity !== undefined
        ? (values.commodity
            ? values.commodity
                .split(",")
                .map((c) => ({ name: c.trim() }))
                .filter((c) => c.name)
            : [])
        : undefined,

    container_details: values.containerRows?.map((r) => ({
      id: r.id,
      equipment_type: r.equipment_type,
      quantity: parseInt(r.quantity) || 0,
      category: r.category,
      quote: r.quote,
      cost: r.cost,
    })),

    transportation_rows: values.placementRows?.map((r) => ({
      id: r.id,
      equipment_type: r.equipment_type,
      no_of_containers: parseInt(r.no_of_containers) || 0,
      category: r.category,
      placement_time: r.placement_time
        ? dayjs(r.placement_time).format("YYYY-MM-DD HH:mm:ss")
        : null,
      pickup_location: r.pickup_location,
      special_remarks: r.special_remarks,
    })),

    documents: allDocs.map((d) => ({
      id: d.id,
      doc_type: d.doc_type,
      category: d.category,
      file_url: d.url || d.file_url,
      file_name: d.name || d.file_name,
      remarks: d.remarks || "",
      uploaded_by_user: d.uploaded_by_user,
    })),

    general_remarks: remarks,

    ...(includeApprovalDetails && {
      approval_details: {
        ...buildApprovalDetails(values),
        other_charges: otherCharges,
      },
    }),

    status: jobData?.status || "draft",
  };
};
