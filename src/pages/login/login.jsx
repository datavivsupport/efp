import React, { useState } from "react";
import "./login.css"; // move the <style> content here
import { useNavigate } from "react-router";
import { useToast } from "../UIChanges/use-toast";

const Login = () => {
  const { toast } = useToast()
  const [showForgot, setShowForgot] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const navigate = useNavigate();
  const handleLogin = (e) => {
    e.preventDefault();
    const email = e.target.email.value;
    // alert(`Login successful!\n\nEmail: ${email}`);

    toast({
      title: "Success!",
      description: `Login successful!\n\nEmail: ${email}`,
      variant: "success",
    })
    localStorage.setItem("token", "fake-jwt");
    navigate("/", { replace: true });
  };

  const handleForgot = (e) => {
    e.preventDefault();
    const email = e.target.email.value;
    alert(`Password reset link sent to:\n\n${email}`);
    setShowForgot(false);
  };

  const handleSignup = (e) => {
    e.preventDefault();
    const email = e.target.email.value;
    alert(`Account created successfully!\n\nEmail: ${email}`);
    setShowSignup(false);
  };

  return (
    <>
      {/* Header */}
      <header className="header">
        <div className="logo-box">
          <svg viewBox="0 0 24 24">
            <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
            <path d="m3.3 7 8.7 5 8.7-5" />
            <path d="M12 22V12" />
          </svg>
        </div>

        <div className="company-info">
          <img className="company-logo" src="/SSA_Logo_1_SVG.svg" alt="Liner Logo" />
        </div>
      </header>

      {/* Main */}
      <main className="main-container">
        <div className="login-card">
          <div className="card-header">
            <div className="user-icon-wrapper">
              <svg viewBox="0 0 24 24">
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <h2 className="card-title">Welcome Back</h2>
            <p className="card-subtitle">Sign in to access Export DMS</p>
          </div>

          <div className="card-body">
            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label className="form-label">
                  Email Address <span className="required">*</span>
                </label>
                <input
                  name="email"
                  type="email"
                  className="form-input"
                  placeholder="Enter your email"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Password <span className="required">*</span>
                </label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="Enter your password"
                  required
                />
              </div>

              <div className="form-options">
                <label className="remember-me">
                  <input type="checkbox" /> Remember me
                </label>
                <span
                  className="forgot-link"
                  onClick={() => setShowForgot(true)}
                >
                  Forgot Password?
                </span>
              </div>

              <button className="submit-button">Sign In</button>
            </form>

            <div className="divider">OR</div>

            <div className="signup-section">
              Don’t have an account?
              <span
                className="signup-link"
                onClick={() => setShowSignup(true)}
              >
                Sign Up
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="footer">
        <p className="copyright">
          © 2026 Sharaf Shipping Agency. All rights reserved.
        </p>
      </footer>

      {/* Forgot Password Modal */}
      {showForgot && (
        <div className="modal-overlay active" onClick={() => setShowForgot(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Reset Password</h3>
            </div>
            <form onSubmit={handleForgot}>
              <div className="modal-body">
                <input
                  name="email"
                  type="email"
                  className="form-input"
                  placeholder="Enter your email"
                  required
                />
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowForgot(false)}
                >
                  Cancel
                </button>
                <button className="btn-primary">Send Reset Link</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Signup Modal */}
      {showSignup && (
        <div className="modal-overlay active" onClick={() => setShowSignup(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Create Account</h3>
            </div>
            <form onSubmit={handleSignup}>
              <div className="modal-body">
                <input className="form-input" placeholder="Full Name" required />
                <input
                  name="email"
                  type="email"
                  className="form-input"
                  placeholder="Email"
                  required
                />
                <input className="form-input" placeholder="Company" required />
                <input
                  type="password"
                  className="form-input"
                  placeholder="Password"
                  required
                />
                <input
                  type="password"
                  className="form-input"
                  placeholder="Confirm Password"
                  required
                />
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowSignup(false)}
                >
                  Cancel
                </button>
                <button className="btn-primary">Create Account</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Login;