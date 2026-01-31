import React, { useEffect, useState } from 'react'; // 👈 Import useEffect, useState
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import LoginModal from './components/LoginModal'; // 👈 Import LoginModal
const Homepage = React.lazy(() => import('./pages/HomePage'));
const BookingPage = React.lazy(() => import('./pages/BookingPage'));
const ServicesPage = React.lazy(() => import('./pages/ServicesPage'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Login = React.lazy(() => import('./pages/Login'));
const Signup = React.lazy(() => import('./pages/Signup'));
const Profile = React.lazy(() => import('./pages/Profile'));
const AdminLogin = React.lazy(() => import('./pages/AdminLogin'));
const TermsPage = React.lazy(() => import('./pages/TermsPage'));
const PrivacyPage = React.lazy(() => import('./pages/PrivacyPage'));
const ForgotPassword = React.lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = React.lazy(() => import('./pages/ResetPassword'));
import SplashScreen from './components/SplashScreen';
import ChatWidget from './components/ChatWidget';
import CookieConsent from './components/CookieConsent';
import LaunchCountdown from './components/LaunchCountdown';

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

  const isAdminPage = location.pathname.startsWith('/admin-dashboard') || location.pathname.startsWith(SECRET_ADMIN_URL);

  return (
    <div className="flex flex-col min-h-screen">
      {!isAdminPage && <LaunchCountdown />}
      <SecretKeyListener />
      <CookieConsent />
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
          {/* Suspense shows LoadingScreen while the lazy chunk is downloading */}
          <React.Suspense fallback={<LoadingScreen />}>
            <Routes>
              {/* Load Homepage normally or lazy (Lazy is fine if above the fold is managed, but let's stick to consistent lazy for now to split bundles) */}
              <Route path="/" element={<Homepage />} />
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
          </React.Suspense>
        </Layout>
      </Router>
    </AuthProvider>
  );
}

export default App;