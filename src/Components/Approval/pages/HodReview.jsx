import { useEffect, useState, useCallback, useRef, createContext, useContext, useMemo } from "react";
import { useNavigate, useParams } from "react-router";
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
  Tooltip,
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
import ProtectedApprovalRoute from "../ProtectedApprovalRoute";
import { computeUserRoles } from "../utils/roleUtils";
import { computeJobContext } from "../utils/jobContextUtils";
import { computeCanApprove } from "../utils/canApprove";
import { mapJobToFormValues, partitionDocuments } from "../utils/formMapper";
import { normalizeBoolean } from "../utils/formUtils";
import { buildCommonPayload } from "../utils/payloadBuilders";
import { validateApprovalAction } from "../utils/approvalValidations";
import EquipmentTypeSelect from "../../SalesInput/EquipmentType";
import CategorySelect from "../../SalesInput/Category";
import MultiFileViewer from "../../Viewer/MultiFileViewer";
import apiClient from "../../../api/apiclient";
import { deleteDocument } from "../../../utils/documentApi";
import Styles from "../Approval.module.css";

const { TextArea } = Input;
const { Option } = Select;

const STATUS_COLOR = { Submitted: "processing", Draft: "default" };
const UploadActivityContext = createContext(null);

/* ── Collapsible Card Header ── */
const CardHeader = ({ icon, title, open, onToggle }) => (
  <div
    onClick={onToggle}
    style={{ cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}
  >
    <Space align="center">
      <div className={Styles.mainhead}><Icon icon={icon} width="18" height="18" /></div>
      <Typography.Title level={5} style={{ margin: 0 }}>{title}</Typography.Title>
    </Space>
    <span style={{ fontSize: 22, color: "#626161" }}>
      <Icon icon={open ? "grommet-icons:form-up" : "grommet-icons:form-down"} />
    </span>
  </div>
);

/* ── FileChipList ── */
const FileChipList = ({ files, color = "blue", onRemove, onPreview, onRemarkChange, disabled, user, isAdmin }) => (
  <div style={{ marginTop: 8 }}>
    {files.map((file, i) => {
      const isOwner = file.uploaded_by_user === user?.id || !file.id;
      const canEditFile = !disabled && (isAdmin || isOwner);
      return (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '8px', padding: '8px', border: '1px solid #f0f0f0', borderRadius: '4px', backgroundColor: '#fafafa' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: "flex" }}>
              <Icon icon="famicons:document-attach" style={{ color: '#747474' }} />
              <Typography.Text ellipsis style={{ maxWidth: 150 }}>{file.name || file.file_name}</Typography.Text>
              {file.uploaded_by_user_name && (
                <Typography.Text type="secondary" style={{ fontSize: '10px' }}>({file.uploaded_by_user_name})</Typography.Text>
              )}
            </div>
            <Space>
              <Tooltip title="Preview"><Button icon={<EyeOutlined />} type="link" size="small" onClick={() => onPreview(i)} /></Tooltip>
              <Tooltip title="Delete">{canEditFile && <Button type="text" danger size="small" icon={<DeleteOutlined />} onClick={() => onRemove(i)} />}</Tooltip>
            </Space>
          </div>
          {canEditFile ? (
            <Input   className={Styles.remarkInput} size="large" placeholder="Remarks..." value={file.remarks || ""} onChange={(e) => onRemarkChange(i, e.target.value)} style={{ fontSize: '12px', marginTop: '2px', padding: "7px" }} />
          ) : (
            file.remarks && <Typography.Text   className={Styles.remarkInput} type="secondary" italic style={{ fontSize: '10px', paddingLeft: '4px' }}>{file.remarks}</Typography.Text>
          )}
        </div>
      );
    })}
  </div>
);

