import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
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
import Landing from './components/Landing';

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
  const [showLaunchMessage, setShowLaunchMessage] = useState(false);
  const [bannerIndex, setBannerIndex] = useState(0);

  const normalizeImage = (url) => (url || '').replace(/^http:\/\//, 'https://');

  const banners = useMemo(() => {
    if (!data?.banners?.length) return [];
    return data.banners.map(b => ({ ...b, image: normalizeImage(b.image) }));
  }, [data]);

  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => {
      setBannerIndex(prev => (prev + 1) % banners.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [banners.length]);

  const location = useLocation();
  const username = location.pathname.split('/').pop() || 'friska';

  const isRoot = location.pathname === '/' || location.pathname === '';

  useEffect(() => {
    if (isRoot) return;
    const fetchData = async () => {
      try {
        const response = await axios.get(`${API_BASE}/catalog/${username}`);
        setData({
          ...response.data,
          products: (response.data.products || []).map(p => ({ ...p, image: normalizeImage(p.image) }))
        });
        setLoading(false);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load catalog');
        setLoading(false);
      }
    };
    fetchData();

    const savedCart = localStorage.getItem(`cart_${username}`);
    if (savedCart) setCart(JSON.parse(savedCart));
  }, [username, isRoot]);

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
    if (isOutOfStock(product)) return;
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

  const isOutOfStock = (product) => typeof product.stock === 'number' && product.stock <= 0;

  const handleCheckout = () => {
    if (cart.length === 0) return;

    if (data && !data.launched) {
      setShowLaunchMessage(true);
      return;
    }

    let message = `*New Order from Visual Catalog* 🛍️\n\n`;
    message += `📦 *Items:*\n`;
    cart.forEach(item => {
      message += `• ${item.name} x${item.quantity} - ₹${item.price * item.quantity}\n`;
    });
    message += `\n*Total Amount: ₹${totalAmount}*`;

    const phoneNumber = data.tenant.whatsappSettings?.phone || '917012738756';
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${phoneNumber}?text=${encodedMessage}`, '_blank');

    setCart([]);
    setIsCartOpen(false);
  };

  if (isRoot) return <Landing />;

  if (loading) return (
    <div className="catalog-layout">
      <header className="catalog-header">
        <div className="catalog-header-inner">
          <div className="skeleton" style={{ height: '32px', width: '120px', borderRadius: '8px' }}></div>
          <div className="skeleton" style={{ height: '40px', width: '40px', borderRadius: '12px' }}></div>
        </div>
      </header>
      <div className="container">
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
    </div>
  );

  if (error) return (
    <div className="error-container">
      <div className="error-card">
        <X size={48} className="error-icon" />
        <h2 className="error-title">Something went wrong</h2>
        <p className="error-message">{error}</p>
        <button onClick={() => window.location.reload()} className="error-btn">Try Again</button>
      </div>
    </div>
  );

  return (
    <div className="catalog-layout">
      <header className="catalog-header">
        <div className="catalog-header-inner">
          <div className="store-logo-container">
            <img src={data.tenant.logo || logo} alt={data.tenant.name} className="store-logo" />
            <span className="store-brand">{data.tenant.name || 'Friska'}</span>
          </div>
          <button onClick={() => setIsCartOpen(true)} className="cart-icon-btn">
            <ShoppingCart size={22} strokeWidth={2.5} />
            {totalItems > 0 && (
              <span className="cart-badge">
                {totalItems}
              </span>
            )}
          </button>
        </div>
      </header>

      <div className="container">
        {banners.length > 0 && (
          <div className="banner-carousel">
            <div className="banner-slider" style={{ transform: `translateX(-${bannerIndex * 100}%)` }}>
              {banners.map(banner => (
                <div className="banner-slide" key={banner.id}>
                  <img src={banner.image} alt={banner.title || 'Offer'} className="banner-image" />
                  {banner.title && <div className="banner-caption">{banner.title}</div>}
                </div>
              ))}
            </div>
            {banners.length > 1 && (
              <div className="banner-dots">
                {banners.map((banner, i) => (
                  <button
                    key={banner.id}
                    className={`banner-dot ${i === bannerIndex ? 'active' : ''}`}
                    onClick={() => setBannerIndex(i)}
                    aria-label={`Go to banner ${i + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        )}
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
        <div className="no-results">
          <Search size={64} className="no-results-icon" />
          <h3 className="no-results-title">No items found</h3>
          <p className="no-results-sub">Try searching for something else</p>
        </div>
      ) : (
        <div className="product-grid">
          {filteredProducts.map(p => {
            const outOfStock = isOutOfStock(p);
            return (
            <div key={p.id} className={`product-card ${outOfStock ? 'out-of-stock' : ''}`} onClick={() => setSelectedProduct(p)}>
              <div className="product-image-container">
                <img src={p.image || 'https://placehold.co/400x400?text=No+Image'} className="product-image" />
                {outOfStock && <div className="out-of-stock-badge">Out of Stock</div>}
              </div>
              <div className="product-info">
                <div className="product-title">{p.name}</div>
                <div className="product-price">₹{p.price}</div>
                <button
                  className="add-btn"
                  disabled={outOfStock}
                  onClick={(e) => {
                    e.stopPropagation();
                    addToCart(p);
                  }}
                >
                  <Plus size={16} strokeWidth={3} /> {outOfStock ? 'Out of Stock' : 'Add'}
                </button>
              </div>
            </div>
            );
          })}
        </div>
      )}

      {totalItems > 0 && !isCartOpen && (
        <button className="cart-fab" onClick={() => setIsCartOpen(true)}>
          <div className="cart-fab-left">
            <div className="cart-fab-icon-wrap">
              <ShoppingBag size={22} strokeWidth={2.5} />
            </div>
            <div className="cart-fab-text">
              <div className="cart-fab-count">{totalItems} {totalItems === 1 ? 'item' : 'items'}</div>
              <div className="cart-fab-label">View Cart</div>
            </div>
          </div>
          <div className="cart-fab-right">
            <span className="cart-fab-price">₹{totalAmount}</span>
            <ChevronRight size={24} strokeWidth={3} className="cart-fab-arrow" />
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
                  <img src={item.image || 'https://placehold.co/200x200?text=No+Image'} className="cart-item-img" />
                  <div className="cart-item-details">
                    <div className="cart-item-name">{item.name}</div>
                    <div className="cart-item-price">₹{item.price}</div>
                  </div>
                  <div className="qty-control">
                    <button onClick={() => updateQuantity(item.id, -1)} className="qty-btn"><Minus size={14} strokeWidth={3} /></button>
                    <span className="qty-value">{item.quantity}</span>
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
              <img src={selectedProduct.image || 'https://placehold.co/600x500?text=No+Image'} className="detail-image" />
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
                <button
                  className="detail-add-btn"
                  disabled={isOutOfStock(selectedProduct)}
                  onClick={() => {
                    addToCart(selectedProduct);
                    setSelectedProduct(null);
                  }}
                >
                  {isOutOfStock(selectedProduct) ? 'Out of Stock' : `Add to Cart — ₹${selectedProduct.price}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showLaunchMessage && (
        <div className="modal-overlay" onClick={() => setShowLaunchMessage(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Coming Soon 🚀</h2>
              <button className="close-btn" onClick={() => setShowLaunchMessage(false)}>
                <X size={24} strokeWidth={2.5} />
              </button>
            </div>
            <div style={{ padding: '1rem 0', textAlign: 'center' }}>
              <p style={{ fontSize: '1.125rem', lineHeight: '1.7', color: 'var(--text-muted)', marginBottom: '2rem' }}>
                {data?.launchedMessage || "We're currently preparing for launch! 🚀"}
              </p>
              <button
                className="whatsapp-btn"
                style={{ background: 'var(--text)', boxShadow: '0 10px 20px rgba(15,23,42,0.2)' }}
                onClick={() => setShowLaunchMessage(false)}
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
      </div> {/* end of .container */}
    </div>
  );
}

export default App;
