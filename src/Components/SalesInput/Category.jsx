import React, { useState, useEffect } from "react";
import { Select } from "antd";
import apiClient from "../../api/apiclient";

const CategorySelect = ({
  placeholder = "Select Category",
  ...rest
}) => {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fetchCategories = async () => {
      setLoading(true);
      try {
        const res = await apiClient.get("/accounts/master/EFPCategory/");
        if (!cancelled) {
          const data = res.data?.results ?? res.data ?? [];
          setOptions(
            data.map((item) => ({ label: item.name, value: item.name }))
          );
        }
      } catch (err) {
        console.error("Failed to load categories", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchCategories();
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

export default CategorySelect;