import enhanceedStorage from '../utils/enhanceedStorage';
import { getBackendUrl } from '../utils/Helper';
import { getRequest } from '../services/useGet';

const fetchManuscripts = async (accessToken) => {

  const userToken = accessToken || await enhanceedStorage.getAuthToken();

  const { status, response } = await getRequest(
    await getBackendUrl('/books/all'),
    {
      Authorization: `Bearer ${userToken}`,
    },
  );

  return { status, response };
};

export { fetchManuscripts };