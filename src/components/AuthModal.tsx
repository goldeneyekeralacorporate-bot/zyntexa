import React, { useState, useEffect } from 'react';
import { Mail, Phone, Lock, ChevronRight, X, Sparkles } from 'lucide-react';
import { saveUserProfile } from '../lib/firebase';
import { UserProfile } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (profile: UserProfile) => void;
  userEmail?: string;
}

export default function AuthModal({ isOpen, onClose, onLoginSuccess, userEmail }: AuthModalProps) {
  const [authMethod, setAuthMethod] = useState<'none' | 'gmail' | 'phone'>('none');
  const [emailInput, setEmailInput] = useState(userEmail || 'goldeneyekeralacorporate@gmail.com');
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [otpTimer, setOtpTimer] = useState(60);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (otpSent && otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [otpSent, otpTimer]);

  if (!isOpen) return null;

  const handleGmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!emailInput.includes('@')) {
      setError('Please enter a valid Gmail address');
      return;
    }
    setLoading(true);

    try {
      // Create a user profile using email prefix as uid
      const name = fullName || emailInput.split('@')[0].replace('.', ' ').replace(/\b\w/g, c => c.toUpperCase());
      const mockUid = 'gmail_' + Math.random().toString(36).substring(2, 9);
      const profile: UserProfile = {
        uid: mockUid,
        name: name,
        email: emailInput,
        role: emailInput.toLowerCase().includes('admin') || emailInput === 'goldeneyekeralacorporate@gmail.com' ? 'admin' : 'customer'
      };

      await saveUserProfile(profile);
      onLoginSuccess(profile);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Gmail authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Validate Indian phone number (10 digits)
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(phoneNumber)) {
      setError('Please enter a valid 10-digit Indian mobile number starting with 6-9');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setOtpSent(true);
      setOtpTimer(60);
      setLoading(false);
    }, 800);
  };

  const handleOtpChange = (index: number, value: string) => {
    if (isNaN(Number(value))) return;
    const newOtp = [...otpCode];
    newOtp[index] = value.substring(value.length - 1);
    setOtpCode(newOtp);

    // Auto-focus next field
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpCode[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleVerifyOtp = async () => {
    setError('');
    const fullOtp = otpCode.join('');
    if (fullOtp.length < 6) {
      setError('Please enter the full 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      const mockUid = 'phone_' + phoneNumber;
      const profile: UserProfile = {
        uid: mockUid,
        name: fullName || `User ${phoneNumber.slice(-4)}`,
        phone: `+91 ${phoneNumber}`,
        role: 'customer' // Phone users default to customers, admin can upgrade or use gmail
      };

      await saveUserProfile(profile);
      onLoginSuccess(profile);
      onClose();
    } catch (err: any) {
      setError('OTP verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = () => {
    setOtpTimer(60);
    setOtpCode(['', '', '', '', '', '']);
    setError('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div 
        id="auth-modal"
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="relative p-6 text-center border-b border-slate-100 bg-gradient-to-r from-slate-50 to-indigo-50/20">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            id="close-auth-btn"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="mx-auto w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-100 mb-3">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h3 className="text-xl font-bold text-slate-800">Welcome to Zyntexa</h3>
          <p className="text-xs text-slate-500 mt-1">Premium Indian Shopping Experience</p>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-100 text-rose-600 text-xs rounded-lg font-medium">
              {error}
            </div>
          )}

          {authMethod === 'none' ? (
            <div className="space-y-4">
              <p className="text-center text-sm text-slate-600 mb-6">
                Sign in to customize order history, auto-detect shipping location, and manage your shopping cart securely.
              </p>
              
              <button
                onClick={() => setAuthMethod('gmail')}
                id="select-gmail-btn"
                className="w-full py-3.5 px-4 rounded-xl border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/10 flex items-center justify-between font-medium text-slate-700 transition-all shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-red-500">
                    <Mail className="w-4.5 h-4.5" />
                  </div>
                  <span className="text-sm">Continue with Gmail</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                onClick={() => setAuthMethod('phone')}
                id="select-phone-btn"
                className="w-full py-3.5 px-4 rounded-xl border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/10 flex items-center justify-between font-medium text-slate-700 transition-all shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-500">
                    <Phone className="w-4.5 h-4.5" />
                  </div>
                  <span className="text-sm">Indian Mobile & OTP</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          ) : authMethod === 'gmail' ? (
            <form onSubmit={handleGmailLogin} className="space-y-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">Gmail Login</span>
                <button 
                  type="button" 
                  onClick={() => setAuthMethod('none')}
                  className="text-xs text-slate-500 hover:text-indigo-600 underline"
                >
                  Change method
                </button>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="E.g. Rajesh Kumar"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Gmail Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="yourname@gmail.com"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-sm"
                    required
                  />
                </div>
                {emailInput === 'goldeneyekeralacorporate@gmail.com' && (
                  <p className="text-[10px] text-amber-600 font-medium mt-1">
                    ✨ Note: Logging in with this developer email grants full Admin privileges.
                  </p>
                )}
              </div>

              <button
                type="submit"
                id="gmail-login-submit"
                disabled={loading}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-sm transition-colors mt-2 flex items-center justify-center gap-2 shadow-md shadow-slate-200 disabled:opacity-50"
              >
                {loading ? 'Signing in...' : 'Sign In with Gmail'}
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Mobile Verification</span>
                <button 
                  type="button" 
                  onClick={() => {
                    setAuthMethod('none');
                    setOtpSent(false);
                  }}
                  className="text-xs text-slate-500 hover:text-indigo-600 underline"
                >
                  Change method
                </button>
              </div>

              {!otpSent ? (
                <form onSubmit={handlePhoneSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">Full Name (Optional)</label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="E.g. Priya Sharma"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">Indian Mobile Number</label>
                    <div className="relative">
                      <div className="absolute left-3.5 top-3 text-sm font-medium text-slate-500 flex items-center gap-1">
                        <span>🇮🇳</span>
                        <span>+91</span>
                        <span className="text-slate-300 ml-1">|</span>
                      </div>
                      <input
                        type="tel"
                        maxLength={10}
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                        placeholder="Enter 10-digit number"
                        className="w-full pl-20 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-sm"
                        required
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">E.g., 9876543210 (starts with 6, 7, 8, or 9)</p>
                  </div>

                  <button
                    type="submit"
                    id="phone-login-submit"
                    disabled={loading}
                    className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-sm transition-colors mt-2 flex items-center justify-center gap-2 shadow-md shadow-slate-200 disabled:opacity-50"
                  >
                    {loading ? 'Sending OTP...' : 'Send Verification OTP'}
                  </button>
                </form>
              ) : (
                <div className="space-y-5">
                  <div className="text-center">
                    <p className="text-sm text-slate-600">
                      We've sent a 6-digit OTP to <strong className="text-slate-800">+91 {phoneNumber}</strong>
                    </p>
                    <p className="text-xs text-indigo-600 mt-1 font-medium">✨ Enter 123456 as standard code for quick sign-in!</p>
                  </div>

                  <div className="flex justify-center gap-2">
                    {otpCode.map((digit, index) => (
                      <input
                        key={index}
                        id={`otp-${index}`}
                        type="text"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(index, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(index, e)}
                        className="w-12 h-12 text-center text-lg font-bold text-slate-800 bg-slate-50 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:bg-white transition-all focus:ring-2 focus:ring-indigo-100"
                      />
                    ))}
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    {otpTimer > 0 ? (
                      <span className="text-slate-500">Resend OTP in <strong className="text-slate-700">{otpTimer}s</strong></span>
                    ) : (
                      <button 
                        type="button"
                        onClick={resendOtp}
                        className="text-indigo-600 hover:text-indigo-800 font-semibold"
                      >
                        Resend Code
                      </button>
                    )}
                    <button 
                      type="button"
                      onClick={() => setOtpSent(false)}
                      className="text-slate-500 hover:text-slate-700 underline"
                    >
                      Edit Number
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleVerifyOtp}
                    id="otp-verify-submit"
                    disabled={loading}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-sm transition-colors flex items-center justify-center gap-2 shadow-md shadow-emerald-100 disabled:opacity-50"
                  >
                    {loading ? 'Verifying...' : 'Verify & Sign In'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="bg-slate-50/50 p-4 text-center border-t border-slate-100">
          <p className="text-[10px] text-slate-400">
            By continuing, you agree to Zyntexa's Terms of Service and Privacy Policy. All transactions are securely simulated for sandbox testing.
          </p>
        </div>
      </div>
    </div>
  );
}
