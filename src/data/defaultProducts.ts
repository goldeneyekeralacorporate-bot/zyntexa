import { Product } from '../types';

export const DEFAULT_PRODUCTS: Omit<Product, 'id'>[] = [
  {
    name: "Zyntexa Stealth Chronograph",
    description: "Premium mechanical chronograph with a matte black dial, sapphire crystal glass, and a brushed stainless steel strap. Built for precision and timeless elegance.",
    price: 12499,
    category: "Watches",
    imageUrl: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=600",
    stock: 15,
    featured: true
  },
  {
    name: "ProShield Active Noise Cancelling Headphones",
    description: "Wireless over-ear headphones with custom 40mm dynamic drivers, hybrid active noise cancellation, and a 45-hour battery life. Perfect for continuous immersive audio.",
    price: 6999,
    category: "Electronics",
    imageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=600",
    stock: 24,
    featured: true
  },
  {
    name: "Elite Minimalist Leather Wallet",
    description: "Handcrafted top-grain leather wallet with custom RFID-blocking chambers, a slim profile, and a dedicated pull-tab pocket. Fits perfectly in any pocket.",
    price: 1899,
    category: "Accessories",
    imageUrl: "https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&q=80&w=600",
    stock: 40,
    featured: false
  },
  {
    name: "AeroWeave Knit Runner Shoes",
    description: "Ultra-breathable athletic running shoes made from recycled marine plastics. Features a highly responsive memory foam sole for ultimate physical comfort.",
    price: 4599,
    category: "Footwear",
    imageUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=600",
    stock: 12,
    featured: true
  },
  {
    name: "Zyntexa Signature Oversized Hoodie",
    description: "Heavyweight 420 GSM French Terry cotton hoodie in solid concrete gray. Crafted with dropped shoulders and a double-lined comfortable hood.",
    price: 2499,
    category: "Apparel",
    imageUrl: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&q=80&w=600",
    stock: 35,
    featured: false
  },
  {
    name: "AromaDiffuse Ceramic Humidifier",
    description: "Handmade ceramic ultrasonic diffuser that releases ultra-fine cool mist. Features an ambient warm gold LED glow and quiet, safe operation.",
    price: 2199,
    category: "Home & Decor",
    imageUrl: "https://images.unsplash.com/photo-1519183071298-a2962feb14f4?auto=format&fit=crop&q=80&w=600",
    stock: 18,
    featured: false
  },
  {
    name: "Zyntexa ErgoDesk Wireless Charger",
    description: "Premium walnut wood and aluminum Qi-certified fast wireless charging pad. Provides up to 15W high-speed power transmission with custom thermal shielding.",
    price: 3299,
    category: "Electronics",
    imageUrl: "https://images.unsplash.com/photo-1622445262465-2481c4574875?auto=format&fit=crop&q=80&w=600",
    stock: 20,
    featured: false
  },
  {
    name: "Classic Acetate Polarized Sunglasses",
    description: "Timeless tortoiseshell design sunglasses with premium green-tinted polarized lenses offering UV400 absolute protection against harsh sunlight.",
    price: 1599,
    category: "Accessories",
    imageUrl: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&q=80&w=600",
    stock: 28,
    featured: false
  }
];
