import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const ProtectedRoute = () => {
  const { currentUser, loading } = useAuth();

  // admin@example.comのみを管理者と認識する
  //const isAdmin = currentUser?.email === 'eterynity2024workplace@gmail.com';

  if (loading) {
    return <div>ローディング中...</div>;
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
