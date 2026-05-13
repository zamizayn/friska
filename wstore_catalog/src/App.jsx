import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
  ShoppingCart,
  Plus,
  Minus,
  Send,
  Search,
  Loader2,
  X,
  User,
  MapPin,
  MessageSquare,
  ShoppingBag,
  ChevronRight
} from 'lucide-react';

import logo from './assets/logo.png';

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api/app`
  : '/api/app';

function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const username = window.location.pathname.split('/').pop() || 'friska';

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(`${API_BASE}/catalog/${username}`);
        setData(response.data);
        setLoading(false);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load catalog');
        setLoading(false);
      }
    };
    fetchData();

    const savedCart = localStorage.getItem(`cart_${username}`);
    if (savedCart) setCart(JSON.parse(savedCart));
  }, [username]);

  useEffect(() => {
    localStorage.setItem(`cart_${username}`, JSON.stringify(cart));
  }, [cart, username]);

  const filteredProducts = useMemo(() => {
    if (!data) return [];
    return data.products.filter(p => {
      const matchesCategory = selectedCategory ? p.categoryId === selectedCategory : true;
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [data, selectedCategory, searchQuery]);

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (id, delta) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(0, item.quantity + delta);
        return newQty === 0 ? null : { ...item, quantity: newQty };
      }
      return item;
    }).filter(Boolean));
  };

  const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleCheckout = () => {
    if (cart.length === 0) return;

    let message = `*New Order from Visual Catalog* 🛍️\n\n`;
    message += `📦 *Items:*\n`;
    cart.forEach(item => {
      message += `• ${item.name} x${item.quantity} - ₹${item.price * item.quantity}\n`;
    });
    message += `\n*Total Amount: ₹${totalAmount}*`;

    const phoneNumber = data.tenant.whatsappSettings?.phone || '917012738756';
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${phoneNumber}?text=${encodedMessage}`, '_blank');
  };

  if (loading) return (
    <div className="container">
      <header>
        <div className="skeleton" style={{ height: '32px', width: '120px', borderRadius: '8px' }}></div>
        <div className="skeleton" style={{ height: '40px', width: '40px', borderRadius: '12px' }}></div>
      </header>
      <div className="skeleton" style={{ height: '50px', width: '100%', borderRadius: '16px', margin: '1.5rem 0' }}></div>
      <div className="flex gap-3 mb-8 overflow-hidden">
        {[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: '36px', minWidth: '80px', borderRadius: '20px' }}></div>)}
      </div>
      <div className="product-grid">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="skeleton-card">
            <div className="skeleton-image skeleton"></div>
            <div className="skeleton-line skeleton"></div>
            <div className="skeleton-line short skeleton"></div>
          </div>
        ))}
      </div>
    </div>
  );

  if (error) return (
    <div className="p-12 text-center">
      <div className="bg-red-50 text-red-600 p-8 rounded-[2rem] inline-block border border-red-100">
        <X size={48} className="mx-auto mb-4 opacity-50" />
        <h2 className="text-xl font-black mb-2">Something went wrong</h2>
        <p className="font-medium opacity-80">{error}</p>
        <button onClick={() => window.location.reload()} className="mt-6 px-6 py-2 bg-red-600 text-white rounded-xl font-bold">Try Again</button>
      </div>
    </div>
  );

  return (
    <div className="container">
      <header>
        <div className="store-logo-container">
          <img src={data.tenant.logo || logo} alt={data.tenant.name} className="store-logo" />
        </div>
        <button onClick={() => setIsCartOpen(true)} className="cart-icon-btn">
          <ShoppingCart size={22} strokeWidth={2.5} />
          {totalItems > 0 && (
            <span className="absolute -top-1 -right-1 bg-green-500 text-white text-[10px] font-black rounded-full w-5 h-5 flex items-center justify-center border-2 border-white shadow-sm">
              {totalItems}
            </span>
          )}
        </button>
      </header>

      <div className="search-container">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} strokeWidth={2.5} />
        <input
          type="text"
          placeholder="Search for something delicious..."
          className="search-input"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="category-scroll">
        <div
          className={`category-chip ${selectedCategory === null ? 'active' : ''}`}
          onClick={() => setSelectedCategory(null)}
        >
          All Items
        </div>
        {data.categories.map(cat => (
          <div
            key={cat.id}
            className={`category-chip ${selectedCategory === cat.id ? 'active' : ''}`}
            onClick={() => setSelectedCategory(cat.id)}
          >
            {cat.name}
          </div>
        ))}
      </div>

      {filteredProducts.length === 0 ? (
        <div className="text-center py-20 opacity-40">
          <Search size={64} className="mx-auto mb-4" />
          <h3 className="text-lg font-bold">No items found</h3>
          <p className="text-sm">Try searching for something else</p>
        </div>
      ) : (
        <div className="product-grid">
          {filteredProducts.map(p => (
            <div key={p.id} className="product-card" onClick={() => setSelectedProduct(p)}>
              <div className="product-image-container">
                <img src={p.image || 'https://via.placeholder.com/400?text=No+Image'} alt={p.name} className="product-image" />
              </div>
              <div className="product-info">
                <div className="product-title">{p.name}</div>
                <div className="product-price">₹{p.price}</div>
                <button className="add-btn" onClick={(e) => {
                  e.stopPropagation();
                  addToCart(p);
                }}>
                  <Plus size={16} strokeWidth={3} /> Add
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalItems > 0 && !isCartOpen && (
        <button className="cart-fab" onClick={() => setIsCartOpen(true)}>
          <div className="flex items-center gap-4">
            <div className="bg-white/20 p-2.5 rounded-xl">
              <ShoppingBag size={22} strokeWidth={2.5} />
            </div>
            <div className="text-left">
              <div className="text-xs font-bold uppercase tracking-wider opacity-60">{totalItems} items</div>
              <div className="text-lg font-black">View Cart</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-black">₹{totalAmount}</span>
            <ChevronRight size={24} strokeWidth={3} />
          </div>
        </button>
      )}

      {isCartOpen && (
        <div className="modal-overlay" onClick={() => setIsCartOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Review Order</h2>
              <button className="close-btn" onClick={() => setIsCartOpen(false)}>
                <X size={24} strokeWidth={2.5} />
              </button>
            </div>

            <div className="cart-items-list">
              {cart.map(item => (
                <div key={item.id} className="cart-item">
                  <img src={item.image || 'https://via.placeholder.com/200'} className="cart-item-img" />
                  <div className="cart-item-details">
                    <div className="cart-item-name">{item.name}</div>
                    <div className="cart-item-price">₹{item.price}</div>
                  </div>
                  <div className="qty-control">
                    <button onClick={() => updateQuantity(item.id, -1)} className="qty-btn"><Minus size={14} strokeWidth={3} /></button>
                    <span className="font-black min-w-[24px] text-center">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, 1)} className="qty-btn"><Plus size={14} strokeWidth={3} /></button>
                  </div>
                </div>
              ))}
            </div>

            <div className="checkout-footer">
              <div className="total-row">
                <span className="total-label">Grand Total</span>
                <span className="total-value">₹{totalAmount}</span>
              </div>
              <button
                className="whatsapp-btn"
                onClick={handleCheckout}
              >
                <Send size={22} strokeWidth={2.5} />
                Confirm Order
              </button>
            </div>
          </div>
        </div>
      )}
      {selectedProduct && (
        <div className="modal-overlay" onClick={() => setSelectedProduct(null)}>
          <div className="modal-content product-detail-modal" onClick={e => e.stopPropagation()}>
            <button className="detail-close-btn" onClick={() => setSelectedProduct(null)}>
              <X size={24} strokeWidth={2.5} />
            </button>
            <div className="detail-image-container">
              <img src={selectedProduct.image || 'https://via.placeholder.com/600'} className="detail-image" />
            </div>
            <div className="detail-info">
              <div className="detail-header">
                <h2 className="detail-title">{selectedProduct.name}</h2>
                <div className="detail-price">₹{selectedProduct.price}</div>
              </div>
              <p className="detail-description">
                {selectedProduct.description || "No description available for this item. It's freshly prepared and ready for your order!"}
              </p>

              <div className="detail-actions">
                <button className="detail-add-btn" onClick={() => {
                  addToCart(selectedProduct);
                  setSelectedProduct(null);
                }}>
                  Add to Cart — ₹{selectedProduct.price}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
