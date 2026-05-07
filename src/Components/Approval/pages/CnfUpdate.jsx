import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import {
  Card, Row, Col, Typography, Tag, Table, Button,
  Input, Space, Spin, Modal, message, Tooltip, Form, Upload, Checkbox, DatePicker, Select
} from "antd";
import { Icon } from "@iconify/react";
import {
  EyeOutlined,
  UploadOutlined, DeleteOutlined, PlusOutlined
} from "@ant-design/icons";
import dayjs from "dayjs";
import ProtectedApprovalRoute from "../ProtectedApprovalRoute";
import MultiFileViewer from "../../Viewer/MultiFileViewer";
import apiClient from "../../../api/apiclient";
import { mapJobToFormValues, partitionDocuments } from "../utils/formMapper";
import { buildCommonPayload } from "../utils/payloadBuilders";
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
            <div style={{ display: "flex", alignItems: 'center', gap: 4 }}>
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
const DocUploadField = ({ label, files, setFiles, color = "purple", onPreview, salesInputId, docType, category, user, isAdmin, disabled = false, restrictionMessage = null }) => {
  const debounceTimerField = useRef(null);

  const handleBeforeUpload = async (file) => {
    if (restrictionMessage) { message.error(restrictionMessage); return false; }
    const tempId = `temp_${Date.now()}_${Math.random()}`;
    setFiles((prev) => [...prev, {
      pending: true,
      _tempId: tempId,
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
    // For pending files just update state; for uploaded files also debounce-sync
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
      <Upload multiple showUploadList={false} beforeUpload={handleBeforeUpload}>
        <Button size="small" icon={<UploadOutlined />} style={{ fontSize: 12 }} disabled={disabled}>{files.length === 0 ? `Upload ${label}` : "Add More"}</Button>
      </Upload>
      {disabled && restrictionMessage && <Typography.Text type="secondary" style={{ display: "block", marginTop: 4, fontSize: 12 }}>{restrictionMessage}</Typography.Text>}
      {files.length > 0 && (
        <FileChipList
          files={files}
          color={color}
          onRemove={(i) => {
            const f = files[i];
            if (f?.id && !f.pending) {
              setFiles((p) => p.filter((ff) => ff.id !== f.id));
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
  );
};

/* ── main page ── */
const CnfUpdatePage = ({ jobData: initialJob, user }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form] = Form.useForm();

  const currentStage = String(initialJob?.current_stage || "2");
  const isStage3     = currentStage === "3";
  const isStage2or3  = currentStage === "2" || currentStage === "3";
  const isForwarding = initialJob?.job_type === "FORWARDING";
  const isAdmin      = user?.is_superuser || user?.roles?.some(r => r.name === "admin");
  // const isCNF        = user?.roles?.some(r => r.name?.toLowerCase().includes("cnf"));
  const canUpdateTransportation = isAdmin;

  const [loading, setLoading]                   = useState(false);
  const [open, setOpen] = useState({
    export: true,
    container: true,
    otherDetails: true,
    placement: true,
    booking: true,
    documentation: true,
    attachments: true,
    approvalStatus: true,
  });

  const [releaseOrderFiles, setReleaseOrderFiles] = useState([]);
  const [bocFiles, setBocFiles]                   = useState([]);
  const [haulageCostFiles, setHaulageCostFiles]   = useState([]);
  const [haulierNoteFiles, setHaulierNoteFiles]   = useState([]);
  const [loadListFiles, setLoadListFiles]         = useState([]);
  const [lpoFiles, setLpoFiles]                   = useState([]);
  const [invoiceFiles, setInvoiceFiles]           = useState([]);
  const [facFiles, setFacFiles]                   = useState([]);
  const [croFiles, setCroFiles]                   = useState([]);
  const [edFiles, setEdFiles]                     = useState([]);
  const [hblFiles, setHblFiles]                   = useState([]);
  const [preAlertFiles, setPreAlertFiles]         = useState([]);
  const [bankSlips, setBankSlips]                 = useState([]);
  const [attachments, setAttachments]             = useState([]);
  const [remarks, setRemarks]                   = useState([]);
  const [newRemark, setNewRemark]               = useState("");
  const [otherCharges, setOtherCharges]         = useState([]);
  const [otherChargesRemarks, setOtherChargesRemarks] = useState("");

  const [previewVisible, setPreviewVisible]     = useState(false);
  const [previewUrls, setPreviewUrls]           = useState([]);
  const [previewIndex, setPreviewIndex]         = useState(0);
  
  const [rejectionModalVisible, setRejectionModalVisible] = useState(false);
  const [rejectionRemarks, setRejectionRemarks] = useState("");
  const [rejectionLoading, setRejectionLoading] = useState(false);
  
  const throttle = useRef(false);

  const history = [...(initialJob?.approval_history || [])].sort(
    (a, b) => new Date(a.created_at) - new Date(b.created_at)
  );
  const ad = initialJob?.approval_details || {};

  const toggle = (key) => setOpen((p) => ({ ...p, [key]: !p[key] }));

  /* Pre-fill documents from existing job data */
  useEffect(() => {
    if (!initialJob) return;
    form.setFieldsValue(mapJobToFormValues(initialJob));
    
    if (initialJob.documents) {
      const docs = partitionDocuments(initialJob.documents, initialJob.name_of_executive);
      setReleaseOrderFiles(docs.releaseOrderFiles);
      setBocFiles(docs.bocFiles);
      setHaulageCostFiles(docs.haulageCostFiles);
      setHaulierNoteFiles(docs.haulierNoteFiles);
      setLoadListFiles(docs.loadListFiles);
      setLpoFiles(docs.lpoFiles);
      setInvoiceFiles(docs.invoiceFiles);
      setFacFiles(docs.facFiles);
      setCroFiles(docs.croFiles);
      setEdFiles(docs.edFiles);
      setHblFiles(docs.hblFiles);
      setPreAlertFiles(docs.preAlertFiles);
      setBankSlips(docs.bankSlips);
      setAttachments(docs.attachments);
    }
    
    // Try to get other_charges from approval_details, then fall back to ad.other_charges or empty array
    const charges = initialJob.approval_details?.other_charges || ad?.other_charges || [];
    setOtherCharges(charges);
    setOtherChargesRemarks(initialJob.approval_details?.other_charges_remarks || ad?.other_charges_remarks || "");
    setRemarks(initialJob.general_remarks || []);
    
    form.setFieldsValue({
      cnf_remarks: ad.cnf_remarks,
      haulier_code: initialJob.haulier_code,
      booking_remarks: ad.booking_remarks,
      afsys_job_no: ad.afsys_job_no,
      booking_vessel: ad.booking_vessel,
      booking_voyage: ad.booking_voyage,
      booking_ref_no: ad.booking_ref_no,
      other_charges_remarks: ad.other_charges_remarks || "",
      vessel_eta: ad.vessel_eta ? dayjs(ad.vessel_eta) : null,
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
    const filesWithMime = filesArray.map((file) => {
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
    if (!filesWithMime.length) return;
    setPreviewUrls(filesWithMime);
    setPreviewIndex(Math.max(0, Math.min(idx, filesWithMime.length - 1)));
    setPreviewVisible(true);
  };

  /* ── Upload all pending (queued) files before save/approve/reject ── */
  const uploadAllPending = async () => {
    const uploadOne = async (file) => {
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
      Promise.all(arr.map((f) => (f.pending ? uploadOne(f) : Promise.resolve(f))));

    const [
      newRO, newBoc, newHaulage, newLL, newLpo, newInv, newFac,
      newCro, newEd, newHN, newPreAlert, newBankSlips, newAttach, newHbl,
    ] = await Promise.all([
      resolve(releaseOrderFiles), resolve(bocFiles), resolve(haulageCostFiles),
      resolve(loadListFiles),     resolve(lpoFiles),  resolve(invoiceFiles),
      resolve(facFiles),          resolve(croFiles),  resolve(edFiles),
      resolve(haulierNoteFiles),  resolve(preAlertFiles), resolve(bankSlips),
      resolve(attachments),       resolve(hblFiles),
    ]);

    // Sync state so chips update
    setReleaseOrderFiles(newRO); setBocFiles(newBoc); setHaulageCostFiles(newHaulage);
    setLoadListFiles(newLL);     setLpoFiles(newLpo); setInvoiceFiles(newInv);
    setFacFiles(newFac);         setCroFiles(newCro); setEdFiles(newEd);
    setHaulierNoteFiles(newHN);  setPreAlertFiles(newPreAlert); setBankSlips(newBankSlips);
    setAttachments(newAttach);   setHblFiles(newHbl);

    return {
      releaseOrderFiles: newRO, bocFiles: newBoc, haulageCostFiles: newHaulage,
      loadListFiles: newLL,     lpoFiles: newLpo,  invoiceFiles: newInv,
      facFiles: newFac,         croFiles: newCro,  edFiles: newEd,
      haulierNoteFiles: newHN,  preAlertFiles: newPreAlert, bankSlips: newBankSlips,
      attachments: newAttach,   hblFiles: newHbl,
    };
  };

  const handleAction = async (action) => {
    // Show rejection modal instead of direct rejection
    if (action === "Rejected") {
      setRejectionRemarks("");
      setRejectionModalVisible(true);
      return;
    }

    if (throttle.current) return;
    const approvalRemarks = form.getFieldValue("approvalRemarks");

    // Stage 3 requires mandatory docs
    if (action === "Approved" && isStage3) {
      const missing = [];
      if (!haulierNoteFiles.length) missing.push("Haulier Note");
      if (!loadListFiles.length)    missing.push("Load List");
      if (missing.length) {
        message.error(`Please upload required CNF documents: ${missing.join(", ")}`);
        return;
      }
    }

    throttle.current = true;
    setLoading(true);
    try {
      const values = action === "Rejected" ? form.getFieldsValue() : await form.validateFields();
      const resolvedDocs = await uploadAllPending();
      const payload = {
        ...buildCommonPayload(
          values,
          resolvedDocs,
          { remarks, otherCharges, jobData: initialJob, includeApprovalDetails: true }
        ),
        action,
        remarks: approvalRemarks,
      };

      const endpoint = action === "Approved"
        ? `/liner/sales-input/${id}/approve/`
        : `/liner/sales-input/${id}/reject/`;

      const res = await apiClient.post(endpoint, payload);
      if (res.data.status === "success") {
        message.success(res.data.message || `${action} successfully`);
        setTimeout(() => navigate("/"), 1500);
      } else {
        message.error(res.data.message || "Action failed");
      }
    } catch (err) {
      message.error(err.response?.data?.message || "Something went wrong");
    } finally {
      throttle.current = false;
      setLoading(false);
    }
  };

  const handleConfirmRejection = async () => {
    if (!rejectionRemarks.trim()) {
      message.warning("Please enter rejection remarks");
      return;
    }

    if (throttle.current) return;
    throttle.current = true;
    setRejectionLoading(true);
    try {
      const payload = { remarks: rejectionRemarks.trim() };
      const res = await apiClient.post(`/liner/sales-input/${id}/reject/`, payload);
      if (res.data.status === "success") {
        message.success(res.data.message || "Job rejected successfully");
        setRejectionModalVisible(false);
        setTimeout(() => navigate("/"), 1500);
      } else {
        message.error(res.data.message || "Rejection failed");
      }
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
      await uploadAllPending();

      if (canUpdateTransportation) {
        const values = form.getFieldsValue();
        const payload = buildCommonPayload(
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
            attachments,
            hblFiles,
          },
          { remarks, otherCharges, jobData: initialJob, includeApprovalDetails: false }
        );

        await apiClient.patch(`/liner/sales-input/${id}/`, payload);
      }
      
      message.success("Saved successfully");
    } catch (err) {
      console.error("Save error:", err);
      const errorMsg = typeof err.response?.data?.message === "string" ? err.response?.data?.message : "Failed to save";
      message.error(errorMsg);
    } finally {
      throttle.current = false;
      setLoading(false);
    }
  };

  const historyColumns = [
    { title: "Stage", dataIndex: "stage", key: "stage" },
    { title: "Pending With", dataIndex: "pending_with", key: "pending_with", render: (pw) => pw || "N/A" },
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
        <Tag color={STATUS_COLOR[s] || STATUS_COLOR[s?.toLowerCase()] || "default"} style={{ fontWeight: 'bold', fontSize: '13px', padding: '0 10px' }}>
          {s?.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: "Remarks",
      dataIndex: "remarks",
      key: "remarks",
      render: (value) => (
        <span style={{ whiteSpace: "normal", wordBreak: "break-word" }}>
          {value || "N/A"}
        </span>
      ),
    },
    {
      title: "Updated Date",
      dataIndex: "created_at",
      key: "created_at",
      render: (d) => d ? dayjs(d).format("DD-MM-YYYY HH:mm") : "N/A"
    }
  ];

  return (
    <div style={{ padding: "10px 20px 20px 20px", backgroundColor: "#eff8ff", minHeight: "100vh" }}>
      <Spin spinning={loading}>
        <Form form={form} layout="vertical">
          
          {/* ════════ EXPORT DETAILS (HEADER) ════════ */}
          <Card
            className={Styles.card}
            bordered
            title={<CardHeader icon="basil:document-solid" title="EXPORT DETAILS" open={open.export} onToggle={() => toggle("export")} />}
          >
            <div style={{ display: open.export ? "block" : "none" }}>
              <Row gutter={[16, 8]}>
                <Col xs={24} md={6}><Form.Item className={Styles.formLabel} label="Export Number" name="export_number"><Input disabled variant="filled" /></Form.Item></Col>
                <Col xs={24} md={6}><Form.Item className={Styles.formLabel} label="Export Created Date" name="export_created_date"><Input disabled variant="filled" /></Form.Item></Col>
                <Col xs={24} md={6}><Form.Item className={Styles.formLabel} label="Customer Name" name="customer_name"><Input disabled variant="filled" /></Form.Item></Col>
                <Col xs={24} md={6}><Form.Item className={Styles.formLabel} label="Carrier Name" name="carrier_name"><Input disabled variant="filled" /></Form.Item></Col>
                {/* <Col xs={24} md={6}>
                  <Form.Item className={Styles.formLabel} label="Status">
                    <Tag color={STATUS_COLOR[initialJob?.status] || STATUS_COLOR[initialJob?.status?.toLowerCase()] || "cyan"} style={{ fontWeight: 'bold', fontSize: '13px', padding: '0 10px' }}>{(initialJob?.status || "DRAFT").toUpperCase()}</Tag>
                  </Form.Item>
                </Col> */}
                <Col xs={24} md={6}><Form.Item className={Styles.formLabel} label="Contact PIC" name="contact_pic"><Input disabled variant="filled" /></Form.Item></Col>
                <Col xs={24} md={6}><Form.Item className={Styles.formLabel} label="Contact Details" name="phone_no"><Input disabled variant="filled" /></Form.Item></Col>
                <Col xs={24} md={6}><Form.Item className={Styles.formLabel} label="Commodity" name="commodity"><Input disabled variant="filled" /></Form.Item></Col>
                {isForwarding && <Col xs={24} md={6}><Form.Item className={Styles.formLabel} label="Overseas Agent Name" name="overseas_agent_name"><Input disabled variant="filled" /></Form.Item></Col>}
                <Col xs={24} md={6}><Form.Item className={Styles.formLabel} label="Export Created By" name="created_by_name"><Input disabled variant="filled" /></Form.Item></Col>
              </Row>
            </div>
          </Card>

          {/* ════════ CONTAINER DETAILS ════════ */}
          <Card
            className={Styles.card}
            bordered
            title={<CardHeader icon="octicon:container-24" title="CONTAINER DETAILS" open={open.container} onToggle={() => toggle("container")} />}
          >
            <div style={{ display: open.container ? "block" : "none" }}>
              <Form.List name="containerRows">
                {(fields) => (
                  fields.map(({ key, name, ...rest }) => (
                    <Row gutter={16} key={key} align="middle">
                      <Col xs={24} md={5}><Form.Item className={Styles.formLabel} {...rest} name={[name, "equipment_type"]} label="Equipment Type"><EquipmentTypeSelect disabled /></Form.Item></Col>
                      <Col xs={24} md={4}><Form.Item className={Styles.formLabel} {...rest} name={[name, "quantity"]} label="Qty"><Input disabled variant="filled" /></Form.Item></Col>
                      <Col xs={24} md={5}><Form.Item className={Styles.formLabel} {...rest} name={[name, "category"]} label="Category"><CategorySelect disabled /></Form.Item></Col>
                      <Col xs={24} md={5}><Form.Item className={Styles.formLabel} {...rest} name={[name, "quote"]} label="Quote"><TextArea disabled variant="filled" autoSize={{ minRows: 1 }} /></Form.Item></Col>
                      <Col xs={24} md={5}><Form.Item className={Styles.formLabel} {...rest} name={[name, "cost"]} label="Cost"><TextArea disabled variant="filled" autoSize={{ minRows: 1 }} /></Form.Item></Col>
                    </Row>
                  ))
                )}
              </Form.List>
              <Row gutter={16} style={{ marginTop: 8 }}>
                <Col xs={24}>
                  <Form.Item className={Styles.formLabel} label="Other Charges">
                    <div className={Styles.chipBox} style={{ border: '1px solid #d9d9d9', borderRadius: '4px', padding: '4px 11px', backgroundColor: '#f5f5f5', minHeight: 32 }}>
                      <Space wrap>
                        {otherCharges.map((c, i) => (<Tag key={i} color="cyan">{c}</Tag>))}
                        {otherCharges.length === 0 && otherChargesRemarks && <span style={{ color: '#666', fontSize: 12 }}>{otherChargesRemarks}</span>}
                        {otherCharges.length === 0 && !otherChargesRemarks && <span style={{ color: '#bfbfbf', fontSize: 12 }}>No other charges</span>}
                      </Space>
                    </div>
                  </Form.Item>
                </Col>
              </Row>
            </div>
          </Card>

          {/* ════════ OTHER DETAILS (POL/POD etc) ════════ */}
          <Card
            className={Styles.card}
            bordered
            title={<CardHeader icon="mingcute:ship-fill" title="OTHER DETAILS" open={open.otherDetails} onToggle={() => toggle("otherDetails")} />}
          >
            <div style={{ display: open.otherDetails ? "block" : "none" }}>
              <Row gutter={16}>
                <Col xs={24} md={6}><Form.Item className={Styles.formLabel} label="POL" name="port_of_loading"><Input disabled variant="filled" /></Form.Item></Col>
                <Col xs={24} md={6}><Form.Item className={Styles.formLabel} label="POD" name="port_of_discharge"><Input disabled variant="filled" /></Form.Item></Col>
                <Col xs={24} md={6}><Form.Item className={Styles.formLabel} label="FPOD" name="final_pod"><Input disabled variant="filled" /></Form.Item></Col>
                <Col xs={24} md={6}><Form.Item className={Styles.formLabel} label="Terms of Shipment" name="terms_of_shipment"><Input disabled variant="filled" /></Form.Item></Col>
                <Col xs={24} md={6}>
                  <Form.Item label="Haulier Code" name="haulier_code" className={Styles.formLabel}>
                    <Input placeholder="Haulier Code" disabled={!(isForwarding && currentStage === "3")} />
                  </Form.Item>
                </Col>
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

          {/* ════════ PLACEMENT DETAILS ════════ */}
          {form.getFieldValue("transportation") && (
          <Card
            className={Styles.card}
            bordered
            title={<CardHeader icon="hugeicons:delivery-truck-02" title="PLACEMENT DETAILS" open={open.placement} onToggle={() => toggle("placement")} />}
          >
            <div style={{ display: open.placement ? "block" : "none" }}>
              <Form.List name="placementRows">
                {(fields, { add, remove }) => (
                  <>
                    {fields.map(({ key, name, ...restField }) => (
                      <Row key={key} gutter={16} align="middle" style={{ marginBottom: '16px' }}>
                        <Col xs={24} md={4}><Form.Item {...restField} name={[name, "equipment_type"]} label="Equip Type"><EquipmentTypeSelect disabled={!canUpdateTransportation} /></Form.Item></Col>
                        <Col xs={24} md={4}><Form.Item {...restField} name={[name, "no_of_containers"]} label="Vol"><Input disabled={!canUpdateTransportation} variant={canUpdateTransportation ? "outlined" : "filled"} /></Form.Item></Col>
                        <Col xs={24} md={4}><Form.Item {...restField} name={[name, "category"]} label="Category"><CategorySelect disabled={!canUpdateTransportation} /></Form.Item></Col>
                        <Col xs={24} md={4}><Form.Item {...restField} name={[name, "placement_time"]} label="Date/Time"><DatePicker showTime format="DD-MM-YYYY HH:mm" disabled={!canUpdateTransportation} /></Form.Item></Col>
                        <Col xs={24} md={4}><Form.Item {...restField} name={[name, "pickup_location"]} label="Pickup/Delivery"><Input disabled={!canUpdateTransportation} variant={canUpdateTransportation ? "outlined" : "filled"} /></Form.Item></Col>
                        <Col xs={24} md={canUpdateTransportation ? 3 : 4}><Form.Item {...restField} name={[name, "special_remarks"]} label="Remarks"><TextArea disabled={!canUpdateTransportation} variant={canUpdateTransportation ? "outlined" : "filled"} autoSize={{ minRows: 1 }} /></Form.Item></Col>
                        {canUpdateTransportation && (
                          <Col xs={24} md={1} style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: '0px' }}>
                            <Button
                              type="text"
                              danger
                              icon={<DeleteOutlined />}
                              onClick={() => remove(name)}
                              size="small"
                            />
                          </Col>
                        )}
                      </Row>
                    ))}
                    {canUpdateTransportation && (
                      <Button
                        type="dashed"
                        onClick={() => add()}
                        icon={<PlusOutlined />}
                        style={{ marginTop: '16px' }}
                      >
                        Add Placement Row
                      </Button>
                    )}
                  </>
                )}
              </Form.List>
            </div>
          </Card>
          )}

          {/* ════════ BOOKING DETAILS (Filled by CS) ════════ */}
          <Card
            className={Styles.card}
            bordered
            title={<CardHeader icon="fluent:box-24-filled" title="BOOKING DETAILS (Filled by CS)" open={open.booking} onToggle={() => toggle("booking")} />}
          >
            <div style={{ display: open.booking ? "block" : "none" }}>
              <Row gutter={[16, 16]}>
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
                <Col xs={24} md={12}><Form.Item label="Release Order(s)" className={Styles.formLabel}><FileChipList files={releaseOrderFiles} onPreview={(i) => openPreview(releaseOrderFiles, i)} user={user} isAdmin={isAdmin} disabled /></Form.Item></Col>
                <Col xs={24} md={12}><Form.Item label="BOC Attachment" className={Styles.formLabel}><FileChipList files={bocFiles} onPreview={(i) => openPreview(bocFiles, i)} user={user} isAdmin={isAdmin} disabled /></Form.Item></Col>
              </Row>
            </div>
          </Card>

          {/* ════════ CNF DOCUMENTATION ════════ */}
          <Card
            className={Styles.card}
            bordered
            title={<CardHeader icon="mdi:file-document-multiple-outline" title="CNF DOCUMENTATION" open={open.documentation} onToggle={() => toggle("documentation")} />}
          >
            <div style={{ display: open.documentation ? "block" : "none" }}>
              {isStage3 && (
                <div style={{ marginBottom: 16 }}>
                  <Tag color="error" icon={<Icon icon="mdi:alert-circle" />}>Stage 3 — Required Uploads</Tag>
                </div>
              )}
              <Row gutter={[16, 16]}>
                <Col xs={24} md={12}>
                  <Form.Item label="Haulage Cost Sheet" className={Styles.formLabel}>
                    <DocUploadField label="Haulage Cost" files={haulageCostFiles} setFiles={setHaulageCostFiles} color="orange" onPreview={openPreview} salesInputId={id} docType="Haulage Cost" category="booking" user={user} isAdmin={isAdmin} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item label={<span>Haulier Note {isStage3 && <span style={{ color: "#ff4d4f" }}>*</span>}</span>} className={Styles.formLabel}>
                    <DocUploadField label="Haulier Note" files={haulierNoteFiles} setFiles={setHaulierNoteFiles} color="geekblue" onPreview={openPreview} salesInputId={id} docType="Haulage Note" category="booking" user={user} isAdmin={isAdmin} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item label={<span>Load List {isStage3 && <span style={{ color: "#ff4d4f" }}>*</span>}</span>} className={Styles.formLabel}>
                    <DocUploadField label="Load List" files={loadListFiles} setFiles={setLoadListFiles} color="gold" onPreview={openPreview} salesInputId={id} docType="Load List" category="booking" user={user} isAdmin={isAdmin} disabled={currentStage === "2"} restrictionMessage={currentStage === "2" ? "Disabled until Sales & HOD approval is completed." : null} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item label="ED" className={Styles.formLabel}>
                    <DocUploadField label="ED" files={edFiles} setFiles={setEdFiles} color="geekblue" onPreview={openPreview} salesInputId={id} docType="ED" category="financial" user={user} isAdmin={isAdmin} />
                  </Form.Item>
                </Col>
                <Col xs={24}>
                  <Form.Item label="CNF Remarks" name="cnf_remarks" className={Styles.formLabel}>
                    <TextArea placeholder="Enter CNF specific remarks here..." rows={3} />
                  </Form.Item>
                </Col>
              </Row>
            </div>
          </Card>

          {/* ════════ ATTACHMENTS AND COMMENTS ════════ */}
          <Card
            className={Styles.card}
            bordered
            title={<CardHeader icon="mdi:comment-text-multiple-outline" title="ATTACHMENTS AND COMMENTS" open={open.attachments} onToggle={() => toggle("attachments")} />}
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
                  <Typography.Text strong style={{ display: 'block', marginBottom: 8, fontSize: 13, color: '#4b5563' }}>GENERAL ATTACHMENTS</Typography.Text>
                  <DocUploadField label="Attachment" files={attachments} setFiles={setAttachments} color="blue" onPreview={openPreview} salesInputId={id} category="attachments" docType="Attachment" user={user} isAdmin={isAdmin} />
                </Col>
              </Row>
            </div>
          </Card>

          {/* ════════ APPROVAL STATUS (HISTORY) ════════ */}
          <Card
            className={Styles.card}
            bordered
            title={<CardHeader icon="mdi:check-decagram-outline" title="APPROVAL STATUS & HISTORY" open={open.approvalStatus} onToggle={() => toggle("approvalStatus")} />}
          >
            <div style={{ display: open.approvalStatus ? "block" : "none" }}>
              <Table dataSource={history} columns={historyColumns} rowKey="id" pagination={false} size="small" scroll={{ x: 'max-content' }} />
              <div style={{ marginTop: 16, padding: 16, backgroundColor: "#fff", borderRadius: 12, border: "1px solid #e0e7ff", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
                <Typography.Text strong style={{ display: "block", marginBottom: 12, color: "#1f2937" }}>Approval Remarks</Typography.Text>
                <Form.Item name="approvalRemarks"><TextArea placeholder="Enter remarks for approval/rejection..." rows={3} style={{ borderRadius: 8 }} /></Form.Item>
              </div>
            </div>
          </Card>

          {/* ACTION BUTTONS (BOTTOM CENTER) */}
          <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'center', gap: 24, width: '100%', paddingBottom: '40px', flexWrap: 'wrap', alignItems: 'center' }}>
            {isStage3 ? (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 16, width: '100%', flexWrap: 'wrap', alignItems: 'center' }}>
                <Button
                  type="primary"
                  size="large"
                  onClick={() => handleAction("Approved")}
                  icon={<Icon icon="mdi:check-circle" />}
                  loading={loading}
                  style={{ borderRadius: 8, height: 48, padding: "0 40px", backgroundColor: "#10b981", borderColor: "#10b981", fontSize: 16, fontWeight: '600' }}
                >
                  Submit & Verify (CNF)
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
                <Button
                  size="large"
                  onClick={handleSave}
                  icon={<Icon icon="mdi:content-save-outline" />}
                  loading={loading}
                  style={{ borderRadius: 8, height: 48, padding: "0 40px", fontSize: 16, fontWeight: '600', color: '#1677ff', borderColor: '#1677ff' }}
                >
                  Save
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
            ) : (
              <>
                <div style={{ width: '100%', borderTop: '1px solid #f0f0f0', paddingTop: '16px', display: 'flex', justifyContent: 'center', gap: 16 }}>
                  <Button
                    size="large"
                    onClick={handleSave}
                    icon={<Icon icon="mdi:content-save-outline" />}
                    loading={loading}
                    style={{ borderRadius: 8, height: 48, padding: "0 40px", fontSize: 16, fontWeight: '600', color: '#1677ff', borderColor: '#1677ff' }}
                  >
                    Save
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
              </>
            )}
          </div>
        </Form>
      </Spin>

      {/* ── Preview Modal ── */}
      <Modal open={previewVisible} footer={null} title="Document Preview" onCancel={() => setPreviewVisible(false)} width="90%" style={{ top: 20 }} styles={{ body: { height: "87vh", padding: 0 } }} destroyOnHide>
        {previewVisible && previewUrls.length > 0 && (
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
            placeholder="Enter rejection reason (e.g., 'Missing HBL document', 'Invalid port codes', etc.)"
            value={rejectionRemarks}
            onChange={(e) => setRejectionRemarks(e.target.value)}
            style={{ borderRadius: 4 }}
          />
          <p style={{ fontSize: 12, color: "#666", marginTop: 8 }}>This reason will be visible to the CNF team for corrections.</p>
        </div>
      </Modal>
    </div>
  );
};

/* ── wrap with guard ── */
const CnfUpdate = () => (
  <ProtectedApprovalRoute routeKey="cnf-update">
    {({ jobData, user }) => <CnfUpdatePage jobData={jobData} user={user} />}
  </ProtectedApprovalRoute>
);

export default CnfUpdate;
