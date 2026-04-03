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
  Steps,
  Tooltip,
} from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  UploadOutlined,
  PaperClipOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
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
                <Icon icon="famicons:document-attach" style={{ color: '#747474' }} />
                {/* <PaperClipOutlined style={{ color: '#1890ff' }} /> */}
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
                <Tooltip title="Preview">
                <Button icon={<EyeOutlined/>} type="link" size="small" onClick={() => onPreview(i)}/>
                </Tooltip>
                <Tooltip title="Delete">
                {canEditFile && <Button type="text" danger size="small" icon={<DeleteOutlined />} onClick={() => onRemove(i)} />}
                </Tooltip>
              </Space>
            </div>
            {canEditFile ? (
              <Input
                size="large"
                placeholder="Remarks..."
                value={file.remarks || ""}
                onChange={(e) => onRemarkChange(i, e.target.value)}
                style={{ fontSize: '12px', marginTop: '2px', padding: "7px" }}
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
  restrictionMessage = null,
  isMasterMode = false,
  user,
  isAdmin
}) => {
  const handleBeforeUpload = async (file) => {
    if (restrictionMessage) {
      message.error(restrictionMessage);
      return false;
    }
    if (isMasterMode) {
      message.warning("Uploads are disabled in View-Only Mode");
      return false;
    }
    if (!salesInputId && !isMasterMode) {
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
          uploaded_by_user_name: uploadedDoc.uploaded_by_user_name || user?.get_full_name || user?.name || "Me"
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
      <Upload multiple showUploadList={false} beforeUpload={handleBeforeUpload}>
        <Button size="small" icon={<UploadOutlined />} style={{ fontSize: 12 }} disabled={disabled}>
          {files.length === 0 ? `Upload ${label}` : "Add More"}
        </Button>
      </Upload>
      {disabled && restrictionMessage && (
        <Typography.Text type="secondary" style={{ display: "block", marginTop: 4, fontSize: 12 }}>
          {restrictionMessage}
        </Typography.Text>
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
  const actionThrottleRef = useRef(false);
  const [jobData, setJobData] = useState(null);
  const [open, setOpen] = useState({
    export: true,
    container: true,
    others: true,
    otherDetails: true,
    placement: true,
    booking: true,
    bankAccounts: false,
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
  const [haulierNoteFiles, setHaulierNoteFiles] = useState([]);
  const [preAlertFiles, setPreAlertFiles] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [hblFiles, setHblFiles] = useState([]);
  const [csHodOptions, setCsHodOptions] = useState([]);
  const [otherCharges, setOtherCharges] = useState([]);
  const [chargeInput, setChargeInput] = useState("");
  const [remarks, setRemarks] = useState([]);
  const [newRemark, setNewRemark] = useState("");
  const [approvalHistory, setApprovalHistory] = useState([]);

  const userRoles = (user?.roles || []).map(r => (typeof r === 'object' ? r.name : r).toUpperCase());
  const userDepts = [
    ...(user?.departments_assigned_names || []),
    ...(user?.department_names || []),
    user?.department || ""
  ].filter(Boolean).map(d => String(d).toUpperCase()).filter(Boolean);

  const isAdmin = userRoles.some(r => ["admin", "ADMIN", "SUPER ADMIN"].includes(r));
  const isSuperUser = userRoles.some(r => r.toUpperCase().includes("SUPER USER")) || isAdmin;

  // Refined Role Identification (Strictly departmental, removed generic 'EXECUTIVE/APPROVER' matches)
  // Refined Role Identification (Strictly departmental, removed generic 'EXECUTIVE/APPROVER' matches)
  const isCS = userDepts.some(d => d.includes("CUSTOMER SERVICE") || d.includes("DOCUMENTATION") || d.includes("SHIPPING")) ||
    userRoles.some(r => r.includes("CUSTOMER SERVICE") || r.includes("DOCS"));

  const isCNF = userDepts.some(d => {
    const du = d.toUpperCase();
    return du.includes("C&F") || du.includes("CNF") || du.includes("CLEARANCE") || du.includes("FORWARDING") || du.includes("OPERATIONS") || du.includes("LOGISTICS");
  }) || userRoles.some(r => {
    const ru = r.toUpperCase();
    return ru.includes("C&F") || ru.includes("CNF") || ru.includes("CLEARANCE") || ru.includes("FORWARDING") || ru.includes("OPERATIONS") || ru.includes("LOGISTICS");
  });

  const isSales = userDepts.some(d => d.toUpperCase().includes("SALES")) ||
    userRoles.some(r => r.toUpperCase().includes("SALES") || r.toUpperCase().includes("CREATOR"));

  const isAccounts = userDepts.some(d => d.toUpperCase().includes("ACCOUNTS") || d.toUpperCase().includes("FINANCE") || d.toUpperCase().includes("PAYABLE")) ||
    userRoles.some(r => r.toUpperCase().includes("ACCOUNTS") || r.toUpperCase().includes("FINANCE") || r.toUpperCase().includes("PAYABLE"));

  const isHOD = userRoles.some(role => ["HOD", "APPROVER", "MANAGER", "PRINCIPAL"].includes(role.toUpperCase()));
  const isGM = userRoles.some(role => role.toUpperCase() === "GM");

  // PRD v4.0 Strict Role Definitions
  const isSalesExecutive = (isSales && !isHOD) || isAdmin;
  const isSalesHOD = (isSales && isHOD) || isAdmin;
  const isCNFExecutive = (isCNF && !isHOD) || isAdmin;
  const isCSExecutive = (isCS && !isHOD) || isAdmin;
  const isCSHOD = (isCS && isHOD) || isAdmin;
  const isAccountsTeam = isAccounts || isAdmin;
  const isDocsTeam = userRoles.some(r => r.includes("DOCS")) || userDepts.some(d => d.includes("DOCS"));
  const isCNFHOD = isCNF && isHOD;
  
  // Strict User-Requested Filter: Only roles with 'EXECUTIVE' or 'HOD' names can approve/reject
  const hasAllowedRole = userRoles.some(r => 
    r.includes("EXECUTIVE") || 
    r.includes("HOD") || 
    r.includes("APPROVER") || 
    r.includes("GM") ||
    r.includes("UPLOADER")
  ) || isAdmin;

  const currentStage = String(jobData?.current_stage || "1");

  // Creator check — use created_by_user from jobData or fall back to "Sales Created" history entry
  const creatorUserId = jobData?.created_by_user || approvalHistory.find(h => h.stage === "Sales Created")?.updated_by_user;
  const isCreator = !!(creatorUserId && creatorUserId === user?.id);

  const jobTypeUpper = (jobData?.job_type || "").toUpperCase();
  const isLiner = jobTypeUpper.includes("LINER");
  const isCrossTrade = jobTypeUpper.includes("CROSS_TRADE") || jobTypeUpper.includes("CROSS TRADE");
  const isForwarding = jobTypeUpper.includes("FORWARDING");
  const isOthers = jobTypeUpper.includes("OTHERS");
  const isMasterMode = !id;

  // Extended 9-stage workflow for Cross Trade and Forwarding
  const isExtended = isCrossTrade || isForwarding;

  const isTerminal = (jobData?.status === "approved" && !isExtended && !isLiner) || jobData?.status === "rejected" || jobData?.status === "REJECTED-CLOSED" || currentStage === "9" || jobData?.status === "Completed" || jobData?.status === "completed";
  const isAccountsStage = (isLiner || isExtended) ? currentStage === "6" : (isOthers ? currentStage === "7" : false);
  const isForwardingStage5 = isForwarding && currentStage === '5';

  // Unified Stage Sequence (Stage 3=CNF, Stage 5=CSHOD Approval, Stage 6=Accounts)
  const isCNFStage = (isLiner || isExtended) ? currentStage === "3" : (isForwarding ? currentStage === "3" : false);
  const isCSHODStage = (isLiner || isExtended) ? currentStage === "5" : false;
  const isStage2 = currentStage === "2";
  const isStage3 = currentStage === "3";
  const userFullName = `${user?.first_name || ""} ${user?.last_name || ""}`.trim();

  // ─── Stage 2 Role Gates (edit this block to change stage 2 access rules) ───
  const stage2 = {
    isThisJobsHOD : isStage2 && !jobData?.is_hod_approved && jobData?.sales_hod?.toLowerCase().trim() === userFullName?.toLowerCase().trim(),  // current user is the designated HOD for this job (hidden once approved)
    csCanAct      : isStage2 && isCS, // HOD approved, CS can act regardless of is_cs_updated status
    creatorLocked : isCreator && jobData?.status !== "draft",           // creator sees read-only after submitting
  };
  // Approve/Reject buttons hidden when user has no action to take at stage 2
  const isStage2ButtonsHidden = isStage2 && !isAdmin && (
    (isCS  && !stage2.csCanAct) ||
    (!isCS && !stage2.isThisJobsHOD)
  );
  // ─────────────────────────────────────────────────────────────────────────────

  const showDocumentUploads = ((!(isStage2 || isStage3) || isMasterMode || isForwardingStage5) && !isCNF) || (isMasterMode && isCNF) || (isCNF && isForwarding && currentStage === "3");
  const showROBOCForCS = isStage2 && isCS && !isAdmin;
  const needsLpoInvoice = currentStage === "4" || currentStage === "4B" || currentStage === "5";

  // Sales HOD Restriction for Liner (Attachments & Comments only)
  const isSalesHODLinerRestricted = isLiner && isSalesHOD && !isAdmin;

  // PRD v4.0 Section Locks — all share the same base guards for clarity
  const isGlobalHODReadOnly = isHOD && !isAdmin && !isCreator;
  const baseLocked = isMasterMode || stage2.creatorLocked || isTerminal || (!isAdmin && isForwarding && currentStage === "5"); // stage 5 Forwarding = CS HOD approval only, all fields read-only

  // CNF work is done once load list is uploaded — lock everything for CNF after that
  const isCNFDone = !isAdmin && isCNF && !!jobData?.is_cnf_loadlist_uploaded;

  const isSalesSectionLocked   = baseLocked || ((!isSalesExecutive && !isCreator && !isAdmin) || (currentStage !== "1" && currentStage !== "2" && currentStage !== "3" && !isAdmin) || isGlobalHODReadOnly);
  const csBookingEditStage = isStage2 || (isLiner && currentStage === "4"); // Forwarding stage 4: booking is read-only for CS
  const isBookingSectionLocked = baseLocked || (!isAdmin && (!isCS || !csBookingEditStage));
  const isCNFSectionLocked     = baseLocked || isCNFDone || ((!isCNF && !isAdmin) || (!isCNFStage && !(isLiner && isStage2) && !isAdmin));
  const isAccountsOnlyFieldLocked     = baseLocked || ((!isAccountsTeam && !isAdmin) || (!isAccountsStage && !isAdmin));
  const isAccountsEditableFieldLocked = (isExtended && isAccountsStage) ? (!isAccountsTeam && !isAdmin) : isAccountsOnlyFieldLocked;

  const isCSUploadLocked       = baseLocked || (!isCS && !isAdmin);
  const isCNFUploadLocked      = baseLocked || isCNFDone || ((!isCNF && !isAdmin) || (!isCNFStage && !(isLiner && isStage2) && !isAdmin));
  const isAccountsUploadLocked = isMasterMode || isTerminal || (!isAccountsTeam && !isAdmin) || (currentStage < "5" && !isAdmin);
  const isRequirementSelectorLocked = (!isCS && !isAdmin && !isMasterMode) || isSalesHODLinerRestricted || (!isMasterMode && parseInt(currentStage) > 2 && !isAdmin);

  // Reactive visibility using Form.useWatch (handles both initial values and live changes)
  const isLLReqForm = Form.useWatch("is_load_list_required", form);
  const isHNReqForm = Form.useWatch("is_haulier_note_required", form);
  const isROReqForm = Form.useWatch("is_release_order_required", form);
  const isLNR_LPO_ReqForm = Form.useWatch("is_lpo_invoice_required", form);
  const isPaymentReqForm = Form.useWatch("is_payment_processing_required", form);
  const facFlagForm = Form.useWatch("fac", form);
  const hblFlagForm = Form.useWatch("hbl", form);
  const documentationFlagForm = Form.useWatch("documentation", form);

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

  const isCompleted = jobData?.status === "Completed" || jobData?.status === "completed" || jobData?.status === "approved";

  const isLLReq = isTrue(isLLReqForm, jobData?.is_load_list_required);
  const isHNReq = isTrue(isHNReqForm, jobData?.is_haulier_note_required);
  const isROReq = isTrue(isROReqForm, jobData?.is_release_order_required);
  const releaseOrderRequirementMet =
    isROReq || (!isLiner && !isExtended) || isMasterMode;
  const csStage4UploadLocked = isCS && !isAdmin && currentStage === "4"; // RO/BOC locked for CS at stage 4 (already uploaded at stage 2)
  const releaseOrderDisabled =
    csStage4UploadLocked || (isCNFUploadLocked && !isCS) || (!releaseOrderRequirementMet && !isCS);
  const releaseOrderRestrictionMessage = (() => {
    if (isCNFUploadLocked && !isCS) {
      return isLiner && !isCNF ? "CNF is allowed to upload it" : null;
    }
    if (!releaseOrderRequirementMet && !isCS) {
      return "Release Order upload is disabled until the requirement is turned on.";
    }
    return null;
  })();
  const haulierNoteEnabled = isHNReq || (!isLiner && !isExtended) || isMasterMode;
  const isPaymentReq = isTrue(isLNR_LPO_ReqForm, jobData?.is_lpo_invoice_required) || isTrue(isPaymentReqForm, jobData?.is_payment_processing_required);
  const facFlag = isTrue(facFlagForm, jobData?.fac);
  const hblFlag = isTrue(hblFlagForm, jobData?.hbl);
  const documentationFlag = isTrue(documentationFlagForm, jobData?.documentation);

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



  // STOP Alert Visibility for Liner/Cross-Trade
  const showLinerStopAlert = (isLiner || isCrossTrade) && currentStage === "5" && !isPaymentReq;

  const isStoppedCrossTrade = isCrossTrade && (jobData?.status === "STOPPED" || jobData?.is_blocked);
  const isHalted = showLinerStopAlert || isStoppedCrossTrade;

  // Department-based visibility logic
  // Department-based visibility logic
  // Re-aligned for 7-stage Forwarding Flow:
  // Stage 1: Sales (Draft) -> Stage 2: Sales HOD -> Stage 3: CS -> Stage 4: CNF -> Stage 5: CS -> Stage 6: CS HOD -> Stage 7: Accounts
  // Unified 7-Stage Workflow canApprove Logic
  const canApprove = hasAllowedRole && (isAdmin || (
    (currentStage === "2" && (isSalesHOD || stage2.isThisJobsHOD || isCS || isCNF)) ||
    (isForwarding && currentStage === "3" && isCNF && !isCNFDone) ||  // CNF team acts at stage 3 for Forwarding (until load list uploaded)
    (currentStage === "3" && !isForwarding && (isLiner || isCrossTrade ? isCNFHOD : isCSHOD)) ||
    (isExtended && !isForwarding && currentStage === "3" && isCNFHOD) ||
    (isExtended && currentStage === "4" && isCS) ||
    (isForwarding && currentStage === "5" && isCSHOD) ||  // CS HOD approves at stage 5 for Forwarding
    (isExtended && !isForwarding && currentStage === "5" && isAccountsTeam) ||
    ((isLiner && isCNFStage) && (isCNF || (isLiner && isSalesHOD))) ||
    ((isLiner && currentStage === "4") && isCS) ||
    ((isLiner && isCSHODStage) && isCSHOD) ||
    ((isLiner && currentStage === "6") && isAccountsTeam) ||
    ((isLiner && currentStage === "7") && (isCS || isCNF))
  ));
  /* ── Fetch Data ── */
  useEffect(() => {
    if (id) {
      fetchJobDetails();
    }
  }, [id]);

  // Fetch CS HOD options for dropdown
  useEffect(() => {
    const fetchCsHodOptions = async () => {
      try {
        const res = await apiClient.get("/accounts/liner/admin/users/hods/");
        const data = res.data?.results ?? res.data ?? [];
        setCsHodOptions(data.map(item => ({
          value: item.id,
          label: item.get_full_name || item.email || `${item.first_name} ${item.last_name}`
        })));
      } catch (err) {
        console.error("Failed to fetch CS HOD options:", err);
      }
    };
    fetchCsHodOptions();
  }, []);

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
          overseas_agent_name: data.overseas_agent_name,
          commodity: data.commodities?.map(c => c.name).join(", "),
          port_of_loading: data.port_of_loading,
          port_of_discharge: data.port_of_discharge,
          final_pod: data.final_pod,
          terms_of_shipment: data.terms_of_shipment,
          haulier_code: data.haulier_code,
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
          remarks: data.remarks,
          carrier_remarks: data.carrier_remarks,
          vessel_voyage_remarks: data.vessel_voyage_remarks,
          pol_remarks: data.pol_remarks,
          name_of_executive: data.name_of_executive,
          pod_remarks: data.pod_remarks,

          // PRD v3.2 Relocated ETA Fields
          vsl_initial_eta: data.vsl_initial_eta ? dayjs(data.vsl_initial_eta) : null,
          vsl_latest_eta: data.vsl_latest_eta ? dayjs(data.vsl_latest_eta) : null,
          vsl_etd: data.vsl_etd ? dayjs(data.vsl_etd) : null,
          pod_eta: data.pod_eta ? dayjs(data.pod_eta) : null,

          // PRD v3.2 Restricted Accounts Fields
          carrier_name_2: data.carrier_name_2,
          invoice_date: data.invoice_date ? dayjs(data.invoice_date) : null,

          // Container Rows
          containerRows: data.container_details?.map(c => ({
            id: c.id,
            equipment_type: c.equipment_type,
            quantity: c.quantity,
            category: c.category,
            quote: c.quote,
            cost: c.cost,
          })) || [{}],

          // Placement Rows
          placementRows: data.transportation_rows?.map(t => ({
            id: t.id,
            equipment_type: t.equipment_type,
            no_of_containers: t.no_of_containers,
            category: t.category,
            placement_time: t.placement_time ? dayjs(t.placement_time) : null,
            pickup_location: t.pickup_location,
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
          cs_hod: data.cs_hod,
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
          const preAlertList = filterBy(["PRE-ALERT", "PRE ALERT", "PREALERT"], ["PRE_ALERT", "PREALERT"]);

          setReleaseOrderFiles(roList);
          setBocFiles(bocList);
          setHaulageCostFiles(hCostList);
          setLoadListFiles(llList);
          setLpoFiles(lpoList);
          setInvoiceFiles(invList);
          setFacFiles(facList);
          setCroFiles(croList);
          setEdFiles(edList);
          setHaulierNoteFiles(hnList);
          setBankSlips(bankList);
          setHblFiles(hblList);
          setPreAlertFiles(preAlertList);

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
            ...preAlertList.map(d => d.id),
          ]);
          setAttachments(docs.filter(d => !capturedIds.has(d.id)));

        }

        // Map History (Sort chronologically: Sales Created first)
        const sortedHistory = (data.approval_history || []).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        setApprovalHistory(sortedHistory);

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
      ...haulierNoteFiles.map(f => ({ ...f, doc_type: "Haulage Note", category: "financial" })),
      ...preAlertFiles.map(f => ({ ...f, doc_type: "Pre-Alert", category: "booking" })),
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
      is_lpo_invoice_required: values.is_lpo_invoice_required,
      is_release_order_required: values.is_release_order_required,
      is_payment_processing_required: values.is_payment_processing_required,
      is_payment_docs_required: values.is_payment_docs_required,
      is_load_list_required: values.is_load_list_required,
      is_haulier_note_required: values.is_haulier_note_required,
      overseas_agent_name: values.overseas_agent_name,
      name_of_executive: values.name_of_executive,
      special_instructions: values.special_instructions,
      fac: values.fac,
      hbl: values.hbl,
      cs_hod: values.cs_hod,

      // PRD v3.2 Relocated ETA Fields
      vsl_initial_eta: values.vsl_initial_eta ? dayjs(values.vsl_initial_eta).format("DD-MM-YYYY") : null,
      vsl_latest_eta: values.vsl_latest_eta ? dayjs(values.vsl_latest_eta).format("DD-MM-YYYY") : null,
      vsl_etd: values.vsl_etd ? dayjs(values.vsl_etd).format("DD-MM-YYYY") : null,
      pod_eta: values.pod_eta ? dayjs(values.pod_eta).format("DD-MM-YYYY") : null,

      // PRD v3.2 Restricted Accounts Fields
      carrier_name_2: values.carrier_name_2,
      invoice_date: values.invoice_date ? dayjs(values.invoice_date).format("DD-MM-YYYY") : null,

      commodities: values.commodity !== undefined
        ? (values.commodity ? values.commodity.split(",").map(c => ({ name: c.trim() })).filter(c => c.name) : [])
        : undefined,
      container_details: values.containerRows?.map(r => ({
        id: r.id,
        equipment_type: r.equipment_type,
        quantity: parseInt(r.quantity) || 0,
        category: r.category,
        quote: r.quote,
        cost: parseFloat(r.cost) || 0
      })),

      transportation_rows: values.placementRows?.map(r => ({
        id: r.id,
        equipment_type: r.equipment_type,
        no_of_containers: parseInt(r.no_of_containers) || 0,
        category: r.category,
        placement_time: r.placement_time
          ? dayjs(r.placement_time).format("DD-MM-YYYY HH:mm:ss")
          : null,
        pickup_location: r.pickup_location,
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
      vessel_eta: values.vessel_eta ? values.vessel_eta.format("DD-MM-YYYY") : null,
      booking_ref_no: values.booking_ref_no,
      si_cut_off_date: values.si_cut_off_date ? values.si_cut_off_date.format("DD-MM-YYYY") : null,
      si_cut_off_time: values.si_cut_off_time ? values.si_cut_off_time.format("HH:mm") : null,
      booking_remarks: values.booking_remarks,
      cnf_remarks: values.cnf_remarks,
      account_remarks: values.account_remarks,
      is_lpo_invoice_required: values.is_lpo_invoice_required,
      is_release_order_required: values.is_release_order_required,
      is_payment_processing_required: values.is_payment_processing_required,
    };
  };

  const handleAction = async (actionType, remarksVal = "") => {
    if (actionThrottleRef.current) return;
    actionThrottleRef.current = true;
    setLoading(true);
    try {
      const values = await form.validateFields();

      // Stage-specific validation for "Approved"
      if (actionType === "Approved") {
        const stage = jobData?.current_stage || "1";

        // CS at stage 2: booking details + RO are compulsory (BOC is optional)
        if (stage === "2" && isCS) {
          const missingBooking = [];
          if (!values.afsys_job_no) missingBooking.push("AFSYS Job No.");
          if (!values.booking_vessel) missingBooking.push("Booking Vessel");
          if (!values.booking_voyage) missingBooking.push("Booking Voyage");
          if (!values.vessel_eta) missingBooking.push("Vessel ETA Date");
          if (!values.vsl_initial_eta) missingBooking.push("Initial ETA");
          if (!values.vsl_latest_eta) missingBooking.push("Latest ETA");
          if (!values.vsl_etd) missingBooking.push("ETD");
          if (!values.pod_eta) missingBooking.push("POD ETA");
          if (!values.booking_ref_no) missingBooking.push("Booking Reference No.");
          if (!values.si_cut_off_date) missingBooking.push("Load List/SI Cut Off Date");
          if (!values.si_cut_off_time) missingBooking.push("Load List/SI Cut Off Time");
          if (!values.booking_remarks) missingBooking.push("Booking Remarks");
          if (!releaseOrderFiles.length) missingBooking.push("Release Order");
          if (missingBooking.length) {
            message.error(`Please fill/upload required fields: ${missingBooking.join(", ")}`);
            setLoading(false);
            actionThrottleRef.current = false;
            return;
          }
        }

        if (needsLpoInvoice && isCS) {
          const missingFinancial = [];
          if (!lpoFiles.length) missingFinancial.push("LPO");
          if (!invoiceFiles.length) missingFinancial.push("Invoice");
          if (!values.cs_hod) missingFinancial.push("CS HOD");
          if (missingFinancial.length) {
            message.error(`Required at this stage: ${missingFinancial.join(", ")}`);
            setLoading(false);
            actionThrottleRef.current = false;
            return;
          }
        } else if (needsLpoInvoice && (!lpoFiles.length || !invoiceFiles.length)) {
          message.error("LPO and Invoice are required for Stage 4 and Stage 5");
          setLoading(false);
          return;
        }

        if (isForwarding) {
          if (stage === '3' && !values.afsys_job_no) {
            message.error("AFSYS Job No. is required for Stage 3");
            setLoading(false);
            return;
          }
          if (stage === '3' && isCNF) {
            const missingCNF = [];
            if (!haulageCostFiles.length) missingCNF.push("Haulage Cost Sheet");
            if (!haulierNoteFiles.length) missingCNF.push("Haulier Note");
            if (!loadListFiles.length) missingCNF.push("Load List");
            if (missingCNF.length) {
              message.error(`Please upload required CNF documents: ${missingCNF.join(", ")}`);
              setLoading(false);
              actionThrottleRef.current = false;
              return;
            }
          }
          if (stage === '4' && isCNF) {
            const missingCNF = [];
            if (!haulageCostFiles.length) missingCNF.push("Haulage Cost Sheet");
            if (!haulierNoteFiles.length) missingCNF.push("Haulier Note");
            if (!loadListFiles.length) missingCNF.push("Load List");
            if (!edFiles.length) missingCNF.push("ED");
            if (missingCNF.length) {
              message.error(`Please upload required CNF documents: ${missingCNF.join(", ")}`);
              setLoading(false);
              actionThrottleRef.current = false;
              return;
            }
          }
          /* 2026-03-25: Bank Slip requirement removed per PRD refactoring */

        } else if (isLiner) {
          if (stage === '3' && !values.afsys_job_no) {
            message.error("AFSYS Job No. is required for Stage 3");
            setLoading(false);
            return;
          }
          /* 2026-03-25: Bank Slip requirement removed per PRD refactoring */

        } else {
          // Legacy / Generic Validations
          if (stage === '3' && !values.afsys_job_no) {
            message.error("AFSYS Job No. is required");
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
      actionThrottleRef.current = false;
      setLoading(false);
    }
  };

  const onFinish = async (values) => {
    if (actionThrottleRef.current) return;
    actionThrottleRef.current = true;
    setLoading(true);
    try {
      const isCSUpdate = isLiner && isCS && (parseInt(currentStage) === 2 || parseInt(currentStage) === 3);
      const payload = {
        ...getCommonPayload(values),
        status: isCSUpdate ? "Updated Level 2" : (jobData?.status || "draft")
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
      actionThrottleRef.current = false;
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
    setHaulierNoteFiles([]);
    setLoadListFiles([]);
    setLpoFiles([]);
    setInvoiceFiles([]);
    setFacFiles([]);
    setPreAlertFiles([]);
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
      render: (d) => d ? dayjs(d).format("DD-MM-YYYY HH:mm") : "N/A"
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
          disabled={isStage2ButtonsHidden || (isCreator && jobData?.status !== "draft")}
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
                  {(jobData?.is_hod_approved || isMasterMode) && !isOthers && (
                    <Tag color="success" icon={<CheckCircleOutlined />}>Sales HOD Approved</Tag>
                  )}
                  {(isExtended || isMasterMode) && (jobData?.is_cs_hod_approved || isMasterMode) && (
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
                {isForwarding && (
                  <Col xs={24} md={6}>
                    <Form.Item className={Styles.formLabel} label="Overseas Agent Name" name="overseas_agent_name">
                      <Input placeholder="Enter Overseas Agent Name" disabled={isSalesSectionLocked} />
                    </Form.Item>
                  </Col>
                )}
                <Col xs={24} md={6}>
                  <Form.Item className={Styles.formLabel} label="Export Created By" name="created_by_name">
                    <Input readOnly variant="filled" />
                  </Form.Item>
                </Col>
              </Row>
            </div>
          </Card>

          {/* ════════ OTHERS JOB DETAILS ════════ */}
          {(isOthers || isMasterMode) && (
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
                {showDocumentUploads && (
                  <>
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
                      <DocUploadField label="Freight Manifest" files={attachments.filter(d => d.doc_type === "FREIGHT MANIFEST")} setFiles={setAttachments} color="blue" onPreview={openPreview} salesInputId={id} category="freight_manifest" docType="FREIGHT MANIFEST" disabled={isSalesSectionLocked} user={user} isAdmin={isAdmin} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item label="LOAD LIST UPLOADING" className={Styles.formLabel}>
                      <DocUploadField label="Load List" files={attachments.filter(d => d.doc_type === "LOAD LIST UPLOADING")} setFiles={setAttachments} color="gold" onPreview={openPreview} salesInputId={id} category="load_list" docType="LOAD LIST UPLOADING" disabled={isSalesSectionLocked || isLiner} user={user} isAdmin={isAdmin} />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Form.Item label="TDR/Sailing Report" className={Styles.formLabel}>
                      <DocUploadField label="Sailing Report" files={attachments.filter(d => d.doc_type === "TDR/SAILING REPORT")} setFiles={setAttachments} color="green" onPreview={openPreview} salesInputId={id} category="sailing_report" docType="TDR/SAILING REPORT" disabled={isSalesSectionLocked} user={user} isAdmin={isAdmin} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item label="OTHER DOCS" className={Styles.formLabel}>
                      <DocUploadField label="Other Docs" files={attachments.filter(d => d.doc_type === "OTHER DOCS")} setFiles={setAttachments} color="purple" onPreview={openPreview} salesInputId={id} category="others" docType="OTHER DOCS" disabled={isSalesSectionLocked} user={user} isAdmin={isAdmin} />
                    </Form.Item>
                  </Col>
                </Row>
                </>
                )}
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
          {(!isOthers || isMasterMode) && (
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
                      <Input placeholder="Enter Code" disabled={isBookingSectionLocked && !(isCNF && isForwarding && currentStage === "3" && !isCNFDone)} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item className={Styles.formLabel} label="Special Instruction if Any" name="special_instructions">
                      <TextArea placeholder="Enter any special instructions…" rows={3} disabled={isSalesSectionLocked} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item className={Styles.formLabel} label="Remarks" name="remarks">
                      <TextArea placeholder="Enter Remarks" rows={3} disabled={isSalesSectionLocked} />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Form.Item
                      className={Styles.formLabel}
                      label="Name of Executive"
                      name="name_of_executive"
                      rules={[{ required: !isOthers, message: "Required" }]}
                    >
                      <Input placeholder="Sales Executive" disabled={true} />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={16}>
                  {!isLiner && (
                    <Col xs={12} md={6}><Form.Item name="hbl" valuePropName="checked" noStyle><Checkbox disabled={isSalesSectionLocked}>HBL</Checkbox></Form.Item></Col>
                  )}
                  <Col xs={12} md={6}><Form.Item name="fac" valuePropName="checked" noStyle><Checkbox disabled={isRequirementSelectorLocked || isSalesSectionLocked}>FAC</Checkbox></Form.Item></Col>
                  <Col xs={12} md={6}><Form.Item name="documentation" valuePropName="checked" noStyle><Checkbox disabled={isRequirementSelectorLocked || isSalesSectionLocked}>Documentation</Checkbox></Form.Item></Col>
                  <Col xs={12} md={6}><Form.Item name="transportation" valuePropName="checked" noStyle><Checkbox disabled={isSalesSectionLocked}>Transportation</Checkbox></Form.Item></Col>
                </Row>
              </div>
            </Card>
          )}


          {/* ════════ PLACEMENT DETAILS ════════ */}
          {(!isOthers || isMasterMode) && showPlacement && (
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
                          <Col xs={24} md={4}><Form.Item {...restField} name={[name, "placement_time"]} label="Date/Time"><DatePicker showTime format="DD-MM-YYYY HH:mm" style={{ width: "100%" }} disabled={isSalesSectionLocked} /></Form.Item></Col>
                          <Col xs={24} md={4}><Form.Item {...restField} name={[name, "pickup_location"]} label="Pickup/Delivery"><Input placeholder="Location" disabled={isSalesSectionLocked} /></Form.Item></Col>
                          <Col xs={24} md={3}><Form.Item {...restField} name={[name, "special_remarks"]} label="Remarks"><Input placeholder="Remarks" disabled={isSalesSectionLocked} /></Form.Item></Col>
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
          {!stage2.isThisJobsHOD && !(currentStage === "4" && isCNF) && (
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
                    <Form.Item className={Styles.formLabel} label="AFSYS Job No." name="afsys_job_no" rules={[{ required: isStage2 && isCS, message: "Required" }]}><Input placeholder="Afsys Job No." disabled={isBookingSectionLocked} /></Form.Item>
                  </Col>
                  <Col xs={24} md={6}>
                    <Form.Item className={Styles.formLabel} label="Booking Vessel" name="booking_vessel" rules={[{ required: isStage2 && isCS, message: "Required" }]}><Input placeholder="Booking Vessel" disabled={isBookingSectionLocked} /></Form.Item>
                  </Col>
                  <Col xs={24} md={6}>
                    <Form.Item className={Styles.formLabel} label="Booking Voyage" name="booking_voyage" rules={[{ required: isStage2 && isCS, message: "Required" }]}><Input placeholder="Booking Voyage" disabled={isBookingSectionLocked} /></Form.Item>
                  </Col>
                  <Col xs={24} md={6}>
                    <Form.Item className={Styles.formLabel} label="Vessel ETA Date" name="vessel_eta" rules={[{ required: isStage2 && isCS, message: "Required" }]}><DatePicker format="DD-MM-YYYY" style={{ width: "100%" }} disabled={isBookingSectionLocked} /></Form.Item>
                  </Col>

                  {/* PRD v3.2 Relocated ETA Fields */}
                  <Col xs={24} md={6}>
                    <Form.Item label="Initial ETA" name="vsl_initial_eta" className={Styles.formLabel} rules={[{ required: isStage2 && isCS, message: "Required" }]}>
                      <DatePicker style={{ width: '100%' }} disabled={isBookingSectionLocked} format="DD-MM-YYYY" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={6}>
                    <Form.Item label="Latest ETA" name="vsl_latest_eta" className={Styles.formLabel} rules={[{ required: isStage2 && isCS, message: "Required" }]}>
                      <DatePicker style={{ width: '100%' }} disabled={isBookingSectionLocked} format="DD-MM-YYYY" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={6}>
                    <Form.Item label="ETD" name="vsl_etd" className={Styles.formLabel} rules={[{ required: isStage2 && isCS, message: "Required" }]}>
                      <DatePicker style={{ width: '100%' }} disabled={isBookingSectionLocked} format="DD-MM-YYYY" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={6}>
                    <Form.Item label="POD ETA" name="pod_eta" className={Styles.formLabel} rules={[{ required: isStage2 && isCS, message: "Required" }]}>
                      <DatePicker style={{ width: '100%' }} disabled={isBookingSectionLocked} format="DD-MM-YYYY" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={6}>
                    <Form.Item className={Styles.formLabel} label="Booking Reference No." name="booking_ref_no" rules={[{ required: isStage2 && isCS, message: "Required" }]}><Input placeholder="Booking Reference No." disabled={isBookingSectionLocked} /></Form.Item>
                  </Col>
                  <Col xs={24} md={6}>
                    <Form.Item className={Styles.formLabel} label="Load List/SI Cut Off Date" name="si_cut_off_date" rules={[{ required: isStage2 && isCS, message: "Required" }]}><DatePicker format="DD-MM-YYYY" style={{ width: "100%" }} disabled={isBookingSectionLocked} /></Form.Item>
                  </Col>
                  <Col xs={24} md={6}>
                    <Form.Item className={Styles.formLabel} label="Load List/SI Cut Off Time" name="si_cut_off_time" rules={[{ required: isStage2 && isCS, message: "Required" }]}><TimePicker style={{ width: "100%" }} format="HH:mm" disabled={isBookingSectionLocked} /></Form.Item>
                  </Col>
                  <Col xs={24} md={6}>
                    <Form.Item className={Styles.formLabel} label="Booking Remarks" name="booking_remarks" rules={[{ required: isStage2 && isCS, message: "Required" }]}><TextArea autoSize={{ minRows: 1 }} disabled={isBookingSectionLocked} /></Form.Item>
                  </Col>

                  {/* PRD v4.0 Branching Selectors (Requirement Toggles) */}
                  {((isLiner || isCrossTrade ) || isMasterMode) && (
                    <Col span={24}>
                      <Alert
                        message="Workflow Configuration (Action Required)"
                        description={
                          <Row gutter={16} style={{ marginTop: 8 }}>
                            {!isLiner && (
                              <Col xs={24} md={6}>
                                <Form.Item label="Payment Req?" name="is_payment_processing_required">
                                  <Radio.Group buttonStyle="solid" disabled={isRequirementSelectorLocked}>
                                    <Radio.Button value={true}>Yes</Radio.Button>
                                    <Radio.Button value={false}>No</Radio.Button>
                                  </Radio.Group>
                                </Form.Item>
                              </Col>
                            )}
                            <Col xs={24} md={6}>
                              <Form.Item label="RO Req?" name="is_release_order_required">
                                <Radio.Group buttonStyle="solid" disabled={isRequirementSelectorLocked}>
                                  <Radio.Button value={true}>Yes</Radio.Button>
                                  <Radio.Button value={false}>No</Radio.Button>
                                </Radio.Group>
                              </Form.Item>
                            </Col>
                            <Col xs={24} md={6}>
                              <Form.Item label="Load List Req?" name="is_load_list_required">
                                <Radio.Group buttonStyle="solid" disabled={isRequirementSelectorLocked}>
                                  <Radio.Button value={true}>Yes</Radio.Button>
                                  <Radio.Button value={false}>No</Radio.Button>
                                </Radio.Group>
                              </Form.Item>
                            </Col>
                            <Col xs={24} md={6}>
                              <Form.Item label="Haulier Note Req?" name="is_haulier_note_required">
                                <Radio.Group buttonStyle="solid" disabled={isRequirementSelectorLocked}>
                                  <Radio.Button value={true}>Yes</Radio.Button>
                                  <Radio.Button value={false}>No</Radio.Button>
                                </Radio.Group>
                              </Form.Item>
                            </Col>
                          </Row>
                        }
                        type="info"
                        showIcon
                        style={{ marginBottom: 16 }}
                      />
                    </Col>
                  )}

                  {showLinerStopAlert && (
                    <Col span={24}>
                      <Alert
                        message={
                          <div>
                            <strong>Workflow Halted:</strong> Required Payment Documents (LPO/Invoice) not selected or missing.
                            <br />
                            <em>Check YES/NO selectors in Stage 2 or upload required documents.</em>
                          </div>
                        }
                        type="warning"
                        showIcon
                        style={{ marginBottom: 16 }}
                      />
                    </Col>
                  )}
                </Row>

                {(showDocumentUploads || showROBOCForCS) && (
                  <Row gutter={16}>
                    <Col xs={24} md={6}>
                      <Form.Item className={Styles.formLabel} label="Release Order(s)">
                        <DocUploadField
                          label="Release Order"
                          files={releaseOrderFiles}
                          setFiles={setReleaseOrderFiles}
                          color="blue"
                          onPreview={openPreview}
                          salesInputId={id}
                          category="booking"
                          docType="Release Order"
                          disabled={releaseOrderDisabled}
                          restrictionMessage={releaseOrderRestrictionMessage}
                          isMasterMode={isMasterMode}
                          user={user}
                          isAdmin={isAdmin}
                        />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={6}>
                      <Form.Item className={Styles.formLabel} label="BOC Attachment">
                        <DocUploadField
                          label="BOC"
                          files={bocFiles}
                          setFiles={setBocFiles}
                          color="volcano"
                          onPreview={openPreview}
                          salesInputId={id}
                          category="booking"
                          docType="BOC"
                          disabled={csStage4UploadLocked || (isCNFUploadLocked && !isCS)}
                          restrictionMessage={
                            isCNFUploadLocked && !isCS && isLiner && !isCNF
                              ? "CNF is allowd to uplaod it"
                              : null
                          }
                          isMasterMode={isMasterMode}
                          user={user}
                          isAdmin={isAdmin}
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                )}

                {showDocumentUploads && (
                  <>
                    <Row gutter={16}>
                      <Col xs={24} md={6}>
                        <Form.Item className={Styles.formLabel} label="Haulage Cost Sheet">
                          <DocUploadField
                            label="Haulage Cost"
                            files={haulageCostFiles}
                            setFiles={setHaulageCostFiles}
                            color="orange"
                            onPreview={openPreview}
                            salesInputId={id}
                            category="booking"
                            docType="Haulage Cost"
                            disabled={isCNFUploadLocked}
                            restrictionMessage={isLiner && !isCNF ? "CNF is allowd to uplaod it" : null}
                            user={user}
                            isAdmin={isAdmin}
                            isMasterMode={isMasterMode}
                          />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={6}>
                        <Form.Item className={Styles.formLabel} label="Haulier Note">
                          <DocUploadField
                            label="Haulier Note"
                            files={haulierNoteFiles}
                            setFiles={setHaulierNoteFiles}
                            color="geekblue"
                            onPreview={openPreview}
                            salesInputId={id}
                            category="booking"
                            docType="Haulage Note"
                            disabled={isCNFUploadLocked || (!haulierNoteEnabled && currentStage !== "4")}
                            restrictionMessage={
                              isCNFUploadLocked
                                ? null
                                : !haulierNoteEnabled && currentStage !== "4"
                                ? "Haulier Note uploading is disabled until the requirement is turned on."
                                : isLiner && !isCNF
                                ? "CNF is allowd to uplaod it"
                                : null
                            }
                            user={user}
                            isAdmin={isAdmin}
                            isMasterMode={isMasterMode}
                          />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Row gutter={16}>
                      <Col xs={24} md={6}>
                        <Form.Item 
                          className={Styles.formLabel} 
                          label="ED"
                        >
                          <DocUploadField
                            label="ED"
                            files={edFiles}
                            setFiles={setEdFiles}
                            color="geekblue"
                            onPreview={openPreview}
                            salesInputId={id}
                            category="financial"
                            docType="ED"
                            disabled={isCNFUploadLocked}
                            user={user}
                            isAdmin={isAdmin}
                            isMasterMode={isMasterMode}
                          />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={6}>
                        <Form.Item 
                          className={Styles.formLabel} 
                          label={<span>Load List{currentStage === "4" && <span style={{ color: "#ff4d4f" }}>*</span>}</span>}
                          rules={currentStage === "4" ? [{ required: true, message: "Load List is required at Stage 4" }] : []}
                        >
                          <DocUploadField
                            label="Load List"
                            files={loadListFiles}
                            setFiles={setLoadListFiles}
                            color="gold"
                            onPreview={openPreview}
                            salesInputId={id}
                            category="booking"
                            docType="Load List"
                            disabled={currentStage === "4" ? (isCNFUploadLocked || !jobData?.is_hod_approved) : (!isLLReq || (!jobData?.is_hod_approved) || isCNFUploadLocked)}
                            restrictionMessage={
                              isCNFUploadLocked
                                ? null
                                : !isLLReq && currentStage !== "4"
                                ? "Load List upload is disabled until the requirement is turned on."
                                : isLiner && jobData?.is_hod_approved && !isCNF
                                ? "CNF is allowd to uplaod it"
                                : null
                            }
                            isMasterMode={isMasterMode}
                            user={user}
                            isAdmin={isAdmin}
                          />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Row gutter={16}>
                      <Col xs={24} md={24}>
                        <Form.Item className={Styles.formLabel} label="CNF Remarks" name="cnf_remarks">
                          <TextArea disabled={isCNFUploadLocked} />
                        </Form.Item>
                      </Col>
                    </Row>
                  </>
                )}
              </div>
            </Card>
          )}

          {(jobData?.job_type !== "OTHERS" || isMasterMode) && (isPaymentReq || isLiner || !isExtended || isMasterMode) && (parseInt(currentStage) >= 7 || isMasterMode) && (
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
                  <Col xs={24} md={12}>
                    <Form.Item className={Styles.formLabel} label="Carrier Name 2" name="carrier_name_2">
                      <Input placeholder="Enter Carrier Name" disabled={isAccountsEditableFieldLocked} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item className={Styles.formLabel} label="Invoice Date" name="invoice_date">
                      <DatePicker style={{ width: "100%" }} format="DD-MM-YYYY" disabled={isAccountsEditableFieldLocked} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item className={Styles.formLabel} label="Accounts Remarks" name="account_remarks">
                      <TextArea autoSize={{ minRows: 1 }} disabled={isAccountsEditableFieldLocked} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item className={Styles.formLabel} label="Bank Slip Attachment">
                      <DocUploadField label="Bank Slip" files={bankSlips} setFiles={setBankSlips} color="blue" onPreview={openPreview} salesInputId={id} category="financial" docType="Bank Slip" disabled={isAccountsEditableFieldLocked} user={user} isAdmin={isAdmin} isMasterMode={isMasterMode} />
                    </Form.Item>
                  </Col>
                </Row>
              </div>
            </Card>
          )}

          {(isCSHODStage && isCSHOD && (isLiner || isCrossTrade) || isMasterMode) && (
            <Card className={Styles.card} bordered title="CS HOD DECISION (LINER/CR)">
              <Row gutter={16}>
                <Col span={24}>
                  <Form.Item name="lpo_invoice_selection" rules={[{ required: true, message: 'Please select YES to proceed or NO to stop flow.' }]}>
                    <Radio.Group buttonStyle="solid">
                      <Radio.Button value="YES">PROCEED (Documents Uploaded)</Radio.Button>
                      <Radio.Button value="NO">STOP (Documents Pending)</Radio.Button>
                    </Radio.Group>
                  </Form.Item>
                </Col>
              </Row>
            </Card>
          )}


          {/* ════════ DOCUMENTS (LPO / INVOICE) ════════ */}
          {!isCNF && showDocumentUploads && (jobData?.job_type !== "OTHERS" || isMasterMode) && (
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
                  {(isPaymentReq || isLiner) && (
                    <>
                      <Col xs={24} md={8}>
                        <Form.Item className={Styles.formLabel} label={<span>LPO {needsLpoInvoice && isCS && <span style={{ color: "#ff4d4f" }}>*</span>}</span>}>
                          <DocUploadField label="LPO" files={lpoFiles} setFiles={setLpoFiles} color="cyan" onPreview={openPreview} salesInputId={id} category="financial" docType="LPO" disabled={isCSUploadLocked} user={user} isAdmin={isAdmin} isMasterMode={isMasterMode} />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={8}>
                        <Form.Item className={Styles.formLabel} label={<span>INVOICE {needsLpoInvoice && isCS && <span style={{ color: "#ff4d4f" }}>*</span>}</span>}>
                          <DocUploadField label="Invoice" files={invoiceFiles} setFiles={setInvoiceFiles} color="purple" onPreview={openPreview} salesInputId={id} category="financial" docType="Invoice" disabled={isCSUploadLocked} user={user} isAdmin={isAdmin} isMasterMode={isMasterMode} />
                        </Form.Item>
                      </Col>
                    </>
                  )}
                  {!isLiner && (isMasterMode || hblFlag) && (
                    <>
                      <Col xs={24} md={8}>
                        <Form.Item className={Styles.formLabel} label="HBL">
                          <DocUploadField label="HBL" files={hblFiles} setFiles={setHblFiles} color="blue" onPreview={openPreview} salesInputId={id} category="financial" docType="HBL" disabled={isCSUploadLocked} user={user} isAdmin={isAdmin} isMasterMode={isMasterMode} />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={8}>
                        <Form.Item className={Styles.formLabel} label="CS HOD" name="cs_hod" rules={[{ required: needsLpoInvoice && isCS, message: "Required" }]}>
                          <Select
                            placeholder="Select CS HOD"
                            allowClear
                            showSearch
                            optionFilterProp="label"
                            options={csHodOptions}
                            disabled={isCSUploadLocked || isMasterMode}
                          />
                        </Form.Item>
                      </Col>
                    </>
                  )}
                  {facFlag && (
                    <Col xs={24} md={8}>
                      <Form.Item className={Styles.formLabel} label="FAC">
                        <DocUploadField label="FAC" files={facFiles} setFiles={setFacFiles} color="magenta" onPreview={openPreview} salesInputId={id} category="financial" docType="FAC" disabled={isCSUploadLocked} restrictionMessage={isLiner && !isCS ? "CS Department is allowed to upload it" : null} user={user} isAdmin={isAdmin} isMasterMode={isMasterMode} />
                      </Form.Item>
                    </Col>
                  )}
                  {(documentationFlag || isLiner || isForwarding || isCrossTrade) && (
                    <Col xs={24} md={8}>
                      <Form.Item className={Styles.formLabel} label="Pre-Alert">
                        <DocUploadField
                          label="Pre-Alert"
                          files={preAlertFiles}
                          setFiles={setPreAlertFiles}
                          color="cyan"
                          onPreview={openPreview}
                          salesInputId={id}
                          category="booking"
                          docType="Pre-Alert"
                          disabled={isCSUploadLocked}
                          restrictionMessage={isLiner && !isCS ? "CS Department is allowed to upload it" : null}
                          user={user}
                          isAdmin={isAdmin}
                          isMasterMode={isMasterMode}
                        />
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
                  <DocUploadField label="Attachment" files={attachments.filter(d => d.doc_type === "Attachment")} setFiles={setAttachments} color="blue" onPreview={openPreview} salesInputId={id} category="attachments" docType="Attachment" user={user} isAdmin={isAdmin} disabled={isOthers} />
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

                  {isLiner && currentStage === '5' && isCSHOD && (
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
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    {!isStage2ButtonsHidden && <Button
                      type="primary"
                      onClick={() => handleAction("Approved")}
                      icon={<Icon icon="mdi:check-circle" />}
                      loading={loading}
                      disabled={isHalted}
                      style={{ borderRadius: 8, height: 40, padding: "0 24px" }}
                    >
                      {currentStage === "2" ? (stage2.isThisJobsHOD ? "Approve (Sales HOD)" : isCS ? "Verify & Config (CS)" : "Approve / Verify") :
                        currentStage === "3" ? (isForwarding ? "Submit CNF Update" : "Approve CNF Docs") :
                          currentStage === "4" ? "Approve CS Docs" :
                            currentStage === "5" ? (isForwarding ? "Approve (CS HOD)" : "Approve (CS HOD)") :
                              currentStage === "6" ? "Approve (Accounts)" :
                                currentStage === "7" ? "Close Job" : "Approve / Verify"}
                    </Button>}
                    {(isHOD || isAdmin || isGM) && !isStage2ButtonsHidden && (
                      <Button
                        type="primary"
                        onClick={() => handleAction("Rejected")}
                        icon={<Icon icon="mdi:close-circle" />}
                        loading={loading}
                        style={{ borderRadius: 8, height: 40, padding: "0 24px" }}
                      >
                        Reject
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </Card>

          {isHalted && (
            <Alert
              message={jobData?.status === "STOPPED" ? "WORKFLOW STOPPED" : "System Check: Pending Documentation"}
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

          {((!isHOD && !isGM) || canApprove || isOthers) && (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: 12,
                flexWrap: "wrap",
                width: "100%",
                marginTop: "1.5rem",
                marginBottom: "1rem",
              }}
            >
              {!canApprove && (!isGM || (isOthers && jobData?.status === 'draft')) && !isMasterMode && (!isCS || csBookingEditStage) && (
                <>
                  <Button type="primary" htmlType="submit" icon={<Icon icon="mdi:content-save" />}>
                    {isLiner && isCS && (parseInt(currentStage) === 2 || parseInt(currentStage) === 3) ? "Submit CS Update" :
                      isLiner && isCNF && parseInt(currentStage) === 2 ? "Submit CNF Update" : "Submit"}
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
              )}

              {!id && <Button type="primary" icon={<Icon icon="tabler:refresh" />} onClick={handleReset} disabled={(isOthers && jobData?.status !== 'draft') || isMasterMode}>
                Reset Form
              </Button>}
            </div>
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
      </Spin >
    </div >
  );
};

export default Approval;
