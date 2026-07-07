import React, { useState } from 'react';
import { ArrowLeft, ShoppingBag, Check, Truck, Sparkles, ShieldCheck, Undo2, Minus, Plus, Compass } from 'lucide-react';
import { Product } from '../types';

interface ProductDetailsPageProps {
  product: Product;
  allProducts: Product[];
  onBack: () => void;
  onAddToCart: (product: Product, quantity: number) => void;
  detectedLocation?: { city: string; state: string; pincode: string } | null;
  onSelectProduct: (product: Product) => void;
}

export default function ProductDetailsPage({
  product,
  allProducts,
  onBack,
  onAddToCart,
  detectedLocation,
  onSelectProduct,
}: ProductDetailsPageProps) {
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  
  // Track active gallery image for products with multiple photos
  const [activeImgIndex, setActiveImgIndex] = useState(0);
  const [prevProductId, setPrevProductId] = useState(product.id);
  if (product.id !== prevProductId) {
    setPrevProductId(product.id);
    setActiveImgIndex(0);
  }

  const productImages = Array.from(new Set([product.imageUrl, ...(product.images || [])])).filter(Boolean);
  
  // Cosmetic interactive states (premium/luxury feel)
  const [selectedSize, setSelectedSize] = useState('Standard Fit');
  const [selectedColor, setSelectedColor] = useState('Imperial Obsidian');

  const handleIncrement = () => {
    if (quantity < product.stock) {
      setQuantity((prev) => prev + 1);
    }
  };

  const handleDecrement = () => {
    if (quantity > 1) {
      setQuantity((prev) => prev - 1);
    }
  };

  const handleAddToCartClick = () => {
    if (product.stock === 0) return;
    onAddToCart(product, quantity);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  // Find 3 other products in the same category (excluding current) or general featured products
  const similarProducts = allProducts
    .filter((p) => p.id !== product.id)
    .sort((a, b) => {
      // Prioritize same category, then featured
      if (a.category === product.category && b.category !== product.category) return -1;
      if (a.category !== product.category && b.category === product.category) return 1;
      return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
    })
    .slice(0, 4);

  const sizes = ['Compact', 'Standard Fit', 'Executive', 'Bespoke / Custom'];
  const colors = ['Imperial Obsidian', 'Champagne Gold', 'Royal Emerald', 'Alabaster Ivory'];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in" id="product-details-container">
      {/* Back & Breadcrumb Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
        <button
          onClick={onBack}
          id="product-details-back-btn"
          className="group flex items-center gap-2 px-3.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:text-indigo-600 transition-all cursor-pointer shadow-xs self-start"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>Back to Catalog</span>
        </button>

        <nav className="text-[10px] sm:text-xs font-semibold text-slate-400 flex items-center gap-1.5 overflow-hidden whitespace-nowrap">
          <span className="hover:text-indigo-600 cursor-pointer" onClick={onBack}>Home</span>
          <span>/</span>
          <span className="uppercase tracking-wider">{product.category}</span>
          <span>/</span>
          <span className="text-slate-800 truncate max-w-[160px] sm:max-w-none">{product.name}</span>
        </nav>
      </div>

      {/* Product Split Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mb-12">
        {/* Left Column: Image Area */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-md aspect-square relative group">
            {/* Badges Overlays */}
            <div className="absolute top-4 left-4 z-10 flex flex-col gap-1.5">
              {product.featured && (
                <span className="px-3 py-1 text-[10px] font-black text-white bg-indigo-600 rounded-full shadow-sm uppercase tracking-wider">
                  Featured Luxury
                </span>
              )}
              {product.stock <= 5 && product.stock > 0 && (
                <span className="px-3 py-1 text-[10px] font-black text-amber-800 bg-amber-50 border border-amber-100 rounded-full uppercase tracking-wider flex items-center gap-1 shadow-sm">
                  Only {product.stock} Units Left
                </span>
              )}
              {product.stock === 0 && (
                <span className="px-3 py-1 text-[10px] font-black text-rose-700 bg-rose-50 border border-rose-100 rounded-full uppercase tracking-wider shadow-sm">
                  Sold Out
                </span>
              )}
            </div>

            <img
              src={productImages[activeImgIndex] || product.imageUrl}
              alt={product.name}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-700"
            />
          </div>
          
          {/* Thumbnail Gallery for Multiple Photos */}
          {productImages.length > 1 && (
            <div className="flex gap-2 pb-1 overflow-x-auto scrollbar-none" id="product-thumbnails-gallery">
              {productImages.map((imgUrl, idx) => (
                <button
                  key={idx}
                  type="button"
                  id={`thumbnail-${idx}`}
                  onClick={() => setActiveImgIndex(idx)}
                  className={`w-14 sm:w-16 h-14 sm:h-16 rounded-xl overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                    activeImgIndex === idx
                      ? 'border-indigo-600 shadow-sm shadow-indigo-100 scale-102 ring-2 ring-indigo-100'
                      : 'border-slate-100 hover:border-slate-200'
                  }`}
                >
                  <img
                    src={imgUrl}
                    alt={`${product.name} view ${idx + 1}`}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
          
          {/* Quality Seals Bar */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white border border-slate-50 p-3 rounded-2xl flex flex-col items-center text-center space-y-1">
              <ShieldCheck className="w-5 h-5 text-indigo-500" />
              <span className="text-[9px] font-bold text-slate-800 uppercase tracking-wider">100% Authentic</span>
            </div>
            <div className="bg-white border border-slate-50 p-3 rounded-2xl flex flex-col items-center text-center space-y-1">
              <Undo2 className="w-5 h-5 text-indigo-500" />
              <span className="text-[9px] font-bold text-slate-800 uppercase tracking-wider">Easy Return</span>
            </div>
            <div className="bg-white border border-slate-50 p-3 rounded-2xl flex flex-col items-center text-center space-y-1">
              <Truck className="w-5 h-5 text-indigo-500" />
              <span className="text-[9px] font-bold text-slate-800 uppercase tracking-wider">Secure Shipping</span>
            </div>
          </div>
        </div>

        {/* Right Column: Content and Purchase Configuration */}
        <div className="lg:col-span-5 space-y-6">
          <div className="space-y-2">
            <span className="text-xs font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 border border-indigo-100/50 px-3 py-1 rounded-xl w-fit block">
              {product.category}
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-800 leading-tight">
              {product.name}
            </h1>
          </div>

          {/* Pricing Box */}
          <div className="p-5 bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-2xl shadow-lg border border-slate-850 space-y-1.5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/10 rounded-full blur-2xl" />
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block">Price inclusive of all taxes</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold font-mono text-white">
                ₹{product.price.toLocaleString('en-IN')}
              </span>
              <span className="text-xs text-slate-300 line-through">
                ₹{(product.price * 1.25).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </span>
              <span className="text-xs text-emerald-400 font-black">
                (20% Off)
              </span>
            </div>
          </div>

          {/* Stock Status Indicator */}
          <div className="flex items-center gap-2 text-xs">
            <span className="font-bold text-slate-500">Availability:</span>
            {product.stock > 0 ? (
              <span className="text-emerald-600 font-bold flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                In Stock ({product.stock} units) - Ships within 24 hours
              </span>
            ) : (
              <span className="text-rose-600 font-bold flex items-center gap-1 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-100">
                Out of Stock
              </span>
            )}
          </div>

          {/* Core Description */}
          <div className="space-y-1.5">
            <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">Product Overview</h4>
            <p className="text-xs text-slate-500 leading-relaxed font-medium">
              {product.description || "Indulge in unmatched elegance and flawless design craftsmanship. Meticulously made from select, hyper-premium components to secure lasting comfort, utility, and refined aesthetics."}
            </p>
          </div>

          {/* Cosmetic Configuration Options (Luxury Experience) */}
          <div className="space-y-4 pt-2 border-t border-slate-100">
            {/* Size Choice */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 uppercase tracking-wider">Dimension / Fit</span>
                <span className="font-bold text-indigo-600">{selectedSize}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {sizes.map((sz) => (
                  <button
                    key={sz}
                    onClick={() => setSelectedSize(sz)}
                    className={`py-2 px-1 text-[10px] font-black rounded-xl border transition-all cursor-pointer text-center ${
                      selectedSize === sz
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm shadow-indigo-100'
                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    {sz}
                  </button>
                ))}
              </div>
            </div>

            {/* Premium Colors Choice */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 uppercase tracking-wider">Artisan Finish</span>
                <span className="font-bold text-indigo-600">{selectedColor}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {colors.map((col) => (
                  <button
                    key={col}
                    onClick={() => setSelectedColor(col)}
                    className={`py-2 px-1 text-[10px] font-black rounded-xl border transition-all cursor-pointer text-center ${
                      selectedColor === col
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm shadow-indigo-100'
                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    {col}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Quantity and Checkout/Add Column */}
          <div className="pt-4 border-t border-slate-100 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Select Quantity</span>
              
              <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-white">
                <button
                  type="button"
                  onClick={handleDecrement}
                  disabled={quantity <= 1 || product.stock === 0}
                  className="p-2 text-slate-500 hover:bg-slate-50 disabled:opacity-30 cursor-pointer"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-10 text-center text-xs font-bold text-slate-800 font-mono">
                  {product.stock === 0 ? 0 : quantity}
                </span>
                <button
                  type="button"
                  onClick={handleIncrement}
                  disabled={quantity >= product.stock || product.stock === 0}
                  className="p-2 text-slate-500 hover:bg-slate-50 disabled:opacity-30 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Add to Cart Premium Action Button */}
            <button
              onClick={handleAddToCartClick}
              disabled={product.stock === 0}
              id="details-add-to-cart-btn"
              className={`w-full py-4 rounded-2xl font-bold text-sm shadow-md transition-all duration-300 flex items-center justify-center gap-2 active:scale-98 cursor-pointer ${
                product.stock === 0
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200 shadow-none'
                  : added
                  ? 'bg-emerald-600 text-white shadow-emerald-100 hover:bg-emerald-500'
                  : 'bg-slate-900 text-white hover:bg-indigo-600 shadow-indigo-50'
              }`}
            >
              {added ? (
                <>
                  <Check className="w-5 h-5" />
                  <span>Successfully Added to Your Cart!</span>
                </>
              ) : (
                <>
                  <ShoppingBag className="w-5 h-5" />
                  <span>Add {quantity} {quantity === 1 ? 'Item' : 'Items'} to Cart • ₹{(product.price * quantity).toLocaleString('en-IN')}</span>
                </>
              )}
            </button>
          </div>

          {/* Courier Geotag Dispatch Eligible Notification */}
          {detectedLocation ? (
            <div className="p-3.5 bg-emerald-50 border border-emerald-100 rounded-xl flex items-start gap-3">
              <Compass className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div className="text-[10px] text-emerald-800 font-medium leading-relaxed">
                <p className="font-bold uppercase tracking-wider text-emerald-700">Live Courier Dispatch Eligible</p>
                <p className="mt-0.5">Your detected delivery zone <strong>{detectedLocation.city}, {detectedLocation.state} ({detectedLocation.pincode})</strong> qualifies for immediate transit routing. Dispatching occurs within 12 hours.</p>
              </div>
            </div>
          ) : (
            <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl flex items-start gap-3">
              <Compass className="w-5 h-5 text-slate-600 flex-shrink-0 mt-0.5" />
              <div className="text-[10px] text-slate-600 font-medium leading-relaxed">
                <p className="font-bold uppercase tracking-wider text-slate-700">All-India Shipping Eligible</p>
                <p className="mt-0.5">This premium asset is stocked at local fulfillment centers. Enter your pincode at checkout for immediate real-time GPS tracking logs and delivery estimates.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Product Spec Details Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-slate-100 pt-10 mb-12">
        <div className="space-y-3">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
            <Sparkles className="w-4.5 h-4.5 text-indigo-500" />
            <span>Specifications & Craftsmanship</span>
          </h3>
          <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden divide-y divide-slate-50 shadow-sm text-xs">
            <div className="flex items-center justify-between p-3.5">
              <span className="font-bold text-slate-400 uppercase tracking-wider text-[9px]">Material Composition</span>
              <span className="font-semibold text-slate-700">Hypoallergenic Luxury Blend</span>
            </div>
            <div className="flex items-center justify-between p-3.5">
              <span className="font-bold text-slate-400 uppercase tracking-wider text-[9px]">Origin of Craft</span>
              <span className="font-semibold text-slate-700">Hand-finished Artisanal Studio</span>
            </div>
            <div className="flex items-center justify-between p-3.5">
              <span className="font-bold text-slate-400 uppercase tracking-wider text-[9px]">Dispatch Location</span>
              <span className="font-semibold text-slate-700">Central Luxury Transit Hub, India</span>
            </div>
            <div className="flex items-center justify-between p-3.5">
              <span className="font-bold text-slate-400 uppercase tracking-wider text-[9px]">Sustainability</span>
              <span className="font-semibold text-slate-700">Eco-conscious, Recyclable Packaged</span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
            <Truck className="w-4.5 h-4.5 text-indigo-500" />
            <span>Deliveries & Warranty</span>
          </h3>
          <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden divide-y divide-slate-50 shadow-sm text-xs text-slate-500 space-y-3 p-5 font-medium leading-relaxed">
            <p>
              🎁 <strong>Complimentary Gift Wrapping:</strong> All premium shipments are sent in signature luxury packaging with a certificate of authenticity.
            </p>
            <p>
              📦 <strong>Seamless Returns:</strong> If you are not absolutely pleased with your selection, request an instant return within 7 business days from receipt.
            </p>
            <p>
              🛡️ <strong>1-Year Global Warranty:</strong> Every purchase carries full coverage protecting against fabric, structural, or manufacturing imperfections.
            </p>
          </div>
        </div>
      </div>

      {/* Similar / recommended products panel */}
      {similarProducts.length > 0 && (
        <div className="border-t border-slate-100 pt-10">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6">
            Similar Premium Selections
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {similarProducts.map((p) => (
              <div
                key={p.id}
                onClick={() => {
                  onSelectProduct(p);
                  setQuantity(1); // reset quantity on select new
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="group bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-xs hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col h-full"
              >
                <div className="relative pt-[100%] bg-slate-50 overflow-hidden">
                  <img
                    src={p.imageUrl}
                    alt={p.name}
                    referrerPolicy="no-referrer"
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                  />
                </div>
                <div className="p-4 flex-grow flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                      {p.category}
                    </span>
                    <h4 className="text-xs font-bold text-slate-800 line-clamp-1 group-hover:text-indigo-600 transition-colors">
                      {p.name}
                    </h4>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs font-black text-slate-900 font-mono">
                      ₹{p.price.toLocaleString('en-IN')}
                    </span>
                    <span className="text-[10px] font-black text-indigo-600 group-hover:underline">
                      View Details →
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
