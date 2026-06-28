import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import DemoLogin from './pages/DemoLogin';
import DemoRegister from './pages/DemoRegister';
import VerifyOTP from './pages/VerifyOTP';
import DemoDashboard from './pages/DemoDashboard';
import ZKLogin from './pages/ZKLogin';
import './index.css';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<DemoLogin />} />
        <Route path="/register" element={<DemoRegister />} />
        <Route path="/verify" element={<VerifyOTP />} />
        <Route path="/dashboard" element={<DemoDashboard />} />
        <Route path="/zk-login" element={<ZKLogin />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
