
import React, { useEffect, useState, useRef } from 'react';
import { Plus, Search, MoreHorizontal, Trash2, X, Save, Edit, Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle, Brain, MessageSquare, TrendingUp, Lightbulb, Clock, Phone, User, Heart, ChevronRight, Loader2, Calendar, Target, AlertTriangle, MessageCircle } from 'lucide-react';
import { getCustomers, createCustomer, updateCustomer, deleteCustomer, createBulkCustomers, getCustomerMemory, getCustomerConversations, getCustomerInsights, getCustomerWhatsAppMessages, WhatsAppMessage } from '../services/callyyService';
import { Customer, CustomerMemory, CustomerConversation, CustomerInsight } from '../types';

const Customers: React.FC = () => {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    // Customer Details Modal State
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [selectedCustomerForDetails, setSelectedCustomerForDetails] = useState<Customer | null>(null);
    const [customerMemory, setCustomerMemory] = useState<CustomerMemory | null>(null);
    const [customerConversations, setCustomerConversations] = useState<CustomerConversation[]>([]);
    const [customerInsights, setCustomerInsights] = useState<CustomerInsight[]>([]);
    const [whatsappMessages, setWhatsappMessages] = useState<WhatsAppMessage[]>([]);
    const [loadingMemory, setLoadingMemory] = useState(false);
    
    // Bulk upload state
    const [bulkUploading, setBulkUploading] = useState(false);
    const [bulkError, setBulkError] = useState<string | null>(null);
    const [bulkSuccess, setBulkSuccess] = useState<string | null>(null);
    const [parsedCustomers, setParsedCustomers] = useState<Omit<Customer, 'id' | 'createdAt'>[]>([]);
    const [csvPreview, setCsvPreview] = useState<string[][]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // Form State
    const [currentCustomer, setCurrentCustomer] = useState<Partial<Customer>>({
        name: '',
        email: '',
        phoneNumber: '',
        variables: {}
    });
    const [tempVariables, setTempVariables] = useState<{key: string, value: string}[]>([]);

    const loadCustomers = async () => {
        try {
            setLoading(true);
            const data = await getCustomers();
            setCustomers(data);
            setError(null);
        } catch (err) {
            console.error('Failed to load customers:', err);
            // Don't show error, just leave empty state
            setCustomers([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCustomers();
    }, []);

    const handleEdit = (customer: Customer) => {
        setCurrentCustomer(customer);
        // Convert vars object to array for the form
        const varsArray = Object.entries(customer.variables).map(([key, value]) => ({ key, value }));
        setTempVariables(varsArray);
        setIsModalOpen(true);
    };

    const handleViewDetails = async (customer: Customer) => {
        setSelectedCustomerForDetails(customer);
        setIsDetailsModalOpen(true);
        setLoadingMemory(true);
        setCustomerMemory(null);
        setCustomerConversations([]);
        setCustomerInsights([]);
        setWhatsappMessages([]);

        try {
            // Load customer memory, conversations, insights, and WhatsApp messages in parallel
            const [memory, conversations, insights, messages] = await Promise.all([
                getCustomerMemory(customer.id),
                getCustomerConversations(customer.id),
                getCustomerInsights(customer.id),
                getCustomerWhatsAppMessages(customer.id)
            ]);

            setCustomerMemory(memory);
            setCustomerConversations(conversations);
            setCustomerInsights(insights);
            setWhatsappMessages(messages);
        } catch (err) {
            console.error('Failed to load customer memory:', err);
        } finally {
            setLoadingMemory(false);
        }
    };

    const closeDetailsModal = () => {
        setIsDetailsModalOpen(false);
        setSelectedCustomerForDetails(null);
        setCustomerMemory(null);
        setCustomerConversations([]);
        setCustomerInsights([]);
        setWhatsappMessages([]);
    };

    const handleAdd = () => {
        setCurrentCustomer({ name: '', email: '', phoneNumber: '', variables: {} });
        setTempVariables([{ key: '', value: '' }]); // Start with one empty row
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        // Validation
        if (!currentCustomer.name?.trim() || !currentCustomer.email?.trim() || !currentCustomer.phoneNumber?.trim()) {
            alert('Please fill in all required fields (Name, Email, Phone Number)');
            return;
        }

        // Validate & convert array back to object
        const newVariables: Record<string, string> = {};
        tempVariables.forEach(item => {
            if (item.key.trim()) {
                newVariables[item.key.trim()] = item.value;
            }
        });

        try {
            setSaving(true);
            setError(null);

            if (currentCustomer.id) {
                // Update existing customer
                const success = await updateCustomer(currentCustomer.id, {
                    name: currentCustomer.name,
                    email: currentCustomer.email,
                    phoneNumber: currentCustomer.phoneNumber,
                    variables: newVariables
                });

                if (success) {
                    await loadCustomers(); // Reload to get fresh data
                    setIsModalOpen(false);
                } else {
                    setError('Failed to update customer. Please try again.');
                }
            } else {
                // Create new customer
                const newCustomer = await createCustomer({
                    name: currentCustomer.name!,
                    email: currentCustomer.email!,
                    phoneNumber: currentCustomer.phoneNumber!,
                    variables: newVariables
                });

                if (newCustomer) {
                    await loadCustomers(); // Reload to get fresh data
                    setIsModalOpen(false);
                } else {
                    setError('Failed to create customer. Please try again.');
                }
            }
        } catch (err) {
            console.error('Error saving customer:', err);
            setError('An error occurred while saving. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this customer? This action cannot be undone.')) {
            return;
        }

        try {
            const success = await deleteCustomer(id);
            if (success) {
                await loadCustomers(); // Reload to get fresh data
            } else {
                alert('Failed to delete customer. Please try again.');
            }
        } catch (err) {
            console.error('Error deleting customer:', err);
            alert('An error occurred while deleting. Please try again.');
        }
    };

    const updateVariableRow = (index: number, field: 'key' | 'value', val: string) => {
        const newVars = [...tempVariables];
        newVars[index][field] = val;
        setTempVariables(newVars);
    };

    const removeVariableRow = (index: number) => {
        setTempVariables(prev => prev.filter((_, i) => i !== index));
    };

    const addVariableRow = () => {
        setTempVariables(prev => [...prev, { key: '', value: '' }]);
    };

    // ============================================
    // BULK UPLOAD FUNCTIONS
    // ============================================

    const handleBulkModalOpen = () => {
        setBulkError(null);
        setBulkSuccess(null);
        setParsedCustomers([]);
        setCsvPreview([]);
        setIsBulkModalOpen(true);
    };

    const handleBulkModalClose = () => {
        setIsBulkModalOpen(false);
        setBulkError(null);
        setBulkSuccess(null);
        setParsedCustomers([]);
        setCsvPreview([]);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const downloadTemplate = () => {
        const headers = ['name', 'email', 'phone_number', 'var_plan_type', 'var_account_id', 'var_company'];
        const sampleData = [
            ['John Doe', 'john@example.com', '+919876543210', 'Premium', 'ACC001', 'Acme Corp'],
            ['Jane Smith', 'jane@example.com', '+919876543211', 'Basic', 'ACC002', 'Tech Solutions'],
            ['Bob Wilson', 'bob@example.com', '+919876543212', 'Enterprise', 'ACC003', 'Global Inc']
        ];
        
        const csvContent = [
            headers.join(','),
            ...sampleData.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'customers_template.csv';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const parseCSV = (text: string): string[][] => {
        const lines = text.split('\n').filter(line => line.trim());
        return lines.map(line => {
            const result: string[] = [];
            let current = '';
            let inQuotes = false;
            
            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    result.push(current.trim());
                    current = '';
                } else {
                    current += char;
                }
            }
            result.push(current.trim());
            return result;
        });
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setBulkError(null);
        setBulkSuccess(null);

        if (!file.name.endsWith('.csv')) {
            setBulkError('Please upload a CSV file');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target?.result as string;
                const rows = parseCSV(text);
                
                if (rows.length < 2) {
                    setBulkError('CSV file must have a header row and at least one data row');
                    return;
                }

                const headers = rows[0].map(h => h.toLowerCase().trim());
                const nameIndex = headers.indexOf('name');
                const emailIndex = headers.indexOf('email');
                const phoneIndex = headers.findIndex(h => h === 'phone_number' || h === 'phone' || h === 'phonenumber');

                if (nameIndex === -1 || emailIndex === -1 || phoneIndex === -1) {
                    setBulkError('CSV must have columns: name, email, and phone_number (or phone)');
                    return;
                }

                // Find variable columns (columns starting with 'var_')
                const varColumns = headers
                    .map((h, i) => ({ header: h, index: i }))
                    .filter(({ header }) => header.startsWith('var_'));

                const dataRows = rows.slice(1);
                const customers: Omit<Customer, 'id' | 'createdAt'>[] = [];
                const errors: string[] = [];

                dataRows.forEach((row, rowIndex) => {
                    const name = row[nameIndex]?.trim();
                    const email = row[emailIndex]?.trim();
                    const phoneNumber = row[phoneIndex]?.trim();

                    if (!name || !email || !phoneNumber) {
                        errors.push(`Row ${rowIndex + 2}: Missing required field (name, email, or phone)`);
                        return;
                    }

                    // Parse variables
                    const variables: Record<string, string> = {};
                    varColumns.forEach(({ header, index }) => {
                        const value = row[index]?.trim();
                        if (value) {
                            const varName = header.replace('var_', '');
                            variables[varName] = value;
                        }
                    });

                    customers.push({ name, email, phoneNumber, variables });
                });

                if (errors.length > 0) {
                    setBulkError(`Found ${errors.length} invalid rows:\n${errors.slice(0, 3).join('\n')}${errors.length > 3 ? `\n...and ${errors.length - 3} more` : ''}`);
                }

                setParsedCustomers(customers);
                setCsvPreview(rows.slice(0, 6)); // Show header + first 5 rows
            } catch (err) {
                setBulkError('Failed to parse CSV file. Please check the format.');
                console.error('CSV parse error:', err);
            }
        };

        reader.onerror = () => {
            setBulkError('Failed to read file');
        };

        reader.readAsText(file);
    };

    const handleBulkUpload = async () => {
        if (parsedCustomers.length === 0) {
            setBulkError('No valid customers to upload');
            return;
        }

        try {
            setBulkUploading(true);
            setBulkError(null);

            const result = await createBulkCustomers(parsedCustomers);

            if (result.success > 0) {
                setBulkSuccess(`Successfully added ${result.success} customer${result.success > 1 ? 's' : ''}`);
                if (result.failed > 0) {
                    setBulkError(`${result.failed} customer${result.failed > 1 ? 's' : ''} failed to upload`);
                }
                await loadCustomers();
                
                // Clear form after successful upload
                setTimeout(() => {
                    if (result.failed === 0) {
                        handleBulkModalClose();
                    }
                }, 2000);
            } else {
                setBulkError(`Failed to upload customers: ${result.errors.join(', ')}`);
            }
        } catch (err) {
            console.error('Bulk upload error:', err);
            setBulkError('An error occurred during upload');
        } finally {
            setBulkUploading(false);
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-textMain">Customers</h1>
                    <p className="text-textMuted text-sm mt-1">Manage customer data and assistant context variables.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={handleBulkModalOpen}
                        className="flex items-center gap-2 px-4 py-2 bg-surface border border-border text-textMain font-medium rounded-lg text-sm hover:bg-surfaceHover transition-colors"
                    >
                        <Upload size={18} />
                        Bulk Upload
                    </button>
                    <button 
                        onClick={handleAdd}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-black font-semibold rounded-lg text-sm hover:bg-primaryHover transition-colors"
                    >
                        <Plus size={18} />
                        Add Customer
                    </button>
                </div>
            </div>

            <div className="bg-surface border border-border rounded-xl overflow-hidden">
                <div className="p-4 border-b border-border flex items-center gap-3">
                     <Search size={18} className="text-textMuted" />
                     <input 
                        type="text" 
                        placeholder="Search by name, email or phone..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-transparent outline-none text-sm text-textMain w-full placeholder:text-textMuted"
                     />
                </div>

                {/* Table Header */}
                <div className="grid grid-cols-12 gap-4 p-4 border-b border-border text-xs font-semibold text-textMuted uppercase tracking-wider bg-background/50">
                    <div className="col-span-3 pl-2">Name</div>
                    <div className="col-span-3">Contact</div>
                    <div className="col-span-4">Context Variables</div>
                    <div className="col-span-2 text-right">Actions</div>
                </div>

                {/* Table Body */}
                <div className="divide-y divide-border">
                    {loading ? (
                        <div className="p-8 text-center text-textMuted text-sm">Loading customers...</div>
                    ) : customers.length === 0 ? (
                        <div className="p-8 text-center text-textMuted text-sm">
                            No customers found. Click "Add Customer" to get started.
                        </div>
                    ) : customers.map(customer => (
                        <div 
                            key={customer.id} 
                            className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-surfaceHover transition-colors group cursor-pointer"
                            onClick={() => handleViewDetails(customer)}
                        >
                            <div className="col-span-3 pl-2">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                                        <User size={16} className="text-primary" />
                                    </div>
                                    <div>
                                        <div className="text-sm font-medium text-textMain">{customer.name}</div>
                                        <div className="text-xs text-textMuted">Added {customer.createdAt}</div>
                                    </div>
                                </div>
                            </div>
                            <div className="col-span-3">
                                <div className="text-sm text-textMain">{customer.email}</div>
                                <div className="text-xs text-textMuted font-mono">{customer.phoneNumber}</div>
                            </div>
                            <div className="col-span-4">
                                <div className="flex flex-wrap gap-2">
                                    {Object.entries(customer.variables).slice(0, 3).map(([k, v]) => (
                                        <span key={k} className="px-2 py-0.5 rounded bg-background border border-border text-[10px] text-textMuted flex items-center gap-1">
                                            <span className="font-semibold text-gray-400">{k}:</span> {v}
                                        </span>
                                    ))}
                                    {Object.keys(customer.variables).length > 3 && (
                                        <span className="text-[10px] text-textMuted self-center">
                                            +{Object.keys(customer.variables).length - 3} more
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="col-span-2 text-right flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleViewDetails(customer); }}
                                    className="p-1.5 hover:bg-background rounded text-textMuted hover:text-primary transition-colors"
                                    title="View Details & Memory"
                                >
                                    <Brain size={16} />
                                </button>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleEdit(customer); }}
                                    className="p-1.5 hover:bg-background rounded text-textMuted hover:text-primary transition-colors"
                                    title="Edit Customer"
                                >
                                    <Edit size={16} />
                                </button>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleDelete(customer.id); }}
                                    className="p-1.5 hover:bg-background rounded text-textMuted hover:text-red-500 transition-colors"
                                    title="Delete Customer"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Add/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-surface border border-border rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
                        <div className="p-6 border-b border-border flex justify-between items-center">
                            <h2 className="text-xl font-bold text-textMain">
                                {currentCustomer.id ? 'Edit Customer' : 'Add New Customer'}
                            </h2>
                            <button 
                                onClick={() => setIsModalOpen(false)}
                                className="text-textMuted hover:text-textMain"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1 space-y-6">
                            {error && (
                                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm">
                                    {error}
                                </div>
                            )}
                            
                            {/* Basic Info */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-textMuted uppercase tracking-wider">Basic Information</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs text-textMuted">Full Name</label>
                                        <input 
                                            type="text" 
                                            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-textMain outline-none focus:border-primary"
                                            value={currentCustomer.name}
                                            onChange={(e) => setCurrentCustomer({...currentCustomer, name: e.target.value})}
                                            placeholder="e.g. John Doe"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs text-textMuted">Phone Number</label>
                                        <input 
                                            type="text" 
                                            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-textMain outline-none focus:border-primary"
                                            value={currentCustomer.phoneNumber}
                                            onChange={(e) => setCurrentCustomer({...currentCustomer, phoneNumber: e.target.value})}
                                            placeholder="e.g. +91 98765 43210"
                                        />
                                    </div>
                                    <div className="col-span-2 space-y-1">
                                        <label className="text-xs text-textMuted">Email Address</label>
                                        <input 
                                            type="email" 
                                            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-textMain outline-none focus:border-primary"
                                            value={currentCustomer.email}
                                            onChange={(e) => setCurrentCustomer({...currentCustomer, email: e.target.value})}
                                            placeholder="e.g. john@example.com"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Variables Section */}
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h3 className="text-sm font-semibold text-textMuted uppercase tracking-wider">Context Variables</h3>
                                        <p className="text-xs text-textMuted mt-0.5">These values will be available to the assistant during calls.</p>
                                    </div>
                                    <button 
                                        onClick={addVariableRow}
                                        className="text-xs text-primary hover:text-primaryHover font-medium flex items-center gap-1"
                                    >
                                        <Plus size={14} /> Add Variable
                                    </button>
                                </div>
                                
                                <div className="space-y-3 bg-background rounded-lg p-4 border border-border">
                                    {tempVariables.length === 0 && (
                                        <div className="text-center text-xs text-textMuted py-2">No variables defined yet.</div>
                                    )}
                                    {tempVariables.map((item, idx) => (
                                        <div key={idx} className="flex gap-3 items-center">
                                            <input 
                                                type="text" 
                                                placeholder="Key (e.g. plan_type)" 
                                                className="flex-1 bg-surface border border-border rounded px-3 py-2 text-sm text-textMain outline-none focus:border-primary font-mono text-xs"
                                                value={item.key}
                                                onChange={(e) => updateVariableRow(idx, 'key', e.target.value)}
                                            />
                                            <span className="text-textMuted">:</span>
                                            <input 
                                                type="text" 
                                                placeholder="Value (e.g. Premium)" 
                                                className="flex-1 bg-surface border border-border rounded px-3 py-2 text-sm text-textMain outline-none focus:border-primary"
                                                value={item.value}
                                                onChange={(e) => updateVariableRow(idx, 'value', e.target.value)}
                                            />
                                            <button 
                                                onClick={() => removeVariableRow(idx)}
                                                className="p-2 text-textMuted hover:text-red-500 hover:bg-surface rounded transition-colors"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-border flex justify-end gap-3 bg-surface/50">
                            <button 
                                onClick={() => setIsModalOpen(false)}
                                className="px-4 py-2 bg-transparent border border-border text-textMain rounded-lg text-sm hover:bg-surfaceHover transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleSave}
                                disabled={saving}
                                className="px-4 py-2 bg-primary text-black font-semibold rounded-lg text-sm hover:bg-primaryHover transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Save size={16} />
                                {saving ? 'Saving...' : 'Save Customer'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bulk Upload Modal */}
            {isBulkModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-surface border border-border rounded-xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">
                        <div className="p-6 border-b border-border flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-bold text-textMain">Bulk Upload Customers</h2>
                                <p className="text-sm text-textMuted mt-1">Upload multiple customers from a CSV file</p>
                            </div>
                            <button 
                                onClick={handleBulkModalClose}
                                className="text-textMuted hover:text-textMain"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1 space-y-6">
                            {/* Success Message */}
                            {bulkSuccess && (
                                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 flex items-start gap-3">
                                    <CheckCircle size={20} className="text-green-400 mt-0.5 shrink-0" />
                                    <div className="text-green-400 text-sm">{bulkSuccess}</div>
                                </div>
                            )}
                            
                            {/* Error Message */}
                            {bulkError && (
                                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-start gap-3">
                                    <AlertCircle size={20} className="text-red-400 mt-0.5 shrink-0" />
                                    <div className="text-red-400 text-sm whitespace-pre-line">{bulkError}</div>
                                </div>
                            )}
                            
                            {/* Step 1: Download Template */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">1</div>
                                    <h3 className="text-sm font-semibold text-textMain">Download CSV Template</h3>
                                </div>
                                <div className="ml-8 space-y-3">
                                    <p className="text-xs text-textMuted">
                                        Download our template with the required columns. Add context variables by creating columns with the prefix <code className="bg-background px-1.5 py-0.5 rounded text-primary">var_</code> (e.g., var_plan_type, var_account_id).
                                    </p>
                                    <button 
                                        onClick={downloadTemplate}
                                        className="flex items-center gap-2 px-4 py-2 bg-background border border-border rounded-lg text-sm text-textMain hover:bg-surfaceHover transition-colors"
                                    >
                                        <Download size={16} />
                                        Download Template CSV
                                    </button>
                                </div>
                            </div>

                            {/* Step 2: Upload File */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">2</div>
                                    <h3 className="text-sm font-semibold text-textMain">Upload Your CSV</h3>
                                </div>
                                <div className="ml-8 space-y-3">
                                    <div 
                                        className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept=".csv"
                                            onChange={handleFileUpload}
                                            className="hidden"
                                        />
                                        <FileSpreadsheet size={40} className="mx-auto text-textMuted mb-3" />
                                        <p className="text-sm text-textMain font-medium">Click to upload or drag and drop</p>
                                        <p className="text-xs text-textMuted mt-1">CSV files only</p>
                                    </div>
                                </div>
                            </div>

                            {/* Step 3: Preview */}
                            {csvPreview.length > 0 && (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">3</div>
                                        <h3 className="text-sm font-semibold text-textMain">Preview & Confirm</h3>
                                        <span className="text-xs text-textMuted ml-2">
                                            ({parsedCustomers.length} valid customer{parsedCustomers.length !== 1 ? 's' : ''} found)
                                        </span>
                                    </div>
                                    <div className="ml-8">
                                        <div className="overflow-x-auto rounded-lg border border-border">
                                            <table className="w-full text-xs">
                                                <thead>
                                                    <tr className="bg-background">
                                                        {csvPreview[0]?.map((header, i) => (
                                                            <th key={i} className="px-3 py-2 text-left text-textMuted font-semibold uppercase tracking-wider whitespace-nowrap border-b border-border">
                                                                {header}
                                                            </th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-border">
                                                    {csvPreview.slice(1).map((row, rowIndex) => (
                                                        <tr key={rowIndex} className="hover:bg-surfaceHover">
                                                            {row.map((cell, cellIndex) => (
                                                                <td key={cellIndex} className="px-3 py-2 text-textMain whitespace-nowrap">
                                                                    {cell || <span className="text-textMuted italic">empty</span>}
                                                                </td>
                                                            ))}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                        {csvPreview.length > 6 && (
                                            <p className="text-xs text-textMuted mt-2 text-center">
                                                Showing first 5 rows of {parsedCustomers.length} total
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-6 border-t border-border flex justify-between items-center bg-surface/50">
                            <p className="text-xs text-textMuted">
                                Required columns: name, email, phone_number
                            </p>
                            <div className="flex gap-3">
                                <button 
                                    onClick={handleBulkModalClose}
                                    className="px-4 py-2 bg-transparent border border-border text-textMain rounded-lg text-sm hover:bg-surfaceHover transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleBulkUpload}
                                    disabled={bulkUploading || parsedCustomers.length === 0}
                                    className="px-4 py-2 bg-primary text-black font-semibold rounded-lg text-sm hover:bg-primaryHover transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Upload size={16} />
                                    {bulkUploading ? 'Uploading...' : `Upload ${parsedCustomers.length} Customer${parsedCustomers.length !== 1 ? 's' : ''}`}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Customer Details & Memory Modal */}
            {isDetailsModalOpen && selectedCustomerForDetails && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-surface border border-border rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
                        {/* Header */}
                        <div className="p-6 border-b border-border flex justify-between items-start">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center">
                                    <User size={28} className="text-primary" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-textMain">{selectedCustomerForDetails.name}</h2>
                                    <div className="flex items-center gap-4 mt-1">
                                        <span className="text-sm text-textMuted">{selectedCustomerForDetails.email}</span>
                                        <span className="text-sm text-textMuted font-mono">{selectedCustomerForDetails.phoneNumber}</span>
                                    </div>
                                </div>
                            </div>
                            <button 
                                onClick={closeDetailsModal}
                                className="text-textMuted hover:text-textMain p-1"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 overflow-y-auto flex-1 space-y-6">
                            {loadingMemory ? (
                                <div className="flex flex-col items-center justify-center py-12">
                                    <Loader2 size={32} className="text-primary animate-spin mb-4" />
                                    <p className="text-textMuted text-sm">Loading customer memory...</p>
                                </div>
                            ) : (
                                <>
                                    {/* Customer Variables */}
                                    <div className="space-y-3">
                                        <h3 className="text-sm font-semibold text-textMuted uppercase tracking-wider flex items-center gap-2">
                                            <Target size={14} />
                                            Context Variables
                                        </h3>
                                        <div className="flex flex-wrap gap-2">
                                            {Object.entries(selectedCustomerForDetails.variables).length === 0 ? (
                                                <p className="text-sm text-textMuted">No context variables defined.</p>
                                            ) : (
                                                Object.entries(selectedCustomerForDetails.variables).map(([key, value]) => (
                                                    <span key={key} className="px-3 py-1.5 rounded-lg bg-background border border-border text-xs text-textMain flex items-center gap-2">
                                                        <span className="font-semibold text-primary">{key}:</span> {value}
                                                    </span>
                                                ))
                                            )}
                                        </div>
                                    </div>

                                    {/* Key Insights */}
                                    {customerInsights.length > 0 && (
                                        <div className="space-y-3">
                                            <h3 className="text-sm font-semibold text-textMuted uppercase tracking-wider flex items-center gap-2">
                                                <Lightbulb size={14} />
                                                Key Insights ({customerInsights.length})
                                            </h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {customerInsights.map((insight) => (
                                                    <div 
                                                        key={insight.id} 
                                                        className={`bg-background border rounded-lg p-3 ${
                                                            insight.insightType === 'preference' ? 'border-blue-500/30' :
                                                            insight.insightType === 'pain_point' ? 'border-red-500/30' :
                                                            insight.insightType === 'opportunity' ? 'border-green-500/30' :
                                                            insight.insightType === 'objection' ? 'border-orange-500/30' :
                                                            insight.insightType === 'interest' ? 'border-purple-500/30' :
                                                            insight.insightType === 'personal_info' ? 'border-cyan-500/30' :
                                                            'border-border'
                                                        }`}
                                                    >
                                                        <div className="flex items-start gap-2">
                                                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                                                insight.insightType === 'preference' ? 'bg-blue-500/20 text-blue-400' :
                                                                insight.insightType === 'pain_point' ? 'bg-red-500/20 text-red-400' :
                                                                insight.insightType === 'opportunity' ? 'bg-green-500/20 text-green-400' :
                                                                insight.insightType === 'objection' ? 'bg-orange-500/20 text-orange-400' :
                                                                insight.insightType === 'interest' ? 'bg-purple-500/20 text-purple-400' :
                                                                insight.insightType === 'personal_info' ? 'bg-cyan-500/20 text-cyan-400' :
                                                                'bg-gray-500/20 text-gray-400'
                                                            }`}>
                                                                {insight.insightType?.replace('_', ' ')}
                                                            </span>
                                                            {insight.confidence && (
                                                                <span className="text-[10px] text-textMuted">
                                                                    {Math.round(insight.confidence * 100)}% confident
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-sm text-textMain mt-2">{insight.content}</p>
                                                        {insight.sourceQuote && (
                                                            <p className="text-xs text-textMuted mt-1 italic">"{insight.sourceQuote}"</p>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* WhatsApp Messages */}
                                    {whatsappMessages.length > 0 && (
                                        <div className="space-y-3">
                                            <h3 className="text-sm font-semibold text-textMuted uppercase tracking-wider flex items-center gap-2">
                                                <MessageCircle size={14} />
                                                WhatsApp Messages ({whatsappMessages.length})
                                            </h3>
                                            <div className="bg-background border border-border rounded-lg p-4 space-y-3 max-h-96 overflow-y-auto">
                                                {whatsappMessages.map((msg) => (
                                                    <div 
                                                        key={msg.id} 
                                                        className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                                                    >
                                                        <div className={`max-w-[75%] rounded-lg px-3 py-2 ${
                                                            msg.direction === 'outbound' 
                                                                ? 'bg-primary/20 text-textMain rounded-br-sm' 
                                                                : 'bg-surface border border-border text-textMain rounded-bl-sm'
                                                        }`}>
                                                            <p className="text-sm">{msg.content?.body || msg.content?.caption || '[Media]'}</p>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <span className="text-[10px] text-textMuted">
                                                                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </span>
                                                                {msg.direction === 'outbound' && msg.isFromBot && (
                                                                    <span className="text-[10px] text-primary">🤖 AI</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Conversation History */}
                                    <div className="space-y-3">
                                        <h3 className="text-sm font-semibold text-textMuted uppercase tracking-wider flex items-center gap-2">
                                            <MessageSquare size={14} />
                                            Conversation History ({customerConversations.length})
                                        </h3>
                                        {customerConversations.length === 0 ? (
                                            <div className="bg-background border border-border rounded-lg p-6 text-center">
                                                <MessageSquare size={32} className="text-textMuted/50 mx-auto mb-3" />
                                                <p className="text-sm text-textMuted">No conversations recorded yet.</p>
                                                <p className="text-xs text-textMuted mt-1">Conversations will appear here after the assistant interacts with this customer.</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {customerConversations.map((conversation) => (
                                                    <div key={conversation.id} className="bg-background border border-border rounded-lg p-4">
                                                        <div className="flex items-center justify-between mb-3">
                                                            <div className="flex items-center gap-3">
                                                                <div className={`w-2 h-2 rounded-full ${
                                                                    conversation.callOutcome === 'successful' ? 'bg-green-400' :
                                                                    conversation.callOutcome === 'failed' ? 'bg-red-400' :
                                                                    conversation.callOutcome === 'voicemail' ? 'bg-yellow-400' :
                                                                    'bg-gray-400'
                                                                }`} />
                                                                <span className="text-xs text-textMuted flex items-center gap-1">
                                                                    <Calendar size={12} />
                                                                    {new Date(conversation.createdAt).toLocaleString()}
                                                                </span>
                                                                {conversation.duration && (
                                                                    <span className="text-xs text-textMuted flex items-center gap-1">
                                                                        <Clock size={12} />
                                                                        {Math.round(conversation.duration / 60)}m {conversation.duration % 60}s
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {conversation.sentiment && (
                                                                <span className={`text-xs px-2 py-0.5 rounded-full ${
                                                                    conversation.sentiment === 'positive' ? 'bg-green-500/20 text-green-400' :
                                                                    conversation.sentiment === 'negative' ? 'bg-red-500/20 text-red-400' :
                                                                    'bg-yellow-500/20 text-yellow-400'
                                                                }`}>
                                                                    {conversation.sentiment}
                                                                </span>
                                                            )}
                                                        </div>
                                                        
                                                        {conversation.summary && (
                                                            <div className="mb-3">
                                                                <p className="text-xs text-primary font-semibold mb-1">Summary</p>
                                                                <p className="text-sm text-textMain">{conversation.summary}</p>
                                                            </div>
                                                        )}

                                                        {conversation.keyTopics && conversation.keyTopics.length > 0 && (
                                                            <div className="flex flex-wrap gap-1 mb-3">
                                                                {conversation.keyTopics.map((topic, i) => (
                                                                    <span key={i} className="text-xs px-2 py-0.5 bg-surface rounded border border-border text-textMuted">
                                                                        {topic}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}

                                                        {conversation.transcript && conversation.transcript.length > 0 && (
                                                            <details className="mt-3">
                                                                <summary className="text-xs text-primary cursor-pointer hover:text-primaryHover">
                                                                    View Transcript ({conversation.transcript.length} messages)
                                                                </summary>
                                                                <div className="mt-2 space-y-2 max-h-60 overflow-y-auto bg-surface/50 rounded p-3">
                                                                    {conversation.transcript.map((msg, i) => (
                                                                        <div key={i} className={`text-xs ${msg.role === 'assistant' ? 'text-primary' : 'text-textMain'}`}>
                                                                            <span className="font-semibold">{msg.role === 'assistant' ? 'AI' : 'Customer'}:</span> {msg.content}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </details>
                                                        )}

                                                        {conversation.actionItems && conversation.actionItems.length > 0 && (
                                                            <div className="mt-3 pt-3 border-t border-border">
                                                                <p className="text-xs text-textMuted font-semibold mb-2 flex items-center gap-1">
                                                                    <AlertTriangle size={12} />
                                                                    Action Items
                                                                </p>
                                                                <div className="space-y-1">
                                                                    {conversation.actionItems.map((item, i) => (
                                                                        <div key={i} className="flex items-start gap-2 text-xs">
                                                                            <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                                                                                item.priority === 'high' ? 'bg-red-500/20 text-red-400' :
                                                                                item.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                                                                                'bg-gray-500/20 text-gray-400'
                                                                            }`}>
                                                                                {item.priority}
                                                                            </span>
                                                                            <span className={item.completed ? 'text-textMuted line-through' : 'text-textMain'}>
                                                                                {item.action}
                                                                            </span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* No Memory State */}
                                    {!customerMemory && customerConversations.length === 0 && customerInsights.length === 0 && whatsappMessages.length === 0 && (
                                        <div className="bg-gradient-to-br from-primary/5 to-purple-500/5 border border-primary/20 rounded-xl p-8 text-center">
                                            <Brain size={48} className="text-primary/50 mx-auto mb-4" />
                                            <h4 className="text-lg font-semibold text-textMain mb-2">No Memory Data Yet</h4>
                                            <p className="text-sm text-textMuted max-w-md mx-auto">
                                                This customer doesn't have any conversation history yet. Once your AI assistant interacts with them, 
                                                conversation summaries, insights, and memory will be automatically collected and displayed here.
                                            </p>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-border flex justify-between items-center bg-surface/50">
                            <p className="text-xs text-textMuted">
                                Customer ID: <span className="font-mono text-textMain">{selectedCustomerForDetails.id}</span>
                            </p>
                            <div className="flex gap-3">
                                <button 
                                    onClick={(e) => { closeDetailsModal(); handleEdit(selectedCustomerForDetails); }}
                                    className="px-4 py-2 bg-transparent border border-border text-textMain rounded-lg text-sm hover:bg-surfaceHover transition-colors flex items-center gap-2"
                                >
                                    <Edit size={14} />
                                    Edit Customer
                                </button>
                                <button 
                                    onClick={closeDetailsModal}
                                    className="px-4 py-2 bg-primary text-black font-semibold rounded-lg text-sm hover:bg-primaryHover transition-colors"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Customers;
