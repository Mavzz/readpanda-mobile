import React from 'react';
import { useAuth } from "../contexts/AuthContext";
import MainTabNavigator from '../navigation/MainTabNavigator';
import log from "../utils/logger";

const Root = () => {
  const { user } = useAuth();
  
  log.info(`Root screen loaded for user: ${user?.username}`);
  
  // This component is now just a wrapper, the actual tab navigation is in MainTabNavigator
  return <MainTabNavigator />;
};

export default Root;