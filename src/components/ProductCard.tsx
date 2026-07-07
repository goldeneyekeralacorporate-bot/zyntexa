import React, { useState } from 'react';
import { ShoppingBag, Edit, Check, AlertCircle } from 'lucide-react';
import { Product } from '../types';

interface ProductCardProps {
  key?: React.Key;
  product: Product;
  isAdmin: boolean;
  onAddToCart: (product: Product) => void;
  onUpdatePrice: (productId: string, newPrice: number) => Promise<void>;
  onViewDetails?: (product: Product) => void;
}

export default function ProductCard({ product, isAdmin, onAddToCart, onUpdatePrice, onViewDetails }: ProductCardProps) {
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [priceInput, setPriceInput] = useState(product.price.toString());
  const [isUpdating, setIsUpdating] = useState(false);
  const [added, setAdded] = useState(false);

  const handleAddToCart = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    onAddToCart(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const handlePriceUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = Number(priceInput);
    if (isNaN(parsed) || parsed <= 0) return;
    
    setIsUpdating(true);
    try {
      await onUpdatePrice(product.id, parsed);
      setIsEditingPrice(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div 
      className="group relative bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:border-slate-200/60 flex flex-col h-full overflow-hidden transition-all duration-300"
      id={`product-card-${product.id}`}
    >
      {/* Badges Overlay */}
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5">
        {product.featured && (
          <span className="px-2.5 py-1 text-[10px] font-bold text-white bg-indigo-600 rounded-full shadow-sm uppercase tracking-wider">
            Featured
          </span>
        )}
        {product.stock <= 5 && product.stock > 0 && (
          <span className="px-2.5 py-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-100 rounded-full uppercase tracking-wider flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            Only {product.stock} Left
          </span>
        )}
        {product.stock === 0 && (
          <span className="px-2.5 py-1 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-100 rounded-full uppercase tracking-wider">
            Out of Stock
          </span>
        )}
      </div>

      {/* Admin Quick Edit Panel */}
      {isAdmin && (
        <div className="absolute top-3 right-3 z-10">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setPriceInput(product.price.toString());
              setIsEditingPrice(!isEditingPrice);
            }}
            id={`admin-edit-price-btn-${product.id}`}
            className="p-2 bg-slate-900/90 hover:bg-slate-900 text-white rounded-xl shadow-lg hover:scale-105 transition-all cursor-pointer flex items-center justify-center border border-slate-700"
            title="Quick edit price"
          >
            <Edit className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Image Container */}
      <div 
        onClick={() => onViewDetails?.(product)}
        className="relative pt-[100%] bg-slate-50 overflow-hidden cursor-pointer"
      >
        <img
          src={product.imageUrl}
          alt={product.name}
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>

      {/* Content */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div 
          onClick={() => onViewDetails?.(product)}
          className="cursor-pointer group-hover:opacity-95 transition-opacity"
        >
          {/* Category */}
          <span className="text-[11px] font-bold uppercase text-slate-400 tracking-widest block mb-1">
            {product.category}
          </span>
          {/* Title */}
          <h4 className="font-bold text-slate-800 text-base line-clamp-1 group-hover:text-indigo-600 transition-colors">
            {product.name}
          </h4>
          {/* Description */}
          <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">
            {product.description}
          </p>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between gap-2">
          {/* Price Section */}
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Price</span>
            {isEditingPrice ? (
              <form onSubmit={handlePriceUpdateSubmit} className="flex items-center gap-1.5 mt-0.5">
                <span className="text-sm font-bold text-slate-700">₹</span>
                <input
                  type="number"
                  value={priceInput}
                  onChange={(e) => setPriceInput(e.target.value)}
                  className="w-20 px-1.5 py-0.5 text-sm font-bold text-slate-800 bg-slate-100 border border-indigo-300 rounded focus:outline-none focus:border-indigo-500"
                  required
                  min="1"
                  disabled={isUpdating}
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={isUpdating}
                  id={`confirm-price-btn-${product.id}`}
                  className="px-1.5 py-1 bg-emerald-600 text-white text-[10px] font-bold rounded hover:bg-emerald-500 disabled:opacity-50"
                >
                  Save
                </button>
              </form>
            ) : (
              <span className="text-lg font-extrabold text-slate-900 font-mono tracking-tight">
                ₹{product.price.toLocaleString('en-IN')}
              </span>
            )}
          </div>

          {/* Action Button */}
          {!isEditingPrice && (
            <button
              onClick={handleAddToCart}
              disabled={product.stock === 0}
              id={`add-to-cart-${product.id}`}
              className={`py-2 px-3.5 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-1.5 shadow-sm active:scale-95 ${
                product.stock === 0
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                  : added
                  ? 'bg-emerald-600 text-white shadow-emerald-100 hover:bg-emerald-500'
                  : 'bg-slate-900 text-white hover:bg-indigo-600 shadow-slate-200 hover:shadow-indigo-100'
              }`}
            >
              {added ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Added!</span>
                </>
              ) : (
                <>
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Add</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
