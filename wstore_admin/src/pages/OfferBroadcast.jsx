import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Image, MessageSquare, X, CheckCircle, AlertCircle } from 'lucide-react';
import { API_ENDPOINTS, getHeaders } from '../apiConfig';

const TEMPLATES = [
    { value: 'offer_template', label: 'Offer Template (Text)' },
    { value: 'offer_template_image', label: 'Offer Template with Image' },
];

const TEMPLATE_PARAMS = {
    offer_template: [
        { key: '1', label: 'Customer Name', placeholder: 'e.g. John' },
        { key: '2', label: 'Offer Title', placeholder: 'e.g. Summer Sale' },
        { key: '3', label: 'Discount', placeholder: 'e.g. 20% OFF' },
        { key: '4', label: 'Valid Until', placeholder: 'e.g. 31st March' },
    ],
    offer_template_image: [
        { key: '1', label: 'Customer Name', placeholder: 'e.g. John' },
        { key: '2', label: 'Offer Title', placeholder: 'e.g. Summer Sale' },
        { key: '3', label: 'Discount', placeholder: 'e.g. 20% OFF' },
        { key: '4', label: 'Valid Until', placeholder: 'e.g. 31st March' },
    ],
};

const LIVE_PREVIEWS = {
    offer_template: (params) => {
        const [name, title, discount, validUntil] = params;
        return `Hey ${name || '{{1}}'},

We have an exclusive offer just for you!

${title || '{{2}}'} - ${discount || '{{3}}'}

Valid until: ${validUntil || '{{4}}'}

Tap below to grab this deal!
`;
    },
    offer_template_image: (params) => {
        const [name, title, discount, validUntil] = params;
        return `Hey ${name || '{{1}}'},

We have an exclusive offer just for you!

${title || '{{2}}'} - ${discount || '{{3}}'}

Valid until: ${validUntil || '{{4}}'}

Tap below to grab this deal!
`;
    },
};

