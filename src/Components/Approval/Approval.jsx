import { useEffect, useState, useCallback, useRef } from "react";
import { computeUserRoles } from "./utils/roleUtils";
import { computeJobContext } from "./utils/jobContextUtils";
import { computeSectionLocks } from "./utils/sectionLocks";
import { computeCanApprove } from "./utils/canApprove";
import { mapJobToFormValues, partitionDocuments } from "./utils/formMapper";
import { normalizeBoolean } from "./utils/formUtils";
import { buildCommonPayload } from "./utils/payloadBuilders";
import { validateApprovalAction } from "./utils/approvalValidations";
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
              <div style={{ display: "flex"}}>
                <Icon icon="famicons:document-attach" style={{ color: '#747474' }} />
                {/* <PaperClipOutlined style={{ color: '#1890ff' }} /> */}
                <Typography.Text ellipsis style={{ maxWidth: 150 }}>
                  {file.name || file.file_name}
                </Typography.Text>
                {file.uploaded_by_user_name && (
                  <Typography.Text type="secondary" style={{ fontSize: '10px' }}>
                    ({file.uploaded_by_user_name})
                  </Typography.Text>
                )}
              </div>
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
    cnfDocuments: true,
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

  const {
    userRoles, userDepts,
    isAdmin, isSuperUser,
    isCS, isCNF, isSales, isAccounts,
    isHOD, isGM,
    isSalesExecutive, isSalesHOD, isCNFExecutive, isCSExecutive, isCSHOD,
    isAccountsTeam, isDocsTeam, isCNFHOD,
    hasAllowedRole,
    userFullName,
  } = computeUserRoles(user);

  const roles = {
    isCS, isAdmin, userFullName,
  };

  const {
    currentStage,
    isCreator,
    isLiner, isCrossTrade, isForwarding, isOthers,
    isMasterMode, isExtended,
    isTerminal,
    isStage2, isStage3,
    isAccountsStage, isForwardingStage5,
    isCNFStage, isCSHODStage,
    stage2, isStage2ButtonsHidden, isCSDoneWaitingHOD, isThisJobsCSHOD,
  } = computeJobContext({ jobData, id, user, approvalHistory, roles });
  // ─────────────────────────────────────────────────────────────────────────────

  const {
    baseLocked, isCNFDone, isSalesHODLinerRestricted,
    csBookingEditStage, isSalesSectionLocked, isBookingSectionLocked,
    isCNFSectionLocked, isAccountsEditableFieldLocked,
    isCSUploadLocked, isEDUploadLocked, isCNFUploadLocked, isAccountsUploadLocked,
    isRequirementSelectorLocked,
    showDocumentUploads, hideDocumentsAtStage2, disableDocumentsAtStage4, showROBOCForCS, needsLpoInvoice,
  } = computeSectionLocks({
    isAdmin, isCS, isCNF, isSalesExecutive, isCreator,
    isCSHOD, isAccountsTeam, isHOD, isSalesHOD,
    currentStage, isMasterMode, isTerminal, isForwarding,
    isLiner, isExtended, isOthers,
    isStage2, isCNFStage, isCSHODStage, isAccountsStage,
    stage2, isCSDoneWaitingHOD, jobData,
  });

  // Disable ALL uploads if user doesn't have allowed role
  const disableAllUploads = !hasAllowedRole;

  // Reactive visibility using Form.useWatch (handles both initial values and live changes)
  const isLLReqForm = Form.useWatch("is_load_list_required", form);
  const isHNReqForm = Form.useWatch("is_haulier_note_required", form);
  const isROReqForm = Form.useWatch("is_release_order_required", form);
  const isLNR_LPO_ReqForm = Form.useWatch("is_lpo_invoice_required", form);
  const isPaymentReqForm = Form.useWatch("is_payment_processing_required", form);
  const facFlagForm = Form.useWatch("fac", form);
  const hblFlagForm = Form.useWatch("hbl", form);
  const documentationFlagForm = Form.useWatch("documentation", form);

  const isLLReq = normalizeBoolean(isLLReqForm, jobData?.is_load_list_required);
  const isHNReq = normalizeBoolean(isHNReqForm, jobData?.is_haulier_note_required);
  const isROReq = normalizeBoolean(isROReqForm, jobData?.is_release_order_required);
  const releaseOrderRequirementMet =
    isROReq || (!isLiner && !isExtended) || isMasterMode;
  const csStage4UploadLocked = isCS && !isAdmin && currentStage === "4"; // RO/BOC locked for CS at stage 4 (already uploaded at stage 2)
  const releaseOrderDisabled =
    baseLocked || csStage4UploadLocked || (isCNFUploadLocked && !isCS) || (!releaseOrderRequirementMet && !isCS) || isCNF;
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
  const isPaymentReq = normalizeBoolean(isLNR_LPO_ReqForm, jobData?.is_lpo_invoice_required) || normalizeBoolean(isPaymentReqForm, jobData?.is_payment_processing_required);
  const facFlag          = normalizeBoolean(facFlagForm,          jobData?.fac);
  const hblFlag          = normalizeBoolean(hblFlagForm,          jobData?.hbl);
  const documentationFlag = normalizeBoolean(documentationFlagForm, jobData?.documentation);

  const toggle = (key) => setOpen((p) => ({ ...p, [key]: !p[key] }));

  // Always show sections as per user request to ensure accessibility
  const showPlacement = true;

  // const openPreview = (filesArray, localIdx) => {
  //   console.log({filesArray})
  //   const urls = filesArray.map((f) => f.url || f.file_url).filter(Boolean);
  //   if (!urls.length) return;
  //   setPreviewUrls(urls);
  //   setPreviewIndex(Math.max(0, Math.min(localIdx, urls.length - 1)));
  //   setPreviewVisible(true);
  // };

  const openPreview = (fileList, index = 0) => {
    const filesWithMime = fileList.map((file) => {
      let mimeType = file.mimeType || file.type; // check different keys

      if (!mimeType) {
        // fallback: guess mimeType from extension if possible
        const ext = (file.url || file.file_url || "").split(".").pop()?.toLowerCase();
        if (ext === "pdf") mimeType = "application/pdf";
        else if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext))
          mimeType = `image/${ext === "jpg" ? "jpeg" : ext}`;
        else mimeType = "other";
      }

      return {
        ...file,
        mimeType,
      };
    });

    setPreviewUrls(filesWithMime);
    setPreviewIndex(index);
    setPreviewVisible(true);
  };



  // STOP Alert Visibility for Liner/Cross-Trade
  const showLinerStopAlert = (isLiner || isCrossTrade) && currentStage === "5" && !isPaymentReq;

  const isStoppedCrossTrade = isCrossTrade && (jobData?.status === "STOPPED" || jobData?.is_blocked);
  const isHalted = showLinerStopAlert || isStoppedCrossTrade;

  const canApprove = computeCanApprove({
    hasAllowedRole, isAdmin, currentStage,
    isLiner, isCrossTrade, isForwarding, isExtended,
    isCS, isCNF, isCNFHOD, isCSHOD, isAccountsTeam, isSalesHOD,
    isCNFDone, isCNFStage, isCSHODStage,
    isThisJobsCSHOD,
    stage2,
  });
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
          value: String(item.id),
          label: `${item.first_name} ${item.last_name}  |  (${item.email})`
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
        form.setFieldsValue(mapJobToFormValues(data));

        // Partition documents into typed buckets
        if (data.documents) {
          const buckets = partitionDocuments(data.documents);
          setReleaseOrderFiles(buckets.releaseOrderFiles);
          setBocFiles(buckets.bocFiles);
          setHaulageCostFiles(buckets.haulageCostFiles);
          setLoadListFiles(buckets.loadListFiles);
          setLpoFiles(buckets.lpoFiles);
          setInvoiceFiles(buckets.invoiceFiles);
          setFacFiles(buckets.facFiles);
          setCroFiles(buckets.croFiles);
          setEdFiles(buckets.edFiles);
          setHaulierNoteFiles(buckets.haulierNoteFiles);
          setBankSlips(buckets.bankSlips);
          setHblFiles(buckets.hblFiles);
          setPreAlertFiles(buckets.preAlertFiles);
          setAttachments(buckets.attachments);
        }

        // Map History (Sort chronologically: Sales Created first)
        // const sortedHistory = (data.approval_history || []).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        // setApprovalHistory(sortedHistory);
        setApprovalHistory(data.approval_history || []);

        // Map Other Charges & General Remarks
        setOtherCharges(data.approval_details?.other_charges || []);
        setChargeInput(data.approval_details?.other_charges_remarks || "");
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
  const getCommonPayload = (values, includeApprovalDetails = true) =>
    buildCommonPayload(
      values,
      {
        releaseOrderFiles, bocFiles, haulageCostFiles, loadListFiles,
        lpoFiles, invoiceFiles, facFiles, croFiles, edFiles,
        haulierNoteFiles, preAlertFiles, bankSlips, attachments, hblFiles,
      },
      { remarks, otherCharges, jobData, includeApprovalDetails }
    );

  const handleAction = async (actionType, remarksVal = "") => {
    if (actionThrottleRef.current) return;
    actionThrottleRef.current = true;
    setLoading(true);
    try {
      const values = await form.validateFields();

      // Stage-specific validation for "Approved"
      if (actionType === "Approved") {
        const stage = String(jobData?.current_stage || "1");
        const validationError = validateApprovalAction(values, {
          stage, isCS, isCNF, isForwarding, isLiner, needsLpoInvoice,
          releaseOrderFiles, lpoFiles, invoiceFiles,
          haulageCostFiles, haulierNoteFiles, loadListFiles, edFiles,
        });
        if (validationError) {
          message.error(validationError);
          setLoading(false);
          actionThrottleRef.current = false;
          return;
        }
      }

      const payload = {
        ...getCommonPayload(values, !isHOD),
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
                {/* <Col xs={24} md={6}>
                  <Form.Item className={Styles.formLabel} label="Status">
                    <Tag
                      color={STATUS_COLOR[jobData?.status] || STATUS_COLOR[jobData?.status?.toLowerCase()] || "default"}
                      style={{ fontWeight: 'bold', fontSize: '13px', padding: '0 10px' }}
                    >
                      {(jobData?.status || "Draft").toUpperCase()}
                    </Tag>
                  </Form.Item>
                </Col> */}

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
                      <DocUploadField label="Freight Manifest" files={attachments.filter(d => d.doc_type === "FREIGHT MANIFEST")} setFiles={setAttachments} color="blue" onPreview={openPreview} salesInputId={id} category="freight_manifest" docType="FREIGHT MANIFEST" disabled={isSalesSectionLocked || disableAllUploads} user={user} isAdmin={isAdmin} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item label="LOAD LIST UPLOADING" className={Styles.formLabel}>
                      <DocUploadField label="Load List" files={attachments.filter(d => d.doc_type === "LOAD LIST UPLOADING")} setFiles={setAttachments} color="gold" onPreview={openPreview} salesInputId={id} category="load_list" docType="LOAD LIST UPLOADING" disabled={isSalesSectionLocked || isLiner || disableAllUploads} user={user} isAdmin={isAdmin} />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Form.Item label="TDR/Sailing Report" className={Styles.formLabel}>
                      <DocUploadField label="Sailing Report" files={attachments.filter(d => d.doc_type === "TDR/SAILING REPORT")} setFiles={setAttachments} color="green" onPreview={openPreview} salesInputId={id} category="sailing_report" docType="TDR/SAILING REPORT" disabled={isSalesSectionLocked || disableAllUploads} user={user} isAdmin={isAdmin} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item label="OTHER DOCS" className={Styles.formLabel}>
                      <DocUploadField label="Other Docs" files={attachments.filter(d => d.doc_type === "OTHER DOCS")} setFiles={setAttachments} color="purple" onPreview={openPreview} salesInputId={id} category="others" docType="OTHER DOCS" disabled={isSalesSectionLocked || disableAllUploads} user={user} isAdmin={isAdmin} />
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
                              <TextArea placeholder="Quote" disabled={isSalesSectionLocked} autoSize={{ minRows: 1 }} />
                            </Form.Item>
                          </Col>
                          <Col xs={24} md={4}>
                            <Form.Item className={Styles.formLabel} {...rest} name={[name, "cost"]} label="Cost">
                              <TextArea placeholder="Cost" disabled={isSalesSectionLocked} autoSize={{ minRows: 1 }} />
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
                      <TextArea placeholder="Enter any special instructions…" autoSize={{ minRows: 3 }} disabled={isSalesSectionLocked} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item className={Styles.formLabel} label="Remarks" name="remarks">
                      <TextArea placeholder="Enter Remarks" autoSize={{ minRows: 3 }} disabled={isSalesSectionLocked} />
                    </Form.Item>
                  </Col>
                  {(() => {
                    const execDocs = (jobData?.documents || []).filter(d => d.uploaded_by_user_name === jobData?.name_of_executive);
                    return execDocs.length > 0 ? (
                      <Col xs={24} md={12}><Form.Item label="Executive Documents" className={Styles.formLabel}><FileChipList files={execDocs} disabled onPreview={(i) => openPreview(execDocs, i)} user={user} isAdmin={isAdmin} /></Form.Item></Col>
                    ) : null;
                  })()}
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
                          <Col xs={24} md={3}><Form.Item {...restField} name={[name, "special_remarks"]} label="Remarks"><TextArea placeholder="Remarks" disabled={isSalesSectionLocked} autoSize={{ minRows: 1 }} /></Form.Item></Col>
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
          {!stage2.isThisJobsHOD && !isCreator && !isOthers && (
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
                    <Form.Item className={Styles.formLabel} label="Load List Cut-Off Date & Time" name="ll_cut_off_datetime" rules={[{ required: isStage2 && isCS, message: "Required" }]}><DatePicker showTime format="DD-MM-YYYY HH:mm" style={{ width: "100%" }} disabled={isBookingSectionLocked} /></Form.Item>
                  </Col>
                  <Col xs={24} md={6}>
                    <Form.Item className={Styles.formLabel} label="SI Cut-Off Date & Time" name="si_cut_off_date" rules={[{ required: isStage2 && isCS, message: "Required" }]}><DatePicker showTime format="DD-MM-YYYY HH:mm" style={{ width: "100%" }} disabled={isBookingSectionLocked} /></Form.Item>
                  </Col>
                  <Col xs={24} md={6}>
                    <Form.Item className={Styles.formLabel} label="Booking Remarks" name="booking_remarks"><TextArea rows={1} disabled={isBookingSectionLocked} /></Form.Item>
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
                      <Form.Item className={Styles.formLabel} label="Release Order(s)" name="release_order" rules={[{ required: isStage2 && isCS, message: "Required" }]}>
                        <DocUploadField
                          label="Release Order"
                          files={releaseOrderFiles}
                          setFiles={setReleaseOrderFiles}
                          color="blue"
                          onPreview={openPreview}
                          salesInputId={id}
                          category="booking"
                          docType="Release Order"
                          disabled={releaseOrderDisabled || disableAllUploads}
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
                          disabled={baseLocked || csStage4UploadLocked || (isCNFUploadLocked && !isCS) || isCNF || disableAllUploads}
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

                {showDocumentUploads && !hideDocumentsAtStage2 && (
                  <>
                  </>
                )}
              </div>
            </Card>
          )}

          {showDocumentUploads && !hideDocumentsAtStage2 && !isOthers && (
            <Card
              className={Styles.card}
              bordered
              title={
                <CardHeader
                  icon="mdi:file-document-multiple-outline"
                  title="CNF DOCUMENTS & REMARKS"
                  open={open.cnfDocuments}
                  onToggle={() => toggle("cnfDocuments")}
                />
              }
            >
              <div style={{ display: open.cnfDocuments ? "block" : "none" }}>
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
                        disabled={true || disableAllUploads}
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
                        disabled={true || disableAllUploads}
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
                        disabled={true || disableAllUploads}
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
                        disabled={true || disableAllUploads}
                        restrictionMessage={
                          isCNFUploadLocked
                            ? null
                            : !isLLReq && currentStage !== "4"
                            ? "Load List upload is disabled until the requirement is turned on."
                            : currentStage === "2" && isCNF
                            ? "Disabled until Sales & HOD approval is completed."
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
                      <TextArea disabled={true} />
                    </Form.Item>
                  </Col>
                </Row>
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
                  {/* <Col xs={24} md={12}>
                    <Form.Item className={Styles.formLabel} label="Invoice Date" name="invoice_date">
                      <DatePicker style={{ width: "100%" }} format="DD-MM-YYYY" disabled={isAccountsEditableFieldLocked} />
                    </Form.Item>
                  </Col> */}
                  <Col xs={24} md={12}>
                    <Form.Item className={Styles.formLabel} label="Accounts Remarks" name="account_remarks">
                      <TextArea rows={1} disabled={isAccountsEditableFieldLocked} />
                    </Form.Item>
                  </Col>
                  {/* <Col xs={24} md={12}>
                    <Form.Item className={Styles.formLabel} label="Bank Slip Attachment">
                      <DocUploadField label="Bank Slip" files={bankSlips} setFiles={setBankSlips} color="blue" onPreview={openPreview} salesInputId={id} category="financial" docType="Bank Slip" disabled={isAccountsEditableFieldLocked || disableAllUploads} user={user} isAdmin={isAdmin} isMasterMode={isMasterMode} />
                    </Form.Item>
                  </Col> */}
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
          {(!["2","3"].includes(currentStage) && isCS) && (!isCNF || (isForwarding && currentStage === "5")) && showDocumentUploads && (jobData?.job_type !== "OTHERS" || isMasterMode) && (
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
                          <DocUploadField label="LPO" files={lpoFiles} setFiles={setLpoFiles} color="cyan" onPreview={openPreview} salesInputId={id} category="financial" docType="LPO" disabled={isCSUploadLocked || disableAllUploads} user={user} isAdmin={isAdmin} isMasterMode={isMasterMode} />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={8}>
                        <Form.Item className={Styles.formLabel} label={<span>INVOICE {needsLpoInvoice && isCS && <span style={{ color: "#ff4d4f" }}>*</span>}</span>}>
                          <DocUploadField label="Invoice" files={invoiceFiles} setFiles={setInvoiceFiles} color="purple" onPreview={openPreview} salesInputId={id} category="financial" docType="Invoice" disabled={isCSUploadLocked || disableAllUploads} user={user} isAdmin={isAdmin} isMasterMode={isMasterMode} />
                        </Form.Item>
                      </Col>
                    </>
                  )}
                  {!isLiner && (isMasterMode || hblFlag) && (
                    <Col xs={24} md={8}>
                      <Form.Item className={Styles.formLabel} label="HBL">
                        <DocUploadField label="HBL" files={hblFiles} setFiles={setHblFiles} color="blue" onPreview={openPreview} salesInputId={id} category="financial" docType="HBL" disabled={isCSUploadLocked || disableAllUploads} user={user} isAdmin={isAdmin} isMasterMode={isMasterMode} />
                      </Form.Item>
                    </Col>
                  )}
                  {!isLiner && (
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
                  )}
                  {facFlag && (
                    <Col xs={24} md={8}>
                      <Form.Item className={Styles.formLabel} label="FAC">
                        <DocUploadField label="FAC" files={facFiles} setFiles={setFacFiles} color="magenta" onPreview={openPreview} salesInputId={id} category="financial" docType="FAC" disabled={isCSUploadLocked || disableAllUploads} restrictionMessage={isLiner && !isCS ? "CS Department is allowed to upload it" : null} user={user} isAdmin={isAdmin} isMasterMode={isMasterMode} />
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
                          disabled={isCSUploadLocked || disableAllUploads}
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

                  {/* <Typography.Text strong style={{ display: 'block', marginBottom: 8, fontSize: 13, color: '#4b5563' }}>ADD REMARK</Typography.Text> */}
                  {/* <TextArea
                    value={newRemark}
                    onChange={(e) => setNewRemark(e.target.value)}
                    placeholder="Enter your remarks here…"
                    autoSize={{ minRows: 3 }}
                    style={{ marginBottom: 12 }}
                  /> */}
                  {/* <Button
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
                  </Button> */}
                </Col>

                <Col xs={24} md={12}>
                  <Typography.Text strong style={{ display: 'block', marginBottom: 8, fontSize: 13, color: '#4b5563' }}>ATTACHMENTS</Typography.Text>
                  <DocUploadField label="Attachment" files={attachments.filter(d => d.doc_type === "Attachment")} setFiles={setAttachments} color="blue" onPreview={openPreview} salesInputId={id} category="attachments" docType="Attachment" user={user} isAdmin={isAdmin} disabled={true || disableAllUploads} />
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

              {/* Action Box - Disabled */}
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

          {/* Bottom buttons - Disabled */}
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
            {/* {previewVisible && previewUrls.length > 0 && (
              <MultiFileViewer urls={previewUrls} defaultIndex={previewIndex} />
            )} */}
            {previewVisible && previewUrls.length > 0 && (
                <MultiFileViewer
                  files={previewUrls.map((item) => {
                    const url = typeof item === "string" ? item : item.url || item.file_url || "";
                    const name = typeof url === "string" ? url.split("/").pop() : "unknown";
                    return {
                      url,
                      name,
                      mimeType: item?.mimeType, // set if known
                    };
                  })}
                  defaultIndex={previewIndex || 0}
                />
              )}
          </Modal>
        </Form>
      </Spin >
    </div >
  );
};

export default Approval;
