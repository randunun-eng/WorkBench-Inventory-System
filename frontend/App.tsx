import React, { useState } from 'react';
import { HashRouter, Routes, Route, Link } from 'react-router-dom';
import Header from './components/Header';
import StoreFront from './pages/StoreFront';
import ProductDetail from './pages/ProductDetail';
import JoinRequest from './pages/JoinRequest';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import PasswordResetRequest from './pages/PasswordResetRequest';

const App: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <HashRouter>
      <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-900">
        <Routes>
          {/* Public Storefront Routes */}
          <Route
            path="/"
            element={
              <>
                <Header toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
                <StoreFront sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
                <Footer />
              </>
            }
          />
          <Route
            path="/product/:id"
            element={
              <>
                <Header toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
                <ProductDetail />
                <Footer />
              </>
            }
          />
          <Route
            path="/join"
            element={
              <>
                <Header toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
                <JoinRequest />
                <Footer />
              </>
            }
          />
          <Route
            path="/reset-password"
            element={
              <>
                <Header toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
                <PasswordResetRequest />
                <Footer />
              </>
            }
          />

          {/* Auth & Dashboard Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard/*" element={<Dashboard />} />
        </Routes>
      </div>
    </HashRouter>
  );
};

const Footer: React.FC = () => (
  <footer className="bg-white border-t border-gray-200 mt-auto py-8">
    <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8 text-sm text-gray-600">
      <div>
        <h4 className="font-bold text-gray-900 mb-4">WorkBench System</h4>
        <p>The global network for industrial component inventory visibility in Sri Lanka.</p>
      </div>
      <div>
        <h4 className="font-bold text-gray-900 mb-4">For Buyers</h4>
        <Link to="/" className="block mb-2 hover:text-brand-blue">Find Parts Nearby</Link>
        <p className="mb-2">Verify Stock</p>
        <p>Contact Sellers</p>
      </div>
      <div>
        <h4 className="font-bold text-gray-900 mb-4">For Sellers</h4>
        <ul className="space-y-2">
          <li>
            <Link to="/join" className="hover:text-brand-blue">Register Shop</Link>
          </li>
          <li>
            <Link to="/join" className="hover:text-brand-blue">Password Reset</Link>
          </li>
          <li>Manage Inventory</li>
        </ul>
      </div>
      <div>
        <h4 className="font-bold text-gray-900 mb-4">Join WorkBench</h4>
        <p className="mb-4">List your inventory on the network today.</p>
        <Link to="/join" className="inline-block bg-gray-100 border border-gray-300 rounded px-4 py-2 hover:bg-white hover:border-brand-blue hover:text-brand-blue transition-colors">
          Submit Application
        </Link>
      </div>
    </div>
    <div className="max-w-7xl mx-auto px-4 mt-8 pt-8 border-t border-gray-100 text-center text-xs text-gray-400">
      &copy; 2024 WorkBench Inventory System. All rights reserved.
    </div>
  </footer>
);

export default App;