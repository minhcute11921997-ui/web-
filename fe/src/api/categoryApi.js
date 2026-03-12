import axiosInstance from './config';

export const getAllCategories = () => {
  return axiosInstance.get('/categories');
};
