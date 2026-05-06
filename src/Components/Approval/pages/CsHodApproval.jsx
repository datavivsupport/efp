import { useState, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import {
  Card, Row, Col, Typography, Tag, Table, Button,
  Input, Space, Spin, Modal, message, Upload, Select, Form, Tooltip, Checkbox, DatePicker
} from "antd";
import { Icon } from "@iconify/react";
import {
  CheckCircleOutlined, EyeOutlined,
  UploadOutlined, DeleteOutlined, PlusOutlined
} from "@ant-design/icons";
import dayjs from "dayjs";
import ProtectedApprovalRoute from "../ProtectedApprovalRoute";
import MultiFileViewer from "../../Viewer/MultiFileViewer";
import apiClient from "../../../api/apiclient";
import { mapJobToFormValues, partitionDocuments } from "../utils/formMapper";
import EquipmentTypeSelect from "../../SalesInput/EquipmentType";
import CategorySelect from "../../SalesInput/Category";
import Styles from "../Approval.module.css";

const { TextArea } = Input;

const STATUS_COLOR = { 
  Submitted: "processing", 
  SUBMITTED: "processing",
  Draft: "default", 
  draft: "default",
  Approved: "success",
  APPROVED: "success",
  Rejected: "error",
  REJECTED: "error"
};

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

/* ── File chip list for uploads ── */
const FileChipList = ({ files = [], color = "blue", onRemove, onPreview, onRemarkChange, disabled, user, isAdmin }) => (
  <div style={{ marginTop: 8 }}>
    {files.map((file, i) => {
      const isOwner = file.uploaded_by_user === user?.id || !file.id;
      const canEditFile = !disabled && (isAdmin || isOwner);
      return (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '8px', padding: '8px', border: '1px solid #f0f0f0', borderRadius: '4px', backgroundColor: '#fafafa' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px"}}>
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
            <Input size="large" placeholder="Remarks..." value={file.remarks || ""} onChange={(e) => onRemarkChange(i, e.target.value)} style={{ fontSize: '12px', marginTop: '2px', padding: "7px" }} />
          ) : (
            file.remarks && <Typography.Text type="secondary" italic style={{ fontSize: '10px', paddingLeft: '4px' }}>{file.remarks}</Typography.Text>
          )}
        </div>
      );
    })}
  </div>
);

/* ── Upload field wrapper ── */
const DocUploadField = ({ label, files, setFiles, salesInputId, docType, category, onPreview, user, isAdmin, disabled = false }) => {
  const debounceTimerField = useRef(null);
  const [uploading, setUploading] = useState(false);
  const handleBeforeUpload = async (file) => {
    if (!salesInputId) { message.warning("Job ID missing — cannot upload"); return false; }
    const formData = new FormData();
    formData.append("file", file);
    formData.append("doc_type", docType);
    formData.append("category", category);
    setUploading(true);
    try {
      const res = await apiClient.post(`/liner/sales-input/${salesInputId}/upload-document/`, formData, { headers: { "Content-Type": "multipart/form-data" } });
      if (res.data.status === "success") {
        const d = res.data.data;
        setFiles((prev) => [...prev, { id: d.id, name: d.file_name, file_name: d.file_name, url: d.file_url, file_url: d.file_url, doc_type: docType, remarks: "", uploaded_by_user: user?.id, uploaded_by_user_name: d.uploaded_by_user_name || user?.get_full_name || "Me" }]);
        message.success(`${file.name} uploaded`);
      } else { message.error(res.data.message || "Upload failed"); }
    } catch (err) { message.error(err.response?.data?.message || "Upload failed"); }
    finally { setUploading(false); }
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
        <Upload multiple showUploadList={false} beforeUpload={handleBeforeUpload} disabled={disabled}>
          <Button size="small" icon={<UploadOutlined />} style={{ fontSize: 12 }} disabled={disabled || uploading}>{files.length === 0 ? `Upload ${label}` : "Add More"}</Button>
        </Upload>
        {files.length > 0 && (
          <FileChipList files={files} onRemove={(i) => { const docId = files[i]?.id; if (docId) setFiles((p) => p.filter((f) => f.id !== docId)); }} onPreview={(i) => onPreview(files, i)} onRemarkChange={handleRemarkChange} user={user} isAdmin={isAdmin} disabled={disabled} />
        )}
      </div>
    </Spin>
  );
};

