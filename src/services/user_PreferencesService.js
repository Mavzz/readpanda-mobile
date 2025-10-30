import { postRequest } from "./usePost";
import { getRequest } from "./useGet";
import { getBackendUrl } from '../utils/Helper';
import log from '../utils/logger';

export const PreferenceService = {
    async updateUserPreferences(username, preferences, token) {
        let status, response;
        try {
            ({ status, response } = await postRequest(
                await getBackendUrl(`/user/preferences?username=${username}`),
                { username, preferences },
                { Authorization: `Bearer ${token}` }
            ));

            if (status === 200 || status === 201) {
                log.info('User preferences updated successfully');
                return { response, status };
            } else {
                log.error('Failed to update user preferences with status:', status);
                throw new Error('Failed to update preferences');
            }
        } catch (error) {
            log.error('Error updating user preferences:', error);
            throw error;
        }
    },

    async fetchUserPreferences(username, token) {
        let status, response;
        try {
            ({ status, response } = await getRequest(
                await getBackendUrl(`/user/preferences?username=${username}`),
                { Authorization: `Bearer ${token}` }
            ));

            if (status === 200) {
                log.info('User preferences fetched successfully');
                return { response, status };
            } else {
                log.error('Failed to fetch user preferences with status:', status);
                throw new Error('Failed to fetch preferences');
            }
        } catch (error) {
            log.error('Error fetching user preferences:', error);
            throw error;
        }
    }
}