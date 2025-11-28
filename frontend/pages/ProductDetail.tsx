import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, APIProduct } from '../api';
import type { Product, ShopProfile } from '../types';
import { ArrowLeft, Check, ShieldCheck, MapPin, Store, MessageCircle, Phone, Navigation, Clock, FileText } from 'lucide-react';

import ChatSidebar from '../components/ChatSidebar';

const ProductDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [product, setProduct] = useState<Product | null>(null);
    const [shop, setShop] = useState<ShopProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [isShopOnline, setIsShopOnline] = useState(true); // Mock online status for now

    useEffect(() => {
        const fetchProduct = async () => {
            if (!id) return;

            setLoading(true);
            const apiProduct = await api.getProductById(id);

            if (apiProduct) {
                // Helper to normalize specs
                const normalizeSpecs = (specs: any) => {
                    if (!specs) return [];
                    if (Array.isArray(specs)) return specs;
                    if (typeof specs === 'object') {
                        return Object.entries(specs).map(([key, value]) => ({
                            label: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                            value: Array.isArray(value) ? value.join(', ') : String(value)
                        }));
                    }
                    return [];
                };

                const transformedProduct: Product = {
                    id: apiProduct.id,
                    name: apiProduct.name,
                    description: apiProduct.description,
                    price: apiProduct.price,
                    currency: apiProduct.currency,
                    categoryId: '1',
                    stockQty: apiProduct.stock_qty || 0,
                    minOrderQty: 1,
                    shopId: apiProduct.shop_slug,
                    shopName: apiProduct.shop_name,
                    image: api.getImageUrl(apiProduct.primary_image_r2_key),
                    datasheet: apiProduct.datasheet_r2_key ? api.getImageUrl(apiProduct.datasheet_r2_key) : undefined,
                    specs: normalizeSpecs(apiProduct.specifications),
                    isHot: false
                };

                setProduct(transformedProduct);

                // Fetch shop details
                const shopData = await api.getShopBySlug(apiProduct.shop_slug);
                if (shopData) {
                    setShop({
                        id: shopData.shop.shop_slug,
                        name: shopData.shop.shop_name,
                        slug: shopData.shop.shop_slug,
                        description: '',
                        rating: 0,
                        totalSales: 0,
                        verified: false,
                        contact: {
                            phone: '',
                            email: '',
                            address: shopData.shop.location_address || ''
                        }
                    });
                }
            }

            setLoading(false);
        };

        fetchProduct();
    }, [id]);

    if (loading) {
        return (
            <div className="max-w-7xl mx-auto p-10 text-center">
                <h2 className="text-xl font-bold">Loading...</h2>
            </div>
        );
    }

    if (!product || !shop) {
        return (
            <div className="max-w-7xl mx-auto p-10 text-center">
                <h2 className="text-xl font-bold">Product or Shop not found</h2>
                <Link to="/" className="text-brand-blue mt-4 block">Return Home</Link>
            </div>
        );
    }

    // Format price as LKR
    const formattedPrice = product.price
        ? new Intl.NumberFormat('en-LK', { style: 'currency', currency: product.currency }).format(product.price)
        : null;

    return (
        <div className="max-w-7xl mx-auto px-4 py-6 relative">
            <Link to="/" className="inline-flex items-center text-sm text-gray-500 hover:text-brand-blue mb-4 transition-colors">
                <ArrowLeft size={16} className="mr-1" /> Back to Search
            </Link>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-0 md:gap-8">

                    {/* Gallery Section */}
                    <div className="p-4 md:p-8 bg-gray-50 flex items-center justify-center">
                        <div className="relative aspect-square w-full max-w-md bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden flex items-center justify-center">
                            {product.image && !product.image.includes('placeholder') ? (
                                <img
                                    src={product.image}
                                    alt={product.name}
                                    className="w-full h-full object-contain"
                                />
                            ) : (
                                <div className="text-gray-400 text-center">
                                    <div className="text-6xl mb-2">📦</div>
                                    <div className="text-sm">No image available</div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Info Section */}
                    <div className="p-6 md:p-8 flex flex-col">
                        <div className="mb-4">
                            <span className="text-xs font-bold text-brand-blue bg-blue-50 px-2 py-1 rounded">
                                Original Part
                            </span>
                            <h1 className="text-2xl font-bold text-brand-dark mt-2 leading-tight">
                                {product.name}
                            </h1>
                            <div className="flex items-center gap-4 mt-2">
                                <div className="flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                    <Clock size={12} />
                                    Last updated: Today
                                </div>
                                <span className="text-gray-300">|</span>
                                <span className={`text-sm font-medium ${product.stockQty > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                    {product.stockQty} Units Available
                                </span>
                            </div>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-lg mb-6 border border-slate-100">
                            <div className="flex items-baseline gap-2 mb-2">
                                {formattedPrice ? (
                                    <>
                                        <span className="text-3xl font-bold text-gray-900">{formattedPrice}</span>
                                        <span className="text-sm text-gray-500">/ piece</span>
                                    </>
                                ) : (
                                    <span className="text-2xl font-bold text-brand-blue">Contact for Price</span>
                                )}
                            </div>
                        </div>

                        {/* Specs Table */}
                        <div className="mb-8">
                            <h3 className="font-semibold text-gray-900 mb-3">Specifications</h3>
                            <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
                                {product.specs && product.specs.map((spec: any, i: number) => (
                                    <div key={i} className="flex flex-col pb-2 border-b border-dashed border-gray-200">
                                        <span className="text-gray-500 text-xs">{spec.label}</span>
                                        <span className="font-medium text-gray-800">{spec.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {product.datasheet && (
                            <div className="mb-8">
                                <a
                                    href={product.datasheet}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors font-medium text-sm"
                                >
                                    <FileText size={16} />
                                    View Datasheet
                                </a>
                            </div>
                        )}

                        {/* Where to Buy / Location Section */}
                        <div className="mt-auto bg-blue-50 border border-blue-100 rounded-lg p-5">
                            <h3 className="text-sm font-bold text-blue-900 uppercase tracking-wide mb-3 flex items-center gap-2">
                                <Store size={16} />
                                Available at {shop.name}
                            </h3>

                            <div className="flex flex-col gap-3">
                                <div>
                                    <div className="font-bold text-gray-900 text-lg">{shop.name}</div>
                                    <div className="flex items-start gap-2 text-gray-600 text-sm mt-1">
                                        <MapPin size={16} className="mt-0.5 shrink-0" />
                                        <span>{shop.contact.address}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-gray-600 text-sm mt-1">
                                        <Phone size={16} className="shrink-0" />
                                        <span>{shop.contact.phone}</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 mt-2">
                                    <button className="flex items-center justify-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 py-2 rounded-md text-sm font-medium transition-colors">
                                        <Navigation size={16} />
                                        Get Directions
                                    </button>
                                    <button
                                        onClick={() => setIsChatOpen(true)}
                                        className="flex items-center justify-center gap-2 bg-brand-blue hover:bg-blue-600 text-white py-2 rounded-md text-sm font-medium transition-colors shadow-sm relative"
                                    >
                                        <MessageCircle size={16} />
                                        Chat with Shop
                                        {/* Online Indicator */}
                                        <span className={`absolute top-0 right-0 -mt-1 -mr-1 w-3 h-3 rounded-full border-2 border-white ${isShopOnline ? 'bg-emerald-500' : 'bg-gray-400'}`}></span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Trust Badges */}
                        <div className="flex items-center justify-center gap-6 mt-6 text-[10px] text-gray-500">
                            <div className="flex items-center gap-1">
                                <ShieldCheck size={16} className={shop.verified ? "text-emerald-600" : "text-gray-400"} />
                                <span>{shop.verified ? "Verified Seller" : "Unverified Seller"}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <Check size={16} className="text-blue-600" />
                                <span>Inventory Confirmed</span>
                            </div>
                        </div>

                    </div>
                </div>

                {/* Description Section */}
                <div className="border-t border-gray-200 p-6 md:p-8 bg-gray-50 mt-8">
                    <h3 className="font-bold text-gray-900 mb-4">Product Description</h3>
                    <div className="prose prose-sm max-w-none text-gray-600">
                        <p>{product.description}</p>
                        <p className="mt-4">
                            Visit {shop.name} to inspect this component. Please confirm availability via chat before traveling.
                        </p>
                    </div>
                </div>
            </div>

            {/* Chat Sidebar */}
            {shop && (
                <ChatSidebar
                    isOpen={isChatOpen}
                    onClose={() => setIsChatOpen(false)}
                    shop={shop}
                    product={product}
                />
            )}
        </div>
    );
};

export default ProductDetail;