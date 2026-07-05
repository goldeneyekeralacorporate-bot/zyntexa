import React, { useState, useEffect, useRef } from 'react';
import { 
  seedProductsIfEmpty, 
  fetchProducts, 
  addProduct, 
  updateProductField, 
  deleteProduct, 
  fetchAllOrders, 
  updateOrderStatus,
  subscribeProducts,
  subscribeOrders
} from './lib/firebase';
import { Product, Order, UserProfile, CartItem } from './types';
import Navbar from './components/Navbar';
import ProductCard from './components/ProductCard';
import CartDrawer from './components/CartDrawer';
import AuthModal from './components/AuthModal';
import CheckoutPage from './components/CheckoutPage';
import AdminPanel from './components/AdminPanel';
import GeminiAgent from './components/GeminiAgent';
import { 
  Sparkles, ShieldCheck, Heart, Truck, RefreshCw, ShoppingBag, 
  TrendingUp, CreditCard, ExternalLink, HelpCircle 
} from 'lucide-react';

const CATEGORIES = ['All', 'Apparel', 'Watches', 'Electronics', 'Accessories', 'Home & Decor', 'Footwear'];

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  
  // Navigation & UI States
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [isCheckoutActive, setIsCheckoutActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  // Pricing states captured at checkout transition
  const [checkoutTotals, setCheckoutTotals] = useState({
    subtotal: 0,
    discount: 0,
    tax: 0,
    total: 0,
    promoApplied: ''
  });

  // Location State
  const [detectedLocation, setDetectedLocation] = useState<{ city: string; state: string; pincode: string; latitude?: number; longitude?: number } | null>(null);
  
  const [loading, setLoading] = useState(true);

  // WebSocket Integration for real-time presence and network-wide event broadcasts
  const [wsConnected, setWsConnected] = useState(false);
  const [activeUserCount, setActiveUserCount] = useState(1);
  const [liveNotifications, setLiveNotifications] = useState<{ id: string; message: string; type: 'order' | 'product' | 'system' | 'presence' }[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  const addNotification = (message: string, type: 'order' | 'product' | 'system' | 'presence') => {
    const id = `notif_${Date.now()}_${Math.random()}`;
    setLiveNotifications((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setLiveNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 4500);
  };

  const broadcastWsEvent = (type: string, payload: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "BROADCAST",
        payload: { type, ...payload }
      }));
    }
  };

  useEffect(() => {
    let socket: WebSocket;
    let reconnectTimeout: any;

    function connect() {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      console.log("Connecting to Zyntexa Live WebSocket:", wsUrl);

      socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        console.log("Zyntexa Live WebSocket Connected");
        setWsConnected(true);
        addNotification("Connected to Zyntexa Live Network!", "system");
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("WebSocket client received:", data);

          if (data.type === "WELCOME") {
            console.log(data.message);
          } else if (data.type === "PRESENCE_CHANGE") {
            setActiveUserCount(data.count);
          } else if (data.type === "ORDER_PLACED") {
            addNotification(`📦 New order placed for ₹${data.total}!`, "order");
          } else if (data.type === "PRODUCT_UPDATED") {
            addNotification(`🏷️ Product "${data.name}" has been updated!`, "product");
          } else if (data.type === "ORDER_STATUS_CHANGED") {
            addNotification(`🚚 Order #${data.orderId.slice(0, 6)}... status changed to "${data.status}"`, "order");
          } else {
            if (data.message) {
              addNotification(data.message, "system");
            }
          }
        } catch (e) {
          console.error("Failed to parse WebSocket message:", e);
        }
      };

      socket.onclose = () => {
        console.log("Zyntexa Live WebSocket Disconnected");
        setWsConnected(false);
        reconnectTimeout = setTimeout(() => {
          connect();
        }, 5000);
      };

      socket.onerror = (err) => {
        console.log("WebSocket client connection state changed or disconnected:", err);
        socket.close();
      };
    }

    connect();

    return () => {
      if (socket) {
        socket.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, []);

  // Handle Cashfree payment return verification on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderIdParam = params.get('order_id');
    if (orderIdParam) {
      // Remove query parameters from URL to keep address bar clean
      window.history.replaceState({}, document.title, window.location.pathname);
      
      addNotification(`⌛ Verifying payment with Cashfree...`, "system");

      fetch(`/api/cashfree/verify-order/${orderIdParam}`)
        .then(res => res.json())
        .then(async (data) => {
          if (data.orderStatus === 'PAID') {
            addNotification(`✅ Cashfree Payment Verified! Order ${orderIdParam.substring(0, 8)}... confirmed.`, "order");
            setCart([]);
            await updateOrderStatus(orderIdParam, 'pending', 'confirmed');
            broadcastWsEvent("ORDER_PLACED", { total: checkoutTotals.total || 0 });
          } else {
            addNotification(`⚠️ Cashfree Order state: ${data.orderStatus || 'Unknown'}.`, "system");
          }
        })
        .catch(err => {
          console.error("Error verifying Cashfree order:", err);
          addNotification(`❌ Error verifying Cashfree payment.`, "system");
        });
    }
  }, [checkoutTotals.total]);

  // Sync products on mount with real-time listener (and seed database if empty)
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    async function initStore() {
      try {
        setLoading(true);
        await seedProductsIfEmpty();
        // Setup real-time listener
        unsubscribe = subscribeProducts(
          (liveProducts) => {
            setProducts(liveProducts);
            setLoading(false);
          },
          (err) => {
            console.error("Real-time products subscription failed:", err);
            setLoading(false);
          }
        );
      } catch (err) {
        console.error("Failed to initialize store products:", err);
        setLoading(false);
      }
    }
    initStore();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Sync orders with real-time listener when user is admin or when entering Admin mode
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    if (user?.role === 'admin' || isAdminMode) {
      unsubscribe = subscribeOrders(
        (liveOrders) => {
          setOrders(liveOrders);
        },
        (err) => {
          console.error("Real-time orders subscription failed:", err);
        }
      );
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user, isAdminMode]);

  // Synchronize products/orders manually as fallback
  const handleRefreshData = async () => {
    try {
      const liveProds = await fetchProducts();
      setProducts(liveProds);
      if (user?.role === 'admin' || isAdminMode) {
        const liveOrders = await fetchAllOrders();
        setOrders(liveOrders);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleLoginSuccess = (profile: UserProfile) => {
    setUser(profile);
    // If the profile is developer email, grant instant admin
    if (profile.role === 'admin') {
      setIsAdminMode(true);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setIsAdminMode(false);
    setIsCheckoutActive(false);
  };

  // Cart operations
  const handleAddToCart = (product: Product) => {
    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.product.id === product.id);
      if (existing) {
        // Enforce maximum stock bounds
        const newQty = Math.min(existing.quantity + 1, product.stock);
        return prevCart.map((item) =>
          item.product.id === product.id ? { ...item, quantity: newQty } : item
        );
      }
      return [...prevCart, { product, quantity: 1 }];
    });
  };

  const handleUpdateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveCartItem(productId);
      return;
    }
    setCart((prevCart) =>
      prevCart.map((item) =>
        item.product.id === productId ? { ...item, quantity: Math.min(quantity, item.product.stock) } : item
      )
    );
  };

  const handleRemoveCartItem = (productId: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.product.id !== productId));
  };

  const handleProceedToCheckout = (subtotal: number, discount: number, tax: number, total: number, promo: string) => {
    if (!user) {
      // Prompt user to sign-in first
      setIsCartOpen(false);
      setIsAuthOpen(true);
      return;
    }
    setCheckoutTotals({ subtotal, discount, tax, total, promoApplied: promo });
    setIsCartOpen(false);
    setIsCheckoutActive(true);
  };

  const handleOrderSuccess = async (orderId: string) => {
    // Clear cart upon successful checkout placement
    setCart([]);
    setIsCheckoutActive(false);
    // Broadcast checkout placement
    broadcastWsEvent("ORDER_PLACED", { total: checkoutTotals.total });
    // Refresh products catalog and orders lists
    await handleRefreshData();
  };

  // Admin database modification operations
  const handleAdminAddProduct = async (prod: Omit<Product, 'id'>) => {
    const fresh = await addProduct(prod);
    setProducts((prev) => [fresh, ...prev]);
    broadcastWsEvent("PRODUCT_UPDATED", { name: prod.name, field: "all" });
  };

  const handleAdminUpdatePrice = async (productId: string, newPrice: number) => {
    await updateProductField(productId, { price: newPrice });
    const prod = products.find((p) => p.id === productId);
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, price: newPrice } : p))
    );
    broadcastWsEvent("PRODUCT_UPDATED", { name: prod?.name || "Product", field: "price" });
  };

  const handleAdminUpdateProduct = async (productId: string, updates: Partial<Product>) => {
    await updateProductField(productId, updates);
    const prod = products.find((p) => p.id === productId);
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, ...updates } : p))
    );
    broadcastWsEvent("PRODUCT_UPDATED", { name: updates.name || prod?.name || "Product", field: Object.keys(updates).join(", ") });
  };

  const handleAdminDeleteProduct = async (productId: string) => {
    const prod = products.find((p) => p.id === productId);
    await deleteProduct(productId);
    setProducts((prev) => prev.filter((p) => p.id !== productId));
    broadcastWsEvent("PRODUCT_UPDATED", { name: prod?.name || "Product", field: "deletion" });
  };

  const handleAdminUpdateOrderStatus = async (
    orderId: string,
    status: Order['orderStatus'],
    paymentStatus?: Order['paymentStatus']
  ) => {
    await updateOrderStatus(orderId, status, paymentStatus);
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id === orderId) {
          const updated = { ...o, orderStatus: status };
          if (paymentStatus) {
            updated.paymentStatus = paymentStatus;
          }
          return updated;
        }
        return o;
      })
    );
    broadcastWsEvent("ORDER_STATUS_CHANGED", { orderId, status });
  };

  // Filter products by category & search query
  const filteredProducts = products.filter((p) => {
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col font-sans" id="zyntexa-app">
      {/* Navbar Navigation */}
      <Navbar
        user={user}
        cartCount={cart.reduce((acc, item) => acc + item.quantity, 0)}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
        onLogout={handleLogout}
        onSearchChange={setSearchQuery}
        isAdminMode={isAdminMode}
        onToggleAdminMode={() => setIsAdminMode(!isAdminMode)}
        detectedLocation={detectedLocation}
        onLocationDetected={(loc) => setDetectedLocation(loc)}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* Main Content Area */}
      <main className="flex-grow">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-3">
            <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Syncing with Firestore...</p>
          </div>
        ) : isAdminMode ? (
          /* ADMIN PANEL PORTAL */
          <AdminPanel
            products={products}
            orders={orders}
            onAddProduct={handleAdminAddProduct}
            onUpdatePrice={handleAdminUpdatePrice}
            onUpdateProduct={handleAdminUpdateProduct}
            onDeleteProduct={handleAdminDeleteProduct}
            onUpdateOrderStatus={handleAdminUpdateOrderStatus}
          />
        ) : isCheckoutActive ? (
          /* CHECKOUT FUNNEL STREAM */
          <CheckoutPage
            user={user}
            cartItems={cart}
            subtotal={checkoutTotals.subtotal}
            discount={checkoutTotals.discount}
            tax={checkoutTotals.tax}
            total={checkoutTotals.total}
            promoApplied={checkoutTotals.promoApplied}
            detectedLocation={detectedLocation}
            onBack={() => setIsCheckoutActive(false)}
            onOrderSuccess={handleOrderSuccess}
          />
        ) : (
          /* CUSTOMER CATALOG SHOPPING VIEW */
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in" id="catalog-shop-container">
            {/* Elegant Hero Banner */}
            <div className="relative bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-800 p-8 sm:p-12 flex flex-col justify-center min-h-[280px]">
              {/* Absolutes decorative blobs */}
              <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl -mr-20 -mt-20" />
              <div className="absolute bottom-0 left-0 w-60 h-60 bg-indigo-500/5 rounded-full blur-3xl -ml-20 -mb-20" />

              <div className="relative z-10 max-w-lg space-y-4">
                <span className="text-[10px] font-bold tracking-widest text-indigo-400 uppercase bg-indigo-950 border border-indigo-900/50 px-2.5 py-1 rounded-full w-fit">
                  Spring / Summer Collection
                </span>
                <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-none font-sans">
                  Redefining Luxury & Comfort
                </h1>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
                  Experience handcrafted premium designs. Automatically syncing to all India destinations with responsive local courier geotag dispatch systems.
                </p>
                
                {/* Geotag Indicator Banner in Hero */}
                {detectedLocation ? (
                  <p className="text-[10px] text-emerald-400 font-bold bg-emerald-950/40 border border-emerald-900/20 py-1.5 px-3 rounded-xl w-fit flex items-center gap-1.5 animate-pulse-slow">
                    <span>📍 Shipping live to {detectedLocation.city}, {detectedLocation.state} ({detectedLocation.pincode})</span>
                  </p>
                ) : (
                  <p className="text-[10px] text-slate-400 font-bold bg-slate-800/40 py-1.5 px-3 rounded-xl w-fit flex items-center gap-1.5">
                    <span>📍 Live coverage: Deliveries available across all Indian PIN codes</span>
                  </p>
                )}
              </div>
            </div>

            {/* Quick Benefits Cards bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-bold text-slate-600">
              <div className="bg-white border border-slate-100 p-4 rounded-xl shadow-xs flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 flex-shrink-0">
                  <Truck className="w-4.5 h-4.5" />
                </div>
                <div>
                  <p className="text-slate-800">Free All-India Delivery</p>
                  <p className="text-[10px] text-slate-400 font-medium">On orders above ₹4,999</p>
                </div>
              </div>

              <div className="bg-white border border-slate-100 p-4 rounded-xl shadow-xs flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 flex-shrink-0">
                  <Sparkles className="w-4.5 h-4.5" />
                </div>
                <div>
                  <p className="text-slate-800">Live Dynamic Price Sync</p>
                  <p className="text-[10px] text-slate-400 font-medium">Any changes made by admin apply instantly</p>
                </div>
              </div>
            </div>

            {/* Category selection and Live data refreshes */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-t border-slate-100 pt-6">
              {/* Category Chips scroll container */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none max-w-full">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                      selectedCategory === cat
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
                        : 'bg-white border border-slate-100 text-slate-500 hover:text-slate-800 hover:border-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Quick Sync manual refresh button */}
              <button
                onClick={handleRefreshData}
                id="manual-refresh-data-btn"
                className="flex items-center justify-center gap-1.5 self-start md:self-auto py-2 px-3 bg-white border border-slate-200 hover:border-indigo-600 hover:text-indigo-600 rounded-xl text-xs font-bold text-slate-600 cursor-pointer transition-colors"
                title="Sync catalog changes from Firestore"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Sync Database</span>
              </button>
            </div>

            {/* Grid display products */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6" id="products-catalog-grid">
              {filteredProducts.length === 0 ? (
                <div className="col-span-full py-16 text-center space-y-3">
                  <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto animate-bounce" />
                  <p className="text-sm font-bold text-slate-600">No premium items match your filter criteria.</p>
                  <button
                    onClick={() => { setSelectedCategory('All'); setSearchQuery(''); }}
                    className="text-xs font-semibold text-indigo-600 hover:underline cursor-pointer"
                  >
                    Clear Search Filters
                  </button>
                </div>
              ) : (
                filteredProducts.map((p) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    isAdmin={user?.role === 'admin'}
                    onAddToCart={handleAddToCart}
                    onUpdatePrice={handleAdminUpdatePrice}
                  />
                ))
              )}
            </div>
          </div>
        )}
      </main>

      {/* Universal Side Panels Drawers */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cart}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveCartItem}
        onProceedToCheckout={handleProceedToCheckout}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        userEmail="goldeneyekeralacorporate@gmail.com"
      />

      {/* Intelligent Gemini Real-Time Google Search Agent & Catalog Modder */}
      <GeminiAgent
        products={products}
        isAdmin={isAdminMode || user?.role === 'admin'}
        onUpdateProduct={handleAdminUpdateProduct}
      />

      {/* Elegant minimalist Footer */}
      <footer className="bg-slate-900 text-slate-400 text-xs font-medium border-t border-slate-800" id="main-footer">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
            <div className="space-y-1">
              <span className="text-sm font-extrabold text-white">Zyntexa Store</span>
              <p className="text-[10px] text-slate-500 max-w-sm">
                Elegant real-time Indian retail application combining premium visual catalogs with background Firebase database integrations.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-[10px] text-slate-500">
            <p>© {new Date().getFullYear()} Zyntexa Ltd. All India shipping services simulated. Powered by DeepMind.</p>
            <div className="flex items-center gap-4">
              <span>Developer Workspace</span>
              <span>•</span>
              <span>Firestore Active</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Toast Notifications System */}
      <div className="fixed top-24 right-6 z-50 pointer-events-none flex flex-col gap-3 max-w-sm w-full font-sans" id="toast-notifications-system">
        {liveNotifications.map((n) => (
          <div
            key={n.id}
            className="pointer-events-auto bg-slate-900 text-white border-l-4 border-indigo-500 rounded-xl p-4 shadow-2xl flex items-start gap-3 transition-all duration-300 transform translate-x-0 animate-slide-in"
            style={{
              borderLeftColor: n.type === 'order' ? '#10b981' : n.type === 'product' ? '#6366f1' : '#f59e0b'
            }}
          >
            <div className="flex-grow">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                Live Broadcast • {n.type}
              </p>
              <p className="text-xs font-bold mt-1 text-slate-100">{n.message}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
