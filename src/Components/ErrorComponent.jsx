import { Alert } from "antd";

function ErrorComponent({ showError }) {
  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        {showError && (
          <Alert
            message={showError}
            type="error"
            showIcon
            style={{ height: "100%" }}
          />
        )}
      </div>
    </div>
  );
}

export default ErrorComponent;
