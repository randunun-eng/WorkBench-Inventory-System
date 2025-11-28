import React, { useState, useRef } from 'react';
import { api } from '../../../api';
import { Camera, Upload, Zap, Loader, CheckCircle, AlertCircle } from 'lucide-react';

const VisionTool: React.FC = () => {
    const [image, setImage] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [result, setResult] = useState<any | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImage(file);
            setPreview(URL.createObjectURL(file));
            setResult(null);
            setError(null);
        }
    };

    const handleIdentify = async () => {
        if (!image) return;

        setLoading(true);
        setError(null);
        try {
            const data = await api.identifyComponent(image);
            setResult(data);
        } catch (err) {
            console.error('Identification failed', err);
            setError('Failed to identify component. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="bg-white rounded-xl shadow-sm p-8 text-center">
                <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Zap size={32} />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Component Identifier</h2>
                <p className="text-gray-600 max-w-lg mx-auto">
                    Upload a clear photo of an electronic component (Resistor, IC, Capacitor) to identify its type, value, or part number using AI.
                </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
                {/* Upload Section */}
                <div className="bg-white rounded-xl shadow-sm p-6 flex flex-col items-center justify-center min-h-[400px] border-2 border-dashed border-gray-200 hover:border-blue-400 transition-colors relative">
                    {preview ? (
                        <div className="relative w-full h-full flex flex-col items-center">
                            <img src={preview} alt="Component Preview" className="max-h-[300px] object-contain rounded-lg mb-4" />
                            <div className="flex gap-3">
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
                                >
                                    Change Photo
                                </button>
                                <button
                                    onClick={handleIdentify}
                                    disabled={loading}
                                    className="px-6 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                                >
                                    {loading ? <Loader className="animate-spin" size={16} /> : <Zap size={16} />}
                                    Identify Now
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center">
                            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                                <Camera size={40} />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">Take a photo or upload</h3>
                            <p className="text-sm text-gray-500 mb-6">Support for JPG, PNG</p>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2 mx-auto"
                            >
                                <Upload size={20} />
                                Select Image
                            </button>
                        </div>
                    )}
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                        accept="image/*"
                    />
                </div>

                {/* Results Section */}
                <div className="bg-white rounded-xl shadow-sm p-6 min-h-[400px]">
                    <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <CheckCircle size={20} className="text-green-500" />
                        Analysis Results
                    </h3>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-[300px] text-gray-500 space-y-4">
                            <Loader size={40} className="animate-spin text-blue-500" />
                            <p>Analyzing component features...</p>
                            <p className="text-xs text-gray-400">Reading color bands / markings</p>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center h-[300px] text-red-500 text-center p-4">
                            <AlertCircle size={48} className="mb-4" />
                            <p>{error}</p>
                        </div>
                    ) : result ? (
                        <div className="space-y-6 animate-in fade-in duration-500">
                            <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                                <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Component Type</span>
                                <h4 className="text-2xl font-bold text-blue-900 mt-1">{result.type}</h4>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-gray-50 rounded-lg">
                                    <span className="text-xs font-medium text-gray-500 uppercase">Value / Spec</span>
                                    <p className="text-lg font-semibold text-gray-900 mt-1">{result.value || 'N/A'}</p>
                                </div>
                                <div className="p-4 bg-gray-50 rounded-lg">
                                    <span className="text-xs font-medium text-gray-500 uppercase">Part Number</span>
                                    <p className="text-lg font-semibold text-gray-900 mt-1">{result.part_number || 'N/A'}</p>
                                </div>
                            </div>

                            <div>
                                <span className="text-xs font-medium text-gray-500 uppercase">Description</span>
                                <p className="text-gray-700 mt-2 leading-relaxed bg-gray-50 p-4 rounded-lg">
                                    {result.description}
                                </p>
                            </div>

                            <div className="pt-4 border-t border-gray-100">
                                <button className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-500 hover:text-blue-600 transition-colors font-medium">
                                    + Add to Inventory
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-[300px] text-gray-400 text-center">
                            <Zap size={48} className="mb-4 opacity-20" />
                            <p>Upload an image to see analysis results here.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VisionTool;
