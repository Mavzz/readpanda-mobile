import { getBackendUrl } from '../utils/Helper';
import { makeAuthenticatedGetRequest } from './authenticatedRequests';

const fetchManuscripts = async () => {
  const { status, response } = await makeAuthenticatedGetRequest(
    getBackendUrl('/books/all'),
  );

  return { status, response };
};

export { fetchManuscripts };