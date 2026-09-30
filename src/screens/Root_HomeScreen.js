import React from 'react';
import useAuthStore from '../stores/authStore';
import MainTabNavigator from '../navigation/MainTabNavigator';
import log from '../utils/logger';

const Root = () => {
  const user = useAuthStore((s) => s.user);
  
  log.info(`Root screen loaded for user: ${user?.username}`);
  
  // This component is now just a wrapper, the actual tab navigation is in MainTabNavigator
  return <MainTabNavigator />;
};

export default Root;