import { Modal } from "antd";

// Confirmation popups shown before a job action is sent to the server
const PRESETS = {
  submit: {
    title: "Submit this job?",
    content: "The job will be sent for approval.",
    okText: "Yes, submit",
  },
  verify: {
    title: "Verify & confirm this job?",
    content: "Your details will be confirmed and the job will move to the next step.",
    okText: "Yes, confirm",
  },
  resubmit: {
    title: "Resubmit this job?",
    content: "The job will be sent again for approval with the details you entered.",
    okText: "Yes, resubmit",
  },
  approve: {
    title: "Approve this job?",
    content: "The job will move to the next step.",
    okText: "Yes, approve",
  },
  reject: {
    title: "Reject this job?",
    content: "The job will be sent back with your remarks.",
    okText: "Yes, reject",
    okButtonProps: { danger: true },
  },
  save: {
    title: "Save changes?",
    content: "Your changes will be saved.",
    okText: "Yes, save",
  },
  cancel: {
    title: "Leave this page?",
    content: "Any changes you have not saved will be lost.",
    okText: "Yes, leave",
    cancelText: "Stay",
  },
};

/**
 * Ask the user to confirm an action. Resolves true on OK, false on Cancel.
 * @param kind      "submit" | "verify" | "resubmit" | "approve" | "reject" | "save" | "cancel"
 * @param setBusy   optional loading setter — turned off while the popup is open
 *                  so the page spinner doesn't show behind it, and back on after OK
 * @param overrides optional Modal.confirm props (title, content, okText…)
 */
export const confirmAction = (kind, setBusy, overrides = {}) =>
  new Promise((resolve) => {
    setBusy?.(false);
    Modal.confirm({
      className: "dms-confirm",
      cancelText: "Cancel",
      ...PRESETS[kind],
      ...overrides,
      onOk: () => {
        setBusy?.(true);
        resolve(true);
      },
      onCancel: () => resolve(false),
    });
  });

/** Page Cancel button: ask first, then go back to the home page. */
export const confirmLeave = async (navigate) => {
  if (await confirmAction("cancel")) navigate("/");
};
