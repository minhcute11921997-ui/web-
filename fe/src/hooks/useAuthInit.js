import { useEffect } from 'react';
import useAuthStore from '../store/authStore';

export const useAuthInit = () => {
  useEffect(() => {
    useAuthStore.getState().initAuth();
  }, []);
};
