import apiClient from "../api/apiclient";

/**
 * deleteDocument - Delete a document for a sales input
 * @param {string|number} salesInputId
 * @param {string|number} docId
 * @returns {Promise} axios response
 */
export async function deleteDocument(salesInputId, docId) {
  if (!salesInputId || !docId) {
    throw new Error("salesInputId and docId are required to delete a document");
  }
  try {
    const res = await apiClient.post(`/liner/sales-input/${salesInputId}/delete-document/`, { document_id: docId });
    return res;
  } catch (err) {
    // rethrow so callers can handle user-facing messages
    throw err;
  }
}
