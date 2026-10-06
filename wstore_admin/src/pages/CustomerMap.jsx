import { useEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Map as MapIcon, Users, AlertCircle } from 'lucide-react';
import { API_ENDPOINTS, getHeaders } from '../apiConfig';
import { loadGoogleMapsScript } from '../googleMaps';

const BRANCH_COLOR = '#6366f1';
const CUSTOMER_COLOR = '#10b981';

// Popup content is built from text nodes so customer-supplied names and addresses can't inject HTML
const buildPopup = (c) => {
    const root = document.createElement('div');
    root.style.cssText = 'font-family: inherit; font-size: 13px; line-height: 1.5; max-width: 240px;';
    const add = (text, style) => {
        const el = document.createElement('div');
        el.textContent = text;
        if (style) el.style.cssText = style;
        root.appendChild(el);
    };
    add(c.name || 'Customer', 'font-weight: 700; font-size: 14px;');
    add(c.phone);
    if (c.label) add(c.label, 'color: #64748b;');
    if (c.address) add(c.address, 'margin-top: 4px;');
    add(`${c.distanceKm} km from the branch · ${c.orderCount} ${c.orderCount === 1 ? 'order' : 'orders'}`, 'margin-top: 4px; color: #6366f1; font-weight: 600;');
    return root;
};

