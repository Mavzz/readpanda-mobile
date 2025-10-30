import apiService from './apiService';

export const getRequest = async (url, headers = {}) => {
  return apiService.get(url, headers);
}

