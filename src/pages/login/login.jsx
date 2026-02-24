// import React, { useState } from "react";
// import "./login.css"; // move the <style> content here
// import { useNavigate } from "react-router";
// import { useToast } from "../UIChanges/use-toast";

// const Login = () => {
//   const { toast } = useToast()
//   const [showForgot, setShowForgot] = useState(false);
//   const [showSignup, setShowSignup] = useState(false);
//   const navigate = useNavigate();
//   const handleLogin = (e) => {
//     e.preventDefault();
//     const email = e.target.email.value;
//     // alert(`Login successful!\n\nEmail: ${email}`);

//     toast({
//       title: "Success!",
//       description: `Login successful!\n\nEmail: ${email}`,
//       variant: "success",
//     })
//     localStorage.setItem("token", "fake-jwt");
//     navigate("/", { replace: true });
//   };

//   const handleForgot = (e) => {
//     e.preventDefault();
//     const email = e.target.email.value;
//     alert(`Password reset link sent to:\n\n${email}`);
//     setShowForgot(false);
//   };

//   const handleSignup = (e) => {
//     e.preventDefault();
//     const email = e.target.email.value;
//     alert(`Account created successfully!\n\nEmail: ${email}`);
//     setShowSignup(false);
//   };

//   return (
//     <>
//       {/* Header */}
//       <header className="header">
//         <div className="logo-box">
//           <svg viewBox="0 0 24 24">
//             <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
//             <path d="m3.3 7 8.7 5 8.7-5" />
//             <path d="M12 22V12" />
//           </svg>
//         </div>

//         <div className="company-info">
//           <img className="company-logo" src="/SSA_Logo_1_SVG.svg" alt="Liner Logo" />
//         </div>
//       </header>

//       {/* Main */}
//       <main className="main-container">
//         <div className="login-card">
//           <div className="card-header">
//             <div className="user-icon-wrapper">
//               <svg viewBox="0 0 24 24">
//                 <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
//                 <circle cx="12" cy="7" r="4" />
//               </svg>
//             </div>
//             <h2 className="card-title">Welcome Back</h2>
//             <p className="card-subtitle">Sign in to access Export DMS</p>
//           </div>

//           <div className="card-body">
//             <form onSubmit={handleLogin}>
//               <div className="form-group">
//                 <label className="form-label">
//                   Email Address <span className="required">*</span>
//                 </label>
//                 <input
//                   name="email"
//                   type="email"
//                   className="form-input"
//                   placeholder="Enter your email"
//                   required
//                 />
//               </div>

//               <div className="form-group">
//                 <label className="form-label">
//                   Password <span className="required">*</span>
//                 </label>
//                 <input
//                   type="password"
//                   className="form-input"
//                   placeholder="Enter your password"
//                   required
//                 />
//               </div>

//               <div className="form-options">
//                 <label className="remember-me">
//                   <input type="checkbox" /> Remember me
//                 </label>
//                 <span
//                   className="forgot-link"
//                   onClick={() => setShowForgot(true)}
//                 >
//                   Forgot Password?
//                 </span>
//               </div>

//               <button className="submit-button">Sign In</button>
//             </form>

//             <div className="divider">OR</div>

//             <div className="signup-section">
//               Don’t have an account?
//               <span
//                 className="signup-link"
//                 onClick={() => setShowSignup(true)}
//               >
//                 Sign Up
//               </span>
//             </div>
//           </div>
//         </div>
//       </main>

//       {/* Footer */}
//       <footer className="footer">
//         <p className="copyright">
//           © 2026 Sharaf Shipping Agency. All rights reserved.
//         </p>
//       </footer>

//       {/* Forgot Password Modal */}
//       {showForgot && (
//         <div className="modal-overlay active" onClick={() => setShowForgot(false)}>
//           <div className="modal" onClick={(e) => e.stopPropagation()}>
//             <div className="modal-header">
//               <h3 className="modal-title">Reset Password</h3>
//             </div>
//             <form onSubmit={handleForgot}>
//               <div className="modal-body">
//                 <input
//                   name="email"
//                   type="email"
//                   className="form-input"
//                   placeholder="Enter your email"
//                   required
//                 />
//               </div>
//               <div className="modal-footer">
//                 <button
//                   type="button"
//                   className="btn-secondary"
//                   onClick={() => setShowForgot(false)}
//                 >
//                   Cancel
//                 </button>
//                 <button className="btn-primary">Send Reset Link</button>
//               </div>
//             </form>
//           </div>
//         </div>
//       )}

