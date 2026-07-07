import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  onAuthStateChanged as onAuthChanged,
  signOut as firebaseSignOut
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  setDoc, 
  getDoc, 
  where,
  onSnapshot,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  getDocFromServer
} from 'firebase/firestore';
import { Product, Order, UserProfile, StoreSettings } from '../types';
import { DEFAULT_PRODUCTS } from '../data/defaultProducts';

const firebaseConfig = {
  projectId: "diesel-scheduler-mgtt6",
  appId: "1:373322733489:web:86283dc97ecf1648368f90",
  apiKey: "AIzaSyDw76ifZJx-NMV1NZdt3DY-7mNKEqoxBds",
  authDomain: "diesel-scheduler-mgtt6.firebaseapp.com",
  storageBucket: "diesel-scheduler-mgtt6.firebasestorage.app",
  messagingSenderId: "373322733489"
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Firestore with high-performance persistent offline cache
let firestoreInstance;
try {
  firestoreInstance = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  }, "ai-studio-zyntexa-f15f434e-7b60-463e-9f23-6fea9b2609a2");
} catch (e) {
  console.warn("Failed to initialize Firestore with persistent local cache. Falling back to default getFirestore.", e);
  firestoreInstance = getFirestore(app, "ai-studio-zyntexa-f15f434e-7b60-463e-9f23-6fea9b2609a2");
}

export const db = firestoreInstance;
export const auth = getAuth(app);

// Connection test on initial app boot
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Firestore connection check: Client appears to be offline. Using local cache state.");
    } else {
      console.warn("Firestore connection check info:", error);
    }
  }
}
testConnection();

// In-memory caching for Google Access Token
let cachedAccessToken: string | null = null;

export const getAccessToken = () => cachedAccessToken;
export const setAccessToken = (token: string | null) => {
  cachedAccessToken = token;
};

// Create and configure Google Auth Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('https://www.googleapis.com/auth/drive');
googleProvider.addScope('https://www.googleapis.com/auth/drive.file');
googleProvider.addScope('https://www.googleapis.com/auth/drive.readonly');

export const googleSignIn = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const accessToken = credential?.accessToken || null;
    cachedAccessToken = accessToken;
    return { user: result.user, accessToken };
  } catch (error) {
    console.error("Error signing in with Google:", error);
    throw error;
  }
};

// Clear cached token on sign-out
onAuthChanged(auth, (user) => {
  if (!user) {
    cachedAccessToken = null;
  }
});

// COLLECTION NAMES
const PRODUCTS_COLL = 'products';
const ORDERS_COLL = 'orders';
const USERS_COLL = 'users';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Seed database with default products if empty
 */
export async function seedProductsIfEmpty(): Promise<Product[]> {
  try {
    let querySnapshot;
    try {
      querySnapshot = await getDocs(collection(db, PRODUCTS_COLL));
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, PRODUCTS_COLL);
      throw err;
    }

    if (querySnapshot.empty) {
      console.log("Seeding products...");
      const seeded: Product[] = [];
      for (const item of DEFAULT_PRODUCTS) {
        let docRef;
        try {
          docRef = await addDoc(collection(db, PRODUCTS_COLL), {
            ...item,
            createdAt: new Date().toISOString()
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, PRODUCTS_COLL);
          throw err;
        }
        seeded.push({
          id: docRef.id,
          ...item,
        });
      }
      return seeded;
    } else {
      const existing: Product[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        existing.push({
          id: doc.id,
          name: data.name || '',
          description: data.description || '',
          price: Number(data.price) || 0,
          category: data.category || '',
          imageUrl: data.imageUrl || '',
          images: data.images || [],
          stock: Number(data.stock) || 0,
          featured: !!data.featured,
          createdAt: data.createdAt
        });
      });
      return existing;
    }
  } catch (error) {
    console.error("Error seeding or fetching products: ", error);
    // Return local defaults with virtual IDs as fallback
    return DEFAULT_PRODUCTS.map((p, i) => ({ ...p, id: `local_${i}` }));
  }
}

/**
 * Fetch all products
 */
