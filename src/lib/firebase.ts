import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
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
  onSnapshot
} from 'firebase/firestore';
import { Product, Order, UserProfile } from '../types';
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

// Initialize Firestore with the custom database ID provided in config
export const db = getFirestore(app, "ai-studio-zyntexa-f15f434e-7b60-463e-9f23-6fea9b2609a2");
export const auth = getAuth(app);

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
    try {
      await setDoc(docRef, {
        ...profile,
        createdAt: profile.createdAt || new Date().toISOString()
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
