import { useState, useRef, useEffect, useCallback } from "react";
import "./excel-online-editor.scss";

const CLIENT_ID = import.meta.env.VITE_AZURE_CLIENT_ID;
const TENANT_ID = import.meta.env.VITE_AZURE_TENANT_ID;
const SCOPES = ["https://graph.microsoft.com/Files.ReadWrite"];

function getDefaultName(url) {
  try {
    const raw = url.split("/").pop()?.split("?")[0] || "";
    if (raw.includes(".")) return decodeURIComponent(raw);
  } catch {
    /* */
  }
  return "file";
}

function getFileName(url, fileName) {
  if (fileName) return fileName;
  return getDefaultName(url) || "file";
}

function getMimeType(name) {
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "eml") return "message/rfc822";
  if (ext === "zip") return "application/zip";
  return "application/vnd.ms-outlook";
}

const EmailOnlineViewer = ({ url, fileName, onClose }) => {
  const [phase, setPhase] = useState("idle");
  const [previewUrl, setPreviewUrl] = useState(null);
  const [error, setError] = useState("");
  const msalRef = useRef(null);

  const resolvedName = getFileName(url, fileName);
  const ext = resolvedName.split(".").pop()?.toUpperCase() || "MSG";

  useEffect(() => {
    if (!window.msal || !CLIENT_ID) return;
    const instance = new window.msal.PublicClientApplication({
      auth: {
        clientId: CLIENT_ID,
        authority: `https://login.microsoftonline.com/${TENANT_ID || "common"}`,
        redirectUri: window.location.origin + "/auth-redirect.html",
      },
      cache: { cacheLocation: "sessionStorage" },
    });
    msalRef.current = instance;
    instance.handleRedirectPromise().catch(console.error);
  }, []);

  async function getToken() {
    const msal = msalRef.current;
    const accounts = msal.getAllAccounts();
    if (accounts.length > 0) {
      try {
        return (await msal.acquireTokenSilent({ scopes: SCOPES, account: accounts[0] })).accessToken;
      } catch {
        /* fall through */
      }
    }
    const loginResp = await msal.loginPopup({ scopes: SCOPES });
    try {
      return (await msal.acquireTokenSilent({ scopes: SCOPES, account: loginResp.account })).accessToken;
    } catch {
      return (await msal.acquireTokenPopup({ scopes: SCOPES, account: loginResp.account })).accessToken;
    }
  }

  const handlePreview = useCallback(async () => {
    if (!CLIENT_ID) { setError("Missing VITE_AZURE_CLIENT_ID."); return; }
    if (!msalRef.current) { setError("Microsoft auth library not loaded."); return; }

    setError("");
    try {
      setPhase("auth");
      const token = await getToken();

      setPhase("upload");
      const fileRes = await fetch(url);
      if (!fileRes.ok) throw new Error(`Failed to fetch file (${fileRes.status})`);
      const blob = await fileRes.blob();

      const extPart = resolvedName.split(".").pop() || "msg";
      const basePart = resolvedName.replace(/\.[^.]+$/, "");
      const uniqueName = `${basePart}_${Date.now()}.${extPart}`;

      let item = null;
      const uploadRes = await fetch(
        `https://graph.microsoft.com/v1.0/me/drive/root:/${uniqueName}:/content`,
        {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": getMimeType(resolvedName) },
          body: blob,
        }
      );

      if (uploadRes.ok) {
        item = await uploadRes.json();
      } else {
        throw new Error(`Upload failed (${uploadRes.status})`);
      }

      let embedUrl = null;
      try {
        const previewRes = await fetch(
          `https://graph.microsoft.com/v1.0/me/drive/items/${item.id}/preview`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({}),
          }
        );
        if (previewRes.ok) embedUrl = (await previewRes.json()).getUrl;
      } catch (e) {
        console.warn("preview endpoint error:", e);
      }

      if (!embedUrl && item.webUrl) embedUrl = item.webUrl;
      if (!embedUrl) throw new Error("Could not generate preview URL");

      setPreviewUrl(embedUrl);
      setPhase("ready");

      setTimeout(async () => {
        try {
          await fetch(`https://graph.microsoft.com/v1.0/me/drive/items/${item.id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          });
        } catch {
          /* ignore cleanup errors */
        }
      }, 30000);
    } catch (err) {
      console.error("Email preview error:", err);
      setError(err.message);
      setPhase("error");
    }
  }, [url, resolvedName]);

  useEffect(() => {
    setPhase("idle");
    setPreviewUrl(null);
    setError("");
  }, [url]);

  useEffect(() => {
    if (phase === "idle" && CLIENT_ID && window.msal) {
      const timer = setTimeout(() => handlePreview(), 300);
      return () => clearTimeout(timer);
    }
  }, [phase, handlePreview]);

  const handleDownload = useCallback(() => {
    const a = document.createElement("a");
    a.href = url;
    a.download = resolvedName;
    a.target = "_blank";
    a.click();
  }, [url, resolvedName]);

  return (
    <div className="excel-online-editor">
      <div className="eoe-header">
        <div className="eoe-header-left">
          <span className="eoe-badge-ext">.{ext}</span>
          <span className="eoe-filename">{resolvedName}</span>
          {phase === "ready" && <span className="eoe-badge-editing">● Preview via OneDrive</span>}
        </div>
        <div className="eoe-header-right">
          <button className="eoe-btn eoe-btn-dl" onClick={handleDownload}>⬇ Download</button>
          {phase === "error" && (
            <button className="eoe-btn eoe-btn-edit" onClick={handlePreview}>Retry Preview</button>
          )}
          {onClose && (
            <button className="eoe-btn eoe-btn-close" onClick={onClose}>✕</button>
          )}
        </div>
      </div>

      {error && <div className="eoe-bar eoe-bar-error">{error}</div>}
      {(phase === "auth" || phase === "upload") && (
        <div className="eoe-bar eoe-bar-success">
          {phase === "auth" ? "Signing in to Microsoft..." : "Uploading to OneDrive for preview..."}
        </div>
      )}

      <div className="eoe-viewer-wrap">
        {previewUrl ? (
          <iframe src={previewUrl} className="eoe-viewer" title="File Preview" />
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#7c829e", fontSize: 14 }}>
            {phase === "idle" || phase === "auth" || phase === "upload"
              ? "Loading preview..."
              : "Preview not available. Click Download to view the file."}
          </div>
        )}
      </div>

      <div className="eoe-footer">
        <span>
          <span className="eoe-dot" />
          {phase === "ready" ? "Previewing via OneDrive" : phase === "auth" || phase === "upload" ? "Preparing preview..." : "View mode"}
        </span>
        <span>Powered by Microsoft Graph</span>
      </div>
    </div>
  );
};

export default EmailOnlineViewer;
