import React, { useState, useEffect } from "react";
import { Select } from "antd";
import apiClient from "../../api/apiclient";

const EquipmentTypeSelect = ({
  placeholder = "Select Equipment Type",
  ...rest
}) => {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fetchEquipment = async () => {
      setLoading(true);
      try {
        const res = await apiClient.get("/accounts/master/EFPEquipment/");
        if (!cancelled) {
          const data = res.data?.results ?? res.data ?? [];
          setOptions(
            data.map((item) => ({ label: item.name, value: item.name }))
          );
        }
      } catch (err) {
        console.error("Failed to load equipment types", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchEquipment();
    return () => { cancelled = true; };
  }, []);

  return (
    <Select
      allowClear
      placeholder={placeholder}
      options={options}
      loading={loading}
      showSearch
      filterOption={(input, option) =>
        (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
      }
      {...rest}
    />
  );
};

export default EquipmentTypeSelect;