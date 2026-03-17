import { useState, useEffect } from 'react';
import { useNavigationState } from '@react-navigation/native';

export const useScreenTracking = () => {
  const [previousScreen, setPreviousScreen] = useState(null);
  const [currentScreen, setCurrentScreen] = useState(null);
  
  const navigationState = useNavigationState(state => state);

  useEffect(() => {
    if (navigationState) {
      const currentRouteName = navigationState?.routes[navigationState.index]?.name;
      const previousRouteName = navigationState?.routes[navigationState.index - 1]?.name;

      setCurrentScreen(currentRouteName);
      setPreviousScreen(previousRouteName);
    }
  }, [navigationState]);

  return {
    previousScreen,
    currentScreen,
  };
};