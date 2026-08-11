import { useEffect, useRef, useState } from "react";
import { Tooltip } from "antd";

const TOOLTIP_STYLES = {
  root: { maxWidth: 480 },
  container: { maxHeight: 320, overflowY: "auto", whiteSpace: "pre-wrap" },
};

const ScrollSafeTooltip = ({ children, shouldOpen, mouseEnterDelay = 0.25, ...rest }) => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => {
     
      const target = e?.target;
      if (target?.nodeType === 1 && target.closest?.(".ant-tooltip")) return;
      setOpen(false);
    };
   
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  const handleOpenChange = (next) => {
    if (next && shouldOpen && !shouldOpen()) return;
    setOpen(next);
  };

  return (
    <Tooltip {...rest} open={open} onOpenChange={handleOpenChange} mouseEnterDelay={mouseEnterDelay}>
      {children}
    </Tooltip>
  );
};

export const ClampedText = ({ children, title, rows = 2, maxWidth, style }) => {
  const ref = useRef(null);

  const isTruncated = () => {
    const el = ref.current;
    if (!el) return false;
    return el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1;
  };

  return (
    <ScrollSafeTooltip title={title ?? children} placement="topLeft" shouldOpen={isTruncated} styles={TOOLTIP_STYLES}>
      <div
        ref={ref}
        style={{
          maxWidth,
          display: "-webkit-box",
          WebkitLineClamp: rows,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
          whiteSpace: "normal",
          wordBreak: "break-word",
          overflowWrap: "anywhere",
          cursor: "default",
          ...style,
        }}
      >
        {children}
      </div>
    </ScrollSafeTooltip>
  );
};

// "Remarks" cell of the approval-history tables.
export const RemarksCell = ({ value, width = 320 }) => (
  <ClampedText maxWidth={width}>{value || "N/A"}</ClampedText>
);

export default ScrollSafeTooltip;
