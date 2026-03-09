import React, { useEffect, useState, useMemo } from "react";
import { Worker, Viewer } from "@react-pdf-viewer/core";
import { defaultLayoutPlugin } from "@react-pdf-viewer/default-layout";

import "@react-pdf-viewer/core/lib/styles/index.css";
import "@react-pdf-viewer/default-layout/lib/styles/index.css";
import { Icon } from "@iconify/react";
import { Tooltip } from "antd";

const getFileCategory = (url = "") => {
  const ext = url.split("?")[0].split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "pdf";
  if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext))
    return "image";
  return "other";
};

const getFileName = (url = "") => {
  try {
    return decodeURIComponent(new URL(url).pathname.split("/").pop()) || url;
  } catch {
    return url.split("/").pop() || url;
  }
};

// ── PDF viewer — isolated component so plugin is ALWAYS fresh on mount ────────
// Wrapping in its own component with a `key` on the parent forces a full
// unmount/remount whenever the URL changes, which prevents the
// "Cannot set properties of undefined (setting 'destroy')" error.
const PdfPane = ({ fileUrl }) => {
  const pluginInstance = useMemo(() => defaultLayoutPlugin(), []);

  return (
    <Worker
      workerUrl={`https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`}
    >
      <div style={{ height: "100%", width: "100%" }}>
        <Viewer fileUrl={fileUrl} plugins={[pluginInstance]} theme="dark" />
      </div>
    </Worker>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
//  MultiFileViewer
//
//  Props:
//    urls          — string[]  — list of file URLs
//    defaultIndex  — number    — which file to show first (default 0)
// ══════════════════════════════════════════════════════════════════════════════
const MultiFileViewer = ({ urls = [], defaultIndex = 0 }) => {
  const [selectedIndex, setSelectedIndex] = useState(defaultIndex);

  // Reset when the urls list or defaultIndex changes (e.g. modal reopen)
  useEffect(() => {
    setSelectedIndex(defaultIndex);
  }, [defaultIndex, urls]);

  const selectedFile = urls[selectedIndex] || null;
  const category = getFileCategory(selectedFile || "");

  return (
    <div
      style={{
        display: "flex",
        height: "85vh",
        background: "#111",
        overflow: "hidden",
      }}
    >
      {/* ── Sidebar ── */}
      <div
        style={{
          width: 240,
          minWidth: 240,
          borderRight: "1px solid #2d2d2d",
          padding: "14px 10px",
          overflowY: "auto",
          background: "#1a1a1a",
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        <h3
          style={{
            color: "#e2e8f0",
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: "0.05em",
            margin: "0 0 12px 4px",
          }}
        >
          Attachments
        </h3>

        {urls.map((url, i) => {
          const active = selectedIndex === i;
          const name = getFileName(url);
          const cat = getFileCategory(url);
          const emoji = cat === "pdf" ? "📄" : cat === "image" ? "🖼️" : "📎";

          return (
            <div
              key={i}
              onClick={() => setSelectedIndex(i)}
              style={{
                padding: "9px 12px",
                cursor: "pointer",
                borderRadius: 8,
                background: active ? "#1e3a5f" : "transparent",
                border: active ? "1px solid #2563eb" : "1px solid transparent",
                transition: "all 0.15s",
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
              }}
              onMouseEnter={(e) => {
                if (!active) e.currentTarget.style.background = "#262626";
              }}
              onMouseLeave={(e) => {
                if (!active) e.currentTarget.style.background = "transparent";
              }}
            >
              <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>
                {emoji}
              </span>
              <span
                style={{
                  fontSize: 12,
                  color: active ? "#93c5fd" : "#9ca3af",
                  wordBreak: "break-all",
                  lineHeight: 1.4,
                  fontWeight: active ? 600 : 400,
                }}
              >
                {name}
              </span>
            </div>
          );
        })}

        {urls.length === 0 && (
          <p style={{ color: "#6b7280", fontSize: 12, margin: "8px 4px" }}>
            No files attached.
          </p>
        )}
      </div>

      {/* ── Preview pane ── */}
      <div style={{ flex: 1, overflow: "hidden", background: "#0f0f0f" }}>
        {!selectedFile && (
          <div
            style={{
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#6b7280",
              fontSize: 14,
            }}
          >
            Select a file from the left to preview
          </div>
        )}

        {/* KEY = selectedFile forces full unmount/remount of PdfPane
            every time the selected URL changes — this is the fix for
            "Cannot set properties of undefined (setting 'destroy')" */}
        {category === "pdf" && selectedFile && (
          <PdfPane key={selectedFile} fileUrl={selectedFile} />
        )}

        {category === "image" && selectedFile && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              height: "100%",
              background: "#000",
            }}
          >
            {/* Top Action Bar */}
            <div
              style={{
                padding: "10px 16px",
                borderBottom: "1px solid #1f2937",
                display: "flex",
                justifyContent: "flex-end",
                gap: 12,
                background: "#111",
              }}
            >
              {/* Open in New Tab */}
              <Tooltip title="Open in New Tab">
                <a
                  href={selectedFile}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    fontSize: 12,
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    height: "33px",
                    width: "33px",
                    background: "#fff9f96a",
                    color: "#ffff",
                    borderRadius: "50%",
                    textDecoration: "none",
                    fontWeight: 500,
                  }}
                >
                  <Icon
                    icon="cuida:open-in-new-tab-outline"
                    width="18"
                    height="18"
                  />
                </a>
              </Tooltip>

              {/* Download */}
              <Tooltip title="Download">
                <a
                  href={selectedFile}
                  download
                  style={{
                    fontSize: 12,
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    height: "33px",
                    width: "33px",
                    background: "#fff9f96a",
                    color: "#ffff",
                    borderRadius: "50%",
                    textDecoration: "none",
                    fontWeight: 500,
                  }}
                >
                  <Icon
                    icon="heroicons-solid:download"
                    width="20"
                    height="20"
                  />
                </a>
              </Tooltip>
            </div>

            {/* Image Preview */}
            <div
              style={{
                flex: 1,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                padding: 16,
              }}
            >
              <img
                src={selectedFile}
                alt="preview"
                style={{
                  maxWidth: "100%",
                  maxHeight: "100%",
                  objectFit: "contain",
                  borderRadius: 6,
                }}
              />
            </div>
          </div>
        )}

        {category === "other" && selectedFile && (
          <div
            style={{
              height: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              color: "#9ca3af",
              gap: 16,
              fontSize: 14,
            }}
          >
            <span style={{ fontSize: 40 }}>📎</span>
            <p style={{ margin: 0 }}>
              This file type cannot be previewed inline.
            </p>
            <Tooltip title="Download">
              <a
                href={selectedFile}
                download
                style={{
                  fontSize: 12,
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  height: "33px",
                  width: "33px",
                  background: "#fff9f96a",
                  color: "#ffff",
                  borderRadius: "50%",
                  textDecoration: "none",
                  fontWeight: 500,
                }}
              >
                <Icon icon="heroicons-solid:download" width="20" height="20" />
              </a>
            </Tooltip>
          </div>
        )}
      </div>
    </div>
  );
};

export default MultiFileViewer;
