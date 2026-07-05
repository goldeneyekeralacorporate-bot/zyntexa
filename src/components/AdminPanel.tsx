import React, { useState } from 'react';
import { 
  Plus, Edit, Trash2, CheckCircle, XCircle, Clock, Truck, ShieldAlert,
  Layers, DollarSign, Package, ShoppingBag, Eye, Map, Percent, ArrowUpRight 
} from 'lucide-react';
import { Product, Order } from '../types';

interface AdminPanelProps {
  products: Product[];
  orders: Order[];
  onAddProduct: (product: Omit<Product, 'id'>) => Promise<void>;
  onUpdatePrice: (productId: string, newPrice: number) => Promise<void>;
  onUpdateProduct: (productId: string, updates: Partial<Product>) => Promise<void>;
  onDeleteProduct: (productId: string) => Promise<void>;
  onUpdateOrderStatus: (orderId: string, status: Order['orderStatus'], paymentStatus?: Order['paymentStatus']) => Promise<void>;
}

const PRESET_PHOTOS = [
  { name: 'Luxury Watch', url: 'https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?auto=format&fit=crop&q=80&w=600' },
  { name: 'Leather Jacket', url: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&q=80&w=600' },
  { name: 'Sleek Laptop', url: 'https://images.unsplash.com/photo-1496181130204-7552cc14ac1b?auto=format&fit=crop&q=80&w=600' },
  { name: 'Designer Shoes', url: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&q=80&w=600' },
  { name: 'Aroma Diffuser', url: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&q=80&w=600' },
  { name: 'Minimalist Chair', url: 'https://images.unsplash.com/photo-1592078615290-033ee584e267?auto=format&fit=crop&q=80&w=600' },
];

export default function AdminPanel({
  products,
  orders,
  onAddProduct,
  onUpdatePrice,
  onUpdateProduct,
  onDeleteProduct,
  onUpdateOrderStatus
}: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<'products' | 'orders'>('products');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // New Product State
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newCategory, setNewCategory] = useState('Apparel');
  const [newStock, setNewStock] = useState('20');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newFeatured, setNewFeatured] = useState(false);

  // Expanded Order State
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  // Inline Price/Stock Editors for active list
  const [editingProdId, setEditingProdId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const [editStock, setEditStock] = useState('');

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!newName.trim() || !newDescription.trim() || !newImageUrl.trim()) {
      setError('Please fill in all product fields, including an image URL.');
      return;
    }

    const priceNum = Number(newPrice);
    const stockNum = Number(newStock);

    if (isNaN(priceNum) || priceNum <= 0) {
      setError('Please enter a valid price greater than ₹0.');
      return;
    }
    if (isNaN(stockNum) || stockNum < 0) {
      setError('Please enter a valid stock count.');
      return;
    }

    setLoading(true);
    try {
      await onAddProduct({
        name: newName,
        description: newDescription,
        price: priceNum,
        category: newCategory,
        stock: stockNum,
        imageUrl: newImageUrl,
        featured: newFeatured
      });

      setSuccess(`Product "${newName}" added successfully to the catalog!`);
      // Reset
      setNewName('');
      setNewDescription('');
      setNewPrice('');
      setNewImageUrl('');
      setNewFeatured(false);
    } catch (err) {
      setError('Failed to create product. Check database connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSave = async (id: string) => {
    const p = Number(editPrice);
    const s = Number(editStock);
    if (isNaN(p) || p <= 0 || isNaN(s) || s < 0) return;

    try {
      await onUpdateProduct(id, { price: p, stock: s });
      setEditingProdId(null);
    } catch (err) {
      console.error(err);
    }
  };

  // KPIs Calculations
  const totalRevenue = orders
    .filter(o => o.paymentStatus === 'confirmed' && o.orderStatus !== 'cancelled')
    .reduce((acc, o) => acc + o.total, 0);

  const pendingOrdersCount = orders.filter(o => o.orderStatus === 'pending').length;
  const approvedOrdersCount = orders.filter(o => o.orderStatus === 'approved' || o.orderStatus === 'shipped').length;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 animate-fade-in" id="admin-panel-container">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-2xl p-6 sm:p-8 text-white shadow-xl mb-8 border border-indigo-900/40">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <span className="bg-rose-500 text-white text-[10px] font-black uppercase px-2.5 py-1 rounded-full border border-rose-400/30 tracking-widest flex items-center gap-1 w-fit mb-2 animate-pulse-slow">
              <ShieldAlert className="w-3 h-3" />
              <span>Admin Control Center</span>
            </span>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight font-sans">Zyntexa Management Hub</h2>
            <p className="text-xs text-indigo-200 mt-1">Real-time product inventory overrides and instant shipping logistics dispatch.</p>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider">Gateway State</p>
            <p className="text-xs font-mono font-bold text-emerald-400">● Live Firestore Database</p>
          </div>
        </div>

        {/* Dynamic Metric KPIs cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
          <div className="bg-white/5 backdrop-blur-md rounded-xl p-4 border border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-indigo-200 uppercase tracking-wider">Total Sales</span>
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-2xl font-extrabold font-mono text-white mt-1.5">₹{totalRevenue.toLocaleString('en-IN')}</p>
            <p className="text-[10px] text-slate-400 mt-1 font-medium">Excludes cancelled transactions</p>
          </div>

          <div className="bg-white/5 backdrop-blur-md rounded-xl p-4 border border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-indigo-200 uppercase tracking-wider">Total Orders</span>
              <ShoppingBag className="w-4 h-4 text-indigo-400" />
            </div>
            <p className="text-2xl font-extrabold font-mono text-white mt-1.5">{orders.length}</p>
            <p className="text-[10px] text-slate-400 mt-1 font-medium">From {new Set(orders.map(o => o.userId)).size} unique customers</p>
          </div>

          <div className="bg-white/5 backdrop-blur-md rounded-xl p-4 border border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-indigo-200 uppercase tracking-wider">Awaiting Attention</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-2xl font-extrabold font-mono text-white mt-1.5">{pendingOrdersCount}</p>
            <p className="text-[10px] text-amber-400 mt-1 font-semibold">Requires Approval: {pendingOrdersCount} orders</p>
          </div>
        </div>
      </div>

      {/* Navigation tabs */}
      <div className="flex border-b border-slate-200 mb-6">
        <button
          onClick={() => setActiveTab('products')}
          id="admin-products-tab-btn"
          className={`py-3 px-5 text-sm font-extrabold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === 'products'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Package className="w-4.5 h-4.5" />
          <span>Product Inventory</span>
        </button>

        <button
          onClick={() => setActiveTab('orders')}
          id="admin-orders-tab-btn"
          className={`py-3 px-5 text-sm font-extrabold transition-all border-b-2 flex items-center gap-2 cursor-pointer relative ${
            activeTab === 'orders'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Layers className="w-4.5 h-4.5" />
          <span>Customer Orders</span>
          {pendingOrdersCount > 0 && (
            <span className="bg-amber-500 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-full animate-pulse ml-1">
              {pendingOrdersCount}
            </span>
          )}
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-100 text-rose-600 text-sm rounded-xl font-semibold">
          ⚠️ {error}
        </div>
      )}
      {success && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm rounded-xl font-semibold">
          ✓ {success}
        </div>
      )}

      {activeTab === 'products' ? (
        /* PRODUCT INVENTORY TAB */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Add Product Form */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 h-fit space-y-4">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2 border-b border-slate-50 pb-3">
              <Plus className="w-5 h-5 text-indigo-600" />
              <span>Launch New Product</span>
            </h3>

            <form onSubmit={handleCreateProduct} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Product Title</label>
                <input
                  type="text"
                  placeholder="E.g. Linen Slim-Fit Shirt"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500 text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Detailed Description</label>
                <textarea
                  placeholder="Describe material craft, specs, and details..."
                  rows={2}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500 text-xs font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Price (INR ₹)</label>
                  <input
                    type="number"
                    placeholder="E.g. 2999"
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500 text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Stock Count</label>
                  <input
                    type="number"
                    placeholder="20"
                    value={newStock}
                    onChange={(e) => setNewStock(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500 text-xs font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500 text-xs font-bold text-slate-600 bg-white"
                  >
                    <option value="Apparel">Apparel</option>
                    <option value="Electronics">Electronics</option>
                    <option value="Watches">Watches</option>
                    <option value="Footwear">Footwear</option>
                    <option value="Accessories">Accessories</option>
                    <option value="Home & Decor">Home & Decor</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 pl-2">
                  <input
                    type="checkbox"
                    id="new-featured"
                    checked={newFeatured}
                    onChange={(e) => setNewFeatured(e.target.checked)}
                    className="w-4.5 h-4.5 rounded text-indigo-600 focus:ring-indigo-100"
                  />
                  <label htmlFor="new-featured" className="text-xs font-bold text-slate-600 cursor-pointer">Featured Spot</label>
                </div>
              </div>

              {/* Photo Input with instant Preset Selector */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Product Image Link</label>
                <input
                  type="text"
                  placeholder="https://images.unsplash.com/..."
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500 text-xs font-medium mb-2"
                />

                <p className="text-[9px] font-bold text-slate-400 mb-1.5 uppercase">Or quick click premium preset photo:</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {PRESET_PHOTOS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => setNewImageUrl(preset.url)}
                      className="p-1 rounded-lg border border-slate-100 hover:border-indigo-500 bg-slate-50 hover:bg-indigo-50/20 text-[9px] font-bold text-slate-600 flex flex-col items-center gap-1 transition-all"
                    >
                      <img src={preset.url} className="w-7 h-7 rounded object-cover shadow-sm" referrerPolicy="no-referrer" />
                      <span className="truncate w-full text-center">{preset.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                id="admin-create-product-btn"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold rounded-xl transition-all shadow-md shadow-indigo-100 flex items-center justify-center gap-1.5"
              >
                {loading ? 'Adding to Firestore...' : 'Launch Product Live'}
              </button>
            </form>
          </div>

          {/* Active Inventory List */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2 border-b border-slate-50 pb-3">
              <Package className="w-5 h-5 text-indigo-600" />
              <span>Active Catalog Inventory ({products.length})</span>
            </h3>

            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {products.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">No products found. Seed details using catalog view.</div>
              ) : (
                products.map((p) => (
                  <div 
                    key={p.id}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-3 rounded-xl border border-slate-50 hover:border-slate-100 bg-slate-50/20 hover:bg-slate-50/60 transition-all"
                  >
                    <div className="flex gap-3 items-center min-w-0">
                      <img src={p.imageUrl} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" referrerPolicy="no-referrer" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-bold text-slate-800 truncate">{p.name}</h4>
                          {p.featured && <span className="text-[8px] font-bold text-indigo-600 bg-indigo-50 px-1 py-0.2 rounded uppercase border border-indigo-100">Featured</span>}
                        </div>
                        <p className="text-[10px] text-slate-400 capitalize">{p.category} • {p.stock} in stock</p>
                        <p className="text-[10px] font-bold text-indigo-600 font-mono mt-0.5">₹{p.price.toLocaleString('en-IN')}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 self-end sm:self-auto">
                      {editingProdId === p.id ? (
                        <div className="flex items-center gap-1.5">
                          <div className="flex flex-col">
                            <span className="text-[8px] font-bold text-slate-400 uppercase">Price (₹)</span>
                            <input
                              type="number"
                              value={editPrice}
                              onChange={(e) => setEditPrice(e.target.value)}
                              className="w-16 px-1 py-0.5 border border-slate-300 rounded text-[11px] font-bold"
                            />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[8px] font-bold text-slate-400 uppercase">Stock</span>
                            <input
                              type="number"
                              value={editStock}
                              onChange={(e) => setEditStock(e.target.value)}
                              className="w-12 px-1 py-0.5 border border-slate-300 rounded text-[11px] font-bold"
                            />
                          </div>
                          <button
                            onClick={() => handleQuickSave(p.id)}
                            id={`save-inline-btn-${p.id}`}
                            className="px-2 py-1.5 bg-emerald-600 text-white rounded text-[10px] font-bold hover:bg-emerald-500 self-end"
                          >
                            Save
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingProdId(p.id);
                            setEditPrice(p.price.toString());
                            setEditStock(p.stock.toString());
                          }}
                          id={`edit-inline-btn-${p.id}`}
                          className="px-2.5 py-1.5 border border-slate-200 text-slate-600 hover:border-indigo-600 hover:text-indigo-600 text-[10px] font-extrabold rounded-lg bg-white transition-colors cursor-pointer"
                        >
                          Change Price
                        </button>
                      )}

                      <button
                        onClick={async () => {
                          if (confirm(`Remove ${p.name} from public catalog?`)) {
                            await onDeleteProduct(p.id);
                          }
                        }}
                        id={`delete-product-btn-${p.id}`}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete product"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : (
        /* CUSTOMER ORDERS DASHBOARD TAB */
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-50 pb-3">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-600" />
              <span>Real-time Order Book ({orders.length} Records)</span>
            </h3>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Sort: Latest Placed</span>
          </div>

          <div className="space-y-4 max-h-[700px] overflow-y-auto pr-1">
            {orders.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs">No orders placed on the system yet. Placed orders show instantly.</div>
            ) : (
              orders.map((o) => {
                const isExpanded = expandedOrderId === o.id;
                
                return (
                  <div 
                    key={o.id}
                    className="border border-slate-100 hover:border-slate-200/80 rounded-xl overflow-hidden transition-all shadow-xs"
                    id={`admin-order-card-${o.id}`}
                  >
                    {/* Collapsed Header */}
                    <div className="p-4 bg-slate-50/60 sm:flex sm:items-center sm:justify-between gap-4">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 flex-1">
                        <div>
                          <p className="text-[9px] font-bold text-slate-400 uppercase">Customer / Contact</p>
                          <p className="text-xs font-bold text-slate-800 line-clamp-1">{o.customerName}</p>
                          <p className="text-[10px] text-slate-500 font-mono">{o.customerPhone}</p>
                        </div>

                        <div>
                          <p className="text-[9px] font-bold text-slate-400 uppercase">Placed Date</p>
                          <p className="text-xs font-semibold text-slate-700">
                            {new Date(o.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>

                        <div>
                          <p className="text-[9px] font-bold text-slate-400 uppercase">Invoice Value</p>
                          <p className="text-xs font-extrabold text-indigo-600 font-mono">₹{o.total.toLocaleString('en-IN')}</p>
                        </div>

                        <div>
                          <p className="text-[9px] font-bold text-slate-400 uppercase">Logistics Status</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {o.orderStatus === 'pending' && <span className="px-2 py-0.5 text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-100 rounded-full flex items-center gap-0.5">Pending</span>}
                            {o.orderStatus === 'approved' && <span className="px-2 py-0.5 text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full flex items-center gap-0.5">Approved</span>}
                            {o.orderStatus === 'shipped' && <span className="px-2 py-0.5 text-[9px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-full flex items-center gap-0.5">Shipped</span>}
                            {o.orderStatus === 'delivered' && <span className="px-2 py-0.5 text-[9px] font-bold text-green-700 bg-green-50 border border-green-100 rounded-full flex items-center gap-0.5">Delivered</span>}
                            {o.orderStatus === 'cancelled' && <span className="px-2 py-0.5 text-[9px] font-bold text-rose-700 bg-rose-50 border border-rose-100 rounded-full flex items-center gap-0.5">Cancelled</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mt-4 sm:mt-0 justify-end">
                        <button
                          onClick={() => setExpandedOrderId(isExpanded ? null : o.id)}
                          id={`expand-order-btn-${o.id}`}
                          className="px-2.5 py-1.5 border border-slate-200 hover:border-slate-300 text-slate-600 text-xs font-bold bg-white rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>{isExpanded ? "Hide Details" : "Inspect Order"}</span>
                        </button>
                      </div>
                    </div>

                    {/* Expanded Content Drawer */}
                    {isExpanded && (
                      <div className="p-4 border-t border-slate-100 bg-white grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in text-xs font-semibold text-slate-600">
                        {/* Column 1: Shipping destination & Geotag coordinates */}
                        <div className="space-y-2">
                          <h5 className="font-extrabold text-slate-800 uppercase tracking-wider border-b border-slate-50 pb-1 flex items-center gap-1.5">
                            <Map className="w-3.5 h-3.5 text-rose-500" />
                            <span>Geotag & Logistics</span>
                          </h5>
                          <p className="font-bold text-slate-800 text-xs">{o.shippingAddress.fullName}</p>
                          <p>{o.shippingAddress.street}</p>
                          {o.shippingAddress.landmark && <p>Landmark: {o.shippingAddress.landmark}</p>}
                          <p>{o.shippingAddress.city}, {o.shippingAddress.state} - <strong className="font-bold text-slate-800">{o.shippingAddress.pincode}</strong></p>
                          
                          {/* Coordinates Indicator */}
                          {o.locationCoordinates ? (
                            <div className="bg-emerald-50 border border-emerald-100 p-2.5 rounded-lg text-emerald-700 mt-2">
                              <p className="font-bold uppercase tracking-wider text-[8px]">Coordinates Detected:</p>
                              <p className="font-mono mt-0.5 text-[10px]">Lat: {o.locationCoordinates.latitude.toFixed(6)}° N</p>
                              <p className="font-mono text-[10px]">Lng: {o.locationCoordinates.longitude.toFixed(6)}° E</p>
                              <p className="text-[8px] text-emerald-600 font-medium mt-1">✓ Order placed directly from customer location Geotag.</p>
                            </div>
                          ) : (
                            <div className="bg-slate-50 p-2 rounded-lg text-slate-500 mt-2 text-[10px]">
                              <span>No Coordinates available (Manual entry)</span>
                            </div>
                          )}
                        </div>

                        {/* Column 2: Items list purchased */}
                        <div className="space-y-2">
                          <h5 className="font-extrabold text-slate-800 uppercase tracking-wider border-b border-slate-50 pb-1">Purchased Products</h5>
                          <div className="space-y-2 max-h-40 overflow-y-auto">
                            {o.items.map((item) => (
                              <div key={item.productId} className="flex gap-2.5 items-center">
                                <img src={item.imageUrl} className="w-8 h-8 rounded object-cover bg-slate-50" referrerPolicy="no-referrer" />
                                <div className="min-w-0 flex-1">
                                  <p className="font-bold text-slate-700 truncate leading-tight">{item.name}</p>
                                  <p className="text-slate-400 text-[10px] font-mono">{item.quantity} × ₹{item.price}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                          
                          <div className="pt-2 border-t border-slate-100 text-[10px] space-y-1">
                            <div className="flex justify-between">
                              <span>Subtotal:</span>
                              <span className="font-mono text-slate-700">₹{o.subtotal}</span>
                            </div>
                            {o.discount > 0 && (
                              <div className="flex justify-between text-emerald-600">
                                <span>Discount:</span>
                                <span className="font-mono font-bold">-₹{o.discount}</span>
                              </div>
                            )}
                            <div className="flex justify-between">
                              <span>SGST/CGST GST Tax:</span>
                              <span className="font-mono text-slate-700">₹{o.tax}</span>
                            </div>
                          </div>
                        </div>

                        {/* Column 3: Logistics workflow & Payment Status Override */}
                        <div className="space-y-3 bg-slate-50/50 p-3 rounded-xl border border-slate-100 h-fit">
                          <h5 className="font-extrabold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-1.5">Logistics & Transaction Actions</h5>
                          
                          <div className="space-y-1.5 text-[10px]">
                            <div className="flex justify-between">
                              <span>Payment Status:</span>
                              <span className={`font-bold uppercase ${o.paymentStatus === 'confirmed' ? 'text-emerald-600' : 'text-amber-600'}`}>{o.paymentStatus}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Method:</span>
                              <span className="font-bold text-slate-700 uppercase">{o.paymentMethod}</span>
                            </div>
                            {o.paymentDetails?.transactionId && (
                              <div className="flex justify-between">
                                <span>Transaction ID:</span>
                                <span className="font-mono font-bold text-slate-700">{o.paymentDetails.transactionId}</span>
                              </div>
                            )}
                          </div>

                          {/* Quick Workflow Stepper Override */}
                          <div className="pt-3 border-t border-slate-200/60 flex flex-wrap gap-1.5">
                            {o.orderStatus === 'pending' && (
                              <>
                                <button
                                  onClick={async () => {
                                    await onUpdateOrderStatus(o.id, 'approved', 'confirmed');
                                  }}
                                  id={`approve-order-btn-${o.id}`}
                                  className="py-1 px-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded text-[10px] transition-colors cursor-pointer"
                                >
                                  Approve & Confirm Pay
                                </button>
                                <button
                                  onClick={async () => {
                                    await onUpdateOrderStatus(o.id, 'cancelled');
                                  }}
                                  id={`cancel-order-btn-${o.id}`}
                                  className="py-1 px-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded text-[10px] transition-colors cursor-pointer"
                                >
                                  Cancel Order
                                </button>
                              </>
                            )}

                            {o.orderStatus === 'approved' && (
                              <button
                                onClick={async () => {
                                  await onUpdateOrderStatus(o.id, 'shipped');
                                }}
                                id={`ship-order-btn-${o.id}`}
                                className="py-1 px-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded text-[10px] transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <Truck className="w-3 h-3" />
                                <span>Dispatch Courier</span>
                              </button>
                            )}

                            {o.orderStatus === 'shipped' && (
                              <button
                                onClick={async () => {
                                  await onUpdateOrderStatus(o.id, 'delivered');
                                }}
                                id={`deliver-order-btn-${o.id}`}
                                className="py-1 px-2.5 bg-green-600 hover:bg-green-500 text-white font-bold rounded text-[10px] transition-colors cursor-pointer"
                              >
                                Mark Delivered
                              </button>
                            )}

                            {o.paymentStatus === 'pending' && o.orderStatus !== 'cancelled' && (
                              <button
                                onClick={async () => {
                                  await onUpdateOrderStatus(o.id, o.orderStatus, 'confirmed');
                                }}
                                id={`confirm-pay-btn-${o.id}`}
                                className="py-1 px-2.5 border border-emerald-600 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 font-bold rounded text-[10px] transition-colors cursor-pointer"
                              >
                                Confirm Payment Recieved
                              </button>
                            )}

                            {(o.orderStatus === 'delivered' || o.orderStatus === 'cancelled') && (
                              <span className="text-[10px] text-slate-400 font-bold italic">Logistics process complete.</span>
                            )}
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
      )}
    </div>
  );
}
