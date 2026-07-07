import React, { useState } from 'react';
import { 
  X, ShoppingBag, Clock, CheckCircle, Truck, MapPin, 
  ChevronRight, Calendar, CreditCard, ChevronDown, ChevronUp 
} from 'lucide-react';
import { Order } from '../types';

interface MyOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: Order[];
}

export default function MyOrdersModal({ isOpen, onClose, orders }: MyOrdersModalProps) {
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  if (!isOpen) return null;

  const toggleExpand = (orderId: string) => {
    setExpandedOrderId(expandedOrderId === orderId ? null : orderId);
  };

  const getStatusStyle = (status: Order['orderStatus']) => {
    switch (status) {
      case 'pending':
        return 'text-amber-700 bg-amber-50 border-amber-200';
      case 'approved':
        return 'text-emerald-700 bg-emerald-50 border-emerald-200';
      case 'shipped':
        return 'text-indigo-700 bg-indigo-50 border-indigo-200';
      case 'delivered':
        return 'text-green-700 bg-green-50 border-green-200';
      case 'cancelled':
        return 'text-rose-700 bg-rose-50 border-rose-200';
      default:
        return 'text-slate-700 bg-slate-50 border-slate-200';
    }
  };

  const getStepIndex = (status: Order['orderStatus']) => {
    switch (status) {
      case 'pending': return 0;
      case 'approved': return 1;
      case 'shipped': return 2;
      case 'delivered': return 3;
      case 'cancelled': return -1;
      default: return 0;
    }
  };

  const steps = [
    { label: 'Placed', desc: 'Order received', icon: Clock },
    { label: 'Approved', desc: 'Confirmed by store', icon: CheckCircle },
    { label: 'Shipped', desc: 'In transit', icon: Truck },
    { label: 'Delivered', desc: 'Received successfully', icon: MapPin },
  ];

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-800">My Orders</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                {orders.length} orders found • Real-time tracking active
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Orders List */}
        <div className="flex-grow overflow-y-auto p-6 space-y-4">
          {orders.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto animate-bounce" />
              <p className="text-sm font-bold text-slate-600">You haven't placed any orders yet.</p>
              <p className="text-xs text-slate-400">Add products to your cart and complete checkout to begin tracking!</p>
            </div>
          ) : (
            orders.map((o) => {
              const isExpanded = expandedOrderId === o.id;
              const currentStep = getStepIndex(o.orderStatus);

              return (
                <div 
                  key={o.id}
                  className="border border-slate-100 hover:border-slate-200/80 rounded-2xl overflow-hidden transition-all shadow-xs bg-slate-50/10"
                >
                  {/* Summary Bar */}
                  <div 
                    onClick={() => toggleExpand(o.id)}
                    className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/40 transition-colors"
                  >
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 flex-grow">
                      <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Order ID</p>
                        <p className="text-xs font-bold text-slate-800 font-mono">#{o.id.slice(0, 8).toUpperCase()}</p>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {new Date(o.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>

                      <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Total Amount</p>
                        <p className="text-xs font-black text-indigo-600 font-mono">₹{o.total.toLocaleString('en-IN')}</p>
                        <span className="text-[10px] text-slate-500 font-bold capitalize">{o.paymentMethod}</span>
                      </div>

                      <div className="col-span-2 sm:col-span-1">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mb-1">Status</p>
                        <span className={`px-2.5 py-1 text-[10px] font-bold border rounded-full inline-flex items-center gap-1 capitalize ${getStatusStyle(o.orderStatus)}`}>
                          {o.orderStatus}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2">
                      <span className="text-[10px] font-bold text-indigo-600 hidden sm:inline">
                        {isExpanded ? 'Hide Details' : 'Track Order'}
                      </span>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </div>
                  </div>

                  {/* Tracking Tracker & Details */}
                  {isExpanded && (
                    <div className="px-5 pb-5 pt-4 border-t border-slate-100 bg-white space-y-6 animate-fade-in">
                      
                      {/* Interactive Logistics Stepper Progress */}
                      {o.orderStatus === 'cancelled' ? (
                        <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-800 text-xs flex items-center gap-2">
                          <X className="w-4 h-4 text-rose-600" />
                          <span className="font-bold">This order has been cancelled.</span>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Logistics Milestones</p>
                          <div className="grid grid-cols-4 gap-2 relative">
                            {/* Connector Line behind steps */}
                            <div className="absolute top-4 left-[12.5%] right-[12.5%] h-0.5 bg-slate-100 -z-10">
                              <div 
                                className="h-full bg-indigo-600 transition-all duration-500" 
                                style={{ width: `${(currentStep / 3) * 100}%` }}
                              />
                            </div>

                            {steps.map((step, idx) => {
                              const Icon = step.icon;
                              const isCompleted = idx <= currentStep;
                              const isCurrent = idx === currentStep;

                              return (
                                <div key={step.label} className="text-center flex flex-col items-center">
                                  <div 
                                    className={`w-8.5 h-8.5 rounded-full flex items-center justify-center transition-all duration-300 border ${
                                      isCompleted 
                                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm shadow-indigo-100 scale-105' 
                                        : 'bg-white text-slate-400 border-slate-200'
                                    } ${isCurrent ? 'ring-4 ring-indigo-50' : ''}`}
                                  >
                                    <Icon className="w-4.5 h-4.5" />
                                  </div>
                                  <p className={`text-[10px] font-bold mt-2 ${isCompleted ? 'text-indigo-600' : 'text-slate-400'}`}>
                                    {step.label}
                                  </p>
                                  <p className="text-[8px] text-slate-400 font-medium hidden sm:block leading-tight mt-0.5">
                                    {step.desc}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Purchased Items & Delivery Address Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-600">
                        {/* Items Section */}
                        <div className="space-y-2">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-50 pb-1">Items Summary</p>
                          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                            {o.items.map((item, idx) => (
                              <div key={`${item.productId}_${idx}`} className="flex gap-3 items-center">
                                <img src={item.imageUrl} className="w-10 h-10 rounded-lg object-cover bg-slate-50 border border-slate-100 flex-shrink-0" referrerPolicy="no-referrer" />
                                <div className="min-w-0 flex-1">
                                  <p className="font-bold text-slate-700 truncate leading-tight">{item.name}</p>
                                  <p className="text-slate-400 text-[10px] font-mono mt-0.5">{item.quantity} × ₹{item.price.toLocaleString('en-IN')}</p>
                                </div>
                                <p className="font-bold text-slate-700 font-mono">₹{(item.price * item.quantity).toLocaleString('en-IN')}</p>
                              </div>
                            ))}
                          </div>
                          
                          <div className="pt-2.5 border-t border-slate-100 text-[10px] space-y-1 bg-slate-50/50 p-2.5 rounded-xl border border-slate-50">
                            <div className="flex justify-between">
                              <span className="font-medium text-slate-400">Subtotal:</span>
                              <span className="font-mono text-slate-700 font-bold">₹{o.subtotal.toLocaleString('en-IN')}</span>
                            </div>
                            {o.discount > 0 && (
                              <div className="flex justify-between text-emerald-600">
                                <span className="font-medium">Applied Promo Discount:</span>
                                <span className="font-mono font-bold">-₹{o.discount.toLocaleString('en-IN')}</span>
                              </div>
                            )}
                            <div className="flex justify-between">
                              <span className="font-medium text-slate-400">GST (SGST/CGST):</span>
                              <span className="font-mono text-slate-700 font-bold">₹{o.tax.toLocaleString('en-IN')}</span>
                            </div>
                            <div className="flex justify-between pt-1 border-t border-slate-100 font-extrabold text-slate-800">
                              <span>Grand Total:</span>
                              <span className="font-mono text-indigo-600 text-xs">₹{o.total.toLocaleString('en-IN')}</span>
                            </div>
                          </div>
                        </div>

                        {/* Delivery Details Section */}
                        <div className="space-y-3">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-50 pb-1">Delivery Destination</p>
                          <div className="space-y-1.5 font-semibold text-slate-600">
                            <p className="font-bold text-slate-800">{o.shippingAddress.fullName}</p>
                            <p>{o.shippingAddress.street}</p>
                            {o.shippingAddress.landmark && <p className="text-slate-500 text-[11px]">Landmark: {o.shippingAddress.landmark}</p>}
                            <p>{o.shippingAddress.city}, {o.shippingAddress.state} - <strong className="font-bold text-slate-800">{o.shippingAddress.pincode}</strong></p>
                            <p className="text-slate-500">Phone: {o.shippingAddress.phone}</p>
                          </div>

                          {o.locationCoordinates && (
                            <div className="bg-emerald-50/60 border border-emerald-100 p-2 rounded-xl text-emerald-800 flex items-start gap-2">
                              <MapPin className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                              <div className="text-[9px] font-bold">
                                <p className="uppercase tracking-wider">Verified Dispatch Coordinates</p>
                                <p className="font-mono mt-0.5 text-slate-600">Lat: {o.locationCoordinates.latitude.toFixed(6)}° N, Lng: {o.locationCoordinates.longitude.toFixed(6)}° E</p>
                              </div>
                            </div>
                          )}

                          <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl space-y-1 text-[10px]">
                            <div className="flex justify-between">
                              <span className="text-slate-400">Payment Status:</span>
                              <span className={`font-bold uppercase ${o.paymentStatus === 'confirmed' ? 'text-emerald-600' : 'text-amber-600'}`}>
                                {o.paymentStatus}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Payment Method:</span>
                              <span className="font-bold text-slate-700 uppercase">{o.paymentMethod}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
