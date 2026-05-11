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

const API_BASE = '/api/app';

function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

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
    <div className="flex h-screen flex-col items-center justify-center gap-4">
      <Loader2 className="animate-spin text-green-500" size={48} />
      <p className="font-medium text-gray-500">Loading catalog...</p>
    </div>
  );

  if (error) return (
    <div className="p-12 text-center">
      <div className="bg-red-50 text-red-600 p-6 rounded-2xl inline-block">
        <h2 className="text-xl font-bold mb-2">Oops!</h2>
        <p>{error}</p>
      </div>
    </div>
  );

  return (
    <div className="container">
      <header>
        <div className="store-name">{data.tenant.name}</div>
        <button onClick={() => setIsCartOpen(true)} className="cart-icon-btn">
          <ShoppingCart size={22} />
          {totalItems > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center border-2 border-white">
              {totalItems}
            </span>
          )}
        </button>
      </header>

      <div className="search-container">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input
          type="text"
          placeholder="Search items to order..."
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

      <div className="product-grid">
        {filteredProducts.map(p => (
          <div key={p.id} className="product-card">
            <div className="product-image-container">
              <img src={p.image || 'https://via.placeholder.com/200?text=No+Image'} alt={p.name} className="product-image" />
            </div>
            <div className="product-info">
              <div className="product-title">{p.name}</div>
              <div className="product-price">₹{p.price}</div>
              <button className="add-btn" onClick={() => addToCart(p)}>
                <Plus size={16} /> Add to Cart
              </button>
            </div>
          </div>
        ))}
      </div>

      {totalItems > 0 && !isCartOpen && (
        <button className="cart-fab" onClick={() => setIsCartOpen(true)}>
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <ShoppingBag size={20} />
            </div>
            <div className="text-left">
              <div className="text-sm font-medium opacity-80">{totalItems} items</div>
              <div className="font-bold">View Cart</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xl font-extrabold">₹{totalAmount}</span>
            <ChevronRight size={20} />
          </div>
        </button>
      )}

      {isCartOpen && (
        <div className="modal-overlay" onClick={() => setIsCartOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Review Order</h2>
              <button className="close-btn" onClick={() => setIsCartOpen(false)}>
                <X size={24} />
              </button>
            </div>

            <div className="cart-items-list">
              {cart.map(item => (
                <div key={item.id} className="cart-item">
                  <img src={item.image || 'https://via.placeholder.com/200'} className="cart-item-img" />
                  <div className="cart-item-details">
                    <div className="cart-item-name">{item.name}</div>
                    <div className="cart-item-price">₹{item.price} per unit</div>
                  </div>
                  <div className="qty-control">
                    <button onClick={() => updateQuantity(item.id, -1)} className="qty-btn"><Minus size={14} /></button>
                    <span className="font-bold min-w-[20px] text-center">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, 1)} className="qty-btn"><Plus size={14} /></button>
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
                <Send size={22} />
                Place Order on WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
