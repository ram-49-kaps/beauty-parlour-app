import React, { useEffect, useState } from 'react'; // 👈 Import useEffect, useState
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import LoginModal from './components/LoginModal'; // 👈 Import LoginModal
import HomePage from './pages/HomePage';
import BookingPage from './pages/BookingPage';
import ServicesPage from './pages/ServicesPage';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Profile from './pages/Profile';
import AdminLogin from './pages/AdminLogin';
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import SplashScreen from './components/SplashScreen';
import ChatWidget from './components/ChatWidget'; // 👈 Import this

// 🔐 1. DEFINE YOUR SECRET URL
// Even if someone guesses the shortcut, they still won't see this URL unless they know it exists.
const SECRET_ADMIN_URL = "/secure-owner-portal-2026";

// Loading Component
const LoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center bg-stone-950">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
  </div>
);

// Admin Route
const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user || user.role !== 'admin') {
    return <Navigate to={SECRET_ADMIN_URL} replace />;
  }
  return children;
};

// Customer Route
const CustomerRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'admin') {
    return <Navigate to="/admin-dashboard" replace />;
  }
  return children;
};

// 🕵️‍♂️ 2. THE SECRET SHORTCUT LISTENER COMPONENT
const SecretKeyListener = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyPress = (event) => {
      // CHECK: Is user pressing Ctrl + Shift + L ?
      if (event.ctrlKey && event.shiftKey && (event.key === 'L' || event.key === 'l')) {
        event.preventDefault();
        console.log("🔒 Accessing Secure Portal...");
        navigate(SECRET_ADMIN_URL);
      }
    };

    // Start listening
    window.addEventListener('keydown', handleKeyPress);

    // Cleanup when leaving
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [navigate]);

  return null; // This component is invisible
};

// Layout
const Layout = ({ children }) => {
  const location = useLocation();
  const hideNavbarPaths = ['/admin-dashboard', SECRET_ADMIN_URL, '/reset-password', '/forgot-password'];
  const shouldHideNavbar = hideNavbarPaths.some(path => location.pathname.startsWith(path));

  // --- MODAL LOGIC START ---
  const [showLoginModal, setShowLoginModal] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      // Check if user has already seen the modal or is logged in
      const hasSeenModal = localStorage.getItem('hasSeenLoginModal');

      // Trigger if: Not seen, Not logged in, Scrolled > 300px
      if (!hasSeenModal && !user && window.scrollY > 300) {
        setShowLoginModal(true);
        localStorage.setItem('hasSeenLoginModal', 'true');
        // Remove listener once triggered
        window.removeEventListener('scroll', handleScroll);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [user]);
  // --- MODAL LOGIC END ---

  return (
    <div className="flex flex-col min-h-screen">
      <SecretKeyListener />
      <ChatWidget />
      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
      {!shouldHideNavbar && <Navbar />}
      <main className="flex-grow">
        {children}
      </main>
    </div>
  );
};

function App() {
  const [showSplash, setShowSplash] = useState(true);

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  return (
    <AuthProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/services" element={<ServicesPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />

            {/* 🔐 THE SECRET ROUTE */}
            <Route path={SECRET_ADMIN_URL} element={<AdminLogin />} />

            <Route path="/booking" element={<CustomerRoute><BookingPage /></CustomerRoute>} />
            <Route path="/profile" element={<CustomerRoute><Profile /></CustomerRoute>} />
            <Route path="/admin-dashboard" element={<AdminRoute><Dashboard /></AdminRoute>} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </Router>
    </AuthProvider>
  );
}

export default App;