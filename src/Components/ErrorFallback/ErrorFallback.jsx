import { useNavigate } from 'react-router';
import Styles from './ErrorFallback.module.css';
import { Icon } from "@iconify/react";
import { cancelAllRequests, startLogout } from '../../api/apiclient';
// import apiClient, { cancelAllRequests, finishLogout, startLogout } from "../api/apiClient";

const ErrorFallback = ({ error, resetErrorBoundary }) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      startLogout();
      cancelAllRequests();
      await apiClient.get("/accounts/logout");
    } catch {
      // ignore
    } finally {
      // localStorage.removeItem("draft_modal_shown");
      // localStorage.removeItem("allocation_modal_shown");
      localStorage.removeItem("open_tabs");
      navigate("/login");
      // finishLogout();
    }
  };

  return (
    <div className={Styles.errorpage}>
      {/* Clouds */}
      <div className={Styles.cloudcloud1}></div>
      <div className={Styles.cloudcloud2}></div>
      <div className={Styles.cloudcloud3}></div>

      {/* Top content */}
      <div className={Styles.topcontent}>
        <div className={Styles.textcontainer}>
          <div className={Styles.errorbadge}>ERROR 404 / 500</div>
          
          <h2>Something Went Wrong</h2>
          <p>An unexpected error occurred. You can login again or go back.</p>
          <p>{error?.message}</p>

          <div className={Styles.buttons}>
            {/* <button
              className={Styles.btnbtnprimary}
              onClick={() => resetErrorBoundary()}
            >
              <Icon icon="pepicons-pop:refresh" width="20" height="20" />
              Refresh
            </button> */}
            <button
              className={Styles.btnbtnprimary}
              onClick={handleLogout}
            >
              <Icon icon="ic:round-login" width="22" height="22" />
              Login
            </button>
            <button
              className={Styles.btnbtnsecondary}
              onClick={() => {
                // resetErrorBoundary();
                navigate("/dashboard");
              }}
            >
              <Icon icon="ic:twotone-arrow-back" width="20" height="20" />
              Go Back
            </button>
          </div>
        </div>
      </div>

      {/* Bottom section with waves and ship */}
      <div className={Styles.bottomsection}>
        {/* Ship in the waves */}
        <div className={Styles.shipcontainer}>
          <div className={Styles.sos}>🆘</div>
          <div className={Styles.ship}>
            <Icon icon="noto-v1:ship" width="120" height="120" />
          </div>
        </div>

        {/* Bubbles */}
        <div className={Styles.bubble1}></div>
        <div className={Styles.bubble2}></div>
        <div className={Styles.bubble3}></div>
        <div className={Styles.bubble4}></div>
        <div className={Styles.bubble5}></div>
        <div className={Styles.bubble6}></div>

        {/* Animated waves */}
        <div className={Styles.wave}>
          <div className={Styles.wave}></div>
          <div className={Styles.wave}></div>
          <div className={Styles.wave}></div>
        </div>
      </div>
    </div>
  );
};

export default ErrorFallback;