export async function fetchProducts(): Promise<Product[]> {
  try {
    let querySnapshot;
    try {
      querySnapshot = await getDocs(collection(db, PRODUCTS_COLL));
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, PRODUCTS_COLL);
      throw err;
    }
    const items: Product[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      items.push({
        id: doc.id,
        name: data.name || '',
        description: data.description || '',
        price: Number(data.price) || 0,
        category: data.category || '',
        imageUrl: data.imageUrl || '',
        images: data.images || [],
        stock: Number(data.stock) || 0,
        featured: !!data.featured,
        createdAt: data.createdAt
      });
    });
    return items;
  } catch (error) {
    console.error("Error fetching products: ", error);
    throw error;
  }
}

/**
 * Create a new product (Admin)
 */
export async function addProduct(product: Omit<Product, 'id'>): Promise<Product> {
  try {
    let docRef;
    try {
      docRef = await addDoc(collection(db, PRODUCTS_COLL), {
        ...product,
        createdAt: new Date().toISOString()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, PRODUCTS_COLL);
      throw err;
    }
    return {
      id: docRef.id,
      ...product
    };
  } catch (error) {
    console.error("Error adding product: ", error);
    throw error;
  }
}

/**
 * Update a product's price or other fields (Admin)
 */
export async function updateProductField(id: string, updates: Partial<Product>): Promise<void> {
  try {
    const docRef = doc(db, PRODUCTS_COLL, id);
    try {
      await updateDoc(docRef, updates);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `${PRODUCTS_COLL}/${id}`);
      throw err;
    }
  } catch (error) {
    console.error(`Error updating product ${id}: `, error);
    throw error;
  }
}

/**
 * Delete a product (Admin)
 */
export async function deleteProduct(id: string): Promise<void> {
  try {
    try {
      await deleteDoc(doc(db, PRODUCTS_COLL, id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `${PRODUCTS_COLL}/${id}`);
      throw err;
    }
  } catch (error) {
    console.error(`Error deleting product ${id}: `, error);
    throw error;
  }
}

/**
 * Create/register a user profile (Customer/Admin)
 */
export async function saveUserProfile(profile: UserProfile): Promise<void> {
  try {
    const docRef = doc(db, USERS_COLL, profile.uid);
    // Remove any undefined fields to prevent Firestore setDoc crashes
    const cleanProfile = Object.entries(profile).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key] = value;
      }
      return acc;
    }, {} as any);

    try {
      await setDoc(docRef, {
        ...cleanProfile,
        createdAt: cleanProfile.createdAt || new Date().toISOString()
      }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `${USERS_COLL}/${profile.uid}`);
      throw err;
    }
  } catch (error) {
    console.error("Error saving user profile: ", error);
    throw error;
  }
}

/**
 * Get user profile by UID
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const docRef = doc(db, USERS_COLL, uid);
    let docSnap;
    try {
      docSnap = await getDoc(docRef);
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `${USERS_COLL}/${uid}`);
      throw err;
    }
    if (docSnap.exists()) {
      return docSnap.data() as UserProfile;
    }
    return null;
  } catch (error) {
    console.error("Error getting user profile: ", error);
    return null;
  }
}

/**
 * Create a customer order
 */
export async function placeOrder(order: Omit<Order, 'id'>): Promise<string> {
  try {
    let docRef;
    try {
      docRef = await addDoc(collection(db, ORDERS_COLL), {
        ...order,
        createdAt: new Date().toISOString()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, ORDERS_COLL);
      throw err;
    }
    return docRef.id;
  } catch (error) {
    console.error("Error placing order: ", error);
    throw error;
  }
}

/**
 * Clear all orders from the database
 */
export async function clearAllOrders(): Promise<void> {
  try {
    let querySnapshot;
    try {
      querySnapshot = await getDocs(collection(db, ORDERS_COLL));
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, ORDERS_COLL);
      throw err;
    }
    const deletePromises: Promise<void>[] = [];
    querySnapshot.forEach((docSnap) => {
      deletePromises.push(
        (async () => {
          try {
            await deleteDoc(doc(db, ORDERS_COLL, docSnap.id));
          } catch (err) {
            handleFirestoreError(err, OperationType.DELETE, `${ORDERS_COLL}/${docSnap.id}`);
            throw err;
          }
        })()
      );
    });
    await Promise.all(deletePromises);
  } catch (error) {
    console.error("Error clearing all orders: ", error);
    throw error;
  }
}

/**
 * Fetch all orders (Admin or Customer)
 */