/* ── main page ── */
const CsHodApprovalPage = ({ jobData: initialJob, user }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form] = Form.useForm();

  const isAdmin = user?.is_superuser || user?.user_type === "admin";
  
  // Check if there are any unapproved documents
  const hasPendingDocuments = (initialJob?.documents || []).some(d => d.is_cs_hod_approved === false);
  
  // Disable if job is rejected
  const isDisabled = initialJob?.status?.includes("REJECTED");

  const [loading, setLoading]           = useState(false);
  const [open, setOpen]                 = useState({
    export: true, container: true, otherDetails: true, placement: true, booking: true, cnfDetails: true, documents: true, attachments: true, approvalStatus: true
  });

  const [previewVisible, setPreviewVisible]     = useState(false);
  const [previewUrls, setPreviewUrls]           = useState([]);
  const [previewIndex, setPreviewIndex]         = useState(0);
  const [previewLoading, setPreviewLoading]     = useState(false);
  
  const [remarks, setRemarks]                   = useState([]);
  const [newRemark, setNewRemark]               = useState("");
  const [otherCharges, setOtherCharges]         = useState([]);
  const [otherChargesRemarks, setOtherChargesRemarks] = useState("");
  const [attachments, setAttachments]           = useState([]);
  const [docs, setDocs]                         = useState({});
  const [csHodOptions, setCsHodOptions]         = useState([]);
  const throttle = useRef(false);
  
  // Rejection Modal State
  const [rejectionModalVisible, setRejectionModalVisible] = useState(false);
  const [rejectionRemarks, setRejectionRemarks] = useState("");
  const [rejectionLoading, setRejectionLoading] = useState(false);

  useEffect(() => {
    apiClient.get("/accounts/liner/admin/users/hods/").then((res) => {
      const data = res.data?.results ?? res.data ?? [];
      setCsHodOptions(data.map((item) => ({ value: item.id, label: item.get_full_name || item.email || `${item.first_name} ${item.last_name}` })));
    }).catch(() => {});
  }, []);

  const toggle = (key) => setOpen((p) => ({ ...p, [key]: !p[key] }));
  const history = [...(initialJob?.approval_history || [])].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  const ad = initialJob?.approval_details || {};

  /* Pre-fill logic */
  useEffect(() => {
    if (!initialJob) return;
    form.setFieldsValue(mapJobToFormValues(initialJob));
    const buckets = partitionDocuments(initialJob.documents || []);
    setDocs(buckets);
    setAttachments(buckets.attachments || []);
    setOtherCharges(initialJob.approval_details?.other_charges || []);
    setOtherChargesRemarks(initialJob.approval_details?.other_charges_remarks || "");
    setRemarks(initialJob.general_remarks || []);
    
    form.setFieldsValue({
      afsys_job_no: ad.afsys_job_no,
      booking_vessel: ad.booking_vessel,
      booking_voyage: ad.booking_voyage,
      booking_ref_no: ad.booking_ref_no,
      booking_remarks: ad.booking_remarks,
      cnf_remarks: ad.cnf_remarks,
      other_charges_remarks: ad.other_charges_remarks || "",
      cs_hod: initialJob.cs_hod ? Number(initialJob.cs_hod) : null,
      vessel_eta: ad.vessel_eta ? dayjs(ad.vessel_eta) : null,
      vsl_initial_eta: initialJob.vsl_initial_eta ? dayjs(initialJob.vsl_initial_eta) : null,
      vsl_latest_eta: initialJob.vsl_latest_eta ? dayjs(initialJob.vsl_latest_eta) : null,
      vsl_etd: initialJob.vsl_etd ? dayjs(initialJob.vsl_etd) : null,
      pod_eta: initialJob.pod_eta ? dayjs(initialJob.pod_eta) : null,
      ll_cut_off_datetime: ad.ll_cut_off_datetime ? dayjs(ad.ll_cut_off_datetime) : null,
      si_cut_off_date: (() => {
        const d = ad.si_cut_off_date;
        const t = ad.si_cut_off_time;
        if (!d) return null;
        return t ? dayjs(`${d} ${t}`) : dayjs(d);
      })(),
    });
  }, [initialJob, form, ad]);

  const openPreview = (filesArray, idx = 0) => {
    if (!filesArray?.length) return;
    setPreviewLoading(true);
    setPreviewIndex(Math.max(0, Math.min(idx, filesArray.length - 1)));
    setPreviewVisible(true);
    setTimeout(() => {
      const filesWithMime = (filesArray || []).map((file) => {
        let mimeType = file.mimeType || file.type;
        if (!mimeType) {
          const ext = (file.url || file.file_url || "").split(".").pop()?.toLowerCase();
          if (ext === "pdf") mimeType = "application/pdf";
          else if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext))
            mimeType = `image/${ext === "jpg" ? "jpeg" : ext}`;
          else mimeType = "other";
        }
        return { ...file, mimeType };
      });
      setPreviewUrls(filesWithMime);
      setPreviewLoading(false);
    }, 0);
  };

  const handleAction = async (action) => {
    if (action === "Rejected") {
      // Show rejection modal instead of directly rejecting
      setRejectionModalVisible(true);
      setRejectionRemarks("");
      return;
    }
    
    // For Approval - proceed normally
    if (throttle.current) return;
    const approvalRemarks = form.getFieldValue("approvalRemarks");

    throttle.current = true;
    setLoading(true);
    try {
      const endpoint = `/liner/sales-input/${id}/approve/`;
      
      let payload;
      // For approval: send remarks + approved document IDs
      const unapprovedDocIds = (initialJob?.documents || [])
        .filter(d => d.is_cs_hod_approved === false)
        .map(d => d.id);
      
      payload = {
        remarks: approvalRemarks,
        approved_document_ids: unapprovedDocIds
      };
      
      const res = await apiClient.post(endpoint, payload);
      if (res.data.status === "success") { message.success(res.data.message || "Approved successfully"); setTimeout(() => navigate("/"), 1500); }
      else { message.error(res.data.message || "Action failed"); }
    } catch (err) { message.error(err.response?.data?.message || "Something went wrong"); }
    finally { throttle.current = false; setLoading(false); }
  };

  // Handle rejection confirmation from modal
  const handleConfirmRejection = async () => {
    if (!rejectionRemarks.trim()) {
      message.error("Please enter rejection remarks");
      return;
    }
    
    if (throttle.current) return;
    throttle.current = true;
    setRejectionLoading(true);
    
    try {
      const endpoint = `/liner/sales-input/${id}/reject/`;
      const payload = {
        remarks: rejectionRemarks
      };
      
      const res = await apiClient.post(endpoint, payload);
      if (res.data.status === "success") { 
        message.success(res.data.message || "Job rejected successfully"); 
        setRejectionModalVisible(false);
        setTimeout(() => navigate("/"), 1500); 
      }
      else { message.error(res.data.message || "Rejection failed"); }
    } catch (err) { 
      message.error(err.response?.data?.message || "Something went wrong"); 
    } finally { 
      throttle.current = false; 
      setRejectionLoading(false); 
    }
  };

  const handleSave = async () => {
    if (throttle.current) return;
    throttle.current = true;
    setLoading(true);
    try {
      const dm = (arr, docType, category) =>
        (arr || []).map(f => ({
          id: f.id,
          doc_type: docType,
          category,
          file_url: f.url || f.file_url,
          file_name: f.name || f.file_name,
          remarks: f.remarks || "",
          uploaded_by_user: f.uploaded_by_user,
        }));
      const payload = {
        general_remarks: remarks,
        documents: [
          ...dm(docs.releaseOrderFiles, "Release Order", "booking"),
          ...dm(docs.bocFiles, "BOC", "booking"),
          ...dm(docs.haulageCostFiles, "Haulage Cost", "booking"),
          ...dm(docs.haulierNoteFiles, "Haulage Note", "booking"),
          ...dm(docs.loadListFiles, "Load List", "booking"),
          ...dm(docs.lpoFiles, "LPO", "financial"),
          ...dm(docs.invoiceFiles, "Invoice", "financial"),
          ...dm(docs.hblFiles, "HBL", "financial"),
          ...dm(docs.facFiles, "FAC", "financial"),
          ...dm(docs.edFiles, "ED", "financial"),
          ...dm(docs.preAlertFiles, "PRE-ALERT", "financial"),
          ...dm(docs.bankSlips, "Bank Slip", "financial"),
          ...dm(docs.croFiles, "CRO", "financial"),
          ...attachments.map(f => ({ ...f, doc_type: "Attachment", category: "attachments" })),
        ],
      };
      const res = await apiClient.patch(`/liner/sales-input/${id}/`, payload);
      if (res.data.status === "success" || res.status === 200 || res.status === 201) {
        message.success(res.data.message || "Saved successfully");
      } else {
        message.error(res.data.message || "Save failed");
      }
    } catch (err) {
      message.error(err.response?.data?.message || "Save failed");
    } finally {
      throttle.current = false;
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "10px 20px 20px 20px", backgroundColor: "#eff8ff", minHeight: "100vh" }}>
      <Spin spinning={loading}>
        <Form form={form} layout="vertical">
          
          {/* EXPORT DETAILS */}
          <Card className={Styles.card} bordered title={<CardHeader icon="basil:document-solid" title="EXPORT DETAILS (CS HOD APPROVAL)" open={open.export} onToggle={() => toggle("export")} />}>
            <div style={{ display: open.export ? "block" : "none" }}>
              <div style={{ marginBottom: 12 }}>
                <Tag color="success" icon={<CheckCircleOutlined />}>Sales HOD Approved</Tag>
                {initialJob?.status?.includes("REJECTED") && (
                  <div style={{ marginTop: 8, padding: 12, backgroundColor: "#fff2e8", border: "1px solid #ffbb96", borderRadius: 4 }}>
                    <div style={{ fontWeight: 600, color: "#d4380d", marginBottom: 4 }}>⚠️ Rejection Reason:</div>
                    <div style={{ color: "#595959" }}>{initialJob?.rejection_remarks || "Rejected by previous approver"}</div>
                  </div>
                )}
              </div>
              <Row gutter={[16, 8]}>
                <Col xs={24} md={6}><Form.Item className={Styles.formLabel} label="Export Number" name="export_number"><Input disabled variant="filled" /></Form.Item></Col>
                <Col xs={24} md={6}><Form.Item className={Styles.formLabel} label="Export Created Date" name="export_created_date"><Input disabled variant="filled" /></Form.Item></Col>
                <Col xs={24} md={6}><Form.Item className={Styles.formLabel} label="Customer Name" name="customer_name"><Input disabled variant="filled" /></Form.Item></Col>
                <Col xs={24} md={6}><Form.Item className={Styles.formLabel} label="Carrier Name" name="carrier_name"><Input disabled variant="filled" /></Form.Item></Col>
                {/* <Col xs={24} md={6}><Form.Item className={Styles.formLabel} label="Status"><Tag color="cyan" style={{ fontWeight: 'bold' }}>{(initialJob?.status || "DRAFT").toUpperCase()}</Tag></Form.Item></Col> */}
                <Col xs={24} md={6}><Form.Item className={Styles.formLabel} label="Contact PIC" name="contact_pic"><Input disabled variant="filled" /></Form.Item></Col>
                <Col xs={24} md={6}><Form.Item className={Styles.formLabel} label="Contact Details" name="phone_no"><Input disabled variant="filled" /></Form.Item></Col>
                <Col xs={24} md={6}><Form.Item className={Styles.formLabel} label="Commodity" name="commodity"><Input disabled variant="filled" /></Form.Item></Col>
                <Col xs={24} md={6}><Form.Item className={Styles.formLabel} label="Export Created By" name="created_by_name"><Input disabled variant="filled" /></Form.Item></Col>
              </Row>
            </div>
          </Card>

          {/* CONTAINER DETAILS */}
          <Card className={Styles.card} bordered title={<CardHeader icon="octicon:container-24" title="CONTAINER DETAILS" open={open.container} onToggle={() => toggle("container")} />}>
            <div style={{ display: open.container ? "block" : "none" }}>
              <Form.List name="containerRows">
                {(fields) => fields.map(({ key, name, ...rest }) => (
                  <Row gutter={16} key={key} align="middle">
                    <Col xs={24} md={5}><Form.Item className={Styles.formLabel} {...rest} name={[name, "equipment_type"]} label="Equipment Type"><EquipmentTypeSelect disabled /></Form.Item></Col>
                    <Col xs={24} md={4}><Form.Item className={Styles.formLabel} {...rest} name={[name, "quantity"]} label="Qty"><Input disabled variant="filled" /></Form.Item></Col>
                    <Col xs={24} md={5}><Form.Item className={Styles.formLabel} {...rest} name={[name, "category"]} label="Category"><CategorySelect disabled /></Form.Item></Col>
                    <Col xs={24} md={5}><Form.Item className={Styles.formLabel} {...rest} name={[name, "quote"]} label="Quote"><TextArea disabled variant="filled" autoSize={{ minRows: 1 }} /></Form.Item></Col>
                    <Col xs={24} md={5}><Form.Item className={Styles.formLabel} {...rest} name={[name, "cost"]} label="Cost"><TextArea disabled variant="filled" autoSize={{ minRows: 1 }} /></Form.Item></Col>
                  </Row>
                ))}
              </Form.List>
              <Row gutter={16} style={{ marginTop: 8 }}><Col xs={24}><Form.Item className={Styles.formLabel} label="Other Charges"><div className={Styles.chipBox} style={{ border: '1px solid #d9d9d9', borderRadius: '4px', padding: '4px 11px', backgroundColor: '#f5f5f5', minHeight: 32 }}><Space wrap>{otherCharges.map((c, i) => (<Tag key={i} color="cyan">{c}</Tag>))}{otherCharges.length === 0 && otherChargesRemarks && <span style={{ color: '#666', fontSize: 12 }}>{otherChargesRemarks}</span>}{otherCharges.length === 0 && !otherChargesRemarks && <span style={{ color: '#bfbfbf', fontSize: 12 }}>No other charges</span>}</Space></div></Form.Item></Col></Row>
            </div>
          </Card>

          {/* OTHER DETAILS */}
          <Card className={Styles.card} bordered title={<CardHeader icon="mingcute:ship-fill" title="OTHER DETAILS" open={open.otherDetails} onToggle={() => toggle("otherDetails")} />}>
            <div style={{ display: open.otherDetails ? "block" : "none" }}>
              <Row gutter={16}>
                <Col xs={24} md={6}><Form.Item className={Styles.formLabel} label="POL" name="port_of_loading"><Input disabled variant="filled" /></Form.Item></Col>
                <Col xs={24} md={6}><Form.Item className={Styles.formLabel} label="POD" name="port_of_discharge"><Input disabled variant="filled" /></Form.Item></Col>
                <Col xs={24} md={6}><Form.Item className={Styles.formLabel} label="FPOD" name="final_pod"><Input disabled variant="filled" /></Form.Item></Col>
                <Col xs={24} md={6}><Form.Item className={Styles.formLabel} label="Terms of Shipment" name="terms_of_shipment"><Input disabled variant="filled" /></Form.Item></Col>
                <Col xs={24} md={6}><Form.Item className={Styles.formLabel} label="Haulier Code" name="haulier_code"><Input disabled variant="filled" /></Form.Item></Col>
                <Col xs={24} md={12}><Form.Item className={Styles.formLabel} label="Special Instruction if Any" name="special_instructions"><TextArea disabled variant="filled" rows={3} /></Form.Item></Col>
                <Col xs={24} md={12}><Form.Item className={Styles.formLabel} label="Remarks" name="remarks"><TextArea disabled variant="filled" rows={3} /></Form.Item></Col>
                {(() => {
                  const execDocs = (initialJob?.documents || []).filter(d => d.uploaded_by_user_name === initialJob?.name_of_executive);
                  return execDocs.length > 0 ? (
                    <Col xs={24} md={12}><Form.Item label="Executive Documents" className={Styles.formLabel}><FileChipList files={execDocs} disabled onPreview={(i) => openPreview(execDocs, i)} user={user} isAdmin={isAdmin} /></Form.Item></Col>
                  ) : null;
                })()}
                <Col xs={24} md={12}><Form.Item className={Styles.formLabel} label="Name of Executive" name="name_of_executive"><Input disabled variant="filled" /></Form.Item></Col>
              </Row>
              <Row gutter={16} style={{ marginTop: 8 }}>
                <Col xs={12} md={6}><Form.Item name="hbl" valuePropName="checked" noStyle><Checkbox disabled>HBL</Checkbox></Form.Item></Col>
                <Col xs={12} md={6}><Form.Item name="fac" valuePropName="checked" noStyle><Checkbox disabled>FAC</Checkbox></Form.Item></Col>
                <Col xs={12} md={6}><Form.Item name="documentation" valuePropName="checked" noStyle><Checkbox disabled>Documentation</Checkbox></Form.Item></Col>
                <Col xs={12} md={6}><Form.Item name="transportation" valuePropName="checked" noStyle><Checkbox disabled>Transportation</Checkbox></Form.Item></Col>
              </Row>
            </div>
          </Card>

          {/* PLACEMENT DETAILS */}
          <Card className={Styles.card} bordered title={<CardHeader icon="hugeicons:delivery-truck-02" title="PLACEMENT DETAILS" open={open.placement} onToggle={() => toggle("placement")} />}>
            <div style={{ display: open.placement ? "block" : "none" }}>
              <Form.List name="placementRows">
                {(fields) => fields.map(({ key, name, ...restField }) => (
                  <Row key={key} gutter={16} align="middle">
                    <Col xs={24} md={4}><Form.Item {...restField} name={[name, "equipment_type"]} label="Equip Type"><EquipmentTypeSelect disabled /></Form.Item></Col>
                    <Col xs={24} md={4}><Form.Item {...restField} name={[name, "no_of_containers"]} label="Vol"><Input disabled variant="filled" /></Form.Item></Col>
                    <Col xs={24} md={4}><Form.Item {...restField} name={[name, "category"]} label="Category"><CategorySelect disabled /></Form.Item></Col>
                    <Col xs={24} md={4}><Form.Item {...restField} name={[name, "placement_time"]} label="Date/Time"><DatePicker showTime format="DD-MM-YYYY HH:mm" disabled /></Form.Item></Col>
                    <Col xs={24} md={4}><Form.Item {...restField} name={[name, "pickup_location"]} label="Pickup/Delivery"><Input disabled variant="filled" /></Form.Item></Col>
                    <Col xs={24} md={4}><Form.Item {...restField} name={[name, "special_remarks"]} label="Remarks"><TextArea disabled variant="filled" autoSize={{ minRows: 1 }} /></Form.Item></Col>
                  </Row>
                ))}
              </Form.List>
            </div>
          </Card>

          {/* BOOKING DETAILS (TECHNICAL DOCUMENTS) */}
          <Card className={Styles.card} bordered title={<CardHeader icon="fluent:box-24-filled" title="BOOKING DETAILS (TECHNICAL DOCUMENTS)" open={open.booking} onToggle={() => toggle("booking")} />}>
            <div style={{ display: open.booking ? "block" : "none" }}>
              <Row gutter={[16, 8]}>
                <Col xs={24} md={6}><Form.Item className={Styles.formLabel} label="AFSYS Job No." name="afsys_job_no"><Input disabled variant="filled" /></Form.Item></Col>
                <Col xs={24} md={6}><Form.Item className={Styles.formLabel} label="Booking Vessel" name="booking_vessel"><Input disabled variant="filled" /></Form.Item></Col>
                <Col xs={24} md={6}><Form.Item className={Styles.formLabel} label="Booking Voyage" name="booking_voyage"><Input disabled variant="filled" /></Form.Item></Col>
                <Col xs={24} md={6}><Form.Item className={Styles.formLabel} label="Vessel ETA Date" name="vessel_eta"><DatePicker style={{ width: "100%" }} disabled format="DD-MM-YYYY" /></Form.Item></Col>
                <Col xs={24} md={6}><Form.Item className={Styles.formLabel} label="Initial ETA" name="vsl_initial_eta"><DatePicker style={{ width: "100%" }} disabled format="DD-MM-YYYY" /></Form.Item></Col>
                <Col xs={24} md={6}><Form.Item className={Styles.formLabel} label="Latest ETA" name="vsl_latest_eta"><DatePicker style={{ width: "100%" }} disabled format="DD-MM-YYYY" /></Form.Item></Col>
                <Col xs={24} md={6}><Form.Item className={Styles.formLabel} label="ETD" name="vsl_etd"><DatePicker style={{ width: "100%" }} disabled format="DD-MM-YYYY" /></Form.Item></Col>
                <Col xs={24} md={6}><Form.Item className={Styles.formLabel} label="POD ETA" name="pod_eta"><DatePicker style={{ width: "100%" }} disabled format="DD-MM-YYYY" /></Form.Item></Col>
                <Col xs={24} md={6}><Form.Item className={Styles.formLabel} label="Booking Reference No." name="booking_ref_no"><Input disabled variant="filled" /></Form.Item></Col>
                <Col xs={24} md={6}><Form.Item className={Styles.formLabel} label="Load List Cut-Off Date & Time" name="ll_cut_off_datetime"><DatePicker showTime style={{ width: "100%" }} disabled format="DD-MM-YYYY HH:mm" /></Form.Item></Col>
                <Col xs={24} md={6}><Form.Item className={Styles.formLabel} label="SI Cut-Off Date & Time" name="si_cut_off_date"><DatePicker showTime style={{ width: "100%" }} disabled format="DD-MM-YYYY HH:mm" /></Form.Item></Col>
                <Col xs={24} md={24}><Form.Item className={Styles.formLabel} label="Booking Remarks" name="booking_remarks"><TextArea disabled variant="filled" rows={2} /></Form.Item></Col>
              </Row>
              <Row gutter={[16, 16]} style={{ marginTop: 12 }}>
                <Col xs={24} md={12}><Form.Item label="Release Order(s)" className={Styles.formLabel}><FileChipList files={docs?.releaseOrderFiles || []} onPreview={(i) => openPreview(docs?.releaseOrderFiles || [], i)} user={user} isAdmin={isAdmin} disabled /></Form.Item></Col>
                <Col xs={24} md={12}><Form.Item label="BOC Attachment" className={Styles.formLabel}><FileChipList files={docs?.bocFiles || []} onPreview={(i) => openPreview(docs?.bocFiles || [], i)} user={user} isAdmin={isAdmin} disabled /></Form.Item></Col>
              </Row>
            </div>
          </Card>

          {/* CNF DETAILS */}
          <Card className={Styles.card} bordered title={<CardHeader icon="mdi:file-document-multiple-outline" title="CNF DETAILS" open={open.cnfDetails} onToggle={() => toggle("cnfDetails")} />}>
            <div style={{ display: open.cnfDetails ? "block" : "none" }}>
              <Row gutter={[16, 16]}>
                <Col xs={24} md={12}><Form.Item label="Haulage Cost Sheet" className={Styles.formLabel}><FileChipList files={docs?.haulageCostFiles || []} onPreview={(i) => openPreview(docs?.haulageCostFiles || [], i)} user={user} isAdmin={isAdmin} disabled /></Form.Item></Col>
                <Col xs={24} md={12}><Form.Item label="Haulier Note" className={Styles.formLabel}><FileChipList files={docs?.haulierNoteFiles || []} onPreview={(i) => openPreview(docs?.haulierNoteFiles || [], i)} user={user} isAdmin={isAdmin} disabled /></Form.Item></Col>
                <Col xs={24} md={12}><Form.Item label="Load List" className={Styles.formLabel}><FileChipList files={docs?.loadListFiles || []} onPreview={(i) => openPreview(docs?.loadListFiles || [], i)} user={user} isAdmin={isAdmin} disabled /></Form.Item></Col>
                <Col xs={24} md={12}>
                  <Form.Item label="ED" className={Styles.formLabel}>
                    {(docs?.edFiles || []).length === 0 ? (
                      <div style={{ fontSize: 12, color: '#bfbfbf', padding: '4px 11px', backgroundColor: '#f5f5f5', border: '1px solid #d9d9d9', borderRadius: '4px', minHeight: 32, display: 'flex', alignItems: 'center' }}>No documents</div>
                    ) : (
                      <FileChipList files={docs?.edFiles || []} onPreview={(i) => openPreview(docs?.edFiles || [], i)} user={user} isAdmin={isAdmin} disabled />
                    )}
                  </Form.Item>
                </Col>
                <Col xs={24} md={24}><Form.Item label="CNF Remarks" name="cnf_remarks" className={Styles.formLabel}><TextArea disabled variant="filled" rows={2} /></Form.Item></Col>
              </Row>
            </div>
          </Card>

          {/* ALL UPLOADED DOCUMENTS (CS DOCUMENTS STAGE) */}
          <Card className={Styles.card} bordered title={<CardHeader icon="mdi:file-document-outline" title="FINANCIAL DOCUMENTS OVERVIEW" open={open.documents} onToggle={() => toggle("documents")} />}>
            <div style={{ display: open.documents ? "block" : "none" }}>
              <Row gutter={[24, 16]}>
                <Col xs={24} md={8}>
                  <Typography.Text strong style={{ fontSize: 13, color: '#4b5563' }}>CS HOD</Typography.Text>
                  <Form.Item name="cs_hod" noStyle>
                    <Select disabled options={csHodOptions} placeholder="—" variant="filled" style={{ width: '100%', marginTop: 8 }} />
                  </Form.Item>
                </Col>
                {[
                  { label: 'LPO',       files: docs?.lpoFiles || [] },
                  { label: 'INVOICE',   files: docs?.invoiceFiles || [] },
                  { label: 'HBL',       files: docs?.hblFiles || [] },
                  { label: 'FAC',       files: docs?.facFiles || [] },
                  { label: 'Pre-Alert', files: docs?.preAlertFiles || [] },
                ].map(({ label, files }) => (
                  <Col key={label} xs={24} md={8}>
                    <Typography.Text strong style={{ fontSize: 13, color: '#4b5563' }}>{label}</Typography.Text>
                    {files?.length > 0
                      ? <FileChipList files={files} onPreview={(i) => openPreview(files, i)} user={user} isAdmin={isAdmin} disabled />
                      : <div style={{ marginTop: 8 }}>
                          <Upload disabled showUploadList={false}>
                            <Button size="small" icon={<UploadOutlined />} disabled style={{ fontSize: 12, color: '#bfbfbf', borderColor: '#d9d9d9' }}>
                              No documents
                            </Button>
                          </Upload>
                        </div>
                    }
                  </Col>
                ))}
              </Row>
            </div>
          </Card>

          {/* ATTACHMENTS AND COMMENTS */}
          <Card className={Styles.card} bordered title={<CardHeader icon="mdi:comment-text-multiple-outline" title="ATTACHMENTS AND COMMENTS" open={open.attachments} onToggle={() => toggle("attachments")} />}>
            <div style={{ display: open.attachments ? "block" : "none" }}>
              <Row gutter={32}>
                <Col xs={24} md={12}>
                  <Typography.Text strong style={{ display: 'block', marginBottom: 8, fontSize: 13, color: '#4b5563' }}>REMARKS</Typography.Text>
                  <div style={{ maxHeight: 300, overflowY: 'auto', marginBottom: 16 }}>
                    {remarks.map((r, i) => {
                      const isObject = typeof r === 'object' && r !== null;
                      const authorName = isObject ? r.user_name : null;
                      const authorId = isObject ? r.user_id : null;
                      const canDelete = isAdmin || authorId === user?.id || !authorId;
                      return (
                        <div key={i} style={{ position: 'relative', padding: '12px 32px 12px 12px', backgroundColor: '#f9f9f9', border: '1px solid #e5e7eb', borderRadius: 8, marginBottom: 8 }}>
                          {canDelete && <Button type="text" size="small" danger icon={<DeleteOutlined />} style={{ position: "absolute", top: 6, right: 6 }} onClick={() => setRemarks((p) => p.filter((_, j) => j !== i))} />}
                          <p style={{ margin: 0, fontSize: 13, color: '#1f2937' }}>{isObject ? r.text : r}</p>
                          {authorName && <Typography.Text type="secondary" style={{ fontSize: '10px', display: 'block', marginTop: 4 }}>— {authorName} {r.date ? `on ${dayjs(r.date).format("DD MMM YY HH:mm")}` : ""}</Typography.Text>}
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
                  <Typography.Text strong style={{ display: 'block', marginBottom: 8, fontSize: 13, color: '#4b5563' }}>GENERAL ATTACHMENTS</Typography.Text>
                  <DocUploadField label="Attachment" files={attachments} setFiles={setAttachments} salesInputId={id} category="attachments" docType="Attachment" onPreview={openPreview} user={user} isAdmin={isAdmin} />
                </Col>
              </Row>
            </div>
          </Card>

          {/* APPROVAL STATUS & HISTORY */}
          <Card className={Styles.card} bordered title={<CardHeader icon="mdi:check-decagram-outline" title="APPROVAL STATUS & HISTORY" open={open.approvalStatus} onToggle={() => toggle("approvalStatus")} />}>
            <div style={{ display: open.approvalStatus ? "block" : "none" }}>
              <Table dataSource={history} columns={[
                { title: "Stage", dataIndex: "stage" },
                { title: "Pending With", dataIndex: "pending_with" },
                { title: "Updated By", dataIndex: "updated_by_user_name", render: (n, r) => (<Space direction="vertical" size={0}><span>{n || r.updated_by_name}</span><span style={{ fontSize: 11, color: "#6b7280" }}>{r.updated_by_department || r.updated_by_role}</span></Space>) },
                { title: "Status", dataIndex: "status", render: (s) => (<Tag color={STATUS_COLOR[s] || STATUS_COLOR[s?.toLowerCase()] || "default"}>{s?.toUpperCase()}</Tag>) },
                { title: "Updated Date", dataIndex: "created_at", render: (d) => d ? dayjs(d).format("DD-MM-YYYY HH:mm") : "N/A" }
              ]} rowKey="id" pagination={false} size="small" scroll={{ x: 'max-content' }} />
              
              <div style={{ marginTop: 16, padding: 16, backgroundColor: "#fff", borderRadius: 12, border: "1px solid #e0e7ff", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
                <Typography.Text strong style={{ display: "block", marginBottom: 12, color: "#1f2937" }}>Approval Remarks</Typography.Text>
                <Form.Item name="approvalRemarks"><TextArea placeholder="Enter final approval remarks..." rows={3} style={{ borderRadius: 8 }} /></Form.Item>
              </div>
            </div>
          </Card>

          {/* ACTION BUTTONS (BOTTOM CENTER) */}
          <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'center', gap: 16, width: '100%', paddingBottom: '40px', flexWrap: 'wrap' }}>
            {(hasPendingDocuments || isDisabled) && (
              <>
            <Button
              size="large"
              onClick={handleSave}
              icon={<Icon icon="mdi:content-save-outline" />}
              loading={loading}
              style={{ borderRadius: 8, height: 48, padding: "0 40px", fontSize: 16, fontWeight: '600' }}
            >
              Save
            </Button>
            <Button
              type="primary"
              size="large"
              onClick={() => handleAction("Approved")}
              icon={<Icon icon="mdi:check-circle" />}
              loading={loading}
              style={{ borderRadius: 8, height: 48, padding: "0 40px", backgroundColor: "#10b981", borderColor: "#10b981", fontSize: 16, fontWeight: '600' }}
            >
              Approve (CS HOD)
            </Button>
            <Button
              danger
              size="large"
              onClick={() => handleAction("Rejected")}
              icon={<Icon icon="mdi:close-circle" />}
              loading={loading}
              style={{ borderRadius: 8, height: 48, padding: "0 40px", fontSize: 16, fontWeight: '600' }}
            >
              Reject
            </Button>
              </>
            )}
            <Button
              size="large"
              onClick={() => navigate("/")}
              icon={<Icon icon="mdi:close" />}
              style={{ borderRadius: 8, height: 48, padding: "0 40px", fontSize: 16, fontWeight: '600' }}
            >
              Cancel
            </Button>
          </div>
        </Form>
      </Spin>
      <Modal open={previewVisible} footer={null} title="Document Preview" onCancel={() => setPreviewVisible(false)} width="90%" style={{ top: 20 }} styles={{ body: { height: "87vh", padding: 0 } }} destroyOnHide>
        {previewLoading && (
          <div style={{ height: "87vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Spin size="large" />
          </div>
        )}
        {previewVisible && !previewLoading && previewUrls.length > 0 && (
          <MultiFileViewer
            files={previewUrls.map((item) => {
              const url = typeof item === "string" ? item : item.url || item.file_url || "";
              const name = url.split("/").pop() || "unknown";
              return { url, name, mimeType: item?.mimeType };
            })}
            defaultIndex={previewIndex || 0}
          />
        )}
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
          <Button key="reject" danger type="primary" loading={rejectionLoading} onClick={handleConfirmRejection}>
            Confirm Rejection
          </Button>,
        ]}
        width={600}
      >
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontWeight: 600, marginBottom: 8 }}>Please enter rejection remarks:</p>
          <Input.TextArea
            rows={4}
            placeholder="Enter rejection reason"
            value={rejectionRemarks}
            onChange={(e) => setRejectionRemarks(e.target.value)}
            style={{ borderRadius: 4 }}
          />
        </div>
      </Modal>
    </div>
  );
};

/* ── wrap with guard ── */
const CsHodApproval = () => (
  <ProtectedApprovalRoute routeKey="cs-hod-approval">
    {({ jobData, user }) => <CsHodApprovalPage jobData={jobData} user={user} />}
  </ProtectedApprovalRoute>
);

export default CsHodApproval;
