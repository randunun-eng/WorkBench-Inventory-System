import React, { useState } from 'react';
import { ArrowLeft, Send, CheckCircle, Lock, Store, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';

const JoinRequest: React.FC = () => {
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    type: 'registration', // 'registration' | 'password_reset' | 'update'
    shopName: '',
    contactName: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
    city: '',
    message: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setError(null);

    // Validate passwords match
    if (formData.type === 'registration' && formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      if (formData.type === 'registration') {
        // Use the signup API
        await authAPI.signup(formData.email, formData.password, formData.shopName);
        setSubmitted(true);

        // Redirect to home after 2 seconds
        setTimeout(() => {
          navigate('/');
        }, 2000);
      } else {
        // For password reset and updates, show success message
        // In a real implementation, you'd call a support API
        setTimeout(() => {
          setSubmitted(true);
        }, 800);
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
        ...formData,
        [e.target.name]: e.target.value
    });
  };

  if (submitted) {
    return (
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
            <div className="bg-green-100 text-green-700 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle size={40} />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Request Sent!</h2>
            <p className="text-lg text-gray-600 mb-8">
                Thank you, {formData.contactName}. Your {formData.type === 'registration' ? 'registration request' : 'support ticket'} has been forwarded to the WorkBench Admin team.
                <br/>
                We will contact you at <strong>{formData.phone}</strong> shortly.
            </p>
            <Link to="/" className="inline-block bg-brand-blue text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-600 transition-colors">
                Return to Home
            </Link>
        </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link to="/" className="inline-flex items-center text-sm text-gray-500 hover:text-brand-blue mb-6 transition-colors">
        <ArrowLeft size={16} className="mr-1" /> Back to Home
      </Link>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="bg-brand-dark px-8 py-6 border-b border-gray-800">
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                {formData.type === 'password_reset' ? <Lock className="text-blue-400"/> : <Store className="text-blue-400"/>}
                {formData.type === 'password_reset' ? 'Admin Support' : 'Join WorkBench Network'}
            </h1>
            <p className="text-blue-100 mt-2 text-sm">
                Fill out the details below to submit your request to the central administration.
            </p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
            
            {/* Request Type Selector */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Request Type</label>
                <select 
                    name="type" 
                    value={formData.type} 
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-brand-blue bg-white"
                >
                    <option value="registration">New Shop Registration</option>
                    <option value="password_reset">Password Reset Request</option>
                    <option value="update">Update Shop Details</option>
                </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-1 md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Shop / Business Name</label>
                    <input 
                        type="text" 
                        name="shopName"
                        required
                        value={formData.shopName}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-brand-blue"
                        placeholder="e.g. Kandy Electronics"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
                    <input 
                        type="text" 
                        name="contactName"
                        required
                        value={formData.contactName}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-brand-blue"
                        placeholder="Your Name"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                    <input 
                        type="text" 
                        name="city"
                        required
                        value={formData.city}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-brand-blue"
                        placeholder="e.g. Malabe"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number</label>
                    <input 
                        type="tel" 
                        name="phone"
                        required
                        value={formData.phone}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-brand-blue"
                        placeholder="+94 77 ..."
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                    <input
                        type="email"
                        name="email"
                        required
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-brand-blue"
                        placeholder="shop@example.com"
                    />
                </div>
            </div>

            {/* Password fields - only for registration */}
            {formData.type === 'registration' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <input
                    type="password"
                    name="password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-brand-blue"
                    placeholder="Enter a secure password"
                    minLength={6}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-brand-blue"
                    placeholder="Re-enter password"
                    minLength={6}
                  />
                </div>
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Additional Details</label>
                <textarea 
                    name="message"
                    rows={4}
                    value={formData.message}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-brand-blue"
                    placeholder={formData.type === 'registration' ? "Tell us about your inventory..." : "Please describe your issue..."}
                ></textarea>
            </div>

            <div className="pt-4 border-t border-gray-100 flex items-center justify-end">
                <button
                    type="submit"
                    disabled={loading}
                    className="bg-brand-blue text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-600 transition-all flex items-center gap-2 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                    {loading ? 'Submitting...' : 'Submit Request'}
                </button>
            </div>

        </form>
      </div>
    </div>
  );
};

export default JoinRequest;