import { useRef, useState } from "react";
import { message } from "antd";
import apiClient from "../../../api/apiclient";
import { buildPlacementPayload } from "./payloadBuilders";

/**
 * Inline edit/save for the Placement Details section.
 *
 * The section is read-only until the user clicks the edit icon; the save icon
 * then PATCHes only transportation_rows, so persisting a placement change never
 * touches fields owned by another desk and never advances the job's stage.
 * Cancel puts the rows back the way they were found.
 *
 * @param {object}  opts.form  — the page's antd form instance
 * @param {string}  opts.id    — sales input id
 */
export const usePlacementEditing = ({ form, id }) => {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const snapshot = useRef(null);
  const throttle = useRef(false);

  const startEdit = () => {
    snapshot.current = form.getFieldValue("placementRows");
    setEditing(true);
  };

  const cancelEdit = () => {
    form.setFieldsValue({ placementRows: snapshot.current });
    setEditing(false);
  };

  const savePlacement = async () => {
    if (throttle.current) return;
    throttle.current = true;
    setSaving(true);
    try {
      const payload = buildPlacementPayload(form.getFieldsValue());
      const res = await apiClient.patch(`/liner/sales-input/${id}/`, payload);
      if (res.data?.status === "success" || res.status === 200 || res.status === 201) {
        message.success(res.data?.message || "Placement details saved");
        snapshot.current = form.getFieldValue("placementRows");
        setEditing(false);
      } else {
        message.error(res.data?.message || "Failed to save placement details");
      }
    } catch (err) {
      message.error(err.response?.data?.message || "Failed to save placement details");
    } finally {
      throttle.current = false;
      setSaving(false);
    }
  };

  return { editing, saving, startEdit, cancelEdit, savePlacement };
};
