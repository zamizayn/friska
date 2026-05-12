import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import DashboardLayout from './components/DashboardLayout';
import Dashboard from './pages/Dashboard';
import Categories from './pages/Categories';
import Products from './pages/Products';
import Orders from './pages/Orders';
import Customers from './pages/Customers';
import Branches from './pages/Branches';
import Tenants from './pages/Tenants';
import OnboardingWizard from './pages/OnboardingWizard';
import Landing from './pages/Landing';
import OnboardingGuide from './pages/OnboardingGuide';
import Inventory from './pages/Inventory';
import ProductSales from './pages/ProductSales';


import Support from './pages/Support';
import Notifications from './pages/Notifications';
import Offers from './pages/Offers';
import Settings from './pages/Settings';
import WhatsAppSettings from './pages/WhatsAppSettings';
import ChangePassword from './pages/ChangePassword';

const ProtectedRoute = ({ children }) => {
    const token = localStorage.getItem('adminToken');
    if (!token) return <Navigate to="/login" />;
    return children;
};

export default function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/onboarding-steps" element={<OnboardingGuide />} />
                <Route path="/onboard-wizard" element={<OnboardingWizard />} />
                <Route path="/login" element={<Login />} />
                <Route
                    path="/admin"
                    element={
                        <ProtectedRoute>
                            <DashboardLayout />
                        </ProtectedRoute>
                    }
                >
                    <Route index element={<Dashboard />} />
                    <Route path="branches" element={<Branches />} />
                    <Route path="tenants" element={<Tenants />} />
                    <Route path="categories" element={<Categories />} />
                    <Route path="products" element={<Products />} />
                    <Route path="product-sales" element={<ProductSales />} />
                    <Route path="inventory" element={<Inventory />} />
                    <Route path="orders" element={<Orders />} />
                    <Route path="customers" element={<Customers />} />
                    <Route path="support" element={<Support />} />
                    <Route path="notifications" element={<Notifications />} />
                    <Route path="offers" element={<Offers />} />
                    <Route path="settings" element={<Settings />} />
                    <Route path="whatsapp-settings" element={<WhatsAppSettings />} />
                    <Route path="change-password" element={<ChangePassword />} />
                </Route>
            </Routes>
        </Router>
    );
}
