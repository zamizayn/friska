import { useEffect, useState } from 'react';
import { MapPin, Plus, Trash2, Store, Edit2, Clock } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { API_ENDPOINTS, getHeaders } from '../apiConfig';

const loadGoogleMapsScript = (apiKey, callback) => {
    if (!apiKey) {
        callback();
        return;
    }
    if (window.google && window.google.maps) {
        callback();
        return;
    }
    const existingScript = document.getElementById('google-maps-script');
    if (existingScript) {
        const interval = setInterval(() => {
            if (window.google && window.google.maps) {
                clearInterval(interval);
                callback();
            }
        }, 100);
        return;
    }

    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => callback();
    script.onerror = () => {
        console.error('Failed to load Google Maps script');
        callback();
    };
    document.head.appendChild(script);
};

export default function Branches() {
    const [branches, setBranches] = useState([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [apiKey, setApiKey] = useState('');
    const [mapsLoaded, setMapsLoaded] = useState(false);
    const [formData, setFormData] = useState({
        id: null,
        name: '',
        username: '',
        password: '',
        openingTime: '00:00',
        closingTime: '23:59',
        latitude: '',
        longitude: '',
        deliveryRadius: '',
        address: ''
    });
    const location = useLocation();
    const role = localStorage.getItem('adminRole');

    const format12Hour = (timeStr) => {
        if (!timeStr) return '12:00 AM';
        const [hour, minute] = timeStr.split(':');
        const h = parseInt(hour);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        return `${String(h12).padStart(2, '0')}:${minute} ${ampm}`;
    };

    const fetchBranches = async () => {
        const res = await fetch(API_ENDPOINTS.BRANCHES, {
            headers: getHeaders()
        });
        const data = await res.json();
        setBranches(Array.isArray(data) ? data : []);
    };

    useEffect(() => {
        fetchBranches();
        
        const fetchSettings = async () => {
            try {
                const res = await fetch(`${API_ENDPOINTS.TENANTS}/me/settings`, {
                    headers: getHeaders()
                });
                if (res.ok) {
                    const settings = await res.json();
                    if (settings.googleMapsApiKey) {
                        setApiKey(settings.googleMapsApiKey);
                        loadGoogleMapsScript(settings.googleMapsApiKey, () => {
                            setMapsLoaded(true);
                        });
                    }
                }
            } catch (err) {
                console.error("Failed to fetch tenant settings:", err);
            }
        };
        fetchSettings();
    }, []);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        if (params.get('add') === 'true') {
            setModalOpen(true);
        }
    }, [location.search]);

    useEffect(() => {
        if (!modalOpen || !mapsLoaded || !window.google || !window.google.maps) return;

        let map;
        let marker;
        let autocomplete;

        const mapContainer = document.getElementById('branch-map');
        const autocompleteInput = document.getElementById('branch-address-input');

        if (!mapContainer || !autocompleteInput) {
            const timer = setTimeout(() => {
                initializeMapAndAutocomplete();
            }, 100);
            return () => clearTimeout(timer);
        }

        function initializeMapAndAutocomplete() {
            const defaultLat = parseFloat(formData.latitude) || 12.9716;
            const defaultLng = parseFloat(formData.longitude) || 77.5946;
            const hasCoords = !isNaN(parseFloat(formData.latitude)) && !isNaN(parseFloat(formData.longitude));

            const mapOptions = {
                center: { lat: defaultLat, lng: defaultLng },
                zoom: hasCoords ? 15 : 12,
                mapTypeControl: false,
                streetViewControl: false
            };

            const mapEl = document.getElementById('branch-map');
            if (!mapEl) return;

            map = new window.google.maps.Map(mapEl, mapOptions);

            marker = new window.google.maps.Marker({
                position: { lat: defaultLat, lng: defaultLng },
                map: map,
                draggable: true
            });

            window.google.maps.event.addListener(marker, 'dragend', () => {
                const pos = marker.getPosition();
                setFormData(prev => ({
                    ...prev,
                    latitude: pos.lat().toFixed(8),
                    longitude: pos.lng().toFixed(8)
                }));
            });

            window.google.maps.event.addListener(map, 'click', (event) => {
                const pos = event.latLng;
                marker.setPosition(pos);
                setFormData(prev => ({
                    ...prev,
                    latitude: pos.lat().toFixed(8),
                    longitude: pos.lng().toFixed(8)
                }));
            });

            const inputEl = document.getElementById('branch-address-input');
            if (inputEl) {
                autocomplete = new window.google.maps.places.Autocomplete(inputEl, {
                    types: ['geocode', 'establishment']
                });
                
                autocomplete.addListener('place_changed', () => {
                    const place = autocomplete.getPlace();
                    if (!place.geometry || !place.geometry.location) return;

                    const loc = place.geometry.location;
                    map.setCenter(loc);
                    map.setZoom(16);
                    marker.setPosition(loc);

                    setFormData(prev => ({
                        ...prev,
                        address: place.formatted_address || place.name || '',
                        latitude: loc.lat().toFixed(8),
                        longitude: loc.lng().toFixed(8)
                    }));
                });
            }
        }

        initializeMapAndAutocomplete();
    }, [modalOpen, mapsLoaded]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const url = formData.id ? `${API_ENDPOINTS.BRANCHES}/${formData.id}` : API_ENDPOINTS.BRANCHES;
        const method = formData.id ? 'PUT' : 'POST';

        const payload = {
            ...formData,
            latitude: formData.latitude ? parseFloat(formData.latitude) : null,
            longitude: formData.longitude ? parseFloat(formData.longitude) : null,
            deliveryRadius: formData.deliveryRadius ? parseFloat(formData.deliveryRadius) : null
        };

        const res = await fetch(url, {
            method,
            headers: getHeaders(),
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            setModalOpen(false);
            setFormData({
                id: null,
                name: '',
                username: '',
                password: '',
                openingTime: '00:00',
                closingTime: '23:59',
                latitude: '',
                longitude: '',
                deliveryRadius: '',
                address: ''
            });
            fetchBranches();
        }
    };

    const openModal = (branch = null) => {
        if (branch) {
            setFormData({
                id: branch.id,
                name: branch.name,
                username: branch.username,
                password: '',
                openingTime: branch.openingTime || '00:00',
                closingTime: branch.closingTime || '23:59',
                latitude: branch.latitude || '',
                longitude: branch.longitude || '',
                deliveryRadius: branch.deliveryRadius || '',
                address: branch.address || ''
            });
        } else {
            setFormData({
                id: null,
                name: '',
                username: '',
                password: '',
                openingTime: '00:00',
                closingTime: '23:59',
                latitude: '',
                longitude: '',
                deliveryRadius: '',
                address: ''
            });
        }
        setModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure? This will NOT delete sub-data but will orphan them.')) return;
        await fetch(`${API_ENDPOINTS.BRANCHES}/${id}`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        fetchBranches();
    };

    return (
        <div className="dashboard-content">
            <header className="top-header">
                <div>
                    <h1>{role === 'branch' ? 'Hub Settings' : 'Branch Management'}</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>Manage physical locations and operational hours</p>
                </div>
                {role !== 'branch' && (
                    <button className="btn-primary" onClick={() => openModal()}>
                        <Plus size={18} /> Add Branch
                    </button>
                )}
            </header>

            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
                {branches.map(branch => (
                    <div key={branch.id} className="white-card" style={{ padding: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <div style={{ width: '48px', height: '48px', background: 'var(--accent-light)', color: 'var(--accent)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Store size={24} />
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '18px' }}>{branch.name}</h3>
                                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>#{branch.id}</span>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button className="btn-outline" style={{ padding: '8px' }} onClick={() => openModal(branch)}><Edit2 size={16} /></button>
                                {role !== 'branch' && (
                                    <button className="btn-outline" style={{ padding: '8px', color: 'var(--danger)' }} onClick={() => handleDelete(branch.id)}><Trash2 size={16} /></button>
                                )}
                            </div>
                        </div>

                        <div style={{ background: 'var(--bg-app)', padding: '16px', borderRadius: '16px', marginBottom: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '14px' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Username</span>
                                <span style={{ fontWeight: 700 }}>{branch.username}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: branch.address || branch.deliveryRadius ? '12px' : '0px', fontSize: '14px' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Security Key</span>
                                <span style={{ fontWeight: 700 }}>••••••••</span>
                            </div>
                            {branch.address && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: branch.deliveryRadius ? '12px' : '0px', fontSize: '14px' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Address</span>
                                    <span style={{ fontWeight: 500, textAlign: 'right', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={branch.address}>
                                        {branch.address}
                                    </span>
                                </div>
                            )}
                            {branch.deliveryRadius && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Delivery Radius</span>
                                    <span style={{ fontWeight: 700 }}>{branch.deliveryRadius} km</span>
                                </div>
                            )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent)', fontWeight: 700, fontSize: '14px' }}>
                            <Clock size={16} />
                            {format12Hour(branch.openingTime)} — {format12Hour(branch.closingTime)}
                        </div>
                    </div>
                ))}
            </div>

            {branches.length === 0 && (
                <div style={{ textAlign: 'center', padding: '100px 0', color: 'var(--text-muted)' }}>
                    <MapPin size={64} style={{ opacity: 0.1, marginBottom: '24px' }} />
                    <p>No branches have been created yet.</p>
                </div>
            )}

            {modalOpen && (
                <div className="modal-overlay active">
                    <div className="modal" style={{ maxWidth: '600px', padding: '32px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                            <h3>{formData.id ? 'Edit Branch' : 'New Branch'}</h3>
                            <button className="btn-outline" style={{ border: 'none', padding: '4px' }} onClick={() => setModalOpen(false)}>✕</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div className="input-group">
                                    <label>Branch Name</label>
                                    <input type="text" placeholder="e.g. Main Street Outlet" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                                </div>
                                <div className="input-group">
                                    <label>Login Username</label>
                                    <input type="text" placeholder="branch_admin" value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} required />
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div className="input-group">
                                    <label>Password {formData.id && <span style={{ fontSize: '12px', opacity: 0.6 }}>(Leave blank to keep current)</span>}</label>
                                    <input type="password" placeholder={formData.id ? "New password" : "Access password"} value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} required={!formData.id} />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <div className="input-group">
                                        <label>Opening Time</label>
                                        <input type="time" value={formData.openingTime} onChange={e => setFormData({ ...formData, openingTime: e.target.value })} required />
                                    </div>
                                    <div className="input-group">
                                        <label>Closing Time</label>
                                        <input type="time" value={formData.closingTime} onChange={e => setFormData({ ...formData, closingTime: e.target.value })} required />
                                    </div>
                                </div>
                            </div>
                            <div className="input-group">
                                <label>Physical Address</label>
                                <input 
                                    id="branch-address-input" 
                                    type="text" 
                                    placeholder={mapsLoaded ? "Search address or type location..." : "Type physical address..."} 
                                    value={formData.address} 
                                    onChange={e => setFormData({ ...formData, address: e.target.value })} 
                                />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                                <div className="input-group">
                                    <label>Delivery Radius (km)</label>
                                    <input 
                                        type="number" 
                                        step="0.1" 
                                        placeholder="e.g. 5" 
                                        value={formData.deliveryRadius} 
                                        onChange={e => setFormData({ ...formData, deliveryRadius: e.target.value })} 
                                    />
                                </div>
                                <div className="input-group">
                                    <label>Latitude</label>
                                    <input 
                                        type="number" 
                                        step="0.00000001" 
                                        placeholder="e.g. 12.9716" 
                                        value={formData.latitude} 
                                        onChange={e => setFormData({ ...formData, latitude: e.target.value })} 
                                    />
                                </div>
                                <div className="input-group">
                                    <label>Longitude</label>
                                    <input 
                                        type="number" 
                                        step="0.00000001" 
                                        placeholder="e.g. 77.5946" 
                                        value={formData.longitude} 
                                        onChange={e => setFormData({ ...formData, longitude: e.target.value })} 
                                    />
                                </div>
                            </div>

                            {mapsLoaded ? (
                                <div style={{ marginBottom: '20px' }}>
                                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>
                                        Pinpoint Location (Drag marker or click map)
                                    </label>
                                    <div 
                                        id="branch-map" 
                                        style={{ 
                                            width: '100%', 
                                            height: '220px', 
                                            borderRadius: '12px', 
                                            border: '1px solid var(--border)', 
                                            background: '#f0f0f0' 
                                        }} 
                                    />
                                </div>
                            ) : apiKey ? (
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                                    Loading Google Maps...
                                </div>
                            ) : (
                                <div style={{ fontSize: '12px', color: 'var(--warning)', marginBottom: '16px', background: 'rgba(230, 162, 60, 0.1)', padding: '8px 12px', borderRadius: '8px' }}>
                                    ⚠️ Google Maps API Key is not set in Settings. Map and address autocomplete are disabled. You can still enter coordinates manually.
                                </div>
                            )}

                            <div className="modal-actions" style={{ gap: '12px', marginTop: '24px' }}>
                                <button type="button" className="btn-outline" style={{ flex: 1 }} onClick={() => setModalOpen(false)}>Cancel</button>
                                <button type="submit" className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}>{formData.id ? 'Save Changes' : 'Create Branch'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
