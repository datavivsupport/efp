import React, { useState, useEffect } from "react";
import { Select, message } from "antd";
import type { SelectProps } from "antd";
import apiClient from "../../api/apiclient";

const { Option } = Select;

interface DataItem {
  id: number | string;
  name: string;
  [key: string]: any;
}

interface SearchableSelectProps
  extends Omit<
    SelectProps,
    "loading" | "onSearch" | "filterOption" | "notFoundContent"
  > {
  url: string;
  searchParam?: string;
  orderingParam?: string;
  labelKey?: string;
  valueKey?: string;
  extraParams?: Record<string, string>;
  debounceMs?: number;
  pageSize?: number;
  initialOptions?: DataItem[];
  placeholder?: string;
  mode?: "multiple" | "tags";
  allowCreate?: boolean;
  createPayloadKey?: string;
  onCreateSuccess?: (newItem: DataItem) => void;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({
  url,
  searchParam = "search",
  orderingParam = "ordering",
  labelKey = "name",
  valueKey = "id",
  extraParams = {},
  debounceMs = 500,
  pageSize = 10,
  placeholder = "Select Option",
  initialOptions = [],
  mode,
  value,
  onChange,
  allowCreate = false,
  createPayloadKey = "name",
  onCreateSuccess,
  ...selectProps
}) => {
  const [data, setData] = useState<DataItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [creating, setCreating] = useState(false);
  const [selectedOption, setSelectedOption] = useState<DataItem | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  /* ------------------ Resolve initial value ------------------ */
  useEffect(() => {
    if (!value) return;

    const fromInitial = initialOptions.find((item) => item[valueKey] === value);

    if (fromInitial) {
      setSelectedOption(fromInitial);
      setData([fromInitial]);
      return;
    }

    (async () => {
      try {
        const res = await apiClient.get(`${url}${value}/`);
        const result = res.data;
        if (result) {
          setSelectedOption(result);
          setData([result]);
        }
      } catch (err) {
        console.error("Failed to load selected option", err);
      }
    })();
  }, [value]);

  /* ------------------ Fetch data ------------------ */
  const fetchData = async (search = "", nextPage = 1) => {
    setLoading(true);
    try {
      let fetchUrl = `${url}?page=${nextPage}&page_size=${pageSize}&${orderingParam}=${labelKey}&is_active=true`;

      if (search) fetchUrl += `&${searchParam}=${search}`;

      Object.entries(extraParams).forEach(([k, v]) => {
        fetchUrl += `&${k}=${v}`;
      });

      const resp = await apiClient.get(fetchUrl);
      const results = resp.data.results || [];
      const totalCount = resp.data.count || 0;

      if (nextPage === 1) {
        const merged = selectedOption
          ? [
              selectedOption,
              ...results.filter(
                (r: DataItem) => r[valueKey] !== selectedOption[valueKey],
              ),
            ]
          : results;

        setData(merged);
      } else {
        setData((prev) => [...prev, ...results]);
      }

      setHasMore(nextPage * pageSize < totalCount);
      setPage(nextPage);
    } catch (err) {
      console.error(err);
      if (nextPage === 1) setData([]);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  };

  /* ------------------ Debounced search ------------------ */
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData(searchValue, 1);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [searchValue, selectedOption]);

  /* ------------------ Create ------------------ */
  const handleCreate = async () => {
    if (!searchValue.trim()) return;

    setCreating(true);
    try {
      const payload = {
        [createPayloadKey]: searchValue.trim(),
        ...extraParams,
      };

      const res = await apiClient.post(url, payload);
      const newItem = res.data;

      message.success(`"${newItem[labelKey]}" created`);

      setSelectedOption(newItem);
      setData((prev) => [
        newItem,
        ...prev.filter((i) => i[valueKey] !== newItem[valueKey]),
      ]);

      onChange?.(newItem[valueKey]);
      setSearchValue("");
      onCreateSuccess?.(newItem);
    } finally {
      setCreating(false);
    }
  };

  /* ------------------ Change ------------------ */
  const handleChange = (val: any) => {
    if (!val) {
      setSelectedOption(null);
      onChange?.(val);
      // If the selection is cleared, also reset the search value and re-fetch initial data
      setSearchValue("");
      fetchData("", 1); // Re-fetch initial data
      return;
    }

    const opt = data.find((i) => i[valueKey] === val);
    if (opt) setSelectedOption(opt);

    onChange?.(val);
    setSearchValue(""); // Clear search value after selection
    fetchData("", 1); // Re-fetch initial data
  };

  const hasExactMatch = data.some(
    (item) =>
      String(item[labelKey]).toLowerCase().trim() ===
      searchValue.toLowerCase().trim(),
  );

  const showCreateOption =
    allowCreate && searchValue.trim() && !hasExactMatch && !loading;

  /* ------------------ Infinite scroll ------------------ */
  const handlePopupScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    if (target.scrollTop + target.offsetHeight >= target.scrollHeight - 20) {
      if (!loading && hasMore) {
        fetchData(searchValue, page + 1);
      }
    }
  };

  return (
    <Select
      showSearch
      allowClear
      placeholder={placeholder}
      value={value}
      mode={mode}
      loading={loading || creating}
      filterOption={false}
      onSearch={setSearchValue}
      onChange={handleChange}
      onPopupScroll={handlePopupScroll}
      notFoundContent={
        loading || creating
          ? creating
            ? "Creating..."
            : "Searching..."
          : "No results found"
      }
      dropdownRender={(menu) => (
        <>
          {menu}
          {showCreateOption && (
            <div
              style={{
                borderTop: "1px solid #f0f0f0",
                padding: 8,
                cursor: "pointer",
                color: "#1890ff",
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                handleCreate();
              }}
            >
              + Create "{searchValue}"
            </div>
          )}
        </>
      )}
      onInputKeyDown={(e) => {
        if (
          e.key === "Enter" &&
          allowCreate &&
          searchValue.trim() &&
          !hasExactMatch
        ) {
          e.preventDefault();
          handleCreate();
        }
      }}
      {...selectProps}
    >
      {data.map((item) => (
        <Option key={item[valueKey]} value={item[valueKey]}>
          {item[labelKey]}
        </Option>
      ))}
    </Select>
  );
};

export default SearchableSelect;
