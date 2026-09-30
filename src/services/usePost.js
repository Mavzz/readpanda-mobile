import apiService from './apiService';

export const postRequest = async (url, body = {}, headers = {}, options = {}) => {
  return apiService.post(url, body, headers, options);
};
