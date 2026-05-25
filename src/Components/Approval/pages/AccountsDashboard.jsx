import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Typography, Card, Tag, Space, Spin, message, Button } from "antd";
import { Icon } from "@iconify/react";
import CommonTable from "../../Commontable/Commontable";
import apiClient from "../../../api/apiclient";
import dayjs from "../../../dayjs-config";

const { Title } = Typography;

const AccountsDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchAccountsJobs = async (p = 1, ps = 10) => {
    setLoading(true);
    try {
      const res = await apiClient.get("/liner/sales-input/accounts-pending/", {
        params: { page: p, page_size: ps },
      });

      // Handle both wrapped {status: "success", data: {...}} and direct DRF {...} responses
      const responseBody = res.data;
      const responseData = responseBody.status === "success" ? responseBody.data : responseBody;
      const results = responseData.results || (Array.isArray(responseData) ? responseData : []);
      const count = responseData.count ?? results.length;

      setData(results.map(item => ({
        ...item,
        key: item.id.toString(),
      })));
      setTotal(count);
    } catch (error) {
      console.error("Error fetching accounts jobs:", error);
      message.error("Failed to fetch jobs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccountsJobs(page, pageSize);
  }, [page, pageSize]);

  const columns = [
    {
      title: "Export No",
      dataIndex: "export_number",
      key: "export_number",
      render: (text) => <span style={{ fontWeight: 600, color: "#1890ff" }}>{text}</span>,
    },
    {
      title: "Customer",
      dataIndex: "customer_name",
      key: "customer_name",
    },
    {
      title: "Job Type",
      dataIndex: "job_type",
      key: "job_type",
      render: (type) => (
        <Tag color={type === "LINER" ? "cyan" : "blue"}>{type}</Tag>
      ),
    },
    {
      title: "Stage",
      dataIndex: "current_stage",
      key: "current_stage",
      render: (stage) => (
        <Tag color={stage === "6" ? "green" : "gold"}>
          {stage === "6" ? "Accounts Stage" : `Stage ${stage}`}
        </Tag>
      ),
    },
    {
      title: "Pending With",
      dataIndex: "pending_with",
      key: "pending_with",
      render: (pw) => pw || "-",
    },
    {
      title: "Created At",
      dataIndex: "created_at",
      key: "created_at",
      render: (date) => dayjs(date).format("DD MMM YYYY"),
    },
    {
      title: "Action",
      key: "action",
      render: (_, record) => (
        <Button
          type="primary"
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            window.open(`/approval/${record.id}/accounts`, "_blank");
          }}
        >
          Open Accounts
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: "20px", backgroundColor: "#eff8ff", minHeight: "100vh" }}>
      <Space direction="vertical" style={{ width: "100%" }} size="large">
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Icon icon="mdi:finance" width="32" height="32" style={{ color: "#00aea6" }} />
          <Title level={2} style={{ margin: 0 }}>Accounts Queue</Title>
        </div>

        <Card style={{ borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
          <CommonTable
            columns={columns}
            data={data}
            loading={loading}
            total={total}
            page={page}
            pagesize={pageSize}
            onTableChange={(pagination) => {
              setPage(pagination.current);
              setPageSize(pagination.pageSize);
              fetchAccountsJobs(pagination.current, pagination.pageSize);
            }}
            onRow={(record) => ({
              onClick: () => {
                window.open(`/approval/${record.id}/accounts`, "_blank");
              },
              style: { cursor: "pointer" },
            })}
          />
        </Card>
      </Space>
    </div>
  );
};

export default AccountsDashboard;
