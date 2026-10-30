import { createContext, useContext } from "react";


export const STORAGE_KEY = "ui-zoom";


export const FONT_SIZES = {
  small: { label: "Small", rootFontSize: "14px", antdFontSize: 12 },
  medium: { label: "Medium", rootFontSize: "16px", antdFontSize: 14 },
  large: { label: "Large", rootFontSize: "18px", antdFontSize: 16 },
};

export const DEFAULT_SIZE = "medium";

export const FontSizeContext = createContext({
  fontSize: DEFAULT_SIZE,
  setFontSize: () => {},
});

export const useFontSize = () => useContext(FontSizeContext);
