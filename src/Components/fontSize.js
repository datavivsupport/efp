import { createContext, useContext } from "react";


export const STORAGE_KEY = "ui-zoom";


export const FONT_SIZES = {
  small: { label: "Small", rootFontSize: "14px", antdFontSize: 13 },
  medium: { label: "Medium", rootFontSize: "16px", antdFontSize: 15 },
  large: { label: "Large", rootFontSize: "18px", antdFontSize: 17 },
};

export const DEFAULT_SIZE = "medium";

export const FontSizeContext = createContext({
  fontSize: DEFAULT_SIZE,
  setFontSize: () => {},
});

export const useFontSize = () => useContext(FontSizeContext);
