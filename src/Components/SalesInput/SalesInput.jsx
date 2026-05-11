import React, { useState, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import {
  Form,
  Input,
  Button,
  Row,
  Col,
  Select,
  Checkbox,
  DatePicker,
  Space,
  Typography,
  Card,
  message,
  Upload,
  Tag,
  Timeline,
  Modal,
  Spin,
  Tooltip,
} from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  UploadOutlined,
  PaperClipOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import Styles from "./salesinput.module.css";
import { Icon } from "@iconify/react";
import { useNavigate, useSearchParams } from "react-router";
import CategorySelect from "./Category";
import EquipmentTypeSelect from "./EquipmentType";
import JobTypeSelect from "./JobTypeSelect";
import TermsOfShipmentSelect from "./TermsOfShipmentSelect";
import apiClient from "../../api/apiclient";
import MultiFileViewer from "../Viewer/MultiFileViewer"; // Added MultiFileViewer

// const { Title } = Typography;
const { TextArea } = Input;

/* ─────────────────────────────────────────────────────────────────────────────
   FileChipList — shared chip renderer for every upload field
───────────────────────────────────────────────────────────────────────────── */
const FileChipList = ({ files, color = "blue", onRemove, onPreview, onRemarkChange, disabled }) => {
  return (
    <div style={{ marginTop: 8 }}>
      {files.map((file, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '8px', padding: '8px', border: '1px solid #f0f0f0', borderRadius: '4px', backgroundColor: '#fafafa' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Space>
              <Icon icon="famicons:document-attach" style={{ color: '#747474' }} />
              {/* <PaperClipOutlined style={{ color: '#1890ff' }} /> */}
              <Typography.Text ellipsis style={{ maxWidth: 200 }}>
                {file.name || file.file_name}
              </Typography.Text>
            </Space>
            <Space>
              <Tooltip title="Preview">
                <Button icon={<EyeOutlined/>} type="link" size="small" onClick={() => onPreview(i)}/>
              </Tooltip>
              <Tooltip title="Delete">
              {!disabled && <Button type="text" danger size="small" icon={<DeleteOutlined />} onClick={() => onRemove(i)} />}
              </Tooltip>
            </Space>
          </div>
          {!disabled && (
            <Input
              size="small"
              placeholder="Add remarks for this document..."
              value={file.remarks || ""}
              onChange={(e) => onRemarkChange(i, e.target.value)}
              style={{ fontSize: '12px', marginTop: '2px', padding: "7px" }}
            />
          )}
          {disabled && file.remarks && (
            <Typography.Text type="secondary" italic style={{ fontSize: '11px', paddingLeft: '4px' }}>
              Remarks: {file.remarks}
            </Typography.Text>
          )}
        </div>
      ))}
    </div>
  );
};

/* DocUploadField — self-contained upload + chip-list */
const DocUploadField = ({
  label,
  files,
  setFiles,
  setPendingFiles,
  color = "purple",
  onPreview,
  salesInputId,
  category = "general",
  docType = "Other",
  disabled = false,
  restrictionMessage = null,
  isMasterMode = false,
  user,
  isAdmin,
  onAutoSave,
  isOthers
}) => {
  const [uploading, setUploading] = useState(false);
  const handleBeforeUpload = async (file) => {
    if (restrictionMessage) {
      message.error(restrictionMessage);
      return false;
    }
    if (isMasterMode) {
      message.warning("Uploads are disabled in View-Only Mode");
      return false;
    }

    setUploading(true);
    // ⏳ Fake delay to make it "feel" like it's uploading
    await new Promise(resolve => setTimeout(resolve, 1000));

    let currentId = salesInputId;
    if (!currentId && isOthers && onAutoSave) {
      currentId = await onAutoSave();
    }

    // if (!currentId && !isMasterMode) {
    //   message.warning("Save the draft first before uploading documents");
    //   console.log({file})
    //   return false;
    // }

    if (!currentId && !isMasterMode) {
      const tempId = `temp-${Date.now()}`;

      // ✅ Store file temporarily in memory
      setPendingFiles((prev) => [
        ...prev,
        {
          tempId,
          file,
          doc_type: docType,
          category,
          remarks: ""
        }
      ]);

      const tempUrl = URL.createObjectURL(file);
      // optional UI update
      setFiles((prev) => [
        ...prev,
        {
          id: tempId,
          name: file.name,
          file_name: file.name,
          doc_type: docType,
          remarks: "",
          isTemp: true,
          url: tempUrl,       // ✅ add this
          file_url: tempUrl,   // optional, if your preview uses file_url
          mimeType: file.type
        }
      ]);

      setUploading(false);
      return false;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('doc_type', docType);
    formData.append('category', category);

    try {
      const response = await apiClient.post(
        `/liner/sales-input/${currentId}/upload-document/`,
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
      // message.error("Upload failed. please check your connection.");
    } finally {
      setUploading(false);
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
    setPendingFiles?.((prev) =>
      prev.map((item) =>
        item.tempId === docId || item.file?.name === files[index]?.name
          ? { ...item, remarks: value }
          : item
      )
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
    <Spin spinning={uploading} size="small">
      <div>
        {(!disabled || restrictionMessage) && (
          <Upload multiple showUploadList={false} beforeUpload={handleBeforeUpload}>
            <Button size="small" icon={<UploadOutlined />} style={{ fontSize: 12 }} disabled={uploading} loading={uploading}>
              {uploading ? "Uploading..." : (files.length === 0 ? `Upload ${label}` : "Add More")}
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
                setPendingFiles?.((p) => p.filter((item) => item.tempId !== docId));
              }
            }}
            onPreview={(i) => onPreview(files, i)}
            onRemarkChange={handleRemarkChange}
            disabled={disabled}
          />
        )}
      </div>
    </Spin>
  );
};


const SalesInput = () => {
  const [form] = Form.useForm();
  const jobTypeWatch = Form.useWatch("job_type", form);

  const [commodities, setCommodities] = useState([]);
  const [commodityInput, setCommodityInput] = useState("");

  const [equipmentRows, setEquipmentRows] = useState([
    { id: 1, equipmentType: "", volume: "", category: "", quote: "", cost: "" },
  ]);

  const [transportationRows, setTransportationRows] = useState([
    {
      id: 1,
      equipmentType: "",
      container: "",
      category: "",
      date: "",
      location: "",
      remarks: "",
    },
  ]);

  const [additionalService, setAdditionalService] = useState({
    showTransportation: false,
    hbl: false,
    fac: false,
    documentation: false,
  });


  const [showBasicInformation, setShowBasicInformation] = useState(true);
  const [showAdditionalService, setShowAdditionalService] = useState(true);
  const [showShipmentDetails, setShowShipmentDetails] = useState(true);
  const [showContainerDetails, setShowContainerDetails] = useState(true);
  const [showExportDetails, setShowExportDetails] = useState(true);
  const [showApprovers, setShowApprovers] = useState(true);
  const [showSpecialInstructions, setShowSpecialInstructions] = useState(true);
  const [loading, setLoading] = useState(false);
  const submittingRef = useRef(false);
  const [hodOptions, setHodOptions] = useState([]);
  const [currentStage, setCurrentStage] = useState("1"); // Added for read-only check
  const [pendingFiles, setPendingFiles] = useState([]);

  // Specialized Job Type Logic
  const jobType = Form.useWatch("job_type", form);
  const isOthers = jobType?.toUpperCase() === "OTHERS";
  const isLiner = jobType?.toUpperCase() === "LINER";
  const isForwarding = jobType?.toUpperCase() === "FORWARDING";
  const isLLReqForm = Form.useWatch("is_load_list_required", form);
  const isHNReqForm = Form.useWatch("is_haulier_note_required", form);


  const [workflowStatus, setWorkflowStatus] = useState({
    is_hod_approved: false,
    is_cs_updated: false,
    is_cnf_loadlist_uploaded: false,
    is_financial_trigger_activated: false,
  });
  const [approvalHistory, setApprovalHistory] = useState([]);
  const [instanceStatus, setInstanceStatus] = useState("draft");
  const [freightManifestFiles, setFreightManifestFiles] = useState([]);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [previewIndex, setPreviewIndex] = useState(0);

  // General Remarks & Attachments State (for universal access)
  const [remarks, setRemarks] = useState([]);
  const [newRemark, setNewRemark] = useState("");
  const [attachments, setAttachments] = useState([]);

  // const openPreview = (fileList, index = 0) => {
  //   const urls = fileList.map((f) => f.url || f.file_url);
  //   setPreviewUrls(urls);
  //   setPreviewIndex(index);
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
  const [searchParams, setSearchParams] = useSearchParams();
  const id = searchParams.get("id");
  const typeParam = searchParams.get("type");
  const user = useSelector((state) => state.auth.user);
  const userRoles = (user?.roles || []).map(r => (r.name || "").toUpperCase());
  const userDepts = (user?.departments_assigned || []).map(d => (d.name || "").toUpperCase());
  const isHOD = userRoles.some(r => r.includes("HOD"));
  const isAdmin = userRoles.includes("ADMIN") || userRoles.includes("SUPER ADMIN");
  const isCS = userDepts.some(d => d.includes("CUSTOMER SERVICE") || d.includes("CS"));
  const isCNF = userDepts.some(d => d.includes("CNF") || d.includes("OPERATIONS") || d.includes("CLEARANCE"));

  // PRD Section 3: Sales Input should not have role restrictions as per user.
  const isTerminal = instanceStatus === "approved" || instanceStatus === "REJECTED-CLOSED" || instanceStatus === "rejected" || parseInt(currentStage) === 9;
  const isReadOnly = false; // Removed role and terminal restrictions for SalesInput page

  const addCommodity = () => {
    if (commodityInput.trim() && !commodities.includes(commodityInput.trim())) {
      setCommodities([...commodities, commodityInput.trim()]);
      setCommodityInput("");
    }
  };

  const removeCommodity = (value) => {
    setCommodities(commodities.filter((c) => c !== value));
  };

  const isLLReq = isLLReqForm === true || isLLReqForm === "true";
  const isHNReq = isHNReqForm === true || isHNReqForm === "true";

  const isHalted = (isLiner || isForwarding) && (isLLReqForm === false || isHNReqForm === false);

  useEffect(() => {
    return () => {
      attachments.forEach(f => f.isTemp && f.url && URL.revokeObjectURL(f.url));
    }
  }, [attachments]);

  // const addEquipmentRow = () => {
  //   setEquipmentRows([
  //     ...equipmentRows,
  //     {
  //       id: Date.now(),
  //       equipmentType: "",
  //       volume: "",
  //       category: "",
  //       quote: "",
  //       cost: "",
  //     },
  //   ]);
  // };

  // const removeEquipmentRow = (id) => {
  //   if (equipmentRows.length > 1) {
  //     setEquipmentRows(equipmentRows.filter((row) => row.id !== id));
  //   }
  // };

  // const addTransportRow = () => {
  //   setTransportationRows([
  //     ...transportationRows,
  //     {
  //       id: Date.now(),
  //       equipmentType: "",
  //       container: "",
  //       category: "",
  //       date: "",
  //       location: "",
  //       remarks: "",
  //     },
  //   ]);
  // };

  // const removeTransportRow = (id) => {
  //   if (transportationRows.length > 1) {
  //     setTransportationRows(transportationRows.filter((row) => row.id !== id));
  //   }
  // };

  // const totals = equipmentRows.reduce(
  //   (acc, row) => {
  //     const quote = Number(row.quote) || 0;
  //     const cost = Number(row.cost) || 0;
  //     const volume = Number(row.volume) || 0;
  //     acc.quote += quote;
  //     acc.cost += cost;
  //     acc.margin += volume * (quote - cost);
  //     return acc;
  //   },
  //   { quote: 0, cost: 0, margin: 0 },
  // );
  // Fetch master data for job type and terms of shipment dropdowns
  useEffect(() => {
    const fetchMasterData = async () => {
      // 1. Core Master Data (Essential)
      try {
      } catch (err) {
        console.error("Failed to load core master data", err);
      }

      // 2. Staff Selection Data (Resilient)
      try {
        const [hodRes] = await Promise.all([
          apiClient.get("/accounts/liner/admin/users/hods/"),
        ]);
        const hodData = hodRes.data?.results ?? hodRes.data ?? [];

        setHodOptions(hodData.map((item) => ({
           label: `${item.first_name} ${item.last_name}  |  (${item.email})`,
           value: `${item.first_name} ${item.last_name}`,
        })));
      } catch (err) {
        console.warn("Failed to load HOD selection data (permissions?)", err);
      }
    };
    fetchMasterData();
  }, []);

  useEffect(() => {
    const fetchDraftData = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const response = await apiClient.get(`/liner/sales-input/${id}/`);
        if (response.status === 200) {
          const data = response.data.data;
          setCurrentStage(data.current_stage || "1");
          setWorkflowStatus({
            is_hod_approved: data.is_hod_approved,
            is_cs_updated: data.is_cs_updated,
            is_cnf_loadlist_uploaded: data.is_cnf_loadlist_uploaded,
            is_financial_trigger_activated: data.is_financial_trigger_activated,
          });
          setApprovalHistory(data.approval_history || []);
          setInstanceStatus(data.status);

          // Load documents into state
          const docs = data.documents || [];
          setFreightManifestFiles(docs.filter(d => d.doc_type === "Freight Manifest"));

          // Map backend data to form fields
          form.setFieldsValue({
            customer_name: data.customer_name,
            contact_pic: data.contact_pic,
            phone_no: data.phone_no,
            email: data.email,
            job_type: data.job_type,
            agent: data.agent,
            carrier_name: data.carrier_name,
            vessel_voyage: data.vessel_voyage,
            carrier_remarks: data.carrier_remarks,
            vessel_voyage_remarks: data.vessel_voyage_remarks,
            pol_remarks: data.pol_remarks,
            pod_remarks: data.pod_remarks,
            port_of_loading: data.port_of_loading,
            port_of_discharge: data.port_of_discharge,
            final_pod: data.final_pod,
            terms_of_shipment: data.terms_of_shipment,
            haulier_code: data.haulier_code,
            name_of_executive: data.name_of_executive,
            sales_hod: data.sales_hod,
            special_instructions: data.special_instructions,
            other_charges_remarks: data.approval_details?.other_charges_remarks,
            export_created_date: data.export_created_date ? dayjs(data.export_created_date) : dayjs(),
            export_number: data.export_number || "N/A",
            created_by_name: data.created_by_name || "",
            lpo_required: data.approval_details?.lpo_required ?? true,
            release_order_required: data.approval_details?.release_order_required ?? true,
          });

          setRemarks(data.general_remarks || []);
          setAttachments(data.documents || []);


          // Set state for dynamic lists
          setCommodities((data.commodities || []).map(c => c.name));

          const mappedEquipment = (data.container_details || []).map((cd, index) => ({
            id: cd.id || index + 1,
            equipment_type: cd.equipment_type,
            quantity: cd.quantity,
            category: cd.category,
            quote: cd.quote,
            cost: cd.cost
          }));

          if (mappedEquipment.length > 0) {
            setEquipmentRows(mappedEquipment);
            form.setFieldsValue({ equipmentRows: mappedEquipment });
          }

          const mappedTransportation = (data.transportation_rows || []).map((tr, index) => ({
            id: tr.id, // KEEP BACKEND ID
            equipment_type: tr.equipment_type,
            no_of_containers: tr.no_of_containers,
            category: tr.category,
            placement_time: tr.placement_time ? dayjs(tr.placement_time) : null,
            pickup_location: tr.pickup_location,
            special_remarks: tr.special_remarks
          }));

          if (mappedTransportation.length > 0) {
            setTransportationRows(mappedTransportation);
            form.setFieldsValue({ transportationRows: mappedTransportation });
            setAdditionalService(prev => ({ ...prev, showTransportation: true }));
          }

          form.setFieldsValue({
            vsl_initial_eta: data.vsl_initial_eta ? dayjs(data.vsl_initial_eta) : null,
            vsl_latest_eta: data.vsl_latest_eta ? dayjs(data.vsl_latest_eta) : null,
            vsl_etd: data.vsl_etd ? dayjs(data.vsl_etd) : null,
            pod_eta: data.pod_eta ? dayjs(data.pod_eta) : null,
            overseas_agent_name: data.overseas_agent_name || "",
          });

          setAdditionalService(prev => ({
            ...prev,
            hbl: data.hbl,
            fac: data.fac,
            documentation: data.documentation
          }));
        }
      } catch (error) {
        console.error("Error fetching draft data:", error);
        message.error("Failed to load draft data");
      } finally {
        setLoading(false);
      }
    };

    fetchDraftData();
  }, [id, form]);

  // Auto-populate Name of Executive and Job Type for new records
  useEffect(() => {
    if (!id && user) {
      const fullName = `${user.first_name || ""} ${user.last_name || ""}`.trim();
      if (fullName) {
        form.setFieldsValue({ name_of_executive: fullName });
      }

      if (typeParam) {
        form.setFieldsValue({ job_type: typeParam.toUpperCase() });
      }
    }
  }, [id, user, form, typeParam]);

  const uploadFileToServer = async (file, currentId, doc_type, category, remarks = "") => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("doc_type", doc_type);
  formData.append("category", category);
  formData.append("remarks", remarks);

  const response = await apiClient.post(
    `/liner/sales-input/${currentId}/upload-document/`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );

  return response.data;
};

  const onFinish = async (values, statusValue = "submitted") => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setLoading(true);
    const cleanEquipment = (values.equipmentRows || []).map((row) => ({
      id: row?.id,
      equipment_type: row?.equipment_type || "",
      quantity: Number(row?.quantity) || 0,
      category: row?.category || "",
      quote: row?.quote || "",
      cost: row?.cost || "",
    }));

    const cleanTransportation = (values.transportationRows || []).map(
      (row) => ({
        id: row?.id, // SEND ID BACK TO PRESERVE ROWS
        equipment_type: row?.equipment_type || "",
        no_of_containers: Number(row?.no_of_containers) || 0,
        category: row?.category || "",
        placement_time: row?.placement_time
          ? row.placement_time.format("YYYY-MM-DD HH:mm:ss")
          : null,
        pickup_location: row?.pickup_location || "",
        special_remarks: row?.special_remarks || "",
      }),
    );

    // Auto-include any typed but not-yet-Enter-pressed commodity text
    const allCommodities = [...(commodities || [])];
    if (commodityInput && commodityInput.trim() && !allCommodities.includes(commodityInput.trim())) {
      allCommodities.push(commodityInput.trim());
    }

    const payload = {
      customer_name: (isOthers && !values?.customer_name)
        ? `${user?.first_name || ""} ${user?.last_name || ""}`.trim()
        : values?.customer_name || "",
      contact_pic: (isOthers && !values?.contact_pic)
        ? `${user?.first_name || ""} ${user?.last_name || ""}`.trim()
        : values?.contact_pic || "",
      phone_no: values?.phone_no || "",
      email: values?.email || "",
      job_type: values?.job_type?.toUpperCase() || "LINER",
      agent: values?.agent || "",
      carrier_name: values?.carrier_name || "",
      vessel_voyage: values?.vessel_voyage || "",
      carrier_remarks: values?.carrier_remarks || "",
      vessel_voyage_remarks: values?.vessel_voyage_remarks || "",
      pol_remarks: values?.pol_remarks || "",
      pod_remarks: values?.pod_remarks || "",
      port_of_loading: values?.port_of_loading || "",
      port_of_discharge: values?.port_of_discharge || "",
      final_pod: values?.final_pod || "",
      terms_of_shipment: values?.terms_of_shipment || "",
      haulier_code: values?.haulier_code || "",
      hbl: additionalService.hbl || false,
      fac: additionalService.fac || false,
      documentation: additionalService.documentation || false,
      transportation: additionalService.showTransportation || false,
      name_of_executive: values?.name_of_executive || "",
      sales_hod: values?.sales_hod || "",
      special_instructions: values?.special_instructions || "",
      remarks: values?.remarks || "",
      approval_details: {
        other_charges_remarks: values?.other_charges_remarks || "",
        lpo_required: values?.is_lpo_required ?? true,
        release_order_required: values?.is_release_order_required ?? true,
        is_load_list_required: values?.is_load_list_required ?? true,
        is_haulier_note_required: values?.is_haulier_note_required ?? true,
      },
      is_lpo_required: values?.is_lpo_required ?? true,
      is_invoice_required: values?.is_lpo_required ?? true,
      is_release_order_required: values?.is_release_order_required ?? true,
      is_load_list_required: values?.is_load_list_required ?? true,
      is_haulier_note_required: values?.is_haulier_note_required ?? true,
      status: statusValue,
      commodities: allCommodities.map((c) => ({ name: c })),
      container_details: cleanEquipment || [],
      transportation_rows: additionalService.showTransportation
        ? cleanTransportation || []
        : [],
      /* 2026-03-25: ETA fields relocated to Approval Page (Stage 3+) per PRD */
      overseas_agent_name: values.overseas_agent_name || "",
      export_created_date: values.export_created_date ? values.export_created_date.format("YYYY-MM-DD") : null,
      export_number: values.export_number !== "N/A" ? values.export_number : null,
      general_remarks: remarks,
      // documents: [
      //   ...attachments.map(d => ({
      //     id: d.id,
      //     doc_type: d.doc_type || "Attachment",
      //     file_url: d.url || d.file_url,
      //     file_name: d.name || d.file_name,
      //     remarks: d.remarks || ""
      //   }))
      // ]
    };
    if(pendingFiles.length === 0){
      payload["documents"] = [
        ...attachments.map(d => ({
          id: d.id,
          doc_type: d.doc_type || "Attachment",
          file_url: d.url || d.file_url,
          file_name: d.name || d.file_name,
          remarks: d.remarks || ""
        }))
      ]
    }


    try {
      const payloadWithUser = {
        ...payload,
        created_by_name: user?.first_name ? `${user.first_name} ${user.last_name || ""}`.trim() : payload.created_by_name
      };

      // For OTHERS, we might need to handle document IDs or wait for sequential upload
      // WritableNestedModelSerializer handles nested documents if provided

      const response = id
        ? await apiClient.put(`/liner/sales-input/${id}/`, payloadWithUser)
        : await apiClient.post("/liner/sales-input/", payloadWithUser);

      if (response.status === 201 || response.status === 200) {
        // Redirection as requested by user
        message.success(`Form ${statusValue === 'draft' ? "Saved" : "Submitted"} Successfully`);
        if (response?.data?.id && pendingFiles.length > 0) {
          for (const item of pendingFiles) {
            try {
              const data = await uploadFileToServer(
                item.file,
                response?.data?.id,
                item.doc_type,
                item.category,
                item.remarks || ""
              );

              if (data.status === "success") {
                const uploadedDoc = data.data;

                setFiles((prev) =>
                  prev.map((f) =>
                    f.name === item.file.name && f.isTemp
                      ? {
                          id: uploadedDoc.id,
                          name: uploadedDoc.file_name,
                          url: uploadedDoc.file_url,
                          file_name: uploadedDoc.file_name,
                          file_url: uploadedDoc.file_url,
                          doc_type: item.doc_type,
                          remarks: item.remarks || ""
                        }
                      : f
                  )
                );
              }
            } catch (err) {
              console.error("Pending upload failed:", err);
            }
          }

          // ✅ clear temp files
          setPendingFiles([]);
        }
        navigate("/dashboard");
      }
    } catch (error) {
      console.error("API Error:", error);
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  };

  const handleFinishFailed = () => {
    message.error("Please fill in all required fields");
  };

  const handleCancel = () => {
    const nameOfExecutive = form.getFieldValue("name_of_executive");
    form.resetFields();
    if (nameOfExecutive) {
      form.setFieldValue("name_of_executive", nameOfExecutive);
    }
    setCommodities([]);
    setEquipmentRows([
      {
        id: 1,
        equipment_type: "",
        quantity: "",
        category: "",
        quote: "",
        cost: "",
      },
    ]);
    setTransportationRows([
      {
        id: 1,
        equipment_type: "",
        no_of_containers: "",
        category: "",
        placement_time: "",
        pickup_location: "",
        special_remarks: "",
      },
    ]);
    setAdditionalService(prev => ({ ...prev, showTransportation: false }));
  };

  const navigate = useNavigate();

  return (
    <div style={{ padding: "10px 20px", backgroundColor: "#eff8ff" }}>
      <Form
        layout="vertical"
        form={form}
        onFinish={onFinish}
        onFinishFailed={handleFinishFailed}
        initialValues={{
          export_created_date: dayjs(),
          created_by_name: user?.first_name ? `${user.first_name} ${user.last_name || ""}`.trim() : "",
        }}
      >
        <>
          {/* EXPORT DETAILS / HEADER */}
          <Card
            className={Styles.card}
            bordered
            title={
              <div
                onClick={() => setShowExportDetails((prev) => !prev)}
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
                    <Icon icon="basil:document-solid" width="18" height="18" />
                  </div>
                  <Typography.Title level={5} style={{ margin: 0 }}>
                    JOB HEADER
                  </Typography.Title>
                </Space>

                <span style={{ fontSize: 22, color: "#626161" }}>
                  {showExportDetails ? (
                    <Icon icon="grommet-icons:form-up" />
                  ) : (
                    <Icon icon="grommet-icons:form-down" />
                  )}
                </span>
              </div>
            }
          >
            <div style={{ display: showExportDetails ? "block" : "none" }}>
              <Row gutter={16}>
                <Col xs={24} md={24}>
                  <Form.Item
                    className={Styles.formLabel}
                    label="Job Type"
                    name="job_type"
                    rules={[{ required: true, message: "Required" }]}
                  >
                    <JobTypeSelect
                      className={Styles.bigJobSelect}
                      disabled={isReadOnly}
                    />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col xs={24} md={8}>
                  <Form.Item
                    className={Styles.formLabel}
                    label="Export Number"
                    name="export_number"
                  >
                    <Input disabled placeholder="N/A" />
                  </Form.Item>
                </Col>

                <Col xs={24} md={8}>
                  <Form.Item
                    className={Styles.formLabel}
                    label="Created Date"
                    name="export_created_date"
                  >
                    <DatePicker
                      format="DD-MM-YYYY"
                      placeholder="DD-MM-YYYY"
                      disabled={isReadOnly || true} // Created Date is usually system-managed or locked
                      style={{ width: "100%" }}
                    />
                  </Form.Item>
                </Col>

                <Col xs={24} md={8}>
                  <Form.Item
                    className={Styles.formLabel}
                    label="Created By"
                    name="created_by_name"
                  >
                    <Input disabled={isReadOnly || true} placeholder="Enter Export Created By" />
                  </Form.Item>
                </Col>
              </Row>
              {isHalted && (
                <Row gutter={16} style={{ marginTop: 16 }}>
                  <Col span={24}>
                    <Alert
                      message="Process Halted"
                      description={`This ${jobType} job cannot proceed because a mandatory workflow component has been marked as 'No'. Please verify with your supervisor.`}
                      type="warning"
                      showIcon
                    />
                  </Col>
                </Row>
              )}
            </div>
          </Card>


          {/* OTHERS SPECIFIC FIELDS */}
          <Form.Item noStyle shouldUpdate={(prevVal, curVal) => prevVal.job_type !== curVal.job_type}>
            {({ getFieldValue }) =>
              getFieldValue("job_type") === "OTHERS" ? (
                <Card
                  className={Styles.card}
                  bordered
                  title={
                    <Space align="center">
                      <div className={Styles.mainhead}>
                        <Icon icon="mdi:package-variant" width="18" height="18" />
                      </div>
                      <Typography.Title level={5} style={{ margin: 0 }}>
                        OTHERS JOB DETAILS
                      </Typography.Title>
                    </Space>
                  }
                >
                  <Row gutter={16}>
                    <Col xs={24} md={6}>
                      <Form.Item label="CARRIER" name="carrier_remarks" className={Styles.formLabel}>
                        <Input placeholder="Free text carrier" disabled={isReadOnly} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={6}>
                      <Form.Item label="VSL/VOY" name="vessel_voyage_remarks" className={Styles.formLabel}>
                        <Input placeholder="Free text vessel/voyage" disabled={isReadOnly} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={6}>
                      <Form.Item label="POL (Port of Loading)" name="pol_remarks" className={Styles.formLabel}>
                        <Input placeholder="Free text POL" disabled={isReadOnly} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={6}>
                      <Form.Item label="POD (Port of Discharge)" name="pod_remarks" className={Styles.formLabel}>
                        <Input placeholder="Free text POD" disabled={isReadOnly} />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Row gutter={16}>
                    <Col xs={24} md={12}>
                      <Form.Item label="FREIGHT MANIFEST" className={Styles.formLabel}>
                        <DocUploadField label="Freight Manifest" files={attachments.filter(d => d.doc_type === "FREIGHT MANIFEST")} setFiles={setAttachments} setPendingFiles={setPendingFiles} color="blue" onPreview={openPreview} salesInputId={id} category="others" docType="FREIGHT MANIFEST" disabled={isReadOnly} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item label="LOAD LIST UPLOADING" className={Styles.formLabel}>
                        <DocUploadField
                          label="Load List"
                          files={attachments.filter(d => d.doc_type === "LOAD LIST UPLOADING")}
                          setFiles={setAttachments}
                          setPendingFiles={setPendingFiles}
                          color="gold"
                          onPreview={openPreview}
                          salesInputId={id}
                          category="others"
                          docType="LOAD LIST UPLOADING"
                          disabled={isReadOnly}
                          user={user}
                          isAdmin={isAdmin}
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Row gutter={16}>
                    <Col xs={24} md={12}>
                      <Form.Item label="TDR/Sailing Report" className={Styles.formLabel}>
                        <DocUploadField label="Sailing Report" files={attachments.filter(d => d.doc_type === "TDR/SAILING REPORT")} setFiles={setAttachments} setPendingFiles={setPendingFiles} color="green" onPreview={openPreview} salesInputId={id} category="others" docType="TDR/SAILING REPORT" disabled={isReadOnly} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item label="OTHER DOCS" className={Styles.formLabel}>
                        <DocUploadField label="Other Docs" files={attachments.filter(d => d.doc_type === "OTHER DOCS")} setFiles={setAttachments} setPendingFiles={setPendingFiles} color="purple" onPreview={openPreview} salesInputId={id} category="others" docType="OTHER DOCS" disabled={isReadOnly} />
                      </Form.Item>
                    </Col>
                  </Row>
                </Card>
              ) : null
            }
          </Form.Item>
          {/* WORKFLOW STATUS (Parallel Indicators) */}
          {parseInt(currentStage) > 1 && (
            <Card className={Styles.card} bordered title="WORKFLOW STATUS">
              <Row gutter={16} justify="space-around">
                <Col>
                  <Space direction="vertical" align="center">
                    <Icon
                      icon={workflowStatus.is_hod_approved ? "mdi:check-circle" : "mdi:clock-outline"}
                      color={workflowStatus.is_hod_approved ? "#52c41a" : "#faad14"}
                      fontSize={24}
                    />
                    <Typography.Text strong>Sales HOD Approval</Typography.Text>
                    <Typography.Text type="secondary">{workflowStatus.is_hod_approved ? "Approved" : "Pending"}</Typography.Text>
                  </Space>
                </Col>
                <Col>
                  <Space direction="vertical" align="center">
                    <Icon
                      icon={workflowStatus.is_cs_updated ? "mdi:check-circle" : "mdi:clock-outline"}
                      color={workflowStatus.is_cs_updated ? "#52c41a" : "#faad14"}
                      fontSize={24}
                    />
                    <Typography.Text strong>CS Update</Typography.Text>
                    <Typography.Text type="secondary">{workflowStatus.is_cs_updated ? "Updated" : "Pending"}</Typography.Text>
                  </Space>
                </Col>
                <Col>
                  <Space direction="vertical" align="center">
                    <Icon
                      icon={workflowStatus.is_cnf_loadlist_uploaded ? "mdi:check-circle" : "mdi:lock"}
                      color={workflowStatus.is_cnf_loadlist_uploaded ? "#52c41a" : (workflowStatus.is_hod_approved && workflowStatus.is_cs_updated ? "#faad14" : "#bfbfbf")}
                      fontSize={24}
                    />
                    <Typography.Text strong>CNF Load List</Typography.Text>
                    <Typography.Text type="secondary">
                      {workflowStatus.is_cnf_loadlist_uploaded ? "Uploaded" : (
                        workflowStatus.is_hod_approved && workflowStatus.is_cs_updated ? "Ready to Upload" : "Blocked"
                      )}
                    </Typography.Text>
                  </Space>
                </Col>
              </Row>
            </Card>
          )}

          {/* BASIC INFO */}
          {!isOthers && (
            <Card
              className={Styles.card}
              bordered
              title={
                <div
                  onClick={() => setShowBasicInformation((prev) => !prev)}
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
                      <Icon
                        icon="carbon:information-filled"
                        width="18"
                        height="18"
                      />
                    </div>
                    <Typography.Title level={5} style={{ margin: 0 }}>
                      BASIC INFORMATION
                    </Typography.Title>
                  </Space>

                  {/* Optional arrow indicator */}
                  <span style={{ fontSize: 22, color: "#626161" }}>
                    {showBasicInformation ? (
                      <Icon icon="grommet-icons:form-up" />
                    ) : (
                      <Icon icon="grommet-icons:form-down" />
                    )}
                  </span>
                </div>
              }
            >
              <div style={{ display: showBasicInformation ? "block" : "none" }}>
                <Row gutter={16}>
                  <Col xs={24} md={6}>
                    <Form.Item
                      className={Styles.formLabel}
                      label="Carrier Name"
                      name="carrier_name"
                      rules={[{ required: !isOthers, message: "Required" }]}
                    >
                      <Input placeholder="Enter Carrier Name" disabled={isReadOnly} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={6}>
                    <Form.Item
                      className={Styles.formLabel}
                      label="Customer Name"
                      name="customer_name"
                      rules={[{ required: !isOthers, message: "Required" }]}
                    >
                      <Input placeholder="Enter Customer Name" disabled={isReadOnly} />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={6}>
                    <Form.Item
                      className={Styles.formLabel}
                      label="Contact PIC"
                      name="contact_pic"
                      rules={[{ required: !isOthers, message: "Required" }]}
                    >
                      <Input placeholder="Person in Charge" disabled={isReadOnly} />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col xs={24} md={6}>
                    <Form.Item className={Styles.formLabel} label="Commodity">
                      <Input
                        value={commodityInput}
                        onChange={(e) => setCommodityInput(e.target.value)}
                        onPressEnter={addCommodity}
                        placeholder="Type and Press Enter to add"
                        disabled={isReadOnly}
                        rules={[{ required: !isOthers, message: "Required" }]}
                      />
                      <Space wrap style={{ marginTop: 8 }}>
                        {commodities.map((c) => (
                          <Button
                            key={c}
                            size="small"
                            onClick={() => removeCommodity(c)}
                          >
                            {c} ✕
                          </Button>
                        ))}
                      </Space>
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={6}>
                    <Form.Item
                      className={Styles.formLabel}
                      label="E-mail"
                      name="email"
                    >
                      <Input placeholder="E-mail" disabled={isReadOnly} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={6}>
                    <Form.Item
                      className={Styles.formLabel}
                      label="Contact Details"
                      name="phone_no"
                    >
                      <Input placeholder="Phone Number" disabled={isReadOnly} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={6}>
                    <Form.Item
                      className={Styles.formLabel}
                      label="Agent"
                      name="agent"
                    >
                      <Input placeholder="Enter Agent Name" disabled={isReadOnly} />
                    </Form.Item>
                  </Col>
                  {isForwarding && (
                    <Col xs={24} md={6}>
                      <Form.Item
                        className={Styles.formLabel}
                        label="Overseas Agent Name"
                        name="overseas_agent_name"
                      >
                        <Input placeholder="Enter Overseas Agent Name" disabled={isReadOnly} />
                      </Form.Item>
                    </Col>
                  )}
                </Row>
              </div>
            </Card>
          )}

          {/* CONTAINER DETAILS */}
          {!isOthers && (
            <Card
              className={Styles.card}
              bordered
              title={
                <div
                  onClick={() => setShowContainerDetails((prev) => !prev)}
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
                      <Icon icon="octicon:container-24" width="20" height="20" />
                    </div>
                    <Typography.Title level={5} style={{ margin: 0 }}>
                      CONTAINER DETAILS
                    </Typography.Title>
                  </Space>

                  {/* Optional arrow indicator */}
                  <span style={{ fontSize: 22, color: "#626161" }}>
                    {showContainerDetails ? (
                      <Icon icon="grommet-icons:form-up" />
                    ) : (
                      <Icon icon="grommet-icons:form-down" />
                    )}
                  </span>
                </div>
              }
            >
              <div style={{ display: showContainerDetails ? "block" : "none" }}>
                <Form.List name="equipmentRows">
                  {(fields, { add, remove }) => (
                    <>
                      {fields.length === 0 && add()}
                      {fields.map(({ key, name, ...restField }) => (
                        <Row gutter={16} key={key} align="middle">
                          {/* Hidden ID field to preserve row identity */}
                          <Form.Item name={[name, "id"]} hidden>
                            <Input />
                          </Form.Item>
                          <Col xs={24} md={5}>
                            <Form.Item
                              className={Styles.formLabel}
                              {...restField}
                              name={[name, "equipment_type"]}
                              label="Equipment Type"
                              rules={[{ required: !isOthers, message: "Required" }]}
                            >
                              <EquipmentTypeSelect disabled={isReadOnly} />
                            </Form.Item>
                          </Col>

                          <Col xs={24} md={4}>
                            <Form.Item
                              className={Styles.formLabel}
                              {...restField}
                              name={[name, "quantity"]}
                              label="Volume"
                            >
                              <Input placeholder="Qty" disabled={isReadOnly} />
                            </Form.Item>
                          </Col>

                          <Col xs={24} md={5}>
                            <Form.Item
                              className={Styles.formLabel}
                              {...restField}
                              name={[name, "category"]}
                              label="Category"
                            >
                              <CategorySelect disabled={isReadOnly} />
                            </Form.Item>
                          </Col>

                          <Col xs={24} md={4}>
                            <Form.Item
                              className={Styles.formLabel}
                              {...restField}
                              name={[name, "quote"]}
                              label="Quote"
                            >
                              <TextArea placeholder="Quote" disabled={isReadOnly} autoSize={{ minRows: 1 }} />
                            </Form.Item>
                          </Col>

                          <Col xs={24} md={4}>
                            <Form.Item
                              className={Styles.formLabel}
                              {...restField}
                              name={[name, "cost"]}
                              label="Cost"
                            >
                              <TextArea placeholder="Cost" disabled={isReadOnly} autoSize={{ minRows: 1 }} />
                            </Form.Item>
                          </Col>

                          <Col xs={24} md={1}>
                            {!isReadOnly && (
                              <Button
                                danger
                                style={{ marginTop: "1rem" }}
                                disabled={fields.length <= 1}
                                icon={<DeleteOutlined />}
                                onClick={() => remove(name)}
                              />
                            )}
                          </Col>
                          <Col xs={24} md={1}>
                            {!isReadOnly && (
                              <Button
                                type="primary"
                                style={{ marginTop: "1rem" }}
                                icon={<PlusOutlined />}
                                onClick={() => add()}
                                block
                              />
                            )}
                          </Col>
                        </Row>
                      ))}
                    </>
                  )}
                </Form.List>
                <Row gutter={16}>
                  <Col xs={24} md={24}>
                    <Form.Item
                      className={Styles.formLabel}
                      label="Other Charges"
                      name="other_charges_remarks"
                    // rules={[{ required: true, message: "Required" }]}
                    >
                      <TextArea placeholder="Enter any additional charges or fees" disabled={isReadOnly} />
                    </Form.Item>
                  </Col>
                </Row>
              </div>
            </Card>
          )}


          {/* SHIPMENT DETAILS */}
          {!isOthers && (
            <Card
              className={Styles.card}
              bordered
              title={
                <div
                  onClick={() => setShowShipmentDetails((prev) => !prev)}
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
                      <Icon icon="mingcute:ship-fill" width="18" height="18" />
                    </div>
                    <Typography.Title level={5} style={{ margin: 0 }}>
                      SHIPMENT DETAILS
                    </Typography.Title>
                  </Space>

                  {/* Optional arrow indicator */}
                  <span style={{ fontSize: 22, color: "#626161" }}>
                    {showShipmentDetails ? (
                      <Icon icon="grommet-icons:form-up" />
                    ) : (
                      <Icon icon="grommet-icons:form-down" />
                    )}
                  </span>
                </div>
              }
            >
              <div style={{ display: showShipmentDetails ? "block" : "none" }}>
                <Row gutter={16}>
                  <Col xs={24} md={6}>
                    <Form.Item
                      className={Styles.formLabel}
                      label="Port Of Loading"
                      name="port_of_loading"
                      rules={[{ required: !isOthers, message: "Required" }]}
                    >
                      <Input placeholder="Port of Loading" disabled={isReadOnly} />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={6}>
                    <Form.Item
                      className={Styles.formLabel}
                      label="Port Of Discharge"
                      name="port_of_discharge"
                      rules={[{ required: !isOthers, message: "Required" }]}
                    >
                      <Input placeholder="Port of Disacharge" disabled={isReadOnly} />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={6}>
                    <Form.Item
                      className={Styles.formLabel}
                      label="Final Port Of Discharge"
                      name="final_pod"
                      rules={[{ required: !isOthers, message: "Required" }]}
                    >
                      <Input
                        placeholder="Final Port Of Discharge"
                        disabled={isReadOnly}
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={6}>
                    <Form.Item
                      className={Styles.formLabel}
                      label="Terms of Shipment"
                      name="terms_of_shipment"
                      rules={[{ required: !isOthers, message: "Required" }]}
                    >
                      <TermsOfShipmentSelect
                        disabled={isReadOnly}
                      />
                    </Form.Item>
                  </Col>

                </Row>

                    {/* vsl_initial_eta, vsl_latest_eta, vsl_etd, pod_eta relocated to Approval Page per PRD */}

                <Row gutter={16}>
                  <Col xs={24} md={6}>
                    <Form.Item
                      className={Styles.formLabel}
                      label="Haulier Code"
                      name="haulier_code"
                      rules={[{ required: !isOthers, message: "Required" }]}
                    >
                      <Input placeholder="Enter Code" disabled={isReadOnly} />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={18}>
                    <Form.Item
                      className={Styles.formLabel}
                      label="Remarks"
                      name="remarks"
                    >
                      <TextArea placeholder="Enter Remarks" />
                    </Form.Item>
                  </Col>
                  {jobTypeWatch !== 'LINER' && jobTypeWatch !== 'liner' && (
                    <Col xs={24} md={3}>
                      <Checkbox
                        disabled={isReadOnly}
                        checked={additionalService.hbl}
                        onChange={(e) =>
                          setAdditionalService((prev) => ({
                            ...prev,
                            hbl: e.target.checked,
                          }))
                        }
                      >
                        HBL
                      </Checkbox>
                    </Col>
                  )}
                  <Col xs={24} md={3}>
                    <Checkbox
                      disabled={isReadOnly}
                      checked={additionalService.fac}
                      onChange={(e) =>
                        setAdditionalService((prev) => ({
                          ...prev,
                          fac: e.target.checked,
                        }))
                      }
                    >
                      FAC
                    </Checkbox>
                  </Col>
                  <Col xs={24} md={6}>
                    <Checkbox
                      disabled={isReadOnly}
                      checked={additionalService.documentation}
                      onChange={(e) =>
                        setAdditionalService((prev) => ({
                          ...prev,
                          documentation: e.target.checked,
                        }))
                      }
                    >
                      DOCUMENTATION
                    </Checkbox>
                  </Col>
                  <Col xs={24} md={6}>
                    <Checkbox
                      disabled={isReadOnly}
                      checked={additionalService.showTransportation}
                      onChange={(e) => {
                        setAdditionalService((prev) => ({
                          ...prev,
                          showTransportation: e.target.checked,
                        }));
                        if (e.target.checked) {
                          const current = form.getFieldValue("transportationRows") || [];
                          if (current.length === 0) {
                            form.setFieldsValue({ transportationRows: [{}] });
                          }
                        }
                      }}
                    >
                      TRANSPORTATION
                    </Checkbox>
                  </Col>
                </Row>


                <Row gutter={16}>
                  <Col xs={24} md={24}>
                    <Form.Item
                      className={Styles.formLabel}
                      label="SPECIAL INSTRUCTION IF ANY"
                      name="special_instructions"
                    >
                      <TextArea placeholder="Enter any special instructions or requirements..." disabled={isReadOnly} />
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

                  <Col xs={24} md={12}>
                    <Form.Item
                      className={Styles.formLabel}
                      label="Name of Sales HOD"
                      name="sales_hod"
                      rules={[{ required: !isOthers, message: "Required" }]}
                    >
                      <Select
                        placeholder="Select Sales HOD"
                        disabled={isReadOnly}
                        options={hodOptions}
                        showSearch
                        optionFilterProp="label"
                      />
                    </Form.Item>
                  </Col>
                </Row>
              </div>
            </Card>
          )}
          {additionalService.showTransportation && !isOthers && (
            <Card
              className={Styles.card}
              bordered
              title={
                <Space align="center">
                  <div className={Styles.mainhead}>
                    <Icon
                      icon="hugeicons:delivery-truck-02"
                      width="19"
                      height="19"
                    />
                  </div>
                  <Typography.Title level={5} style={{ margin: 0 }}>
                    Transportation
                  </Typography.Title>
                </Space>
              }
            >
              <Form.List name="transportationRows">
                {(fields, { add, remove }) => (
                  <>
                    {fields.map(({ key, name, ...restField }) => (
                      <Row gutter={16} key={key} align="middle">
                        {/* Hidden ID field to preserve row identity */}
                        <Form.Item name={[name, "id"]} hidden>
                          <Input />
                        </Form.Item>
                        <Col xs={24} md={4}>
                          <Form.Item
                            className={Styles.formLabel}
                            {...restField}
                            name={[name, "equipment_type"]}
                            label="Equipment Type"
                            rules={[{ required: !isOthers, message: "Required" }]}
                          >
                            <EquipmentTypeSelect disabled={isReadOnly} />
                          </Form.Item>
                        </Col>

                        <Col xs={24} md={3}>
                          <Form.Item
                            className={Styles.formLabel}
                            {...restField}
                            name={[name, "no_of_containers"]}
                            label="No. Of Containers"
                          >
                            <Input placeholder="Qty" disabled={isReadOnly} />
                          </Form.Item>
                        </Col>
                        <Col xs={24} md={4}>
                          <Form.Item
                            className={Styles.formLabel}
                            {...restField}
                            name={[name, "category"]}
                            label="Category"
                          >
                            <CategorySelect disabled={isReadOnly} />
                          </Form.Item>
                        </Col>

                        <Col xs={24} md={4}>
                          <Form.Item
                            className={Styles.formLabel}
                            {...restField}
                            name={[name, "placement_time"]}
                            label="Placement Date & Time"
                          >
                            <DatePicker
                            showTime={{ defaultValue: dayjs() }}
                              format="DD-MM-YYYY HH:mm:ss"
                              placeholder="DD-MM-YYYY HH:mm:ss"
                              style={{ width: "100%" }}
                              disabled={isReadOnly}
                            />
                          </Form.Item>
                        </Col>

                        <Col xs={24} md={4}>
                          <Form.Item
                            className={Styles.formLabel}
                            {...restField}
                            name={[name, "pickup_location"]}
                            label="Pickup/Delivery Location"
                          >
                            <Input placeholder="Location" disabled={isReadOnly} />
                          </Form.Item>
                        </Col>

                        <Col xs={24} md={3}>
                          <Form.Item
                            className={Styles.formLabel}
                            {...restField}
                            name={[name, "special_remarks"]}
                            label="Special Remarks"
                          >
                            <TextArea placeholder="CFS Stuffing, WA" disabled={isReadOnly} autoSize={{ minRows: 1 }} />
                          </Form.Item>
                        </Col>

                        <Col xs={24} md={1}>
                          {!isReadOnly && (
                            <Button
                              danger
                              style={{ marginTop: "1rem" }}
                              disabled={fields.length <= 1}
                              icon={<DeleteOutlined />}
                              onClick={() => remove(name)}
                            />
                          )}
                        </Col>
                      </Row>
                    ))}
                    {!isReadOnly && (
                      <Button
                        type="dashed"
                        onClick={() => add()}
                        block
                        icon={<Icon icon="mdi:plus" />}
                        style={{ marginTop: 16 }}
                      >
                        Add Transportation Detail
                      </Button>
                    )}
                  </>
                )}
              </Form.List>
            </Card>
          )}

          {/* AUDIT TRAIL / APPROVAL HISTORY */}
          {approvalHistory.length > 0 && (
            <Card
              className={Styles.card}
              bordered
              title={
                <Space align="center">
                  <div className={Styles.mainhead}>
                    <Icon icon="mdi:history" width="18" height="18" />
                  </div>
                  <Typography.Title level={5} style={{ margin: 0 }}>
                    AUDIT TRAIL
                  </Typography.Title>
                </Space>
              }
            >
              <Timeline
                mode="left"
                items={approvalHistory.map((item) => ({
                  children: (
                    <div style={{ marginBottom: "1rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <Typography.Text strong style={{ fontSize: "14px" }}>{item.stage}</Typography.Text>
                        <Typography.Text type="secondary" style={{ fontSize: "12px" }}>
                          {dayjs(item.created_at).format("DD MMM YYYY HH:mm")}
                        </Typography.Text>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
                        <Tag color={item.status === "Approved" ? "success" : item.status === "Rejected" ? "error" : "processing"}>
                          {item.status.toUpperCase()}
                        </Tag>
                        <Typography.Text type="secondary" style={{ fontSize: "12px" }}>
                          by {item.updated_by_name}
                        </Typography.Text>
                      </div>
                      {item.remarks && item.remarks !== "N/A" && (
                        <div style={{ marginTop: "8px", backgroundColor: "#f9fafb", padding: "8px 12px", borderRadius: "6px", border: "1px solid #f0f0f0", fontSize: "13px" }}>
                          {item.remarks}
                        </div>
                      )}
                    </div>
                  ),
                  color: item.status === "Approved" ? "green" : item.status === "Rejected" ? "red" : "blue",
                }))}
              />
            </Card>
          )}

          {/* ════════ ATTACHMENTS AND COMMENTS (Universal) ════════ */}
          <Card
            className={Styles.card}
            bordered
            title={
              <Space align="center">
                <div className={Styles.mainhead}>
                  <Icon icon="mdi:comment-text-multiple-outline" width="18" height="18" />
                </div>
                <Typography.Title level={5} style={{ margin: 0 }}>
                  ATTACHMENTS AND COMMENTS
                </Typography.Title>
              </Space>
            }
          >
            <div>
              <Row gutter={32}>
                <Col xs={24} md={isOthers ? 24 : 12}>
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
                        <p style={{ margin: 0, fontSize: 13, color: '#1f2937' }}>{typeof r === 'object' ? r.text : r}</p>
                        {typeof r === 'object' && r.user_name && (
                          <Typography.Text type="secondary" style={{ fontSize: '10px', display: 'block', marginTop: 4 }}>
                            — {r.user_name} {r.date ? `on ${dayjs(r.date).format("DD MMM YY HH:mm")}` : ""}
                          </Typography.Text>
                        )}
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
                  <DocUploadField
                    label="Attachment"
                    files={attachments.filter(d => d.doc_type === "Attachment")}
                    setFiles={setAttachments}
                    setPendingFiles={setPendingFiles}
                    color="blue"
                    onPreview={openPreview}
                    salesInputId={id}
                    category="attachments"
                    docType="Attachment"
                    user={user}
                    isAdmin={isAdmin}
                  />
                </Col>
              </Row>
            </div>
          </Card>

          {!isReadOnly && (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: 12,
                flexWrap: "wrap",
                width: "100%",
                marginTop: "1rem",
              }}
            >
              <Button
                icon={<Icon icon="mdi:tick-circle" />}
                type="primary"
                onClick={() => form.validateFields().then(values => onFinish(values, "submitted"))}
                loading={loading}
              >
                Submit
              </Button>
              <Button
                icon={<Icon icon="mdi:content-save-edit" />}
                type="primary"
                onClick={() => onFinish(form.getFieldsValue(), "draft")}
                loading={loading}
              >
                Save Draft
              </Button>
              <Button
                icon={<Icon icon="tabler:refresh" />}
                type="primary"
                onClick={handleCancel}
                disabled={loading}
              >
                Refresh
              </Button>
            </div>
          )}
          {isReadOnly && (
            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
              <Typography.Text type="secondary" italic>
                This job is currently in the approval workflow and is read-only.
              </Typography.Text>
            </div>
          )}
        </>
      </Form>

      {/* ════════ PREVIEW MODAL ════════ */}
      {/* <Modal
        open={previewVisible}
        footer={null}
        title={"Document Preview"}
        onCancel={() => setPreviewVisible(false)}
        width="90%"
        style={{ top: 20 }}
        styles={{ body: { height: "87vh", padding: 0 } }}
        destroyOnClose
      >
        {previewVisible && previewUrls.length > 0 && (
          // <MultiFileViewer urls={previewUrls} defaultIndex={previewIndex} />
          <MultiFileViewer files={previewFiles} defaultIndex={previewIndex} />
        )}
      </Modal> */}
      <Modal
        open={previewVisible}
        footer={null}
        title="Document Preview"
        onCancel={() => setPreviewVisible(false)}
        width="90%"
        style={{ top: 20 }}
        bodyStyle={{ height: "87vh", padding: 0 }}
        destroyOnClose
      >
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
    </div>
  );
};

export default SalesInput;
