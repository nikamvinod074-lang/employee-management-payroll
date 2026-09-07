import { useCallback, useEffect, useState } from "react";

import { getErrorMessage } from "../services/api";

/**
 * Generic hook for server-side paginated + filtered + searched list views.
 * `fetchFn` must be a function of the shape (params) => Promise<AxiosResponse>
 * where the response body matches DRF's StandardResultsPagination shape.
 */
export function usePaginatedList(fetchFn, initialParams = {}) {
  const [params, setParams] = useState({ page: 1, ...initialParams });
  const [data, setData] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: body } = await fetchFn(params);
      setData(body.results ?? body);
      setMeta(body.results ? body : null);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(params)]);

  useEffect(() => {
    load();
  }, [load]);

  const updateParams = (patch) => {
    setParams((prev) => ({ ...prev, page: 1, ...patch }));
  };

  const setPage = (page) => setParams((prev) => ({ ...prev, page }));

  return { data, meta, loading, error, params, updateParams, setPage, reload: load };
}
