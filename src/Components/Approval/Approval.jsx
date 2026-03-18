import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { useSelector } from "react-redux";
import {
  Form,
  Input,
  Select,
  DatePicker,
  TimePicker,
  Button,
  Table,
  Upload,
  Tag,
  Space,
  Row,
  Col,
  Typography,
  Card,
  Badge,
  Checkbox,
  message,
  Modal,
  Spin,
} from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  UploadOutlined,
  PaperClipOutlined,
  EyeOutlined,
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
const FileChipList = ({ files, color = "blue", onRemove, onPreview, disabled }) => {
  const visible = files.slice(0, VISIBLE_LIMIT);
  const hidden = files.slice(VISIBLE_LIMIT);

  return (
    <Space wrap style={{ marginTop: 6, marginBottom: 4, flexWrap: "wrap" }}>
      {visible.map((file, i) => (
        <Tag
          key={i}
          closable={!disabled}
          color={color}
          icon={<PaperClipOutlined />}
          onClose={() => onRemove(i)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 2,
            maxWidth: 220,
          }}
        >
          <span
            style={{
              maxWidth: 110,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {file.name || file.file_name}
          </span>
          <Button
            type="link"
            size="small"
            style={{ padding: "0 2px", height: "auto", fontSize: 11 }}
            onClick={(e) => {
              e.stopPropagation();
              onPreview(i);
            }}
          >
            Preview
          </Button>
        </Tag>
      ))}

      {hidden.length > 0 && (
        <Button
          size="small"
          type="dashed"
          icon={<EyeOutlined />}
          onClick={() => onPreview(VISIBLE_LIMIT)}
          style={{ fontSize: 11, borderRadius: 20 }}
        >
          +{hidden.length} more
        </Button>
      )}
    </Space>
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
  disabled = false
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
          file_url: uploadedDoc.file_url
        }]);
        message.success(`${file.name} uploaded successfully to S3`);
      } else {
        message.error("Upload failed: " + response.data.message);
      }
    } catch (err) {
      console.error(err);
      message.error("Upload failed. please check your connection.");
    }
    return false;
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
          onRemove={(i) => setFiles((p) => p.filter((_, j) => j !== i))}
          onPreview={(i) => onPreview(files, i)}
          disabled={disabled}
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

  // High-level granular permissions (Requirement: User B cannot overwrite User A's submitted data)
  const currentStage = parseInt(jobData?.current_stage || "1");
  const isJobSubmitted = jobData?.status !== "draft";

  // RELAXED FOR TESTING: Allowing everyone to write/edit/upload
  const isSalesSectionLocked = false;
  const isBookingSectionLocked = false;
  const isCNFSectionLocked = false;
  const isHBLSectionLocked = false;
  const isFinancialSectionLocked = false;

  const isTerminal = jobData?.status === "approved" || jobData?.status === "rejected" || currentStage === 9;

  // Department-based visibility logic - Relaxed for testing as per user request
  const canApprove = true; // user?.role === "admin" || ... (Restored later if needed)

  /* ── Collapse state ── */
  const [open, setOpen] = useState({
    export: true,
    container: true,
    otherDetails: true,
    placement: true,
    booking: true,
    bankAccounts: true, // New
    documents: true,    // New
    attachments: true,
    approvalStatus: true,
  });
  const toggle = (key) => setOpen((p) => ({ ...p, [key]: !p[key] }));

  // Always show sections as per user request to ensure accessibility
  const showPlacement = true;

  /* ── Shared preview modal ── */
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [previewIndex, setPreviewIndex] = useState(0);

  const openPreview = (filesArray, localIdx) => {
    const urls = filesArray.map((f) => f.url || f.file_url).filter(Boolean);
    if (!urls.length) return;
    setPreviewUrls(urls);
    setPreviewIndex(Math.max(0, Math.min(localIdx, urls.length - 1)));
    setPreviewVisible(true);
  };

  /* ── File states ── */
  const [bankSlips, setBankSlips] = useState([]);
  const [releaseOrderFiles, setReleaseOrderFiles] = useState([]);
  const [bocFiles, setBocFiles] = useState([]);
  const [haulageCostFiles, setHaulageCostFiles] = useState([]);
  const [loadListFiles, setLoadListFiles] = useState([]);
  const [lpoFiles, setLpoFiles] = useState([]);
  const [invoiceFiles, setInvoiceFiles] = useState([]);
  const [facFiles, setFacFiles] = useState([]);
  const [attachments, setAttachments] = useState([]);

  /* ── Other state ── */
  const [otherCharges, setOtherCharges] = useState([]);
  const [chargeInput, setChargeInput] = useState("");
  const [remarks, setRemarks] = useState([]);
  const [newRemark, setNewRemark] = useState("");
  const [approvalHistory, setApprovalHistory] = useState([]);

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
          hbl: data.hbl,
          fac: data.fac,
          documentation: data.documentation,
          transportation: data.transportation,

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

        // Map Documents
        if (data.documents) {
          setReleaseOrderFiles(data.documents.filter(d => d.doc_type === "Release Order"));
          setBocFiles(data.documents.filter(d => d.doc_type === "BOC"));
          setHaulageCostFiles(data.documents.filter(d => d.doc_type === "Haulage Cost"));
          setLoadListFiles(data.documents.filter(d => d.doc_type === "Load List"));
          setLpoFiles(data.documents.filter(d => d.doc_type === "LPO"));
          setInvoiceFiles(data.documents.filter(d => d.doc_type === "Invoice"));
          setFacFiles(data.documents.filter(d => d.doc_type === "FAC"));
          setBankSlips(data.documents.filter(d => d.doc_type === "Bank Slip"));
          setAttachments(data.documents.filter(d => d.doc_type === "Attachment"));
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
      ...releaseOrderFiles.map(f => ({ ...f, doc_type: "Release Order" })),
      ...bocFiles.map(f => ({ ...f, doc_type: "BOC" })),
      ...haulageCostFiles.map(f => ({ ...f, doc_type: "Haulage Cost" })),
      ...loadListFiles.map(f => ({ ...f, doc_type: "Load List" })),
      ...lpoFiles.map(f => ({ ...f, doc_type: "LPO" })),
      ...invoiceFiles.map(f => ({ ...f, doc_type: "Invoice" })),
      ...facFiles.map(f => ({ ...f, doc_type: "FAC" })),
      ...bankSlips.map(f => ({ ...f, doc_type: "Bank Slip" })),
      ...attachments.map(f => ({ ...f, doc_type: "Attachment" })),
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
      hbl: values.hbl,
      fac: values.fac,
      documentation: values.documentation,
      transportation: values.transportation,
      name_of_executive: values.name_of_executive,
      special_instructions: values.special_instructions,
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
        doc_type: d.doc_type,
        file_url: d.url || d.file_url,
        file_name: d.name || d.file_name,
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
        const stage = parseInt(jobData?.current_stage || "1");

        if (stage === 3 && !values.afsys_job_no) {
          message.error("AFSYS Job No. is required for CS Team Allocation (Stage 3)");
          setLoading(false);
          return;
        }

        if (stage === 4 && releaseOrderFiles.length === 0 && bocFiles.length === 0) {
          message.error("Release Order or BOC Attachment is required for CNF (Stage 4)");
          setLoading(false);
          return;
        }

        if (stage === 6 && loadListFiles.length === 0) {
          message.error("Load List is required for CNF Documents (Stage 6)");
          setLoading(false);
          return;
        }

        if (stage === 8 && bankSlips.length === 0) {
          message.error("Bank Slip is required for Accounts (Stage 8)");
          setLoading(false);
          return;
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
        message.success(`Job ${actionType} successfully`);
        setTimeout(() => {
          navigate("/dashboard");
        }, 1000);
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
      const payload = getCommonPayload(values);

      const response = id
        ? await apiClient.patch(`/liner/sales-input/${id}/`, payload)
        : await apiClient.post(`/liner/sales-input/`, payload);

      if (response.data.status === "success") {
        message.success("Draft saved successfully");
        if (!id) {
          // Redirect to edit mode if newly created
          window.location.search = `?id=${response.data.data.id}`;
        } else {
          setTimeout(() => {
            navigate("/dashboard");
          }, 1000);
        }
      } else {
        message.error(response.data.message || "Failed to save draft");
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
      render: (name, record) => name || record.updated_by_name || "N/A"
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
    },
    { title: "Remarks", dataIndex: "remarks", key: "remarks" },
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
              <CardHeader
                icon="basil:document-solid"
                title="EXPORT DETAILS"
                open={open.export}
                onToggle={() => toggle("export")}
              />
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
                <Col xs={24} md={6}>
                  <Form.Item className={Styles.formLabel} label="Carrier Name" name="carrier_name">
                    <Input placeholder="Carrier Name" disabled={isSalesSectionLocked} />
                  </Form.Item>
                </Col>

                <Col xs={24} md={6}>
                  <Form.Item className={Styles.formLabel} label="Job No (AFSYS)" name="afsys_job_no">
                    <Input placeholder="Job No" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={6}>
                  <Form.Item className={Styles.formLabel} label="Booking Ref No" name="booking_ref_no">
                    <Input placeholder="Booking Ref" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={6}>
                  <Form.Item className={Styles.formLabel} label="Pending With">
                    <Input value={jobData?.pending_with || "N/A"} readOnly variant="filled" />
                  </Form.Item>
                </Col>
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

          {/* ════════ CONTAINER DETAILS ════════ */}
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
                            <EquipmentTypeSelect />
                          </Form.Item>
                        </Col>
                        <Col xs={24} md={4}>
                          <Form.Item className={Styles.formLabel} {...rest} name={[name, "quantity"]} label="Qty">
                            <Input placeholder="Qty" disabled={isSalesSectionLocked} />
                          </Form.Item>
                        </Col>
                        <Col xs={24} md={5}>
                          <Form.Item className={Styles.formLabel} {...rest} name={[name, "category"]} label="Category">
                            <CategorySelect disabled={isSalesSectionLocked} />
                          </Form.Item>
                        </Col>
                        <Col xs={24} md={4}>
                          <Form.Item className={Styles.formLabel} {...rest} name={[name, "quote"]} label="Quote">
                            <Input placeholder="Quote" disabled={isSalesSectionLocked} />
                          </Form.Item>
                        </Col>
                        <Col xs={24} md={4}>
                          <Form.Item className={Styles.formLabel} {...rest} name={[name, "cost"]} label="Cost">
                            <Input placeholder="Cost" disabled={isSalesSectionLocked} />
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
                        placeholder="Type a charge and press Enter…"
                        value={chargeInput}
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

          {/* ════════ OTHER DETAILS (POL/POD etc) ════════ */}
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
                <Col xs={24} md={6}>
                  <Form.Item className={Styles.formLabel} label="POL" name="port_of_loading" rules={[{ required: true }]}>
                    <Input placeholder="Port of Loading" disabled={isSalesSectionLocked} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={6}>
                  <Form.Item className={Styles.formLabel} label="POD" name="port_of_discharge" rules={[{ required: true }]}>
                    <Input placeholder="Port of Discharge" disabled={isSalesSectionLocked} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={6}>
                  <Form.Item className={Styles.formLabel} label="FPOD" name="final_pod">
                    <Input placeholder="Final Port of Discharge" disabled={isSalesSectionLocked} />
                  </Form.Item>
                </Col>
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
                    <Input placeholder="Enter Code" disabled={isSalesSectionLocked} />
                  </Form.Item>
                </Col>
                <Col xs={12} md={6}>
                  <Form.Item className={Styles.formLabel} label="Name of Executive" name="name_of_executive">
                    <Input placeholder="Sales Executive" disabled={isSalesSectionLocked} />
                  </Form.Item>
                </Col>
                <Col xs={12} md={12}>
                  <Form.Item className={Styles.formLabel} label="Special Instruction if Any" name="special_instructions">
                    <TextArea placeholder="Enter any special instructions…" disabled={isSalesSectionLocked} />
                  </Form.Item>
                </Col>
                <Col xs={12} md={6}><Form.Item name="hbl" valuePropName="checked" noStyle><Checkbox disabled={isSalesSectionLocked}>HBL</Checkbox></Form.Item></Col>
                <Col xs={12} md={6}><Form.Item name="fac" valuePropName="checked" noStyle><Checkbox disabled={isSalesSectionLocked}>FAC</Checkbox></Form.Item></Col>
                <Col xs={12} md={6}><Form.Item name="documentation" valuePropName="checked" noStyle><Checkbox disabled={isSalesSectionLocked}>Documentation</Checkbox></Form.Item></Col>
                <Col xs={12} md={6}><Form.Item name="transportation" valuePropName="checked" noStyle><Checkbox disabled={isSalesSectionLocked}>Transportation</Checkbox></Form.Item></Col>
              </Row>
            </div>
          </Card>

          {/* ════════ PLACEMENT DETAILS ════════ */}
          {showPlacement && (
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
                          <Col xs={24} md={4}><Form.Item {...restField} name={[name, "equipment_type"]} label="Equip Type"><Input placeholder="Type" disabled={isCNFSectionLocked} /></Form.Item></Col>
                          <Col xs={24} md={3}><Form.Item {...restField} name={[name, "no_of_containers"]} label="Vol"><Input placeholder="Vol" disabled={isCNFSectionLocked} /></Form.Item></Col>
                          <Col xs={24} md={4}><Form.Item {...restField} name={[name, "category"]} label="Category"><Input placeholder="Cat" disabled={isCNFSectionLocked} /></Form.Item></Col>
                          <Col xs={24} md={4}><Form.Item {...restField} name={[name, "placement_time"]} label="Date/Time"><DatePicker showTime format="YYYY-MM-DD HH:mm" style={{ width: "100%" }} disabled={isCNFSectionLocked} /></Form.Item></Col>
                          <Col xs={24} md={7}><Form.Item {...restField} name={[name, "special_remarks"]} label="Remarks"><Input placeholder="Remarks" disabled={isCNFSectionLocked} /></Form.Item></Col>
                          <Col xs={24} md={2}>
                            <Button danger type="text" icon={<Icon icon="mdi:delete" />} onClick={() => remove(name)} style={{ marginTop: 24 }} disabled={isCNFSectionLocked} />
                          </Col>
                        </Row>
                      ))}
                      {!isCNFSectionLocked && <Button type="dashed" onClick={() => add()} block icon={<Icon icon="mdi:plus" />}>Add Placement Detail</Button>}
                    </>
                  )}
                </Form.List>
              </div>
            </Card>
          )}

          {/* ════════ BOOKING DETAILS ════════ */}
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

                <Col xs={24} md={6}>
                  <Form.Item className={Styles.formLabel} label="Release Order From Carrier">
                    <DocUploadField label="RO" files={releaseOrderFiles} setFiles={setReleaseOrderFiles} color="geekblue" onPreview={openPreview} salesInputId={id} category="booking" docType="Release Order" disabled={isBookingSectionLocked} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={6}>
                  <Form.Item className={Styles.formLabel} label="BOC Attachment">
                    <DocUploadField label="BOC" files={bocFiles} setFiles={setBocFiles} color="volcano" onPreview={openPreview} salesInputId={id} category="booking" docType="BOC" disabled={isBookingSectionLocked} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={6}>
                  <Form.Item className={Styles.formLabel} label="Haulage Cost Sheet">
                    <DocUploadField label="Haulage Cost" files={haulageCostFiles} setFiles={setHaulageCostFiles} color="orange" onPreview={openPreview} salesInputId={id} category="booking" docType="Haulage Cost" disabled={isBookingSectionLocked} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={6}>
                  <Form.Item className={Styles.formLabel} label="Load List">
                    <DocUploadField label="Load List" files={loadListFiles} setFiles={setLoadListFiles} color="gold" onPreview={openPreview} salesInputId={id} category="booking" docType="Load List" disabled={isBookingSectionLocked} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={24}><Form.Item className={Styles.formLabel} label="CNF Remarks" name="cnf_remarks"><TextArea disabled={isCNFSectionLocked} /></Form.Item></Col>
              </Row>
            </div>
          </Card>

          {/* ════════ BANK SLIP & ACCOUNT REMARKS ════════ */}
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
                    <DocUploadField label="Bank Slip" files={bankSlips} setFiles={setBankSlips} color="green" onPreview={openPreview} salesInputId={id} category="financial" docType="Bank Slip" disabled={isFinancialSectionLocked} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={16}>
                  <Form.Item className={Styles.formLabel} label="Account Remarks" name="account_remarks"><TextArea autoSize={{ minRows: 2 }} disabled={isFinancialSectionLocked} /></Form.Item>
                </Col>
              </Row>
            </div>
          </Card>

          {/* ════════ DOCUMENTS ════════ */}
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
                <Col xs={24} md={8}>
                  <Form.Item className={Styles.formLabel} label="LPO">
                    <DocUploadField label="LPO" files={lpoFiles} setFiles={setLpoFiles} color="cyan" onPreview={openPreview} salesInputId={id} category="financial" docType="LPO" disabled={isFinancialSectionLocked} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item className={Styles.formLabel} label="INVOICE">
                    <DocUploadField label="Invoice" files={invoiceFiles} setFiles={setInvoiceFiles} color="purple" onPreview={openPreview} salesInputId={id} category="financial" docType="Invoice" disabled={isFinancialSectionLocked} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item className={Styles.formLabel} label="FAC">
                    <DocUploadField label="FAC" files={facFiles} setFiles={setFacFiles} color="magenta" onPreview={openPreview} salesInputId={id} category="financial" docType="FAC" disabled={isFinancialSectionLocked} />
                  </Form.Item>
                </Col>
              </Row>
            </div>
          </Card>

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
                    {remarks.map((r, i) => (
                      <div key={i} style={{ position: 'relative', padding: '12px 32px 12px 12px', backgroundColor: '#f9f9f9', border: '1px solid #e5e7eb', borderRadius: 8, marginBottom: 8 }}>
                        <Button
                          type="text"
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                          style={{ position: "absolute", top: 6, right: 6 }}
                          onClick={() => setRemarks((p) => p.filter((_, j) => j !== i))}
                        />
                        <p style={{ margin: 0, fontSize: 13, color: '#1f2937' }}>{r}</p>
                      </div>
                    ))}
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
                        setRemarks(p => [...p, newRemark.trim()]);
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
                  <DocUploadField label="Attachment" files={attachments} setFiles={setAttachments} color="blue" onPreview={openPreview} salesInputId={id} category="attachments" docType="Other Attachment" />
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
                  <Space>
                    <Button
                      type="primary"
                      onClick={() => handleAction("Approved")}
                      icon={<Icon icon="mdi:check-circle" />}
                      loading={loading}
                      style={{ borderRadius: 8, height: 40, padding: "0 24px" }}
                    >
                      Approve / Verify
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

          {/* ════════ ACTION BUTTONS ════════ */}
          <Space
            style={{
              display: "flex",
              justifyContent: "center",
              width: "100%",
              marginTop: "1.5rem",
              marginBottom: "1rem",
            }}
          >
            <Button type="primary" htmlType="submit" icon={<Icon icon="mdi:content-save" />}>
              Submit
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

            <Button icon={<Icon icon="tabler:refresh" />} onClick={handleReset}>
              Reset Form
            </Button>
          </Space>
        </Form>
      </Spin>

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
    </div>
  );
};

export default Approval;
