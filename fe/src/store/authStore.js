import { create } from 'zustand';

const useAuthStore = create((set, get) => ({
  user: null,
  token: null,
  initialized: false,

  initAuth: () => {
    const user = JSON.parse(localStorage.getItem('user')) || null;
    const token = localStorage.getItem('token') || null;
    set({ user, token, initialized: true });
    console.log('Auth initialized:', { user: user?.username, token: token ? 'present' : 'null' });
  },

  setAuth: (user, token) => {
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('token', token);
    set({ user, token });
    console.log('Auth updated:', { user: user?.username, token: token ? 'present' : 'null' });
  },

  logout: () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    set({ user: null, token: null });
  },

  setUser: (userData) => {
    localStorage.setItem('user', JSON.stringify(userData));
    set({ user: userData });
  },

  isAdmin: () => get().user?.role === 'admin',
}));

export default useAuthStore;
