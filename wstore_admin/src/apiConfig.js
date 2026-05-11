const BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api/admin`
  : '/api/admin';

export const API_ENDPOINTS = {
  LOGIN: `${BASE_URL}/login`,
  TENANTS: `${BASE_URL}/tenants`,
  BRANCHES: `${BASE_URL}/branches`,
  SUPPORT_REQUESTS: `${BASE_URL}/support-requests`,
  CATEGORIES: `${BASE_URL}/categories`,
  PRODUCTS: `${BASE_URL}/products`,
  PRODUCTS_BASIC: `${BASE_URL}/products/basic`,
  ORDERS: `${BASE_URL}/orders`,
  CUSTOMERS: `${BASE_URL}/customers`,
  ANALYTICS: `${BASE_URL}/analytics`,
  BROADCAST: `${BASE_URL}/customers/broadcast`,
  FCM_REGISTER: `${BASE_URL}/fcm/register`,
  FCM_UNREGISTER: `${BASE_URL}/fcm/unregister`,
  NOTIFICATIONS: `${BASE_URL}/notifications`,
  NOTIFICATIONS_READ: `${BASE_URL}/notifications/read`,
  PRODUCT_SALES: `${BASE_URL}/product-sales`,
  OFFERS: `${BASE_URL}/offers`,
  WHATSAPP_SETTINGS: `${BASE_URL}/tenants/me/whatsapp-settings`,
};

export const getHeaders = () => {
  const token = localStorage.getItem('adminToken');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};