export async function fetchAllOrders(): Promise<Order[]> {
  try {
    let querySnapshot;
    try {
      querySnapshot = await getDocs(collection(db, ORDERS_COLL));
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, ORDERS_COLL);
      throw err;
    }
    const items: Order[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      items.push({
        id: doc.id,
        userId: data.userId || '',
        customerName: data.customerName || '',
        customerEmail: data.customerEmail || '',
        customerPhone: data.customerPhone || '',
        items: data.items || [],
        shippingAddress: data.shippingAddress || {},
        locationCoordinates: data.locationCoordinates || null,
        subtotal: Number(data.subtotal) || 0,
        tax: Number(data.tax) || 0,
        discount: Number(data.discount) || 0,
        total: Number(data.total) || 0,
        paymentMethod: data.paymentMethod || 'COD',
        paymentStatus: data.paymentStatus || 'pending',
        orderStatus: data.orderStatus || 'pending',
        createdAt: data.createdAt || '',
        paymentDetails: data.paymentDetails || {}
      });
    });
    // Sort by date (descending)
    return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    console.error("Error fetching all orders: ", error);
    throw error;
  }
}

/**
 * Update order status (Admin approval, shipped, delivered, etc.)
 */
export async function updateOrderStatus(
  orderId: string, 
  status: Order['orderStatus'],
  paymentStatus?: Order['paymentStatus']
): Promise<void> {
  try {
    const docRef = doc(db, ORDERS_COLL, orderId);
    const updates: Partial<Order> = { orderStatus: status };
    if (paymentStatus) {
      updates.paymentStatus = paymentStatus;
    }
    try {
      await updateDoc(docRef, updates);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `${ORDERS_COLL}/${orderId}`);
      throw err;
    }
  } catch (error) {
    console.error(`Error updating order status for ${orderId}: `, error);
    throw error;
  }
}

/**
 * Subscribe to real-time changes in products collection
 */
export function subscribeProducts(
  onUpdate: (products: Product[]) => void, 
  onError: (error: any) => void
) {
  return onSnapshot(collection(db, PRODUCTS_COLL), (snapshot) => {
    const items: Product[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      items.push({
        id: doc.id,
        name: data.name || '',
        description: data.description || '',
        price: Number(data.price) || 0,
        category: data.category || '',
        imageUrl: data.imageUrl || '',
        images: data.images || [],
        stock: Number(data.stock) || 0,
        featured: !!data.featured,
        createdAt: data.createdAt
      });
    });
    onUpdate(items);
  }, (error) => {
    console.error("Products subscription error:", error);
    try {
      handleFirestoreError(error, OperationType.GET, PRODUCTS_COLL);
    } catch (err) {
      onError(err);
    }
  });
}

/**
 * Subscribe to real-time changes in orders collection
 */
export function subscribeOrders(
  onUpdate: (orders: Order[]) => void,
  onError: (error: any) => void
) {
  return onSnapshot(collection(db, ORDERS_COLL), (snapshot) => {
    const items: Order[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      items.push({
        id: doc.id,
        userId: data.userId || '',
        customerName: data.customerName || '',
        customerEmail: data.customerEmail || '',
        customerPhone: data.customerPhone || '',
        items: data.items || [],
        shippingAddress: data.shippingAddress || {},
        locationCoordinates: data.locationCoordinates || null,
        subtotal: Number(data.subtotal) || 0,
        tax: Number(data.tax) || 0,
        discount: Number(data.discount) || 0,
        total: Number(data.total) || 0,
        paymentMethod: data.paymentMethod || 'COD',
        paymentStatus: data.paymentStatus || 'pending',
        orderStatus: data.orderStatus || 'pending',
        createdAt: data.createdAt || '',
        paymentDetails: data.paymentDetails || {}
      });
    });
    // Sort descending by date
    const sorted = items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    onUpdate(sorted);
  }, (error) => {
    console.error("Orders subscription error:", error);
    try {
      handleFirestoreError(error, OperationType.GET, ORDERS_COLL);
    } catch (err) {
      onError(err);
    }
  });
}

/**
 * Subscribe to real-time changes in a specific customer's orders
 */
