import { X, Plus, Minus, Trash2, ShoppingBag, Percent } from 'lucide-react';
import { CartItem, StoreSettings } from '../types';
import { useState } from 'react';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onProceedToCheckout: (subtotal: number, discount: number, tax: number, total: number, promoApplied: string) => void;
  settings: StoreSettings;
}

export default function CartDrawer({
  isOpen,
  onClose,
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  onProceedToCheckout,
  settings
}: CartDrawerProps) {
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState('');
  const [promoDiscount, setPromoDiscount] = useState(0); // decimal percent, e.g., 0.1 for 10%
  const [promoError, setPromoError] = useState('');

  if (!isOpen) return null;

  const subtotal = cartItems.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
  const discountAmount = Math.round(subtotal * promoDiscount);
  const taxableAmount = subtotal - discountAmount;
  
  // Dynamic settings
  const cgstPercent = settings?.cgstPercent !== undefined ? settings.cgstPercent : 9;
  const sgstPercent = settings?.sgstPercent !== undefined ? settings.sgstPercent : 9;
  const deliveryCharge = settings?.deliveryCharge !== undefined ? settings.deliveryCharge : 150;
  const freeShippingThreshold = settings?.freeShippingThreshold !== undefined ? settings.freeShippingThreshold : 4999;

  // SGST + CGST inside India
  const cgst = Math.round(taxableAmount * (cgstPercent / 100));
  const sgst = Math.round(taxableAmount * (sgstPercent / 100));
  const tax = cgst + sgst;
  
  // Shipping calculation
  const shipping = subtotal >= freeShippingThreshold || subtotal === 0 ? 0 : deliveryCharge;
  const total = taxableAmount + tax + shipping;


  const handleApplyPromo = () => {
    setPromoError('');
    if (promoCode.toUpperCase() === 'ZYNTEXA10') {
      setPromoDiscount(0.10);
      setAppliedPromo('ZYNTEXA10');
      setPromoCode('');
    } else if (promoCode.trim() === '') {
      setPromoError('Please enter a promo code');
    } else {
      setPromoError('Invalid promo code. Try: ZYNTEXA10');
    }
  };

  const removePromo = () => {
    setPromoDiscount(0);
    setAppliedPromo('');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/50 backdrop-blur-xs flex justify-end">
      {/* Backdrop click close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Cart Drawer Panel */}
      <div 
        id="cart-drawer-panel"
        className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-slide-left border-l border-slate-100"
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-indigo-600" />
            <h3 className="text-lg font-bold text-slate-800">Your Cart</h3>
            <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2 py-0.5 rounded-full">
              {cartItems.reduce((acc, item) => acc + item.quantity, 0)}
            </span>
          </div>
          <button 
            onClick={onClose}
            id="close-cart-btn"
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Items Container */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {cartItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-20 h-20 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-500 animate-bounce">
                <ShoppingBag className="w-10 h-10" />
              </div>
              <div>
                <h4 className="text-slate-800 font-bold">Your cart is empty</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-[220px]">
                  Explore our luxury collection and add premium products to your cart.
                </p>
              </div>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-500 shadow-md shadow-indigo-100"
              >
                Start Shopping
              </button>
            </div>
          ) : (
            cartItems.map((item) => (
              <div 
                key={item.product.id}
                className="flex items-center gap-3.5 p-3 rounded-xl border border-slate-100 hover:border-slate-200/80 transition-all shadow-xs"
                id={`cart-item-${item.product.id}`}
              >
                {/* Image */}
                <div className="w-16 h-16 rounded-lg bg-slate-50 overflow-hidden relative flex-shrink-0">
                  <img 
                    src={item.product.imageUrl} 
                    alt={item.product.name} 
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover" 
                  />
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-slate-800 truncate leading-snug">{item.product.name}</h4>
                  <p className="text-xs text-indigo-600 font-bold font-mono mt-0.5">₹{item.product.price.toLocaleString('en-IN')}</p>
                  
                  {/* Quantity Controls */}
                  <div className="flex items-center gap-2.5 mt-2">
                    <div className="flex items-center border border-slate-200 rounded-lg bg-slate-50">
                      <button
                        onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
                        className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-l-lg transition-colors"
                        id={`cart-decrement-${item.product.id}`}
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="px-2 text-xs font-bold text-slate-700 min-w-4 text-center">{item.quantity}</span>
                      <button
                        onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                        disabled={item.quantity >= item.product.stock}
                        className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-r-lg transition-colors disabled:opacity-30"
                        id={`cart-increment-${item.product.id}`}
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Remove */}
                <button
                  onClick={() => onRemoveItem(item.product.id)}
                  id={`remove-cart-item-${item.product.id}`}
                  className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                  title="Remove item"
                >
                  <Trash2 className="w-4.5 h-4.5" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Pricing Summary */}
        {cartItems.length > 0 && (
          <div className="p-5 border-t border-slate-100 bg-slate-50/60 space-y-4">
            {/* Promo Code Input */}
            <div>
              {appliedPromo ? (
                <div className="flex items-center justify-between bg-emerald-50 border border-emerald-100 px-3 py-2 rounded-xl text-xs text-emerald-700 font-bold">
                  <div className="flex items-center gap-1.5">
                    <Percent className="w-3.5 h-3.5" />
                    <span>Promo Applied: {appliedPromo} (10% OFF)</span>
                  </div>
                  <button 
                    onClick={removePromo}
                    className="text-slate-400 hover:text-rose-500 text-xs font-bold font-mono hover:scale-105 transition-all ml-2"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Promo Code (e.g., ZYNTEXA10)"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 uppercase font-semibold"
                    />
                    <button
                      onClick={handleApplyPromo}
                      className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all"
                    >
                      Apply
                    </button>
                  </div>
                  {promoError ? (
                    <p className="text-[10px] text-rose-500 font-medium pl-1">{promoError}</p>
                  ) : (
                    <p className="text-[9px] text-slate-400 font-medium pl-1">✨ Hint: Enter code ZYNTEXA10 for a 10% instant checkout discount!</p>
                  )}
                </div>
              )}
            </div>

            {/* Calculations */}
            <div className="space-y-2 text-xs font-medium text-slate-600">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-mono text-slate-800 font-bold">₹{subtotal.toLocaleString('en-IN')}</span>
              </div>
              {appliedPromo && (
                <div className="flex justify-between text-emerald-600">
                  <span>10% Promo Discount</span>
                  <span className="font-mono font-bold">-₹{discountAmount.toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>CGST ({cgstPercent}%)</span>
                <span className="font-mono text-slate-800">₹{cgst.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span>SGST ({sgstPercent}%)</span>
                <span className="font-mono text-slate-800">₹{sgst.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span>Estimated Delivery</span>
                {shipping === 0 ? (
                  <span className="text-emerald-600 font-bold">FREE</span>
                ) : (
                  <span className="font-mono text-slate-800">₹{shipping.toLocaleString('en-IN')}</span>
                )}
              </div>
              {shipping > 0 && (
                <p className="text-[9px] text-indigo-500 text-right">Add ₹{(freeShippingThreshold - subtotal).toLocaleString('en-IN')} more for free delivery!</p>
              )}
              
              <div className="flex justify-between text-sm font-extrabold text-slate-950 pt-2 border-t border-slate-200/60">
                <span>Total Amount</span>
                <span className="font-mono text-lg text-indigo-700 font-black">₹{total.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Checkout Link */}
            <button
              onClick={() => onProceedToCheckout(subtotal, discountAmount, tax, total, appliedPromo)}
              id="proceed-checkout-btn"
              className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-sm transition-colors text-center shadow-lg shadow-slate-200 mt-2"
            >
              Proceed to Shipping
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
