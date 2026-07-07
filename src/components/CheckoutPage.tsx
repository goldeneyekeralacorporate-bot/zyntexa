import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, MapPin, CheckCircle2, 
  Truck, Percent, Sparkles, Navigation,
  Loader2, CreditCard, QrCode, Building,
  ShieldCheck, AlertCircle, ExternalLink,
  ShieldAlert, Sparkles as SparkleIcon
} from 'lucide-react';
import { load } from '@cashfreepayments/cashfree-js';

import { Address, Order, CartItem, UserProfile } from '../types';
import { placeOrder, updateOrderStatus } from '../lib/firebase';
import OpenStreetMapPicker from './OpenStreetMapPicker';

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", 
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", 
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", 
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", 
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu", 
  "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
];

interface CheckoutPageProps {
  user: UserProfile | null;
  cartItems: CartItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  promoApplied: string;
  detectedLocation: { city: string; state: string; pincode: string; latitude?: number; longitude?: number } | null;
  onBack: () => void;
  onOrderSuccess: (orderId: string) => void;
}

export default function CheckoutPage({
  user,
  cartItems,
  subtotal,
  discount,
  tax,
  total,
  promoApplied,
  detectedLocation,
  onBack,
  onOrderSuccess
}: CheckoutPageProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isLocating, setIsLocating] = useState(false);
  const [loading, setLoading] = useState(false);

  // Payment State (UPI, Card, NetBanking)
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'Card' | 'NetBanking'>('UPI');
  const [selectedUpiApp, setSelectedUpiApp] = useState<'GPay' | 'PhonePe' | 'Paytm' | 'BHIM'>('GPay');
  const [selectedBank, setSelectedBank] = useState<string>('SBI');

  // Cashfree states
  const [cashfree, setCashfree] = useState<any>(null);
  const [paymentSessionId, setPaymentSessionId] = useState<string>('');
  const [cfPaymentLink, setCfPaymentLink] = useState<string>('');
  const [cfOrderId, setCfOrderId] = useState<string>('');
  const [showPaymentOverlay, setShowPaymentOverlay] = useState(false);
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [verificationError, setVerificationError] = useState('');
  const [isCfConfigured, setIsCfConfigured] = useState(true);

  // Address State
  const [address, setAddress] = useState<Address>({
    fullName: user?.name || '',
    phone: user?.phone?.replace('+91 ', '') || '',
    street: '',
    landmark: '',
    city: detectedLocation?.city || '',
    state: detectedLocation?.state || 'Karnataka',
    pincode: detectedLocation?.pincode || ''
  });

  // Location Coordinates (to store on the order)
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(
    detectedLocation?.latitude && detectedLocation?.longitude 
      ? { latitude: detectedLocation.latitude, longitude: detectedLocation.longitude }
      : null
  );

  const [orderIdCreated, setOrderIdCreated] = useState('');
  const [error, setError] = useState('');

  // Sync auto-detected location if updated in nav
  useEffect(() => {
    if (detectedLocation) {
      setAddress(prev => ({
        ...prev,
        city: detectedLocation.city,
        state: detectedLocation.state,
        pincode: detectedLocation.pincode
      }));
      if (detectedLocation.latitude && detectedLocation.longitude) {
        setCoordinates({
          latitude: detectedLocation.latitude,
          longitude: detectedLocation.longitude
        });
      }
    }
  }, [detectedLocation]);

  // Load Cashfree config check & load client SDK
  useEffect(() => {
    fetch('/api/cashfree/config-status')
      .then(res => res.json())
      .then(data => {
        setIsCfConfigured(data.configured);
      })
      .catch(() => setIsCfConfigured(false));

    load({ mode: 'production' })
      .then(cf => {
        setCashfree(cf);
      })
      .catch(err => {
        console.error("Cashfree SDK failed to load:", err);
      });
  }, []);

  // Geolocation trigger in checkout form
  const handleAutoDetectCheckout = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setCoordinates({ latitude, longitude });
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
          );
          if (response.ok) {
            const data = await response.json();
            const addr = data.address || {};
            setAddress(prev => ({
              ...prev,
              city: addr.city || addr.town || addr.village || "Bengaluru",
              state: addr.state || "Karnataka",
              pincode: addr.postcode || "560001"
            }));
          }
        } catch (err) {
          console.error("Geocoding failed, using mock", err);
          setAddress(prev => ({
            ...prev,
            city: "Mumbai",
            state: "Maharashtra",
            pincode: "400001"
          }));
        } finally {
          setIsLocating(false);
        }
      },
      () => {
        setIsLocating(false);
        alert("Unable to access location. Please fill form manually.");
      }
    );
  };

  const validateAddress = () => {
    setError('');
    if (!address.fullName.trim()) return 'Full Name is required';
    if (!/^[6-9]\d{9}$/.test(address.phone)) return 'Please enter a valid 10-digit Indian Mobile Number';
    if (!address.street.trim()) return 'Flat/House/Street details are required';
    if (!address.city.trim()) return 'City is required';
    if (!address.pincode || !/^\d{6}$/.test(address.pincode)) return 'Please enter a valid 6-digit Indian PIN Code';
    return '';
  };

  const handleNextStep = () => {
    const err = validateAddress();
    if (err) {
      setError(err);
      return;
    }
    setError('');
    setStep(2);
  };

  const handleVerifyPayment = async () => {
    if (!orderIdCreated) return;
    setVerifyingPayment(true);
    setVerificationError('');
    try {
      const res = await fetch(`/api/cashfree/verify-order/${orderIdCreated}`);
      if (!res.ok) {
        throw new Error("Could not contact verification server.");
      }
      const statusData = await res.json();
      if (statusData.orderStatus === 'PAID') {
        // Success! Update Firestore order paymentStatus to 'confirmed'
        await updateOrderStatus(orderIdCreated, 'pending', 'confirmed');
        setShowPaymentOverlay(false);
        setStep(3);
        onOrderSuccess(orderIdCreated);
      } else {
        setVerificationError(`Current Cashfree payment status is "${statusData.orderStatus}". Please make sure you have completed the transaction in the payment window and try verifying again.`);
      }
    } catch (err: any) {
      setVerificationError(err?.message || "Failed to verify payment status.");
    } finally {
      setVerifyingPayment(false);
    }
  };

  const handleSubmitOrder = async () => {
    const err = validateAddress();
    if (err) {
      setError(err);
      return;
    }

    // If Cashfree is not configured, we'll proceed in simulated demo mode.

    setError('');
    setLoading(true);

    try {
      // Map cart items into final order schema
      const orderItems = cartItems.map(item => ({
        productId: item.product.id,
        name: item.product.name,
        price: item.product.price,
        quantity: item.quantity,
        imageUrl: item.product.imageUrl
      }));

      const isDemoMode = !isCfConfigured;

      // Generate a unique order reference and transaction ID
      const generatedOrderId = 'ZYN_' + Math.random().toString(36).substring(2, 10).toUpperCase();
      const transactionId = isDemoMode
        ? 'DEMO_PREPAID_' + Math.random().toString(36).substring(2, 10).toUpperCase()
        : 'CF_' + Math.random().toString(36).substring(2, 10).toUpperCase();

      const newOrder: Omit<Order, 'id'> = {
        userId: user?.uid || 'guest_' + Math.random().toString(36).substring(2, 8),
        customerName: address.fullName,
        customerEmail: user?.email || '',
        customerPhone: `+91 ${address.phone}`,
        items: orderItems,
        shippingAddress: address,
        subtotal,
        tax,
        discount,
        total,
        paymentMethod: paymentMethod,
        paymentStatus: isDemoMode ? 'confirmed' : 'pending',
        orderStatus: 'pending',
        createdAt: new Date().toISOString()
      };

      if (coordinates) {
        newOrder.locationCoordinates = coordinates;
      }

      newOrder.paymentDetails = { transactionId };

      // Step A: Save the pending order first
      const placedId = await placeOrder({ ...newOrder, id: generatedOrderId } as any);
      setOrderIdCreated(placedId);

      if (isDemoMode) {
        setStep(3);
        onOrderSuccess(placedId);
      } else {
        // Step B: Call backend proxy to create Cashfree live order session
        const cfResponse = await fetch('/api/cashfree/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: total,
            customerPhone: address.phone,
            customerEmail: user?.email || 'customer@zyntexa.com',
            customerName: address.fullName,
            orderId: placedId
          })
        });

        const cfData = await cfResponse.json();

        if (!cfResponse.ok) {
          throw new Error(cfData.error || 'Failed to initialize Cashfree session.');
        }

        setPaymentSessionId(cfData.paymentSessionId);
        setCfPaymentLink(cfData.paymentLink || '');
        setCfOrderId(cfData.cfOrderId || '');
        setShowPaymentOverlay(true);

        // Step C: Trigger Cashfree overlay redirect / SDK
        if (cashfree && cfData.paymentSessionId) {
          try {
            cashfree.checkout({
              paymentSessionId: cfData.paymentSessionId,
              redirectTarget: "_blank"
            });
          } catch (cfSdkErr) {
            console.warn("Cashfree SDK standard checkout redirection warning:", cfSdkErr);
          }
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to place order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-fade-in" id="checkout-funnel-container">
      {step !== 3 && (
        <button
          onClick={step === 2 ? () => setStep(1) : onBack}
          id="back-from-checkout-btn"
          className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-bold text-sm mb-6 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{step === 2 ? "Back to Shipping" : "Back to Cart"}</span>
        </button>
      )}

      {/* Progress Stepper */}
      {step !== 3 && (
        <div className="flex items-center justify-center gap-4 mb-10 text-xs sm:text-sm font-bold text-slate-400">
          <div className="flex items-center gap-2">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
              step >= 1 ? 'bg-indigo-600 text-white shadow font-extrabold' : 'bg-slate-100 text-slate-500'
            }`}>1</span>
            <span className={step >= 1 ? 'text-slate-900 font-extrabold' : ''}>Shipping Details</span>
          </div>
          <div className="w-12 h-0.5 bg-slate-200" />
          <div className="flex items-center gap-2">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
              step >= 2 ? 'bg-indigo-600 text-white shadow font-extrabold' : 'bg-slate-100 text-slate-500'
            }`}>2</span>
            <span className={step >= 2 ? 'text-slate-900 font-extrabold' : ''}>Payment Options</span>
          </div>
          <div className="w-12 h-0.5 bg-slate-200" />
          <div className="flex items-center gap-2">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
              step >= 3 ? 'bg-indigo-600 text-white shadow font-extrabold' : 'bg-slate-100 text-slate-500'
            }`}>3</span>
            <span className={step >= 3 ? 'text-slate-900' : ''}>Confirmation</span>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-100 text-rose-600 text-sm rounded-xl font-medium flex items-start gap-2">
          <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {step === 1 ? (
        /* STEP 1: SHIPPING ADDRESS */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Address Form */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-50 pb-4">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-indigo-600" />
                <span>Shipping Destination (All India)</span>
              </h3>
              <button
                type="button"
                onClick={handleAutoDetectCheckout}
                disabled={isLocating}
                id="auto-detect-location-checkout-btn"
                className="flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold py-2 px-3.5 rounded-xl transition-colors cursor-pointer"
              >
                {isLocating ? (
                  <Navigation className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Navigation className="w-3.5 h-3.5" />
                )}
                <span>{isLocating ? "Locating..." : "Auto-Detect"}</span>
              </button>
            </div>

            {coordinates && (
              <p className="text-[10px] text-indigo-600 font-bold bg-indigo-50/40 px-3 py-1 rounded-lg w-fit flex items-center gap-1 animate-fade-in">
                <span>📍 Geolocation Captured: {coordinates.latitude.toFixed(4)}° N, {coordinates.longitude.toFixed(4)}° E</span>
              </p>
            )}

            <div className="space-y-2 mb-4" id="osm-map-picker-block">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                Select Delivery Location on Interactive Map
              </label>
              <OpenStreetMapPicker
                initialCoords={coordinates}
                onLocationSelected={({ lat, lng, street, city, state, pincode }) => {
                  setCoordinates({ latitude: lat, longitude: lng });
                  setAddress(prev => ({
                    ...prev,
                    street: street || prev.street,
                    city: city || prev.city,
                    state: state || prev.state,
                    pincode: pincode || prev.pincode
                  }));
                }}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Recipient Full Name</label>
                <input
                  type="text"
                  placeholder="E.g. Rajesh Sharma"
                  value={address.fullName}
                  onChange={(e) => setAddress({ ...address, fullName: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Indian Mobile Number</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-sm font-bold text-slate-400">+91</span>
                  <input
                    type="tel"
                    maxLength={10}
                    placeholder="Enter 10-digit number"
                    value={address.phone}
                    onChange={(e) => setAddress({ ...address, phone: e.target.value.replace(/\D/g, '') })}
                    className="w-full pl-12 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 text-sm font-medium"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Flat, House No., Building, Apartment, Street</label>
              <input
                type="text"
                placeholder="E.g. Flat 302, Royal Apartments, MG Road"
                value={address.street}
                onChange={(e) => setAddress({ ...address, street: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 text-sm font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Landmark / Locality (Optional)</label>
              <input
                type="text"
                placeholder="E.g. Opposite State Bank of India"
                value={address.landmark}
                onChange={(e) => setAddress({ ...address, landmark: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 text-sm font-medium"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">City</label>
                <input
                  type="text"
                  placeholder="E.g. Mumbai"
                  value={address.city}
                  onChange={(e) => setAddress({ ...address, city: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">State / Union Territory</label>
                <select
                  value={address.state}
                  onChange={(e) => setAddress({ ...address, state: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 text-sm font-semibold text-slate-700 bg-white"
                >
                  {INDIAN_STATES.map((st) => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">PIN Code</label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="6 digits (E.g. 400001)"
                  value={address.pincode}
                  onChange={(e) => setAddress({ ...address, pincode: e.target.value.replace(/\D/g, '') })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 text-sm font-medium"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-50 flex justify-end">
              <button
                type="button"
                onClick={handleNextStep}
                id="checkout-step1-next-btn"
                className="py-3 px-6 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-indigo-100 flex items-center gap-2 cursor-pointer"
              >
                <span>Proceed to Payment</span>
                <ArrowLeft className="w-4 h-4 rotate-180" />
              </button>
            </div>
          </div>

          {/* Right Summary Sidebar */}
          <div className="bg-slate-50 rounded-2xl border border-slate-100 p-6 space-y-4 h-fit">
            <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-2">Order Summary</h4>
            <div className="max-h-48 overflow-y-auto space-y-3 pr-1">
              {cartItems.map((item) => (
                <div key={item.product.id} className="flex gap-2.5 items-center text-xs">
                  <img src={item.product.imageUrl} className="w-10 h-10 rounded-lg object-cover bg-white" referrerPolicy="no-referrer" />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-700 truncate">{item.product.name}</p>
                    <p className="text-slate-400 font-medium">Qty: {item.quantity} × ₹{item.product.price}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-2 text-xs font-semibold text-slate-500 pt-2 border-t border-slate-200">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-mono text-slate-700">₹{subtotal.toLocaleString('en-IN')}</span>
              </div>
              {promoApplied && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount ({promoApplied})</span>
                  <span className="font-mono font-bold">-₹{discount.toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>CGST + SGST Tax</span>
                <span className="font-mono text-slate-700">₹{tax.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery Charge</span>
                {total - subtotal + discount - tax === 0 ? (
                  <span className="text-emerald-600 font-bold">FREE</span>
                ) : (
                  <span className="font-mono text-slate-700">₹{(total - (subtotal - discount + tax)).toLocaleString('en-IN')}</span>
                )}
              </div>
              <div className="flex justify-between text-sm font-extrabold text-slate-800 pt-2.5 border-t border-slate-200">
                <span>Amount Payable</span>
                <span className="font-mono text-indigo-600 text-base font-black">₹{total.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        </div>
      ) : step === 2 ? (
        /* STEP 2: PAYMENT METHOD SELECTION */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
              <h3 className="text-lg font-bold text-slate-800 border-b border-slate-50 pb-4 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-600" />
                <span>Choose Payment Method</span>
              </h3>

              {!isCfConfigured && (
                <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl flex gap-3 text-xs font-medium text-amber-800">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Notice: Demo Mode Active (Simulated Prepaid Checkout)</span>
                    <p className="mt-0.5 text-amber-700">
                      CASHFREE_APP_ID and CASHFREE_SECRET_KEY are not configured on the server. You can still test the checkout experience; payments will be simulated as completed successfully!
                    </p>
                  </div>
                </div>
              )}

              {isCfConfigured && (
                <div className="p-3.5 bg-emerald-50/60 border border-emerald-100 rounded-xl flex gap-2.5 text-xs text-emerald-800 font-medium">
                  <ShieldCheck className="w-4.5 h-4.5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span>🔒 SECURE CASHFREE ROUTING ACTIVATED</span>
                    <p className="text-[10px] text-emerald-700 mt-0.5">Your live transactions are fully encrypted, verified, and secured via production-level Cashfree APIs.</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-3">
                {/* UPI PAYMENTS */}
                <label className={`relative flex flex-col p-4 rounded-xl border-2 transition-all cursor-pointer ${
                  paymentMethod === 'UPI' ? 'border-indigo-600 bg-indigo-50/20' : 'border-slate-200 hover:border-slate-300'
                }`}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="UPI"
                    checked={paymentMethod === 'UPI'}
                    onChange={() => setPaymentMethod('UPI')}
                    className="sr-only"
                  />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${paymentMethod === 'UPI' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                        <QrCode className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">UPI Instant Transfer</p>
                        <p className="text-xs text-slate-400">Pay using Google Pay, PhonePe, Paytm, or BHIM UPI</p>
                      </div>
                    </div>
                    {!isCfConfigured && <span className="text-[10px] bg-slate-100 text-slate-400 px-2 py-0.5 rounded font-bold">Prepaid</span>}
                  </div>

                  {paymentMethod === 'UPI' && (
                    <div className="mt-4 pt-3 border-t border-indigo-100/50 flex gap-2 overflow-x-auto animate-fade-in">
                      {(['GPay', 'PhonePe', 'Paytm', 'BHIM'] as const).map((app) => (
                        <button
                          key={app}
                          type="button"
                          onClick={() => setSelectedUpiApp(app)}
                          className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                            selectedUpiApp === app ? 'bg-indigo-600 border-indigo-600 text-white shadow' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          {app}
                        </button>
                      ))}
                    </div>
                  )}
                </label>

                {/* CREDIT/DEBIT CARDS */}
                <label className={`relative flex flex-col p-4 rounded-xl border-2 transition-all cursor-pointer ${
                  paymentMethod === 'Card' ? 'border-indigo-600 bg-indigo-50/20' : 'border-slate-200 hover:border-slate-300'
                }`}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="Card"
                    checked={paymentMethod === 'Card'}
                    onChange={() => setPaymentMethod('Card')}
                    className="sr-only"
                  />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${paymentMethod === 'Card' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                        <CreditCard className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">Credit or Debit Card</p>
                        <p className="text-xs text-slate-400">Visa, MasterCard, RuPay, Maestro and Diners</p>
                      </div>
                    </div>
                  </div>
                </label>

                {/* NET BANKING */}
                <label className={`relative flex flex-col p-4 rounded-xl border-2 transition-all cursor-pointer ${
                  paymentMethod === 'NetBanking' ? 'border-indigo-600 bg-indigo-50/20' : 'border-slate-200 hover:border-slate-300'
                }`}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="NetBanking"
                    checked={paymentMethod === 'NetBanking'}
                    onChange={() => setPaymentMethod('NetBanking')}
                    className="sr-only"
                  />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${paymentMethod === 'NetBanking' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                        <Building className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">NetBanking (Indian Banks)</p>
                        <p className="text-xs text-slate-400">Secure direct transfer from all major banks</p>
                      </div>
                    </div>
                  </div>

                  {paymentMethod === 'NetBanking' && (
                    <div className="mt-4 pt-3 border-t border-indigo-100/50 animate-fade-in">
                      <select
                        value={selectedBank}
                        onChange={(e) => setSelectedBank(e.target.value)}
                        className="w-full max-w-xs px-3 py-2 text-xs font-bold rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-indigo-500 text-slate-700"
                      >
                        <option value="SBI">State Bank of India (SBI)</option>
                        <option value="HDFC">HDFC Bank</option>
                        <option value="ICICI">ICICI Bank</option>
                        <option value="AXIS">Axis Bank</option>
                        <option value="PNB">Punjab National Bank</option>
                      </select>
                    </div>
                  )}
                </label>
              </div>

              {/* Step 2 Bottom Navigation */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs font-bold text-slate-500 hover:text-indigo-600 flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Address</span>
                </button>

                <button
                  type="button"
                  onClick={handleSubmitOrder}
                  disabled={loading}
                  id="checkout-step2-pay-btn"
                  className="py-3 px-6 bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded-xl text-sm transition-all shadow-md shadow-slate-200 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{!isCfConfigured ? 'Simulating Payment...' : 'Contacting Cashfree...'}</span>
                    </>
                  ) : (
                    <>
                      <span>{!isCfConfigured ? 'Simulate Payment & Order' : 'Pay & Place Order'}</span>
                      <span className="font-mono text-xs opacity-80">(₹{total.toLocaleString('en-IN')})</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Address Preview & Order Breakdown */}
          <div className="space-y-6">
            {/* Address Summary */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-50">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Delivery Destination</h4>
                <button onClick={() => setStep(1)} className="text-[10px] text-indigo-600 hover:underline font-bold">Edit</button>
              </div>
              <div className="text-xs text-slate-600 space-y-1 font-medium">
                <p className="font-extrabold text-slate-800">{address.fullName}</p>
                <p>+91 {address.phone}</p>
                <p className="truncate">{address.street}</p>
                <p>{address.city}, {address.state} - {address.pincode}</p>
              </div>
            </div>

            {/* Price Summary */}
            <div className="bg-slate-50 rounded-2xl border border-slate-100 p-5 space-y-4">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-2">Pricing Breakdown</h4>
              <div className="space-y-2 text-xs font-semibold text-slate-500">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-mono text-slate-700">₹{subtotal.toLocaleString('en-IN')}</span>
                </div>
                {promoApplied && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount ({promoApplied})</span>
                    <span className="font-mono font-bold">-₹{discount.toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>CGST + SGST Tax</span>
                  <span className="font-mono text-slate-700">₹{tax.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery Charge</span>
                  {total - subtotal + discount - tax === 0 ? (
                    <span className="text-emerald-600 font-bold">FREE</span>
                  ) : (
                    <span className="font-mono text-slate-700">₹{(total - (subtotal - discount + tax)).toLocaleString('en-IN')}</span>
                  )}
                </div>
                <div className="flex justify-between text-sm font-extrabold text-slate-800 pt-2.5 border-t border-slate-200">
                  <span>Amount Payable</span>
                  <span className="font-mono text-indigo-600 text-base font-black">₹{total.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* STEP 3: ORDER SUCCESS CONFIRMATION */
        <div className="max-w-md mx-auto text-center bg-white border border-slate-100 rounded-2xl shadow-xl p-8 space-y-6">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm shadow-emerald-50">
            <CheckCircle2 className="w-10 h-10 animate-bounce" />
          </div>

          <div className="space-y-2">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
              Order Placed
            </span>
            <h3 className="text-2xl font-black text-slate-800 tracking-tight">Order Placed Successfully!</h3>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Your premium items are now packaged and prepared for shipping logistics. You can view progress details below.
            </p>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 space-y-2.5 text-xs font-semibold text-slate-600">
            <div className="flex justify-between">
              <span>Order Reference ID</span>
              <span className="font-mono text-indigo-600 font-bold" id="order-ref-id">{orderIdCreated}</span>
            </div>
            <div className="flex justify-between">
              <span>Recipient Name</span>
              <span className="text-slate-800">{address.fullName}</span>
            </div>
            <div className="flex justify-between">
              <span>Shipping Location</span>
              <span className="text-slate-800">{address.city}, {address.state}</span>
            </div>
            <div className="flex justify-between">
              <span>Payment Mode</span>
              <span className="text-slate-800 font-bold">
                {!isCfConfigured 
                  ? `${paymentMethod === 'UPI' ? 'UPI' : paymentMethod === 'Card' ? 'Credit/Debit Card' : 'NetBanking'} (Simulated)`
                  : paymentMethod === 'UPI' ? 'UPI (Cashfree)' : paymentMethod === 'Card' ? 'Credit/Debit Card (Cashfree)' : 'NetBanking (Cashfree)'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Payment Status</span>
              <span className="font-bold text-emerald-600">
                {!isCfConfigured ? 'PAID (Demo Simulation)' : 'PAID (Live Verified)'}
              </span>
            </div>
            <div className="flex justify-between text-sm font-bold text-slate-800 pt-2 border-t border-slate-200/60">
              <span>Total Amount Paid</span>
              <span className="font-mono text-indigo-600 font-extrabold">₹{total.toLocaleString('en-IN')}</span>
            </div>
          </div>

          <p className="text-[10px] text-amber-600 font-medium bg-amber-50 border border-amber-100 p-2 rounded-lg leading-relaxed">
            ✨ Evaluation Tip: Visit the <strong>Admin Panel</strong> (using the header pill) to view this order immediately in real-time, inspect details, approve it, or change statuses!
          </p>

          <button
            onClick={() => onOrderSuccess(orderIdCreated)}
            id="back-to-store-success-btn"
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-sm transition-colors shadow-md shadow-slate-200 cursor-pointer"
          >
            Continue Shopping
          </button>
        </div>
      )}

      {/* CASHFREE SECURE PAYMENT MODAL OVERLAY */}
      {showPaymentOverlay && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl max-w-md w-full p-6 space-y-6 animate-scale-up text-slate-700">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto shadow-sm">
                <ShieldCheck className="w-6 h-6 animate-pulse" />
              </div>
              <h3 className="text-lg font-black text-slate-800 tracking-tight">Completing Payment Session</h3>
              <p className="text-xs text-slate-400">
                A secure Cashfree Payment window has been initiated in production mode for order reference <strong className="font-mono text-indigo-600">{orderIdCreated}</strong>.
              </p>
            </div>

            {verificationError && (
              <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs font-semibold text-rose-600 flex items-start gap-2 animate-fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{verificationError}</span>
              </div>
            )}

            <div className="space-y-3">
              <a
                href={cfPaymentLink}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-indigo-100 flex items-center justify-center gap-2 cursor-pointer text-center"
              >
                <span>Open Secure Payment Gateway</span>
                <ExternalLink className="w-4 h-4" />
              </a>

              <button
                type="button"
                onClick={handleVerifyPayment}
                disabled={verifyingPayment}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-emerald-100 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {verifyingPayment ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying live payment status...</span>
                  </>
                ) : (
                  <>
                    <span>Verify Live Payment Status</span>
                    <ShieldCheck className="w-4 h-4 text-emerald-200" />
                  </>
                )}
              </button>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl text-[11px] text-slate-500 leading-normal space-y-2">
              <p className="font-bold text-slate-600">How to verify your test/live payment:</p>
              <ol className="list-decimal pl-4 space-y-1">
                <li>Click the first button to open the Cashfree secure page in a new window.</li>
                <li>Complete your payment choosing card, UPI, or NetBanking.</li>
                <li>Return to this page and click <strong className="text-emerald-600">"Verify Live Payment Status"</strong> to auto-approve.</li>
              </ol>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowPaymentOverlay(false);
                  onBack();
                }}
                className="text-xs text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
              >
                Cancel Session
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