export default function CustomerMap() {
    // Superadmin only. The API enforces this too; the redirect just keeps others off the page.
    const isSuperadmin = localStorage.getItem('adminRole') === 'superadmin';

    const [branches, setBranches] = useState([]);
    const [branchId, setBranchId] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [data, setData] = useState(null);
    const [mapsReady, setMapsReady] = useState(false);

    const mapDivRef = useRef(null);
    const mapRef = useRef(null);
    const overlaysRef = useRef([]);

    // Branch list
    useEffect(() => {
        if (!isSuperadmin) return;
        (async () => {
            try {
                const res = await fetch(API_ENDPOINTS.BRANCHES, { headers: getHeaders() });
                if (!res.ok) throw new Error('Failed to load branches');
                const list = await res.json();
                setBranches(list);
                const stored = localStorage.getItem('selectedBranchId') || localStorage.getItem('branchId');
                const start = list.find(b => String(b.id) === String(stored)) || list[0];
                if (start) setBranchId(String(start.id));
                else setLoading(false);
            } catch (e) {
                setError(e.message);
                setLoading(false);
            }
        })();
    }, []);

    // Map data for the chosen branch
    useEffect(() => {
        if (!isSuperadmin || !branchId) return;
        let cancelled = false;
        setLoading(true);
        setError(null);
        setData(null);
        (async () => {
            try {
                const res = await fetch(API_ENDPOINTS.BRANCH_CUSTOMER_MAP(branchId), { headers: getHeaders() });
                const body = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(body.error || 'Failed to load the customer map');
                if (cancelled) return;
                setData(body);
                if (body.mapsApiKey) {
                    loadGoogleMapsScript(body.mapsApiKey, () => setMapsReady(!!(window.google && window.google.maps)));
                }
            } catch (e) {
                if (!cancelled) setError(e.message);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [branchId]);

    const branch = data?.branch;
    const hasLocation = branch && branch.latitude != null && branch.longitude != null && branch.deliveryRadius != null;
    const canDraw = hasLocation && !!data.mapsApiKey && mapsReady;

    // Draw the branch, its delivery radius and the customers
    useEffect(() => {
        if (!canDraw || !mapDivRef.current) return;
        const { maps } = window.google;
        const center = { lat: branch.latitude, lng: branch.longitude };

        if (!mapRef.current || mapRef.current.getDiv() !== mapDivRef.current) {
            mapRef.current = new maps.Map(mapDivRef.current, { center, zoom: 12, streetViewControl: false, mapTypeControl: false });
        }
        const map = mapRef.current;

        overlaysRef.current.forEach(o => o.setMap(null));
        overlaysRef.current = [];

        const circle = new maps.Circle({
            map, center, radius: branch.deliveryRadius * 1000,
            strokeColor: BRANCH_COLOR, strokeOpacity: 0.7, strokeWeight: 2,
            fillColor: BRANCH_COLOR, fillOpacity: 0.07, clickable: false
        });
        const branchMarker = new maps.Marker({
            map, position: center, title: branch.name, zIndex: 1000,
            label: { text: '★', color: '#ffffff', fontSize: '14px' },
            icon: { path: maps.SymbolPath.CIRCLE, scale: 13, fillColor: BRANCH_COLOR, fillOpacity: 1, strokeColor: '#ffffff', strokeWeight: 3 }
        });
        overlaysRef.current.push(circle, branchMarker);

        const info = new maps.InfoWindow();
        branchMarker.addListener('click', () => {
            const el = document.createElement('div');
            el.style.cssText = 'font-size: 13px; line-height: 1.5; max-width: 240px;';
            const title = document.createElement('div');
            title.textContent = branch.name;
            title.style.cssText = 'font-weight: 700; font-size: 14px;';
            el.appendChild(title);
            if (branch.address) {
                const addr = document.createElement('div');
                addr.textContent = branch.address;
                el.appendChild(addr);
            }
            const radius = document.createElement('div');
            radius.textContent = `Delivery radius: ${branch.deliveryRadius} km`;
            radius.style.cssText = 'color: #6366f1; font-weight: 600; margin-top: 4px;';
            el.appendChild(radius);
            info.setContent(el);
            info.open(map, branchMarker);
        });

        data.customers.forEach(c => {
            const marker = new maps.Marker({
                map, position: { lat: c.latitude, lng: c.longitude }, title: c.name || c.phone,
                icon: { path: maps.SymbolPath.CIRCLE, scale: 6, fillColor: CUSTOMER_COLOR, fillOpacity: 0.9, strokeColor: '#ffffff', strokeWeight: 1.5 }
            });
            marker.addListener('click', () => {
                info.setContent(buildPopup(c));
                info.open(map, marker);
            });
            overlaysRef.current.push(marker);
        });

        map.fitBounds(circle.getBounds());
    }, [canDraw, data, branch]);

    const uniqueCustomers = data ? new Set(data.customers.map(c => c.phone)).size : 0;

    if (!isSuperadmin) return <Navigate to="/admin" replace />;

    const notice = (text) => (
        <div style={{ fontSize: '13px', color: '#854d0e', background: '#fef9c3', padding: '12px 16px', borderRadius: '12px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{text}</span>
        </div>
    );
    const stat = (value, label) => (
        <div style={{ background: 'var(--bg-app)', borderRadius: '12px', padding: '12px 16px', minWidth: '140px' }}>
            <div style={{ fontSize: '20px', fontWeight: 700 }}>{value}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{label}</div>
        </div>
    );
    const legend = (color, label, size) => (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
            <span style={{ width: size, height: size, borderRadius: '50%', background: color, display: 'inline-block' }} /> {label}
        </span>
    );

    return (
        <div className="dashboard-content">
            <header className="top-header">
                <div>
                    <h1>Customer Map</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
                        Where your customers are, inside the branch delivery radius
                    </p>
                </div>
                {branches.length > 0 && (
                    <div className="input-group" style={{ minWidth: '240px', margin: 0 }}>
                        <select value={branchId} aria-label="Branch" onChange={e => setBranchId(e.target.value)}>
                            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                    </div>
                )}
            </header>

            {error && (
                <div style={{ padding: '16px 20px', borderRadius: '12px', marginBottom: '24px', fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '12px', background: '#fef2f2', color: '#dc2626', border: '1px solid #f87171' }}>
                    <AlertCircle size={20} /> {error}
                </div>
            )}

            {!error && !loading && branches.length === 0 && (
                <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
                    <MapIcon size={64} style={{ opacity: 0.1, marginBottom: '24px' }} />
                    <p>No branches found. Create a branch first.</p>
                </div>
            )}

            {loading && branches.length > 0 && <p style={{ color: 'var(--text-muted)' }}>Loading...</p>}

            {data && !loading && (
                <div className="white-card" style={{ padding: '32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                        <div style={{ width: '40px', height: '40px', background: 'var(--accent-light)', color: 'var(--accent)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <MapIcon size={20} />
                        </div>
                        <div>
                            <h3 style={{ margin: 0 }}>{branch.name}</h3>
                            <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
                                {hasLocation ? `Delivery radius ${branch.deliveryRadius} km` : 'Location not set'}
                            </p>
                        </div>
                    </div>

                    {!hasLocation && notice('This branch needs a location (latitude and longitude) and a delivery radius. Add them in Branches to see its map.')}
                    {hasLocation && !data.mapsApiKey && notice('A Google Maps API key is needed to show the map. Add one under Payment Settings.')}
                    {hasLocation && data.mapsApiKey && !mapsReady && notice('Loading Google Maps…')}

                    {hasLocation && (
                        <>
                            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', margin: '20px 0' }}>
                                {stat(uniqueCustomers, 'Customers in radius')}
                                {stat(data.customers.length, 'Delivery addresses')}
                            </div>
                            {data.truncated && (
                                <div style={{ marginBottom: '16px' }}>{notice(`Showing the ${data.customers.length} nearest addresses.`)}</div>
                            )}
                            {data.customers.length === 0 && (
                                <div style={{ marginBottom: '16px', fontSize: '13px', color: 'var(--text-muted)' }}>
                                    No customers with a saved location inside the delivery radius yet.
                                </div>
                            )}
                            {canDraw && (
                                <>
                                    <div ref={mapDivRef} style={{ width: '100%', height: '560px', borderRadius: '16px', border: '1px solid var(--border-color)', background: '#f0f0f0' }} />
                                    <div style={{ display: 'flex', gap: '20px', marginTop: '12px', flexWrap: 'wrap' }}>
                                        {legend(BRANCH_COLOR, 'Branch', '14px')}
                                        {legend(CUSTOMER_COLOR, 'Customer', '10px')}
                                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                            <Users size={12} /> Click a marker for details
                                        </span>
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