export function subscribeUserOrders(
  userId: string,
  onUpdate: (orders: Order[]) => void,
  onError: (error: any) => void
) {
  const q = query(collection(db, ORDERS_COLL), where('userId', '==', userId));
  return onSnapshot(q, (snapshot) => {
    const items: Order[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      items.push({
        id: doc.id,
        userId: data.userId || '',
        customerName: data.customerName || '',
        customerEmail: data.customerEmail || '',
        customerPhone: data.customerPhone || '',
        items: data.items || [],
        shippingAddress: data.shippingAddress || {},
        locationCoordinates: data.locationCoordinates || null,
        subtotal: Number(data.subtotal) || 0,
        tax: Number(data.tax) || 0,
        discount: Number(data.discount) || 0,
        total: Number(data.total) || 0,
        paymentMethod: data.paymentMethod || 'COD',
        paymentStatus: data.paymentStatus || 'pending',
        orderStatus: data.orderStatus || 'pending',
        createdAt: data.createdAt || '',
        paymentDetails: data.paymentDetails || {}
      });
    });
    // Sort descending by date
    const sorted = items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    onUpdate(sorted);
  }, (error) => {
    console.error("User orders subscription error:", error);
    try {
      handleFirestoreError(error, OperationType.GET, `orders?userId=${userId}`);
    } catch (err) {
      onError(err);
    }
  });
}

/**
 * Subscribe to real-time changes in the tax/delivery settings
 */
export function subscribeSettings(
  onUpdate: (settings: StoreSettings) => void,
  onError: (error: any) => void
) {
  const docRef = doc(db, 'settings', 'tax_delivery');
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      onUpdate({
        cgstPercent: data.cgstPercent !== undefined ? Number(data.cgstPercent) : 9,
        sgstPercent: data.sgstPercent !== undefined ? Number(data.sgstPercent) : 9,
        deliveryCharge: data.deliveryCharge !== undefined ? Number(data.deliveryCharge) : 150,
        freeShippingThreshold: data.freeShippingThreshold !== undefined ? Number(data.freeShippingThreshold) : 4999,
        promoBannerActive: data.promoBannerActive !== undefined ? !!data.promoBannerActive : false,
        promoBannerTextActive: data.promoBannerTextActive !== undefined ? !!data.promoBannerTextActive : true,
        promoBannerImageActive: data.promoBannerImageActive !== undefined ? !!data.promoBannerImageActive : (data.promoBannerActive !== undefined ? !!data.promoBannerActive : false),
        promoBannerImageOverlayTextActive: data.promoBannerImageOverlayTextActive !== undefined ? !!data.promoBannerImageOverlayTextActive : true,
        promoBannerText: data.promoBannerText !== undefined ? String(data.promoBannerText) : "✨ Special Launch Offer: Get free delivery on all orders above ₹4,999! ✨",
        promoBannerType: data.promoBannerType !== undefined ? (data.promoBannerType as 'text' | 'image') : 'text',
        promoBannerImageUrl: data.promoBannerImageUrl !== undefined ? String(data.promoBannerImageUrl) : '',
        promoBannerLinkUrl: data.promoBannerLinkUrl !== undefined ? String(data.promoBannerLinkUrl) : '',
        promoBannerTextSize: data.promoBannerTextSize !== undefined ? (data.promoBannerTextSize as 'xs' | 'sm' | 'md' | 'lg') : 'xs',
        promoBannerTextColor: data.promoBannerTextColor !== undefined ? String(data.promoBannerTextColor) : '#ffffff',
        promoBannerBgColor: data.promoBannerBgColor !== undefined ? String(data.promoBannerBgColor) : '#4f46e5',
        promoBannerOverlayOpacity: data.promoBannerOverlayOpacity !== undefined ? Number(data.promoBannerOverlayOpacity) : 40,
        promoBannerScrollEnabled: data.promoBannerScrollEnabled !== undefined ? !!data.promoBannerScrollEnabled : true,
        promoBannerScrollDirection: data.promoBannerScrollDirection !== undefined ? (data.promoBannerScrollDirection as 'left-to-right' | 'right-to-left') : 'left-to-right',
        promoBannerScrollSpeed: data.promoBannerScrollSpeed !== undefined ? (data.promoBannerScrollSpeed as 'slow' | 'medium' | 'fast') : 'slow'
      });
    } else {
      // Default fallback
      onUpdate({
        cgstPercent: 9,
        sgstPercent: 9,
        deliveryCharge: 150,
        freeShippingThreshold: 4999,
        promoBannerActive: false,
        promoBannerTextActive: true,
        promoBannerImageActive: false,
        promoBannerImageOverlayTextActive: true,
        promoBannerText: "✨ Special Launch Offer: Get free delivery on all orders above ₹4,999! ✨",
        promoBannerType: 'text',
        promoBannerImageUrl: '',
        promoBannerLinkUrl: '',
        promoBannerTextSize: 'xs',
        promoBannerTextColor: '#ffffff',
        promoBannerBgColor: '#4f46e5',
        promoBannerOverlayOpacity: 40,
        promoBannerScrollEnabled: true,
        promoBannerScrollDirection: 'left-to-right',
        promoBannerScrollSpeed: 'slow'
      });
    }
  }, (error) => {
    console.error("Settings subscription error:", error);
    try {
      handleFirestoreError(error, OperationType.GET, 'settings/tax_delivery');
    } catch (err) {
      onError(err);
    }
  });
}

