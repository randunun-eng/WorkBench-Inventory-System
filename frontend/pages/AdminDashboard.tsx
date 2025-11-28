import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Check, X, Shield, Key, AlertTriangle } from 'lucide-react';

const AdminDashboard: React.FC = () => {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [actionMessage, setActionMessage] = useState('');

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const data = await api.getUsers();
            setUsers(data);
        } catch (err) {
            setError('Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleApprove = async (id: string, approved: boolean) => {
        try {
            await api.approveUser(id, approved);
            setActionMessage(`User ${approved ? 'approved' : 'unapproved'} successfully`);
            fetchUsers();
        } catch (err) {
            setError('Failed to update approval status');
        }
    };

    const handleStatus = async (id: string, active: boolean) => {
        try {
            await api.toggleUserStatus(id, active);
            setActionMessage(`User ${active ? 'activated' : 'deactivated'} successfully`);
            fetchUsers();
        } catch (err) {
            setError('Failed to update status');
        }
    };

    const handleResetApprove = async (userId: string) => {
        const newPassword = prompt('Enter temporary password for this user:');
        if (!newPassword) return;

        try {
            await api.adminResetPassword(userId, newPassword);
            alert(`Password updated successfully.\n\nPlease communicate the password "${newPassword}" to the shop owner.`);
            fetchUsers();
        } catch (err) {
            alert('Failed to reset password');
        }
    };

    if (loading) return <div className="p-8 text-center">Loading users...</div>;

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Shield className="text-brand-blue" />
                    Admin Dashboard
                </h1>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 flex items-center gap-2">
                    <AlertTriangle size={20} />
                    {error}
                </div>
            )}

            {actionMessage && (
                <div className="bg-green-50 text-green-600 p-4 rounded-lg mb-6 flex items-center gap-2">
                    <Check size={20} />
                    {actionMessage}
                </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4 font-semibold text-gray-700">Shop Name</th>
                                <th className="px-6 py-4 font-semibold text-gray-700">Email</th>
                                <th className="px-6 py-4 font-semibold text-gray-700">Status</th>
                                <th className="px-6 py-4 font-semibold text-gray-700">Approval</th>
                                <th className="px-6 py-4 font-semibold text-gray-700">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {users.map((user) => (
                                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-gray-900">{user.shop_name || 'N/A'}</td>
                                    <td className="px-6 py-4 text-gray-600">{user.email}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium w-fit ${user.is_active
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-red-100 text-red-800'
                                                }`}>
                                                {user.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                            {user.reset_requested_at && (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 w-fit">
                                                    Reset Requested
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.is_approved
                                            ? 'bg-blue-100 text-blue-800'
                                            : 'bg-yellow-100 text-yellow-800'
                                            }`}>
                                            {user.is_approved ? 'Approved' : 'Pending'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            {/* Approval Toggle */}
                                            {user.is_approved ? (
                                                <button
                                                    onClick={() => handleApprove(user.id, false)}
                                                    className="p-1 text-yellow-600 hover:bg-yellow-50 rounded"
                                                    title="Revoke Approval"
                                                >
                                                    <X size={16} />
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleApprove(user.id, true)}
                                                    className="p-1 text-green-600 hover:bg-green-50 rounded"
                                                    title="Approve"
                                                >
                                                    <Check size={16} />
                                                </button>
                                            )}

                                            {/* Status Toggle */}
                                            <button
                                                onClick={() => handleStatus(user.id, !user.is_active)}
                                                className={`p-1 rounded ${user.is_active
                                                    ? 'text-red-600 hover:bg-red-50'
                                                    : 'text-green-600 hover:bg-green-50'
                                                    }`}
                                                title={user.is_active ? 'Deactivate' : 'Activate'}
                                            >
                                                {user.is_active ? <X size={16} /> : <Check size={16} />}
                                            </button>

                                            {/* Password Reset */}
                                            <button
                                                onClick={() => handleResetApprove(user.id)}
                                                className={`p-1 rounded ${user.reset_requested_at ? 'text-orange-600 bg-orange-50 animate-pulse' : 'text-blue-600 hover:bg-blue-50'}`}
                                                title="Set Temporary Password"
                                            >
                                                <Key size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