//       {/* Signup Modal */}
//       {showSignup && (
//         <div className="modal-overlay active" onClick={() => setShowSignup(false)}>
//           <div className="modal" onClick={(e) => e.stopPropagation()}>
//             <div className="modal-header">
//               <h3 className="modal-title">Create Account</h3>
//             </div>
//             <form onSubmit={handleSignup}>
//               <div className="modal-body">
//                 <input className="form-input" placeholder="Full Name" required />
//                 <input
//                   name="email"
//                   type="email"
//                   className="form-input"
//                   placeholder="Email"
//                   required
//                 />
//                 <input className="form-input" placeholder="Company" required />
//                 <input
//                   type="password"
//                   className="form-input"
//                   placeholder="Password"
//                   required
//                 />
//                 <input
//                   type="password"
//                   className="form-input"
//                   placeholder="Confirm Password"
//                   required
//                 />
//               </div>
//               <div className="modal-footer">
//                 <button
//                   type="button"
//                   className="btn-secondary"
//                   onClick={() => setShowSignup(false)}
//                 >
//                   Cancel
//                 </button>
//                 <button className="btn-primary">Create Account</button>
//               </div>
//             </form>
//           </div>
//         </div>
//       )}
//     </>
//   );
// };

// export default Login;

import React, { useState } from "react";
import { Form, Input, Button, Divider } from "antd";
import { Icon } from "@iconify/react";
import sharafLogo from "../../assets/sharaf-logo.png";
import { useNavigate } from "react-router";
import ForgotPasswordModal from "../ForgotPassword/ForgotPasswordModal";
import styles from "./Login.module.css";

const Login = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [forgotPasswordVisible, setForgotPasswordVisible] = useState(false);
  const navigate = useNavigate();

  const onFinish = (values) => {
    setLoading(true);

    const { email } = values;

    setTimeout(() => {
      console.log("Login successful:", email);

      // Save fake token
      localStorage.setItem("token", "fake-jwt");

      setLoading(false);

      navigate( "/",
        {
          replace: true ,
          state: {
            message: "Login successful!",
          },
        },
      );
      message.success(`Login successful!\n\nEmail: ${email}`, 4000);
    }, 500);
  };

  const showForgotPassword = () => {
    setForgotPasswordVisible(true);
  };

  return (
    <div className={styles.container}>
      <div className={styles.loginPage}>
        <div className={styles.loginContainer}>
          <div className={styles.loginLeft}>
            <div className={styles.loginHeader}>
              <div className={styles.loginLogo2}>
                <img
                  src={sharafLogo}
                  alt="Sharaf Shipping Agency"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                  }}
                />
              </div>
              <h1 className={styles.loginTitle}>Sharaf Shipping Agency</h1>
              <p className={styles.loginSubtitle}>Document Management System</p>
            </div>

            <Form
              name="login"
              layout="vertical"
              form={form}
              onFinish={onFinish}
              className={styles.emailLogin}
            >
              <Form.Item
                name="email"
                label="Email Address"
                style={{
                  marginBottom: "6px",
                  marginTop: "0px",
                }}
                rules={[
                  { required: true, message: "Please input your email!" },
                  { type: "email", message: "Enter valid email!" },
                ]}
              >
                <Input
                  size="large"
                  placeholder="Enter your email"
                  prefix={<Icon icon="tabler:mail" width={20} />}
                />
              </Form.Item>

              <Form.Item
                name="password"
                label="Password"
                style={{
                  // marginBottom: "8px",
                  marginTop: "0px",
                }}
                rules={[
                  { required: true, message: "Please input your password!" },
                ]}
              >
                <Input.Password
                  size="large"
                  placeholder="Enter your password"
                  prefix={<Icon icon="ic:round-lock" width={20} />}
                />
              </Form.Item>

              <div className={styles.loginOptions}>
                {/* <Form.Item name="remember" valuePropName="checked" noStyle>
                <Checkbox>Keep me signed in</Checkbox>
              </Form.Item> */}
                <a
                  href="#"
                  className={styles.forgotLink}
                  onClick={(e) => {
                    e.preventDefault();
                    showForgotPassword();
                  }}
                >
                  Forgot password?
                </a>
              </div>
              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  size="large"
                  block
                  loading={loading}
                >
                  Sign In
                </Button>
              </Form.Item>
              <Form.Item
                style={{
                  marginBottom: "0px",
                }}
              >
                <Button
                  type="primary"
                  size="large"
                  block
                  onClick={() => navigate("/signup")}
                >
                  Sign Up
                </Button>
              </Form.Item>
            </Form>

            <Divider>or continue with</Divider>

            <div className={styles.socialLoginButtons}>
              <Button
                size="large"
                block
                type="primary"
                onClick={() => {
                  console.log("hello clicked");
                  // window.location.href = `${import.meta.env.VITE_API_BASE_URL}/accounts/oauth/microsoft?url=${window.location.origin}/dashboard`;
                }}
              >
                <svg
                  width={20}
                  height={20}
                  viewBox="0 0 48 48"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path fill="#F35325" d="M6 6h18v18H6z" />
                  <path fill="#81BC06" d="M24 6h18v18H24z" />
                  <path fill="#05A6F0" d="M6 24h18v18H6z" />
                  <path fill="#FFBA00" d="M24 24h18v18H24z" />
                </svg>
                Continue with Microsoft
              </Button>
            </div>
          </div>
        </div>
      </div>
      <ForgotPasswordModal
        visible={forgotPasswordVisible}
        onClose={() => setForgotPasswordVisible(false)}
        change={false}
      />
    </div>
  );
};

export default Login;