/**
 * Update store settings (Admin)
 */
export async function updateStoreSettings(settings: StoreSettings): Promise<void> {
  try {
    const docRef = doc(db, 'settings', 'tax_delivery');
    try {
      await setDoc(docRef, settings, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'settings/tax_delivery');
      throw err;
    }
  } catch (error) {
    console.error("Error updating store settings: ", error);
    throw error;
  }
}

/**
 * Reset all webapp database contents (Admin)
 * Clears all orders, deletes all custom products, re-seeds default products,
 * and resets store settings to standard factory defaults.
 */
export async function resetStoreDatabase(): Promise<void> {
  try {
    // 1. Clear all orders
    await clearAllOrders();

    // 2. Clear all products
    let productsSnapshot;
    try {
      productsSnapshot = await getDocs(collection(db, PRODUCTS_COLL));
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, PRODUCTS_COLL);
      throw err;
    }

    const deleteProductPromises: Promise<void>[] = [];
    productsSnapshot.forEach((docSnap) => {
      deleteProductPromises.push(
        (async () => {
          try {
            await deleteDoc(doc(db, PRODUCTS_COLL, docSnap.id));
          } catch (err) {
            handleFirestoreError(err, OperationType.DELETE, `${PRODUCTS_COLL}/${docSnap.id}`);
            throw err;
          }
        })()
      );
    });
    await Promise.all(deleteProductPromises);

    // 3. Re-seed default products
    const seedPromises: Promise<any>[] = [];
    for (const item of DEFAULT_PRODUCTS) {
      seedPromises.push(
        (async () => {
          try {
            await addDoc(collection(db, PRODUCTS_COLL), {
              ...item,
              createdAt: new Date().toISOString()
            });
          } catch (err) {
            handleFirestoreError(err, OperationType.CREATE, PRODUCTS_COLL);
            throw err;
          }
        })()
      );
    }
    await Promise.all(seedPromises);

    // 4. Reset store settings to factory defaults
    const defaultSettings: StoreSettings = {
      cgstPercent: 9,
      sgstPercent: 9,
      deliveryCharge: 150,
      freeShippingThreshold: 4999,
      promoBannerActive: false,
      promoBannerTextActive: true,
      promoBannerImageActive: false,
      promoBannerImageOverlayTextActive: true,
      promoBannerText: "✨ Special Launch Offer: Get free delivery on all orders above ₹4,999! ✨",
      promoBannerType: 'text',
      promoBannerImageUrl: '',
      promoBannerLinkUrl: '',
      promoBannerTextSize: 'xs',
      promoBannerTextColor: '#ffffff',
      promoBannerBgColor: '#4f46e5',
      promoBannerOverlayOpacity: 40
    };
    await updateStoreSettings(defaultSettings);

  } catch (error) {
    console.error("Error resetting store database: ", error);
    throw error;
  }
}

/**
 * Sign out the currently authenticated user
 */
export async function signOutUser(): Promise<void> {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error("Error signing out user:", error);
    throw error;
  }
}

/**
 * Subscribe to authentication state changes
 */
export function subscribeAuth(onUserChanged: (user: any) => void) {
  return onAuthChanged(auth, onUserChanged);
}


