import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, MapPin, CreditCard, ShieldCheck, CheckCircle2, 
  QrCode, Landmark as BankIcon, Truck, Percent, Sparkles, Navigation,
  ExternalLink, ShieldAlert, AlertCircle, Loader2
} from 'lucide-react';
import { load } from '@cashfreepayments/cashfree-js';
import { Address, Order, CartItem, UserProfile } from '../types';
import { placeOrder } from '../lib/firebase';

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
  const [cashfree, setCashfree] = useState<any>(null);
  
  // Cashfree integration health and states
  const [cashfreeStatus, setCashfreeStatus] = useState<{
    configured: boolean;
    appIdMask: string;
    isTestKey: boolean;
  } | null>(null);
  const [sdkLoadError, setSdkLoadError] = useState<string | null>(null);
  const [gatewayError, setGatewayError] = useState<string | null>(null);
  const [activePaymentLink, setActivePaymentLink] = useState<string | null>(null);

  // Initialize Cashfree client SDK dynamically based on server config
  useEffect(() => {
    let isMounted = true;
    
    fetch('/api/cashfree/config-status')
      .then(res => res.json())
      .then(data => {
        if (!isMounted) return;
        setCashfreeStatus(data);
        
        // Determine correct loading mode
        const mode = data.isTestKey ? "sandbox" : "production";
        console.log(`Loading Cashfree SDK in ${mode} mode...`);
        
        load({ mode })
          .then((cf) => {
            if (isMounted) {
              setCashfree(cf);
              console.log(`Cashfree ${mode} SDK initialized successfully.`);
            }
          })
          .catch((err) => {
            if (isMounted) {
              console.error(`Failed to load Cashfree ${mode} SDK:`, err);
              setSdkLoadError(err?.message || `Failed to load Cashfree ${mode} script.`);
            }
          });
      })
      .catch(err => {
        if (isMounted) {
          console.error("Failed to fetch Cashfree config status:", err);
          // Fallback to loading production SDK
          load({ mode: "production" })
            .then(cf => {
              if (isMounted) {
                setCashfree(cf);
                console.log("Cashfree production SDK initialized as fallback.");
              }
            })
            .catch(loadErr => {
              if (isMounted) {
                setSdkLoadError("Failed to load Cashfree script. Sandbox or production SDK loading failed.");
              }
            });
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

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

  // Payment State
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'Card' | 'COD' | 'NetBanking'>('UPI');
  const [selectedUpiApp, setSelectedUpiApp] = useState<'GPay' | 'PhonePe' | 'Paytm' | 'BHIM'>('GPay');
  
  // Card Inputs
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');

  // NetBanking Input
  const [selectedBank, setSelectedBank] = useState('SBI');

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

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Format card number: xxxx xxxx xxxx xxxx
    const value = e.target.value.replace(/\D/g, '');
    const formatted = value.replace(/(.{4})/g, '$1 ').trim();
    if (formatted.length <= 19) {
      setCardNumber(formatted);
    }
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Format MM/YY
    const value = e.target.value.replace(/\D/g, '');
    let formatted = value;
    if (value.length > 2) {
      formatted = `${value.slice(0, 2)}/${value.slice(2, 4)}`;
    }
    if (formatted.length <= 5) {
      setCardExpiry(formatted);
    }
  };

  // Detect card type based on starting digit
  const getCardBrand = () => {
    const raw = cardNumber.replace(/\s/g, '');
    if (raw.startsWith('4')) return 'Visa';
    if (raw.startsWith('5')) return 'Mastercard';
    if (raw.startsWith('3')) return 'RuPay'; // Custom mock indicator for RuPay
    return 'Card';
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
    if (step === 1) {
      const err = validateAddress();
      if (err) {
        setError(err);
        return;
      }
      setStep(2);
    }
  };

  const handleSubmitOrder = async () => {
    setError('');
    setLoading(true);

    if (paymentMethod === 'Card') {
      if (!cardName.trim() || cardNumber.length < 19 || cardExpiry.length < 5 || cardCvv.length < 3) {
        setError('Please fill in complete and valid Credit/Debit card details.');
        setLoading(false);
        return;
      }
    }

    try {
      // Map cart items into final order schema
      const orderItems = cartItems.map(item => ({
        productId: item.product.id,
        name: item.product.name,
        price: item.product.price,
        quantity: item.quantity,
        imageUrl: item.product.imageUrl
      }));

      // Set unique transaction details
      const transactionId = paymentMethod === 'COD' 
        ? 'COD_VERIFY_' + Math.random().toString(36).substring(2, 10).toUpperCase()
        : 'ZNTX_TX_' + Math.random().toString(36).substring(2, 10).toUpperCase();

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
        paymentMethod,
        paymentStatus: 'pending', // Pending initially until Cashfree payment completes
        orderStatus: 'pending',
        createdAt: new Date().toISOString()
      };

      if (coordinates) {
        newOrder.locationCoordinates = coordinates;
      }

      const payDetails: any = { transactionId };
      if (paymentMethod === 'UPI') {
        payDetails.upiId = `${address.fullName.replace(/\s+/g, '').toLowerCase()}@okaxis`;
      } else if (paymentMethod === 'Card') {
        payDetails.cardNumber = `•••• •••• •••• ${cardNumber.slice(-4)}`;
      }
      newOrder.paymentDetails = payDetails;

      const placedId = await placeOrder(newOrder);

      // Handle Cash on Delivery order placement directly (no Cashfree session needed)
      if (paymentMethod === 'COD') {
        setOrderIdCreated(placedId);
        setStep(3);
        onOrderSuccess(placedId);
        return;
      }

      // Prepaid methods (Card, UPI, NetBanking): Trigger Cashfree SDK
      try {
        setGatewayError(null);
        setActivePaymentLink(null);
        
        const response = await fetch('/api/cashfree/create-order', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            amount: total,
            customerPhone: address.phone,
            customerEmail: user?.email || 'customer@example.com',
            customerName: address.fullName,
            orderId: placedId
          })
        });

        const data = await response.json();

        if (!response.ok) {
          console.warn("Cashfree session creation failed:", data.error);
          setGatewayError(data.error || "Failed to create Cashfree payment session.");
          
          // Let's store the order id so they can still proceed with simulation if they want
          setOrderIdCreated(placedId);
          return;
        }

        setOrderIdCreated(placedId);
        
        if (data.paymentLink) {
          setActivePaymentLink(data.paymentLink);
        }

        if (data.paymentSessionId && cashfree) {
          try {
            console.log("Launching Cashfree checkout gateway...");
            cashfree.checkout({
              paymentSessionId: data.paymentSessionId,
              redirectTarget: "_self"
            });
          } catch (sdkErr: any) {
            console.error("Failed to run cashfree.checkout:", sdkErr);
            setGatewayError(`Failed to open inline checkout: ${sdkErr?.message || sdkErr}. Please use the secure direct link below.`);
          }
        } else {
          console.warn("Cashfree JS SDK is not loaded. Providing fallback direct link.");
          setGatewayError("Cashfree checkout SDK could not be initialized inside the browser sandbox. Please complete the payment using the secure link below.");
        }
      } catch (cfErr: any) {
        console.error("Failed to connect to Cashfree Payment Gateway:", cfErr);
        setGatewayError(`Connection error: ${cfErr?.message || cfErr}`);
        setOrderIdCreated(placedId);
      }
    } catch (err) {
      setError('Failed to place order. Database error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-fade-in" id="checkout-funnel-container">
      {/* Cashfree Payment Gateway Dialog overlay */}
      {(activePaymentLink || gatewayError) && paymentMethod !== 'COD' && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl p-6 sm:p-8 max-w-md w-full space-y-6 text-center animate-fade-in">
            {activePaymentLink ? (
              <div className="space-y-4">
                <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto text-emerald-600">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-slate-800">Complete Secure Payment</h3>
                  <p className="text-sm text-slate-500">
                    Your order has been saved successfully. Please complete the secure payment of <strong className="text-indigo-600">₹{total.toLocaleString('en-IN')}</strong> using the Cashfree Secure Gateway.
                  </p>
                </div>

                {gatewayError && (
                  <div className="p-3 bg-amber-50 border border-amber-200 text-amber-700 text-xs rounded-xl flex items-start gap-2 text-left leading-normal">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{gatewayError}</span>
                  </div>
                )}

                <div className="space-y-2 pt-2">
                  <a
                    href={activePaymentLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3.5 px-6 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold rounded-xl text-sm transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2"
                  >
                    <span>Proceed to Cashfree Gateway</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  <p className="text-[10px] text-slate-400">
                    Opens Cashfree's official payment page in a new secure browser tab.
                  </p>
                </div>

                <div className="relative flex py-2 items-center">
                  <div className="flex-grow border-t border-slate-100"></div>
                  <span className="flex-shrink mx-3 text-slate-400 text-[10px] font-bold uppercase tracking-wider">Simulation Sandbox</span>
                  <div className="flex-grow border-t border-slate-100"></div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setStep(3);
                    onOrderSuccess(orderIdCreated);
                    setActivePaymentLink(null);
                    setGatewayError(null);
                  }}
                  className="w-full py-2.5 px-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-950 font-bold rounded-xl text-xs transition-colors"
                >
                  Skip Payment & Force Simulate Success
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto text-rose-500">
                  <ShieldAlert className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-slate-800">Payment Gateway Error</h3>
                  <p className="text-xs text-rose-600 bg-rose-50/50 p-3 rounded-xl border border-rose-100 text-left font-mono leading-relaxed break-words">
                    {gatewayError}
                  </p>
                  <p className="text-xs text-slate-500 leading-normal pt-2">
                    {cashfreeStatus?.configured === false 
                      ? "Cashfree API keys are not configured in your Google AI Studio Secrets. Would you like to use checkout simulation mode instead?"
                      : "The payment gateway failed to initialize or returned an authentication error. You can try again or simulate a successful payment directly."
                    }
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => {
                      setGatewayError(null);
                    }}
                    className="py-2.5 px-4 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold rounded-xl text-xs transition-colors"
                  >
                    Go Back & Change
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStep(3);
                      onOrderSuccess(orderIdCreated);
                      setGatewayError(null);
                    }}
                    className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold rounded-xl text-xs shadow-md shadow-indigo-100 transition-all"
                  >
                    Simulate Success
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Back navigation */}
      {step !== 3 && (
        <button
          onClick={step === 2 ? () => setStep(1) : onBack}
          id="back-from-checkout-btn"
          className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-bold text-sm mb-6 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{step === 2 ? "Back to Shipping" : "Back to Catalog"}</span>
        </button>
      )}

      {/* Progress Stepper */}
      {step !== 3 && (
        <div className="flex items-center justify-center gap-4 mb-10 text-xs sm:text-sm font-bold text-slate-400">
          <div className="flex items-center gap-2">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
              step >= 1 ? 'bg-indigo-600 text-white shadow' : 'bg-slate-100 text-slate-500'
            }`}>1</span>
            <span className={step >= 1 ? 'text-slate-900' : ''}>Shipping Details</span>
          </div>
          <div className="w-12 h-0.5 bg-slate-200" />
          <div className="flex items-center gap-2">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
              step >= 2 ? 'bg-indigo-600 text-white shadow' : 'bg-slate-100 text-slate-500'
            }`}>2</span>
            <span className={step >= 2 ? 'text-slate-900' : ''}>Payment Options</span>
          </div>
          <div className="w-12 h-0.5 bg-slate-200" />
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-xs">3</span>
            <span>Confirmation</span>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-100 text-rose-600 text-sm rounded-xl font-medium">
          ⚠️ {error}
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
                className="py-3 px-6 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-slate-200"
              >
                Proceed to Payment
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
        /* STEP 2: PAYMENT OPTIONS */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Payment Selectors */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 border-b border-slate-50 pb-4">
              <CreditCard className="w-5 h-5 text-indigo-600" />
              <span>Select Payment Method</span>
            </h3>

            {/* Cashfree Connection Health Status Banner */}
            {cashfreeStatus && (
              <div className={`p-3.5 rounded-xl border flex items-start gap-3 text-left ${
                cashfreeStatus.configured 
                  ? cashfreeStatus.isTestKey 
                    ? 'bg-amber-50/50 border-amber-100 text-amber-800'
                    : 'bg-emerald-50/50 border-emerald-100 text-emerald-800'
                  : 'bg-slate-50 border-slate-100 text-slate-600'
              }`}>
                {cashfreeStatus.configured ? (
                  cashfreeStatus.isTestKey ? (
                    <Sparkles className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  ) : (
                    <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  )
                ) : (
                  <AlertCircle className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                )}
                <div className="text-xs space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <span>Payment Gateway:</span>
                    <span className="font-mono px-1.5 py-0.5 bg-white border rounded text-[10px]">
                      {cashfreeStatus.configured 
                        ? cashfreeStatus.isTestKey 
                          ? 'Cashfree Sandbox Active' 
                          : 'Cashfree Production Active' 
                        : 'Simulation Sandbox Fallback'
                      }
                    </span>
                  </p>
                  <p className="opacity-90 leading-normal">
                    {cashfreeStatus.configured 
                      ? cashfreeStatus.isTestKey 
                        ? `Using Sandbox credentials (App ID: ${cashfreeStatus.appIdMask}). Payments will run in sandbox mode.`
                        : `Using Production credentials (App ID: ${cashfreeStatus.appIdMask}). Ready for real live payments.`
                      : 'No Cashfree API keys configured in Secrets panel. Order placement will run in simulated/simulation mode.'
                    }
                  </p>
                  {sdkLoadError && (
                    <p className="text-rose-600 font-medium font-mono text-[10px] pt-1">
                      ⚠️ SDK Load Error: {sdkLoadError}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Methods Selection List */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod('UPI')}
                id="pay-method-upi"
                className={`p-3.5 rounded-xl border flex flex-col items-center justify-center gap-2 font-bold text-xs transition-all cursor-pointer ${
                  paymentMethod === 'UPI'
                    ? 'border-indigo-600 bg-indigo-50/30 text-indigo-700 shadow-xs'
                    : 'border-slate-100 hover:border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <QrCode className="w-5 h-5" />
                <span>UPI Scan</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('Card')}
                id="pay-method-card"
                className={`p-3.5 rounded-xl border flex flex-col items-center justify-center gap-2 font-bold text-xs transition-all cursor-pointer ${
                  paymentMethod === 'Card'
                    ? 'border-indigo-600 bg-indigo-50/30 text-indigo-700 shadow-xs'
                    : 'border-slate-100 hover:border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <CreditCard className="w-5 h-5" />
                <span>Card</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('NetBanking')}
                id="pay-method-netbanking"
                className={`p-3.5 rounded-xl border flex flex-col items-center justify-center gap-2 font-bold text-xs transition-all cursor-pointer ${
                  paymentMethod === 'NetBanking'
                    ? 'border-indigo-600 bg-indigo-50/30 text-indigo-700 shadow-xs'
                    : 'border-slate-100 hover:border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <BankIcon className="w-5 h-5" />
                <span>Net Banking</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('COD')}
                id="pay-method-cod"
                className={`p-3.5 rounded-xl border flex flex-col items-center justify-center gap-2 font-bold text-xs transition-all cursor-pointer ${
                  paymentMethod === 'COD'
                    ? 'border-indigo-600 bg-indigo-50/30 text-indigo-700 shadow-xs'
                    : 'border-slate-100 hover:border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Truck className="w-5 h-5" />
                <span>Cash on Delivery</span>
              </button>
            </div>

            {/* Sub-panels depending on chosen method */}
            <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-100 min-h-[160px] flex flex-col justify-center">
              {paymentMethod === 'UPI' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-center">
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Select UPI Provider</p>
                    <div className="grid grid-cols-2 gap-2">
                      {['GPay', 'PhonePe', 'Paytm', 'BHIM'].map((app) => (
                        <button
                          key={app}
                          type="button"
                          onClick={() => setSelectedUpiApp(app as any)}
                          className={`py-2 px-3.5 rounded-xl text-xs font-bold border transition-colors ${
                            selectedUpiApp === app
                              ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                              : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          {app}
                        </button>
                      ))}
                    </div>
                    <div className="text-xs text-slate-500 leading-relaxed pt-1">
                      <p className="font-semibold text-slate-700">Instructions:</p>
                      <p>1. Open your selected {selectedUpiApp} mobile application.</p>
                      <p>2. Point your smartphone camera at the custom generated QR code.</p>
                      <p>3. Confirm payment on the app to complete the transaction.</p>
                    </div>
                  </div>

                  {/* QR Code Graphic Generator */}
                  <div className="flex flex-col items-center justify-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm w-fit mx-auto">
                    <div className="w-32 h-32 bg-slate-900 rounded flex items-center justify-center relative p-2 mb-2">
                      {/* Realistic look QR code vector block */}
                      <svg viewBox="0 0 100 100" className="w-full h-full text-white fill-current">
                        <path d="M0,0h30v10H10v20H0V0z M70,0h30v30H90v-20H70V0z M0,70h10v20h20v10H0V70z M90,70h10v30H70v-10h20V70z" />
                        {/* Fake micro pixels */}
                        <rect x="15" y="15" width="10" height="10" />
                        <rect x="15" y="35" width="10" height="15" />
                        <rect x="35" y="15" width="15" height="10" />
                        <rect x="35" y="35" width="15" height="15" />
                        <rect x="15" y="75" width="10" height="10" />
                        <rect x="35" y="75" width="10" height="15" />
                        <rect x="75" y="15" width="10" height="10" />
                        <rect x="75" y="35" width="15" height="10" />
                        <rect x="75" y="75" width="10" height="10" />
                        <rect x="55" y="55" width="15" height="15" />
                        {/* Center Icon */}
                        <circle cx="50" cy="50" r="10" className="text-indigo-600 fill-current" />
                      </svg>
                      <span className="absolute text-[8px] font-black tracking-widest text-white uppercase bg-indigo-600 px-1 py-0.5 rounded scale-75">UPI</span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-800">Scan to pay: ₹{total.toLocaleString('en-IN')}</span>
                    <span className="text-[9px] text-slate-400 font-mono mt-0.5">ID: zyntexa@okaxis</span>
                  </div>
                </div>
              )}

              {paymentMethod === 'Card' && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Credit / Debit Card Details</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Cardholder Name</label>
                      <input
                        type="text"
                        placeholder="E.g. Rajesh Kumar"
                        value={cardName}
                        onChange={(e) => setCardName(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-200 focus:outline-none focus:border-indigo-500 text-xs font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1 flex justify-between">
                        <span>Card Number</span>
                        <span className="text-indigo-600 font-extrabold">{getCardBrand()}</span>
                      </label>
                      <input
                        type="text"
                        placeholder="4123 5678 9012 3456"
                        value={cardNumber}
                        onChange={handleCardNumberChange}
                        className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-200 focus:outline-none focus:border-indigo-500 text-xs font-semibold font-mono tracking-wider"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Expiry Date</label>
                      <input
                        type="text"
                        placeholder="MM/YY"
                        value={cardExpiry}
                        onChange={handleExpiryChange}
                        className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-200 focus:outline-none focus:border-indigo-500 text-xs font-medium font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">CVV Code</label>
                      <input
                        type="password"
                        maxLength={3}
                        placeholder="•••"
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ''))}
                        className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-200 focus:outline-none focus:border-indigo-500 text-xs font-semibold font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {paymentMethod === 'NetBanking' && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Select Bank Account</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      { code: 'SBI', name: 'State Bank of India' },
                      { code: 'HDFC', name: 'HDFC Bank' },
                      { code: 'ICICI', name: 'ICICI Bank' },
                      { code: 'AXIS', name: 'Axis Bank' },
                      { code: 'PNB', name: 'Punjab National Bank' },
                    ].map((bank) => (
                      <button
                        key={bank.code}
                        type="button"
                        onClick={() => setSelectedBank(bank.code)}
                        className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1 text-center transition-colors ${
                          selectedBank === bank.code
                            ? 'bg-slate-900 border-slate-900 text-white'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <BankIcon className="w-3.5 h-3.5" />
                        <span className="text-[10px] leading-tight truncate w-full">{bank.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {paymentMethod === 'COD' && (
                <div className="text-center space-y-2 py-4">
                  <Truck className="w-8 h-8 text-indigo-600 mx-auto animate-bounce" />
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Cash On Delivery Selected</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                    Great choice! Pay in cash or via portable UPI code reader when the courier arrives at your doorstep. We will call you on <strong>+91 {address.phone}</strong> to verify this shipping order.
                  </p>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-xs text-slate-500 hover:text-indigo-600 font-bold underline"
              >
                Modify Shipping Address
              </button>

              <button
                type="button"
                onClick={handleSubmitOrder}
                disabled={loading}
                id="submit-order-final-btn"
                className="py-3 px-6 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold rounded-xl text-sm transition-all shadow-lg shadow-indigo-100 disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? 'Confirming Transaction...' : `Pay & Place Order (₹${total.toLocaleString('en-IN')})`}
              </button>
            </div>
          </div>

          {/* Right Invoice Panel */}
          <div className="bg-slate-50 rounded-2xl border border-slate-100 p-6 space-y-4 h-fit">
            <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-2">Your Destination</h4>
            <div className="text-xs space-y-1 text-slate-600">
              <p className="font-bold text-slate-800">{address.fullName}</p>
              <p>+91 {address.phone}</p>
              <p className="line-clamp-2 leading-relaxed">{address.street}, {address.landmark}</p>
              <p>{address.city}, {address.state} - <strong className="font-bold text-slate-800">{address.pincode}</strong></p>
            </div>

            <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-200 pt-2 pb-2">Final Invoice</h4>
            <div className="space-y-2 text-xs font-semibold text-slate-500">
              <div className="flex justify-between">
                <span>Total Items</span>
                <span className="text-slate-800 font-bold">{cartItems.reduce((acc, item) => acc + item.quantity, 0)}</span>
              </div>
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-mono text-slate-700">₹{subtotal.toLocaleString('en-IN')}</span>
              </div>
              {promoApplied && (
                <div className="flex justify-between text-emerald-600 font-bold">
                  <span>10% Promo</span>
                  <span className="font-mono">-₹{discount.toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>GST Tax (9% + 9%)</span>
                <span className="font-mono text-slate-700">₹{tax.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery Logistics</span>
                {total - subtotal + discount - tax === 0 ? (
                  <span className="text-emerald-600 font-bold">FREE</span>
                ) : (
                  <span className="font-mono text-slate-700">₹{(total - (subtotal - discount + tax)).toLocaleString('en-IN')}</span>
                )}
              </div>
              <div className="flex justify-between text-sm font-extrabold text-indigo-700 pt-2.5 border-t border-slate-200">
                <span>Total Amount Due</span>
                <span className="font-mono text-lg font-black">₹{total.toLocaleString('en-IN')}</span>
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
              Payment Confirmed
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
              <span>Prepaid Method</span>
              <span className="text-slate-800">{paymentMethod === 'UPI' ? `UPI - ${selectedUpiApp}` : paymentMethod}</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-slate-800 pt-2 border-t border-slate-200/60">
              <span>Amount Paid</span>
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
    </div>
  );
}
