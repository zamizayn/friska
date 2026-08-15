import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit2, Trash2, Plus, Image as ImageIcon, CheckCircle2, XCircle, ArrowUpDown } from 'lucide-react';
import { API_ENDPOINTS, getHeaders } from '../apiConfig';

const compressImage = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new window.Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                const MAX_SIZE = 1600;
                if (width > MAX_SIZE || height > MAX_SIZE) {
                    if (width > height) {
                        height = Math.round((height * MAX_SIZE) / width);
                        width = MAX_SIZE;
                    } else {
                        width = Math.round((width * MAX_SIZE) / height);
                        height = MAX_SIZE;
                    }
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    if (!blob) {
                        reject(new Error("Canvas blob creation failed"));
                        return;
                    }
                    const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
                        type: 'image/jpeg',
                        lastModified: Date.now()
                    });
                    resolve(compressedFile);
                }, 'image/jpeg', 0.8);
            };
            img.onerror = (err) => reject(err);
            img.src = event.target.result;
        };
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(file);
    });
};

export default function Banners() {
    const [banners, setBanners] = useState([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        id: null,
        title: '',
        image: '',
        isActive: true,
        sortOrder: 0
    });
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [saving, setSaving] = useState(false);
    const navigate = useNavigate();

    const fetchBanners = async () => {
        const branchId = localStorage.getItem('selectedBranchId') || localStorage.getItem('branchId') || '';
        const res = await fetch(`${API_ENDPOINTS.BANNERS}?branchId=${branchId}`, { headers: getHeaders() });
        if (res.status === 401) return navigate('/login');
        const data = await res.json();
        setBanners(Array.isArray(data) ? data : []);
    };

    useEffect(() => {
        fetchBanners();
    }, []);

    const handleImageSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setImageFile(file);
        const reader = new FileReader();
        reader.onload = (event) => setImagePreview(event.target.result);
        reader.readAsDataURL(file);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.id && !imageFile) {
            alert('Please upload a banner image.');
            return;
        }

        setSaving(true);
        try {
            let uploadedImageUrl = formData.image;

            if (imageFile) {
                let fileToUpload = imageFile;
                try {
                    fileToUpload = await compressImage(imageFile);
                } catch (compressErr) {
                    console.error("Image compression failed, uploading original:", compressErr);
                }

                const formDataUpload = new FormData();
                formDataUpload.append('image', fileToUpload);
                const uploadRes = await fetch(`${API_ENDPOINTS.BANNERS}/upload`, {
                    method: 'POST',
                    headers: { 'Authorization': getHeaders()['Authorization'] },
                    body: formDataUpload,
                });
                if (uploadRes.ok) {
                    const uploadData = await uploadRes.json();
                    uploadedImageUrl = uploadData.url;
                } else {
                    alert('Image upload failed. Please try again.');
                    return;
                }
            }

            const url = formData.id ? `${API_ENDPOINTS.BANNERS}/${formData.id}` : API_ENDPOINTS.BANNERS;
            const method = formData.id ? 'PUT' : 'POST';

            const body = { ...formData, image: uploadedImageUrl };
            const branchId = localStorage.getItem('selectedBranchId') || localStorage.getItem('branchId');

            if (!formData.id) {
                if (!branchId) {
                    alert('Please select a branch first from the top menu.');
                    return;
                }
                body.branchId = branchId;
            }

            const res = await fetch(url, {
                method,
                headers: getHeaders(),
                body: JSON.stringify(body)
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.message || `Failed to save banner (${res.status})`);
            }

            setModalOpen(false);
            fetchBanners();
        } catch (err) {
            alert(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (confirm('Are you sure you want to delete this banner?')) {
            await fetch(`${API_ENDPOINTS.BANNERS}/${id}`, {
                method: 'DELETE',
                headers: getHeaders()
            });
            fetchBanners();
        }
    };

    const toggleActive = async (banner) => {
        await fetch(`${API_ENDPOINTS.BANNERS}/${banner.id}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify({ isActive: !banner.isActive })
        });
        fetchBanners();
    };

    const openModal = (item = null) => {
        if (item) {
            setFormData({
                id: item.id,
                title: item.title || '',
                image: item.image || '',
                isActive: item.isActive,
                sortOrder: item.sortOrder ?? 0
            });
            setImagePreview(item.image || null);
            setImageFile(null);
        } else {
            setFormData({
                id: null,
                title: '',
                image: '',
                isActive: true,
                sortOrder: banners.length
            });
            setImagePreview(null);
            setImageFile(null);
        }
        setModalOpen(true);
    };

    return (
        <div className="dashboard-content">
            <header className="top-header">
                <div>
                    <h1>Offer Banners</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>Upload promotional banners that appear at the top of your online store</p>
                </div>
                <button className="btn-primary" onClick={() => openModal()}>
                    <Plus size={18} /> Add New Banner
                </button>
            </header>

            <div className="white-card">
                <table className="modern-table">
                    <thead>
                        <tr>
                            <th>Banner</th>
                            <th>Title</th>
                            <th>Order</th>
                            <th>Status</th>
                            <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {banners.map(banner => (
                            <tr key={banner.id}>
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        {banner.image ? (
                                            <img
                                                src={banner.image}
                                                alt={banner.title || 'Banner'}
                                                style={{ width: '72px', height: '40px', objectFit: 'cover', borderRadius: '8px', background: 'var(--accent-light)' }}
                                                onError={e => { e.target.style.display = 'none'; }}
                                            />
                                        ) : (
                                            <div style={{ width: '72px', height: '40px', background: 'var(--accent-light)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
                                                <ImageIcon size={18} />
                                            </div>
                                        )}
                                        <span style={{ fontWeight: 700, fontSize: '15px' }}>#{banner.id}</span>
                                    </div>
                                </td>
                                <td>
                                    <div style={{ fontWeight: 600, fontSize: '14px' }}>{banner.title || '—'}</div>
                                </td>
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-muted)' }}>
                                        <ArrowUpDown size={14} /> {banner.sortOrder ?? 0}
                                    </div>
                                </td>
                                <td>
                                    <button
                                        onClick={() => toggleActive(banner)}
                                        style={{ border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
                                    >
                                        {banner.isActive ? (
                                            <><CheckCircle2 size={14} className="text-success" /> <span className="text-success">Active</span></>
                                        ) : (
                                            <><XCircle size={14} className="text-danger" /> <span className="text-danger">Paused</span></>
                                        )}
                                    </button>
                                </td>
                                <td>
                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                        <button className="btn-outline" style={{ padding: '8px' }} onClick={() => openModal(banner)} title="Edit">
                                            <Edit2 size={16} />
                                        </button>
                                        <button className="btn-outline" style={{ padding: '8px', color: 'var(--danger)' }} onClick={() => handleDelete(banner.id)} title="Delete">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {banners.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
                        <ImageIcon size={64} style={{ opacity: 0.1, marginBottom: '24px' }} />
                        <h3>No banners uploaded yet</h3>
                        <p>Add your first promotional banner to showcase it at the top of your store.</p>
                    </div>
                )}
            </div>

            {modalOpen && (
                <div className="modal-overlay active">
                    <div className="modal" style={{ maxWidth: '560px', padding: '32px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                            <h3>{formData.id ? 'Edit Banner' : 'New Banner'}</h3>
                            <button className="btn-outline" style={{ border: 'none', padding: '4px' }} onClick={() => setModalOpen(false)}>✕</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="input-group">
                                <label>Banner Image (Recommended: wide format, e.g. 1600x600)</label>
                                <div
                                    onClick={() => document.getElementById('banner-image-input')?.click()}
                                    style={{
                                        border: '2px dashed var(--border, #e5e7eb)',
                                        borderRadius: '12px',
                                        padding: '16px',
                                        cursor: 'pointer',
                                        textAlign: 'center',
                                        background: 'var(--bg-light, #fafafa)'
                                    }}
                                >
                                    {imagePreview ? (
                                        <img src={imagePreview} alt="Preview" style={{ width: '100%', maxHeight: '220px', objectFit: 'contain', borderRadius: '8px' }} />
                                    ) : (
                                        <div style={{ padding: '28px 0' }}>
                                            <ImageIcon size={32} style={{ color: 'var(--text-muted)', opacity: 0.4, marginBottom: '8px' }} />
                                            <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-main)' }}>Click to upload banner image</div>
                                        </div>
                                    )}
                                    <input id="banner-image-input" type="file" accept="image/*" onChange={handleImageSelect} style={{ display: 'none' }} />
                                </div>
                            </div>

                            <div className="input-group">
                                <label>Banner Title (Optional)</label>
                                <input type="text" placeholder="e.g. Weekend Chicken Special" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
                            </div>

                            <div className="input-group">
                                <label>Display Order</label>
                                <input
                                    type="number"
                                    placeholder="0"
                                    value={formData.sortOrder}
                                    onChange={e => setFormData({ ...formData, sortOrder: Number(e.target.value) || 0 })}
                                />
                                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Lower numbers appear first in the store carousel.</p>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '32px' }}>
                                <input
                                    type="checkbox"
                                    id="isActive"
                                    checked={formData.isActive}
                                    onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                                    style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                                />
                                <label htmlFor="isActive" style={{ cursor: 'pointer', fontWeight: 600 }}>Active and visible on the store</label>
                            </div>

                            <div className="modal-actions" style={{ gap: '12px' }}>
                                <button type="button" className="btn-outline" style={{ flex: 1 }} onClick={() => setModalOpen(false)}>Cancel</button>
                                <button type="submit" className="btn-primary" style={{ flex: 1, justifyContent: 'center' }} disabled={saving}>
                                    {saving ? 'Saving...' : (formData.id ? 'Save Banner' : 'Create Banner')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}