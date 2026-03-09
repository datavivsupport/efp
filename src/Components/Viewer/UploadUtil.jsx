import apiClient from "../../api/apiclient";

export const uploadFile = async (files) => {
  try {
    if (!files || !files.length) {
      throw new Error("No file provided");
    }

    const formData = new FormData();
    const file = files[0];

    if (file.originFileObj) {
      formData.append("file", file.originFileObj);
    } else {
      throw new Error("originFileObj not found in file");
    }

    const response = await apiClient.post(
      "/accounts/upload",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    return response?.data?.data?.s3_url;
  } catch (error) {
    console.error("Upload Error:", error);
    throw new Error("File upload failed");
  }
};