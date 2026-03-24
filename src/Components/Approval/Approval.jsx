import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useSelector } from "react-redux";
import {
  Form,
  Input,
  Select,
  DatePicker,
  TimePicker,
  Button,
  Radio,
  Table,
  Upload,
  Tag,
  Space,
  Row,
  Col,
  Typography,
  Card,
  Modal,
  Spin,
  Alert,
  Checkbox,
  message,
} from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  UploadOutlined,
  PaperClipOutlined,
  EyeOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import { Icon } from "@iconify/react";
import dayjs from "dayjs";
import Styles from "./Approval.module.css";
import EquipmentTypeSelect from "../SalesInput/EquipmentType";
import CategorySelect from "../SalesInput/Category";
import { uploadFile } from "../Viewer/UploadUtil";
import MultiFileViewer from "../Viewer/MultiFileViewer";
import apiClient from "../../api/apiclient";

const { TextArea } = Input;
const { Option } = Select;

// How many chips to show before "See more"
const VISIBLE_LIMIT = 2;

const STATUS_COLOR = {
  approved: "success",
  pending: "warning",
  rejected: "error",
  "in progress": "processing",
  submitted: "processing",
  draft: "default",
  // capitalized fallbacks
  Approved: "success",
  Pending: "warning",
  Rejected: "error",
  Submitted: "processing",
  Draft: "default",
};

/* ── Collapsible Card Header ── */
const CardHeader = ({ icon, title, open, onToggle }) => (
  <div
    onClick={onToggle}
    style={{
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      width: "100%",
    }}
  >
    <Space align="center">
      <div className={Styles.mainhead}>
        <Icon icon={icon} width="18" height="18" />
      </div>
      <Typography.Title level={5} style={{ margin: 0 }}>
        {title}
      </Typography.Title>
    </Space>
    <span style={{ fontSize: 22, color: "#626161" }}>
      <Icon icon={open ? "grommet-icons:form-up" : "grommet-icons:form-down"} />
    </span>
  </div>
);

/* ─────────────────────────────────────────────────────────────────────────────
   FileChipList — shared chip renderer for every upload field
───────────────────────────────────────────────────────────────────────────── */
const FileChipList = ({ files, color = "blue", onRemove, onPreview, onRemarkChange, disabled, user, isAdmin }) => {
  return (
    <div style={{ marginTop: 8 }}>
      {files.map((file, i) => {
        const isOwner = file.uploaded_by_user === user?.id || !file.id; // Allow editing for newly uploaded files in same session
        const canEditFile = !disabled && (isAdmin || isOwner);

        return (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '8px', padding: '8px', border: '1px solid #f0f0f0', borderRadius: '4px', backgroundColor: '#fafafa' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Space>
                <PaperClipOutlined style={{ color: '#1890ff' }} />
                <Typography.Text ellipsis style={{ maxWidth: 200 }}>
                  {file.name || file.file_name}
                </Typography.Text>
                {file.uploaded_by_user_name && (
                  <Typography.Text type="secondary" style={{ fontSize: '10px' }}>
                    ({file.uploaded_by_user_name})
                  </Typography.Text>
                )}
              </Space>
              <Space>
                <Button type="link" size="small" onClick={() => onPreview(i)}>Preview</Button>
                {canEditFile && <Button type="text" danger size="small" icon={<DeleteOutlined />} onClick={() => onRemove(i)} />}
              </Space>
            </div>
            {canEditFile ? (
              <Input
                size="small"
                placeholder="Remarks..."
                value={file.remarks || ""}
                onChange={(e) => onRemarkChange(i, e.target.value)}
                style={{ fontSize: '11px', marginTop: '2px' }}
              />
            ) : (
              file.remarks && (
                <Typography.Text type="secondary" italic style={{ fontSize: '10px', paddingLeft: '4px' }}>
                  {file.remarks}
                </Typography.Text>
              )
            )}
          </div>
        );
      })}
    </div>
  );
};

