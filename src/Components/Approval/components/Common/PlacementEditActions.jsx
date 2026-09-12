import { Icon } from "@iconify/react";
import ScrollSafeTooltip from "../../../ScrollSafeTooltip";
import Styles from "../../Approval.module.css";

/**
 * Edit / Save controls for the Placement Details section.
 *
 * Same icon button as the navbar's: a 35px white tile with a 20x20 Iconify
 * glyph in brand teal, going to the brand gradient on hover (see .iconAction
 * in Approval.module.css, which mirrors Navbar.module.css .buttonnew).
 *
 * Renders nothing for a desk that may not edit, so every other role keeps the
 * read-only section it had before. Pairs with usePlacementEditing().
 */
const PlacementEditActions = ({ canEdit, editing, saving, onEdit, onSave, onCancel }) => {
  if (!canEdit) return null;

  return (
    <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 8 }}>
      {editing ? (
        <>
          <ScrollSafeTooltip title="Save Placement Details">
            <button
              type="button"
              className={Styles.iconAction}
              disabled={saving}
              onClick={onSave}
            >
              <Icon
                height="20"
                width="20"
                icon={saving ? "mdi:loading" : "mdi:content-save-outline"}
                className={saving ? Styles.iconActionSpin : undefined}
              />
            </button>
          </ScrollSafeTooltip>
          <ScrollSafeTooltip title="Cancel">
            <button
              type="button"
              className={Styles.iconAction}
              disabled={saving}
              onClick={onCancel}
            >
              <Icon height="20" width="20" icon="mdi:close" />
            </button>
          </ScrollSafeTooltip>
        </>
      ) : (
        <ScrollSafeTooltip title="Edit Placement Details">
          <button type="button" className={Styles.iconAction} onClick={onEdit}>
            <Icon height="20" width="20" icon="mdi:pencil-outline" />
          </button>
        </ScrollSafeTooltip>
      )}
    </div>
  );
};

export default PlacementEditActions;
