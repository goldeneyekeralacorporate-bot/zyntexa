import React from 'react';
import { X, Mail } from 'lucide-react';
import GmailCommsHub from './GmailCommsHub';
import { UserProfile, Order } from '../types';

interface GmailSupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  orders: Order[];
  onLoginSuccess: (profile: UserProfile) => void;
}

export default function GmailSupportModal({
  isOpen,
  onClose,
  currentUser,
  orders,
  onLoginSuccess
}: GmailSupportModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
        id="gmail-support-modal-container"
      >
        {/* Header bar */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Mail className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-800">Support & Communication</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                Secure 24/7 Customer Concierge
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-xl transition-colors cursor-pointer"
            id="close-gmail-support-modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal body containing the fully fledged communications console */}
        <div className="flex-grow overflow-y-auto p-6 bg-slate-50/30">
          <GmailCommsHub 
            currentUser={currentUser} 
            orders={orders} 
            onLoginSuccess={onLoginSuccess} 
          />
        </div>
      </div>
    </div>
  );
}
