import axios from 'axios' ;

const axiosInstance = axios.create({
    baseURL: 'http://localhost:3000/api',
}) ;

axiosInstance.interceptors.request.use(config => {
    const token  = localStorage.getItem('token');
    console.log('Request to:', config.url);
    console.log('Token:', token ? token.substring(0, 20) + '...' : 'NO TOKEN');
    if(token){
        config.headers.Authorization = `Bearer ${token}`;
        console.log('Authorization header set');
    } else {
        console.log('WARNING: No token in localStorage!');
    }
    return config;
});

axiosInstance.interceptors.response.use(
    response => {
        console.log('Response status:', response.status);
        return response;
    },
    (error) => {
        console.log('Error response:', error.response?.status, error.response?.data?.message);
        if( error.response?.status ===401) {
            localStorage.removeItem('token');
            window.location.href ='/login';
        }
        return Promise.reject(error);
    }
);

export default axiosInstance;
