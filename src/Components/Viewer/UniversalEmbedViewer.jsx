import React, { useEffect, useMemo, useState } from "react";
import { getFileCategory } from "../../utils/fileUtils";
import apiClient from "../../api/apiclient";
import { Worker, Viewer } from "@react-pdf-viewer/core";
import { defaultLayoutPlugin } from "@react-pdf-viewer/default-layout";
import "@react-pdf-viewer/core/lib/styles/index.css";
import "@react-pdf-viewer/default-layout/lib/styles/index.css";
import "@react-pdf-viewer/thumbnail/lib/styles/index.css";
import { Icon } from "@iconify/react";
import { Tooltip } from "antd";
import ExcelOnlineEditor from "./ExcelOnlineEditor";
import EmailOnlineViewer from "./EmailOnlineViewer";

const IconButton = ({ icon, onClick, title }) => (
  <Tooltip title={title}>
    <button
      onClick={onClick}
      style={{
        width: 36, height: 36, border: "none", borderRadius: "50%",
        background: "rgba(255,255,255,0.15)", display: "flex",
        alignItems: "center", justifyContent: "center",
        cursor: "pointer", transition: "background 0.2s ease",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.25)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.15)")}
    >
      <Icon icon={icon} width={20} height={20} color="white" />
    </button>
  </Tooltip>
);

// Isolated so its useMemo never conflicts with the parent's hook tree.
// key={url} on the caller forces a full remount when the file changes.
const PdfPane = ({ fileUrl, onClose }) => {
  const pluginInstance = useMemo(() => defaultLayoutPlugin(), []);
  return (
    <Worker workerUrl="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js">
      <div style={{ height: "100%", width: "100%", display: "flex", flexDirection: "column" }}>
        <Viewer fileUrl={fileUrl} plugins={[pluginInstance]} theme="dark" defaultScale={1} />
      </div>
    </Worker>
  );
};

const centerMsg = (text, color = "#9ca3af") => (
  <div style={{ margin: "auto", color, fontSize: 14, padding: 20, textAlign: "center" }}>{text}</div>
);

// Office Online needs a public URL. A file picked before the record is saved
// only has a local blob: URL, so push it to S3 once (same endpoint the
// frontend uses on upload) and reuse that URL for later previews.
const publicUrlCache = new Map();

const resolvePublicUrl = (url, fileName) => {
  if (!url.startsWith("blob:")) return Promise.resolve(url);
  if (!publicUrlCache.has(url)) {
    const pending = (async () => {
      const blob = await (await fetch(url)).blob();
      const fd = new FormData();
      fd.append("file", new File([blob], fileName || "file", { type: blob.type }));
      const res = await apiClient.post("/accounts/upload", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const s3Url = res?.data?.data?.s3_url;
      if (!s3Url) throw new Error("Upload returned no URL");
      return s3Url;
    })();
    // Drop failures so the next open can retry
    pending.catch(() => publicUrlCache.delete(url));
    publicUrlCache.set(url, pending);
  }
  return publicUrlCache.get(url);
};

const PublicUrl = ({ url, fileName, children }) => {
  const [state, setState] = useState({ url: url.startsWith("blob:") ? null : url, error: false });
  useEffect(() => {
    let alive = true;
    resolvePublicUrl(url, fileName)
      .then((u) => alive && setState({ url: u, error: false }))
      .catch(() => alive && setState({ url: null, error: true }));
    return () => { alive = false; };
  }, [url, fileName]);
  if (state.error) return centerMsg("Could not prepare this file for preview. Please download it instead.", "#f87171");
  if (!state.url) return centerMsg("Preparing preview…");
  return children(state.url);
};

// Minimal CSV parser: handles quoted fields, escaped quotes and newlines in quotes.
const parseCsv = (text) => {
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); rows.push(row); row = []; field = "";
    } else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
};

const isCsvFile = (...hints) =>
  hints.some((h) => {
    const v = (h || "").toLowerCase();
    return v === "text/csv" || v.split("?")[0].endsWith(".csv");
  });

const MAX_TEXT_ROWS = 5000;