export default function OfferBroadcast() {
    const navigate = useNavigate();
    const branchId = localStorage.getItem('selectedBranchId') || localStorage.getItem('branchId') || '';
    const role = localStorage.getItem('adminRole');

    const [templateName, setTemplateName] = useState('offer_template');
    const [phones, setPhones] = useState('');
    const [bodyParams, setBodyParams] = useState({});
    const [image, setImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [sending, setSending] = useState(false);
    const [progress, setProgress] = useState(null);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    const selectedTemplate = TEMPLATES.find(t => t.value === templateName);
    const paramDefs = TEMPLATE_PARAMS[templateName] || [];
    const previewParams = paramDefs.map(p => bodyParams[p.key] || '');
    const previewText = LIVE_PREVIEWS[templateName] ? LIVE_PREVIEWS[templateName](previewParams) : '';

    const handleImageSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImage(file);
            const reader = new FileReader();
            reader.onload = (ev) => setImagePreview(ev.target.result);
            reader.readAsDataURL(file);
        }
    };

    const normalizePhone = (raw) => {
        let p = raw.replace(/\s+/g, '');
        if (p.startsWith('+')) p = p.slice(1);
        return p;
    };

    const handleSend = async () => {
        const phoneList = phones.split(',')
            .map(s => s.trim())
            .filter(Boolean)
            .map(normalizePhone)
            .filter(p => /^\d{10,15}$/.test(p));

        if (phoneList.length === 0) {
            setError('Please enter at least one valid phone number.');
            return;
        }

        if (!templateName) {
            setError('Please select a template.');
            return;
        }

        setSending(true);
        setError(null);
        setResult(null);

        try {
            let uploadedImageUrl = null;

            if (image && templateName === 'offer_template_image') {
                const formData = new FormData();
                formData.append('image', image);
                const uploadRes = await fetch(`${API_ENDPOINTS.OFFERS}/upload`, {
                    method: 'POST',
                    headers: { 'Authorization': getHeaders()['Authorization'] },
                    body: formData,
                });
                if (uploadRes.ok) {
                    const uploadData = await uploadRes.json();
                    uploadedImageUrl = uploadData.url;
                }
            }

            const payload = {
                templateName,
                phones: phoneList,
                branchId: branchId || undefined,
                headerImage: uploadedImageUrl,
                bodyParams: paramDefs.map(p => bodyParams[p.key] || ''),
            };

            const res = await fetch(API_ENDPOINTS.OFFER_BROADCAST, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(payload),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Broadcast failed');

            setResult(data);
        } catch (e) {
            setError(e.message);
        } finally {
            setSending(false);
        }
    };

    if (role === 'branch') {
        return (
            <div className="p-6">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800">
                    Offer broadcast is not available for branch users.
                </div>
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
                <MessageSquare className="w-7 h-7 text-blue-600" />
                <h1 className="text-2xl font-bold text-gray-800">Offer Broadcast</h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-6">
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">WhatsApp Template</label>
                        <select
                            value={templateName}
                            onChange={(e) => { setTemplateName(e.target.value); setBodyParams({}); setImage(null); setImagePreview(null); }}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            {TEMPLATES.map(t => (
                                <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                        </select>
                    </div>

                    {templateName === 'offer_template_image' && (
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Header Image</label>
                            <div className="flex items-center gap-4">
                                <label className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg cursor-pointer hover:bg-blue-100 border border-blue-200 text-sm">
                                    <Image className="w-4 h-4" />
                                    Choose Image
                                    <input type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                                </label>
                                {imagePreview && (
                                    <button onClick={() => { setImage(null); setImagePreview(null); }} className="text-red-500 hover:text-red-700">
                                        <X className="w-5 h-5" />
                                    </button>
                                )}
                            </div>
                            {imagePreview && (
                                <img src={imagePreview} alt="Preview" className="mt-3 max-h-40 rounded-lg border border-gray-200" />
                            )}
                        </div>
                    )}

                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
                        <h3 className="text-sm font-semibold text-gray-700 mb-3">Message Variables</h3>
                        <div className="space-y-3">
                            {paramDefs.map(p => (
                                <div key={p.key}>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">{`{{${p.key}}} — ${p.label}`}</label>
                                    <input
                                        type="text"
                                        value={bodyParams[p.key] || ''}
                                        onChange={(e) => setBodyParams(prev => ({ ...prev, [p.key]: e.target.value }))}
                                        placeholder={p.placeholder}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Recipients</label>
                        <p className="text-xs text-gray-500 mb-2">Enter phone numbers separated by commas (with or without country code)</p>
                        <textarea
                            value={phones}
                            onChange={(e) => setPhones(e.target.value)}
                            placeholder="+919876543210, +919876543211, ..."
                            rows={4}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        />
                    </div>

                    {error && (
                        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                            <span>{error}</span>
                        </div>
                    )}

                    {result && (
                        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                            <div className="flex items-center gap-2 text-green-700 font-semibold mb-2">
                                <CheckCircle className="w-5 h-5" />
                                Broadcast Complete
                            </div>
                            <p className="text-sm text-green-600">
                                Sent: {result.sent} | Failed: {result.failed}
                            </p>
                        </div>
                    )}

                    <button
                        onClick={handleSend}
                        disabled={sending}
                        className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold"
                    >
                        {sending ? (
                            <>Sending...</>
                        ) : (
                            <><Send className="w-4 h-4" /> Send Broadcast</>
                        )}
                    </button>
                </div>

                <div className="lg:sticky lg:top-6 space-y-4">
                    <h3 className="text-sm font-semibold text-gray-700">Preview</h3>
                    <div className="bg-gray-100 rounded-xl p-4 flex justify-center">
                        <div className="max-w-sm w-full bg-white rounded-2xl shadow-md overflow-hidden">
                            {templateName === 'offer_template_image' && imagePreview && (
                                <img src={imagePreview} alt="Offer" className="w-full h-48 object-cover" />
                            )}
                            <div className="p-4">
                                <div className="flex items-start gap-3">
                                    <div className="flex-shrink-0">
                                        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
                                            F
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-xs text-gray-500 mb-1">Friska</div>
                                        <div className="bg-gray-100 rounded-lg p-3 text-sm text-gray-800 whitespace-pre-line leading-relaxed">
                                            {previewText || 'Select a template and fill in the variables to see a preview.'}
                                        </div>
                                        <div className="text-xs text-gray-400 mt-1 text-right">12:00</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}