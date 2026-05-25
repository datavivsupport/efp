import { useEffect, useState, useMemo } from "react";
import { getFileCategory } from "../../utils/fileUtils";
import UniversalEmbedViewer from "./UniversalEmbedViewer";

const FILE_ICONS = {
  pdf: "📄",
  image: "🖼️",
  excel: "📊",
  word: "📝",
  text: "📃",
  msg: "📧",
  eml: "📧",
  zip: "🗜️",
  other: "📎",
};

const getFileName = (file) => {
  if (!file) return "File";
  if (file.name || file.file_name) return file.name || file.file_name;
  const url = file.url || file.file_url || "";
  try {
    if (url.startsWith("http")) return decodeURIComponent(new URL(url).pathname.split("/").pop()) || "File";
    return decodeURIComponent(url.split("?")[0].split("/").pop()) || "File";
  } catch {
    return "File";
  }
};

const getFileUrl = (file) => file?.url || file?.file_url || (typeof file === "string" ? file : "");

const MultiFileViewer = ({ files = [], urls = [], defaultIndex = 0 }) => {
  const effectiveFiles = useMemo(() => {
    if (files && files.length > 0) return files;
    if (urls && urls.length > 0) return urls.map((u) => (typeof u === "string" ? { url: u } : u));
    return [];
  }, [files, urls]);

  const [selectedIndex, setSelectedIndex] = useState(defaultIndex);

  useEffect(() => setSelectedIndex(defaultIndex), [defaultIndex, effectiveFiles]);

  const selectedFile = effectiveFiles[selectedIndex];
  const fileUrl = getFileUrl(selectedFile);
  const fileMime = selectedFile?.mimeType || selectedFile?.type || "";
  const fileName = getFileName(selectedFile);

  return (
    <div style={{ display: "flex", height: "85vh", background: "#111", overflow: "hidden" }}>
      {/* Sidebar */}
      <div style={{
        width: 240, minWidth: 240,
        borderRight: "1px solid #2d2d2d",
        padding: "14px 10px", overflowY: "auto",
        background: "#1a1a1a", display: "flex",
        flexDirection: "column", gap: 2,
      }}>
        <h3 style={{ color: "#e2e8f0", fontSize: 13, fontWeight: 700, margin: "0 0 12px 4px" }}>
          Attachments
        </h3>

        {effectiveFiles.map((f, i) => {
          const active = i === selectedIndex;
          const url = getFileUrl(f);
          const mime = f?.mimeType || f?.type || "";
          const cat = getFileCategory(mime || url);
          const emoji = FILE_ICONS[cat] || "📎";
          const name = getFileName(f);

          return (
            <div
              key={i}
              onClick={() => setSelectedIndex(i)}
              style={{
                padding: "9px 12px", cursor: "pointer", borderRadius: 8,
                background: active ? "#1e3a5f" : "transparent",
                border: active ? "1px solid #2563eb" : "1px solid transparent",
                transition: "all 0.15s", display: "flex", alignItems: "flex-start", gap: 8,
              }}
              onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "#262626"; }}
              onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
            >
              <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{emoji}</span>
              <span style={{
                fontSize: 12, color: active ? "#93c5fd" : "#9ca3af",
                wordBreak: "break-all", lineHeight: 1.4, fontWeight: active ? 600 : 400,
              }}>
                {name}
              </span>
            </div>
          );
        })}

        {effectiveFiles.length === 0 && (
          <p style={{ color: "#6b7280", fontSize: 12, margin: "8px 4px" }}>No files attached.</p>
        )}
      </div>

      {/* Preview Pane */}
      <div style={{ flex: 1, overflow: "hidden", background: "#0f0f0f" }}>
        {selectedFile ? (
          <UniversalEmbedViewer
            key={fileUrl}
            url={fileUrl}
            type={fileMime}
            fileName={fileName}
            readOnly
          />
        ) : (
          <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#6b7280", fontSize: 14 }}>
            Select a file from the left to preview
          </div>
        )}
      </div>
    </div>
  );
};

export default MultiFileViewer;