const TextPane = ({ url, isCsv }) => {
  const [state, setState] = useState({ text: null, error: false });
  useEffect(() => {
    let alive = true;
    fetch(url)
      .then((r) => { if (!r.ok) throw new Error(r.status); return r.text(); })
      .then((text) => alive && setState({ text, error: false }))
      .catch(() => alive && setState({ text: null, error: true }));
    return () => { alive = false; };
  }, [url]);

  // Fetch blocked (e.g. CORS) — let the browser render it directly
  if (state.error) {
    return <iframe src={url} title="Text Preview" style={{ width: "100%", height: "100%", border: "none", background: "#fff" }} />;
  }
  if (state.text === null) return centerMsg("Loading…");

  if (isCsv) {
    const rows = parseCsv(state.text);
    const shown = rows.slice(0, MAX_TEXT_ROWS);
    const cell = { border: "1px solid #333", padding: "4px 8px", whiteSpace: "nowrap", fontSize: 12 };
    return (
      <div style={{ overflow: "auto", width: "100%", height: "100%", background: "#fff", color: "#111" }}>
        <table style={{ borderCollapse: "collapse" }}>
          <tbody>
            {shown.map((r, i) => (
              <tr key={i} style={i === 0 ? { background: "#e5e7eb", fontWeight: 600 } : undefined}>
                <td style={{ ...cell, color: "#6b7280", background: "#f3f4f6" }}>{i + 1}</td>
                {r.map((v, j) => <td key={j} style={cell}>{v}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length > MAX_TEXT_ROWS && (
          <p style={{ padding: 8, color: "#6b7280" }}>Showing first {MAX_TEXT_ROWS} of {rows.length} rows. Download to see all.</p>
        )}
      </div>
    );
  }

  return (
    <pre style={{ margin: 0, padding: 16, overflow: "auto", width: "100%", height: "100%", color: "#e5e7eb", fontSize: 13, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
      {state.text}
    </pre>
  );
};

// Pure switch on file category; stateful work lives in the panes above.
const UniversalEmbedViewer = ({ url, type, fileName, readOnly, onClose, onSave }) => {
  if (!url) return <p style={{ color: "#ccc", padding: 16 }}>No file to preview</p>;

  const category = getFileCategory(type || url);

  const baseStyle = {
    display: "flex", height: "100%", width: "100%",
    borderRadius: 8, overflow: "hidden",
    backgroundColor: "#0d0d0d", position: "relative", color: "#fff",
  };

  const controlBarStyle = {
    position: "absolute", top: 2, right: 5,
    display: "flex", alignItems: "center", gap: 10,
    zIndex: 10, marginRight: "2rem", marginBottom: "1rem",
  };

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = url;
    a.download = url.split("/").pop() || "file";
    a.target = "_blank";
    a.click();
  };

  switch (category) {
    case "pdf":
      return (
        <div style={{ ...baseStyle, backgroundColor: "#000" }}>
          <PdfPane key={url} fileUrl={url} onClose={onClose} />
        </div>
      );

    case "image":
      return (
        <div style={baseStyle}>
          <div style={controlBarStyle}>
            <IconButton icon="mdi:download" onClick={handleDownload} title="Download" />
            <IconButton icon="mdi:open-in-new" onClick={() => window.open(url, "_blank")} title="Open in New Tab" />
            {onClose && <IconButton icon="mdi:close" onClick={onClose} title="Close" />}
          </div>
          <img src={url} alt="Preview" style={{ maxWidth: "100%", maxHeight: "100%", margin: "auto", objectFit: "contain" }} />
        </div>
      );

    case "text":
      return (
        <div style={{ ...baseStyle, padding: 20, background: "#111" }}>
          <div style={controlBarStyle}>
            <IconButton icon="mdi:download" onClick={handleDownload} title="Download" />
            {onClose && <IconButton icon="mdi:close" onClick={onClose} title="Close" />}
          </div>
          <TextPane key={url} url={url} isCsv={isCsvFile(type, fileName, url)} />
        </div>
      );

    case "excel":
      return (
        <div style={{ ...baseStyle, padding: 0 }}>
          <PublicUrl key={url} url={url} fileName={fileName}>
            {(publicUrl) => (
              <ExcelOnlineEditor url={publicUrl} fileName={fileName} readOnly={readOnly} onClose={onClose} onSave={onSave} />
            )}
          </PublicUrl>
        </div>
      );

    case "word":
      return (
        <div style={{ ...baseStyle, padding: 0 }}>
          <PublicUrl key={url} url={url} fileName={fileName}>
            {(publicUrl) => (
              <div className="excel-online-editor" style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
                <iframe
                  src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(publicUrl)}&embedded=true`}
                  style={{ flex: 1, border: "none", width: "100%", height: "100%" }}
                  title="Office Viewer"
                />
              </div>
            )}
          </PublicUrl>
        </div>
      );

    case "msg":
    case "eml":
    case "zip":
      return (
        <div style={{ ...baseStyle, padding: 0 }}>
          <EmailOnlineViewer url={url} type={type} fileName={fileName} onClose={onClose} />
        </div>
      );

    default:
      return (
        <div style={baseStyle}>
          <div style={controlBarStyle}>
            <IconButton icon="mdi:download" onClick={handleDownload} title="Download" />
            {onClose && <IconButton icon="mdi:close" onClick={onClose} title="Close" />}
          </div>
          <div style={{
            margin: "auto", textAlign: "center", color: "#ccc",
            fontSize: 16, padding: "20px", display: "flex",
            flexDirection: "column", alignItems: "center",
          }}>
            <p style={{ color: "#999" }}>
              Preview not supported for{" "}
              <span style={{ fontWeight: 500, color: "#fff" }}>{category || "this"}</span> file type.
            </p>
            <button onClick={handleDownload} style={{
              marginTop: 12, padding: "8px 16px", borderRadius: 6, border: "none",
              background: "rgba(255,255,255,0.15)", color: "#fff", cursor: "pointer", fontSize: 13,
            }}>
              Download File
            </button>
          </div>
        </div>
      );
  }
};

export default UniversalEmbedViewer;
