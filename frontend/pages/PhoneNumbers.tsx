import React, { useState, useEffect } from 'react';
import { Plus, Phone, Download, Globe, Trash2, Settings } from 'lucide-react';
import { getPhoneNumbers, deletePhoneNumber } from '../services/callyyService';
import type { PhoneNumber } from '../types';
import PhoneNumberModal from '../components/PhoneNumberModal';

const PhoneNumbers: React.FC = () => {
    const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const data = await getPhoneNumbers();
            setPhoneNumbers(data);
        } catch (error) {
            console.error('Error loading phone numbers:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this phone number?')) return;
        
        try {
            setDeletingId(id);
            const success = await deletePhoneNumber(id);
            if (success) {
                setPhoneNumbers(prev => prev.filter(num => num.id !== id));
            } else {
                alert('Failed to delete phone number');
            }
        } catch (error) {
            console.error('Error deleting phone number:', error);
            alert('Error deleting phone number');
        } finally {
            setDeletingId(null);
        }
    };

    const handleModalSuccess = (newPhoneNumber: PhoneNumber) => {
        setPhoneNumbers(prev => [newPhoneNumber, ...prev]);
    };

    const getProviderBadgeColor = (provider: PhoneNumber['provider']) => {
        switch (provider) {
            case 'Callyy':
            case 'CallyySIP':
                return 'bg-primary/10 text-primary border-primary/20';
            case 'Twilio':
                return 'bg-red-500/10 text-red-400 border-red-500/20';
            case 'Vonage':
                return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
            case 'Telnyx':
                return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
            case 'BYOSIP':
                return 'bg-green-500/10 text-green-400 border-green-500/20';
            default:
                return 'bg-background border-border text-textMuted';
        }
    };

    return (
         <div className="p-8 max-w-7xl mx-auto">
             <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-textMain">Phone Numbers</h1>
                    <p className="text-textMuted text-sm mt-1">Connect assistants to inbound and outbound lines.</p>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-black font-semibold rounded-lg text-sm hover:bg-primaryHover transition-colors"
                    >
                        <Plus size={18} />
                        Add Phone Number
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-full text-center py-12 text-textMuted">Loading...</div>
                ) : phoneNumbers.length === 0 ? (
                    <div className="col-span-full text-center py-12">
                        <Phone size={48} className="mx-auto mb-4 text-textMuted opacity-50" />
                        <h3 className="text-lg font-semibold text-textMain mb-2">No phone numbers yet</h3>
                        <p className="text-sm text-textMuted mb-4">Add a phone number to start receiving calls</p>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-black font-semibold rounded-lg hover:bg-primaryHover transition-colors"
                        >
                            <Plus size={18} />
                            Add Your First Phone Number
                        </button>
                    </div>
                ) : (
                    <>
                        {phoneNumbers.map(num => (
                            <div key={num.id} className="bg-surface border border-border rounded-xl p-5 hover:border-primary/50 transition-all group relative">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="w-10 h-10 rounded-full bg-surfaceHover flex items-center justify-center text-textMain">
                                        <Phone size={20} />
                                    </div>
                                    <div className={`px-2 py-1 rounded text-xs font-medium border ${getProviderBadgeColor(num.provider)}`}>
                                        {num.provider}
                                    </div>
                                </div>
                                
                                <h3 className="text-xl font-mono text-textMain mb-1 break-all">{num.number}</h3>
                                <p className="text-sm text-textMuted mb-6">{num.label || 'No label'}</p>

                                <div className="pt-4 border-t border-border space-y-3">
                                    <div className="flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-2 text-textMuted">
                                            <Globe size={14} />
                                            <span>Inbound {num.inboundEnabled ? 'Enabled' : 'Disabled'}</span>
                                        </div>
                                        {num.smsEnabled && (
                                            <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-xs">SMS</span>
                                        )}
                                    </div>
                                    
                                    <div className="flex gap-2">
                                        <button 
                                            className="flex-1 text-sm text-primary hover:underline flex items-center justify-center gap-1"
                                        >
                                            <Settings size={14} />
                                            Configure
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(num.id)}
                                            disabled={deletingId === num.id}
                                            className="px-3 py-1 text-sm text-red-400 hover:bg-red-500/10 rounded transition-colors flex items-center gap-1 disabled:opacity-50"
                                        >
                                            <Trash2 size={14} />
                                            {deletingId === num.id ? 'Deleting...' : 'Delete'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/* Add New Card */}
                        <div 
                            onClick={() => setIsModalOpen(true)}
                            className="border border-dashed border-border rounded-xl p-5 flex flex-col items-center justify-center text-center hover:bg-surfaceHover/30 transition-colors cursor-pointer min-h-[200px]"
                        >
                            <div className="w-12 h-12 rounded-full bg-surfaceHover flex items-center justify-center text-textMuted mb-3">
                                <Plus size={24} />
                            </div>
                            <h3 className="font-medium text-textMain">Add New Number</h3>
                            <p className="text-xs text-textMuted mt-1 max-w-[200px]">
                                Get a free Callyy number or import from Twilio, Vonage, Telnyx, or your own SIP trunk.
                            </p>
                        </div>
                    </>
                )}
            </div>

            <PhoneNumberModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={handleModalSuccess}
            />
         </div>
    );
};

export default PhoneNumbers;
