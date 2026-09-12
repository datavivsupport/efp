import { Button, Space } from "antd";
import { Icon } from "@iconify/react";

/**
 * Edit / Save controls for the Placement Details section.
 *
 * Renders nothing for a desk that may not edit, so every other role keeps the
 * read-only section it had before. Pairs with usePlacementEditing().
 */
const PlacementEditActions = ({ canEdit, editing, saving, onEdit, onSave, onCancel }) => {
  if (!canEdit) return null;

  return (
    <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
      {editing ? (
        <Space size={8}>
          <Button
            type="primary"
            icon={<Icon icon="mdi:content-save-outline" />}
            loading={saving}
            onClick={onSave}
          >
            Save
          </Button>
          <Button icon={<Icon icon="mdi:close" />} disabled={saving} onClick={onCancel}>
            Cancel
          </Button>
        </Space>
      ) : (
        <Button icon={<Icon icon="mdi:pencil-outline" />} onClick={onEdit}>
          Edit
        </Button>
      )}
    </div>
  );
};

export default PlacementEditActions;
