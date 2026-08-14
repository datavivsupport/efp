import React, { useEffect, useRef, useState } from "react";
import {
  Avatar,
  Button,
  Card,
  Col,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Typography,
  Upload,
  message,
} from "antd";
import { Icon } from "@iconify/react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router";
import apiClient from "../../api/apiclient";
import { uploadFile } from "../../Components/Viewer/UploadUtil";
import { setUser } from "../../store/authSlice";
import {
  getRoleNamesWithComma,
  normalizeDepartments,
  normalizeDivision,
} from "../../utils/roleFormat";

const { Text, Title } = Typography;

const UpdateProfile = () => {
  const [form] = Form.useForm();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const storedUser = useSelector((state) => state.auth.user);

  const [profile, setProfileData] = useState(null);
  const [divisionName, setDivisionName] = useState("");
  const [departmentNames, setDepartmentNames] = useState([]);
  const [profilePic, setProfilePic] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isMfaVerified, setIsMfaVerified] = useState(false);

  
  const [mfaModal, setMfaModal] = useState(false);
  const [qrCode, setQrCode] = useState("");
  const [otp, setOtp] = useState("");
  const [verifying, setVerifying] = useState(false);

  const previewUrlRef = useRef("");
  const hydratedRef = useRef(false);

  const setPreview = (url) => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = url.startsWith("blob:") ? url : "";
    setProfilePic(url);
  };

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);


  // Fills the form and summary from a user payload. Shared by the store
  // hydration below and by the refetch that follows a save or MFA change.
  const applyProfile = (data) => {
    if (!data) return;

    form.setFieldsValue({
      ...data,
      roles: getRoleNamesWithComma(data.roles),
    });

    setProfileData(data);
    setIsMfaVerified(Boolean(data.is_mfa_verified));

    if (data.profile_picture) setPreview(data.profile_picture);

    resolveDepartments(data.departments_assigned);
    resolveDivision(data.divison ?? data.division);
  };

  const getProfile = async (syncStore = false) => {
    try {
      const res = await apiClient.get("/accounts/me");
      const data = res.data?.data;
      if (!data) return;

      applyProfile(data);

      if (syncStore) dispatch(setUser(data));
    } catch {
      
    }
  };

 
  const resolveDepartments = async (raw) => {
    const { ids, names } = normalizeDepartments(raw);

    if (names.length) {
      setDepartmentNames(names);
      return;
    }
    if (!ids.length) {
      setDepartmentNames([]);
      return;
    }

    try {
      const responses = await Promise.all(
        ids.map((id) => apiClient.get(`/accounts/master/Department/${id}/`)),
      );
      setDepartmentNames(responses.map((r) => r.data?.name).filter(Boolean));
    } catch {
      setDepartmentNames([]);
    }
  };

  const resolveDivision = async (raw) => {
    const { id, name } = normalizeDivision(raw);

    if (name) {
      setDivisionName(name);
      return;
    }
    if (!id) {
      setDivisionName("");
      return;
    }

    try {
      const res = await apiClient.get(`/accounts/master/division/${id}/`);
      setDivisionName(res.data?.name || "");
    } catch {
      setDivisionName("");
    }
  };

  // main.jsx's authLoader already fetched /accounts/me and put the user in the
  // store before this route could render, so reuse that instead of asking for
  // the same payload again. Guarded by a ref so StrictMode's double-invoke —
  // and any later store update, e.g. the dispatch after a save — can't re-run
  // it and stomp on whatever is currently in the form.
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;

    if (storedUser) applyProfile(storedUser);
    else getProfile(); // defensive: loader guarantees a user, but don't render an empty form
  }, [storedUser]);


  const onFinish = async (values) => {
    try {
      setLoading(true);

      let uploadedUrl = profilePic;
      if (selectedFile) {
        uploadedUrl = await uploadFile([selectedFile]);
      }


      const { ids: departmentIds } = normalizeDepartments(
        values.departments_assigned,
      );
      const { id: divisionId } = normalizeDivision(
        values.divison ?? values.division,
      );

      await apiClient.post("/accounts/me", {
        first_name: values.first_name,
        last_name: values.last_name,
        profile_picture: uploadedUrl,
        is_leave: values.is_leave,
        phone: values.phone,
        departments_assigned: departmentIds,
        divisions: divisionId,
      });

      setPreview(uploadedUrl || "");
      setSelectedFile(null);

      await getProfile(true);
      message.success("Profile updated successfully!");
    } catch {
      // handled by the interceptor
    } finally {
      setLoading(false);
    }
  };


  const beforeUpload = (file) => {
    if (!file.type.startsWith("image/")) {
      message.error("You can only upload image files!");
      return Upload.LIST_IGNORE;
    }
    if (file.size / 1024 / 1024 >= 5) {
      message.error("Image must be smaller than 5MB!");
      return Upload.LIST_IGNORE;
    }
    return false;
  };

  const handleChange = (info) => {
    const file = info.fileList.slice(-1)[0];
    if (!file) return;

    setSelectedFile(file);
    setPreview(
      file.originFileObj ? URL.createObjectURL(file.originFileObj) : "",
    );
  };


  const openMfaModal = async () => {
    setOtp("");
    setQrCode("");
    setMfaModal(true);
    try {
      const res = await apiClient.get("/accounts/get_mfa");
      setQrCode("data:image/png;base64," + res.data.image);
    } catch {
      
    }
  };

  const verifyMfa = async (value = otp) => {
    if (!value || value.length !== 6) {
      message.error("Enter a valid 6-digit code");
      return;
    }

    try {
      setVerifying(true);
      await apiClient.post("/accounts/verify_mfa", { token: value });
      message.success("MFA setup successful!");
      setMfaModal(false);
      // syncStore, or the store keeps is_mfa_verified: false and a later
      // remount hydrates the page back to "MFA not set up".
      await getProfile(true);
    } catch {
      // handled by the interceptor
    } finally {
      setVerifying(false);
    }
  };

  const disabledFieldStyle = { backgroundColor: "#f8fafc" };

  return (
    <div style={{ padding: "20px", backgroundColor: "#eff8ff", minHeight: "100vh" }}>
      <div style={{ minWidth: "385px", maxWidth: "1024px", margin: "0 auto" }}>
        <Card
          variant="outlined"
          style={{
            borderRadius: 16,
            overflow: "hidden",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
            backgroundColor: "#eff8ff",
          }}
          styles={{ body: { padding: 0 } }}
        >
          {/* Header */}
          <div
            style={{
              background: "linear-gradient(to right, #003a75, #19d0c6)",
              padding: "12px 20px",
            }}
          >
            <Button
              type="primary"
              icon={<Icon icon="mdi:arrow-left" width="16" height="16" />}
              onClick={() => navigate(-1)}
              style={{
                fontSize: "16px",
                marginBottom: "0.5rem",
                height: "35px",
                border: "2px solid #19D0C6",
              }}
            >
              Back
            </Button>
            <Title level={2} style={{ color: "white", margin: 0 }}>
              Update Profile
            </Title>
            <Text style={{ color: "#bfdbfe", fontSize: 14 }}>
              Manage your account information
            </Text>
          </div>

          <div style={{ padding: 24 }}>
            {/* Avatar + summary */}
            <div
              style={{
                display: "flex",
                gap: "32px",
                marginBottom: "32px",
                paddingBottom: "32px",
                borderBottom: "1px solid #e2e8f0",
                flexWrap: "wrap",
              }}
            >
              <div style={{ position: "relative" }}>
                <Avatar
                  size={128}
                  src={profilePic || undefined}
                  icon={
                    !profilePic ? (
                      <Icon icon="mdi:account" width="64" height="64" />
                    ) : undefined
                  }
                  style={{
                    border: "4px solid white",
                    boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                  }}
                />
                <Upload
                  maxCount={1}
                  showUploadList={false}
                  beforeUpload={beforeUpload}
                  onChange={handleChange}
                  accept="image/jpeg,image/png"
                >
                  <Button
                    type="primary"
                    shape="circle"
                    size="large"
                    icon={<Icon icon="mdi:camera" width="18" height="18" />}
                    style={{
                      position: "absolute",
                      bottom: 0,
                      right: 0,
                      boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                    }}
                  />
                </Upload>
              </div>

              <div style={{ flex: 1, minWidth: 240 }}>
                <Title
                  level={4}
                  style={{ margin: 0, marginBottom: "4px", marginTop: "1.3rem" }}
                >
                  {profile
                    ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim()
                    : "Loading..."}
                </Title>
                <Text
                  type="secondary"
                  style={{ display: "block", marginBottom: "12px" }}
                >
                  {profile ? getRoleNamesWithComma(profile.roles) : "Loading..."}
                </Text>
                <Space>
                  <Icon icon="mdi:email" style={{ color: "#64748b" }} />
                  <Text type="secondary">
                    {profile ? profile.email : "Loading..."}
                  </Text>
                </Space>
                <div
                  style={{
                    marginTop: "12px",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    flexWrap: "wrap",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: 600,
                      color: isMfaVerified ? "#10b981" : "#ef4444",
                    }}
                  >
                    {isMfaVerified ? "MFA Enabled ✓" : "MFA Disabled"}
                  </Text>
                  {!isMfaVerified && (
                    <Button size="small" onClick={openMfaModal}>
                      Enable MFA
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Form */}
            <Form form={form} layout="vertical" onFinish={onFinish}>
              <Space direction="vertical" size="large" style={{ width: "100%" }}>
                <div>
                  <Title level={5} style={{ marginBottom: 16 }}>
                    <Icon
                      icon="mdi:account"
                      style={{ marginRight: 8, verticalAlign: "-3px" }}
                    />
                    Personal Information
                  </Title>

                  <Row gutter={16}>
                    <Col xs={24} md={12}>
                      <Form.Item
                        name="first_name"
                        label="First Name"
                        rules={[{ required: true, message: "Enter First Name" }]}
                      >
                        <Input size="large" placeholder="Enter First Name" />
                      </Form.Item>
                    </Col>

                    <Col xs={24} md={12}>
                      <Form.Item
                        name="last_name"
                        label="Last Name"
                        rules={[{ required: true, message: "Enter Last Name" }]}
                      >
                        <Input size="large" placeholder="Enter Last Name" />
                      </Form.Item>
                    </Col>

                    <Col xs={24} md={12}>
                      <Form.Item name="email" label="Email">
                        <Input
                          size="large"
                          prefix={<Icon icon="mdi:email" />}
                          disabled
                          style={disabledFieldStyle}
                        />
                      </Form.Item>
                    </Col>

                    <Col xs={24} md={12}>
                      <Form.Item name="roles" label="Roles">
                        <Input size="large" disabled style={disabledFieldStyle} />
                      </Form.Item>
                    </Col>

                    <Col xs={24} md={12}>
                      <Form.Item
                        name="is_leave"
                        label="Status"
                        rules={[{ required: true, message: "Select status" }]}
                      >
                        <Select
                          size="large"
                          placeholder="Select your status"
                          options={[
                            { value: false, label: "Available" },
                            { value: true, label: "On Leave" },
                          ]}
                        />
                      </Form.Item>
                    </Col>

                    <Col xs={24} md={12}>
                      <Form.Item name="phone" label="Phone No.">
                        <Input
                          size="large"
                          prefix={<Icon icon="mdi:phone" />}
                          placeholder="Phone No."
                          style={disabledFieldStyle}
                        />
                      </Form.Item>
                    </Col>

                    <Col xs={24} md={12}>
                      <Form.Item label="Division">
                        <Input
                          size="large"
                          value={divisionName}
                          disabled
                          style={disabledFieldStyle}
                        />
                      </Form.Item>
                    </Col>

                    <Col xs={24} md={12}>
                      <Form.Item label="Department">
                        <Space wrap>
                          {departmentNames.map((name) => (
                            <Button
                              key={name}
                              size="small"
                              disabled
                              style={{ color: "black" }}
                            >
                              {name}
                            </Button>
                          ))}
                        </Space>
                      </Form.Item>
                    </Col>
                  </Row>
                </div>

                <Row justify="end" style={{ paddingTop: 16, alignItems: "center", gap: "10px" }}>
                  <Col>
                    <Button
                      type="primary"
                      htmlType="submit"
                      size="large"
                      loading={loading}
                      style={{ height: 48, borderRadius: 8, fontWeight: 600 }}
                    >
                      Save Changes
                    </Button>
                  </Col>
                </Row>
              </Space>
            </Form>
          </div>
        </Card>
      </div>

      {/* MFA setup */}
      <Modal
        open={mfaModal}
        onCancel={() => setMfaModal(false)}
        footer={null}
        centered
        width={400}
      >
        <h3 style={{ textAlign: "center", marginBottom: 10, fontWeight: "bold" }}>
          Microsoft Authenticator Setup
        </h3>

        <div style={{ textAlign: "center", marginBottom: 20 }}>
          {qrCode ? (
            <img src={qrCode} alt="MFA QR" style={{ width: 180, height: 180 }} />
          ) : (
            <p>Loading QR...</p>
          )}
        </div>

        <Input.OTP
          length={6}
          value={otp}
          autoFocus
          size="large"
          style={{ display: "flex", justifyContent: "center", gap: "8px" }}
          onInput={(value) => {
            const joined = value.join("");
            setOtp(joined);
            if (joined.length === 6 && !verifying) verifyMfa(joined);
          }}
        />

        <Button
          type="primary"
          block
          size="large"
          loading={verifying}
          style={{ marginTop: 20, height: 45 }}
          onClick={() => verifyMfa()}
        >
          Verify &amp; Enable MFA
        </Button>
      </Modal>
    </div>
  );
};

export default UpdateProfile;
