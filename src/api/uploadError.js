/**
 * What actually went wrong with a document upload, in words the user can act on.
 *
 * Every upload handler used to collapse the whole catch into one string -
 * "Upload failed. Please check your connection." - which is the fallback taken
 * whenever `err.response` is absent. That hid the case this was written for: a
 * request the server accepted and answered 201 for, whose response never reached
 * the browser. The document was saved, the toast said the connection was broken,
 * and there was nothing in the console to tell the two apart.
 *
 * The distinction that matters to the user is whether the file made it. A server
 * that answers with a rejection means it did not; no answer at all means nobody
 * knows without a refresh, and saying "check your connection" there invites them
 * to upload the same document a second time.
 */
export const uploadErrorMessage = (err) => {
  // The server answered and said no. Its own wording is the most useful thing we
  // can show - the API sends a human message for every rejection it raises.
  const serverMessage = err?.response?.data?.message;
  if (serverMessage) return serverMessage;

  const httpStatus = err?.response?.status;
  if (httpStatus) return `Upload failed (HTTP ${httpStatus}). Please try again.`;

  // No response object at all: the request never completed a round trip, so the
  // upload may well have succeeded on the server. axios names the reason in
  // `code`, and the request interceptor in apiclient.js rejects blocked requests
  // as cancellations.
  switch (err?.code) {
    case "ERR_NETWORK":
      return "Upload failed: the server could not be reached. Refresh before retrying - the file may already have been saved.";
    case "ERR_CANCELED":
      return "Upload was cancelled before the server replied. Refresh to check whether the file was saved.";
    case "ECONNABORTED":
      return "Upload timed out before the server replied. Refresh to check whether the file was saved.";
    default:
      return "Upload failed: no response from the server. Refresh to check whether the file was saved.";
  }
};

/** The toast for a document that IS saved, whose on-screen list could not be updated. */
export const uploadSucceededUiFailedMessage = (label) =>
  `${label || "Document"} was uploaded, but the page could not be updated. Refresh to see it.`;
