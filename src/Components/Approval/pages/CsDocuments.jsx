import { useState, useRef, useEffect, useMemo } from "react";
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
import { deleteDocument } from "../../../utils/documentApi";
import { computeUserRoles } from "../utils/roleUtils";
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
const FileChipList = ({ files, color = "blue", onRemove, onPreview, onRemarkChange, disabled, user, isAdmin }) => (
  <div style={{ marginTop: 8 }}>
    {files.map((file, i) => {
      const isPending = !!file.pending;
      const isOwner = file.uploaded_by_user === user?.id || !file.id;
      const canEditFile = !disabled && (isAdmin || isOwner || isPending);
      return (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '8px', padding: '8px', border: `1px solid ${isPending ? '#faad14' : '#f0f0f0'}`, borderRadius: '4px', backgroundColor: isPending ? '#fffbe6' : '#fafafa' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Icon icon="famicons:document-attach" style={{ color: isPending ? '#faad14' : '#747474' }} />
              <Typography.Text ellipsis style={{ maxWidth: 150 }}>{file.name || file.file_name}</Typography.Text>
              {isPending
                ? <Tag color="warning" style={{ fontSize: 10, margin: 0 }}>uploading...</Tag>
                : file.uploaded_by_user_name && (
                  <Typography.Text type="secondary" style={{ fontSize: '10px' }}>({file.uploaded_by_user_name})</Typography.Text>
                )
              }
            </div>
            <Space>
              {!isPending && <Tooltip title="Preview"><Button icon={<EyeOutlined />} type="link" size="small" onClick={() => onPreview(i)} /></Tooltip>}
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

/* ── Upload field wrapper ── */
const DocUploadField = ({ label, files, setFiles, salesInputId, docType, category, onPreview, user, isAdmin, disabled = false }) => {
  const debounceTimerField = useRef(null);

  const handleBeforeUpload = async (file) => {
    if (!file) {
      message.error("No file selected");
      return false;
    }
    if (!salesInputId) {
      message.warning("Job ID missing - cannot upload document");
      return false;
    }
    if (!docType || !category) {
      message.error("Document type or category is missing");
      return false;
    }
    const tempId = `temp_${Date.now()}_${Math.random()}`;
    setFiles((prev) => [...prev, {
      pending: true,
      _tempId: tempId,
      _localFile: file,
      name: file.name,
      file_name: file.name,
      doc_type: docType,
      category,
      remarks: "",
      uploaded_by_user: user?.id,
      uploaded_by_user_name: user?.get_full_name || user?.first_name || "Me",
    }]);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("doc_type", docType);
      formData.append("category", category);
      const res = await apiClient.post(`/liner/sales-input/${salesInputId}/upload-document/`, formData, { headers: { "Content-Type": "multipart/form-data" } });
      if (res.data.status === "success") {
        const d = res.data.data;
        setFiles((prev) => prev.map((f) => f._tempId === tempId ? {
          id: d.id, name: d.file_name, file_name: d.file_name,
          url: d.file_url, file_url: d.file_url,
          doc_type: docType, category, remarks: "",
          uploaded_by_user: user?.id,
          uploaded_by_user_name: d.uploaded_by_user_name || "Me",
        } : f));
        message.success(`${file.name} uploaded successfully`);
      } else {
        setFiles((prev) => prev.filter((f) => f._tempId !== tempId));
        message.error(res.data.message || "Upload failed");
      }
    } catch (err) {
      setFiles((prev) => prev.filter((f) => f._tempId !== tempId));
      message.error(`Failed to upload ${file.name}`);
    }
    return false;
  };

  const handleRemarkChange = (index, value) => {
    if (!files?.[index]) return;
    const file = files[index];
    setFiles((prev) => prev.map((f, j) => (j === index ? { ...f, remarks: value } : f)));
    if (salesInputId && file.id && !file.pending) {
      if (debounceTimerField.current) clearTimeout(debounceTimerField.current);
      debounceTimerField.current = setTimeout(async () => {
        try { await apiClient.patch(`/liner/sales-input/${salesInputId}/update-document-remarks/`, { doc_id: file.id, remarks: value }); } catch (err) { console.error("Failed to sync remarks:", err); }
      }, 800);
    }
  };

  return (
    <div>
      <Upload multiple showUploadList={false} beforeUpload={handleBeforeUpload} disabled={disabled}>
        <Button size="small" icon={<UploadOutlined />} style={{ fontSize: 12 }} disabled={disabled}>{files.length === 0 ? `Upload ${label}` : "Add More"}</Button>
      </Upload>
      {files.length > 0 && (
        <FileChipList
          files={files}
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
          user={user}
          isAdmin={isAdmin}
          disabled={disabled}
        />
      )}
    </div>
  );
};

/* ── main page ── */
const CsDocumentsPage = ({ jobData: initialJob, user }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form] = Form.useForm();

  const { isAdmin, isCS } = computeUserRoles(user);
  const currentStage = String(initialJob?.current_stage || "4");
  const canEditBookingTechnical = isAdmin && isCS;
  const canEditBocAttachment = isCS;
  const canEditEtaFields = isCS;

  const [loading, setLoading]           = useState(false);
  const [open, setOpen]                 = useState({
    export: true, container: true, otherDetails: true, placement: true, booking: true, cnfDetails: true, documents: true, attachments: true, approvalStatus: true
  });

  /* File States */
  const [lpoFiles, setLpoFiles]                 = useState([]);
  const [invoiceFiles, setInvoiceFiles]         = useState([]);
  const [hblFiles, setHblFiles]                 = useState([]);
  const [facFiles, setFacFiles]                 = useState([]);
  const [edFiles, setEdFiles]                   = useState([]);
  const [preAlertFiles, setPreAlertFiles]       = useState([]);
  const [releaseOrderFiles, setReleaseOrderFiles] = useState([]);
  const [bocFiles, setBocFiles]                 = useState([]);
  const [haulageCostFiles, setHaulageCostFiles] = useState([]);
  const [haulierNoteFiles, setHaulierNoteFiles] = useState([]);
  const [loadListFiles, setLoadListFiles]       = useState([]);
  const [attachments, setAttachments]           = useState([]);
  const [executiveDocuments, setExecutiveDocuments] = useState([]);
  const [salesExecutiveFiles, setSalesExecutiveFiles] = useState([]);

  const [remarks, setRemarks]                   = useState([]);
  const [newRemark, setNewRemark]               = useState("");
  const [otherCharges, setOtherCharges]         = useState([]);
  const [otherChargesRemarks, setOtherChargesRemarks] = useState("");
  const otherChargesDisplay = otherCharges.length > 0
    ? otherCharges.join(", ")
    : otherChargesRemarks || "";
  const [csHodOptions, setCsHodOptions]         = useState([]);
  const [previewVisible, setPreviewVisible]     = useState(false);
  const [previewUrls, setPreviewUrls]           = useState([]);
  const [previewIndex, setPreviewIndex]         = useState(0);
  
  // Rejection Modal State
  const [rejectionModalVisible, setRejectionModalVisible] = useState(false);
  const [rejectionRemarks, setRejectionRemarks] = useState("");
  const [rejectionLoading, setRejectionLoading] = useState(false);
  const executiveDocs = useMemo(
    () =>
      (initialJob?.documents || [])
        .filter((d) => d.doc_type?.toLowerCase() === "sales executive")
        .sort((a, b) => {
          const aId = Number(a?.id);
          const bId = Number(b?.id);
          if (Number.isFinite(aId) && Number.isFinite(bId)) return aId - bId;
          if (Number.isFinite(aId)) return -1;
          if (Number.isFinite(bId)) return 1;
          return 0;
        }),
    [initialJob?.documents, initialJob?.name_of_executive]
  );
  
  const throttle = useRef(false);
  const isDocumentUploading = [
    releaseOrderFiles,
    bocFiles,
    haulageCostFiles,
    haulierNoteFiles,
    loadListFiles,
    lpoFiles,
    invoiceFiles,
    hblFiles,
    facFiles,
    edFiles,
    preAlertFiles,
    attachments,
  ].some((files) => (files || []).some((f) => f?.pending));

  const toggle = (key) => setOpen((p) => ({ ...p, [key]: !p[key] }));
  const history = [...(initialJob?.approval_history || [])].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  const ad = initialJob?.approval_details || {};

  /* Fetch CS HOD options */
  useEffect(() => {
    apiClient.get("/accounts/liner/admin/users/hods/").then((res) => {
      const data = res.data?.results ?? res.data ?? [];
      setCsHodOptions(data.map((item) => ({ value: item.id, label: item.get_full_name || item.email || `${item.first_name} ${item.last_name}` })));
    }).catch(() => {});
  }, []);

  /* Pre-fill logic */
  useEffect(() => {
    if (!initialJob) return;
    form.setFieldsValue(mapJobToFormValues(initialJob));
    const docs = partitionDocuments(initialJob.documents || [], initialJob.name_of_executive);
    setLpoFiles(docs.lpoFiles);
    setInvoiceFiles(docs.invoiceFiles);
    setHblFiles(docs.hblFiles);
    setFacFiles(docs.facFiles);
    setEdFiles(docs.edFiles);
    setPreAlertFiles(docs.preAlertFiles);
    setReleaseOrderFiles(docs.releaseOrderFiles);
    setBocFiles(docs.bocFiles);
    setHaulageCostFiles(docs.haulageCostFiles);
    setHaulierNoteFiles(docs.haulierNoteFiles);
    setLoadListFiles(docs.loadListFiles);
    setAttachments(docs.attachments);
    setExecutiveDocuments(docs.executiveDocuments || []);
    setSalesExecutiveFiles(docs.salesExecutiveFiles || []);
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

  const openPreview = (filesArray, idx) => {
    const urls = filesArray.map((f) => f.url || f.file_url).filter(Boolean);
    if (!urls.length) return;
    setPreviewUrls(urls);
    setPreviewIndex(Math.max(0, Math.min(idx, urls.length - 1)));
    setPreviewVisible(true);
  };

  /* ── Upload all pending (queued) files before save/approve/reject ── */
  const uploadAllPending = async () => {
    if (!id) {
      throw new Error("Job ID missing - cannot upload pending documents");
    }

    const uploadOne = async (file) => {
      if (!file || !file._localFile || !file.doc_type || !file.category) {
        throw new Error(`Missing file data for ${file?.name || file?.file_name || "unknown file"}`);
      }
      const formData = new FormData();
      formData.append("file", file._localFile);
      formData.append("doc_type", file.doc_type);
      formData.append("category", file.category);
      const res = await apiClient.post(`/liner/sales-input/${id}/upload-document/`, formData, { headers: { "Content-Type": "multipart/form-data" } });
      if (res.data.status === "success") {
        const d = res.data.data;
        return { id: d.id, name: d.file_name, file_name: d.file_name, url: d.file_url, file_url: d.file_url, doc_type: file.doc_type, category: file.category, remarks: file.remarks || "", uploaded_by_user: user?.id, uploaded_by_user_name: d.uploaded_by_user_name || "Me" };
      }
      throw new Error(res.data.message || "Upload failed");
    };

    const resolve = async (arr) =>
      Promise.all((arr || []).map((f) => (f?.pending ? uploadOne(f) : Promise.resolve(f))));

    const [newRO, newBoc, newHaulage, newLL, newLpo, newInv, newHbl, newFac, newEd, newPreAlert, newHN, newAttach] =
      await Promise.all([
        resolve(releaseOrderFiles), resolve(bocFiles),    resolve(haulageCostFiles),
        resolve(loadListFiles),     resolve(lpoFiles),    resolve(invoiceFiles),
        resolve(hblFiles),          resolve(facFiles),    resolve(edFiles),
        resolve(preAlertFiles),     resolve(haulierNoteFiles), resolve(attachments),
      ]);

    setReleaseOrderFiles(newRO); setBocFiles(newBoc);    setHaulageCostFiles(newHaulage);
    setLoadListFiles(newLL);     setLpoFiles(newLpo);    setInvoiceFiles(newInv);
    setHblFiles(newHbl);         setFacFiles(newFac);    setEdFiles(newEd);
    setPreAlertFiles(newPreAlert); setHaulierNoteFiles(newHN); setAttachments(newAttach);

    return { releaseOrderFiles: newRO, bocFiles: newBoc, haulageCostFiles: newHaulage,
             loadListFiles: newLL, lpoFiles: newLpo, invoiceFiles: newInv,
             hblFiles: newHbl, facFiles: newFac, edFiles: newEd,
             preAlertFiles: newPreAlert, haulierNoteFiles: newHN, attachments: newAttach };
  };

  const buildDocPayload = (d) => {
    const dm = (arr, docType, category) =>
      (arr || []).map((f) => ({ id: f.id, doc_type: docType, category, file_url: f.url || f.file_url, file_name: f.file_name || f.name, remarks: f.remarks || "" }));
    return [
      ...dm(d.releaseOrderFiles, "Release Order", "booking"),
      ...dm(d.bocFiles, "BOC", "booking"),
      ...dm(d.haulageCostFiles, "Haulage Cost", "booking"),
      ...dm(d.haulierNoteFiles, "Haulage Note", "booking"),
      ...dm(d.loadListFiles, "Load List", "booking"),
      ...dm(d.lpoFiles, "LPO", "financial"),
      ...dm(d.invoiceFiles, "Invoice", "financial"),
      ...dm(d.hblFiles, "HBL", "financial"),
      ...dm(d.facFiles, "FAC", "financial"),
      ...dm(d.edFiles, "ED", "financial"),
      ...dm(d.preAlertFiles, "PRE-ALERT", "financial"),
      ...(d.attachments || []).map(f => ({ ...f, doc_type: f.doc_type || "Attachment", category: f.category || "attachments" })),
    ];
  };
  const withExecutiveDocs = (resolved) => ({
    ...resolved,
    attachments: [...(resolved?.attachments || []), ...executiveDocs].filter((doc, idx, arr) => {
      if (!doc) return false;
      if (doc.id == null) return true;
      return idx === arr.findIndex((d) => d?.id === doc.id);
    }),
  });

  const handleAction = async (action) => {
    if (isDocumentUploading) {
      message.warning("Please wait until document upload is complete.");
      return;
    }
    if (action === "Rejected") {
      // Show rejection modal instead of directly rejecting
      setRejectionModalVisible(true);
      setRejectionRemarks("");
      return;
    }
    
    // For Approval - proceed normally
    if (throttle.current) return;
    const approvalRemarks = form.getFieldValue("approvalRemarks");
    const csHodValue = form.getFieldValue("cs_hod");

    if (action === "Approved") {
      const missing = [];
      if (!lpoFiles.length) missing.push("LPO");
      if (!invoiceFiles.length) missing.push("Invoice");
      if (!csHodValue) missing.push("CS HOD");
      if (missing.length) { message.error(`Required: ${missing.join(", ")}`); return; }
    }

    throttle.current = true;
    setLoading(true);
    try {
      const resolved = await uploadAllPending();

      const payload = {
        action,
        remarks: approvalRemarks,
        cs_hod: csHodValue ? String(csHodValue) : null,
        general_remarks: remarks,
        booking_vessel: form.getFieldValue("booking_vessel"),
        booking_voyage: form.getFieldValue("booking_voyage"),
        booking_ref_no: form.getFieldValue("booking_ref_no"),
        booking_remarks: form.getFieldValue("booking_remarks"),
        vsl_initial_eta: form.getFieldValue("vsl_initial_eta") ? form.getFieldValue("vsl_initial_eta").format("YYYY-MM-DD") : null,
        vsl_latest_eta: form.getFieldValue("vsl_latest_eta") ? form.getFieldValue("vsl_latest_eta").format("YYYY-MM-DD") : null,
        vsl_etd: form.getFieldValue("vsl_etd") ? form.getFieldValue("vsl_etd").format("YYYY-MM-DD") : null,
        pod_eta: form.getFieldValue("pod_eta") ? form.getFieldValue("pod_eta").format("YYYY-MM-DD") : null,
        documents: buildDocPayload(withExecutiveDocs(resolved)),
      };

      const endpoint = `/liner/sales-input/${id}/approve/`;
      const res = await apiClient.post(endpoint, payload);
      if (res.data.status === "success") { message.success(res.data.message || `${action} successfully`); setTimeout(() => navigate("/"), 1500); }
      else { message.error(res.data.message || "Action failed"); }
    } catch (err) { message.error(err.response?.data?.message || "Something went wrong"); }
    finally { throttle.current = false; setLoading(false); }
  };

  // Handle rejection confirmation from modal
  const handleConfirmRejection = async () => {
    if (isDocumentUploading) {
      message.warning("Please wait until document upload is complete.");
      return;
    }
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
    if (isDocumentUploading) {
      message.warning("Please wait until document upload is complete.");
      return;
    }
    if (throttle.current) return;
    throttle.current = true;
    setLoading(true);
    try {
      const resolved = await uploadAllPending();
      const payload = {
        general_remarks: remarks,
        cs_hod: form.getFieldValue("cs_hod") ? String(form.getFieldValue("cs_hod")) : null,
        booking_vessel: form.getFieldValue("booking_vessel"),
        booking_voyage: form.getFieldValue("booking_voyage"),
        booking_ref_no: form.getFieldValue("booking_ref_no"),
        booking_remarks: form.getFieldValue("booking_remarks"),
        vsl_initial_eta: form.getFieldValue("vsl_initial_eta") ? form.getFieldValue("vsl_initial_eta").format("YYYY-MM-DD") : null,
        vsl_latest_eta: form.getFieldValue("vsl_latest_eta") ? form.getFieldValue("vsl_latest_eta").format("YYYY-MM-DD") : null,
        vsl_etd: form.getFieldValue("vsl_etd") ? form.getFieldValue("vsl_etd").format("YYYY-MM-DD") : null,
        pod_eta: form.getFieldValue("pod_eta") ? form.getFieldValue("pod_eta").format("YYYY-MM-DD") : null,
        documents: buildDocPayload(withExecutiveDocs(resolved)),
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
          <Card className={Styles.card} bordered title={<CardHeader icon="basil:document-solid" title="EXPORT DETAILS" open={open.export} onToggle={() => toggle("export")} />}>
            <div style={{ display: open.export ? "block" : "none" }}>
              <div style={{ marginBottom: 12 }}><Tag color="success" icon={<CheckCircleOutlined />}>Sales HOD Approved</Tag></div>
              <Row gutter={[16, 8]}>
                <Col xs={24} md={6}><Form.Item className={Styles.formLabel} label="Export Number" name="export_number"><Input disabled variant="filled" /></Form.Item></Col>
                <Col xs={24} md={6}><Form.Item className={Styles.formLabel} label="Export Created Date" name="export_created_date"><Input disabled variant="filled" /></Form.Item></Col>
                <Col xs={24} md={6}><Form.Item className={Styles.formLabel} label="Customer Name" name="customer_name"><Input disabled variant="filled" /></Form.Item></Col>
                <Col xs={24} md={6}><Form.Item className={Styles.formLabel} label="Carrier Name" name="carrier_name"><Input disabled variant="filled" /></Form.Item></Col>
                {/* <Col xs={24} md={6}><Form.Item className={Styles.formLabel} label="Status"><Tag color="cyan" style={{ fontWeight: 'bold' }}>{(initialJob?.status || "DRAFT").toUpperCase()}</Tag></Form.Item></Col> */}
                <Col xs={24} md={6}><Form.Item className={Styles.formLabel} label="Contact PIC" name="contact_pic"><Input disabled variant="filled" /></Form.Item></Col>
                <Col xs={24} md={6}><Form.Item className={Styles.formLabel} label="Phone No" name="phone_no"><Input disabled variant="filled" /></Form.Item></Col>
                <Col xs={24} md={6}><Form.Item className={Styles.formLabel} label="Email" name="email"><Input disabled variant="filled" /></Form.Item></Col>
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

          {/* OTHER DETAILS */}
          <Card className={Styles.card} bordered title={<CardHeader icon="mingcute:ship-fill" title="OTHER DETAILS" open={open.otherDetails} onToggle={() => toggle("otherDetails")} />}>
            <div style={{ display: open.otherDetails ? "block" : "none" }}>
              <Row gutter={16}>
                <Col xs={24} md={6}><Form.Item className={Styles.formLabel} label="POL" name="port_of_loading"><Input disabled variant="filled" /></Form.Item></Col>
                <Col xs={24} md={6}><Form.Item className={Styles.formLabel} label="POD" name="port_of_discharge"><Input disabled variant="filled" /></Form.Item></Col>
                <Col xs={24} md={6}><Form.Item className={Styles.formLabel} label="FPOD" name="final_pod"><Input disabled variant="filled" /></Form.Item></Col>
                <Col xs={24} md={6}><Form.Item className={Styles.formLabel} label="Terms of Shipment" name="terms_of_shipment"><Input disabled variant="filled" /></Form.Item></Col>
                <Col xs={24} md={6}><Form.Item className={Styles.formLabel} label="Haulier Code" name="haulier_code"><Input disabled variant="filled" /></Form.Item></Col>
                <Col xs={24} md={12}><Form.Item className={Styles.formLabel} label="Special Instruction if Any" name="special_instructions"><TextArea disabled variant="filled" autoSize={{ minRows: 3, maxRows: 8 }} /></Form.Item></Col>
                {executiveDocs.length > 0 ? (
                  <Col xs={24} md={12}><Form.Item label="Executive Documents" className={Styles.formLabel}><FileChipList files={executiveDocs} disabled onPreview={(i) => openPreview(executiveDocs, i)} user={user} isAdmin={isAdmin} /></Form.Item></Col>
                ) : null}
                <Col xs={24} md={12}><Form.Item className={Styles.formLabel} label="Name of Executive" name="name_of_executive"><Input disabled variant="filled" /></Form.Item></Col>
              </Row>
              <Row gutter={16} style={{ marginTop: 8 }}>
                <Col xs={12} md={6}><Form.Item name="hbl" valuePropName="checked" noStyle><Checkbox disabled><span style={{ color: "rgba(0, 0, 0, 0.88)" }}>HBL</span></Checkbox></Form.Item></Col>
                <Col xs={12} md={6}><Form.Item name="fac" valuePropName="checked" noStyle><Checkbox disabled><span style={{ color: "rgba(0, 0, 0, 0.88)" }}>HCS</span></Checkbox></Form.Item></Col>
                <Col xs={12} md={6}><Form.Item name="documentation" valuePropName="checked" noStyle><Checkbox disabled><span style={{ color: "rgba(0, 0, 0, 0.88)" }}>Documentation</span></Checkbox></Form.Item></Col>
                <Col xs={12} md={6}><Form.Item name="transportation" valuePropName="checked" noStyle><Checkbox disabled><span style={{ color: "rgba(0, 0, 0, 0.88)" }}>Transportation</span></Checkbox></Form.Item></Col>
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

          {/* BOOKING DETAILS (TECHNICAL) */}
          <Card className={Styles.card} bordered title={<CardHeader icon="fluent:box-24-filled" title="BOOKING DETAILS (TECHNICAL DOCUMENTS)" open={open.booking} onToggle={() => toggle("booking")} />}>
            <div style={{ display: open.booking ? "block" : "none" }}>
              <Row gutter={[16, 8]}>
                <Col xs={24} md={6}><Form.Item className={Styles.formLabel} label="AFSYS Job No." name="afsys_job_no"><Input disabled={!canEditBookingTechnical} variant={canEditBookingTechnical ? "outlined" : "filled"} /></Form.Item></Col>
                <Col xs={24} md={6}><Form.Item className={Styles.formLabel} label="Booking Vessel" name="booking_vessel"><Input disabled={!canEditBookingTechnical} variant={canEditBookingTechnical ? "outlined" : "filled"} /></Form.Item></Col>
                <Col xs={24} md={6}><Form.Item className={Styles.formLabel} label="Booking Voyage" name="booking_voyage"><Input disabled={!canEditBookingTechnical} variant={canEditBookingTechnical ? "outlined" : "filled"} /></Form.Item></Col>
                <Col xs={24} md={6}><Form.Item className={Styles.formLabel} label="Vessel ETA Date" name="vessel_eta"><DatePicker style={{ width: "100%" }} disabled={!canEditBookingTechnical} format="DD-MM-YYYY" /></Form.Item></Col>
                <Col xs={24} md={6}><Form.Item className={Styles.formLabel} label="Initial ETA" name="vsl_initial_eta"><DatePicker style={{ width: "100%" }} disabled={!canEditBookingTechnical} format="DD-MM-YYYY" /></Form.Item></Col>
                <Col xs={24} md={6}><Form.Item className={Styles.formLabel} label="Latest ETA" name="vsl_latest_eta"><DatePicker style={{ width: "100%" }} disabled={!canEditEtaFields} format="DD-MM-YYYY" /></Form.Item></Col>
                <Col xs={24} md={6}><Form.Item className={Styles.formLabel} label="ETD" name="vsl_etd"><DatePicker style={{ width: "100%" }} disabled={!canEditEtaFields} format="DD-MM-YYYY" /></Form.Item></Col>
                <Col xs={24} md={6}><Form.Item className={Styles.formLabel} label="POD ETA" name="pod_eta"><DatePicker style={{ width: "100%" }} disabled={!canEditEtaFields} format="DD-MM-YYYY" /></Form.Item></Col>
                <Col xs={24} md={6}><Form.Item className={Styles.formLabel} label="Booking Reference No." name="booking_ref_no"><Input disabled={!canEditBookingTechnical} variant={canEditBookingTechnical ? "outlined" : "filled"} /></Form.Item></Col>
                <Col xs={24} md={6}><Form.Item className={Styles.formLabel} label="Load List Cut-Off Date & Time" name="ll_cut_off_datetime"><DatePicker showTime style={{ width: "100%" }} disabled={!canEditBookingTechnical} format="DD-MM-YYYY HH:mm" /></Form.Item></Col>
                <Col xs={24} md={6}><Form.Item className={Styles.formLabel} label="SI Cut-Off Date & Time" name="si_cut_off_date"><DatePicker showTime style={{ width: "100%" }} disabled={!canEditBookingTechnical} format="DD-MM-YYYY HH:mm" /></Form.Item></Col>
                <Col xs={24} md={24}><Form.Item className={Styles.formLabel} label="Booking Remarks" name="booking_remarks"><TextArea disabled={!canEditBookingTechnical} variant={canEditBookingTechnical ? "outlined" : "filled"} rows={2} /></Form.Item></Col>
              </Row>
              <Row gutter={[16, 16]} style={{ marginTop: 12 }}>
                <Col xs={24} md={12}><Form.Item label="Release Order(s)" className={Styles.formLabel}><DocUploadField label="Release Order" files={releaseOrderFiles} setFiles={setReleaseOrderFiles} salesInputId={id} docType="Release Order" category="booking" onPreview={openPreview} user={user} isAdmin={canEditBookingTechnical} disabled={!canEditBookingTechnical} /></Form.Item></Col>
                <Col xs={24} md={12}><Form.Item label="BOC Attachment" className={Styles.formLabel}><DocUploadField label="BOC" files={bocFiles} setFiles={setBocFiles} salesInputId={id} docType="BOC" category="booking" onPreview={openPreview} user={user} isAdmin={isAdmin} disabled={!canEditBocAttachment} /></Form.Item></Col>
              </Row>
            </div>
          </Card>

          {/* CNF DETAILS */}
          <Card className={Styles.card} bordered title={<CardHeader icon="mdi:file-document-multiple-outline" title="CNF DETAILS" open={open.cnfDetails} onToggle={() => toggle("cnfDetails")} />}>
            <div style={{ display: open.cnfDetails ? "block" : "none" }}>
              <Row gutter={[16, 16]}>
                {haulageCostFiles.length > 0 && <Col xs={24} md={12}><Form.Item label="Haulage Cost Sheet" className={Styles.formLabel}><FileChipList files={haulageCostFiles} disabled onPreview={(i) => openPreview(haulageCostFiles, i)} user={user} isAdmin={isAdmin} /></Form.Item></Col>}
                {haulierNoteFiles.length > 0 && <Col xs={24} md={12}><Form.Item label="Haulier Note" className={Styles.formLabel}><FileChipList files={haulierNoteFiles} disabled onPreview={(i) => openPreview(haulierNoteFiles, i)} user={user} isAdmin={isAdmin} /></Form.Item></Col>}
                {loadListFiles.length > 0 && <Col xs={24} md={12}><Form.Item label="Load List" className={Styles.formLabel}><FileChipList files={loadListFiles} disabled onPreview={(i) => openPreview(loadListFiles, i)} user={user} isAdmin={isAdmin} /></Form.Item></Col>}
                <Col xs={24} md={24}><Form.Item label="CNF Remarks" name="cnf_remarks" className={Styles.formLabel}><TextArea disabled variant="filled" rows={2} /></Form.Item></Col>
              </Row>
            </div>
          </Card>

          {/* DOCUMENTS (ACTIONABLE) */}
          <Card className={Styles.card} bordered title={<CardHeader icon="mdi:file-document-outline" title="DOCUMENTS" open={open.documents} onToggle={() => toggle("documents")} />}>
            <div style={{ display: open.documents ? "block" : "none" }}>
              <Row gutter={[16, 16]}>
                <Col xs={24} md={12}><Form.Item label={<span>LPO <span style={{ color: "#ff4d4f" }}>*</span></span>} className={Styles.formLabel}><DocUploadField label="LPO" files={lpoFiles} setFiles={setLpoFiles} salesInputId={id} docType="LPO" category="financial" onPreview={openPreview} user={user} isAdmin={isAdmin} /></Form.Item></Col>
                <Col xs={24} md={12}><Form.Item label={<span>INVOICE <span style={{ color: "#ff4d4f" }}>*</span></span>} className={Styles.formLabel}><DocUploadField label="Invoice" files={invoiceFiles} setFiles={setInvoiceFiles} salesInputId={id} docType="Invoice" category="financial" onPreview={openPreview} user={user} isAdmin={isAdmin} /></Form.Item></Col>
                <Col xs={24} md={12}><Form.Item label="HBL" className={Styles.formLabel}><DocUploadField label="HBL" files={hblFiles} setFiles={setHblFiles} salesInputId={id} docType="HBL" category="financial" onPreview={openPreview} user={user} isAdmin={isAdmin} /></Form.Item></Col>
                <Col xs={24} md={12}><Form.Item label={<span>CS HOD <span style={{ color: "#ff4d4f" }}>*</span></span>} name="cs_hod" className={Styles.formLabel} rules={[{ required: true, message: "Required" }]}><Select placeholder="Select CS HOD" options={csHodOptions} showSearch optionFilterProp="label" /></Form.Item></Col>
                <Col xs={24} md={12}><Form.Item label="HCS" className={Styles.formLabel}><DocUploadField label="HCS" files={facFiles} setFiles={setFacFiles} salesInputId={id} docType="FAC" category="financial" onPreview={openPreview} user={user} isAdmin={isAdmin} /></Form.Item></Col>
                <Col xs={24} md={12}><Form.Item label="ED" className={Styles.formLabel}><DocUploadField label="ED" files={edFiles} setFiles={setEdFiles} salesInputId={id} docType="ED" category="financial" onPreview={openPreview} user={user} isAdmin={isAdmin} /></Form.Item></Col>
                <Col xs={24} md={12}><Form.Item label="Pre-Alert" className={Styles.formLabel}><DocUploadField label="Pre-Alert" files={preAlertFiles} setFiles={setPreAlertFiles} salesInputId={id} docType="PRE-ALERT" category="financial" onPreview={openPreview} user={user} isAdmin={isAdmin} /></Form.Item></Col>
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
                  <TextArea value={newRemark} onChange={(e) => setNewRemark(e.target.value)} placeholder="Enter your remarks here…" rows={3} style={{ marginBottom: 12 }} />
                  <Button type="primary" onClick={() => { if (newRemark.trim()) { setRemarks(p => [...p, { text: newRemark.trim(), user_id: user?.id, user_name: user?.first_name || user?.name || "User", date: new Date().toISOString() }]); setNewRemark(""); } }} icon={<PlusOutlined />}>Add Remark</Button>
                </Col>
                <Col xs={24} md={12}><Typography.Text strong style={{ display: 'block', marginBottom: 8, fontSize: 13, color: '#4b5563' }}>GENERAL ATTACHMENTS</Typography.Text><DocUploadField label="Attachment" files={attachments} setFiles={setAttachments} salesInputId={id} category="attachments" docType="Attachment" onPreview={openPreview} user={user} isAdmin={isAdmin} /></Col>
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
                { title: "Status", dataIndex: "status", render: (s) => (<Tag color={STATUS_COLOR[s] || STATUS_COLOR[s?.toLowerCase()] || "default"} style={{ fontWeight: 'bold', fontSize: '13px', padding: '0 10px' }}>{s?.toUpperCase()}</Tag>) },
                { title: "Remarks", dataIndex: "remarks", render: (value) => (<span style={{ whiteSpace: "normal", wordBreak: "break-word" }}>{value || "N/A"}</span>) },
                { title: "Updated Date", dataIndex: "created_at", render: (d) => d ? dayjs(d).format("DD-MM-YYYY HH:mm") : "N/A" }
              ]} rowKey="id" pagination={false} size="small" scroll={{ x: 'max-content' }} />
              <div style={{ marginTop: 16, padding: 16, backgroundColor: "#fff", borderRadius: 12, border: "1px solid #e0e7ff", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
                <Typography.Text strong style={{ display: "block", marginBottom: 12, color: "#1f2937" }}>Approval Remarks</Typography.Text>
                <Form.Item name="approvalRemarks"><TextArea placeholder="Enter remarks for approval/rejection..." rows={3} style={{ borderRadius: 8 }} /></Form.Item>
              </div>
            </div>
          </Card>

          {/* ACTION BUTTONS (BOTTOM CENTER) */}
          <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'center', gap: 16, width: '100%', paddingBottom: '40px', flexWrap: 'wrap' }}>
            <Button
              size="large"
              onClick={handleSave}
              icon={<Icon icon="mdi:content-save-outline" />}
              loading={loading}
              disabled={isDocumentUploading || loading}
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
              disabled={isDocumentUploading || loading}
              style={{ borderRadius: 8, height: 48, padding: "0 40px", backgroundColor: "#10b981", borderColor: "#10b981", fontSize: 16, fontWeight: '600' }}
            >
              Submit Documents & Approve
            </Button>
            <Button
              danger
              size="large"
              onClick={() => handleAction("Rejected")}
              icon={<Icon icon="mdi:close-circle" />}
              loading={rejectionLoading}
              disabled={isDocumentUploading || rejectionLoading}
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
        </Form>
      </Spin>
      <Modal open={previewVisible} footer={null} title="Document Preview" onCancel={() => setPreviewVisible(false)} width="90%" style={{ top: 20 }} styles={{ body: { height: "87vh", padding: 0 } }} destroyOnHide>
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
const CsDocuments = () => (
  <ProtectedApprovalRoute routeKey="cs-documents">
    {({ jobData, user }) => <CsDocumentsPage jobData={jobData} user={user} />}
  </ProtectedApprovalRoute>
);

export default CsDocuments;
