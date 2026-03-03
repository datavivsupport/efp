import React from "react";
import { Select } from "antd";

const CATEGORY_OPTIONS = [
  { label: "SOC", value: "SOC" },
  { label: "Laden", value: "Laden" },
  { label: "Road", value: "Road" },
  { label: "Heavy Duty (HD)", value: "HeavyDuty(HD)" },
  { label: "GP", value: "GP" },
  { label: "Reefer", value: "Reefer" },
  { label: "DG", value: "DG" },
  { label: "SPL", value: "SPL" },
  { label: "Empty", value: "Empty" },
  { label: "CBM", value: "CBM" },
  { label: "Weight", value: "Weight" },
  { label: "Full Truck Load", value: "FullTruckLoad" },
  { label: "Flat rack", value: "Flatrack" },
  { label: "Open Top", value: "OpenTop" },
];

const CategorySelect = ({
  placeholder = "Select Category",
  ...rest
}) => {
  return (
    <Select
      allowClear
      placeholder={placeholder}
      options={CATEGORY_OPTIONS}
      {...rest}
    />
  );
};

export default CategorySelect;