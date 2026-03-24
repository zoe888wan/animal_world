/**
 * 应用根组件
 * 功能：路由配置、认证提供者、受保护路由封装
 */
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CompanionProvider } from './context/CompanionContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Feed from './pages/Feed';
import MyPets from './pages/MyPets';
import Shop from './pages/Shop';
import Events from './pages/Events';
import StarRank from './pages/StarRank';
import Profile from './pages/Profile';
import UserProfile from './pages/UserProfile';

/** 需登录才能访问，未登录重定向到 /login */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token, loading } = useAuth();
  if (loading) return <div className="loading">加载中...</div>;
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/" element={<ProtectedRoute><CompanionProvider><Layout /></CompanionProvider></ProtectedRoute>}>
        <Route index element={<Feed />} />
        <Route path="pets" element={<MyPets />} />
        <Route path="shop" element={<Shop />} />
        <Route path="events" element={<Events />} />
        <Route path="stars" element={<StarRank />} />
        <Route path="profile" element={<Profile />} />
        <Route path="users/:id" element={<UserProfile />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

/** 根组件：提供认证上下文，渲染路由 */
export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