/* DocUploadField — self-contained upload + chip-list */
const DocUploadField = ({
  label,
  files,
  setFiles,
  color = "purple",
  onPreview,
  salesInputId,
  category = "general",
  docType = "Other",
  disabled = false,
  user,
  isAdmin
}) => {
  const handleBeforeUpload = async (file) => {
    if (!salesInputId) {
      message.warning("Save the draft first before uploading documents");
      return false;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('doc_type', docType);
    formData.append('category', category);

    try {
      const response = await apiClient.post(
        `/liner/sales-input/${salesInputId}/upload-document/`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      if (response.data.status === "success") {
        const uploadedDoc = response.data.data;
        setFiles((prev) => [...prev, {
          id: uploadedDoc.id,
          name: uploadedDoc.file_name,
          url: uploadedDoc.file_url,
          file_name: uploadedDoc.file_name,
          file_url: uploadedDoc.file_url,
          doc_type: docType,
          remarks: "",
          uploaded_by_user: user?.id,
          uploaded_by_user_name: user?.get_full_name || user?.name || "Me"
        }]);
        message.success(`${file.name} uploaded successfully to S3`);
      } else {
        message.error("Upload failed: " + response.data.message);
      }
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.message || "Upload failed. Please check your connection.";
      message.error(errMsg);
    }
    return false;
  };

  const debounceTimerField = useRef(null);

  const handleRemarkChange = (index, value) => {
    // 1. Get the ID of the document being updated from the filtered list 'files'
    if (!files?.[index]) return;
    const docId = files[index].id;

    // 2. Functional update on the global state 'prev' to preserve all other document types
    setFiles((prev) =>
      prev.map((f) => (f.id === docId ? { ...f, remarks: value } : f))
    );

    // 2. Debounced sync to backend
    if (salesInputId && docId) {
      if (debounceTimerField.current) {
        clearTimeout(debounceTimerField.current);
      }
      debounceTimerField.current = setTimeout(async () => {
        try {
          await apiClient.patch(
            `/liner/sales-input/${salesInputId}/update-document-remarks/`,
            { doc_id: docId, remarks: value }
          );
          console.log(`Synced remarks for doc ${docId}`);
        } catch (err) {
          console.error("Failed to sync remarks:", err);
        }
      }, 800); // 800ms debounce
    }
  };

  return (
    <div>
      {!disabled && (
        <Upload multiple showUploadList={false} beforeUpload={handleBeforeUpload}>
          <Button size="small" icon={<UploadOutlined />} style={{ fontSize: 12 }}>
            {files.length === 0 ? `Upload ${label}` : "Add More"}
          </Button>
        </Upload>
      )}

      {files.length > 0 && (
        <FileChipList
          files={files}
          color={color}
          onRemove={(i) => {
            const docId = files[i]?.id;
            if (docId) {
              setFiles((p) => p.filter((f) => f.id !== docId));
            }
          }}
          onPreview={(i) => onPreview(files, i)}
          onRemarkChange={handleRemarkChange}
          disabled={disabled}
          user={user}
          isAdmin={isAdmin}
        />
      )}
    </div>
  );
};

/* MAIN COMPONENT */
const Approval = () => {
  const [form] = Form.useForm();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const id = searchParams.get("id");
  const user = useSelector((state) => state.auth.user);
  const [loading, setLoading] = useState(false);
  const [jobData, setJobData] = useState(null);
  const [open, setOpen] = useState({
    export: true,
    container: true,
    others: true,
    otherDetails: true,
    placement: true,
    booking: true,
    bankAccounts: true,
    documents: true,
    attachments: true,
    approvalStatus: true,
    workflowSelectors: true,
  });
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [bankSlips, setBankSlips] = useState([]);
  const [releaseOrderFiles, setReleaseOrderFiles] = useState([]);
  const [bocFiles, setBocFiles] = useState([]);
  const [haulageCostFiles, setHaulageCostFiles] = useState([]);
  const [loadListFiles, setLoadListFiles] = useState([]);
  const [lpoFiles, setLpoFiles] = useState([]);
  const [invoiceFiles, setInvoiceFiles] = useState([]);
  const [facFiles, setFacFiles] = useState([]);
  const [croFiles, setCroFiles] = useState([]);
  const [edFiles, setEdFiles] = useState([]);
  const [haulageNoteFiles, setHaulageNoteFiles] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [hblFiles, setHblFiles] = useState([]);
  const [otherCharges, setOtherCharges] = useState([]);
  const [chargeInput, setChargeInput] = useState("");
  const [remarks, setRemarks] = useState([]);
  const [newRemark, setNewRemark] = useState("");
  const [approvalHistory, setApprovalHistory] = useState([]);

  const userRoles = (user?.roles || []).map(r => r.name.toUpperCase());
  const userDepts = [
    ...(user?.departments_assigned_names || []),
    ...(user?.department_names || []),
    user?.department || ""
  ].filter(Boolean).map(d => d.toUpperCase());

  const isAdmin = userRoles.some(r => ["ADMIN", "SUPER ADMIN"].includes(r));
  const isSuperUser = userRoles.some(r => r.includes("SUPER USER")) || isAdmin;

  // Refined Role Identification (Strictly departmental, removed generic 'EXECUTIVE/APPROVER' matches)
  const isCS = userDepts.some(d => d.includes("CUSTOMER SERVICE") || d.includes("CS")) ||
    userRoles.some(r => r.includes("CUSTOMER SERVICE") || r.includes("CS") || r.includes("DOCS"));

  const isCNF = userDepts.some(d => {
    const du = d.toUpperCase();
    return du.includes("C&F") || du.includes("CNF") || du.includes("CLEARANCE") || du.includes("OPERATIONS");
  }) || userRoles.some(r => {
    const ru = r.toUpperCase();
    return ru.includes("C&F") || ru.includes("CNF") || ru.includes("CLEARANCE") || ru.includes("OPERATIONS");
  });

  const isSales = userDepts.some(d => d.includes("SALES")) ||
    userRoles.some(r => r.includes("SALES") || r.includes("CREATOR"));

  const isAccounts = userDepts.some(d => d.includes("ACCOUNTS") || d.includes("FINANCE") || d.includes("PAYABLE")) ||
    userRoles.some(r => r.includes("ACCOUNTS") || r.includes("FINANCE") || r.includes("PAYABLE"));

  const isHOD = userRoles.some(role => ["HOD", "APPROVER"].includes(role));
  const isGM = userRoles.includes("GM");
  const isSalesHOD = isSales && isHOD;
  const isCSHOD = isCS && userRoles.includes("HOD");
  const isDocsTeam = userRoles.some(r => r.includes("DOCS")) || userDepts.some(d => d.includes("DOCS"));

  const currentStage = jobData?.current_stage || "1";

  // Creator check (PRD Section 3 & user request: creators can edit even after submit)
  const isCreator = jobData?.created_by_user === user?.id;

  const isLiner = jobData?.job_type?.toUpperCase() === "LINER";
  const isCrossTrade = jobData?.job_type?.toUpperCase() === "CROSS_TRADE" || jobData?.job_type?.toUpperCase() === "CROSS TRADE";
  const isForwarding = jobData?.job_type?.toUpperCase() === "FORWARDING";
  const isOthers = jobData?.job_type?.toUpperCase() === "OTHERS";

  // Extended 9-stage workflow for Cross Trade and Forwarding
  const isExtended = isCrossTrade || isForwarding;

  const isTerminal = (jobData?.status === "approved" && !isExtended && !isLiner) || jobData?.status === "rejected" || jobData?.status === "REJECTED-CLOSED" || currentStage === "9" || jobData?.status === "Completed" || jobData?.status === "completed";
  const isForwardingStage5 = isForwarding && currentStage === '5';

  // Department-specific section locks (Strictly isolated by departmental membership)
  // CRITICAL: Each milestone section is strictly locked to its designated department.
  const isSalesSectionLocked = isTerminal || isForwardingStage5 || (!isAdmin && !isSales && !isCreator);
  const isWorkflowSectionLocked = isTerminal || isForwardingStage5 || (!isAdmin && !isSales && !isCS && !isCreator);
  const isBookingSectionLocked = isTerminal || isForwardingStage5 || (!isAdmin && !isCS);
  const isCNFSectionLocked = isTerminal || isForwardingStage5 || (!isAdmin && !isCNF);

  // Strict locks for role-isolated fields (Removed isCreator to enforce strict departmental boundaries)
  const isCSOnlyLocked = isTerminal || isForwardingStage5 || (!isAdmin && !isCS);
  const isStrictlyCSLocked = isTerminal || isForwardingStage5 || (!isAdmin && !isCS);
  const isCNFOnlyLocked = isTerminal || isForwardingStage5 || (!isAdmin && !isCNF);
  const isAccountsOnlyLocked = isTerminal || (!isAdmin && !isAccounts);

  // For Liner, CS can upload core docs throughout the workflow
  const isLinerCSUploadLocked = isLiner
    ? (isTerminal || (!isAdmin && !isCS))
    : (isTerminal || isForwardingStage5 || (!isAdmin && !isSales && !isCS && !isCreator) || (isHOD && !isCreator) || (isGM && !isCreator));

  // CNF handles operational docs only AFTER Sales HOD approval (Stage 3+)
  // We use the direct backend flag is_hod_approved with history as a fallback
  const isSalesHODApproved = jobData?.is_hod_approved || (approvalHistory || []).some(h => {
    const sName = (h.stage || "").toUpperCase();
    const sStatus = (h.status || "").toUpperCase();
    return sName.includes("HOD") && (sStatus.includes("APPROV") || sStatus === "SUCCESS");
  });

  const isLinerCNFUploadLocked = isLiner
    ? (!isSalesHODApproved || !isCNF)
    : isCNFOnlyLocked;

  // Requirement selectors (Radios) are strictly for CS Executives across all job types
  const isLinerSelectorLocked = isCSOnlyLocked;

  // Strictly locked sections for specific departments
  const isFinancialSectionLocked = isTerminal || (!isAdmin && !isAccounts && !isCS);
  const isAccountsOnlyFieldLocked = isTerminal || (!isAdmin && !isAccounts);

  // Reactive visibility using Form.useWatch (handles both initial values and live changes)
  const isLLReqForm = Form.useWatch("is_load_list_required", form);
  const isHNReqForm = Form.useWatch("is_haulier_note_required", form);
  const isROReqForm = Form.useWatch("is_release_order_required", form);
  const isPaymentReqForm = Form.useWatch("is_payment_processing_required", form);
  const facFlagForm = Form.useWatch("fac", form);
  const hblFlagForm = Form.useWatch("hbl", form);

  // Helper to normalize Yes/No, true/false strings or boolean values
  const isTrue = (val, initial) => {
    const normalize = (v) => {
      if (v === true || v === "true" || v === "Yes" || v === "yes") return true;
      if (v === false || v === "false" || v === "No" || v === "no") return false;
      return null;
    };
    const normVal = normalize(val);
    if (normVal !== null) return normVal;
    return normalize(initial) === true;
  };

  const isLLReq = isTrue(isLLReqForm, jobData?.is_load_list_required);
  const isHNReq = isTrue(isHNReqForm, jobData?.is_haulier_note_required);
  const isROReq = isTrue(isROReqForm, jobData?.is_release_order_required);
  const isPaymentReq = isTrue(isPaymentReqForm, jobData?.is_payment_required);
  const facFlag = isTrue(facFlagForm, jobData?.fac);
  const hblFlag = isTrue(hblFlagForm, jobData?.hbl);

  // Additional Cross Trade flags
  const isPayReqForm = Form.useWatch("is_payment_processing_required", form);
  const isPayDocsReqForm = Form.useWatch("is_payment_docs_required", form);
  const isPayReq = isTrue(isPayReqForm, jobData?.is_payment_processing_required);
  const isPayDocsReq = isTrue(isPayDocsReqForm, jobData?.is_payment_docs_required);

  const toggle = (key) => setOpen((p) => ({ ...p, [key]: !p[key] }));

  // Always show sections as per user request to ensure accessibility
  const showPlacement = true;

  const openPreview = (filesArray, localIdx) => {
    const urls = filesArray.map((f) => f.url || f.file_url).filter(Boolean);
    if (!urls.length) return;
    setPreviewUrls(urls);
    setPreviewIndex(Math.max(0, Math.min(localIdx, urls.length - 1)));
    setPreviewVisible(true);
  };



  // Refined Halt logic: Only halt if REQUIRED (YES) and missing files at the relevant stage.
  // Load List is required for Stage 6+. Haulier Note for Stage 4+.
  const haltLiner = isLiner && (
    (currentStage === '3' && loadListFiles.length === 0) ||
    (currentStage === '4B' && lpoFiles.length === 0 && invoiceFiles.length === 0) ||
    (currentStage === '6' && bankSlips.length === 0) ||
    jobData?.status === "STOPPED"
  );
  // Cross Trade PRD v2.2 STOP Logic
  const isStoppedCrossTrade = isCrossTrade && (jobData?.status === "STOPPED" || jobData?.is_blocked);
  const isHalted = haltLiner || isStoppedCrossTrade;

  // Department-based visibility logic
  // Department-based visibility logic
  // Re-aligned for 7-stage Forwarding Flow:
  // Stage 1: Sales (Draft) -> Stage 2: Sales HOD -> Stage 3: CS -> Stage 4: CNF -> Stage 5: CS -> Stage 6: CS HOD -> Stage 7: Accounts
  const canApprove = (
    ((isForwarding
      ? (
        (currentStage === '2' && (isSalesHOD || isCS)) ||
        (currentStage === '3' && isCS) ||
        (currentStage === '4A' && (isCS || isDocsTeam)) ||
        (currentStage === '4B' && isCS) ||
        (currentStage === '5' && isCSHOD) ||
        (currentStage === '6' && isAccounts) ||
        (currentStage === '7' && (isCS || isCNF))
      )
      : isLiner
        ? (
          (currentStage === '2' && isSalesHOD) ||
          (currentStage === '3' && isCNF) ||
          (currentStage === '4A' && (isCS || isDocsTeam)) ||
          (currentStage === '4B' && isCS) ||
          (currentStage === '5' && isCS) ||
          (currentStage === '6' && isAccounts) ||
          (currentStage === '7' && (isCS || isCNF))
        )
        : isCrossTrade
          ? (
            // Persistent CS Update logic (Stage 2-7)
            (isCS && parseInt(currentStage) >= 2 && parseInt(currentStage) <= 7) ||
            // Role-based stage advancement
            (currentStage === '2' && isSalesHOD) ||
            (currentStage === '3' && isCNF) ||
            (currentStage === '5' && isCSHOD) ||
            (currentStage === '6' && isAccounts) ||
            (currentStage === '7' && isCS) // Level 6 Final
          )
          : (
            // Default / OTHERS / Legacy
            (currentStage === '2' && isSalesHOD) ||
            (currentStage === '3' && isCS) ||
            (currentStage === '4' && isCNF) ||
            (currentStage === '7' && isCS && isHOD) ||
            (currentStage === '8' && isAccounts)
          )) || isAdmin)
  );
  /* ── Fetch Data ── */
  useEffect(() => {
    if (id) {
      fetchJobDetails();
    }
  }, [id]);

  const fetchJobDetails = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(`/liner/sales-input/${id}/`);
      if (response.data.status === "success") {
        const data = response.data.data;
        setJobData(data);

        // Map to main form
        form.setFieldsValue({
          export_number: data.export_number || "N/A",
          export_created_date: data.export_created_date ? dayjs(data.export_created_date) : null,
          created_by_name: data.created_by_name || "N/A",
          carrier_name: data.carrier_name,
          customer_name: data.customer_name,
          contact_pic: data.contact_pic,
          phone_no: data.phone_no || data.email,
          commodity: data.commodities?.map(c => c.name).join(", "),
          port_of_loading: data.port_of_loading,
          port_of_discharge: data.port_of_discharge,
          final_pod: data.final_pod,
          terms_of_shipment: data.terms_of_shipment,
          haulier_code: data.haulier_code,
          name_of_executive: data.name_of_executive,
          special_instructions: data.special_instructions,
          documentation: data.documentation,
          transportation: data.transportation,
          is_lpo_required: data.is_lpo_required,
          is_invoice_required: data.is_invoice_required,
          is_release_order_required: data.is_release_order_required,
          is_payment_processing_required: data.is_payment_processing_required,
          is_load_list_required: data.is_load_list_required,
          is_haulier_note_required: data.is_haulier_note_required,
          is_payment_docs_required: data.is_payment_docs_required,
          fac: data.fac,
          hbl: data.hbl,
          carrier_remarks: data.carrier_remarks,
          vessel_voyage_remarks: data.vessel_voyage_remarks,
          pol_remarks: data.pol_remarks,
          pod_remarks: data.pod_remarks,

          // Container Rows
          containerRows: data.container_details?.map(c => ({
            equipment_type: c.equipment_type,
            quantity: c.quantity,
            category: c.category,
            quote: c.quote,
            cost: c.cost,
          })) || [{}],

          // Placement Rows
          placementRows: data.transportation_rows?.map(t => ({
            equipment_type: t.equipment_type,
            no_of_containers: t.no_of_containers,
            category: t.category,
            placement_time: t.placement_time ? dayjs(t.placement_time) : null,
            special_remarks: t.special_remarks,
          })) || [{}],

          // Booking Details
          afsys_job_no: data.approval_details?.afsys_job_no,
          booking_vessel: data.approval_details?.booking_vessel,
          booking_voyage: data.approval_details?.booking_voyage,
          vessel_eta: data.approval_details?.vessel_eta ? dayjs(data.approval_details.vessel_eta) : null,
          booking_ref_no: data.approval_details?.booking_ref_no,
          si_cut_off_date: data.approval_details?.si_cut_off_date ? dayjs(data.approval_details.si_cut_off_date) : null,
          si_cut_off_time: data.approval_details?.si_cut_off_time ? dayjs(data.approval_details.si_cut_off_time, "HH:mm") : null,
          booking_remarks: data.approval_details?.booking_remarks,
          cnf_remarks: data.approval_details?.cnf_remarks,
          account_remarks: data.approval_details?.account_remarks,
        });

        // Map Documents (Properly Partitioned)
        if (data.documents) {
          const docs = data.documents;
          // Robust filtering: Try doc_type first, then fallback to common naming patterns if shifted to 'Attachment'
          const filterBy = (types, keywords) => docs.filter(d => {
            const dt = d.doc_type?.toUpperCase();
            const fn = d.file_name?.toUpperCase();
            if (types.includes(dt)) return true;
            if (dt === "ATTACHMENT" || dt === "OTHER" || !dt) {
              return keywords.some(k => fn?.includes(k));
            }
            return false;
          });

          const roList = filterBy(["RELEASE ORDER"], ["RELEASE ORDER", "RELEORDER", "RELEASE_ORDER"]);
          const bocList = filterBy(["BOC"], ["BOC_ATTACHMENT", "BOC"]);
          const hCostList = filterBy(["HAULAGE COST"], ["HAULAGE_COST", "COST_SHEET"]);
          const llList = filterBy(["LOAD LIST"], ["LOAD_LIST", "LOADLIST"]);
          const lpoList = filterBy(["LPO"], ["LPO"]);
          const invList = filterBy(["INVOICE"], ["INVOICE"]);
          const facList = filterBy(["FAC"], ["FAC"]);
          const croList = filterBy(["CRO", "CRO UPLOADING"], ["CRO"]);
          const edList = filterBy(["ED", "ED UPLOADING"], ["ED"]);
          const hnList = filterBy(["HAULAGE NOTE", "HAULAGE NOTE UPLOADING"], ["HAULAGE_NOTE", "HAULAGENOTE"]);
          const bankList = filterBy(["BANK SLIP"], ["BANK_SLIP", "BANK SLIP"]);
          const hblList = filterBy(["HBL"], ["HBL"]);

          setReleaseOrderFiles(roList);
          setBocFiles(bocList);
          setHaulageCostFiles(hCostList);
          setLoadListFiles(llList);
          setLpoFiles(lpoList);
          setInvoiceFiles(invList);
          setFacFiles(facList);
          setCroFiles(croList);
          setEdFiles(edList);
          setHaulageNoteFiles(hnList);
          setBankSlips(bankList);
          setHblFiles(hblList);

          const capturedIds = new Set([
            ...roList.map(d => d.id),
            ...bocList.map(d => d.id),
            ...hCostList.map(d => d.id),
            ...llList.map(d => d.id),
            ...lpoList.map(d => d.id),
            ...invList.map(d => d.id),
            ...facList.map(d => d.id),
            ...croList.map(d => d.id),
            ...edList.map(d => d.id),
            ...hnList.map(d => d.id),
            ...bankList.map(d => d.id),
            ...hblList.map(d => d.id),
          ]);
          setAttachments(docs.filter(d => !capturedIds.has(d.id)));

        }

        // Map History
        setApprovalHistory(data.approval_history || []);

        // Map Other Charges & General Remarks
        setOtherCharges(data.approval_details?.other_charges || []);
        setRemarks(data.general_remarks || []);
      }
    } catch (err) {
      message.error("Failed to load job details");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  /* ── Handlers ── */
  const getCommonPayload = (values) => {
    const allDocs = [
      ...releaseOrderFiles.map(f => ({ ...f, doc_type: "Release Order", category: "booking" })),
      ...bocFiles.map(f => ({ ...f, doc_type: "BOC", category: "booking" })),
      ...haulageCostFiles.map(f => ({ ...f, doc_type: "Haulage Cost", category: "booking" })),
      ...loadListFiles.map(f => ({ ...f, doc_type: "Load List", category: "booking" })),
      ...lpoFiles.map(f => ({ ...f, doc_type: "LPO", category: "financial" })),
      ...invoiceFiles.map(f => ({ ...f, doc_type: "Invoice", category: "financial" })),
      ...facFiles.map(f => ({ ...f, doc_type: "FAC", category: "financial" })),
      ...croFiles.map(f => ({ ...f, doc_type: "CRO", category: "financial" })),
      ...edFiles.map(f => ({ ...f, doc_type: "ED", category: "financial" })),
      ...haulageNoteFiles.map(f => ({ ...f, doc_type: "Haulage Note", category: "financial" })),
      ...bankSlips.map(f => ({ ...f, doc_type: "Bank Slip", category: "financial" })),
      ...attachments.map(f => ({ ...f, doc_type: "Attachment", category: "attachments" })),
      ...hblFiles.map(f => ({ ...f, doc_type: "HBL", category: "financial" })),
    ];

    return {
      // ─── RELAXED PAYLOAD FOR TESTING ───────────────────────────────────────────
      // Sending all fields to allow everyone to edit everything for now.
      // ────────────────────────────────────────────────────────────────────────────
      customer_name: values.customer_name,
      carrier_name: values.carrier_name,
      contact_pic: values.contact_pic,
      phone_no: values.phone_no,
      port_of_loading: values.port_of_loading,
      port_of_discharge: values.port_of_discharge,
      final_pod: values.final_pod,
      terms_of_shipment: values.terms_of_shipment,
      haulier_code: values.haulier_code,
      transportation: values.transportation,
      is_lpo_required: values.is_lpo_required,
      is_invoice_required: values.is_invoice_required,
      is_release_order_required: values.is_release_order_required,
      is_payment_processing_required: values.is_payment_processing_required,
      is_payment_docs_required: values.is_payment_docs_required,
      is_load_list_required: values.is_load_list_required,
      is_haulier_note_required: values.is_haulier_note_required,
      name_of_executive: values.name_of_executive,
      special_instructions: values.special_instructions,
      fac: values.fac,
      hbl: values.hbl,
      commodities: values.commodity !== undefined
        ? (values.commodity ? values.commodity.split(",").map(c => ({ name: c.trim() })).filter(c => c.name) : [])
        : undefined,
      container_details: values.containerRows?.map(r => ({
        equipment_type: r.equipment_type,
        quantity: parseInt(r.quantity) || 0,
        category: r.category,
        quote: r.quote,
        cost: parseFloat(r.cost) || 0
      })),

      transportation_rows: values.placementRows?.map(r => ({
        equipment_type: r.equipment_type,
        no_of_containers: parseInt(r.no_of_containers) || 0,
        category: r.category,
        placement_time: r.placement_time
          ? dayjs(r.placement_time).format("YYYY-MM-DD HH:mm:ss")
          : null,
        special_remarks: r.special_remarks
      })),

      documents: allDocs.map(d => ({
        id: d.id,
        doc_type: d.doc_type,
        category: d.category,
        file_url: d.url || d.file_url,
        file_name: d.name || d.file_name,
        remarks: d.remarks || "",
        uploaded_by_user: d.uploaded_by_user // Preserve uploader
      })),
      general_remarks: remarks,
      approval_details: {
        ...getCommonPayloadApprovalDetails(values),
        other_charges: otherCharges,
      },

      // Preserve current status
      status: jobData?.status || "draft",
    };
  };

  const getCommonPayloadApprovalDetails = (values) => {
    return {
      afsys_job_no: values.afsys_job_no,
      booking_vessel: values.booking_vessel,
      booking_voyage: values.booking_voyage,
      vessel_eta: values.vessel_eta ? values.vessel_eta.format("YYYY-MM-DD") : null,
      booking_ref_no: values.booking_ref_no,
      si_cut_off_date: values.si_cut_off_date ? values.si_cut_off_date.format("YYYY-MM-DD") : null,
      si_cut_off_time: values.si_cut_off_time ? values.si_cut_off_time.format("HH:mm") : null,
      booking_remarks: values.booking_remarks,
      cnf_remarks: values.cnf_remarks,
      account_remarks: values.account_remarks,
    };
  };

  const handleAction = async (actionType, remarksVal = "") => {
    setLoading(true);
    try {
      const values = await form.validateFields();

      // Stage-specific validation for "Approved"
      if (actionType === "Approved") {
        const stage = jobData?.current_stage || "1";

        if (isForwarding) {
          if (stage === '3' && !values.afsys_job_no) {
            message.error("AFSYS Job No. is required for Stage 3");
            setLoading(false);
            return;
          }
          if (stage === '4B' && (!lpoFiles.length && !invoiceFiles.length)) {
            message.error("Financial document (LPO or Invoice) is required for Stage 4B");
            setLoading(false);
            return;
          }
          if (stage === '6' && !bankSlips.length) {
            message.error("Bank Slip is required for Stage 6");
            setLoading(false);
            return;
          }
        } else if (isLiner) {
          if (stage === '3' && !values.afsys_job_no) {
            message.error("AFSYS Job No. is required for Stage 3");
            setLoading(false);
            return;
          }
          if (stage === '4B' && (!lpoFiles.length && !invoiceFiles.length)) {
            message.error("Main Document (LPO or Invoice) is required for Stage 4B");
            setLoading(false);
            return;
          }
          if (stage === '6' && !bankSlips.length) {
            message.error("Bank Slip is required for Accounts Payment (Stage 6)");
            setLoading(false);
            return;
          }
        } else {
          // Legacy / Generic Validations
          if (stage === '3' && !values.afsys_job_no) {
            message.error("AFSYS Job No. is required");
            setLoading(false);
            return;
          }

          if (stage === '4' && releaseOrderFiles.length === 0 && bocFiles.length === 0) {
            message.error("Release Order or BOC Attachment is required");
            setLoading(false);
            return;
          }
        }
      }

      const payload = {
        ...getCommonPayload(values),
        action: actionType,
        remarks: remarksVal || form.getFieldValue("approvalRemarks"),
      };

      const endpoint =
        actionType === "Submit" ? `/liner/sales-input/${id}/submit/` :
          actionType === "Approved" ? `/liner/sales-input/${id}/approve/` :
            `/liner/sales-input/${id}/reject/`;

      const response = await apiClient.post(endpoint, payload);

      if (response.data.status === "success") {
        message.success(response.data.message || "Action Performed Successfully");
        setTimeout(() => navigate("/"), 1500);
      } else {
        message.error(response.data.message || "Action failed");
      }
    } catch (err) {
      console.error(err);
      const errorMsg = err.response?.data?.message || err.errorFields?.[0]?.errors?.[0] || "Check required fields";
      message.error("Error performing action: " + errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const payload = {
        ...getCommonPayload(values),
        status: jobData?.status // Preserve current status during draft-save/PATCH
      };

      const response = id
        ? await apiClient.patch(`/liner/sales-input/${id}/`, payload)
        : await apiClient.post(`/liner/sales-input/`, payload);

      if (response.data.status === "success" || response.status === 200 || response.status === 201) {
        message.success(response.data.message || "Job Saved Successfully");
        setTimeout(() => navigate("/"), 1500);
      } else {
        message.error(response.data.message || "Failed to save changes");
      }
    } catch (err) {
      console.error(err);
      const errorMsg = err.response?.data?.message || "Internal server error";
      message.error("Failed to save draft: " + errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    form.resetFields();
    setOtherCharges([]);
    setRemarks([]);
    setAttachments([]);
    setBankSlips([]);
    setReleaseOrderFiles([]);
    setBocFiles([]);
    setHaulageCostFiles([]);
    setLoadListFiles([]);
    setLpoFiles([]);
    setInvoiceFiles([]);
    setFacFiles([]);
    message.info("Form reset");
  };

  /* ── Table columns ── */
  const approvalColumns = [
    { title: "Stage", dataIndex: "stage", key: "stage" },
    {
      title: "Pending With",
      dataIndex: "pending_with",
      key: "pending_with",
      render: (pw) => pw || "N/A"
    },
    {
      title: "Updated By",
      dataIndex: "updated_by_user_name",
      key: "updated_by_user_name",
      render: (name, record) => (
        <Space direction="vertical" size={0}>
          <span>{name || record.updated_by_name || "N/A"}</span>
          <span style={{ fontSize: 11, color: "#6b7280" }}>
            {record.updated_by_department || record.updated_by_role || ""}
          </span>
        </Space>
      )
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (s) => (
        <Tag color={STATUS_COLOR[s] || STATUS_COLOR[s?.toLowerCase()] || "default"}>
          {s?.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: "Updated Date",
      dataIndex: "created_at",
      key: "created_at",
      render: (d) => d ? dayjs(d).format("YYYY-MM-DD HH:mm") : "N/A"
    }
  ];

  /* RENDER */
  return (
    <div style={{ padding: "10px 20px", backgroundColor: "#eff8ff" }}>
      <Spin spinning={loading}>
        <Form
          layout="vertical"
          form={form}
          onFinish={onFinish}
          initialValues={{
            containerRows: [{}],
            placementRows: [{}]
          }}
        >
          {/* ════════ EXPORT DETAILS (HEADER) ════════ */}
          <Card
            className={Styles.card}
            bordered
            title={
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <CardHeader
                  icon="basil:document-solid"
                  title="EXPORT DETAILS"
                  open={open.export}
                  onToggle={() => toggle("export")}
                />
                <Space>
                  {jobData?.is_hod_approved && (
                    <Tag color="success" icon={<CheckCircleOutlined />}>Sales HOD Approved</Tag>
                  )}
                  {isExtended && jobData?.is_cs_hod_approved && (
                    <Tag color="processing" icon={<CheckCircleOutlined />}>CS HOD Approved</Tag>
                  )}
                </Space>
              </div>
            }
          >
            <div style={{ display: open.export ? "block" : "none" }}>
              <Row gutter={16}>
                <Col xs={24} md={6}>
                  <Form.Item className={Styles.formLabel} label="Export Number" name="export_number">
                    <Input readOnly variant="filled" disabled={isSalesSectionLocked} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={6}>
                  <Form.Item className={Styles.formLabel} label="Export Created Date" name="export_created_date">
                    <Input readOnly variant="filled" disabled={isSalesSectionLocked} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={6}>
                  <Form.Item className={Styles.formLabel} label="Customer Name" name="customer_name" rules={[{ required: true }]}>
                    <Input placeholder="Customer Name" disabled={isSalesSectionLocked} />
                  </Form.Item>
                </Col>
                {!isOthers && (
                  <Col xs={24} md={6}>
                    <Form.Item className={Styles.formLabel} label="Carrier Name" name="carrier_name">
                      <Input placeholder="Carrier Name" disabled={isSalesSectionLocked} />
                    </Form.Item>
                  </Col>
                )}

                {/* <Col xs={24} md={6}>
                  <Form.Item className={Styles.formLabel} label="Job No (AFSYS)" name="afsys_job_no">
                    <Input placeholder="Job No" disabled={isSalesSectionLocked} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={6}>
                  <Form.Item className={Styles.formLabel} label="Booking Ref No" name="booking_ref_no">
                    <Input placeholder="Booking Ref" disabled={isSalesSectionLocked} />
                  </Form.Item>
                </Col> */}
                <Col xs={24} md={6}>
                  <Form.Item className={Styles.formLabel} label="Status">
                    <Tag
                      color={STATUS_COLOR[jobData?.status] || STATUS_COLOR[jobData?.status?.toLowerCase()] || "default"}
                      style={{ fontWeight: 'bold', fontSize: '13px', padding: '0 10px' }}
                    >
                      {(jobData?.status || "Draft").toUpperCase()}
                    </Tag>
                  </Form.Item>
                </Col>

                <Col xs={24} md={6}>
                  <Form.Item className={Styles.formLabel} label="Contact PIC" name="contact_pic">
                    <Input placeholder="Contact PIC" disabled={isSalesSectionLocked} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={6}>
                  <Form.Item className={Styles.formLabel} label="Contact Details" name="phone_no">
                    <Input placeholder="Phone / Email" disabled={isSalesSectionLocked} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={6}>
                  <Form.Item className={Styles.formLabel} label="Commodity" name="commodity">
                    <Input placeholder="Commodity" disabled={isSalesSectionLocked} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={6}>
                  <Form.Item className={Styles.formLabel} label="Export Created By" name="created_by_name">
                    <Input readOnly variant="filled" />
                  </Form.Item>
                </Col>
              </Row>
            </div>
          </Card>

          {/* ════════ OTHERS JOB DETAILS ════════ */}
          {isOthers && (
            <Card
              className={Styles.card}
              bordered
              title={
                <CardHeader
                  icon="fluent:box-24-filled"
                  title="OTHERS JOB DETAILS"
                  open={open.others}
                  onToggle={() => toggle("others")}
                />
              }
            >
              <div style={{ display: open.others ? "block" : "none" }}>
                <Row gutter={16}>
                  <Col xs={24} md={6}>
                    <Form.Item label="CARRIER" name="carrier_remarks" className={Styles.formLabel}>
                      <Input placeholder="Free text carrier" disabled={isSalesSectionLocked} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={6}>
                    <Form.Item label="VSL/VOY" name="vessel_voyage_remarks" className={Styles.formLabel}>
                      <Input placeholder="Free text vessel/voyage" disabled={isSalesSectionLocked} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={6}>
                    <Form.Item label="POL (Port of Loading)" name="pol_remarks" className={Styles.formLabel}>
                      <Input placeholder="Free text POL" disabled={isSalesSectionLocked} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={6}>
                    <Form.Item label="POD (Port of Discharge)" name="pod_remarks" className={Styles.formLabel}>
                      <Input placeholder="Free text POD" disabled={isSalesSectionLocked} />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Form.Item label="FREIGHT MANIFEST" className={Styles.formLabel}>
                      <DocUploadField label="Freight Manifest" files={attachments.filter(d => d.doc_type === "FREIGHT MANIFEST")} setFiles={setAttachments} color="blue" onPreview={openPreview} salesInputId={id} category="others" docType="FREIGHT MANIFEST" disabled={isSalesSectionLocked} user={user} isAdmin={isAdmin} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item label="LOAD LIST UPLOADING" className={Styles.formLabel}>
                      <DocUploadField label="Load List" files={attachments.filter(d => d.doc_type === "LOAD LIST UPLOADING")} setFiles={setAttachments} color="gold" onPreview={openPreview} salesInputId={id} category="others" docType="LOAD LIST UPLOADING" disabled={isSalesSectionLocked} user={user} isAdmin={isAdmin} />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Form.Item label="TDR/Sailing Report" className={Styles.formLabel}>
                      <DocUploadField label="Sailing Report" files={attachments.filter(d => d.doc_type === "TDR/SAILING REPORT")} setFiles={setAttachments} color="green" onPreview={openPreview} salesInputId={id} category="others" docType="TDR/SAILING REPORT" disabled={isSalesSectionLocked} user={user} isAdmin={isAdmin} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item label="OTHER DOCS" className={Styles.formLabel}>
                      <DocUploadField label="Other Docs" files={attachments.filter(d => d.doc_type === "OTHER DOCS")} setFiles={setAttachments} color="purple" onPreview={openPreview} salesInputId={id} category="others" docType="OTHER DOCS" disabled={isSalesSectionLocked} user={user} isAdmin={isAdmin} />
                    </Form.Item>
                  </Col>
                </Row>
              </div>
            </Card>
          )}

          {/* ════════ CONTAINER DETAILS ════════ */}
          {!isOthers && (
            <Card
              className={Styles.card}
              bordered
              title={
                <CardHeader
                  icon="octicon:container-24"
                  title="CONTAINER DETAILS"
                  open={open.container}
                  onToggle={() => toggle("container")}
                />
              }
            >
              <div style={{ display: open.container ? "block" : "none" }}>
                <Form.List name="containerRows">
                  {(fields, { add, remove }) => (
                    <>
                      {fields.map(({ key, name, ...rest }) => (
                        <Row gutter={16} key={key} align="middle">
                          <Col xs={24} md={5}>
                            <Form.Item
                              className={Styles.formLabel}
                              {...rest}
                              name={[name, "equipment_type"]}
                              label="Equipment Type"
                              rules={[{ required: true }]}
                            >
                              <EquipmentTypeSelect disabled={isSalesSectionLocked} user={user} isAdmin={isAdmin} />
                            </Form.Item>
                          </Col>
                          <Col xs={24} md={4}>
                            <Form.Item className={Styles.formLabel} {...rest} name={[name, "quantity"]} label="Qty">
                              <Input placeholder="Qty" disabled={isSalesSectionLocked} user={user} isAdmin={isAdmin} />
                            </Form.Item>
                          </Col>
                          <Col xs={24} md={5}>
                            <Form.Item className={Styles.formLabel} {...rest} name={[name, "category"]} label="Category">
                              <CategorySelect disabled={isSalesSectionLocked} user={user} isAdmin={isAdmin} />
                            </Form.Item>
                          </Col>
                          <Col xs={24} md={4}>
                            <Form.Item className={Styles.formLabel} {...rest} name={[name, "quote"]} label="Quote">
                              <Input placeholder="Quote" disabled={isSalesSectionLocked} user={user} isAdmin={isAdmin} />
                            </Form.Item>
                          </Col>
                          <Col xs={24} md={4}>
                            <Form.Item className={Styles.formLabel} {...rest} name={[name, "cost"]} label="Cost">
                              <Input placeholder="Cost" disabled={isSalesSectionLocked} user={user} isAdmin={isAdmin} />
                            </Form.Item>
                          </Col>
                          <Col xs={24} md={1}>
                            <Button danger style={{ marginTop: "1rem" }} disabled={fields.length <= 1 || isSalesSectionLocked} icon={<DeleteOutlined />} onClick={() => remove(name)} />
                          </Col>
                          <Col xs={24} md={1}>
                            {!isSalesSectionLocked && <Button type="primary" style={{ marginTop: "1rem" }} icon={<PlusOutlined />} onClick={() => add()} />}
                          </Col>
                        </Row>
                      ))}
                    </>
                  )}
                </Form.List>

                <Row gutter={16} style={{ marginTop: 8 }}>
                  <Col xs={24}>
                    <Form.Item className={Styles.formLabel} label="Other Charges">
                      <div className={Styles.chipBox} style={{ border: '1px solid #d9d9d9', borderRadius: '4px', padding: '4px 11px', backgroundColor: '#fff' }}>
                        <Space wrap style={{ marginBottom: otherCharges.length ? 6 : 0 }}>
                          {otherCharges.map((c, i) => (
                            <Tag
                              key={i}
                              closable
                              color="cyan"
                              onClose={() => setOtherCharges((p) => p.filter((_, j) => j !== i))}
                            >
                              {c}
                            </Tag>
                          ))}
                        </Space>
                        <Input
                          bordered={false}
                          placeholder={isSalesSectionLocked ? "" : "Type a charge and press Enter…"}
                          value={chargeInput}
                          disabled={isSalesSectionLocked}
                          onChange={(e) => setChargeInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === ",") {
                              e.preventDefault();
                              const v = chargeInput.trim();
                              if (v && !otherCharges.includes(v)) {
                                setOtherCharges(p => [...p, v]);
                                setChargeInput("");
                              }
                            }
                          }}
                          style={{ padding: 0 }}
                        />
                      </div>
                    </Form.Item>
                  </Col>
                </Row>
              </div>
            </Card>
          )}

          {/* ════════ OTHER DETAILS (POL/POD etc) ════════ */}
          {!isOthers && (
            <Card
              className={Styles.card}
              bordered
              title={
                <CardHeader
                  icon="mingcute:ship-fill"
                  title="OTHER DETAILS"
                  open={open.otherDetails}
                  onToggle={() => toggle("otherDetails")}
                />
              }
            >
              <div style={{ display: open.otherDetails ? "block" : "none" }}>
                <Row gutter={16}>
                  {!isOthers && (
                    <>
                      <Col xs={24} md={6}>
                        <Form.Item className={Styles.formLabel} label="POL" name="port_of_loading" rules={[{ required: true }]}>
                          <Input placeholder="Port of Loading" disabled={isSalesSectionLocked} user={user} isAdmin={isAdmin} />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={6}>
                        <Form.Item className={Styles.formLabel} label="POD" name="port_of_discharge" rules={[{ required: true }]}>
                          <Input placeholder="Port of Discharge" disabled={isSalesSectionLocked} user={user} isAdmin={isAdmin} />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={6}>
                        <Form.Item className={Styles.formLabel} label="FPOD" name="final_pod">
                          <Input placeholder="Final Port of Discharge" disabled={isSalesSectionLocked} user={user} isAdmin={isAdmin} />
                        </Form.Item>
                      </Col>
                    </>
                  )}
                  <Col xs={24} md={6}>
                    <Form.Item className={Styles.formLabel} label="Terms of Shipment" name="terms_of_shipment">
                      <Select placeholder="Select Terms" allowClear disabled={isSalesSectionLocked}>
                        <Option value="prepaid">Prepaid</Option>
                        <Option value="collect">Collect</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={6}>
                    <Form.Item className={Styles.formLabel} label="Haulier Code" name="haulier_code">
                      <Input placeholder="Enter Code" disabled={isSalesSectionLocked} user={user} isAdmin={isAdmin} />
                    </Form.Item>
                  </Col>
                  <Col xs={12} md={6}>
                    <Form.Item className={Styles.formLabel} label="Name of Executive" name="name_of_executive">
                      <Input placeholder="Sales Executive" disabled={isSalesSectionLocked} user={user} isAdmin={isAdmin} />
                    </Form.Item>
                  </Col>
                  <Col xs={12} md={12}>
                    <Form.Item className={Styles.formLabel} label="Special Instruction if Any" name="special_instructions">
                      <TextArea placeholder="Enter any special instructions…" disabled={isSalesSectionLocked} user={user} isAdmin={isAdmin} />
                    </Form.Item>
                  </Col>
                  <Col xs={12} md={6}><Form.Item name="hbl" valuePropName="checked" noStyle><Checkbox disabled={isSalesSectionLocked}>HBL</Checkbox></Form.Item></Col>
                  <Col xs={12} md={6}><Form.Item name="fac" valuePropName="checked" noStyle><Checkbox disabled={isSalesSectionLocked}>FAC</Checkbox></Form.Item></Col>
                  <Col xs={12} md={6}><Form.Item name="documentation" valuePropName="checked" noStyle><Checkbox disabled={isSalesSectionLocked}>Documentation</Checkbox></Form.Item></Col>
                  <Col xs={12} md={6}><Form.Item name="transportation" valuePropName="checked" noStyle><Checkbox disabled={isSalesSectionLocked}>Transportation</Checkbox></Form.Item></Col>
                </Row>
              </div>
            </Card>
          )}


          {/* ════════ PLACEMENT DETAILS ════════ */}
          {!isOthers && showPlacement && (
            <Card
              className={Styles.card}
              bordered
              title={
                <CardHeader
                  icon="hugeicons:delivery-truck-02"
                  title="PLACEMENT DETAILS"
                  open={open.placement}
                  onToggle={() => toggle("placement")}
                />
              }
            >
              <div style={{ display: open.placement ? "block" : "none" }}>
                <Form.List name="placementRows">
                  {(fields, { add, remove }) => (
                    <>
                      {fields.map(({ key, name, ...restField }) => (
                        <Row key={key} gutter={16} align="middle">
                          <Col xs={24} md={4}><Form.Item {...restField} name={[name, "equipment_type"]} label="Equip Type"><EquipmentTypeSelect disabled={isSalesSectionLocked} /></Form.Item></Col>
                          <Col xs={24} md={3}><Form.Item {...restField} name={[name, "no_of_containers"]} label="Vol"><Input placeholder="Vol" disabled={isSalesSectionLocked} /></Form.Item></Col>
                          <Col xs={24} md={4}><Form.Item {...restField} name={[name, "category"]} label="Category"><CategorySelect disabled={isSalesSectionLocked} /></Form.Item></Col>
                          <Col xs={24} md={4}><Form.Item {...restField} name={[name, "placement_time"]} label="Date/Time"><DatePicker showTime format="YYYY-MM-DD HH:mm" style={{ width: "100%" }} disabled={isSalesSectionLocked} /></Form.Item></Col>
                          <Col xs={24} md={7}><Form.Item {...restField} name={[name, "special_remarks"]} label="Remarks"><Input placeholder="Remarks" disabled={isSalesSectionLocked} /></Form.Item></Col>
                          <Col xs={24} md={2}>
                            <Button danger disabled={fields.length <= 1 || isSalesSectionLocked} icon={<DeleteOutlined />} onClick={() => remove(name)} style={{ marginTop: '1.8rem' }} />
                          </Col>
                        </Row>
                      ))}
                      {!isSalesSectionLocked && <Button type="dashed" onClick={() => add()} block icon={<Icon icon="mdi:plus" />}>Add Placement Detail</Button>}
                    </>
                  )}
                </Form.List>
              </div>
            </Card>
          )}

          {/* ════════ BOOKING DETAILS ════════ */}
          {!isOthers && (
            <Card
              className={Styles.card}
              bordered
              title={
                <CardHeader
                  icon="mdi:anchor"
                  title="BOOKING DETAILS"
                  open={open.booking}
                  onToggle={() => toggle("booking")}
                />
              }
            >
              <div style={{ display: open.booking ? "block" : "none" }}>
                <Row gutter={16}>
                  <Col xs={24} md={6}>
                    <Form.Item className={Styles.formLabel} label="AFSYS Job No." name="afsys_job_no"><Input placeholder="Afsys Job No." disabled={isBookingSectionLocked} /></Form.Item>
                  </Col>
                  <Col xs={24} md={6}>
                    <Form.Item className={Styles.formLabel} label="Booking Vessel" name="booking_vessel"><Input placeholder="Booking Vessel" disabled={isBookingSectionLocked} /></Form.Item>
                  </Col>
                  <Col xs={24} md={6}>
                    <Form.Item className={Styles.formLabel} label="Booking Voyage" name="booking_voyage"><Input placeholder="Booking Voyage" disabled={isBookingSectionLocked} /></Form.Item>
                  </Col>
                  <Col xs={24} md={6}>
                    <Form.Item className={Styles.formLabel} label="Vessel ETA Date" name="vessel_eta"><DatePicker style={{ width: "100%" }} disabled={isBookingSectionLocked} /></Form.Item>
                  </Col>
                  <Col xs={24} md={6}>
                    <Form.Item className={Styles.formLabel} label="Booking Reference No." name="booking_ref_no"><Input placeholder="Booking Reference No." disabled={isBookingSectionLocked} /></Form.Item>
                  </Col>
                  <Col xs={24} md={6}>
                    <Form.Item className={Styles.formLabel} label="Load List/SI Cut Off Date" name="si_cut_off_date"><DatePicker style={{ width: "100%" }} disabled={isBookingSectionLocked} /></Form.Item>
                  </Col>
                  <Col xs={24} md={6}>
                    <Form.Item className={Styles.formLabel} label="Load List/SI Cut Off Time" name="si_cut_off_time"><TimePicker style={{ width: "100%" }} format="HH:mm" disabled={isBookingSectionLocked} /></Form.Item>
                  </Col>
                  <Col xs={24} md={6}>
                    <Form.Item className={Styles.formLabel} label="Booking Remarks" name="booking_remarks"><TextArea autoSize={{ minRows: 1 }} disabled={isBookingSectionLocked} /></Form.Item>
                  </Col>

                  {isExtended && (
                    <>
                      <Col xs={24} md={3}>
                        <Form.Item label="RO Req?" name="is_release_order_required">
                          <Radio.Group disabled={isBookingSectionLocked}>
                            <Radio value={true}>Yes</Radio>
                            <Radio value={false}>No</Radio>
                          </Radio.Group>
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={3}>
                        <Form.Item label="Payment Req?" name="is_payment_processing_required">
                          <Radio.Group disabled={isBookingSectionLocked}>
                            <Radio value={true}>Yes</Radio>
                            <Radio value={false}>No</Radio>
                          </Radio.Group>
                        </Form.Item>
                      </Col>
                    </>
                  )}

                  {isCrossTrade && jobData?.status === "STOPPED" && (
                    <Col span={24}>
                      <Alert
                        message={
                          <div>
                            <strong>Workflow Halted:</strong> {jobData?.stop_reason || "Release Order not required."}
                            <br />
                            <em>Please ensure all pending documentation is uploaded for final audit.</em>
                          </div>
                        }
                        type="warning"
                        showIcon
                        style={{ marginBottom: 16 }}
                      />
                    </Col>
                  )}

                  {isLiner && currentStage < 3 && !isSalesHODApproved && (
                    <Col span={24}>
                      <Alert
                        message="Operational Docs (Load List, Haulier Note, Cost Sheet) will be available after Sales HOD Approval (Stage 2)."
                        type="info"
                        showIcon
                        style={{ marginBottom: 16 }}
                      />
                    </Col>
                  )}

                  {(isROReq || !isExtended) && (
                    <Col xs={24} md={6}>
                      <Form.Item className={Styles.formLabel} label="Release Order(s)">
                        <DocUploadField label="Release Order" files={releaseOrderFiles} setFiles={setReleaseOrderFiles} color="blue" onPreview={openPreview} salesInputId={id} category="booking" docType="Release Order" disabled={isLinerCSUploadLocked} user={user} isAdmin={isAdmin} />
                      </Form.Item>
                    </Col>
                  )}
                  <Col xs={24} md={6}>
                    <Form.Item className={Styles.formLabel} label="BOC Attachment">
                      <DocUploadField label="BOC" files={bocFiles} setFiles={setBocFiles} color="volcano" onPreview={openPreview} salesInputId={id} category="booking" docType="BOC" disabled={isLinerCSUploadLocked} user={user} isAdmin={isAdmin} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={6}>
                    <Form.Item className={Styles.formLabel} label="Haulage Cost Sheet">
                      <DocUploadField label="Haulage Cost" files={haulageCostFiles} setFiles={setHaulageCostFiles} color="orange" onPreview={openPreview} salesInputId={id} category="booking" docType="Haulage Cost" disabled={isLinerCSUploadLocked} user={user} isAdmin={isAdmin} />
                    </Form.Item>
                  </Col>

                  {(isAdmin || (isLiner && isCS && String(currentStage) === '2') || (isCS && String(currentStage) === '2')) && !isTerminal && (
                    <>
                      <Col xs={24} md={3}>
                        <Form.Item label="Load List Req?" name="is_load_list_required">
                          <Radio.Group disabled={isLinerSelectorLocked}>
                            <Radio value={true}>Yes</Radio>
                            <Radio value={false}>No</Radio>
                          </Radio.Group>
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={3}>
                        <Form.Item label="Haulier Note Req?" name="is_haulier_note_required">
                          <Radio.Group disabled={isLinerSelectorLocked}>
                            <Radio value={true}>Yes</Radio>
                            <Radio value={false}>No</Radio>
                          </Radio.Group>
                        </Form.Item>
                      </Col>
                    </>
                  )}

                  {isLLReq && (
                    <Col xs={24} md={6}>
                      <Form.Item className={Styles.formLabel} label="Load List">
                        <DocUploadField label="Load List" files={loadListFiles} setFiles={setLoadListFiles} color="gold" onPreview={openPreview} salesInputId={id} category="booking" docType="Load List" disabled={isLinerCNFUploadLocked} user={user} isAdmin={isAdmin} />
                      </Form.Item>
                    </Col>
                  )}
                  <Col xs={24} md={24}><Form.Item className={Styles.formLabel} label="CNF Remarks" name="cnf_remarks"><TextArea disabled={isLinerCNFUploadLocked} /></Form.Item></Col>
                </Row>
              </div>
            </Card>
          )}

          {/* ════════ BANK SLIP & ACCOUNT REMARKS ════════ */}
          {jobData?.job_type !== "OTHERS" && !isLiner && (isPaymentReq || !isExtended) && (
            <Card
              className={Styles.card}
              bordered
              title={
                <CardHeader
                  icon="mdi:bank-outline"
                  title="BANK SLIP & ACCOUNT REMARKS"
                  open={open.bankAccounts}
                  onToggle={() => toggle("bankAccounts")}
                />
              }
            >
              <div style={{ display: open.bankAccounts ? "block" : "none" }}>
                <Row gutter={16}>
                  <Col xs={24} md={8}>
                    <Form.Item className={Styles.formLabel} label="Bank Slip(s)">
                      <DocUploadField label="Bank Slip" files={bankSlips} setFiles={setBankSlips} color="green" onPreview={openPreview} salesInputId={id} category="financial" docType="Bank Slip" disabled={isAccountsOnlyFieldLocked} user={user} isAdmin={isAdmin} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={16}>
                    <Form.Item className={Styles.formLabel} label="Account Remarks" name="account_remarks"><TextArea autoSize={{ minRows: 2 }} disabled={isAccountsOnlyFieldLocked} /></Form.Item>
                  </Col>
                </Row>
              </div>
            </Card>
          )}

          {/* ════════ DOCUMENTS (LPO / INVOICE) ════════ */}
          {jobData?.job_type !== "OTHERS" && (
            <Card
              className={Styles.card}
              bordered
              title={
                <CardHeader
                  icon="mdi:file-document-outline"
                  title="DOCUMENTS"
                  open={open.documents}
                  onToggle={() => toggle("documents")}
                />
              }
            >
              <div style={{ display: open.documents ? "block" : "none" }}>
                <Row gutter={16}>
                  {/* LPO / INVOICE section for both Forwarding and Liner */}
                  {(isLiner || !isLiner) && (
                    <>
                      <Col xs={24} md={8}>
                        <Form.Item className={Styles.formLabel} label="LPO">
                          <DocUploadField label="LPO" files={lpoFiles} setFiles={setLpoFiles} color="cyan" onPreview={openPreview} salesInputId={id} category="financial" docType="LPO" disabled={isFinancialSectionLocked} user={user} isAdmin={isAdmin} />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={8}>
                        <Form.Item className={Styles.formLabel} label="INVOICE">
                          <DocUploadField label="Invoice" files={invoiceFiles} setFiles={setInvoiceFiles} color="purple" onPreview={openPreview} salesInputId={id} category="financial" docType="Invoice" disabled={isFinancialSectionLocked} user={user} isAdmin={isAdmin} />
                        </Form.Item>
                      </Col>
                    </>
                  )}
                  {facFlag && (
                    <Col xs={24} md={8}>
                      <Form.Item className={Styles.formLabel} label="FAC">
                        <DocUploadField label="FAC" files={facFiles} setFiles={setFacFiles} color="magenta" onPreview={openPreview} salesInputId={id} category="financial" docType="FAC" disabled={isLinerCSUploadLocked} user={user} isAdmin={isAdmin} />
                      </Form.Item>
                    </Col>
                  )}
                </Row>
                <Row gutter={16} style={{ marginTop: '1rem' }}>
                  {/* <Col xs={24} md={8}>
                    <Form.Item className={Styles.formLabel} label="CRO">
                      <DocUploadField label="CRO" files={croFiles} setFiles={setCroFiles} color="orange" onPreview={openPreview} salesInputId={id} category="financial" docType="CRO" disabled={isStrictlyCSLocked} user={user} isAdmin={isAdmin} />
                    </Form.Item>
                  </Col> */}
                  <Col xs={24} md={8}>
                    <Form.Item className={Styles.formLabel} label="ED">
                      <DocUploadField label="ED" files={edFiles} setFiles={setEdFiles} color="geekblue" onPreview={openPreview} salesInputId={id} category="financial" docType="ED" disabled={isLinerCSUploadLocked} user={user} isAdmin={isAdmin} />
                    </Form.Item>
                  </Col>
                  {isHNReq && (
                    <Col xs={24} md={8}>
                      <Form.Item className={Styles.formLabel} label="HAULAGE NOTE">
                        <DocUploadField label="Haulage Note" files={haulageNoteFiles} setFiles={setHaulageNoteFiles} color="volcano" onPreview={openPreview} salesInputId={id} category="financial" docType="Haulage Note" disabled={isLinerCSUploadLocked} user={user} isAdmin={isAdmin} />
                      </Form.Item>
                    </Col>
                  )}
                  {hblFlag && (
                    <Col xs={24} md={8}>
                      <Form.Item className={Styles.formLabel} label="HBL">
                        <DocUploadField label="HBL" files={hblFiles} setFiles={setHblFiles} color="blue" onPreview={openPreview} salesInputId={id} category="financial" docType="HBL" disabled={isLinerCSUploadLocked} user={user} isAdmin={isAdmin} />
                      </Form.Item>
                    </Col>
                  )}
                </Row>
              </div>
            </Card>
          )}

          {/* ════════ ATTACHMENTS AND COMMENTS ════════ */}
          <Card
            className={Styles.card}
            bordered
            title={
              <CardHeader
                icon="mdi:comment-text-multiple-outline"
                title="ATTACHMENTS AND COMMENTS"
                open={open.attachments}
                onToggle={() => toggle("attachments")}
              />
            }
          >
            <div style={{ display: open.attachments ? "block" : "none" }}>
              <Row gutter={32}>
                <Col xs={24} md={12}>
                  <Typography.Text strong style={{ display: 'block', marginBottom: 8, fontSize: 13, color: '#4b5563' }}>REMARKS</Typography.Text>
                  <div style={{ maxHeight: 300, overflowY: 'auto', marginBottom: 16 }}>
                    {remarks.map((r, i) => {
                      const isObject = typeof r === 'object' && r !== null;
                      const text = isObject ? r.text : r;
                      const authorName = isObject ? r.user_name : null;
                      const authorId = isObject ? r.user_id : null;
                      const canDelete = isAdmin || authorId === user?.id || !authorId; // !authorId allows deleting legacy string remarks for now

                      return (
                        <div key={i} style={{ position: 'relative', padding: '12px 32px 12px 12px', backgroundColor: '#f9f9f9', border: '1px solid #e5e7eb', borderRadius: 8, marginBottom: 8 }}>
                          {canDelete && (
                            <Button
                              type="text"
                              size="small"
                              danger
                              icon={<DeleteOutlined />}
                              style={{ position: "absolute", top: 6, right: 6 }}
                              onClick={() => setRemarks((p) => p.filter((_, j) => j !== i))}
                            />
                          )}
                          <p style={{ margin: 0, fontSize: 13, color: '#1f2937' }}>{text}</p>
                          {authorName && (
                            <Typography.Text type="secondary" style={{ fontSize: '10px', display: 'block', marginTop: 4 }}>
                              — {authorName} {r.date ? `on ${dayjs(r.date).format("DD MMM YY HH:mm")}` : ""}
                            </Typography.Text>
                          )}
                        </div>
                      );
                    })}
                    {remarks.length === 0 && <Typography.Text type="secondary" style={{ fontStyle: 'italic', fontSize: 12 }}>No general remarks yet.</Typography.Text>}
                  </div>

                  <Typography.Text strong style={{ display: 'block', marginBottom: 8, fontSize: 13, color: '#4b5563' }}>ADD REMARK</Typography.Text>
                  <TextArea
                    value={newRemark}
                    onChange={(e) => setNewRemark(e.target.value)}
                    placeholder="Enter your remarks here…"
                    autoSize={{ minRows: 3 }}
                    style={{ marginBottom: 12 }}
                  />
                  <Button
                    type="primary"
                    onClick={() => {
                      if (newRemark.trim()) {
                        setRemarks(p => [...p, {
                          text: newRemark.trim(),
                          user_id: user?.id,
                          user_name: user?.first_name || user?.name || "User",
                          date: new Date().toISOString()
                        }]);
                        setNewRemark("");
                      }
                    }}
                    icon={<PlusOutlined />}
                  >
                    Add Remark
                  </Button>
                </Col>

                <Col xs={24} md={12}>
                  <Typography.Text strong style={{ display: 'block', marginBottom: 8, fontSize: 13, color: '#4b5563' }}>ATTACHMENTS</Typography.Text>
                  <DocUploadField label="Attachment" files={attachments.filter(d => d.doc_type === "Attachment")} setFiles={setAttachments} color="blue" onPreview={openPreview} salesInputId={id} category="attachments" docType="Attachment" user={user} isAdmin={isAdmin} />
                </Col>
              </Row>
            </div>
          </Card>

          {/* ════════ APPROVAL STATUS (HISTORY) ════════ */}
          <Card
            className={Styles.card}
            bordered
            title={
              <CardHeader
                icon="mdi:check-decagram-outline"
                title="APPROVAL STATUS & HISTORY"
                open={open.approvalStatus}
                onToggle={() => toggle("approvalStatus")}
              />
            }
          >
            <div style={{ display: open.approvalStatus ? "block" : "none" }}>
              <Table
                dataSource={approvalHistory}
                columns={approvalColumns}
                rowKey="id"
                pagination={false}
                size="small"
                scroll={{ x: 'max-content' }}
              />

              {/* Action Box */}
              {jobData?.status !== "draft" && !isTerminal && canApprove && (
                <div style={{ marginTop: 16, padding: 16, backgroundColor: "#fff", borderRadius: 12, border: "1px solid #e0e7ff", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
                  <Typography.Text strong style={{ display: "block", marginBottom: 12, color: "#1f2937" }}>Approval Remarks & Actions</Typography.Text>
                  <Form.Item name="approvalRemarks">
                    <TextArea placeholder="Enter remarks for approval/rejection..." rows={3} style={{ borderRadius: 8 }} />
                  </Form.Item>

                  {isLiner && String(currentStage) === '5' && isCS && (
                    <div style={{ marginBottom: 16, padding: '12px', border: '1px solid #ffe7ba', borderRadius: 8, backgroundColor: '#fffbe6' }}>
                      <Typography.Text strong style={{ display: 'block', marginBottom: 8, color: '#d46b08' }}>
                        LPO / INVOICE SELECTION (Stage 5 Decision)
                      </Typography.Text>
                      <Form.Item name="lpo_invoice_selection" rules={[{ required: true, message: 'Please select YES to proceed or NO to stop flow.' }]}>
                        <Radio.Group>
                          <Radio value="YES">YES (Proceed with missing docs)</Radio>
                          <Radio value="NO">NO (STOP - Wait for all docs)</Radio>
                        </Radio.Group>
                      </Form.Item>
                    </div>
                  )}
                  <Space>
                    <Button
                      type="primary"
                      onClick={() => handleAction("Approved")}
                      icon={<Icon icon="mdi:check-circle" />}
                      loading={loading}
                      disabled={isHalted}
                      style={{ borderRadius: 8, height: 40, padding: "0 24px" }}
                    >
                      {isLiner && currentStage === 2 && isSalesHOD ? "Approve (Sales HOD)" : (
                        isLiner && currentStage === 3 ? "Approve (CS Booking)" : (
                          isLiner && currentStage === 4 ? "Approve (CNF Transport)" : (
                            isLiner && currentStage === 5 ? "Approve (Final Closure)" : (
                              isForwarding && currentStage === '2' && isCS ? "Apply CS Updates" : (
                                isForwarding && currentStage === '2' && isSalesHOD ? "Approve (Sales HOD)" : "Approve / Verify"
                              )
                            )
                          )
                        )
                      )}
                    </Button>
                    <Button
                      danger
                      onClick={() => handleAction("Rejected")}
                      icon={<Icon icon="mdi:close-circle" />}
                      loading={loading}
                      style={{ borderRadius: 8, height: 40, padding: "0 24px" }}
                    >
                      Reject
                    </Button>
                  </Space>
                </div>
              )}
            </div>
          </Card>

          {isHalted && (
            <Alert
              message={jobData?.status === "STOPPED" ? "WORKFLOW STOPPED" : "Pending Stage Requirements"}
              description={jobData?.status === "STOPPED"
                ? (approvalHistory?.find(h => h.status === 'STOPPED')?.remarks || "This job has been stopped by CS HOD due to missing documents.")
                : (isLiner
                  ? "This stage cannot be approved until the required documents are uploaded by the designated department."
                  : `This ${jobData.job_type} job cannot proceed because a mandatory workflow component has been marked as 'No'. Please verify with your supervisor.`
                )}
              type={jobData?.status === "STOPPED" ? "error" : "warning"}
              showIcon
              style={{ marginTop: 16, marginBottom: 16 }}
            />
          )}

          {((!isHOD && !isGM) || canApprove || (isLiner && isCS && (String(currentStage) === '2' || String(currentStage) === '3' || String(currentStage) === '4A' || String(currentStage) === '4B'))) && (
            <Space
              style={{
                display: "flex",
                justifyContent: "center",
                width: "100%",
                marginTop: "1.5rem",
                marginBottom: "1rem",
              }}
            >
              {canApprove ? (
                <>
                  <Button
                    type="primary"
                    onClick={() => handleAction("Approved")}
                    icon={<Icon icon="mdi:check-circle" />}
                    loading={loading}
                    disabled={isHalted}
                    style={{ borderRadius: 8, height: 40, padding: "0 24px" }}
                  >
                    {isLiner && String(currentStage) === '2' && isSalesHOD ? "Approve (Sales HOD)" : (
                      isLiner && String(currentStage) === '3' ? "Verify (CNF Team)" : (
                        isLiner && (String(currentStage) === '4A' || String(currentStage) === '4B') ? "Verify Docs (CS Team)" : (
                          isLiner && String(currentStage) === '5' ? (form.getFieldValue('lpo_invoice_selection') === 'NO' ? "Stop Workflow" : "Verify (CS Team)") : (
                            isLiner && String(currentStage) === '6' ? "Confirm Payment (Accounts)" : (
                              isLiner && String(currentStage) === '7' ? "Close Job" : (
                                isForwarding && String(currentStage) === '2' && isCS ? "Apply CS Updates" : (
                                  isForwarding && String(currentStage) === '2' && isSalesHOD ? "Approve (Sales HOD)" : "Approve / Verify"
                                )
                              )
                            )
                          )
                        )
                      )
                    )}
                  </Button>
                  <Button
                    danger
                    onClick={() => handleAction("Rejected")}
                    icon={<Icon icon="mdi:close-circle" />}
                    loading={loading}
                    style={{ borderRadius: 8, height: 40, padding: "0 24px" }}
                  >
                    Reject
                  </Button>
                </>
              ) : (
                ((!isHOD && !isGM) || (isLiner && isCS && (String(currentStage) === '2' || String(currentStage) === '3' || String(currentStage) === '4A' || String(currentStage) === '4B'))) && (
                  <>
                    <Button type="primary" htmlType="submit" icon={<Icon icon="mdi:content-save" />}>
                      {isLiner && (isCS || isCNF) && !isTerminal && (String(currentStage) === '2' || String(currentStage) === '3') ? "Submit CS Update" : "Submit"}
                    </Button>
                    {jobData?.status === "draft" && (
                      <Button
                        type="primary"
                        style={{ backgroundColor: "#10b981", borderColor: "#10b981" }}
                        icon={<Icon icon="mdi:send" />}
                        onClick={() => handleAction("Submit")}
                      >
                        Submit Job
                      </Button>
                    )}
                  </>
                )
              )}

              <Button icon={<Icon icon="tabler:refresh" />} onClick={handleReset}>
                Reset Form
              </Button>
            </Space>
          )}
          {/* ════════ PREVIEW MODAL ════════ */}
          <Modal
            open={previewVisible}
            footer={null}
            title={"Attachments"}
            onCancel={() => setPreviewVisible(false)}
            width="90%"
            style={{ top: 20 }}
            styles={{ body: { height: "87vh", padding: 0 } }}
            destroyOnClose
          >
            {previewVisible && previewUrls.length > 0 && (
              <MultiFileViewer urls={previewUrls} defaultIndex={previewIndex} />
            )}
          </Modal>
        </Form>
      </Spin>
    </div>
  );
};

export default Approval;
