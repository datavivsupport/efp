import { useState, useRef, useEffect, useCallback } from "react";
import { Modal } from "antd";
import apiClient from "../../api/apiclient";
import "./excel-online-editor.scss";

const CLIENT_ID = import.meta.env.VITE_AZURE_CLIENT_ID;
const TENANT_ID = import.meta.env.VITE_AZURE_TENANT_ID;
const SCOPES = ["https://graph.microsoft.com/Files.ReadWrite"];

function getFileName(url, fileName) {
  if (fileName) return fileName;
  try {
    const raw = url.split("/").pop()?.split("?")[0] || "";
    if (raw.includes(".")) return decodeURIComponent(raw);
  } catch {
    /* */
  }
  return "file.xlsx";
}

const ExcelOnlineEditor = ({ url, fileName, readOnly = false, onClose, onSave }) => {
  const [phase, setPhase] = useState("view");
  const [editLink, setEditLink] = useState(null);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState(false);
  const [viewerUrl, setViewerUrl] = useState("");
  const msalRef = useRef(null);
  const itemIdRef = useRef(null);

  const resolvedName = getFileName(url, fileName);
  const ext = resolvedName.split(".").pop()?.toUpperCase() || "XLSX";

  useEffect(() => {
    setViewerUrl(
      `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}&embedded=true`
    );
  }, [url]);

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

  async function handleEdit() {
    if (!CLIENT_ID) { setError("Missing VITE_AZURE_CLIENT_ID."); return; }
    if (!msalRef.current) { setError("Microsoft auth library not loaded."); return; }

    setError("");
    try {
      setPhase("auth");
      const token = await getToken();

      setPhase("upload");
      const fileRes = await fetch(url);
      if (!fileRes.ok) throw new Error(`Failed to fetch Excel from S3 (${fileRes.status})`);
      const blob = await fileRes.blob();

      let item = null;
      const uploadRes = await fetch(
        `https://graph.microsoft.com/v1.0/me/drive/root:/${resolvedName}:/content`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          },
          body: blob,
        }
      );

      if (uploadRes.ok) {
        item = await uploadRes.json();
      } else if (uploadRes.status === 423) {
        const r = await fetch(`https://graph.microsoft.com/v1.0/me/drive/root:/${resolvedName}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!r.ok) throw new Error("File locked and could not fetch info");
        item = await r.json();
      } else {
        throw new Error(`Upload failed (${uploadRes.status})`);
      }

      itemIdRef.current = item.id;

      let editUrl = null;
      try {
        const shareRes = await fetch(
          `https://graph.microsoft.com/v1.0/me/drive/items/${item.id}/createLink`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ type: "edit", scope: "organization" }),
          }
        );
        if (shareRes.ok) {
          editUrl = (await shareRes.json()).link?.webUrl;
        } else {
          const shareRes2 = await fetch(
            `https://graph.microsoft.com/v1.0/me/drive/items/${item.id}/createLink`,
            {
              method: "POST",
              headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
              body: JSON.stringify({ type: "edit", scope: "anonymous" }),
            }
          );
          if (shareRes2.ok) editUrl = (await shareRes2.json()).link?.webUrl;
        }
      } catch (e) {
        console.warn("createLink error:", e);
      }

      if (!editUrl && item.webUrl) {
        try {
          const parsed = new URL(item.webUrl);
          editUrl = `${parsed.origin}/_layouts/15/Doc.aspx?sourcedoc=${encodeURIComponent(parsed.pathname)}&action=edit`;
        } catch {
          editUrl = item.webUrl;
        }
      }

      setEditLink(editUrl);
      if (editUrl) window.open(editUrl, "_blank");
      setPhase("done");
    } catch (err) {
      console.error("Edit flow error:", err);
      setError(err.message);
      setPhase("error");
    }
  }

  async function handleUpdate() {
    if (!itemIdRef.current || !msalRef.current) return;

    Modal.confirm({
      title: "Update from Excel Online",
      content: "Make sure you've closed the Excel Online tab so changes are saved. Then click OK.",
      okText: "OK, Update",
      cancelText: "Cancel",
      onOk: async () => {
        setUpdating(true);
        setError("");
        try {
          const token = await getToken();

          const metaRes = await fetch(
            `https://graph.microsoft.com/v1.0/me/drive/items/${itemIdRef.current}?select=id,name,size,lastModifiedDateTime,@microsoft.graph.downloadUrl`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          if (!metaRes.ok) throw new Error(`Failed to get file info (${metaRes.status})`);
          const meta = await metaRes.json();

          const downloadUrl = meta["@microsoft.graph.downloadUrl"];
          if (downloadUrl) {
            setViewerUrl(`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(downloadUrl)}`);
          }

          const res = await fetch(
            `https://graph.microsoft.com/v1.0/me/drive/items/${itemIdRef.current}/content`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          if (!res.ok) throw new Error(`Download failed (${res.status})`);
          const blob = await res.blob();

          const file = new File([blob], resolvedName, { type: blob.type });
          const fd = new FormData();
          fd.append("file", file);
          const response = await apiClient.post("/accounts/upload", fd, {
            headers: { "Content-Type": "multipart/form-data" },
          });
          const newUrl = response.data?.data?.s3_url;
          if (onSave && newUrl) onSave(newUrl);

          setError("");
          setPhase("view");
          setEditLink(null);
          itemIdRef.current = null;
        } catch (err) {
          console.error("Update error:", err);
          setError(err.message);
        } finally {
          setUpdating(false);
        }
      },
    });
  }

  const handleDownload = useCallback(() => {
    const a = document.createElement("a");
    a.href = url;
    a.download = resolvedName;
    a.target = "_blank";
    a.click();
  }, [url, resolvedName]);

  const handleClose = useCallback(() => {
    if (phase === "done") {
      Modal.confirm({
        title: "Close Editor",
        content: "Have you saved your changes from Excel Online?",
        okText: "Close",
        okType: "danger",
        cancelText: "Cancel",
        onOk: () => onClose?.(),
      });
      return;
    }
    onClose?.();
  }, [phase, onClose]);

  return (
    <div className="excel-online-editor">
      <div className="eoe-header">
        <div className="eoe-header-left">
          <span className="eoe-badge-ext">.{ext}</span>
          <span className="eoe-filename">{resolvedName}</span>
          {phase === "done" && <span className="eoe-badge-editing">● Editing on OneDrive</span>}
        </div>
        <div className="eoe-header-right">
          <button className="eoe-btn eoe-btn-dl" onClick={handleDownload}>⬇ Download</button>
{onClose && (
            <button className="eoe-btn eoe-btn-close" onClick={handleClose}>✕</button>
          )}
        </div>
      </div>

      {error && <div className="eoe-bar eoe-bar-error">{error}</div>}

      <div className="eoe-viewer-wrap">
        <iframe src={viewerUrl} className="eoe-viewer" title="Excel Viewer" />
      </div>

      <div className="eoe-footer">
        <span>
          <span className="eoe-dot" />
          {readOnly ? "View only" : phase === "done" ? "Editing via Excel Online" : "View mode — click Edit to modify"}
        </span>
        <span>Powered by Microsoft Office Online</span>
      </div>
    </div>
  );
};

export default ExcelOnlineEditor;
