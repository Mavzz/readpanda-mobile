import apiService from './apiService';

export const postRequest = async (url, body = {}, headers = {}) => {
  return apiService.post(url, body, headers);
};
