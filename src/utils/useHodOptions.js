import { useCallback, useEffect, useRef, useState } from "react";
import apiClient from "../api/apiclient";

const HOD_ENDPOINT = "/accounts/liner/admin/users/hods/";

/**
 * HOD options for the sales-input and approval screens.
 *
 * Fetches once on mount and exposes `refresh` for a Select's `onOpenChange`,
 * so leave status and newly added HODs are current each time the list opens.
 *
 * `mapItem` must be referentially stable — define it at module scope, not
 * inline in the component, or the mount effect will re-run on every render.
 *
 * @param {(item: object) => object} mapItem maps an API row to a Select option
 * @returns {{options: object[], loading: boolean, refresh: () => Promise<void>}}
 */
export const useHodOptions = (mapItem) => {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);


  const inFlightRef = useRef(false);

  const refresh = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setLoading(true);

    try {
      const res = await apiClient.get(HOD_ENDPOINT);
      const data = res.data?.results ?? res.data ?? [];
      setOptions(data.map(mapItem));
    } catch (err) {

      console.warn("Failed to load HOD options:", err);
    } finally {
      inFlightRef.current = false;
      setLoading(false);
    }
  }, [mapItem]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { options, loading, refresh };
};
