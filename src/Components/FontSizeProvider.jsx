import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ConfigProvider } from "antd";
import {
  DEFAULT_SIZE,
  FONT_SIZES,
  FontSizeContext,
  STORAGE_KEY,
} from "./fontSize";

const readStoredSize = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return FONT_SIZES[stored] ? stored : DEFAULT_SIZE;
  } catch {
    return DEFAULT_SIZE;
  }
};

const FontSizeProvider = ({ children }) => {
  const [fontSize, setFontSizeState] = useState(readStoredSize);

  useEffect(() => {
    document.documentElement.style.fontSize = FONT_SIZES[fontSize].rootFontSize;
  }, [fontSize]);

  const setFontSize = useCallback((size) => {
    if (!FONT_SIZES[size]) return;
    setFontSizeState(size);
    try {
      localStorage.setItem(STORAGE_KEY, size);
    } catch {
      // Storage unavailable (private mode) — the choice just won't persist
    }
  }, []);

  const value = useMemo(
    () => ({ fontSize, setFontSize }),
    [fontSize, setFontSize],
  );

  return (
    <FontSizeContext.Provider value={value}>
      <ConfigProvider
        theme={{
          token: {
            fontSize: FONT_SIZES[fontSize].antdFontSize,
            colorTextPlaceholder: "rgba(0, 0, 0, 0.45)",
          },
        }}
      >
        {children}
      </ConfigProvider>
    </FontSizeContext.Provider>
  );
};

export default FontSizeProvider;
