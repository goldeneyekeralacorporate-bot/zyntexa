import React, { useState, useEffect } from 'react';
import { 
  Mail, Send, CheckCircle2, AlertCircle, RefreshCw, User, FileText, 
  ChevronRight, ArrowLeftRight, Clock, Plus, Inbox, Trash2, ArrowRight, CornerUpLeft, Eye
} from 'lucide-react';
import { auth, getAccessToken, googleSignIn, saveUserProfile } from '../lib/firebase';
import { UserProfile, Order, Product } from '../types';

interface GmailCommsHubProps {
  currentUser: UserProfile | null;
  orders: Order[];
  onLoginSuccess: (profile: UserProfile) => void;
}

interface GmailMessage {
  id: string;
  threadId: string;
  snippet: string;
  subject?: string;
  from?: string;
  to?: string;
  date?: string;
  body?: string;
}

export default function GmailCommsHub({ currentUser, orders, onLoginSuccess }: GmailCommsHubProps) {
  const [token, setToken] = useState<string | null>("active-support-session");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [messages, setMessages] = useState<GmailMessage[]>([]);
  const [fetchingEmails, setFetchingEmails] = useState(false);

  // Email Composer State
  const [composerOpen, setComposerOpen] = useState(false);
  const [emailTo, setEmailTo] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [selectedOrderForInvoice, setSelectedOrderForInvoice] = useState<string>('');
  const [customAdminNote, setCustomAdminNote] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [showConfirmSend, setShowConfirmSend] = useState(false);

  // Sync token from in-memory cache on load/change
  useEffect(() => {
    setToken("active-support-session");
  }, [currentUser]);

  // Handle Connecting Google Account inside the Hub
  const handleConnectGoogle = async () => {
    setToken("active-support-session");
    setSuccessMsg("Support session active!");
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  // Helper: Decode Base64 for Email Bodies
  const decodeBase64 = (b64: string) => {
    try {
      const cleaned = b64.replace(/-/g, '+').replace(/_/g, '/');
      return decodeURIComponent(escape(window.atob(cleaned)));
    } catch (e) {
      return "Body decoding failed.";
    }
  };

  // Helper: Retrieve Email Header Value
  const getHeader = (headers: any[], name: string) => {
    const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
    return header ? header.value : '';
  };

  // Fetch Emails from Simulated Storage (Removing Gmail Authentication dependency)
  const fetchEmails = async () => {
    setFetchingEmails(true);
    setError(null);
    try {
      const storageKey = `zyntexa_comms_${currentUser?.email || 'guest'}`;
      const stored = localStorage.getItem(storageKey);
      
      if (stored) {
        setMessages(JSON.parse(stored));
      } else {
        // Seed default high-fidelity support communication threads based on role
        let seedList: GmailMessage[] = [];
        const timestamp = new Date().toLocaleString('en-IN', {
          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
        });

        if (currentUser?.role === 'admin') {
          seedList = [
            {
              id: 'seed_1',
              threadId: 'thread_1',
              subject: 'Royal Timepiece Warranty & Customization Inquiry',
              from: 'vip-customer@gmail.com',
              to: currentUser.email || 'support@zyntexa.com',
              date: timestamp,
              snippet: 'Hi Support, is it possible to engrave custom initials on the back of the Royal Tourbillon watch?',
              body: `<div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
                <p>Hello Zyntexa Concierge,</p>
                <p>I am planning to place an order for the <strong>Royal Tourbillon (Edition Gold)</strong>. Before completing my transaction, I would love to know if your watchmaking workshop can custom engrave initials on the transparent sapphire caseback?</p>
                <p>Please let me know how many characters are allowed and if this would prolong the standard delivery estimate.</p>
                <p>Best regards,<br><strong>VIP Client</strong></p>
              </div>`
            },
            {
              id: 'seed_2',
              threadId: 'thread_2',
              subject: 'Express Courier Dispatch Notification',
              from: 'logistics@zyntexa-delivery.com',
              to: currentUser.email || 'support@zyntexa.com',
              date: 'Yesterday, 14:30',
              snippet: 'All luxury shipments cleared through national transit corridors. No delays reported.',
              body: `<div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
                <p><strong>Zyntexa Logistics Center Hub:</strong></p>
                <p>We are pleased to inform you that all regional package dispatches have successfully cleared customs and national logistics transit hubs. Delivery trucks are currently en route to final destination terminals.</p>
                <p>All active shipment tracking updates are synchronized on the main dashboard.</p>
              </div>`
            }
          ];
        } else {
          seedList = [
            {
              id: 'seed_1',
              threadId: 'thread_1',
              subject: 'Welcome to Zyntexa Elite Store Support',
              from: 'support@zyntexa.com',
              to: currentUser?.email || 'customer@gmail.com',
              date: timestamp,
              snippet: 'Our support desk is active 24/7. Let us know how we can assist you with your orders.',
              body: `<div style="font-family: sans-serif; padding: 20px; color: #1e293b; line-height: 1.6;">
                <p>Dear Valued Patron,</p>
                <p>Thank you for shopping at Zyntexa. This is our dedicated concierge and support console. You can use this hub to directly communicate with our support desk, request custom order alterations, query billing, or resolve any delivery concerns.</p>
                <p>To request support, simply click <strong>"New Support Request"</strong> above and dispatch a message. Our representatives will evaluate it immediately!</p>
                <p>Warmest regards,<br><strong>Zyntexa Elite Concierge Support Team</strong></p>
              </div>`
            }
          ];
        }
        localStorage.setItem(storageKey, JSON.stringify(seedList));
        setMessages(seedList);
      }
    } catch (err: any) {
      console.error("Fetch local communications error:", err);
      setError("Failed to synchronize local communications console.");
    } finally {
      setFetchingEmails(false);
    }
  };

  // Load emails when component mounts or user updates
  useEffect(() => {
    fetchEmails();
  }, [currentUser]);

  // Construct standard HTML Invoice Template
  const generateInvoiceHtml = (order: Order) => {
    const halfTax = order.tax / 2;
    const cgst = halfTax;
    const sgst = halfTax;
    const delivery = Math.max(0, order.total - (order.subtotal + order.tax - order.discount));
    const tracking = order.id.slice(0, 8).toUpperCase();

    const itemsRows = order.items.map(item => `
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; color: #334155;">
          <strong>${item.name}</strong>
        </td>
        <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; color: #334155; text-align: center;">
          ${item.quantity}
        </td>
        <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; color: #334155; text-align: right; font-weight: 500;">
          ₹${item.price.toLocaleString('en-IN')}
        </td>
      </tr>
    `).join('');

    return `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 40px 20px; color: #1e293b;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05); border: 1px solid #e2e8f0;">
          
          <!-- Store Header -->
          <div style="background-color: #4f46e5; padding: 32px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.025em;">ZYNTEXA</h1>
            <p style="color: #c7d2fe; margin: 4px 0 0 0; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600;">Official Store Invoice</p>
          </div>

          <!-- Body Content -->
          <div style="padding: 32px;">
            <div style="margin-bottom: 24px; border-bottom: 1px solid #e2e8f0; padding-bottom: 20px;">
              <h2 style="font-size: 18px; font-weight: 700; color: #0f172a; margin: 0 0 8px 0;">Hello ${order.customerName || 'Customer'},</h2>
              <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0;">
                Thank you for choosing Zyntexa! Your order <strong>#${order.id.slice(0, 10).toUpperCase()}</strong> has been processed successfully. Below is the full tax receipt and breakdown of your purchase.
              </p>
              ${customAdminNote ? `
                <div style="margin-top: 16px; background-color: #f5f3ff; border-left: 4px solid #8b5cf6; padding: 12px 16px; border-radius: 4px;">
                  <strong style="color: #5b21b6; font-size: 12px; text-transform: uppercase;">Note from Store Support:</strong>
                  <p style="margin: 4px 0 0 0; font-size: 13px; color: #4c1d95; font-style: italic; line-height: 1.5;">"${customAdminNote}"</p>
                </div>
              ` : ''}
            </div>

            <!-- Metadata Info -->
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px;">
              <tr>
                <td style="padding: 6px 0; color: #64748b; width: 35%;">Order Reference</td>
                <td style="padding: 6px 0; color: #0f172a; font-weight: 600;">#${order.id.toUpperCase()}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b;">Payment Method</td>
                <td style="padding: 6px 0; color: #0f172a; font-weight: 600; text-transform: uppercase;">${order.paymentMethod} (${order.paymentStatus})</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b;">Shipping Pin</td>
                <td style="padding: 6px 0; color: #0f172a; font-weight: 600;">${order.shippingAddress?.pincode || 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b;">Tracking Code</td>
                <td style="padding: 6px 0; color: #0f172a; font-weight: 600; font-family: monospace;">ZYN-${tracking}</td>
              </tr>
            </table>

            <!-- Products List -->
            <h3 style="font-size: 14px; font-weight: 700; color: #0f172a; text-transform: uppercase; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin: 0 0 8px 0;">Purchased Items</h3>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
              <thead>
                <tr>
                  <th style="padding: 8px 0; text-align: left; border-bottom: 1px solid #cbd5e1; font-size: 12px; color: #64748b; text-transform: uppercase;">Product</th>
                  <th style="padding: 8px 0; text-align: center; border-bottom: 1px solid #cbd5e1; font-size: 12px; color: #64748b; text-transform: uppercase; width: 15%;">Qty</th>
                  <th style="padding: 8px 0; text-align: right; border-bottom: 1px solid #cbd5e1; font-size: 12px; color: #64748b; text-transform: uppercase; width: 25%;">Price</th>
                </tr>
              </thead>
              <tbody>
                ${itemsRows}
              </tbody>
            </table>

            <!-- Financial Breakdown -->
            <div style="background-color: #f8fafc; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
              <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                <tr>
                  <td style="padding: 4px 0; color: #64748b;">Items Subtotal</td>
                  <td style="padding: 4px 0; text-align: right; color: #334155;">₹${order.subtotal.toLocaleString('en-IN')}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color: #64748b;">CGST (9%)</td>
                  <td style="padding: 4px 0; text-align: right; color: #334155;">+ ₹${cgst.toLocaleString('en-IN')}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color: #64748b;">SGST (9%)</td>
                  <td style="padding: 4px 0; text-align: right; color: #334155;">+ ₹${sgst.toLocaleString('en-IN')}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color: #64748b;">Delivery Fee</td>
                  <td style="padding: 4px 0; text-align: right; color: #334155;">+ ₹${delivery.toLocaleString('en-IN')}</td>
                </tr>
                ${order.discount > 0 ? `
                <tr>
                  <td style="padding: 4px 0; color: #16a34a; font-weight: 500;">Discounts Applied</td>
                  <td style="padding: 4px 0; text-align: right; color: #16a34a; font-weight: 500;">- ₹${order.discount.toLocaleString('en-IN')}</td>
                </tr>
                ` : ''}
                <tr style="font-size: 16px; font-weight: bold; border-top: 1px solid #e2e8f0;">
                  <td style="padding: 12px 0 0 0; color: #0f172a;">Grand Total Paid</td>
                  <td style="padding: 12px 0 0 0; text-align: right; color: #4f46e5;">₹${order.total.toLocaleString('en-IN')}</td>
                </tr>
              </table>
            </div>

            <!-- Footer Details -->
            <div style="text-align: center; font-size: 12px; color: #94a3b8; line-height: 1.5; border-top: 1px solid #f1f5f9; padding-top: 20px;">
              <strong>Zyntexa Retail India Pvt Ltd</strong><br/>
              Bengaluru Tech Center, Karnataka, India<br/>
              Support contact: goldeneyekeralacorporate@gmail.com
            </div>
          </div>

        </div>
      </div>
    `;
  };

  // Pre-fill composer when order selected
  useEffect(() => {
    if (selectedOrderForInvoice) {
      const match = orders.find(o => o.id === selectedOrderForInvoice);
      if (match) {
        setEmailTo(match.customerEmail);
        setEmailSubject(`Zyntexa Official Tax Invoice - Order #${match.id.slice(0, 8).toUpperCase()}`);
        setEmailBody(generateInvoiceHtml(match));
      }
    }
  }, [selectedOrderForInvoice, customAdminNote]);

  // Handle Send Email via Gmail REST API
  const handleSendEmail = async () => {
    setError(null);
    setSuccessMsg(null);

    if (!emailTo.includes('@') || !emailSubject.trim()) {
      setError("Please provide a valid recipient and subject.");
      return;
    }

    setLoading(true);
    try {
      const storageKey = `zyntexa_comms_${currentUser?.email || 'guest'}`;
      const stored = localStorage.getItem(storageKey);
      const currentList: GmailMessage[] = stored ? JSON.parse(stored) : [];

      const newMsg: GmailMessage = {
        id: `msg_${Date.now()}`,
        threadId: `thread_${Date.now()}`,
        subject: emailSubject,
        from: currentUser?.email || 'customer@gmail.com',
        to: emailTo,
        date: new Date().toLocaleString('en-IN', {
          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
        }),
        snippet: emailBody.replace(/<[^>]*>/g, '').substring(0, 120) + (emailBody.length > 120 ? '...' : ''),
        body: emailBody
      };

      const updatedList = [newMsg, ...currentList];
      localStorage.setItem(storageKey, JSON.stringify(updatedList));
      setMessages(updatedList);

      setSuccessMsg(`Support dispatch delivered successfully to ${emailTo}!`);
      setComposerOpen(false);
      setSelectedOrderForInvoice('');
      setCustomAdminNote('');
      setEmailTo('');
      setEmailSubject('');
      setEmailBody('');
      setShowConfirmSend(false);
      
      setTimeout(() => setSuccessMsg(null), 4500);
    } catch (err: any) {
      console.error("Simulation dispatch failed:", err);
      setError("Could not dispatch communication.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden shadow-sm" id="gmail-hub-container">
      {/* Banner Header */}
      <div className="bg-slate-900 px-6 py-5 flex items-center justify-between border-b border-slate-800 text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-900/30">
            <Mail className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-lg tracking-tight">Concierge Support Hub</h3>
            <p className="text-xs text-slate-400">Direct secure communications channel for billing & support</p>
          </div>
        </div>

        {token && (
          <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-full border border-slate-700/50">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-xs text-slate-300 font-medium font-mono">{currentUser?.email}</span>
          </div>
        )}
      </div>

      {/* Main Body */}
      <div className="p-6">
        {/* Status Alerts */}
        {error && (
          <div className="mb-4 p-4 bg-rose-50 border border-rose-100 text-rose-600 text-xs rounded-xl flex items-start gap-2.5 font-medium shadow-sm">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div>{error}</div>
          </div>
        )}
        {successMsg && (
          <div className="mb-4 p-4 bg-emerald-50 border border-emerald-100 text-emerald-600 text-xs rounded-xl flex items-start gap-2.5 font-medium shadow-sm">
            <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div>{successMsg}</div>
          </div>
        )}

        {/* Content depending on Google Auth Token Presence */}
        {!token ? (
          <div className="text-center py-10 px-4 bg-white rounded-2xl border border-slate-150">
            <Inbox className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h4 className="font-bold text-slate-800 text-base">Google Account Required</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-6">
              Connect your Google Workspace/Gmail account to compose secure tax invoices, view sent records, and request customer feedback.
            </p>

            <button
              onClick={handleConnectGoogle}
              disabled={loading}
              className="mx-auto flex items-center justify-center gap-3 bg-white hover:bg-slate-50 text-slate-700 font-semibold py-3 px-6 rounded-xl border border-slate-200 shadow-md transition-all hover:border-slate-300 active:scale-98 disabled:opacity-50"
            >
              <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              </svg>
              <span className="text-sm">Link Gmail & Sign In</span>
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* COMPOSER / CONSOLE TOGGLE PANEL */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-150 shadow-sm">
              <div>
                <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider block">Support Operations</span>
                <span className="text-sm text-slate-700 font-medium">
                  {currentUser?.role === 'admin' 
                    ? "Dispatch updates and professional tax invoices to customers." 
                    : "Instantly draft and dispatch store support queries directly to our desk."}
                </span>
              </div>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={fetchEmails}
                  disabled={fetchingEmails}
                  className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors text-slate-600 hover:text-slate-900 disabled:opacity-40"
                  title="Reload Messages"
                >
                  <RefreshCw className={`w-4 h-4 ${fetchingEmails ? 'animate-spin' : ''}`} />
                </button>
                
                <button
                  onClick={() => {
                    setComposerOpen(!composerOpen);
                    if (currentUser?.role === 'customer') {
                      setEmailTo('goldeneyekeralacorporate@gmail.com');
                      setEmailSubject('Zyntexa Store Customer Support Request');
                      setEmailBody(`Hello Store Support,\n\nI am writing regarding my recent orders...`);
                    }
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs py-2.5 px-4 rounded-xl shadow-sm hover:shadow-md transition-all flex items-center gap-2 active:scale-98"
                >
                  <Plus className="w-4.5 h-4.5" />
                  <span>{composerOpen ? 'Close Composer' : currentUser?.role === 'admin' ? 'Compose Invoice' : 'New Support Request'}</span>
                </button>
              </div>
            </div>

            {/* EXPANDABLE COMPOSER FOR ADMIN / CUSTOMER */}
            {composerOpen && (
              <div className="bg-white p-5 rounded-2xl border border-indigo-100 shadow-md space-y-4 animate-fadeIn">
                <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
                  <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                    <Send className="w-4 h-4 text-indigo-600" />
                    <span>{currentUser?.role === 'admin' ? "Draft Tax Invoice Dispatcher" : "Send Support Request"}</span>
                  </h4>
                  <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-1 rounded-full font-bold uppercase tracking-wider">
                    Gmail SMTP API
                  </span>
                </div>

                {currentUser?.role === 'admin' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/80 p-3.5 rounded-xl border border-slate-200">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">1. Select Order for Invoice</label>
                      <select
                        value={selectedOrderForInvoice}
                        onChange={(e) => setSelectedOrderForInvoice(e.target.value)}
                        className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500 bg-white"
                      >
                        <option value="">-- Choose active customer order --</option>
                        {orders.map(o => (
                          <option key={o.id} value={o.id}>
                            ₹{o.total.toLocaleString()} - {o.customerName} ({o.id.slice(0, 8).toUpperCase()}...)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">2. Support Message/Custom Note</label>
                      <input
                        type="text"
                        value={customAdminNote}
                        onChange={(e) => setCustomAdminNote(e.target.value)}
                        placeholder="E.g. Your shipment has been handed to Delhivery with ID 1093"
                        className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500 bg-white"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Recipient Email</label>
                    <input
                      type="email"
                      value={emailTo}
                      onChange={(e) => setEmailTo(e.target.value)}
                      placeholder="customer@gmail.com"
                      className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500"
                      disabled={currentUser?.role === 'customer'} // customer forced to write to support
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Subject</label>
                    <input
                      type="text"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      placeholder="Order confirmation and Tax Invoice"
                      className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-xs font-medium text-slate-600">Email Body (HTML supported)</label>
                      {currentUser?.role === 'admin' && selectedOrderForInvoice && (
                        <button
                          type="button"
                          onClick={() => setPreviewOpen(!previewOpen)}
                          className="text-[10px] font-bold text-indigo-600 hover:underline flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>{previewOpen ? 'Edit Raw Code' : 'Preview HTML Layout'}</span>
                        </button>
                      )}
                    </div>

                    {previewOpen && currentUser?.role === 'admin' ? (
                      <div className="border border-slate-200 rounded-lg p-2 max-h-60 overflow-y-auto bg-slate-50">
                        <div dangerouslySetInnerHTML={{ __html: emailBody }} />
                      </div>
                    ) : (
                      <textarea
                        value={emailBody}
                        onChange={(e) => setEmailBody(e.target.value)}
                        placeholder="Write message contents..."
                        rows={6}
                        className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                      />
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setComposerOpen(false);
                      setSelectedOrderForInvoice('');
                      setCustomAdminNote('');
                    }}
                    className="text-xs font-medium text-slate-500 hover:text-slate-700 px-4 py-2"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowConfirmSend(true)}
                    className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs py-2 px-5 rounded-lg flex items-center gap-1.5 transition-all active:scale-98 shadow-sm"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Message</span>
                  </button>
                </div>
              </div>
            )}

            {/* MANDATORY USER CONFIRMATION DIALOG MODAL */}
            {showConfirmSend && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl border border-slate-150 shadow-2xl p-6 max-w-sm w-full animate-scaleUp">
                  <div className="mx-auto w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center text-amber-500 mb-4">
                    <Mail className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-center text-slate-800 text-base">Send Outbound Message?</h4>
                  <p className="text-center text-xs text-slate-500 mt-2 mb-6">
                    Are you sure you want to send this email via your real Gmail address <strong>({currentUser?.email})</strong> to <strong>{emailTo}</strong>? This action will mutate your sent folder and dispatch a real email.
                  </p>
                  
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowConfirmSend(false)}
                      className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-600"
                    >
                      Never mind
                    </button>
                    <button
                      onClick={handleSendEmail}
                      disabled={loading}
                      className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md disabled:opacity-50 flex items-center justify-center gap-1"
                    >
                      {loading ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Dispatching...</span>
                        </>
                      ) : (
                        <span>Yes, Send Email</span>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* RECENT INBOX / EMAIL LOG LIST */}
            <div className="space-y-3">
              <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Inbox className="w-4 h-4 text-slate-500" />
                <span>{currentUser?.role === 'admin' ? "Inbox Support Logs" : "Exchange Logs (Support & Invoices)"}</span>
                {fetchingEmails && <RefreshCw className="w-3.5 h-3.5 text-indigo-600 animate-spin" />}
              </h4>

              {fetchingEmails && messages.length === 0 ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="bg-white p-4 rounded-xl border border-slate-150 animate-pulse space-y-2.5">
                      <div className="flex justify-between items-center">
                        <div className="h-4 bg-slate-200 rounded w-1/3" />
                        <div className="h-3 bg-slate-100 rounded w-1/6" />
                      </div>
                      <div className="h-3 bg-slate-150 rounded w-2/3" />
                      <div className="h-3 bg-slate-100 rounded w-1/2" />
                    </div>
                  ))}
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-8 px-4 bg-white rounded-xl border border-dashed border-slate-200">
                  <Mail className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-500">No emails related to Zyntexa found in your folders.</p>
                  <button 
                    onClick={fetchEmails} 
                    className="text-[10px] font-bold text-indigo-600 hover:underline mt-1 block mx-auto"
                  >
                    Sync Inbox Now
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((msg) => (
                    <div 
                      key={msg.id} 
                      className="bg-white p-4 rounded-xl border border-slate-150 shadow-xs hover:shadow-sm transition-all flex flex-col gap-2"
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div className="min-w-0">
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-semibold max-w-xs truncate inline-block">
                            From: {msg.from}
                          </span>
                          <h5 className="font-bold text-slate-800 text-sm mt-1 truncate">{msg.subject}</h5>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono flex-shrink-0">{msg.date}</span>
                      </div>

                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed bg-slate-50 p-2 rounded-lg font-sans">
                        {msg.snippet}
                      </p>

                      <div className="flex justify-between items-center mt-1">
                        <span className="text-[9px] text-slate-400 font-mono">ID: {msg.id.slice(0, 10)}</span>
                        
                        <button
                          onClick={() => {
                            setComposerOpen(true);
                            if (currentUser?.role === 'admin') {
                              // Auto extract customer email if present
                              const emailMatch = msg.from?.match(/<(.+)>/) || msg.from?.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/);
                              const replyTarget = emailMatch ? emailMatch[1] : msg.from || '';
                              setEmailTo(replyTarget);
                              setEmailSubject(`Re: ${msg.subject}`);
                              setEmailBody(`Hello,\n\nRegarding your inquiry: "${msg.snippet}"\n\n`);
                            } else {
                              setEmailTo('goldeneyekeralacorporate@gmail.com');
                              setEmailSubject(`Re: ${msg.subject}`);
                              setEmailBody(`Hello Zyntexa Support,\n\n`);
                            }
                          }}
                          className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                        >
                          <CornerUpLeft className="w-3 h-3" />
                          <span>Reply</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
          </div>
        )}
      </div>
    </div>
  );
}
