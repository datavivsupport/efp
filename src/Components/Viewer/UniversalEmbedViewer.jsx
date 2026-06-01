import React, { useMemo } from "react";
import { getFileCategory } from "../../utils/fileUtils";
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

// Zero hooks — pure switch on file category.
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
          <iframe src={url} title="Text Preview" style={{ width: "100%", height: "100%", border: "none", background: "transparent" }} />
        </div>
      );

    case "excel":
      return (
        <div style={{ ...baseStyle, padding: 0 }}>
          <ExcelOnlineEditor url={url} fileName={fileName} readOnly={readOnly} onClose={onClose} onSave={onSave} />
        </div>
      );

    case "word":
      return (
        <div style={{ ...baseStyle, padding: 0 }}>
          <div className="excel-online-editor" style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
            <iframe
              src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}&embedded=true`}
              style={{ flex: 1, border: "none", width: "100%", height: "100%" }}
              title="Word Viewer"
            />
          </div>
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
