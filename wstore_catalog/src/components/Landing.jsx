import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  PackageCheck,
  Scissors,
  ShieldCheck,
  Truck,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import axios from 'axios';
import logo from '../assets/logo.png';

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api/app`
  : '/api/app';

const LANDING_USERNAME = import.meta.env.VITE_LANDING_USERNAME || 'friska';

const normalizeImage = (url) => (url || '').replace(/^http:\/\//, 'https://');

const CUT_DEFS = [
  {
    key: 'curry',
    keywords: ['curry'],
    title: 'Curry Cut',
    tagline: 'Perfect for curries & gravies',
    night: 'Curry Night',
    nightDesc: 'Rich, homestyle gravies'
  },
  {
    key: 'chilli',
    keywords: ['chilli'],
    title: 'Chilli Cut',
    tagline: 'Perfect for spicy dishes',
    night: 'Fry Night',
    nightDesc: 'Crispy fried bites'
  },
  {
    key: 'biriyani',
    keywords: ['biriyani'],
    title: 'Biriyani Cut',
    tagline: 'Made for biriyani',
    night: 'Biriyani Night',
    nightDesc: 'Fragrant, restaurant-style'
  },
  {
    key: 'boneless',
    keywords: ['boneless'],
    title: 'Boneless Breast',
    tagline: 'Perfect for grills & healthy meals',
    night: 'Grill Night',
    nightDesc: 'Smoky grilled dinners'
  }
];

const STATIC_FALLBACK = [
  { id: 19, name: 'Curry Cut (1 kg)', price: 220, image: 'https://friska-api.farmora.in/uploads/products/1781685957636-191937038-1000000465.jpg' },
  { id: 20, name: 'Chilli Cut. (1 kg)', price: 220, image: 'https://friska-api.farmora.in/uploads/products/1781685907929-18524275-1000000469.jpg' },
  { id: 18, name: 'Biriyani Cut (1 kg)', price: 220, image: 'https://friska-api.farmora.in/uploads/products/1781685982525-633894514-1000000473.jpg' },
  { id: 16, name: 'Boneless Chicken Breast (500g)', price: 220, image: 'https://friska-api.farmora.in/uploads/products/1781686012409-342752191-1000000467.jpg' },
  { id: 15, name: 'Chicken Drumsticks (400g)', price: 135, image: 'https://friska-api.farmora.in/uploads/products/1781686030753-114982713-1000000471.jpg' },
  { id: 14, name: 'Chicken Liver (500g)', price: 70, image: 'https://friska-api.farmora.in/uploads/products/1781686047099-897296510-1000000475.jpg' },
  { id: 13, name: 'Chicken Gizzard (500g)', price: 70, image: 'https://friska-api.farmora.in/uploads/products/1781686065967-525087058-1000000477.jpg' },
  { id: 21, name: 'Chicken Lollipop (500g)', price: 150, image: 'https://friska-api.farmora.in/uploads/products/1781685875910-650946201-1000000479.jpg' }
];

export default function Landing() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetchData = async () => {
      try {
        const res = await axios.get(`${API_BASE}/catalog/${LANDING_USERNAME}`);
        const list = (res.data?.products || []).map(p => ({ ...p, image: normalizeImage(p.image) }));
        if (mounted && list.length > 0) setProducts(list);
        else if (mounted) setProducts(STATIC_FALLBACK);
      } catch {
        if (mounted) setProducts(STATIC_FALLBACK);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchData();
    return () => { mounted = false; };
  }, []);

  const matchCut = (keywords) => products.find(p =>
    keywords.some(k => p.name.toLowerCase().includes(k))
  );

  const cuts = CUT_DEFS.map(def => ({ ...def, product: matchCut(def.keywords) })).filter(c => c.product);
  const cutProductIds = new Set(cuts.map(c => c.product.id));
  const featured = products.filter(p => !cutProductIds.has(p.id));

  const goShop = () => navigate(`/${LANDING_USERNAME}`);

  const extractWeight = (name) => {
    const m = name.match(/\(([^)]+)\)/);
    return m ? m[1] : null;
  };

  return (
    <div className="landing">
      <nav className="landing-nav">
        <div className="landing-nav-inner">
          <div className="landing-logo">
            <img src={logo} alt="Friska" />
            <span className="landing-brand">Friska</span>
          </div>
          <button className="landing-nav-cta" onClick={goShop}>
            SHOP CHICKEN
          </button>
        </div>
      </nav>

      <section className="landing-hero">
        <div className="hero-copy">
          <span className="hero-badge">
            <Sparkles size={14} strokeWidth={2.5} />
            Premium Chicken Cuts
          </span>
          <h1 className="hero-title">
            Fresh Chicken.
            <br />
            <span className="hero-accent">Cut Just the Way You Like.</span>
          </h1>
          <p className="hero-sub">
            Premium fresh chicken cuts, packed with care and delivered fresh to your doorstep.
          </p>
          <div className="hero-actions">
            <button className="hero-cta" onClick={goShop}>
              SHOP CHICKEN
              <ArrowRight size={18} strokeWidth={2.5} />
            </button>
          </div>
          <div className="hero-meta">
            <span>Delivered fresh</span>
            <span className="meta-dot" />
            <span>Packed with care</span>
            <span className="meta-dot" />
            <span>Cut for your recipe</span>
          </div>
        </div>

        <div className="hero-cuts" aria-hidden="true">
          {cuts.map((cut, i) => (
            <div className={`hero-cut-card pos-${i + 1}`} key={cut.key}>
              <img
                src={cut.product.image || logo}
                alt={cut.title}
                onError={(e) => { e.currentTarget.src = logo; }}
              />
              <span className="hero-cut-label">{cut.title}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-section">
        <div className="section-head">
          <h2 className="section-title">What are you cooking today?</h2>
          <p className="section-sub">Every recipe deserves its own cut — pick yours.</p>
        </div>
        <div className="cuts-grid">
          {cuts.map(cut => (
            <div key={cut.key} className="cut-card" onClick={goShop}>
              <div className="cut-image-wrap">
                <img
                  src={cut.product.image || logo}
                  alt={cut.title}
                  onError={(e) => { e.currentTarget.src = logo; }}
                />
              </div>
              <div className="cut-info">
                <h3 className="cut-title">{cut.title}</h3>
                <p className="cut-tagline">{cut.tagline}</p>
                <span className="cut-shop">
                  Shop This Cut
                  <ChevronRight size={16} strokeWidth={2.5} />
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {featured.length > 0 && (
        <section className="landing-section section-alt">
          <div className="section-head">
            <h2 className="section-title">Fresh From Friska</h2>
            <p className="section-sub">Your favourite cuts, freshly packed and ready to cook.</p>
          </div>
          <div className="picks-grid">
            {featured.map(p => (
              <div key={p.id} className="pick-card" onClick={goShop}>
                <div className="pick-image-wrap">
                  <img
                    src={p.image || logo}
                    alt={p.name}
                    onError={(e) => { e.currentTarget.src = logo; }}
                  />
                  <span className="pick-fresh">FRESH</span>
                </div>
                <div className="pick-info">
                  <h3 className="pick-name">{p.name}</h3>
                  <div className="pick-bottom">
                    <span className="pick-price">₹{p.price}</span>
                    <span className="pick-add">+ Add to Cart</span>
                  </div>
                  {extractWeight(p.name) && (
                    <span className="pick-weight">{extractWeight(p.name)}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="promo-band">
        <div className="promo-copy">
          <h2 className="promo-title">Dinner starts here.</h2>
          <p className="promo-sub">
            From biriyani nights to weekend grills, we've got the perfect cut for every craving.
          </p>
          <button className="promo-cta" onClick={goShop}>
            EXPLORE CHICKEN
            <ArrowRight size={18} strokeWidth={2.5} />
          </button>
        </div>
        <div className="promo-image-wrap">
          {cuts[2]?.product && (
            <img
              src={cuts[2].product.image}
              alt="Fresh chicken"
              onError={(e) => { e.currentTarget.src = logo; }}
            />
          )}
        </div>
      </section>

      <section className="landing-section">
        <div className="section-head">
          <h2 className="section-title">One Chicken. Endless Possibilities.</h2>
          <p className="section-sub">Your products turned into meals — pick a night.</p>
        </div>
        <div className="nights-grid">
          {cuts.map(cut => (
            <div key={cut.key} className="night-card" onClick={goShop}>
              <img
                src={cut.product.image || logo}
                alt={cut.night}
                onError={(e) => { e.currentTarget.src = logo; }}
              />
              <div className="night-overlay" />
              <div className="night-info">
                <span className="night-label">{cut.night.toUpperCase()}</span>
                <span className="night-desc">{cut.nightDesc}</span>
                <span className="night-price">{cut.title} · ₹{cut.product.price}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-section section-alt">
        <div className="section-head">
          <h2 className="section-title">Why choose Friska?</h2>
        </div>
        <div className="why-grid">
          <div className="why-card">
            <div className="why-icon"><PackageCheck size={24} strokeWidth={2.2} /></div>
            <h3 className="why-title">Freshly Packed</h3>
            <p className="why-desc">Packed with care to preserve freshness.</p>
          </div>
          <div className="why-card">
            <div className="why-icon"><Scissors size={24} strokeWidth={2.2} /></div>
            <h3 className="why-title">Perfectly Cut</h3>
            <p className="why-desc">Cuts prepared for the dish you're making.</p>
          </div>
          <div className="why-card">
            <div className="why-icon"><ShieldCheck size={24} strokeWidth={2.2} /></div>
            <h3 className="why-title">Quality First</h3>
            <p className="why-desc">Maintained with proper handling and packaging.</p>
          </div>
          <div className="why-card">
            <div className="why-icon"><Truck size={24} strokeWidth={2.2} /></div>
            <h3 className="why-title">Delivered Fresh</h3>
            <p className="why-desc">From Friska to your kitchen.</p>
          </div>
        </div>
      </section>

      <section className="final-cta">
        <h2 className="final-title">What's cooking today?</h2>
        <p className="final-sub">Fresh chicken is just a click away.</p>
        <button className="final-btn" onClick={goShop}>
          SHOP NOW
          <ArrowRight size={18} strokeWidth={2.5} />
        </button>
        <div className="final-thumbs">
          {cuts.map(cut => (
            <img
              key={cut.key}
              src={cut.product.image || logo}
              alt={cut.title}
              className="final-thumb"
              onClick={goShop}
              onError={(e) => { e.currentTarget.src = logo; }}
            />
          ))}
        </div>
      </section>

      <footer className="landing-footer">
        <div className="footer-logo">
          <img src={logo} alt="Friska" />
          <span>Friska</span>
        </div>
        <p>&copy; {new Date().getFullYear()} Friska. All rights reserved.</p>
      </footer>
    </div>
  );
}