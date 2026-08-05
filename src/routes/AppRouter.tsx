import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import AdminLayout from '../layouts/AdminLayout';

// Customer Pages (কাস্টমারদের পেজগুলো)
import Home from '../pages/customer/Home';
import CategoriesPage from '../pages/customer/CategoriesPage';
import CategoryProductsPage from '../pages/customer/CategoryProductsPage';
import CartPage from '../pages/customer/CartPage';
import CheckoutPage from '../pages/customer/CheckoutPage';
import LoginPage from '../pages/customer/LoginPage';
import RegisterPage from '../pages/customer/RegisterPage'; 
import ProfilePage from '../pages/customer/ProfilePage';
import ProductDetailsPage from '../pages/customer/ProductDetailsPage';
import AboutPage from '../pages/customer/AboutPage';
import FAQPage from '../pages/customer/FAQPage'; 
import PolicyPage from '../pages/customer/PolicyPage';

// Admin Pages (অ্যাডমিন প্যানেলের পেজগুলো)
import Dashboard from '../pages/admin/Dashboard';
import Products from '../pages/admin/Products';
import Orders from '../pages/admin/Orders';
import Customers from '../pages/admin/Customers';
import Coupons from '../pages/admin/Coupons';
import Settings from '../pages/admin/Settings';
import CategoryManagement from '../pages/admin/CategoryManagement';
import RecycleBin from '../pages/admin/RecycleBin';
import Security from '../pages/admin/Security';

export default function AppRouter() {
  return (
    <Routes>
      {/* Customer Routes (সবার জন্য উন্মুক্ত) */}
      <Route path="/" element={<MainLayout />}>
        <Route index element={<Home />} />
        <Route path="categories" element={<CategoriesPage />} />
        
        {/* 🚀 UNIVERSAL CATEGORY & PRODUCTS ROUTING (NO MORE BLACK SCREEN) */}
        <Route path="products" element={<CategoryProductsPage />} />
        <Route path="category/:categoryName" element={<CategoryProductsPage />} />
        <Route path="category/:id" element={<CategoryProductsPage />} />
        
        <Route path="about" element={<AboutPage />} />
        <Route path="cart" element={<CartPage />} />
        <Route path="checkout" element={<CheckoutPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="product/:id" element={<ProductDetailsPage />} />
        <Route path="faq" element={<FAQPage />} />
        
        {/* পলিসি পেজগুলোর রাউট */}
        <Route path="shipping" element={<PolicyPage />} />
        <Route path="privacy" element={<PolicyPage />} />
        <Route path="terms" element={<PolicyPage />} />

        {/* 🚀 Catch-all Wildcard (কোনো ভুল লিংক হলেও ব্ল্যাক স্ক্রিন না এসে হোমপেজে রিডাইরেক্ট হবে) */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>

      {/* Admin Routes (অ্যাডমিন প্যানেল) */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="products" element={<Products />} />
        <Route path="orders" element={<Orders />} />
        <Route path="customers" element={<Customers />} />
        <Route path="coupons" element={<Coupons />} />
        <Route path="security" element={<Security />} />
        <Route path="settings" element={<Settings />} />
        <Route path="category-management" element={<CategoryManagement />} />
        <Route path="recycle-bin" element={<RecycleBin />} />
      </Route>
    </Routes>
  );
}