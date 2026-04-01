import { Button, Form, Input } from "antd";
import ErrorComponent from "../../Components/ErrorComponent";
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import styles from "./login.module.css";
import apiClient from "../../api/apiclient";
import { Icon } from "@iconify/react";
import { AxiosError } from "axios";

const avoid = ["/login", "/mfa", "/sign-up"];

const MFA = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const params = new URLSearchParams(location.search);
  const redirect = params.get("redirect");
  const mode = params.get("mode") || "verify"; // verify | setup

  const [otp, setOtp] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [showError, setShowError] = useState("");

  const hasVerified = useRef(false);

  useEffect(() => {
    if (mode === "setup") {
      getQrCode();
    }
  }, [mode]);

  //   const getLevel = async () => {
  //     try {
  //       const [levelsRes, userRes] = await Promise.all([
  //         apiClient.get("/accounts/approval_levels"),
  //         apiClient.get("/accounts/me"),
  //       ]);

  //       const msg =
  //         mode === "setup"
  //           ? "MFA enabled successfully!"
  //           : "Verification successful!";

  //       const approvalLevels = levelsRes.data.filter(
  //         (item) => item.level >= 1 && item.level <= 5
  //       );

  //       const currentUser = userRes.data.data?.roles || [];
  //       const roleIds = currentUser.map((item) => item.id);

  //       const filtered = approvalLevels.filter((item) =>
  //         item.roles?.some((role) => roleIds.includes(role.id))
  //       );

  //       const lastMatch = filtered[filtered.length - 1];

  //       if (lastMatch?.level >= 1 && lastMatch?.level <= 5) {
  //         navigate("/invoice-approval", {
  //           state: { message: msg },
  //         });
  //       } else {
  //         navigate("/dashboard", {
  //           state: { message: msg },
  //         });
  //       }
  //     } catch (error) {
  //       console.error("Error fetching approval data:", error);
  //       setLoading(false);
  //     }
  //   };

  const getQrCode = async () => {
    try {
      const res = await apiClient.get("/accounts/get_mfa");
      setQrCode("data:image/png;base64," + res.data.image);
    } catch {
      setShowError("Failed to load QR code");
    }
  };

  /* ----------------------------
     Verify OTP
  ----------------------------- */
  const handleVerify = async (value) => {
    if (value.length !== 6) {
      setShowError("Please enter a valid 6-digit OTP!");
      setTimeout(() => setShowError(""), 3000);
      return;
    }

    if (hasVerified.current) return;
    hasVerified.current = true;

    try {
      setLoading(true);

      await apiClient.post("/accounts/verify_mfa", {
        token: value,
      });

      if (redirect && !avoid.includes(redirect)) {
        navigate(redirect, {
          state: { message: "Login successful!" },
        });
      } else {
        navigate("/dashboard", {
          state: { message: "Login successful!" },
          replace: true,
        });
        //   await getLevel();
      }
    } catch (err) {
      const message = err?.response?.data?.msg || "Invalid OTP";
      setShowError(message || "Invalid OTP");
      setTimeout(() => setShowError(""), 5000);
      setLoading(false);
      hasVerified.current = false;
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.loginPage}>
        <div className={styles.loginContainer}>
          <div className={styles.loginLeft}>
            <div className={styles.loginHeader}>
              <div
                className={styles.loginLogo}
                style={{
                  padding: "3px",
                  borderRadius: "20px",
                  marginBottom: "24px",
                  boxShadow: "0 8px 24px rgba(102, 126, 234, 0.3)",
                  animation: "pulse 2s ease-in-out infinite",
                }}
              >
                <Icon
                  icon="material-symbols:shield-lock-outline"
                  width="48"
                  height="48"
                  color="#ffff"
                />
              </div>

              <h1
                className={styles.loginTitle}
                style={{ marginBottom: "8px", fontSize: "28px" }}
              >
                {mode === "setup"
                  ? "Setup Two-Factor Authentication"
                  : "Two-Factor Authentication"}
              </h1>

              <p
                className={styles.loginSubtitle}
                style={{ fontSize: "15px", opacity: 0.7 }}
              >
                {mode === "setup"
                  ? "Scan the QR code using Microsoft Authenticator"
                  : "Enter the 6-digit code from your authenticator app"}
              </p>
            </div>

            <ErrorComponent showError={showError} />

            {mode === "setup" && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  marginTop: "24px",
                  marginBottom: "16px",
                }}
              >
                {qrCode ? (
                  <img
                    src={qrCode}
                    alt="MFA QR"
                    style={{ width: 180, height: 180, display: "block" }}
                  />
                ) : (
                  <p>Loading QR code...</p>
                )}
              </div>
            )}

            <Form layout="vertical" style={{ marginTop: "40px" }}>
              <Form.Item
                style={{ display: "flex", justifyContent: "center" }}
                label={
                  <span style={{ fontSize: "14px", fontWeight: 500 }}>
                    Verification Code
                  </span>
                }
              >
                <Input.OTP
                  length={6}
                  value={otp}
                  autoFocus
                  size="large"
                  style={{
                    marginBottom: 24,
                    display: "flex",
                    justifyContent: "center",
                    gap: "12px",
                  }}
                  onKeyDown={(e) => {
                    const key = e.key;
                    if (
                      !/^[0-9]$/.test(key) &&
                      ![
                        "Backspace",
                        "Delete",
                        "ArrowLeft",
                        "ArrowRight",
                        "Tab",
                      ].includes(key)
                    ) {
                      e.preventDefault();
                    }
                  }}
                  onInput={(value) => {
                    const joined = value.join("");
                    setOtp(joined);
                    if (joined.length === 6 && !loading) {
                      handleVerify(joined);
                    }
                  }}
                />
              </Form.Item>

              <Button
                type="primary"
                size="large"
                block
                loading={loading}
                onClick={() => handleVerify(otp)}
                style={{
                  height: "48px",
                  fontSize: "16px",
                  fontWeight: 500,
                  borderRadius: "8px",
                  boxShadow: "0 4px 15px rgba(102, 126, 234, 0.4)",
                  marginBottom: "10px",
                }}
              >
                Verify & Continue
              </Button>

              <button
                onClick={() => navigate("/login")}
                className={styles.buttonnew4}
              >
                Go Back
              </button>
            </Form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MFA;
