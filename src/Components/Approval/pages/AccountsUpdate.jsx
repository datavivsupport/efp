import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import {
  Card, Row, Col, Typography, Form, Input, DatePicker, Button, Space, Spin, message, Modal, Tag, Table, Tabs
} from "antd";
import { Icon } from "@iconify/react";
import { EyeOutlined, DeleteOutlined, UploadOutlined } from "@ant-design/icons";
import dayjs from "../../../dayjs-config";
import apiClient from "../../../api/apiclient";
import { computeUserRoles } from "../utils/roleUtils";
import { partitionDocuments } from "../utils/formMapper";
import MultiFileViewer from "../../Viewer/MultiFileViewer";
import ScrollSafeTooltip, { RemarksCell } from "../../ScrollSafeTooltip";
import ProtectedApprovalRoute from "../ProtectedApprovalRoute";
import Styles from "../Approval.module.css";

const { TextArea } = Input;


const FileChipList = ({ files, onRemove, onPreview, onRemarkChange, disabled, user, isAdmin }) => (
  <div style={{ marginTop: 8 }}>
    {files.map((file, i) => {
      const isOwner = file.uploaded_by_user === user?.id || !file.id;
      const canEditFile = !disabled && (isAdmin || isOwner);
      return (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '8px', padding: '8px', border: '1px solid #f0f0f0', borderRadius: '4px', backgroundColor: '#fafafa' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: "flex", flex: 1, minWidth: 0 }}>
              <Icon icon="famicons:document-attach" style={{ color: '#747474', flexShrink: 0 }} />
              <Typography.Text style={{ whiteSpace: 'normal', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{file.name || file.file_name}</Typography.Text>
              {file.uploaded_by_user_name && (
                <Typography.Text type="secondary" style={{ fontSize: '10px' }}>({file.uploaded_by_user_name})</Typography.Text>
              )}
            </div>
            <Space>
              <ScrollSafeTooltip title="Preview"><Button icon={<EyeOutlined />} type="link" size="small" onClick={() => onPreview(i)} /></ScrollSafeTooltip>
              {canEditFile && <ScrollSafeTooltip title="Delete"><Button type="text" danger size="small" icon={<DeleteOutlined />} onClick={() => onRemove(i)} /></ScrollSafeTooltip>}
            </Space>
          </div>
          {canEditFile ? (
            <Input size="large" placeholder="Remarks..." value={file.remarks || ""} onChange={(e) => onRemarkChange(i, e.target.value)} className={Styles.remarkInput} style={{ marginTop: '2px', padding: "7px" }} />
          ) : (
            file.remarks && <Typography.Text className={Styles.remarkText} style={{ whiteSpace: 'normal', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{file.remarks}</Typography.Text>
          )}
        </div>
      );
    })}
  </div>
);


const DocUploadField = ({ label, files, setFiles, salesInputId, docType, category, onPreview, disabled, user, isAdmin }) => {
  const handleBeforeUpload = async (file) => {
    if (!salesInputId) return false;
    if (files.length >= 20) { message.warning("Maximum 20 files allowed per section."); return false; }
    const formData = new FormData();
    formData.append("file", file);
    formData.append("doc_type", docType);
    formData.append("category", category);
    try {
      const res = await apiClient.post(`/liner/sales-input/${salesInputId}/upload-document/`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      if (res.data.status === "success") {
        const d = res.data.data;
        setFiles(prev => [...prev, {
          id: d.id,
          name: d.file_name,
          url: d.file_url,
          file_name: d.file_name,
          file_url: d.file_url,
          doc_type: docType,
          remarks: "",
          uploaded_by_user: user?.id,
          uploaded_by_user_name: d.uploaded_by_user_name || user?.get_full_name || "Me"
        }]);
        message.success(res.data.message || `${file.name} uploaded`);
      }
    } catch (err) {
      message.error("Upload failed");
    }
    return false;
  };

  const debounceTimerField = useRef(null);

  const handleRemarkChange = (index, value) => {
    if (!files?.[index]) return;
    const docId = files[index].id;
    setFiles((prev) => prev.map((f) => (f.id === docId ? { ...f, remarks: value } : f)));
    if (salesInputId && docId) {
      if (debounceTimerField.current) clearTimeout(debounceTimerField.current);
      debounceTimerField.current = setTimeout(async () => {
        try {
          await apiClient.patch(`/liner/sales-input/${salesInputId}/update-document-remarks/`, { doc_id: docId, remarks: value });
        } catch (err) {
          console.error("Failed to sync remarks:", err);
        }
      }, 800);
    }
  };

  return (
    <div>
      <Input type="file" id={`upload-${docType}`} style={{ display: 'none' }} onChange={(e) => handleBeforeUpload(e.target.files[0])} />
      <Button icon={<UploadOutlined />} size="small" onClick={() => document.getElementById(`upload-${docType}`).click()} disabled={disabled}>
        {files.length === 0 ? `Upload ${label}` : "Add More"}
      </Button>
      {files.length > 0 && (
        <FileChipList
          files={files}
          onRemove={(i) => {
            const docId = files[i]?.id;
            if (!docId) return;
            Modal.confirm({
              title: "Delete attachment?",
              content: "Are you sure you want to delete this attachment? This action cannot be undone.",
              okText: "Delete",
              okType: "danger",
              cancelText: "Cancel",
              onOk: () => {
                setFiles((p) => p.filter((f) => f.id !== docId));
              },
            });
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


const FileListView = ({ files, onPreview }) => (
  <div>
    {files.length > 0 ? files.map((f, i) => (
      <div key={i} style={{ marginBottom: 6, padding: '6px 8px', border: '1px solid #f0f0f0', borderRadius: 4, backgroundColor: '#fafafa' }}>
        <Button type="link" size="small" icon={<Icon icon="mdi:file-document-outline" />} style={{ padding: 0 }} onClick={() => onPreview(files, i)}>
          {f.name || f.file_name}
        </Button>
        {f.remarks ? (
          <Typography.Text className={Styles.remarkText} style={{ display: 'block', marginTop: 2 }}>
            {f.remarks}
          </Typography.Text>
        ) : null}
      </div>
    )) : <Typography.Text type="secondary" italic>No files</Typography.Text>}
  </div>
);

const AccountsUpdatePage = ({ jobData, user }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  
  const [lpoFiles, setLpoFiles] = useState([]);
  const [invoiceFiles, setInvoiceFiles] = useState([]);
  const [hblFiles, setHblFiles] = useState([]);
  const [facFiles, setFacFiles] = useState([]);
  const [preAlertFiles, setPreAlertFiles] = useState([]);
  const [edFiles, setEdFiles] = useState([]);
  const [executiveDocuments, setExecutiveDocuments] = useState([]);
  const [salesExecutiveFiles, setSalesExecutiveFiles] = useState([]);

  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  
  // Rejection Modal State
  const [rejectionModalVisible, setRejectionModalVisible] = useState(false);
  const [rejectionRemarks, setRejectionRemarks] = useState("");
  const [rejectionLoading, setRejectionLoading] = useState(false);

  useEffect(() => {
    if (jobData) {
      // Filter documents: Accounts only see approved documents
      const approvedDocs = (jobData.documents || []).filter(d => d.is_cs_hod_approved !== false);
      const docs = partitionDocuments(approvedDocs);
      setLpoFiles(docs.lpoFiles);
      setInvoiceFiles(docs.invoiceFiles);
      setHblFiles(docs.hblFiles);
      setFacFiles(docs.facFiles);
      setPreAlertFiles(docs.preAlertFiles);
      setEdFiles(docs.edFiles);
      setExecutiveDocuments(docs.executiveDocuments || []);
      setSalesExecutiveFiles(docs.salesExecutiveFiles || []);

      form.setFieldsValue({
        carrier_name_2: jobData.carrier_name_2,
        account_remarks: jobData.approval_details?.account_remarks
      });
    }
  }, [jobData, form]);

  const { isAccountsTeam, isAdmin } = computeUserRoles(user);


  const isPendingAtAccounts = jobData?.pending_with?.toLowerCase().includes("accounts");
  const isDisabled = !isPendingAtAccounts || jobData?.status?.includes("REJECTED");

  // const openPreview = (files, idx) => {
  //   setPreviewUrls(files.map(f => f.url || f.file_url));
  //   setPreviewIndex(idx);
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

  const handleAction = async (actionType) => {
    setLoading(true);
    try {
      const values = await form.validateFields();
      
      let payload;
      if (actionType === "Approved") {
        // For approval
        payload = {
          carrier_name_2: values.carrier_name_2,
          account_remarks: values.account_remarks,
          action: actionType,
          remarks: values.approvalRemarks || "",
        };
      } else {
        // For rejection - send only remarks
        payload = {
          remarks: values.approvalRemarks || "Rejected by Accounts"
        };
      }

      const endpoint = actionType === "Approved" 
        ? `/liner/sales-input/${id}/approve/` 
        : `/liner/sales-input/${id}/reject/`;

      const res = await apiClient.post(endpoint, payload);
      if (res.data.status === "success") {
        message.success(res.data.message || `${actionType} successfully`);
        setTimeout(() => navigate("/"), 1500);
      } else {
        message.error(res.data.message || "Action failed");
      }
    } catch (err) {
      message.error("Action failed");
    } finally {
      setLoading(false);
    }
  };

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const payload = {
        carrier_name_2: values.carrier_name_2,
        account_remarks: values.account_remarks,
      };
      await apiClient.patch(`/liner/sales-input/${id}/`, payload);
      message.success("Accounts details updated");
      setTimeout(() => navigate("/"), 1500);
    } catch (err) {
      message.error("Save failed");
    } finally {
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
        <Tag color={s === "Approved" || s === "Approved" ? "success" : "default"}>
          {s?.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: "Remarks",
      dataIndex: "remarks",
      key: "remarks",
      width: 320,
      render: (value) => <RemarksCell value={value} />,
    },
    {
      title: "Updated Date",
      dataIndex: "created_at",
      key: "created_at",
      render: (d) => d ? dayjs.tz(d).format("YYYY-MM-DD HH:mm") : "N/A"
    }
  ];

  const approvalHistory = [...(jobData?.approval_history || [])].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  const items = [
    {
      key: '1',
      label: (
        <Space>
          <Icon icon="mdi:account-edit" />
          Accounts Update
        </Space>
      ),
      children: (
        <Card className={Styles.card} bordered={false}>
          <Row gutter={24}>
            <Col span={12}>
              <Form.Item label="Carrier Name 2" name="carrier_name_2">
                <Input disabled={!isAccountsTeam || isDisabled} size="large" />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item label="Account Remarks" name="account_remarks">
                <TextArea rows={3} disabled={!isAccountsTeam || isDisabled} />
              </Form.Item>
            </Col>
          </Row>

          <div style={{ marginTop: 24, borderTop: "1px solid #f0f0f0", paddingTop: 24 }}>
            <Typography.Title level={5}>Documentation (View Only)</Typography.Title>
            <Row gutter={[24, 16]}>
              {lpoFiles.length > 0 && (
                <Col span={12}>
                  <Typography.Text strong>LPO</Typography.Text>
                  <div style={{ marginTop: 8 }}><FileListView files={lpoFiles} onPreview={openPreview} /></div>
                </Col>
              )}
              {invoiceFiles.length > 0 && (
                <Col span={12}>
                  <Typography.Text strong>Invoice</Typography.Text>
                  <div style={{ marginTop: 8 }}><FileListView files={invoiceFiles} onPreview={openPreview} /></div>
                </Col>
              )}
              {!lpoFiles.length && !invoiceFiles.length && (
                <Col span={24}><Typography.Text type="secondary" italic>No documents available.</Typography.Text></Col>
              )}
            </Row>
          </div>

          <div style={{ marginTop: 24, borderTop: "1px solid #f0f0f0", paddingTop: 24 }}>
            <Form.Item label="Approval Remarks" name="approvalRemarks">
              <TextArea rows={3} placeholder="Optional remarks for approval/rejection" disabled={isDisabled} />
            </Form.Item>
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <Button size="large" onClick={() => navigate("/")}>Cancel</Button>
              <Button size="large" type="primary" htmlType="submit" disabled={!isAccountsTeam || isDisabled}>Save Update</Button>
              <Button size="large" type="primary" style={{ backgroundColor: "#10b981", borderColor: "#10b981" }} onClick={() => handleAction("Approved")} disabled={!isAccountsTeam || isDisabled}>
                Approve (Accounts)
              </Button>
              <Button size="large" danger onClick={() => handleAction("Rejected")} disabled={!isAccountsTeam || isDisabled}>
                Reject
              </Button>
            </div>
          </div>
        </Card>
      ),
    },
    {
      key: '2',
      label: (
        <Space>
          <Icon icon="mdi:history" />
          Approval History
        </Space>
      ),
      children: (
        <Card className={Styles.card} bordered={false}>
          <Table
            dataSource={approvalHistory}
            columns={historyColumns}
            rowKey="id"
            pagination={false}
            size="middle"
            scroll={{ x: 'max-content' }}
          />
        </Card>
      ),
    },
  ];

  return (
    <div style={{ padding: "0", width: "100%", backgroundColor: "#fff", minHeight: "100vh" }}>
      <Spin spinning={loading}>
        <div style={{ padding: "20px 40px", borderBottom: "1px solid #f0f0f0", backgroundColor: "#fff" }}>
          <Typography.Title level={3} style={{ margin: 0 }}>
            <Space>
              <Icon icon="mdi:finance" style={{ color: "#00aea6" }} />
              Accounts Update - {jobData?.export_number}
            </Space>
          </Typography.Title>
        </div>
        
        <div style={{ padding: "20px 40px" }}>
          <Form form={form} layout="vertical" onFinish={onFinish}>
            <Tabs 
              defaultActiveKey="1" 
              items={items} 
              type="card" 
              size="large"
              style={{ width: '100%' }}
            />
          </Form>
        </div>
      </Spin>

      <Modal open={previewVisible} footer={null} title="Attachments" onCancel={() => setPreviewVisible(false)} width="90%" style={{ top: 20 }} styles={{ body: { height: "87vh", padding: 0 } }} destroyOnClose>
        {/* {previewVisible && previewUrls.length > 0 && <MultiFileViewer urls={previewUrls} defaultIndex={previewIndex} />} */}
        {previewVisible && previewUrls.length > 0 && (
            <MultiFileViewer
              files={previewUrls.map((item) => {
                const url = typeof item === "string" ? item : item.url || item.file_url || "";
                const name = typeof url === "string" ? decodeURIComponent(url.split("/").pop()) : "unknown";
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

      {/* Rejection Remarks Modal */}
      <Modal
        title="Reject Job"
        open={rejectionModalVisible}
        onCancel={() => setRejectionModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setRejectionModalVisible(false)}>
            Cancel
          </Button>,
          <Button key="reject" danger type="primary" loading={rejectionLoading} onClick={async () => {
            if (!rejectionRemarks.trim()) {
              message.warning("Please enter rejection remarks");
              return;
            }
            try {
              setRejectionLoading(true);
              const payload = { remarks: rejectionRemarks.trim() };
              const res = await apiClient.post(`/liner/sales-input/${id}/reject/`, payload);
              if (res.data.status === "success") {
                message.success(res.data.message || "Job rejected successfully");
                setRejectionModalVisible(false);
                setTimeout(() => window.location.href = "/", 1500);
              } else {
                message.error(res.data.message || "Rejection failed");
              }
            } catch (err) {
              message.error(err.response?.data?.message || "Something went wrong");
            } finally {
              setRejectionLoading(false);
            }
          }}>
            Confirm Rejection
          </Button>,
        ]}
        width={600}
      >
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontWeight: 600, marginBottom: 8 }}>Please enter rejection remarks:</p>
          <Input.TextArea
            rows={4}
            placeholder="Enter rejection reason (e.g., 'Invoice discrepancy', 'Missing payment proof', etc.)"
            value={rejectionRemarks}
            onChange={(e) => setRejectionRemarks(e.target.value)}
            style={{ borderRadius: 4 }}
          />
          <p style={{ fontSize: 12, color: "#666", marginTop: 8 }}>This reason will be visible to the CS HOD for corrections.</p>
        </div>
      </Modal>
    </div>
  );
};

const AccountsUpdate = () => (
  // <AccountsUpdatePage jobData={jobData} user={user} />
  <ProtectedApprovalRoute routeKey="accounts">
    {({ jobData, user }) => <AccountsUpdatePage jobData={jobData} user={user} />}
  </ProtectedApprovalRoute>
);

export default AccountsUpdate;
