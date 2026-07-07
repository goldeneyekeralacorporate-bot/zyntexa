import React, { useState, useEffect } from 'react';
import { 
  Plus, Edit, Trash2, CheckCircle, XCircle, Clock, Truck, ShieldAlert,
  Layers, DollarSign, Package, ShoppingBag, Eye, Map, Percent, ArrowUpRight, Download, Settings, Mail 
} from 'lucide-react';
import { Product, Order, StoreSettings, UserProfile } from '../types';
import GmailCommsHub from './GmailCommsHub';
import { getAccessToken, setAccessToken, googleSignIn } from '../lib/firebase';

interface AdminPanelProps {
  products: Product[];
  orders: Order[];
  onAddProduct: (product: Omit<Product, 'id'>) => Promise<void>;
  onUpdatePrice: (productId: string, newPrice: number) => Promise<void>;
  onUpdateProduct: (productId: string, updates: Partial<Product>) => Promise<void>;
  onDeleteProduct: (productId: string) => Promise<void>;
  onUpdateOrderStatus: (orderId: string, status: Order['orderStatus'], paymentStatus?: Order['paymentStatus']) => Promise<void>;
  onClearAllOrders: () => Promise<void>;
  settings: StoreSettings;
  onUpdateSettings: (settings: StoreSettings) => Promise<void>;
  currentUser: UserProfile | null;
  onLoginSuccess: (profile: UserProfile) => void;
  onResetDatabase?: () => Promise<void>;
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
  onUpdateOrderStatus,
  onClearAllOrders,
  settings,
  onUpdateSettings,
  currentUser,
  onLoginSuccess,
  onResetDatabase
}: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<'products' | 'orders' | 'settings' | 'gmail'>('products');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Local settings form state
  const [cgstVal, setCgstVal] = useState('9');
  const [sgstVal, setSgstVal] = useState('9');
  const [deliveryVal, setDeliveryVal] = useState('150');
  const [thresholdVal, setThresholdVal] = useState('4999');
  const [promoBannerActive, setPromoBannerActive] = useState(false);
  const [promoBannerTextActive, setPromoBannerTextActive] = useState(true);
  const [promoBannerImageActive, setPromoBannerImageActive] = useState(false);
  const [promoBannerImageOverlayTextActive, setPromoBannerImageOverlayTextActive] = useState(true);
  const [promoBannerText, setPromoBannerText] = useState('');
  const [promoBannerType, setPromoBannerType] = useState<'text' | 'image'>('text');
  const [promoBannerImageUrl, setPromoBannerImageUrl] = useState('');
  const [promoBannerLinkUrl, setPromoBannerLinkUrl] = useState('');
  const [promoBannerTextSize, setPromoBannerTextSize] = useState<'xs' | 'sm' | 'md' | 'lg'>('xs');
  const [promoBannerTextColor, setPromoBannerTextColor] = useState('#ffffff');
  const [promoBannerBgColor, setPromoBannerBgColor] = useState('#4f46e5');
  const [promoBannerOverlayOpacity, setPromoBannerOverlayOpacity] = useState(40);
  const [promoBannerScrollEnabled, setPromoBannerScrollEnabled] = useState(true);
  const [promoBannerScrollDirection, setPromoBannerScrollDirection] = useState<'left-to-right' | 'right-to-left'>('left-to-right');
  const [promoBannerScrollSpeed, setPromoBannerScrollSpeed] = useState<'slow' | 'medium' | 'fast'>('slow');

  // Banner upload specific states
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [bannerUploadError, setBannerUploadError] = useState<string | null>(null);
  const [bannerUploadSuccess, setBannerUploadSuccess] = useState<string | null>(null);

  // Sync settings when loaded/updated from prop
  useEffect(() => {
    if (settings) {
      setCgstVal(settings.cgstPercent?.toString() || '9');
      setSgstVal(settings.sgstPercent?.toString() || '9');
      setDeliveryVal(settings.deliveryCharge?.toString() || '150');
      setThresholdVal(settings.freeShippingThreshold?.toString() || '4999');
      setPromoBannerActive(!!settings.promoBannerActive);
      setPromoBannerTextActive(settings.promoBannerTextActive !== undefined ? !!settings.promoBannerTextActive : true);
      setPromoBannerImageActive(settings.promoBannerImageActive !== undefined ? !!settings.promoBannerImageActive : !!settings.promoBannerActive);
      setPromoBannerImageOverlayTextActive(settings.promoBannerImageOverlayTextActive !== undefined ? !!settings.promoBannerImageOverlayTextActive : true);
      setPromoBannerText(settings.promoBannerText || "✨ Special Launch Offer: Get free delivery on all orders above ₹4,999! ✨");
      setPromoBannerType(settings.promoBannerType || 'text');
      setPromoBannerImageUrl(settings.promoBannerImageUrl || '');
      setPromoBannerLinkUrl(settings.promoBannerLinkUrl || '');
      setPromoBannerTextSize(settings.promoBannerTextSize || 'xs');
      setPromoBannerTextColor(settings.promoBannerTextColor || '#ffffff');
      setPromoBannerBgColor(settings.promoBannerBgColor || '#4f46e5');
      setPromoBannerOverlayOpacity(settings.promoBannerOverlayOpacity !== undefined ? settings.promoBannerOverlayOpacity : 40);
      setPromoBannerScrollEnabled(settings.promoBannerScrollEnabled !== undefined ? !!settings.promoBannerScrollEnabled : true);
      setPromoBannerScrollDirection(settings.promoBannerScrollDirection || 'left-to-right');
      setPromoBannerScrollSpeed(settings.promoBannerScrollSpeed || 'slow');
    }
  }, [settings]);

  const handleBannerFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith('image/')) {
        setBannerUploadError("Please select a valid image file (PNG, JPG, WEBP).");
        setBannerFile(null);
        return;
      }
      setBannerFile(file);
      setUploadingBanner(true);
      setBannerUploadError(null);
      setBannerUploadSuccess(null);

      try {
        if (uploadProvider === 'imgbb') {
          const activeKey = imgbbKey.trim();
          if (!activeKey) {
            throw new Error("Please input your free ImgBB API Key under 'Store Image Loader' or in settings first.");
          }
          const formData = new FormData();
          formData.append('image', file);
          const res = await fetch(`https://api.imgbb.com/1/upload?key=${activeKey}`, {
            method: 'POST',
            body: formData
          });
          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData?.error?.message || `ImgBB upload failed with status ${res.status}`);
          }
          const resJson = await res.json();
          if (resJson && resJson.data && resJson.data.url) {
            setPromoBannerImageUrl(resJson.data.url);
            setBannerUploadSuccess("Banner image successfully uploaded to ImgBB and URL populated!");
          } else {
            throw new Error("Could not retrieve image URL from ImgBB response.");
          }
        } else {
          // Google Drive
          const token = driveToken || getAccessToken();
          if (!token) {
            throw new Error("No active Google session. Please click 'Authorize Google Drive Uploads' under 'Store Image Loader' first.");
          }
          const metadata = {
            name: `zyntexa_banner_${Date.now()}_${file.name}`,
            mimeType: file.type,
          };
          const formData = new FormData();
          formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
          formData.append('file', file);

          const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`
            },
            body: formData
          });

          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData?.error?.message || `Google Drive upload failed with status ${res.status}`);
          }

          const driveFile = await res.json();
          const fileId = driveFile.id;
          if (!fileId) {
            throw new Error("Failed to retrieve file ID from Google Drive response.");
          }

          // Make public
          await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              role: 'reader',
              type: 'anyone'
            })
          });

          const directUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;
          setPromoBannerImageUrl(directUrl);
          setBannerUploadSuccess("Banner image successfully uploaded to Google Drive & URL populated!");
        }
      } catch (err: any) {
        console.error("Banner upload error:", err);
        setBannerUploadError(err.message || "An error occurred during banner image upload.");
        setBannerFile(null);
      } finally {
        setUploadingBanner(false);
      }
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const cgstNum = Number(cgstVal);
      const sgstNum = Number(sgstVal);
      const deliveryNum = Number(deliveryVal);
      const thresholdNum = Number(thresholdVal);

      if (isNaN(cgstNum) || cgstNum < 0 || cgstNum > 100) {
        setError('Please enter a valid CGST percentage between 0 and 100.');
        setLoading(false);
        return;
      }
      if (isNaN(sgstNum) || sgstNum < 0 || sgstNum > 100) {
        setError('Please enter a valid SGST percentage between 0 and 100.');
        setLoading(false);
        return;
      }
      if (isNaN(deliveryNum) || deliveryNum < 0) {
        setError('Please enter a valid delivery charge (0 or positive).');
        setLoading(false);
        return;
      }
      if (isNaN(thresholdNum) || thresholdNum < 0) {
        setError('Please enter a valid free shipping threshold (0 or positive).');
        setLoading(false);
        return;
      }

      await onUpdateSettings({
        cgstPercent: cgstNum,
        sgstPercent: sgstNum,
        deliveryCharge: deliveryNum,
        freeShippingThreshold: thresholdNum,
        promoBannerActive: promoBannerImageActive || promoBannerTextActive,
        promoBannerTextActive,
        promoBannerImageActive,
        promoBannerImageOverlayTextActive,
        promoBannerText,
        promoBannerType,
        promoBannerImageUrl,
        promoBannerLinkUrl,
        promoBannerTextSize,
        promoBannerTextColor,
        promoBannerBgColor,
        promoBannerOverlayOpacity: Number(promoBannerOverlayOpacity),
        promoBannerScrollEnabled,
        promoBannerScrollDirection,
        promoBannerScrollSpeed
      });
      setSuccess('Store settings, including the promotional banner with free image uploader, updated successfully!');
    } catch (err) {
      setError('Failed to update store settings.');
    } finally {
      setLoading(false);
    }
  };

  // New Product State
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newCategory, setNewCategory] = useState('Apparel');
  const [newStock, setNewStock] = useState('20');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newImages, setNewImages] = useState<string[]>([]);
  const [newFeatured, setNewFeatured] = useState(false);

  // Image Upload Integration States
  const [uploadProvider, setUploadProvider] = useState<'imgbb' | 'drive'>(() => {
    return (localStorage.getItem('zyntexa_upload_provider') as 'imgbb' | 'drive') || 'imgbb';
  });

  // ImgBB state
  const [imgbbKey, setImgbbKey] = useState<string>(() => localStorage.getItem('zyntexa_imgbb_key') || '');
  const [uploadingToImgbb, setUploadingToImgbb] = useState(false);
  const [imgbbError, setImgbbError] = useState<string | null>(null);
  const [imgbbSuccess, setImgbbSuccess] = useState<string | null>(null);

  // Custom Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void | Promise<void>;
    confirmText?: string;
    isDanger?: boolean;
  } | null>(null);

  // Google Drive state
  const [driveToken, setDriveToken] = useState<string | null>(getAccessToken());
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingToDrive, setUploadingToDrive] = useState(false);
  const [driveError, setDriveError] = useState<string | null>(null);
  const [driveSuccess, setDriveSuccess] = useState<string | null>(null);

  const handleConnectDrive = async () => {
    setDriveError(null);
    try {
      const result = await googleSignIn();
      if (result && result.accessToken) {
        setDriveToken(result.accessToken);
        setDriveSuccess("Successfully connected to Google Drive!");
        setTimeout(() => setDriveSuccess(null), 3000);
      } else {
        throw new Error("No access token received from Google authentication.");
      }
    } catch (err: any) {
      console.error("Connect Drive Error:", err);
      setDriveError(err.message || "Failed to authenticate with Google Drive.");
    }
  };

  const uploadFileToDrive = async (file: File) => {
    const token = driveToken || getAccessToken();
    if (!token) {
      setDriveError("No active Google session. Please click 'Authorize Google Drive Uploads' first.");
      setSelectedFile(null);
      return;
    }

    setUploadingToDrive(true);
    setDriveError(null);
    setDriveSuccess(null);

    try {
      // Step 1: Create file & Upload media content in multipart format
      const metadata = {
        name: `zyntexa_${Date.now()}_${file.name}`,
        mimeType: file.type,
      };

      const formData = new FormData();
      formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      formData.append('file', file);

      const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error?.message || `Upload failed with status ${res.status}`);
      }

      const driveFile = await res.json();
      const fileId = driveFile.id;

      if (!fileId) {
        throw new Error("Failed to retrieve file ID from Google Drive response.");
      }

      // Step 2: Make the file public so anyone can view it in the product catalog
      const permissionRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          role: 'reader',
          type: 'anyone'
        })
      });

      if (!permissionRes.ok) {
        console.warn("Could not set reader permission on Google Drive file.");
      }

      // Step 3: Construct direct raw web access URL
      // https://drive.google.com/uc?export=view&id={fileId}
      const directUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;
      setNewImageUrl(directUrl);
      setDriveSuccess("Image directly uploaded to Google Drive & link populated!");
      setTimeout(() => setDriveSuccess(null), 5000);
    } catch (err: any) {
      console.error("Direct Upload to Drive Error:", err);
      setDriveError(err.message || "An error occurred during direct file upload.");
      setSelectedFile(null);
    } finally {
      setUploadingToDrive(false);
    }
  };

  const uploadFileToImgbb = async (file: File) => {
    const activeKey = imgbbKey.trim();
    if (!activeKey) {
      setImgbbError("Please input your free ImgBB API Key below before uploading.");
      setSelectedFile(null);
      return;
    }

    setUploadingToImgbb(true);
    setImgbbError(null);
    setImgbbSuccess(null);

    try {
      const formData = new FormData();
      formData.append('image', file);

      // ImgBB API upload endpoint: https://api.imgbb.com/1/upload?key=KEY
      const res = await fetch(`https://api.imgbb.com/1/upload?key=${activeKey}`, {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error?.message || `ImgBB upload failed with status ${res.status}`);
      }

      const resJson = await res.json();
      if (resJson && resJson.data && resJson.data.url) {
        const directUrl = resJson.data.url;
        setNewImageUrl(directUrl);
        setImgbbSuccess("Image successfully uploaded to ImgBB and public link populated!");
        setTimeout(() => setImgbbSuccess(null), 5000);
      } else {
        throw new Error("Could not find the uploaded image URL in the ImgBB response.");
      }
    } catch (err: any) {
      console.error("ImgBB Upload Error:", err);
      setImgbbError(err.message || "An error occurred during ImgBB upload.");
      setSelectedFile(null);
    } finally {
      setUploadingToImgbb(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith('image/')) {
        const errText = "Please select a valid image file (PNG, JPG, WEBP).";
        if (uploadProvider === 'imgbb') {
          setImgbbError(errText);
        } else {
          setDriveError(errText);
        }
        setSelectedFile(null);
        return;
      }
      setSelectedFile(file);
      
      if (uploadProvider === 'imgbb') {
        setImgbbError(null);
        setImgbbSuccess(null);
        await uploadFileToImgbb(file);
      } else {
        setDriveError(null);
        setDriveSuccess(null);
        await uploadFileToDrive(file);
      }
    }
  };

  // Full Product Edit State
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const handleStartEdit = (p: Product) => {
    setEditingProduct(p);
    setNewName(p.name);
    setNewDescription(p.description);
    setNewPrice(p.price.toString());
    setNewCategory(p.category);
    setNewStock(p.stock.toString());
    setNewImageUrl(p.imageUrl);
    setNewImages(p.images || []);
    setNewFeatured(p.featured || false);
    
    const formElement = document.getElementById('admin-product-form');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleCancelEdit = () => {
    setEditingProduct(null);
    setNewName('');
    setNewDescription('');
    setNewPrice('');
    setNewCategory('Apparel');
    setNewStock('20');
    setNewImageUrl('');
    setNewImages([]);
    setNewFeatured(false);
  };

  // Expanded Order State
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  // Inline Price/Stock Editors for active list
  const [editingProdId, setEditingProdId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const [editStock, setEditStock] = useState('');

  const handleExportCSV = () => {
    if (orders.length === 0) {
      setError('No orders available to export.');
      return;
    }

    const headers = [
      'Order ID',
      'Customer Name',
      'Customer Phone',
      'Placed Date',
      'Subtotal (INR)',
      'Discount (INR)',
      'Tax (INR)',
      'Total Value (INR)',
      'Payment Status',
      'Order Status',
      'Payment Method',
      'Transaction ID',
      'Shipping Recipient',
      'Shipping Address',
      'Pincode',
      'Latitude',
      'Longitude',
      'Items Purchased'
    ];

    const escapeCSV = (val: any) => {
      if (val === null || val === undefined) return '';
      let str = String(val);
      str = str.replace(/"/g, '""');
      if (str.includes(',') || str.includes('\n') || str.includes('\r') || str.includes('"')) {
        return `"${str}"`;
      }
      return str;
    };

    const rows = orders.map(o => {
      const formattedItems = o.items.map(item => `${item.name} (Qty: ${item.quantity})`).join('; ');
      const fullAddress = `${o.shippingAddress.street}${o.shippingAddress.landmark ? `, Landmark: ${o.shippingAddress.landmark}` : ''}, ${o.shippingAddress.city}, ${o.shippingAddress.state}`;

      return [
        o.id,
        o.customerName,
        o.customerPhone,
        new Date(o.createdAt).toISOString(),
        o.subtotal,
        o.discount,
        o.tax,
        o.total,
        o.paymentStatus,
        o.orderStatus,
        o.paymentMethod,
        o.paymentDetails?.transactionId || 'N/A',
        o.shippingAddress.fullName,
        fullAddress,
        o.shippingAddress.pincode,
        o.locationCoordinates?.latitude || '',
        o.locationCoordinates?.longitude || '',
        formattedItems
      ].map(escapeCSV);
    });

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `zyntexa_orders_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setSuccess('Order database exported to CSV successfully!');
  };

  const handleClearAllOrders = () => {
    setConfirmModal({
      isOpen: true,
      title: "Clear Real-time Order Book",
      message: "Are you absolutely sure you want to clear all orders? This will permanently delete all records from the real-time order book. This action is irreversible.",
      isDanger: true,
      confirmText: "Clear All Orders",
      onConfirm: async () => {
        setError('');
        setSuccess('');
        setLoading(true);
        try {
          await onClearAllOrders();
          setSuccess('All orders in the real-time order book have been cleared successfully!');
        } catch (err: any) {
          setError(err?.message || 'Failed to clear all orders.');
        } finally {
          setLoading(false);
          setConfirmModal(null);
        }
      }
    });
  };

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
      const cleanImages = newImages.filter(img => img.trim() !== '');
      if (editingProduct) {
        await onUpdateProduct(editingProduct.id, {
          name: newName,
          description: newDescription,
          price: priceNum,
          category: newCategory,
          stock: stockNum,
          imageUrl: newImageUrl,
          images: cleanImages,
          featured: newFeatured
        });
        setSuccess(`Product "${newName}" updated successfully!`);
        handleCancelEdit();
      } else {
        await onAddProduct({
          name: newName,
          description: newDescription,
          price: priceNum,
          category: newCategory,
          stock: stockNum,
          imageUrl: newImageUrl,
          images: cleanImages,
          featured: newFeatured
        });

        setSuccess(`Product "${newName}" added successfully to the catalog!`);
        // Reset
        setNewName('');
        setNewDescription('');
        setNewPrice('');
        setNewImageUrl('');
        setNewImages([]);
        setNewFeatured(false);
      }
    } catch (err) {
      setError(editingProduct ? 'Failed to update product.' : 'Failed to create product. Check database connection.');
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

        <button
          onClick={() => setActiveTab('settings')}
          id="admin-settings-tab-btn"
          className={`py-3 px-5 text-sm font-extrabold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === 'settings'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Settings className="w-4.5 h-4.5" />
          <span>Taxes & Shipping Settings</span>
        </button>

        <button
          onClick={() => setActiveTab('gmail')}
          id="admin-gmail-tab-btn"
          className={`py-3 px-5 text-sm font-extrabold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === 'gmail'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Mail className="w-4.5 h-4.5" />
          <span>Support & Communications</span>
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
          <div id="admin-product-form" className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 h-fit space-y-4">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2 border-b border-slate-50 pb-3">
              {editingProduct ? (
                <>
                  <Edit className="w-5 h-5 text-indigo-600 animate-pulse" />
                  <span className="truncate">Edit Product: {editingProduct.name}</span>
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5 text-indigo-600" />
                  <span>Launch New Product</span>
                </>
              )}
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

                {/* Image Upload Integration Box */}
                <div className="mt-2.5 mb-4 p-3.5 bg-slate-50 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between mb-3 border-b border-slate-200/60 pb-2">
                    <span className="text-[10px] font-black text-slate-600 uppercase flex items-center gap-1.5">
                      <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Store Image Loader
                    </span>
                    <div className="flex bg-slate-200/70 p-0.5 rounded-lg">
                      <button
                        type="button"
                        onClick={() => {
                          setUploadProvider('imgbb');
                          localStorage.setItem('zyntexa_upload_provider', 'imgbb');
                        }}
                        className={`px-2 py-1 text-[8px] font-black uppercase tracking-wider rounded-md transition-all ${
                          uploadProvider === 'imgbb'
                            ? 'bg-white text-indigo-600 shadow-xs'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        ImgBB (Free)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setUploadProvider('drive');
                          localStorage.setItem('zyntexa_upload_provider', 'drive');
                        }}
                        className={`px-2 py-1 text-[8px] font-black uppercase tracking-wider rounded-md transition-all ${
                          uploadProvider === 'drive'
                            ? 'bg-white text-indigo-600 shadow-xs'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Google Drive
                      </button>
                    </div>
                  </div>

                  {uploadProvider === 'imgbb' ? (
                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-[9px] font-black text-slate-500 uppercase">ImgBB API Key (Saved Locally)</label>
                          <a
                            href="https://api.imgbb.com/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[9px] font-bold text-indigo-600 hover:underline"
                          >
                            Get Free Key ↗
                          </a>
                        </div>
                        <input
                          type="password"
                          placeholder="Paste your free ImgBB API key here..."
                          value={imgbbKey}
                          onChange={(e) => {
                            const val = e.target.value;
                            setImgbbKey(val);
                            localStorage.setItem('zyntexa_imgbb_key', val);
                          }}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500 text-[11px] font-medium bg-white"
                        />
                      </div>

                      <div className="border-2 border-dashed border-slate-200 rounded-lg p-3.5 text-center bg-white hover:bg-slate-50/50 transition-all relative cursor-pointer group">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          disabled={uploadingToImgbb}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <div className="flex flex-col items-center justify-center gap-1">
                          {uploadingToImgbb ? (
                            <>
                              <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                              <span className="text-xs font-bold text-indigo-600 animate-pulse">Uploading to ImgBB...</span>
                              <span className="text-[10px] text-slate-400">Hosting image permanently & for free</span>
                            </>
                          ) : selectedFile ? (
                            <>
                              <span className="text-xs font-bold text-indigo-600 truncate max-w-full px-2">Selected: {selectedFile.name}</span>
                              <span className="text-[10px] text-slate-400 font-mono">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB • Uploaded!</span>
                            </>
                          ) : (
                            <>
                              <span className="text-xs font-bold text-slate-600 group-hover:text-indigo-600">Select image file</span>
                              <span className="text-[10px] text-slate-400">Uploads and saves directly to ImgBB host</span>
                            </>
                          )}
                        </div>
                      </div>

                      {imgbbError && (
                        <p className="text-[10px] font-bold text-red-500 bg-red-50 px-2.5 py-1.5 rounded-lg border border-red-100">{imgbbError}</p>
                      )}
                      {imgbbSuccess && (
                        <p className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-100">{imgbbSuccess}</p>
                      )}
                    </div>
                  ) : (
                    <div>
                      {/* Google Drive Upload Integration */}
                      {driveToken ? (
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-slate-200">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                              <span className="text-[10px] text-slate-600 font-bold truncate max-w-[140px]">Authenticated to Drive</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setDriveToken(null);
                                setAccessToken(null);
                              }}
                              className="text-[9px] font-extrabold text-red-500 hover:text-red-600 uppercase tracking-wider cursor-pointer"
                            >
                              Disconnect
                            </button>
                          </div>

                          <div className="border-2 border-dashed border-slate-200 rounded-lg p-3.5 text-center bg-white hover:bg-slate-50/50 transition-all relative cursor-pointer group">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleFileChange}
                              disabled={uploadingToDrive}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            />
                            <div className="flex flex-col items-center justify-center gap-1">
                              {uploadingToDrive ? (
                                <>
                                  <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                                  <span className="text-xs font-bold text-indigo-600 animate-pulse">Uploading directly to Drive...</span>
                                  <span className="text-[10px] text-slate-400">Securing your public access image link</span>
                                </>
                              ) : selectedFile ? (
                                <>
                                  <span className="text-xs font-bold text-indigo-600 truncate max-w-full px-2">Selected: {selectedFile.name}</span>
                                  <span className="text-[10px] text-slate-400 font-mono">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB • Uploaded!</span>
                                </>
                              ) : (
                                <>
                                  <span className="text-xs font-bold text-slate-600 group-hover:text-indigo-600">Select local image file</span>
                                  <span className="text-[10px] text-slate-400">Instantly uploads and populates Drive link</span>
                                </>
                              )}
                            </div>
                          </div>

                          {driveError && (
                            <p className="text-[10px] font-bold text-red-500 bg-red-50 px-2.5 py-1.5 rounded-lg border border-red-100">{driveError}</p>
                          )}
                          {driveSuccess && (
                            <p className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-100">{driveSuccess}</p>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-2 px-1">
                          <p className="text-[10px] text-slate-500 mb-2">
                            Upload custom high-fidelity photos directly to your own Google Drive storage securely.
                          </p>
                          <button
                            type="button"
                            onClick={handleConnectDrive}
                            className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-extrabold rounded-lg shadow-sm transition-all cursor-pointer"
                          >
                            Authorize Google Drive Uploads
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

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

                {/* Additional Gallery Photos Section */}
                <div className="space-y-2 border-t border-slate-100 pt-3.5 mt-3.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Additional Gallery Photos ({newImages.length})</label>
                    <span className="text-[9px] text-slate-400 font-medium">Allows up to 6 photos</span>
                  </div>
                  
                  {newImages.length > 0 ? (
                    <div className="space-y-2">
                      {newImages.map((imgUrl, idx) => (
                        <div key={idx} className="flex gap-2 items-center">
                          <input
                            type="text"
                            placeholder="Additional image URL..."
                            value={imgUrl}
                            onChange={(e) => {
                              const updated = [...newImages];
                              updated[idx] = e.target.value;
                              setNewImages(updated);
                            }}
                            className="flex-grow px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500 text-[11px] font-medium"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const updated = [...newImages];
                              updated.splice(idx, 1);
                              setNewImages(updated);
                            }}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 hover:text-rose-600 rounded-lg border border-slate-200 hover:border-rose-100 transition-colors cursor-pointer shrink-0"
                            title="Remove photo"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-2 bg-slate-50 border border-slate-100 rounded-lg text-[10px] text-slate-400 font-medium">
                      No extra gallery photos added. Only main image will show.
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setNewImages([...newImages, ''])}
                      className="flex-1 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add URL Input</span>
                    </button>
                    {newImageUrl && !newImages.includes(newImageUrl) && (
                      <button
                        type="button"
                        onClick={() => setNewImages([...newImages, newImageUrl])}
                        className="flex-1 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-[10px] font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Main to Gallery</span>
                      </button>
                    )}
                  </div>
                </div>

              </div>

              <div className="flex gap-2">
                {editingProduct && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-extrabold rounded-xl transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  id="admin-create-product-btn"
                  className="flex-[2] py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold rounded-xl transition-all shadow-md shadow-indigo-100 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {loading ? (
                    editingProduct ? 'Saving...' : 'Adding to Firestore...'
                  ) : (
                    editingProduct ? 'Save Changes' : 'Launch Product Live'
                  )}
                </button>
              </div>
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
                        onClick={() => handleStartEdit(p)}
                        id={`edit-product-btn-${p.id}`}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                        title="Edit product details"
                      >
                        <Edit className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => {
                          setConfirmModal({
                            isOpen: true,
                            title: "Remove Product",
                            message: `Are you sure you want to remove "${p.name}" from the public catalog?`,
                            isDanger: true,
                            confirmText: "Delete Product",
                            onConfirm: async () => {
                              try {
                                await onDeleteProduct(p.id);
                              } catch (err: any) {
                                setError(err?.message || 'Failed to delete product.');
                              } finally {
                                setConfirmModal(null);
                              }
                            }
                          });
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
      ) : activeTab === 'orders' ? (
        /* CUSTOMER ORDERS DASHBOARD TAB */
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-50 pb-3">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-600" />
              <span>Real-time Order Book ({orders.length} Records)</span>
            </h3>
            <div className="flex items-center gap-3">
              {orders.length > 0 && (
                <>
                  <button
                    onClick={handleExportCSV}
                    id="admin-export-orders-csv-btn"
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 rounded-xl transition-all cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export CSV</span>
                  </button>
                </>
              )}
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Sort: Latest Placed</span>
            </div>
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
                            {o.items.map((item, idx) => (
                              <div key={`${item.productId}_${idx}`} className="flex gap-2.5 items-center">
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
      ) : activeTab === 'settings' ? (
        /* STORE SETTINGS TAB (TAX & DELIVERY) */
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 max-w-lg mx-auto space-y-6 animate-fade-in">
          <div className="border-b border-slate-50 pb-3">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Settings className="w-5 h-5 text-indigo-600" />
              <span>Checkout Tax & Shipping Configuration</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Control global tax rates and shipping rules calculated instantly in user checkouts.</p>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  CGST Rate (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    placeholder="E.g. 9"
                    value={cgstVal}
                    onChange={(e) => setCgstVal(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    required
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-mono font-bold">%</span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  SGST Rate (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    placeholder="E.g. 9"
                    value={sgstVal}
                    onChange={(e) => setSgstVal(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    required
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-mono font-bold">%</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                Standard Delivery Charge (₹)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold">₹</span>
                <input
                  type="number"
                  placeholder="E.g. 150"
                  value={deliveryVal}
                  onChange={(e) => setDeliveryVal(e.target.value)}
                  className="w-full pl-7 pr-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  required
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Charged if customer's subtotal falls below the free delivery limit.</p>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                Free Delivery Threshold Limit (₹)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold">₹</span>
                <input
                  type="number"
                  placeholder="E.g. 4999"
                  value={thresholdVal}
                  onChange={(e) => setThresholdVal(e.target.value)}
                  className="w-full pl-7 pr-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  required
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Orders at or above this value qualify for free delivery.</p>
            </div>

            <div className="border-t border-slate-100 pt-4 space-y-6">
              <h4 className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1.5">
                <span>📢 Promotional Announcement Banners</span>
              </h4>

              {/* SECTION A: Text Announcement Bar */}
              <div className="p-4 bg-slate-50/40 rounded-2xl border border-slate-100 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="space-y-0.5">
                    <label htmlFor="promo-text-banner-toggle" className="text-xs font-black text-slate-800 cursor-pointer select-none flex items-center gap-1.5">
                      <span className="text-sm">💬</span> Text Announcement Bar
                    </label>
                    <p className="text-[10px] text-slate-400">Display a solid-colored announcement bar at the very top of the store.</p>
                  </div>
                  <button
                    type="button"
                    id="promo-text-banner-toggle"
                    onClick={() => setPromoBannerTextActive(!promoBannerTextActive)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      promoBannerTextActive ? 'bg-indigo-600' : 'bg-slate-200'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        promoBannerTextActive ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {promoBannerTextActive && (
                  <div className="space-y-4 animate-fade-in pt-1">
                    {/* Banner Announcement Text */}
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">
                        Announcement Text Message
                      </label>
                      <textarea
                        rows={2}
                        value={promoBannerText}
                        onChange={(e) => setPromoBannerText(e.target.value)}
                        placeholder="Enter announcement text..."
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                        maxLength={250}
                        required={promoBannerTextActive}
                      />
                      <p className="text-[9px] text-slate-400">Keep it short and catchy. Up to 250 characters.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Text Size */}
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">
                          Text Size
                        </label>
                        <select
                          value={promoBannerTextSize}
                          onChange={(e) => setPromoBannerTextSize(e.target.value as 'xs' | 'sm' | 'md' | 'lg')}
                          className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white text-slate-700"
                        >
                          <option value="xs">Extra Small (xs)</option>
                          <option value="sm">Small (sm)</option>
                          <option value="md">Medium (md)</option>
                          <option value="lg">Large (lg)</option>
                        </select>
                      </div>

                      {/* Banner Background Color */}
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">
                          Background Color
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            value={promoBannerBgColor}
                            onChange={(e) => setPromoBannerBgColor(e.target.value)}
                            className="w-8 h-8 rounded cursor-pointer border border-slate-200 bg-white p-0.5"
                          />
                          <input
                            type="text"
                            value={promoBannerBgColor}
                            onChange={(e) => setPromoBannerBgColor(e.target.value)}
                            placeholder="#4f46e5"
                            className="flex-1 px-2.5 py-1 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white text-slate-700"
                          />
                        </div>
                      </div>

                      {/* Text Color */}
                      <div className="space-y-1 sm:col-span-2">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">
                          Text Color
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            value={promoBannerTextColor}
                            onChange={(e) => setPromoBannerTextColor(e.target.value)}
                            className="w-8 h-8 rounded cursor-pointer border border-slate-200 bg-white p-0.5"
                          />
                          <input
                            type="text"
                            value={promoBannerTextColor}
                            onChange={(e) => setPromoBannerTextColor(e.target.value)}
                            placeholder="#ffffff"
                            className="flex-1 px-2.5 py-1 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white text-slate-700"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Presets Row */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100 mt-2">
                      <span className="text-[9px] font-bold text-slate-400">Presets:</span>
                      <button
                        type="button"
                        onClick={() => {
                          setPromoBannerBgColor('#4f46e5');
                          setPromoBannerTextColor('#ffffff');
                        }}
                        className="px-2 py-0.5 text-[9px] font-extrabold rounded bg-indigo-600 text-white shadow-xs"
                      >
                        Indigo/White
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPromoBannerBgColor('#1e293b');
                          setPromoBannerTextColor('#f8fafc');
                        }}
                        className="px-2 py-0.5 text-[9px] font-extrabold rounded bg-slate-800 text-slate-50 shadow-xs"
                      >
                        Slate/Light
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPromoBannerBgColor('#e11d48');
                          setPromoBannerTextColor('#ffffff');
                        }}
                        className="px-2 py-0.5 text-[9px] font-extrabold rounded bg-rose-600 text-white shadow-xs"
                      >
                        Rose/White
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPromoBannerBgColor('#059669');
                          setPromoBannerTextColor('#ffffff');
                        }}
                        className="px-2 py-0.5 text-[9px] font-extrabold rounded bg-emerald-600 text-white shadow-xs"
                      >
                        Emerald/White
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPromoBannerBgColor('#fef08a');
                          setPromoBannerTextColor('#0f172a');
                        }}
                        className="px-2 py-0.5 text-[9px] font-extrabold rounded bg-yellow-200 text-slate-900 shadow-xs border border-yellow-300"
                      >
                        Yellow/Slate
                      </button>
                    </div>

                    {/* Scrolling/Marquee Config */}
                    <div className="pt-3 border-t border-slate-200/60 mt-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                            🔄 Continuous Moving Text (Marquee)
                          </span>
                          <p className="text-[10px] text-slate-400">
                            Make the text announcement continuously scroll slowly across the screen.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setPromoBannerScrollEnabled(!promoBannerScrollEnabled)}
                          className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            promoBannerScrollEnabled ? 'bg-indigo-600' : 'bg-slate-200'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                              promoBannerScrollEnabled ? 'translate-x-4' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>

                      {promoBannerScrollEnabled && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-2.5 border-l-2 border-indigo-500/25 mt-2">
                          <div className="space-y-1">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase">
                              Scroll Direction
                            </label>
                            <select
                              value={promoBannerScrollDirection}
                              onChange={(e) => setPromoBannerScrollDirection(e.target.value as any)}
                              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                            >
                              <option value="left-to-right">Left to Right ➡️</option>
                              <option value="right-to-left">Right to Left ⬅️</option>
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase">
                              Scroll Speed
                            </label>
                            <select
                              value={promoBannerScrollSpeed}
                              onChange={(e) => setPromoBannerScrollSpeed(e.target.value as any)}
                              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                            >
                              <option value="slow">Slow (Continuous Flow)</option>
                              <option value="medium">Medium</option>
                              <option value="fast">Fast</option>
                            </select>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION B: Graphic Image Banner */}
              <div className="p-4 bg-slate-50/40 rounded-2xl border border-slate-100 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="space-y-0.5">
                    <label htmlFor="promo-image-banner-toggle" className="text-xs font-black text-slate-800 cursor-pointer select-none flex items-center gap-1.5">
                      <span className="text-sm">🖼️</span> Graphic Image Banner
                    </label>
                    <p className="text-[10px] text-slate-400">Display a scenic promotional graphic image banner at the top of the store.</p>
                  </div>
                  <button
                    type="button"
                    id="promo-image-banner-toggle"
                    onClick={() => setPromoBannerImageActive(!promoBannerImageActive)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      promoBannerImageActive ? 'bg-indigo-600' : 'bg-slate-200'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        promoBannerImageActive ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {promoBannerImageActive && (
                  <div className="space-y-4 animate-fade-in pt-1">
                    {/* Banner Image URL Input */}
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">
                        Banner Image URL
                      </label>
                      <input
                        type="url"
                        value={promoBannerImageUrl}
                        onChange={(e) => setPromoBannerImageUrl(e.target.value)}
                        placeholder="https://example.com/banner.png"
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                        required={promoBannerImageActive}
                      />
                      <p className="text-[9px] text-slate-400">
                        Provide an image URL. Recommended size: <strong className="text-slate-600">1200 x 50px</strong> up to <strong className="text-slate-600">1920 x 80px</strong> (aspect ratio ~24:1).
                      </p>
                    </div>

                    {/* Free Image Uploader for Banner */}
                    <div className="p-3 bg-white rounded-xl border border-slate-200/60 shadow-xs">
                      <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-100">
                        <span className="text-[9px] font-black text-slate-600 uppercase flex items-center gap-1">
                          📷 Banner Image Loader
                        </span>
                        <span className="text-[9px] font-semibold text-slate-400">
                          Provider: {uploadProvider === 'imgbb' ? 'ImgBB (Free)' : 'Google Drive'}
                        </span>
                      </div>

                      {uploadProvider === 'imgbb' && (
                        <div className="mb-2.5 space-y-1">
                          <div className="flex items-center justify-between">
                            <label className="block text-[9px] font-black text-slate-500 uppercase">
                              ImgBB API Key (Saved Locally)
                            </label>
                            <a
                              href="https://api.imgbb.com/"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[9px] font-bold text-indigo-600 hover:underline"
                            >
                              Get Free Key ↗
                            </a>
                          </div>
                          <input
                            type="password"
                            placeholder="Paste your free ImgBB API key here..."
                            value={imgbbKey}
                            onChange={(e) => {
                              const val = e.target.value;
                              setImgbbKey(val);
                              localStorage.setItem('zyntexa_imgbb_key', val);
                            }}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500 text-[11px] font-semibold bg-white"
                          />
                          {!imgbbKey.trim() && (
                            <p className="text-[9px] text-amber-600 font-bold bg-amber-50 px-2.5 py-1 rounded-md border border-amber-100">
                              ⚠️ Please enter an ImgBB key above or set it under the Products tab to upload images.
                            </p>
                          )}
                        </div>
                      )}

                      <div className="border-2 border-dashed border-slate-200 rounded-lg p-3 text-center bg-slate-50/20 hover:bg-slate-50/50 transition-all relative cursor-pointer group">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleBannerFileChange}
                          disabled={uploadingBanner}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <div className="flex flex-col items-center justify-center gap-1">
                          {uploadingBanner ? (
                            <>
                              <div className="w-3.5 h-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                              <span className="text-[11px] font-bold text-indigo-600 animate-pulse">Uploading banner image...</span>
                            </>
                          ) : bannerFile ? (
                            <>
                              <span className="text-[11px] font-bold text-indigo-600 truncate max-w-full px-2">Selected: {bannerFile.name}</span>
                              <span className="text-[9px] text-slate-400 font-mono">{(bannerFile.size / 1024 / 1024).toFixed(2)} MB • Ready!</span>
                            </>
                          ) : (
                            <>
                              <span className="text-[11px] font-bold text-slate-600 group-hover:text-indigo-600">Select Banner Image File</span>
                              <span className="text-[9px] text-slate-400">Recommended dimensions: 1200 x 50px up to 1920 x 80px</span>
                            </>
                          )}
                        </div>
                      </div>

                      {bannerUploadError && (
                        <p className="text-[9px] font-bold text-red-500 bg-red-50 px-2 py-1 rounded-lg border border-red-100 mt-2">{bannerUploadError}</p>
                      )}
                      {bannerUploadSuccess && (
                        <p className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100 mt-2">{bannerUploadSuccess}</p>
                      )}

                      {promoBannerImageUrl && (
                        <div className="mt-2.5 p-1.5 bg-slate-50 border border-slate-100 rounded-lg flex items-center gap-2">
                          <img 
                            src={promoBannerImageUrl} 
                            alt="Promo Preview" 
                            className="w-12 h-8 object-cover rounded border border-slate-100"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&q=80&w=300';
                            }}
                          />
                          <div className="min-w-0 flex-1">
                            <span className="block text-[8px] font-bold text-slate-400 uppercase leading-none">Uploaded Preview</span>
                            <span className="block text-[9px] font-mono text-slate-500 truncate">{promoBannerImageUrl}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Toggle overlay text on image banner */}
                    <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200/60 shadow-xs">
                      <div className="space-y-0.5">
                        <label htmlFor="promo-image-overlay-text-active" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                          Overlay Announcement Text On Image
                        </label>
                        <p className="text-[10px] text-slate-400">Show the text message on top of your graphic image banner with a dark background tint.</p>
                      </div>
                      <button
                        type="button"
                        id="promo-image-overlay-text-active"
                        onClick={() => setPromoBannerImageOverlayTextActive(!promoBannerImageOverlayTextActive)}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          promoBannerImageOverlayTextActive ? 'bg-indigo-600' : 'bg-slate-200'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                            promoBannerImageOverlayTextActive ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {promoBannerImageOverlayTextActive && (
                      <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100 space-y-3">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">
                          Dark Overlay Opacity tint
                        </label>
                        <select
                          value={promoBannerOverlayOpacity}
                          onChange={(e) => setPromoBannerOverlayOpacity(Number(e.target.value))}
                          className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white text-slate-700"
                        >
                          <option value={0}>0% (No overlay)</option>
                          <option value={10}>10%</option>
                          <option value={20}>20%</option>
                          <option value={30}>30%</option>
                          <option value={40}>40% (Default)</option>
                          <option value={50}>50%</option>
                          <option value={60}>60%</option>
                          <option value={70}>70%</option>
                          <option value={80}>80%</option>
                          <option value={90}>90%</option>
                        </select>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Shared Redirect Link URL */}
              {(promoBannerTextActive || promoBannerImageActive) && (
                <div className="p-4 bg-slate-50/40 rounded-2xl border border-slate-100 space-y-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">
                    Redirect Link URL (Applies to both banners)
                  </label>
                  <input
                    type="text"
                    value={promoBannerLinkUrl}
                    onChange={(e) => setPromoBannerLinkUrl(e.target.value)}
                    placeholder="e.g. #category-apparel, or empty"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white text-slate-700"
                  />
                  <p className="text-[9px] text-slate-400">Clicking on either active banner will redirect users to this page section or external URL.</p>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              id="admin-save-settings-btn"
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-700 text-white font-bold rounded-xl text-xs transition-colors shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {loading ? 'Saving Changes...' : 'Save Settings'}
            </button>
          </form>


        </div>
      ) : activeTab === 'gmail' ? (
        <div className="space-y-6">
          <GmailCommsHub 
            currentUser={currentUser} 
            orders={orders} 
            onLoginSuccess={onLoginSuccess} 
          />
        </div>
      ) : null}

      {/* Custom Confirmation Modal */}
      {confirmModal && confirmModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-100 shadow-2xl p-6 space-y-4">
            <div className="flex items-start gap-3.5">
              <div className={`p-2 rounded-xl flex-shrink-0 ${confirmModal.isDanger ? 'bg-rose-50 text-rose-600' : 'bg-indigo-50 text-indigo-600'}`}>
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">{confirmModal.title}</h4>
                <p className="text-xs text-slate-500 font-medium leading-relaxed mt-1.5">{confirmModal.message}</p>
              </div>
            </div>
            
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 border border-slate-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmModal.onConfirm}
                className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition-colors cursor-pointer shadow-sm ${
                  confirmModal.isDanger 
                    ? 'bg-rose-600 hover:bg-rose-700' 
                    : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                {confirmModal.confirmText || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
