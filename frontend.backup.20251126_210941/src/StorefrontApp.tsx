import React, { useState } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import StorefrontHeader from './components/StorefrontHeader';
import StoreFront from './pages/StoreFront';
import ProductDetail from './pages/ProductDetail';
import JoinRequest from './pages/JoinRequest';

const StorefrontApp: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-900">
      <StorefrontHeader
        toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
      />

      <Routes>
        <Route
          path="/"
          element={
            <StoreFront
              sidebarOpen={sidebarOpen}
              setSidebarOpen={setSidebarOpen}
            />
          }
        />
        <Route
          path="/product/:id"
          element={<ProductDetail />}
        />
        <Route
          path="/join"
          element={<JoinRequest />}
        />
      </Routes>

      {/* Simple Footer */}
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
    </div>
  );
};

export default StorefrontApp;