/* ── DocUploadField ── */
const DocUploadField = ({ label, files, setFiles, color = "purple", onPreview, salesInputId, category = "general", docType = "Other", disabled = false, restrictionMessage = null, isMasterMode = false, user, isAdmin }) => {
  const debounceTimerField = useRef(null);
  const [uploading, setUploading] = useState(false);
  const uploadActivity = useContext(UploadActivityContext);
  const handleBeforeUpload = async (file) => {
    if (restrictionMessage) { message.error(restrictionMessage); return false; }
    if (isMasterMode) { message.warning("Uploads are disabled in View-Only Mode"); return false; }
    if (!salesInputId && !isMasterMode) { message.warning("Save the draft first before uploading documents"); return false; }
    const formData = new FormData();
    formData.append('file', file);
    formData.append('doc_type', docType);
    formData.append('category', category);
    uploadActivity?.inc?.();
    setUploading(true);
    try {
      const response = await apiClient.post(`/liner/sales-input/${salesInputId}/upload-document/`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      if (response.data.status === "success") {
        const uploadedDoc = response.data.data;
        setFiles((prev) => [...prev, { id: uploadedDoc.id, name: uploadedDoc.file_name, url: uploadedDoc.file_url, file_name: uploadedDoc.file_name, file_url: uploadedDoc.file_url, doc_type: docType, remarks: "", uploaded_by_user: user?.id, uploaded_by_user_name: uploadedDoc.uploaded_by_user_name || user?.get_full_name || user?.name || "Me" }]);
        message.success(`${file.name} uploaded successfully to S3`);
      } else { message.error("Upload failed: " + response.data.message); }
    } catch (err) { message.error(err.response?.data?.message || "Upload failed. Please check your connection."); }
    finally {
      setUploading(false);
      uploadActivity?.dec?.();
    }
    return false;
  };
  const handleRemarkChange = (index, value) => {
    if (!files?.[index]) return;
    const docId = files[index].id;
    setFiles((prev) => prev.map((f) => (f.id === docId ? { ...f, remarks: value } : f)));
    if (salesInputId && docId) {
      if (debounceTimerField.current) clearTimeout(debounceTimerField.current);
      debounceTimerField.current = setTimeout(async () => {
        try { await apiClient.patch(`/liner/sales-input/${salesInputId}/update-document-remarks/`, { doc_id: docId, remarks: value }); } catch (err) { console.error("Failed to sync remarks:", err); }
      }, 800);
    }
  };
  return (
    <Spin spinning={uploading} size="small">
      <div>
        <Upload multiple showUploadList={false} beforeUpload={handleBeforeUpload}>
          <Button size="small" icon={<UploadOutlined />} style={{ fontSize: 12 }} disabled={disabled || uploading}>{files.length === 0 ? `Upload ${label}` : "Add More"}</Button>
        </Upload>
        {disabled && restrictionMessage && <Typography.Text type="secondary" style={{ display: "block", marginTop: 4, fontSize: 12 }}>{restrictionMessage}</Typography.Text>}
        {files.length > 0 && (
          <FileChipList
            files={files}
            color={color}
            onRemove={async (i) => {
              const f = files[i];
              if (!f) return;
              if (f?.id && !f.pending) {
                const prev = files;
                setFiles((p) => p.filter((ff) => ff.id !== f.id));
                try {
                  await deleteDocument(salesInputId, f.id);
                  message.success("Attachment deleted");
                } catch (err) {
                  setFiles(prev);
                  message.error(err.response?.data?.message || "Failed to delete attachment");
                }
              } else {
                setFiles((p) => p.filter((_, j) => j !== i));
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
    </Spin>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN PAGE COMPONENT
═══════════════════════════════════════════════════════════════════════════ */
const HodReviewPage = ({ jobData: initialJobData, user }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const actionThrottleRef = useRef(false);

  const [loading, setLoading] = useState(false);
  const [jobData, setJobData] = useState(initialJobData);
  const [open, setOpen] = useState({
    export: true, container: true, others: true, otherDetails: true,
    placement: true, booking: true, bankAccounts: false,
    documents: true, attachments: true, approvalStatus: true,
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
  const otherChargesDisplay = otherCharges.length > 0 ? otherCharges.join(", ") : chargeInput || "";
  const [remarks, setRemarks] = useState([]);
  const [newRemark, setNewRemark] = useState("");
  const [approvalHistory, setApprovalHistory] = useState([]);
  
  const [rejectionModalVisible, setRejectionModalVisible] = useState(false);
  const [rejectionRemarks, setRejectionRemarks] = useState("");
  const [rejectionLoading, setRejectionLoading] = useState(false);
  const [uploadingDocsCount, setUploadingDocsCount] = useState(0);
  const isDocumentUploading = uploadingDocsCount > 0;
  const executiveDocs = useMemo(
    () =>
      (jobData?.documents || [])
        .filter((d) => d.uploaded_by_user_name === jobData?.name_of_executive)
        .sort((a, b) => {
          const aId = Number(a?.id);
          const bId = Number(b?.id);
          if (Number.isFinite(aId) && Number.isFinite(bId)) return aId - bId;
          if (Number.isFinite(aId)) return -1;
          if (Number.isFinite(bId)) return 1;
          return 0;
        }),
    [jobData?.documents, jobData?.name_of_executive]
  );

  /* ── Compute roles, context, locks ── */
  const {
    isAdmin, isCS, userFullName, hasAllowedRole,
    isSalesHOD, isCNF, isCNFHOD, isCSHOD, isAccountsTeam
  } = computeUserRoles(user);

  const roles = { isCS, isAdmin, userFullName, isSalesHOD, isCNF, isCNFHOD, isCSHOD, isAccountsTeam };

  const {
    currentStage,
    isLiner, isCrossTrade, isForwarding, isOthers,
    isMasterMode, isExtended, isTerminal,
    stage2,
  } = computeJobContext({ jobData, id, user, approvalHistory, roles });

  const baseLocked = true;
  const isSalesSectionLocked = true;
  const isBookingSectionLocked = true;
        const isCNFUploadLocked = true;
  const isRequirementSelectorLocked = true;
  const showDocumentUploads = true;
    const needsLpoInvoice = false;

  /* ── Form watches ── */
  const isLLReqForm = Form.useWatch("is_load_list_required", form);
  const isHNReqForm = Form.useWatch("is_haulier_note_required", form);
  const isROReqForm = Form.useWatch("is_release_order_required", form);
  const isLNR_LPO_ReqForm = Form.useWatch("is_lpo_invoice_required", form);
        
          
              
  const toggle = (key) => setOpen((p) => ({ ...p, [key]: !p[key] }));
  const showPlacement = true;
  const isHalted = isCrossTrade && (jobData?.status === "STOPPED" || jobData?.is_blocked);

  const canApprove = computeCanApprove({
    hasAllowedRole, isAdmin, currentStage: "2",
    isLiner, isCrossTrade, isForwarding, isExtended,
    isCS, isCNF, isCNFHOD, isCSHOD, isAccountsTeam, isSalesHOD,
    isCNFDone: !!jobData?.is_cnf_done, 
    isCNFStage: false, 
    isCSHODStage: false, 
    isThisJobsCSHOD: String(user?.id) === String(jobData?.cs_hod), 
    stage2,
  });

  const openPreview = (filesArray, localIdx) => {
    const urls = filesArray.map((f) => f.url || f.file_url).filter(Boolean);
    if (!urls.length) return;
    setPreviewUrls(urls);
    setPreviewIndex(Math.max(0, Math.min(localIdx, urls.length - 1)));
    setPreviewVisible(true);
  };

  /* ── Effects ── */
  useEffect(() => {
    if (!jobData) return;
    form.setFieldsValue(mapJobToFormValues(jobData));
    if (jobData.documents) {
      const buckets = partitionDocuments(jobData.documents, jobData.name_of_executive);
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
    const sortedHistory = (jobData.approval_history || []).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    setApprovalHistory(sortedHistory);
    setOtherCharges(jobData.approval_details?.other_charges || []);
    setChargeInput(jobData.approval_details?.other_charges_remarks || "");
    setRemarks(jobData.general_remarks || []);
  }, [jobData, form]);

  useEffect(() => {
    apiClient.get("/accounts/liner/admin/users/hods/").then((res) => {
      const data = res.data?.results ?? res.data ?? [];
      setCsHodOptions(data.map((item) => ({ value: item.id, label: item.get_full_name || item.email || `${item.first_name} ${item.last_name}` })));
    }).catch(() => {});
  }, []);

  /* ── Handlers ── */
  const getCommonPayload = (values, includeApprovalDetails = false) => {
    const mergedAttachments = [...(attachments || []), ...executiveDocs].filter((doc, idx, arr) => {
      if (!doc) return false;
      if (doc.id == null) return true;
      return idx === arr.findIndex((d) => d?.id === doc.id);
    });

    return buildCommonPayload(
      values,
      {
        releaseOrderFiles,
        bocFiles,
        haulageCostFiles,
        loadListFiles,
        lpoFiles,
        invoiceFiles,
        facFiles,
        croFiles,
        edFiles,
        haulierNoteFiles,
        preAlertFiles,
        bankSlips,
        attachments: mergedAttachments,
        hblFiles,
      },
      { remarks, otherCharges, jobData, includeApprovalDetails }
    );
  };

  const handleAction = async (actionType, remarksVal = "") => {
    if (isDocumentUploading) {
      message.warning("Please wait until document upload is complete.");
      return;
    }
    // Show rejection modal instead of direct rejection
    if (actionType === "Rejected") {
      setRejectionRemarks("");
      setRejectionModalVisible(true);
      return;
    }

    if (actionThrottleRef.current) return;
    actionThrottleRef.current = true;
    setLoading(true);
    try {
      const values = actionType === "Rejected" ? form.getFieldsValue() : await form.validateFields();
      if (actionType === "Approved") {
        const validationError = validateApprovalAction(values, {
          stage: "2", isCS: false, isCNF: false, isForwarding, isLiner, needsLpoInvoice,
          releaseOrderFiles, lpoFiles, invoiceFiles, haulageCostFiles, haulierNoteFiles, loadListFiles, edFiles,
        });
        if (validationError) { message.error(validationError); setLoading(false); actionThrottleRef.current = false; return; }
      }
      
      let payload;
      if (actionType === "Rejected") {
        // For rejection - send only remarks
        payload = {
          remarks: remarksVal || form.getFieldValue("approvalRemarks") || "Rejected by HOD"
        };
      } else {
        // For Submit/Approve - send full payload
        payload = { ...getCommonPayload(values), action: actionType, remarks: remarksVal || form.getFieldValue("approvalRemarks") };
      }
      
      const endpoint = actionType === "Submit" ? `/liner/sales-input/${id}/submit/` : actionType === "Approved" ? `/liner/sales-input/${id}/approve/` : `/liner/sales-input/${id}/reject/`;
      const response = await apiClient.post(endpoint, payload);
      if (response.data.status === "success") { message.success(response.data.message || "Action Performed Successfully"); setTimeout(() => navigate("/"), 1500); }
      else { message.error(response.data.message || "Action failed"); }
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.errorFields?.[0]?.errors?.[0] || "Check required fields";
      message.error("Error performing action: " + errorMsg);
    } finally { actionThrottleRef.current = false; setLoading(false); }
  };

  const handleConfirmRejection = async () => {
    if (isDocumentUploading) {
      message.warning("Please wait until document upload is complete.");
      return;
    }
    if (!rejectionRemarks.trim()) {
      message.warning("Please enter rejection remarks");
      return;
    }

    if (actionThrottleRef.current) return;
    actionThrottleRef.current = true;
    setRejectionLoading(true);
    try {
      const payload = { remarks: rejectionRemarks.trim() };
      const response = await apiClient.post(`/liner/sales-input/${id}/reject/`, payload);
      if (response.data.status === "success") {
        message.success(response.data.message || "Job rejected successfully");
        setRejectionModalVisible(false);
        setTimeout(() => navigate("/"), 1500);
      } else {
        message.error(response.data.message || "Rejection failed");
      }
    } catch (err) {
      message.error(err.response?.data?.message || "Something went wrong");
    } finally {
      actionThrottleRef.current = false;
      setRejectionLoading(false);
    }
  };

  const onFinish = async (values) => {
    if (isDocumentUploading) {
      message.warning("Please wait until document upload is complete.");
      return;
    }
    if (actionThrottleRef.current) return;
    actionThrottleRef.current = true;
    setLoading(true);
    try {
      const payload = { ...getCommonPayload(values), status: "Updated Level 2" };
      const response = await apiClient.patch(`/liner/sales-input/${id}/`, payload);
      if (response.data.status === "success" || response.status === 200 || response.status === 201) { message.success(response.data.message || "Job Saved Successfully"); setTimeout(() => navigate("/"), 1500); }
      else { message.error(response.data.message || "Failed to save changes"); }
    } catch (err) { message.error(err.response?.data?.message || "Internal server error"); }
    finally { actionThrottleRef.current = false; setLoading(false); }
  };

  
  /* ── Table columns ── */
  const approvalColumns = [
    { title: "Stage", dataIndex: "stage", key: "stage" },
    { title: "Pending With", dataIndex: "pending_with", key: "pending_with", render: (pw) => pw || "N/A" },
    { title: "Updated By", dataIndex: "updated_by_user_name", key: "updated_by_user_name", render: (name, record) => (<Space direction="vertical" size={0}><span>{name || record.updated_by_name || "N/A"}</span><span style={{ fontSize: 11, color: "#6b7280" }}>{record.updated_by_department || record.updated_by_role || ""}</span></Space>) },
    { title: "Status", dataIndex: "status", key: "status", render: (s) => (<Tag color={STATUS_COLOR[s] || STATUS_COLOR[s?.toLowerCase()] || "default"} style={{ fontWeight: 'bold', fontSize: '13px', padding: '0 10px' }}>{s?.toUpperCase()}</Tag>) },
    { title: "Remarks", dataIndex: "remarks", key: "remarks", render: (value) => (<span style={{ whiteSpace: "normal", wordBreak: "break-word" }}>{value || "N/A"}</span>) },
    { title: "Updated Date", dataIndex: "created_at", key: "created_at", render: (d) => d ? dayjs(d).format("DD-MM-YYYY HH:mm") : "N/A" },
  ];

  /* ═══════════════════════════════════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════════════════════════════════ */
  return (
    <div style={{ padding: "10px 20px 20px 20px", backgroundColor: "#eff8ff" }}>
      <UploadActivityContext.Provider
        value={{
          inc: () => setUploadingDocsCount((prev) => prev + 1),
          dec: () => setUploadingDocsCount((prev) => Math.max(0, prev - 1)),
        }}
      >
      <Spin spinning={loading}>
        <Form layout="vertical" form={form} onFinish={onFinish} initialValues={{ containerRows: [{}], placementRows: [{}] }}>

          {/* ════════ EXPORT DETAILS (HEADER) ════════ */}
          <Card
            className={Styles.card} bordered
            title={
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <CardHeader icon="basil:document-solid" title="EXPORT DETAILS (HOD REVIEW)" open={open.export} onToggle={() => toggle("export")} />
                <Space>
                  {(jobData?.is_hod_approved || isMasterMode) && !isOthers && <Tag color="success" icon={<CheckCircleOutlined />}>Sales HOD Approved</Tag>}
                  {(isExtended || isMasterMode) && (jobData?.is_cs_hod_approved || isMasterMode) && <Tag color="processing" icon={<CheckCircleOutlined />}>CS HOD Approved</Tag>}
                </Space>
              </div>
            }
          >
            <div style={{ display: open.export ? "block" : "none" }}>
              <Row gutter={16}>
                <Col xs={24} md={6}><Form.Item className={Styles.formLabel} label="Export Number" name="export_number"><Input readOnly variant="filled" disabled={isSalesSectionLocked} /></Form.Item></Col>
                <Col xs={24} md={6}><Form.Item className={Styles.formLabel} label="Export Created Date" name="export_created_date"><Input readOnly variant="filled" disabled={isSalesSectionLocked} /></Form.Item></Col>
                <Col xs={24} md={6}><Form.Item className={Styles.formLabel} label="Customer Name" name="customer_name" rules={[{ required: true }]}><Input placeholder="Customer Name" disabled={isSalesSectionLocked} /></Form.Item></Col>
                {!isOthers && <Col xs={24} md={6}><Form.Item className={Styles.formLabel} label="Carrier Name" name="carrier_name"><Input placeholder="Carrier Name" disabled={isSalesSectionLocked} /></Form.Item></Col>}
                {/* <Col xs={24} md={6}>
                  <Form.Item className={Styles.formLabel} label="Status">
                    <Tag color={STATUS_COLOR[jobData?.status] || STATUS_COLOR[jobData?.status?.toLowerCase()] || "default"} style={{ fontWeight: 'bold', fontSize: '13px', padding: '0 10px' }}>{(jobData?.status || "Draft").toUpperCase()}</Tag>
                  </Form.Item>
                </Col> */}
                <Col xs={24} md={6}><Form.Item className={Styles.formLabel} label="Contact PIC" name="contact_pic"><Input placeholder="Contact PIC" disabled={isSalesSectionLocked} /></Form.Item></Col>
                <Col xs={24} md={6}><Form.Item className={Styles.formLabel} label="Phone No" name="phone_no"><Input placeholder="Phone No" disabled={isSalesSectionLocked} /></Form.Item></Col>
                <Col xs={24} md={6}><Form.Item className={Styles.formLabel} label="Email" name="email"><Input placeholder="Email" disabled={isSalesSectionLocked} /></Form.Item></Col>
                <Col xs={24} md={6}><Form.Item className={Styles.formLabel} label="Commodity" name="commodity"><Input placeholder="Commodity" disabled={isSalesSectionLocked} /></Form.Item></Col>
                {isForwarding && <Col xs={24} md={6}><Form.Item className={Styles.formLabel} label="Overseas Agent Name" name="overseas_agent_name"><Input placeholder="Enter Overseas Agent Name" disabled={isSalesSectionLocked} /></Form.Item></Col>}
                <Col xs={24} md={6}><Form.Item className={Styles.formLabel} label="Export Created By" name="created_by_name"><Input readOnly variant="filled" /></Form.Item></Col>
              </Row>
            </div>
          </Card>

          {/* ════════ OTHERS JOB DETAILS ════════ */}
          {(isOthers || isMasterMode) && (
            <Card className={Styles.card} bordered title={<CardHeader icon="fluent:box-24-filled" title="OTHERS JOB DETAILS" open={open.others} onToggle={() => toggle("others")} />}>
              <div style={{ display: open.others ? "block" : "none" }}>
                {showDocumentUploads && (
                  <>
                    <Row gutter={16}>
                      <Col xs={24} md={6}><Form.Item label="CARRIER" name="carrier_remarks" className={Styles.formLabel}><Input placeholder="Free text carrier" disabled={isSalesSectionLocked} /></Form.Item></Col>
                      <Col xs={24} md={6}><Form.Item label="VSL/VOY" name="vessel_voyage_remarks" className={Styles.formLabel}><Input placeholder="Free text vessel/voyage" disabled={isSalesSectionLocked} /></Form.Item></Col>
                      <Col xs={24} md={6}><Form.Item label="POL (Port of Loading)" name="pol_remarks" className={Styles.formLabel}><Input placeholder="Free text POL" disabled={isSalesSectionLocked} /></Form.Item></Col>
                      <Col xs={24} md={6}><Form.Item label="POD (Port of Discharge)" name="pod_remarks" className={Styles.formLabel}><Input placeholder="Free text POD" disabled={isSalesSectionLocked} /></Form.Item></Col>
                    </Row>
                    <Row gutter={16}>
                      <Col xs={24} md={12}><Form.Item label="FREIGHT MANIFEST" className={Styles.formLabel}><DocUploadField label="Freight Manifest" files={attachments.filter(d => d.doc_type === "FREIGHT MANIFEST")} setFiles={setAttachments} color="blue" onPreview={openPreview} salesInputId={id} category="freight_manifest" docType="FREIGHT MANIFEST" disabled={isSalesSectionLocked} user={user} isAdmin={isAdmin} /></Form.Item></Col>
                      <Col xs={24} md={12}><Form.Item label="LOAD LIST UPLOADING" className={Styles.formLabel}><DocUploadField label="Load List" files={attachments.filter(d => d.doc_type === "LOAD LIST UPLOADING")} setFiles={setAttachments} color="gold" onPreview={openPreview} salesInputId={id} category="load_list" docType="LOAD LIST UPLOADING" disabled={isSalesSectionLocked || isLiner} user={user} isAdmin={isAdmin} /></Form.Item></Col>
                    </Row>
                    <Row gutter={16}>
                      <Col xs={24} md={12}><Form.Item label="TDR/Sailing Report" className={Styles.formLabel}><DocUploadField label="Sailing Report" files={attachments.filter(d => d.doc_type === "TDR/SAILING REPORT")} setFiles={setAttachments} color="green" onPreview={openPreview} salesInputId={id} category="sailing_report" docType="TDR/SAILING REPORT" disabled={isSalesSectionLocked} user={user} isAdmin={isAdmin} /></Form.Item></Col>
                      <Col xs={24} md={12}><Form.Item label="OTHER DOCS" className={Styles.formLabel}><DocUploadField label="Other Docs" files={attachments.filter(d => d.doc_type === "OTHER DOCS")} setFiles={setAttachments} color="purple" onPreview={openPreview} salesInputId={id} category="others" docType="OTHER DOCS" disabled={isSalesSectionLocked} user={user} isAdmin={isAdmin} /></Form.Item></Col>
                    </Row>
                  </>
                )}
              </div>
            </Card>
          )}

          {/* ════════ CONTAINER DETAILS ════════ */}
          {!isOthers && (
            <Card className={Styles.card} bordered title={<CardHeader icon="octicon:container-24" title="CONTAINER DETAILS" open={open.container} onToggle={() => toggle("container")} />}>
              <div style={{ display: open.container ? "block" : "none" }}>
                <Form.List name="containerRows">
                  {(fields, { add, remove }) => (
                    <>
                      {fields.map(({ key, name, ...rest }) => (
                        <Row gutter={16} key={key} align="middle">
                          <Col xs={24} md={5}><Form.Item className={Styles.formLabel} {...rest} name={[name, "equipment_type"]} label="Equipment Type" rules={[{ required: true }]}><EquipmentTypeSelect disabled={isSalesSectionLocked} /></Form.Item></Col>
                          <Col xs={24} md={4}><Form.Item className={Styles.formLabel} {...rest} name={[name, "quantity"]} label="Qty"><Input placeholder="Qty" disabled={isSalesSectionLocked} /></Form.Item></Col>
                          <Col xs={24} md={5}><Form.Item className={Styles.formLabel} {...rest} name={[name, "category"]} label="Category"><CategorySelect disabled={isSalesSectionLocked} /></Form.Item></Col>
                          <Col xs={24} md={4}><Form.Item className={Styles.formLabel} {...rest} name={[name, "quote"]} label="Quote"><TextArea placeholder="Quote" disabled={isSalesSectionLocked} autoSize={{ minRows: 1 }} /></Form.Item></Col>
                          <Col xs={24} md={4}><Form.Item className={Styles.formLabel} {...rest} name={[name, "cost"]} label="Cost"><TextArea placeholder="Cost" disabled={isSalesSectionLocked} autoSize={{ minRows: 1 }} /></Form.Item></Col>
                          <Col xs={24} md={1}><Button danger style={{ marginTop: "1rem" }} disabled={fields.length <= 1 || isSalesSectionLocked} icon={<DeleteOutlined />} onClick={() => remove(name)} /></Col>
                          <Col xs={24} md={1}>{!isSalesSectionLocked && <Button type="primary" style={{ marginTop: "1rem" }} icon={<PlusOutlined />} onClick={() => add()} />}</Col>
                        </Row>
                      ))}
                    </>
                  )}
                </Form.List>
                <Row gutter={16} style={{ marginTop: 8 }}>
                  <Col xs={24}>
                    <Form.Item className={Styles.formLabel} label="Other Charges">
                      <Input.TextArea
                        value={otherChargesDisplay}
                        placeholder="No other charges"
                        disabled
                        variant="filled"
                        autoSize={{ minRows: 2 }}
                      />
                    </Form.Item>
                  </Col>
                </Row>
              </div>
            </Card>
          )}

          {/* ════════ OTHER DETAILS (POL/POD etc) ════════ */}
          {(!isOthers || isMasterMode) && (
            <Card className={Styles.card} bordered title={<CardHeader icon="mingcute:ship-fill" title="OTHER DETAILS" open={open.otherDetails} onToggle={() => toggle("otherDetails")} />}>
              <div style={{ display: open.otherDetails ? "block" : "none" }}>
                <Row gutter={16}>
                  {!isOthers && (
                    <>
                      <Col xs={24} md={6}><Form.Item className={Styles.formLabel} label="POL" name="port_of_loading" rules={[{ required: true }]}><Input placeholder="Port of Loading" disabled={isSalesSectionLocked} /></Form.Item></Col>
                      <Col xs={24} md={6}><Form.Item className={Styles.formLabel} label="POD" name="port_of_discharge" rules={[{ required: true }]}><Input placeholder="Port of Discharge" disabled={isSalesSectionLocked} /></Form.Item></Col>
                      <Col xs={24} md={6}><Form.Item className={Styles.formLabel} label="FPOD" name="final_pod"><Input placeholder="Final Port of Discharge" disabled={isSalesSectionLocked} /></Form.Item></Col>
                    </>
                  )}
                  <Col xs={24} md={6}><Form.Item className={Styles.formLabel} label="Terms of Shipment" name="terms_of_shipment"><Select placeholder="Select Terms" allowClear disabled={isSalesSectionLocked}><Option value="prepaid">Prepaid</Option><Option value="collect">Collect</Option></Select></Form.Item></Col>
                  <Col xs={24} md={6}><Form.Item className={Styles.formLabel} label="Haulier Code" name="haulier_code"><Input placeholder="Enter Code" disabled={isBookingSectionLocked && !(isForwarding && currentStage === "3" && !jobData?.is_cnf_done)} /></Form.Item></Col>
                  <Col xs={24} md={12}><Form.Item className={Styles.formLabel} label="Special Instruction if Any" name="special_instructions"><TextArea placeholder="Enter any special instructions…" autoSize={{ minRows: 3, maxRows: 8 }} disabled={isSalesSectionLocked} /></Form.Item></Col>
                  {/* <Col xs={24} md={12}><Form.Item className={Styles.formLabel} label="Remarks" name="remarks"><TextArea placeholder="Enter Remarks" rows={3} disabled={isSalesSectionLocked} /></Form.Item></Col> */}
                  {executiveDocs.length > 0 ? (
                    <Col xs={24} md={12}><Form.Item label="Executive Documents" className={Styles.formLabel}><FileChipList files={executiveDocs} disabled onPreview={(i) => openPreview(executiveDocs, i)} user={user} isAdmin={isAdmin} /></Form.Item></Col>
                  ) : null}
                </Row>
                <Row gutter={16}>
                  <Col xs={24} md={12}><Form.Item className={Styles.formLabel} label="Name of Executive" name="name_of_executive" rules={[{ required: !isOthers, message: "Required" }]}><Input placeholder="Sales Executive" disabled={true} /></Form.Item></Col>
                </Row>
                <Row gutter={16}>
                  {!isLiner && <Col xs={12} md={6}><Form.Item name="hbl" valuePropName="checked" noStyle><Checkbox disabled={isSalesSectionLocked}><span style={{ color: "rgba(0, 0, 0, 0.88)" }}>HBL</span></Checkbox></Form.Item></Col>}
                  <Col xs={12} md={6}><Form.Item name="fac" valuePropName="checked" noStyle><Checkbox disabled={isRequirementSelectorLocked || isSalesSectionLocked}><span style={{ color: "rgba(0, 0, 0, 0.88)" }}>FAC</span></Checkbox></Form.Item></Col>
                  <Col xs={12} md={6}><Form.Item name="documentation" valuePropName="checked" noStyle><Checkbox disabled={isRequirementSelectorLocked || isSalesSectionLocked}><span style={{ color: "rgba(0, 0, 0, 0.88)" }}>Documentation</span></Checkbox></Form.Item></Col>
                  <Col xs={12} md={6}><Form.Item name="transportation" valuePropName="checked" noStyle><Checkbox disabled={isSalesSectionLocked}><span style={{ color: "rgba(0, 0, 0, 0.88)" }}>Transportation</span></Checkbox></Form.Item></Col>
                </Row>
              </div>
            </Card>
          )}

          {/* ════════ PLACEMENT DETAILS ════════ */}
          {(!isOthers || isMasterMode) && showPlacement && (
            <Card className={Styles.card} bordered title={<CardHeader icon="hugeicons:delivery-truck-02" title="PLACEMENT DETAILS" open={open.placement} onToggle={() => toggle("placement")} />}>
              <div style={{ display: open.placement ? "block" : "none" }}>
                <Form.List name="placementRows">
                  {(fields, { add, remove }) => (
                    <>
                      {fields.map(({ key, name, ...restField }) => (
                        <Row key={key} gutter={16} align="middle">
                          <Col xs={24} md={4}><Form.Item {...restField} name={[name, "equipment_type"]} label="Equip Type"><EquipmentTypeSelect disabled={isSalesSectionLocked} /></Form.Item></Col>
                          <Col xs={24} md={3}><Form.Item {...restField} name={[name, "no_of_containers"]} label="Vol"><Input placeholder="Vol" disabled={isSalesSectionLocked} /></Form.Item></Col>
                          <Col xs={24} md={4}><Form.Item {...restField} name={[name, "category"]} label="Category"><CategorySelect disabled={isSalesSectionLocked} /></Form.Item></Col>
                          <Col xs={24} md={4}><Form.Item {...restField} name={[name, "placement_time"]} label="Date/Time"><DatePicker showTime format="DD-MM-YYYY HH:mm" disabled={isSalesSectionLocked} /></Form.Item></Col>
                          <Col xs={24} md={4}><Form.Item {...restField} name={[name, "pickup_location"]} label="Pickup/Delivery"><Input placeholder="Location" disabled={isSalesSectionLocked} /></Form.Item></Col>
                          <Col xs={24} md={3}><Form.Item {...restField} name={[name, "special_remarks"]} label="Remarks"><TextArea placeholder="Remarks" disabled={isSalesSectionLocked} autoSize={{ minRows: 1 }} /></Form.Item></Col>
                          <Col xs={24} md={2}><Button danger disabled={fields.length <= 1 || isSalesSectionLocked} icon={<DeleteOutlined />} onClick={() => remove(name)} style={{ marginTop: '1.8rem' }} /></Col>
                        </Row>
                      ))}
                      {!isSalesSectionLocked && <Button type="dashed" onClick={() => add()} block icon={<Icon icon="mdi:plus" />}>Add Placement Detail</Button>}
                    </>
                  )}
                </Form.List>
              </div>
            </Card>
          )}

          {/* ════════ ATTACHMENTS AND COMMENTS ════════ */}
          <Card className={Styles.card} bordered title={<CardHeader icon="mdi:comment-text-multiple-outline" title="ATTACHMENTS AND COMMENTS" open={open.attachments} onToggle={() => toggle("attachments")} />}>
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
                      const canDelete = isAdmin || authorId === user?.id || !authorId;
                      return (
                        <div key={i} style={{ position: 'relative', padding: '12px 32px 12px 12px', backgroundColor: '#f9f9f9', border: '1px solid #e5e7eb', borderRadius: 8, marginBottom: 8 }}>
                          {canDelete && <Button type="text" size="small" danger icon={<DeleteOutlined />} style={{ position: "absolute", top: 6, right: 6 }} onClick={() => setRemarks((p) => p.filter((_, j) => j !== i))} />}
                          <p style={{ margin: 0, fontSize: 13, color: '#1f2937' }}>{text}</p>
                          {authorName && <Typography.Text type="secondary" style={{ fontSize: '10px', display: 'block', marginTop: 4 }}>— {authorName} {r.date ? `on ${dayjs(r.date).format("DD-MM-YYYY HH:mm")}` : ""}</Typography.Text>}
                        </div>
                      );
                    })}
                    {remarks.length === 0 && <Typography.Text type="secondary" style={{ fontStyle: 'italic', fontSize: 12 }}>No general remarks yet.</Typography.Text>}
                  </div>
                  <Typography.Text strong style={{ display: 'block', marginBottom: 8, fontSize: 13, color: '#4b5563' }}>ADD REMARK</Typography.Text>
                  <TextArea value={newRemark} onChange={(e) => setNewRemark(e.target.value)} placeholder="Enter your remarks here…" autoSize={{ minRows: 3 }} style={{ marginBottom: 12 }} />
                  <Button type="primary" onClick={() => { if (newRemark.trim()) { setRemarks(p => [...p, { text: newRemark.trim(), user_id: user?.id, user_name: user?.first_name || user?.name || "User", date: new Date().toISOString() }]); setNewRemark(""); } }} icon={<PlusOutlined />}>Add Remark</Button>
                </Col>
                <Col xs={24} md={12}>
                  <Typography.Text strong style={{ display: 'block', marginBottom: 8, fontSize: 13, color: '#4b5563' }}>ATTACHMENTS</Typography.Text>
                  <DocUploadField label="Attachment" files={attachments.filter(d => d.doc_type === "Attachment")} setFiles={setAttachments} color="blue" onPreview={openPreview} salesInputId={id} category="attachments" docType="Attachment" user={user} isAdmin={isAdmin} disabled={isOthers} />
                                  </Col>
              </Row>
            </div>
          </Card>

          {/* ════════ APPROVAL STATUS (HISTORY) ════════ */}
          <Card className={Styles.card} bordered title={<CardHeader icon="mdi:check-decagram-outline" title="APPROVAL STATUS & HISTORY" open={open.approvalStatus} onToggle={() => toggle("approvalStatus")} />}>
            <div style={{ display: open.approvalStatus ? "block" : "none" }}>
              <Table dataSource={approvalHistory} columns={approvalColumns} rowKey="id" pagination={false} size="small" scroll={{ x: 'max-content' }} />
              {!isTerminal && canApprove && (
                <div style={{ marginTop: 16, padding: 16, backgroundColor: "#fff", borderRadius: 12, border: "1px solid #e0e7ff", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
                  <Typography.Text strong style={{ display: "block", marginBottom: 12, color: "#1f2937" }}>Approval Remarks</Typography.Text>
                  <Form.Item name="approvalRemarks"><TextArea placeholder="Enter remarks for approval/rejection..." rows={3} style={{ borderRadius: 8 }} /></Form.Item>
                </div>
              )}
            </div>
          </Card>

          {isHalted && (
            <Alert
              message="WORKFLOW HALTED"
              description="System Check: Pending Documentation or blocked status."
              type="error" showIcon style={{ marginTop: 16, marginBottom: 16 }}
            />
          )}

          {/* ACTION BUTTONS (BOTTOM CENTER) */}
          {!isTerminal && canApprove && (
            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'center', gap: 16, width: '100%', paddingBottom: '40px', flexWrap: 'wrap' }}>
              <Button
                type="primary"
                size="large"
                onClick={() => handleAction("Approved")}
                icon={<Icon icon="mdi:check-circle" />}
                loading={loading}
                disabled={isHalted || isDocumentUploading || loading}
                style={{ borderRadius: 8, height: 48, padding: "0 40px", backgroundColor: "#10b981", borderColor: "#10b981", fontSize: 16, fontWeight: '600' }}
              >
                Approve (Sales HOD)
              </Button>
              <Button
                danger
                size="large"
                onClick={() => handleAction("Rejected")}
                icon={<Icon icon="mdi:close-circle" />}
                loading={loading}
                disabled={isHalted || isDocumentUploading || loading}
                style={{ borderRadius: 8, height: 48, padding: "0 40px", fontSize: 16, fontWeight: '600' }}
              >
                Reject
              </Button>
              <Button
                size="large"
                onClick={() => navigate("/")}
                icon={<Icon icon="mdi:close" />}
                style={{ borderRadius: 8, height: 48, padding: "0 40px", fontSize: 16, fontWeight: '600' }}
              >
                Cancel
              </Button>
            </div>
          )}

          {/* BOTTOM BUTTON FOR CS UPDATE */}
          {!canApprove && !isMasterMode && (!isSalesSectionLocked) && (
            <div style={{ display: "flex", justifyContent: "center", gap: 16, width: "100%", marginTop: "24px", paddingBottom: "40px", flexWrap: "wrap" }}>
              <Button htmlType="submit" size="large" icon={<Icon icon="mdi:content-save-outline" />} loading={loading} disabled={isDocumentUploading || loading} style={{ height: 48, padding: "0 40px", borderRadius: 8, fontSize: 16, fontWeight: '600' }}>
                Save Draft
              </Button>
              <Button type="primary" size="large" onClick={() => handleAction("Submit")} icon={<Icon icon="mdi:send" />} loading={loading} disabled={isDocumentUploading || loading} style={{ height: 48, padding: "0 40px", borderRadius: 8, fontSize: 16, fontWeight: '600' }}>
                Submit
              </Button>
              <Button size="large" onClick={() => navigate("/")} icon={<Icon icon="mdi:close" />} style={{ height: 48, padding: "0 40px", borderRadius: 8, fontSize: 16, fontWeight: '600' }}>
                Cancel
              </Button>
            </div>
          )}

          {/* PREVIEW MODAL */}
          <Modal open={previewVisible} footer={null} title="Attachments" onCancel={() => setPreviewVisible(false)} width="90%" style={{ top: 20 }} styles={{ body: { height: "87vh", padding: 0 } }} destroyOnClose>
            {previewVisible && previewUrls.length > 0 && <MultiFileViewer urls={previewUrls} defaultIndex={previewIndex} />}
          </Modal>

          {/* Rejection Remarks Modal */}
          <Modal
            title="Reject Job"
            open={rejectionModalVisible}
            onCancel={() => setRejectionModalVisible(false)}
            footer={[
              <Button key="cancel" onClick={() => setRejectionModalVisible(false)}>
                Cancel
              </Button>,
              <Button key="reject" danger type="primary" loading={rejectionLoading} disabled={isDocumentUploading || rejectionLoading} onClick={handleConfirmRejection}>
                Confirm Rejection
              </Button>,
            ]}
            width={600}
          >
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontWeight: 600, marginBottom: 8 }}>Please enter rejection remarks:</p>
              <Input.TextArea
                rows={4}
                placeholder="Enter rejection reason (e.g., 'Incomplete documents', 'Invalid information', etc.)"
                value={rejectionRemarks}
                onChange={(e) => setRejectionRemarks(e.target.value)}
                style={{ borderRadius: 4 }}
              />
              <p style={{ fontSize: 12, color: "#666", marginTop: 8 }}>This reason will be visible to the CS team for corrections.</p>
            </div>
          </Modal>
        </Form>
      </Spin>
      </UploadActivityContext.Provider>
    </div>
  );
};

/* ── Wrap with guard ── */
const HodReview = () => (
  <ProtectedApprovalRoute routeKey="hod-review">
    {({ jobData, user }) => <HodReviewPage jobData={jobData} user={user} />}
  </ProtectedApprovalRoute>
);

export default HodReview;
