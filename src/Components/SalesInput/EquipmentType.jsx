import React from "react";
import { Select } from "antd";

const EQUIPMENT_TYPE_OPTIONS = [
  { label: "40 HC RF", value: "40 HC RF" },
  { label: "40 HQ", value: "40 HQ" },
  { label: "SOC", value: "SOC" },
  { label: "Truck", value: "Truck" },
  { label: "ISO Tanks", value: "ISO Tanks" },
  { label: "20GP", value: "20GP" },
  { label: "40GP", value: "40GP" },
  { label: "Reefer 20", value: "Reefer 20" },
  { label: "Reefer 40", value: "Reefer 40" },
  { label: "LCL", value: "LCL" },
  { label: "B/Bulk", value: "B/Bulk" },
  { label: "Air Shipment", value: "Air Shipment" },
  { label: "Roro", value: "Roro" },
];

const EquipmentTypeSelect = ({
  placeholder = "Select Equipment Type",
  ...rest
}) => {
  return (
    <Select
      allowClear
      placeholder={placeholder}
      options={EQUIPMENT_TYPE_OPTIONS}
      {...rest}
    />
  );
};

export default EquipmentTypeSelect;