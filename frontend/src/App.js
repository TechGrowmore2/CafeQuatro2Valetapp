import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';

// Pages
import SplashScreen from './pages/SplashScreen';
import LoginPage from './pages/LoginPage';
import AdminLogin from './pages/AdminLogin';
import DriverDashboard from './pages/DriverDashboard';
import CustomerDashboard from './pages/CustomerDashboard';
import SupervisorDashboard from './pages/SupervisorDashboard';
import ManagerDashboard from './pages/ManagerDashboard';
import AdminDashboard from './pages/AdminDashboard';
import CustomerLogin from './pages/CustomerLogin';
import CustomerAccess from './pages/CustomerAccess';
import DriverAutoLogin from './pages/DriverAutoLogin';
import ProtectedRoute from './components/ProtectedRoute';
import CustomerBookingForm from './pages/CustomerBookingForm';

/* ── Error Boundary: prevents white screen on Safari crashes ── */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error('App crashed:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', height: '100vh', padding: '24px',
          fontFamily: 'Inter, sans-serif', background: '#FFF8F5', textAlign: 'center'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
          <h2 style={{ color: '#1A1A2E', marginBottom: '8px' }}>Something went wrong</h2>
          <p style={{ color: '#6B7280', marginBottom: '24px' }}>
            Please refresh the page to continue.
          </p>
          <button
            onClick={() => window.location.href = '/login'}
            style={{
              padding: '12px 24px', background: '#FF6B35', color: 'white',
              border: 'none', borderRadius: '10px', fontSize: '15px',
              fontWeight: '600', cursor: 'pointer'
            }}
          >
            Go to Login
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <SocketProvider>
            <Toaster 
              position="top-center"
              toastOptions={{
                duration: 4000,
                style: {
                  background: 'white',
                  color: '#1A1A2E',
                  padding: '14px 18px',
                  borderRadius: '12px',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0,0,0,0.06)',
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: '500',
                  fontSize: '14px',
                  border: '1px solid rgba(0,0,0,0.06)',
                  maxWidth: '400px',
                },
                success: {
                  iconTheme: {
                    primary: '#10B981',
                    secondary: '#fff',
                  },
                  style: {
                    borderLeft: '4px solid #10B981',
                  }
                },
                error: {
                  iconTheme: {
                    primary: '#EF4444',
                    secondary: '#fff',
                  },
                  style: {
                    borderLeft: '4px solid #EF4444',
                  }
                },
              }}
            />
            <Routes>
              <Route path="/" element={<SplashScreen />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/admin" element={<AdminLogin />} />
              <Route path="/customer/login" element={<CustomerLogin />} />
              <Route path="/customer/access/:token" element={<CustomerAccess />} />
              {/* Public QR Booking Form — no auth */}
              <Route path="/book/:driverPhone" element={<CustomerBookingForm />} />

              <Route path="/driver-access" element={<DriverAutoLogin />} />
              
              <Route 
                path="/driver/*" 
                element={
                  <ProtectedRoute allowedRoles={['driver']}>
                    <DriverDashboard />
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/customer/*" 
                element={
                  <ProtectedRoute allowedRoles={['customer']}>
                    <CustomerDashboard />
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/supervisor/*" 
                element={
                  <ProtectedRoute allowedRoles={['supervisor']}>
                    <SupervisorDashboard />
                  </ProtectedRoute>
                } 
              />

              <Route 
                path="/manager/*" 
                element={
                  <ProtectedRoute allowedRoles={['manager']}>
                    <ManagerDashboard />
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/admin/*" 
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                } 
              />
              
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </SocketProvider>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;

