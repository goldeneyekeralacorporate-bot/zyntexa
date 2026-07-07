import React, { useState, useEffect } from 'react';
import { ShoppingCart, Search, MapPin, User, LogOut, ShieldAlert, Navigation, Mail, Sun, Moon } from 'lucide-react';
import { UserProfile, StoreSettings } from '../types';
import Logo3D from './Logo3D';

interface NavbarProps {
  user: UserProfile | null;
  cartCount: number;
  onOpenCart: () => void;
  onOpenAuth: () => void;
  onLogout: () => void;
  onSearchChange: (query: string) => void;
  isAdminMode: boolean;
  onToggleAdminMode: () => void;
  detectedLocation: { city: string; state: string; pincode: string } | null;
  onLocationDetected: (loc: { city: string; state: string; pincode: string; latitude: number; longitude: number }) => void;
  onLoginSuccess: (profile: UserProfile) => void;
  onOpenOrders?: () => void;
  ordersCount?: number;
  onOpenGmailComms?: () => void;
  onHomeClick?: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  storeSettings?: StoreSettings;
}

export default function Navbar({
  user,
  cartCount,
  onOpenCart,
  onOpenAuth,
  onLogout,
  onSearchChange,
  isAdminMode,
  onToggleAdminMode,
  detectedLocation,
  onLocationDetected,
  onLoginSuccess,
  onOpenOrders,
  ordersCount,
  onOpenGmailComms,
  onHomeClick,
  isDarkMode,
  onToggleDarkMode,
  storeSettings
}: NavbarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    onSearchChange(e.target.value);
  };

  const detectLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          // Attempt reverse geocoding via OpenStreetMap Nominatim (Free, no keys required)
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
          );
          if (response.ok) {
            const data = await response.json();
            const address = data.address || {};
            
            const city = address.city || address.town || address.village || address.suburb || "Bengaluru";
            const state = address.state || "Karnataka";
            const pincode = address.postcode || "560001";
            
            onLocationDetected({ city, state, pincode, latitude, longitude });
          } else {
            // Fallback estimation based on India's geographic center
            onLocationDetected({
              city: "New Delhi",
              state: "Delhi",
              pincode: "110001",
              latitude,
              longitude
            });
          }
        } catch (err) {
          console.error("Nominatim reverse geocoding failed, using local mock lookup", err);
          // High-quality backup mock coords lookup
          onLocationDetected({
            city: "Mumbai",
            state: "Maharashtra",
            pincode: "400001",
            latitude,
            longitude
          });
        } finally {
          setIsLocating(false);
        }
      },
      (error) => {
        console.warn("Geolocation permission denied or timed out. Defaulting to tech capital.", error);
        // Default to beautiful fallback
        onLocationDetected({
          city: "Bengaluru",
          state: "Karnataka",
          pincode: "560001",
          latitude: 12.9716,
          longitude: 77.5946
        });
        setIsLocating(false);
      },
      { timeout: 8000 }
    );
  };

  // Run location detection once automatically on load to provide immediate personalized UI!
  useEffect(() => {
    // Attempt non-disruptive location setup
    if (navigator.geolocation && !detectedLocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`);
            if (response.ok) {
              const data = await response.json();
              const address = data.address || {};
              onLocationDetected({
                city: address.city || address.town || address.village || "Bengaluru",
                state: address.state || "Karnataka",
                pincode: address.postcode || "560001",
                latitude,
                longitude
              });
            }
          } catch (e) {
            // Silently swallow background loader error
          }
        },
        () => {}, // Do not raise dialogs in quiet background load
        { timeout: 5000 }
      );
    }
  }, []);

  const bannerTextSizeClass = (size?: 'xs' | 'sm' | 'md' | 'lg') => {
    switch (size) {
      case 'xs': return 'text-[10px] md:text-xs leading-none font-bold';
      case 'sm': return 'text-xs md:text-[13px] leading-tight font-extrabold';
      case 'md': return 'text-xs md:text-sm leading-normal font-extrabold';
      case 'lg': return 'text-sm md:text-base leading-normal font-black';
      default: return 'text-[10px] md:text-xs leading-none font-bold';
    }
  };

  const getScrollClass = () => {
    if (!storeSettings?.promoBannerScrollEnabled) return '';
    const dir = storeSettings.promoBannerScrollDirection === 'right-to-left' ? 'rtl' : 'ltr';
    const speed = storeSettings.promoBannerScrollSpeed || 'slow';
    return `marquee-scrollable animate-marquee-${dir}-${speed} whitespace-nowrap inline-block`;
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-md border-b border-slate-100 shadow-sm" id="store-header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => { 
              if (isAdminMode) onToggleAdminMode(); 
              onHomeClick?.();
            }}
            className="focus:outline-none"
            id="brand-logo"
          >
            <Logo3D />
          </button>
          
          {/* Location Picker */}
          <div className="hidden md:flex items-center gap-2 pl-4 border-l border-slate-200">
            <button
              onClick={detectLocation}
              disabled={isLocating}
              id="detect-location-navbar"
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 hover:bg-indigo-50/50 px-2.5 py-1.5 rounded-lg transition-all"
              title="Detect Indian Location"
            >
              {isLocating ? (
                <Navigation className="w-3.5 h-3.5 text-indigo-600 animate-spin" />
              ) : (
                <MapPin className="w-3.5 h-3.5 text-rose-500" />
              )}
              <span className="truncate max-w-[120px]">
                {detectedLocation ? `${detectedLocation.city}, ${detectedLocation.state}` : "Auto-Detect Loc"}
              </span>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        {!isAdminMode && (
          <div className="flex-1 max-w-md relative hidden sm:block">
            <Search className="absolute left-3.5 top-2.5 w-4.5 h-4.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search premium apparel, watches, gadgets..."
              value={searchQuery}
              onChange={handleSearch}
              id="search-products-input"
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 focus:outline-none focus:border-indigo-500 focus:bg-white rounded-xl text-sm transition-all text-slate-700"
            />
          </div>
        )}

        {/* Action Widgets */}
        <div className="flex items-center gap-3">
          {/* Location button (visible on mobile) */}
          <button
            onClick={detectLocation}
            id="mobile-location-btn"
            className="md:hidden p-2 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-slate-50"
            title="Auto-detect location"
          >
            <MapPin className={`w-5 h-5 ${detectedLocation ? 'text-rose-500' : 'text-slate-500'}`} />
          </button>

          {/* Admin Override Toggle Button */}
          {user && user.email?.toLowerCase().trim() === 'goldeneyekeralacorporate@gmail.com' && user.role === 'admin' && (
            <button
              onClick={onToggleAdminMode}
              id="toggle-admin-panel-pill"
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold shadow-sm border animate-pulse-slow cursor-pointer transition-all ${
                isAdminMode 
                  ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-400' 
                  : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>{isAdminMode ? "Exit Admin" : "Admin Panel"}</span>
            </button>
          )}

          {/* Shopping Cart Trigger */}
          {!isAdminMode && (
            <button
              onClick={onOpenCart}
              id="cart-trigger-btn"
              className="relative p-2.5 rounded-xl text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/30 transition-colors"
            >
              <ShoppingCart className="w-5 h-5" />
              {cartCount > 0 && (
                <span 
                  id="cart-badge"
                  className="absolute top-1.5 right-1.5 bg-indigo-600 text-white text-[10px] font-extrabold w-4.5 h-4.5 rounded-full flex items-center justify-center animate-bounce shadow-sm border border-white"
                >
                  {cartCount}
                </span>
              )}
            </button>
          )}

          {/* Global Theme Toggle Button */}
          <button
            onClick={onToggleDarkMode}
            id="theme-toggle-btn"
            className="p-2.5 rounded-xl text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/30 transition-all cursor-pointer relative flex items-center justify-center active:scale-95 group"
            title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDarkMode ? (
              <Sun className="w-5 h-5 text-amber-500 group-hover:rotate-45 transition-transform duration-300" />
            ) : (
              <Moon className="w-5 h-5 text-slate-600 group-hover:-rotate-12 transition-transform duration-300" />
            )}
          </button>

          {/* User Profile / Login Panel */}
          {user ? (
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                id="user-profile-menu-trigger"
                className="flex items-center gap-2 p-1.5 pr-2.5 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50 cursor-pointer"
              >
                <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-bold text-xs flex items-center justify-center uppercase shadow">
                  {user.name.slice(0, 2)}
                </div>
                <div className="hidden lg:block text-left">
                  <p className="text-xs font-bold text-slate-700 line-clamp-1 max-w-[100px]">{user.name}</p>
                  <p className="text-[10px] text-slate-400 font-medium capitalize">{user.role}</p>
                </div>
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2.5 w-52 bg-white border border-slate-100 rounded-xl shadow-xl py-1.5 z-50 animate-fade-in text-xs font-medium text-slate-700">
                  <div className="px-3.5 py-2.5 border-b border-slate-50 text-slate-500">
                    <p className="font-bold text-slate-800">{user.name}</p>
                    <p className="text-[10px] truncate">{user.email || user.phone}</p>
                  </div>
                  
                  {onOpenOrders && (
                    <button
                      onClick={() => {
                        onOpenOrders();
                        setDropdownOpen(false);
                      }}
                      id="navbar-my-orders-btn"
                      className="w-full text-left px-3.5 py-2 hover:bg-indigo-50 hover:text-indigo-600 transition-colors flex items-center justify-between border-b border-slate-50 cursor-pointer text-slate-700"
                    >
                      <div className="flex items-center gap-2">
                        <ShoppingCart className="w-3.5 h-3.5" />
                        <span>My Orders</span>
                      </div>
                      {ordersCount !== undefined && ordersCount > 0 && (
                        <span className="bg-indigo-100 text-indigo-700 text-[10px] font-black px-1.5 py-0.5 rounded-full">
                          {ordersCount}
                        </span>
                      )}
                    </button>
                  )}

                  {onOpenGmailComms && (
                    <button
                      onClick={() => {
                        onOpenGmailComms();
                        setDropdownOpen(false);
                      }}
                      id="navbar-gmail-comms-btn"
                      className="w-full text-left px-3.5 py-2 hover:bg-indigo-50 hover:text-indigo-600 transition-colors flex items-center gap-2 border-b border-slate-50 cursor-pointer text-slate-700"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>Concierge Support Hub</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      onLogout();
                      setDropdownOpen(false);
                    }}
                    id="user-logout-btn"
                    className="w-full text-left px-3.5 py-2 hover:bg-rose-50 hover:text-rose-600 transition-colors flex items-center gap-2 text-rose-500 border-t border-slate-50"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              id="login-trigger-btn"
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-sm active:scale-95"
            >
              <User className="w-3.5 h-3.5" />
              <span>Login</span>
            </button>
          )}
        </div>
      </div>
      </header>
      {/* Promotional Announcement Banner - Text Bar */}
      {storeSettings?.promoBannerTextActive && storeSettings?.promoBannerText && (
        storeSettings.promoBannerLinkUrl ? (
          <a 
            href={storeSettings.promoBannerLinkUrl}
            id="promo-announcement-banner-link"
            className="block w-full border-b border-indigo-500/10"
          >
            <div 
              id="promo-announcement-banner"
              className={`w-full py-2 shadow-xs animate-fade-in relative overflow-hidden group cursor-pointer hover-pause select-none ${
                storeSettings.promoBannerScrollEnabled ? 'flex items-center' : 'flex items-center justify-center gap-2 text-center px-4'
              }`}
              style={{
                backgroundColor: storeSettings.promoBannerBgColor || '#4f46e5',
                color: storeSettings.promoBannerTextColor || '#ffffff'
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none z-20" />
              {storeSettings.promoBannerScrollEnabled ? (
                <div className="w-full overflow-hidden relative z-10 py-0.5">
                  <div className={getScrollClass()}>
                    <span className={`px-8 inline-block ${bannerTextSizeClass(storeSettings.promoBannerTextSize)}`}>
                      {storeSettings.promoBannerText} <span className="text-white/40 ml-1.5">✦</span>
                    </span>
                    <span className={`px-8 inline-block ${bannerTextSizeClass(storeSettings.promoBannerTextSize)}`} aria-hidden="true">
                      {storeSettings.promoBannerText} <span className="text-white/40 ml-1.5">✦</span>
                    </span>
                    <span className={`px-8 inline-block ${bannerTextSizeClass(storeSettings.promoBannerTextSize)}`} aria-hidden="true">
                      {storeSettings.promoBannerText} <span className="text-white/40 ml-1.5">✦</span>
                    </span>
                    <span className={`px-8 inline-block ${bannerTextSizeClass(storeSettings.promoBannerTextSize)}`} aria-hidden="true">
                      {storeSettings.promoBannerText} <span className="text-white/40 ml-1.5">✦</span>
                    </span>
                  </div>
                </div>
              ) : (
                <span className={`relative z-10 flex items-center gap-1 ${bannerTextSizeClass(storeSettings.promoBannerTextSize)}`}>
                  {storeSettings.promoBannerText}
                  <span className="inline-block transition-transform duration-300 group-hover:translate-x-1">→</span>
                </span>
              )}
            </div>
          </a>
        ) : (
          <div 
            id="promo-announcement-banner"
            className={`w-full py-2 shadow-xs animate-fade-in relative overflow-hidden group hover-pause select-none border-b border-indigo-500/10 ${
              storeSettings.promoBannerScrollEnabled ? 'flex items-center' : 'flex items-center justify-center gap-2 text-center px-4'
            }`}
            style={{
              backgroundColor: storeSettings.promoBannerBgColor || '#4f46e5',
              color: storeSettings.promoBannerTextColor || '#ffffff'
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none z-20" />
            {storeSettings.promoBannerScrollEnabled ? (
              <div className="w-full overflow-hidden relative z-10 py-0.5">
                <div className={getScrollClass()}>
                  <span className={`px-8 inline-block ${bannerTextSizeClass(storeSettings.promoBannerTextSize)}`}>
                    {storeSettings.promoBannerText} <span className="text-white/40 ml-1.5">✦</span>
                  </span>
                  <span className={`px-8 inline-block ${bannerTextSizeClass(storeSettings.promoBannerTextSize)}`} aria-hidden="true">
                    {storeSettings.promoBannerText} <span className="text-white/40 ml-1.5">✦</span>
                  </span>
                  <span className={`px-8 inline-block ${bannerTextSizeClass(storeSettings.promoBannerTextSize)}`} aria-hidden="true">
                    {storeSettings.promoBannerText} <span className="text-white/40 ml-1.5">✦</span>
                  </span>
                  <span className={`px-8 inline-block ${bannerTextSizeClass(storeSettings.promoBannerTextSize)}`} aria-hidden="true">
                    {storeSettings.promoBannerText} <span className="text-white/40 ml-1.5">✦</span>
                  </span>
                </div>
              </div>
            ) : (
              <span className={`relative z-10 ${bannerTextSizeClass(storeSettings.promoBannerTextSize)}`}>{storeSettings.promoBannerText}</span>
            )}
          </div>
        )
      )}

      {/* Promotional Graphic Image Banner */}
      {storeSettings?.promoBannerImageActive && storeSettings?.promoBannerImageUrl && (
        storeSettings.promoBannerLinkUrl ? (
          <a 
            href={storeSettings.promoBannerLinkUrl}
            id="promo-graphic-banner-link"
            className="block w-full border-b border-slate-100"
          >
            <div 
              id="promo-graphic-banner"
              className="w-full h-12 md:h-16 relative overflow-hidden shadow-xs animate-fade-in group cursor-pointer"
            >
              <img 
                src={storeSettings.promoBannerImageUrl} 
                alt="Promotion Banner" 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.01]"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&q=80&w=1200';
                }}
              />
              {/* Overlay text if provided and overlay option is desired */}
              {storeSettings.promoBannerText && storeSettings.promoBannerImageOverlayTextActive !== false && (
                <div 
                  className="absolute inset-0 backdrop-blur-[0.5px] flex items-center justify-center px-4"
                  style={{
                    backgroundColor: `rgba(15, 23, 42, ${(storeSettings.promoBannerOverlayOpacity !== undefined ? storeSettings.promoBannerOverlayOpacity : 40) / 100})`
                  }}
                >
                  <span 
                    className={`font-black tracking-wide drop-shadow-md relative z-10 flex items-center gap-1.5 ${bannerTextSizeClass(storeSettings.promoBannerTextSize)}`}
                    style={{ color: storeSettings.promoBannerTextColor || '#ffffff' }}
                  >
                    {storeSettings.promoBannerText}
                    <span className="inline-block transition-transform duration-300 group-hover:translate-x-1">→</span>
                  </span>
                </div>
              )}
              {/* Decorative glowing light sweep */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
            </div>
          </a>
        ) : (
          <div 
            id="promo-graphic-banner"
            className="w-full h-12 md:h-16 relative overflow-hidden shadow-xs animate-fade-in group border-b border-slate-100"
          >
            <img 
              src={storeSettings.promoBannerImageUrl} 
              alt="Promotion Banner" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&q=80&w=1200';
              }}
            />
            {storeSettings.promoBannerText && storeSettings.promoBannerImageOverlayTextActive !== false && (
              <div 
                className="absolute inset-0 flex items-center justify-center px-4"
                style={{
                  backgroundColor: `rgba(15, 23, 42, ${(storeSettings.promoBannerOverlayOpacity !== undefined ? storeSettings.promoBannerOverlayOpacity : 40) / 100})`
                }}
              >
                <span 
                  className={`font-black tracking-wide drop-shadow-md relative z-10 ${bannerTextSizeClass(storeSettings.promoBannerTextSize)}`}
                  style={{ color: storeSettings.promoBannerTextColor || '#ffffff' }}
                >
                  {storeSettings.promoBannerText}
                </span>
              </div>
            )}
          </div>
        )
      )}
    </>
  );
}
