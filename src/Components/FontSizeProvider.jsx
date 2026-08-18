import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { ConfigProvider } from "antd";

/* Same storage key and size names as the admin app's TopBar. */
const STORAGE_KEY = "ui-zoom";

/*
  Two numbers per size, because EFP scales on two tracks:
   - rootFontSize drives rem-based Tailwind utilities via <html>
   - antdFontSize drives the antd theme token, which is px and would
     otherwise ignore the root size entirely

  "medium" reproduces the previous hardcoded defaults (browser-default root
  + antd fontSize 15), so the app looks unchanged until a user opts in.
*/
export const FONT_SIZES = {
  small: { label: "Small", rootFontSize: "14px", antdFontSize: 13 },
  medium: { label: "Medium", rootFontSize: "16px", antdFontSize: 15 },
  large: { label: "Large", rootFontSize: "18px", antdFontSize: 17 },
};

const DEFAULT_SIZE = "medium";

const FontSizeContext = createContext({
  fontSize: DEFAULT_SIZE,
  setFontSize: () => {},
});

export const useFontSize = () => useContext(FontSizeContext);

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
            colorTextPlaceholder: "rgba(0, 0, 0, 0.85)",
          },
        }}
      >
        {children}
      </ConfigProvider>
    </FontSizeContext.Provider>
  );
};

export default FontSizeProvider;
