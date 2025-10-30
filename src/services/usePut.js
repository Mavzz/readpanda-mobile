import apiService from './apiService';

export const putRequest = async (url, body = {}, headers = {}) => {
  return apiService.put(url, body, headers);
}