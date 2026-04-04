
import { Plus, MagnifyingGlass, DotsThree, Trash, X, FloppyDisk, PencilSimple, Upload, DownloadSimple, Table, Warning, CheckCircle, Brain, ChatCircle, ChartLineUp, Lightbulb, Clock, Phone, User, Heart, CaretRight, CircleNotch, Calendar, Target, WarningCircle, WhatsappLogo, Sparkle, UsersThree, ArrowsClockwise } from '@phosphor-icons/react';
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';

import { getCustomers, createCustomer, updateCustomer, deleteCustomer, createBulkCustomers, getCustomerMemory, getCustomerConversations, getCustomerInsights, getCustomerWhatsAppMessages, WhatsAppMessage, syncCustomersFromCRM, exportCustomersCSV, importCustomersCSV, bulkDeleteCustomers } from '../services/voicoryService';
import { Customer, CustomerMemory, CustomerConversation, CustomerInsight } from '../types';

const Customers: React.FC = () => {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchDebounced, setSearchDebounced] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [exporting, setExporting] = useState(false);
    
    // Bulk selection state
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [bulkDeleting, setBulkDeleting] = useState(false);
    
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
    const [syncing, setSyncing] = useState(false);
    const [bulkError, setBulkError] = useState<string | null>(null);
    const [bulkSuccess, setBulkSuccess] = useState<string | null>(null);
    const [parsedCustomers, setParsedCustomers] = useState<Omit<Customer, 'id' | 'createdAt'>[]>([]);
    const [csvPreview, setCsvPreview] = useState<string[][]>([]);
    const [csvFile, setCsvFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // Form State
    const [currentCustomer, setCurrentCustomer] = useState<Partial<Customer>>({
        name: '',
        email: '',
        phoneNumber: '',
        variables: {}
    });
    const [tempVariables, setTempVariables] = useState<{key: string, value: string}[]>([]);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => setSearchDebounced(searchQuery), 350);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const loadCustomers = useCallback(async (search?: string) => {
        try {
            setLoading(true);
            const data = await getCustomers(search);
            setCustomers(data);
            setError(null);
        } catch (err) {
            console.error('Failed to load customers:', err);
            setCustomers([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadCustomers();
    }, []);

    // Re-fetch when debounced search changes
    useEffect(() => {
        loadCustomers(searchDebounced || undefined);
        setSelectedIds(new Set()); // clear selection on search
    }, [searchDebounced]);

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
                    await loadCustomers(searchDebounced || undefined);
                    setIsModalOpen(false);
                } else {
                    setError('Failed to update customer. Please try again.');
                }
            } else {
                // Create new customer
                const newCustomer = await createCustomer({
                    name: currentCustomer.name,
                    email: currentCustomer.email,
                    phoneNumber: currentCustomer.phoneNumber,
                    variables: newVariables
                });

                if (newCustomer) {
                    await loadCustomers(searchDebounced || undefined);
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
                await loadCustomers(searchDebounced || undefined);
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
        setCsvFile(null);
        setIsBulkModalOpen(true);
    };

    const handleExportCSV = async () => {
        try {
            setExporting(true);
            await exportCustomersCSV();
        } catch (err) {
            alert(`Export failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
        } finally {
            setExporting(false);
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) return;
        if (!confirm(`Are you sure you want to delete ${selectedIds.size} customer${selectedIds.size > 1 ? 's' : ''}? This cannot be undone.`)) return;
        try {
            setBulkDeleting(true);
            await bulkDeleteCustomers(Array.from(selectedIds));
            setSelectedIds(new Set());
            await loadCustomers(searchDebounced || undefined);
        } catch (err) {
            alert(`Bulk delete failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
        } finally {
            setBulkDeleting(false);
        }
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === customers.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(customers.map(c => c.id)));
        }
    };

    const toggleSelectOne = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    const handleSyncFromCRM = async () => {
        setSyncing(true);
        try {
            const result = await syncCustomersFromCRM();
            await loadCustomers(searchDebounced || undefined);
            const providerSummary = result.providers.map((p: { provider: string; synced: number; failed: number }) => `${p.provider}: ${p.synced} synced`).join(', ');
            alert(`CRM sync complete! ${result.synced} contacts synced. ${providerSummary}`);
        } catch (err) {
            alert(`CRM sync failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
        } finally {
            setSyncing(false);
        }
    };

    const handleBulkModalClose = () => {
        setIsBulkModalOpen(false);
        setBulkError(null);
        setBulkSuccess(null);
        setParsedCustomers([]);
        setCsvPreview([]);
        setCsvFile(null);
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

        setCsvFile(file);

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

                if (nameIndex === -1 || phoneIndex === -1) {
                    setBulkError('CSV must have columns: name, and phone_number (or phone)');
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
                    const email = emailIndex !== -1 ? row[emailIndex]?.trim() : '';
                    const phoneNumber = row[phoneIndex]?.trim();

                    if (!name || !phoneNumber) {
                        errors.push(`Row ${rowIndex + 2}: Missing required field (name or phone)`);
                        return;
                    }

                    const variables: Record<string, string> = {};
                    varColumns.forEach(({ header, index }) => {
                        const value = row[index]?.trim();
                        if (value) {
                            const varName = header.replace('var_', '');
                            variables[varName] = value;
                        }
                    });

                    customers.push({ name, email: email || '', phoneNumber, variables });
                });

                if (errors.length > 0) {
                    setBulkError(`Found ${errors.length} invalid rows:\n${errors.slice(0, 3).join('\n')}${errors.length > 3 ? `\n...and ${errors.length - 3} more` : ''}`);
                }

                setParsedCustomers(customers);
                setCsvPreview(rows.slice(0, 6));
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
        if (!csvFile || parsedCustomers.length === 0) {
            setBulkError('No valid customers to upload');
            return;
        }

        try {
            setBulkUploading(true);
            setBulkError(null);

            // Use backend CSV import endpoint
            const result = await importCustomersCSV(csvFile);

            if (result.imported > 0) {
                setBulkSuccess(`Successfully imported ${result.imported} customer${result.imported > 1 ? 's' : ''}${result.skipped > 0 ? ` (${result.skipped} skipped)` : ''}`);
                if (result.errors && result.errors.length > 0) {
                    setBulkError(`${result.errors.length} row(s) had errors:\n${result.errors.slice(0, 3).join('\n')}`);
                }
                await loadCustomers(searchDebounced || undefined);

                setTimeout(() => {
                    if (!result.errors || result.errors.length === 0) {
                        handleBulkModalClose();
                    }
                }, 2000);
            } else {
                setBulkError(`Failed to import customers${result.errors?.length ? `: ${result.errors[0]}` : ''}`);
            }
        } catch (err) {
            console.error('Bulk upload error:', err);
            setBulkError(`Upload failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
        } finally {
            setBulkUploading(false);
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto relative min-h-screen">
            {/* Ambient Background */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
            </div>

            <div className="relative z-10">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-textMain flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                                <UsersThree size={20} weight="duotone" className="text-primary" />
                            </div>
                            Customers
                        </h1>
                        <p className="text-textMuted text-sm mt-2 ml-13">Manage customer data and assistant context variables.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => loadCustomers(searchDebounced || undefined)}
                            disabled={loading}
                            className="p-2.5 bg-surface/80 backdrop-blur-sm border border-border/50 text-textMuted rounded-xl hover:text-primary hover:border-primary/50 transition-all duration-300 disabled:opacity-50"
                            title="Refresh"
                        >
                            <ArrowsClockwise size={18} weight="bold" className={loading ? 'animate-spin' : ''} />
                        </button>
                        <button 
                            onClick={handleExportCSV}
                            disabled={exporting}
                            className="flex items-center gap-2 px-4 py-2.5 bg-surface/80 backdrop-blur-sm border border-border/50 text-textMain font-medium rounded-xl text-sm hover:border-green-400/50 hover:text-green-400 transition-all duration-300 disabled:opacity-50"
                            title="Export all customers as CSV"
                        >
                            {exporting ? <CircleNotch size={18} weight="bold" className="animate-spin" /> : <DownloadSimple size={18} weight="bold" />}
                            Export CSV
                        </button>
                        <button 
                            onClick={handleBulkModalOpen}
                            className="flex items-center gap-2 px-4 py-2.5 bg-surface/80 backdrop-blur-sm border border-border/50 text-textMain font-medium rounded-xl text-sm hover:border-primary/50 hover:text-primary transition-all duration-300"
                        >
                            <Upload size={18} weight="bold" />
                            Bulk Upload
                        </button>
                        <button
                            onClick={handleSyncFromCRM}
                            disabled={syncing}
                            className="flex items-center gap-2 px-4 py-2.5 bg-surface/80 backdrop-blur-sm border border-border/50 text-textMain font-medium rounded-xl text-sm hover:border-blue-400/50 hover:text-blue-400 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Sync contacts from connected CRM integrations"
                        >
                            <ArrowsClockwise size={18} weight="bold" className={syncing ? 'animate-spin' : ''} />
                            {syncing ? 'Syncing...' : 'Sync from CRM'}
                        </button>
                        <button 
                            onClick={handleAdd}
                            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary to-primary/80 text-black font-semibold rounded-xl text-sm hover:shadow-lg hover:shadow-primary/25 hover:scale-[1.02] transition-all duration-300"
                        >
                            <Plus size={18} weight="bold" />
                            Add Customer
                        </button>
                    </div>
                </div>

                {/* Main Table Card */}
                <div className="bg-surface/50 backdrop-blur-xl border border-border/50 rounded-2xl overflow-hidden shadow-xl">
                    {/* Search Bar */}
                    <div className="p-4 border-b border-border/50 flex items-center gap-3 bg-surface/30">
                        <MagnifyingGlass size={18} weight="bold" className="text-textMuted" />
                        <input 
                            type="text" 
                            placeholder="Search by name, email or phone..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-transparent outline-none text-sm text-textMain w-full placeholder:text-textMuted"
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="text-textMuted hover:text-textMain">
                                <X size={16} weight="bold" />
                            </button>
                        )}
                    </div>

                    {/* Bulk Action Bar */}
                    {selectedIds.size > 0 && (
                        <div className="px-4 py-3 bg-red-500/10 border-b border-red-500/20 flex items-center justify-between">
                            <span className="text-sm text-red-400 font-medium">
                                {selectedIds.size} customer{selectedIds.size > 1 ? 's' : ''} selected
                            </span>
                            <button
                                onClick={handleBulkDelete}
                                disabled={bulkDeleting}
                                className="flex items-center gap-2 px-4 py-2 bg-red-500/20 border border-red-500/40 text-red-400 rounded-xl text-sm font-medium hover:bg-red-500/30 transition-all duration-200 disabled:opacity-50"
                            >
                                {bulkDeleting ? <CircleNotch size={16} weight="bold" className="animate-spin" /> : <Trash size={16} weight="bold" />}
                                {bulkDeleting ? 'Deleting...' : `Delete ${selectedIds.size} Selected`}
                            </button>
                        </div>
                    )}

                    {/* Table Header */}
                    <div className="grid grid-cols-12 gap-4 p-4 border-b border-border/50 text-xs font-semibold text-textMuted uppercase tracking-wider bg-background/30">
                        <div className="col-span-1 flex items-center">
                            <input
                                type="checkbox"
                                checked={customers.length > 0 && selectedIds.size === customers.length}
                                onChange={toggleSelectAll}
                                className="w-4 h-4 rounded accent-primary cursor-pointer"
                                title="Select all"
                            />
                        </div>
                        <div className="col-span-3">Name</div>
                        <div className="col-span-3">Contact</div>
                        <div className="col-span-3">Context Variables</div>
                        <div className="col-span-2 text-right">Actions</div>
                    </div>

                    {/* Table Body */}
                    <div className="divide-y divide-border/50">
                        {loading ? (
                            <div className="p-12 text-center">
                                <CircleNotch size={32} weight="bold" className="text-primary animate-spin mx-auto mb-4" />
                                <p className="text-textMuted text-sm">Loading customers...</p>
                            </div>
                        ) : customers.length === 0 ? (
                            <div className="p-12 text-center">
                                <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary/20 to-purple-500/10 flex items-center justify-center">
                                    <UsersThree size={40} weight="duotone" className="text-primary" />
                                </div>
                                <h3 className="text-lg font-semibold text-textMain mb-2">No customers found</h3>
                                <p className="text-textMuted text-sm mb-6">{searchQuery ? 'Try a different search term.' : 'Click "Add Customer" to get started.'}</p>
                                {!searchQuery && (
                                    <button
                                        onClick={handleAdd}
                                        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-primary/80 text-black font-semibold rounded-xl hover:shadow-lg hover:shadow-primary/25 transition-all duration-300"
                                    >
                                        <Plus size={18} weight="bold" />
                                        Add Your First Customer
                                    </button>
                                )}
                            </div>
                        ) : customers.map(customer => (
                            <div 
                                key={customer.id} 
                                className={`grid grid-cols-12 gap-4 p-4 items-center hover:bg-surfaceHover/50 transition-all duration-200 group cursor-pointer ${selectedIds.has(customer.id) ? 'bg-primary/5' : ''}`}
                                onClick={() => handleViewDetails(customer)}
                            >
                                <div className="col-span-1" onClick={(e) => e.stopPropagation()}>
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.has(customer.id)}
                                        onChange={() => toggleSelectOne(customer.id)}
                                        className="w-4 h-4 rounded accent-primary cursor-pointer"
                                    />
                                </div>
                                <div className="col-span-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                            <User size={18} weight="duotone" className="text-primary" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <div className="text-sm font-medium text-textMain group-hover:text-primary transition-colors">{customer.name}</div>
                                                {customer.source && customer.source !== 'voicory' && (
                                                    <span className="px-1.5 py-0.5 rounded-full bg-blue-400/10 border border-blue-400/30 text-[10px] font-medium text-blue-400 uppercase tracking-wide">
                                                        {customer.crm_provider === 'followupboss' ? 'FUB' : customer.crm_provider === 'liondesk' ? 'LionDesk' : customer.source}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-xs text-textMuted">Added {customer.createdAt}</div>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-span-3">
                                    <div className="text-sm text-textMain">{customer.email}</div>
                                    <div className="text-xs text-textMuted font-mono">{customer.phoneNumber}</div>
                                </div>
                                <div className="col-span-3">
                                    <div className="flex flex-wrap gap-2">
                                        {Object.entries(customer.variables).slice(0, 3).map(([k, v]) => (
                                            <span key={k} className="px-2 py-1 rounded-lg bg-background/50 border border-border/50 text-[10px] text-textMuted flex items-center gap-1">
                                                <span className="font-semibold text-primary">{k}:</span> {v}
                                            </span>
                                        ))}
                                        {Object.keys(customer.variables).length > 3 && (
                                            <span className="text-[10px] text-textMuted self-center">
                                                +{Object.keys(customer.variables).length - 3} more
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="col-span-2 text-right flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleViewDetails(customer); }}
                                        className="p-2 hover:bg-primary/10 rounded-lg text-textMuted hover:text-primary transition-all duration-200"
                                        title="View Details & Memory"
                                    >
                                        <Brain size={16} weight="duotone" />
                                    </button>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleEdit(customer); }}
                                        className="p-2 hover:bg-primary/10 rounded-lg text-textMuted hover:text-primary transition-all duration-200"
                                        title="Edit Customer"
                                    >
                                        <PencilSimple size={16} weight="duotone" />
                                    </button>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleDelete(customer.id); }}
                                        className="p-2 hover:bg-red-500/10 rounded-lg text-textMuted hover:text-red-500 transition-all duration-200"
                                        title="Delete Customer"
                                    >
                                        <Trash size={16} weight="duotone" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Add/Edit Modal */}
            {isModalOpen && createPortal(
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-surface/95 backdrop-blur-xl border border-border/50 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
                        <div className="p-6 border-b border-border/50 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-textMain flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                                    <User size={16} weight="duotone" className="text-primary" />
                                </div>
                                {currentCustomer.id ? 'Edit Customer' : 'Add New Customer'}
                            </h2>
                            <button 
                                onClick={() => setIsModalOpen(false)}
                                className="p-2 text-textMuted hover:text-textMain hover:bg-surfaceHover rounded-lg transition-all duration-200"
                            >
                                <X size={20} weight="bold" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1 space-y-6">
                            {error && (
                                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm flex items-start gap-3">
                                    <Warning size={18} weight="fill" className="mt-0.5 shrink-0" />
                                    {error}
                                </div>
                            )}
                            
                            {/* Basic Info */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-textMuted uppercase tracking-wider">Basic Information</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs text-textMuted font-medium">Full Name</label>
                                        <input 
                                            type="text" 
                                            className="w-full bg-background/50 border border-border/50 rounded-xl px-4 py-2.5 text-sm text-textMain outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                                            value={currentCustomer.name}
                                            onChange={(e) => setCurrentCustomer({...currentCustomer, name: e.target.value})}
                                            placeholder="e.g. John Doe"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs text-textMuted font-medium">Phone Number</label>
                                        <input 
                                            type="text" 
                                            className="w-full bg-background/50 border border-border/50 rounded-xl px-4 py-2.5 text-sm text-textMain outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                                            value={currentCustomer.phoneNumber}
                                            onChange={(e) => setCurrentCustomer({...currentCustomer, phoneNumber: e.target.value})}
                                            placeholder="e.g. +91 98765 43210"
                                        />
                                    </div>
                                    <div className="col-span-2 space-y-2">
                                        <label className="text-xs text-textMuted font-medium">Email Address</label>
                                        <input 
                                            type="email" 
                                            className="w-full bg-background/50 border border-border/50 rounded-xl px-4 py-2.5 text-sm text-textMain outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all duration-200"
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
                                        <p className="text-xs text-textMuted mt-1">These values will be available to the assistant during calls.</p>
                                    </div>
                                    <button 
                                        onClick={addVariableRow}
                                        className="text-xs text-primary hover:text-primaryHover font-medium flex items-center gap-1 px-3 py-1.5 bg-primary/10 rounded-lg hover:bg-primary/20 transition-all duration-200"
                                    >
                                        <Plus size={14} weight="bold" /> Add Variable
                                    </button>
                                </div>
                                
                                <div className="space-y-3 bg-background/30 rounded-xl p-4 border border-border/50">
                                    {tempVariables.length === 0 && (
                                        <div className="text-center text-xs text-textMuted py-4">No variables defined yet.</div>
                                    )}
                                    {tempVariables.map((item, idx) => (
                                        <div key={idx} className="flex gap-3 items-center">
                                            <input 
                                                type="text" 
                                                placeholder="Key (e.g. plan_type)" 
                                                className="flex-1 bg-surface/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-textMain outline-none focus:border-primary/50 font-mono text-xs transition-all duration-200"
                                                value={item.key}
                                                onChange={(e) => updateVariableRow(idx, 'key', e.target.value)}
                                            />
                                            <span className="text-textMuted">:</span>
                                            <input 
                                                type="text" 
                                                placeholder="Value (e.g. Premium)" 
                                                className="flex-1 bg-surface/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-textMain outline-none focus:border-primary/50 transition-all duration-200"
                                                value={item.value}
                                                onChange={(e) => updateVariableRow(idx, 'value', e.target.value)}
                                            />
                                            <button 
                                                onClick={() => removeVariableRow(idx)}
                                                className="p-2 text-textMuted hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all duration-200"
                                            >
                                                <Trash size={16} weight="duotone" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-border/50 flex justify-end gap-3 bg-surface/30">
                            <button 
                                onClick={() => setIsModalOpen(false)}
                                className="px-5 py-2.5 bg-transparent border border-border/50 text-textMain rounded-xl text-sm hover:bg-surfaceHover transition-all duration-200"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleSave}
                                disabled={saving}
                                className="px-5 py-2.5 bg-gradient-to-r from-primary to-primary/80 text-black font-semibold rounded-xl text-sm hover:shadow-lg hover:shadow-primary/25 transition-all duration-300 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {saving ? (
                                    <CircleNotch size={16} weight="bold" className="animate-spin" />
                                ) : (
                                    <FloppyDisk size={16} weight="bold" />
                                )}
                                {saving ? 'Saving...' : 'Save Customer'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Bulk Upload Modal */}
            {isBulkModalOpen && createPortal(
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-surface/95 backdrop-blur-xl border border-border/50 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">
                        <div className="p-6 border-b border-border/50 flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-bold text-textMain flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                                        <Upload size={16} weight="duotone" className="text-primary" />
                                    </div>
                                    Bulk Upload Customers
                                </h2>
                                <p className="text-sm text-textMuted mt-1 ml-11">Upload multiple customers from a CSV file</p>
                            </div>
                            <button 
                                onClick={handleBulkModalClose}
                                className="p-2 text-textMuted hover:text-textMain hover:bg-surfaceHover rounded-lg transition-all duration-200"
                            >
                                <X size={20} weight="bold" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1 space-y-6">
                            {/* Success Message */}
                            {bulkSuccess && (
                                <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 flex items-start gap-3">
                                    <CheckCircle size={20} weight="fill" className="text-green-400 mt-0.5 shrink-0" />
                                    <div className="text-green-400 text-sm">{bulkSuccess}</div>
                                </div>
                            )}
                            
                            {/* Error Message */}
                            {bulkError && (
                                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
                                    <Warning size={20} weight="fill" className="text-red-400 mt-0.5 shrink-0" />
                                    <div className="text-red-400 text-sm whitespace-pre-line">{bulkError}</div>
                                </div>
                            )}
                            
                            {/* Step 1: Download Template */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary/30 to-primary/10 text-primary flex items-center justify-center text-xs font-bold">1</div>
                                    <h3 className="text-sm font-semibold text-textMain">Download CSV Template</h3>
                                </div>
                                <div className="ml-10 space-y-3">
                                    <p className="text-xs text-textMuted">
                                        Download our template with the required columns. Add context variables by creating columns with the prefix <code className="bg-background/50 px-1.5 py-0.5 rounded text-primary font-mono">var_</code> (e.g., var_plan_type, var_account_id).
                                    </p>
                                    <button 
                                        onClick={downloadTemplate}
                                        className="flex items-center gap-2 px-4 py-2.5 bg-background/50 border border-border/50 rounded-xl text-sm text-textMain hover:bg-surfaceHover hover:border-primary/50 transition-all duration-200"
                                    >
                                        <DownloadSimple size={16} weight="bold" />
                                        Download Template CSV
                                    </button>
                                </div>
                            </div>

                            {/* Step 2: Upload File */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary/30 to-primary/10 text-primary flex items-center justify-center text-xs font-bold">2</div>
                                    <h3 className="text-sm font-semibold text-textMain">Upload Your CSV</h3>
                                </div>
                                <div className="ml-10 space-y-3">
                                    <div 
                                        className="border-2 border-dashed border-border/50 rounded-xl p-8 text-center hover:border-primary/50 hover:bg-surface/30 transition-all duration-300 cursor-pointer group"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept=".csv"
                                            onChange={handleFileUpload}
                                            className="hidden"
                                        />
                                        <Table size={40} weight="duotone" className="mx-auto text-textMuted mb-3 group-hover:text-primary transition-colors" />
                                        <p className="text-sm text-textMain font-medium">Click to upload or drag and drop</p>
                                        <p className="text-xs text-textMuted mt-1">CSV files only</p>
                                    </div>
                                </div>
                            </div>

                            {/* Step 3: Preview */}
                            {csvPreview.length > 0 && (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary/30 to-primary/10 text-primary flex items-center justify-center text-xs font-bold">3</div>
                                        <h3 className="text-sm font-semibold text-textMain">Preview & Confirm</h3>
                                        <span className="text-xs text-textMuted ml-2 px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                                            {parsedCustomers.length} valid customer{parsedCustomers.length !== 1 ? 's' : ''} found
                                        </span>
                                    </div>
                                    <div className="ml-10">
                                        <div className="overflow-x-auto rounded-xl border border-border/50">
                                            <table className="w-full text-xs">
                                                <thead>
                                                    <tr className="bg-background/50">
                                                        {csvPreview[0]?.map((header, i) => (
                                                            <th key={i} className="px-3 py-2.5 text-left text-textMuted font-semibold uppercase tracking-wider whitespace-nowrap border-b border-border/50">
                                                                {header}
                                                            </th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-border/50">
                                                    {csvPreview.slice(1).map((row, rowIndex) => (
                                                        <tr key={rowIndex} className="hover:bg-surfaceHover/50">
                                                            {row.map((cell, cellIndex) => (
                                                                <td key={cellIndex} className="px-3 py-2.5 text-textMain whitespace-nowrap">
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

                        <div className="p-6 border-t border-border/50 flex justify-between items-center bg-surface/30">
                            <p className="text-xs text-textMuted">
                                Required columns: <span className="text-primary font-medium">name</span>, <span className="text-primary font-medium">email</span>, <span className="text-primary font-medium">phone_number</span>
                            </p>
                            <div className="flex gap-3">
                                <button 
                                    onClick={handleBulkModalClose}
                                    className="px-5 py-2.5 bg-transparent border border-border/50 text-textMain rounded-xl text-sm hover:bg-surfaceHover transition-all duration-200"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleBulkUpload}
                                    disabled={bulkUploading || parsedCustomers.length === 0}
                                    className="px-5 py-2.5 bg-gradient-to-r from-primary to-primary/80 text-black font-semibold rounded-xl text-sm hover:shadow-lg hover:shadow-primary/25 transition-all duration-300 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {bulkUploading ? (
                                        <CircleNotch size={16} weight="bold" className="animate-spin" />
                                    ) : (
                                        <Upload size={16} weight="bold" />
                                    )}
                                    {bulkUploading ? 'Uploading...' : `Upload ${parsedCustomers.length} Customer${parsedCustomers.length !== 1 ? 's' : ''}`}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Customer Details & Memory Modal */}
            {isDetailsModalOpen && selectedCustomerForDetails && createPortal(
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-surface/95 backdrop-blur-xl border border-border/50 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
                        {/* Header */}
                        <div className="p-6 border-b border-border/50 flex justify-between items-start">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/30 to-purple-500/10 flex items-center justify-center shadow-lg shadow-primary/10">
                                    <User size={32} weight="duotone" className="text-primary" />
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
                                className="p-2 text-textMuted hover:text-textMain hover:bg-surfaceHover rounded-lg transition-all duration-200"
                            >
                                <X size={20} weight="bold" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 overflow-y-auto flex-1 space-y-6">
                            {loadingMemory ? (
                                <div className="flex flex-col items-center justify-center py-12">
                                    <CircleNotch size={32} weight="bold" className="text-primary animate-spin mb-4" />
                                    <p className="text-textMuted text-sm">Loading customer memory...</p>
                                </div>
                            ) : (
                                <>
                                    {/* Customer Variables */}
                                    <div className="space-y-3">
                                        <h3 className="text-sm font-semibold text-textMuted uppercase tracking-wider flex items-center gap-2">
                                            <Target size={14} weight="duotone" />
                                            Context Variables
                                        </h3>
                                        <div className="flex flex-wrap gap-2">
                                            {Object.entries(selectedCustomerForDetails.variables).length === 0 ? (
                                                <p className="text-sm text-textMuted">No context variables defined.</p>
                                            ) : (
                                                Object.entries(selectedCustomerForDetails.variables).map(([key, value]) => (
                                                    <span key={key} className="px-3 py-1.5 rounded-lg bg-background/50 border border-border/50 text-xs text-textMain flex items-center gap-2">
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
                                                <Lightbulb size={14} weight="duotone" />
                                                Key Insights ({customerInsights.length})
                                            </h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {customerInsights.map((insight) => (
                                                    <div 
                                                        key={insight.id} 
                                                        className={`bg-background/50 border rounded-xl p-4 ${
                                                            insight.insightType === 'preference' ? 'border-blue-500/30' :
                                                            insight.insightType === 'pain_point' ? 'border-red-500/30' :
                                                            insight.insightType === 'opportunity' ? 'border-green-500/30' :
                                                            insight.insightType === 'objection' ? 'border-orange-500/30' :
                                                            insight.insightType === 'interest' ? 'border-purple-500/30' :
                                                            insight.insightType === 'personal_info' ? 'border-cyan-500/30' :
                                                            'border-border/50'
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
                                                <WhatsappLogo size={14} weight="duotone" />
                                                WhatsApp Messages ({whatsappMessages.length})
                                            </h3>
                                            <div className="bg-background/50 border border-border/50 rounded-xl p-4 space-y-3 max-h-96 overflow-y-auto">
                                                {whatsappMessages.map((msg) => (
                                                    <div 
                                                        key={msg.id} 
                                                        className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                                                    >
                                                        <div className={`max-w-[75%] rounded-xl px-4 py-2 ${
                                                            msg.direction === 'outbound' 
                                                                ? 'bg-primary/20 text-textMain rounded-br-sm' 
                                                                : 'bg-surface border border-border/50 text-textMain rounded-bl-sm'
                                                        }`}>
                                                            <p className="text-sm">{msg.content?.body || msg.content?.caption || '[Media]'}</p>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <span className="text-[10px] text-textMuted">
                                                                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </span>
                                                                {msg.direction === 'outbound' && msg.isFromBot && (
                                                                    <span className="text-[10px] text-primary flex items-center gap-1">
                                                                        <Sparkle size={10} weight="fill" /> AI
                                                                    </span>
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
                                            <ChatCircle size={14} weight="duotone" />
                                            Conversation History ({customerConversations.length})
                                        </h3>
                                        {customerConversations.length === 0 ? (
                                            <div className="bg-background/50 border border-border/50 rounded-xl p-8 text-center">
                                                <ChatCircle size={32} weight="duotone" className="text-textMuted/50 mx-auto mb-3" />
                                                <p className="text-sm text-textMuted">No conversations recorded yet.</p>
                                                <p className="text-xs text-textMuted mt-1">Conversations will appear here after the assistant interacts with this customer.</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {customerConversations.map((conversation) => (
                                                    <div key={conversation.id} className="bg-background/50 border border-border/50 rounded-xl p-4">
                                                        <div className="flex items-center justify-between mb-3">
                                                            <div className="flex items-center gap-3">
                                                                <div className={`w-2 h-2 rounded-full ${
                                                                    conversation.callOutcome === 'successful' ? 'bg-green-400' :
                                                                    conversation.callOutcome === 'failed' ? 'bg-red-400' :
                                                                    conversation.callOutcome === 'voicemail' ? 'bg-yellow-400' :
                                                                    'bg-gray-400'
                                                                }`} />
                                                                <span className="text-xs text-textMuted flex items-center gap-1">
                                                                    <Calendar size={12} weight="duotone" />
                                                                    {new Date(conversation.createdAt).toLocaleString()}
                                                                </span>
                                                                {conversation.duration && (
                                                                    <span className="text-xs text-textMuted flex items-center gap-1">
                                                                        <Clock size={12} weight="duotone" />
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
                                                                    <span key={i} className="text-xs px-2 py-0.5 bg-surface rounded-lg border border-border/50 text-textMuted">
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
                                                                <div className="mt-2 space-y-2 max-h-60 overflow-y-auto bg-surface/50 rounded-lg p-3">
                                                                    {conversation.transcript.map((msg, i) => (
                                                                        <div key={i} className={`text-xs ${msg.role === 'assistant' ? 'text-primary' : 'text-textMain'}`}>
                                                                            <span className="font-semibold">{msg.role === 'assistant' ? 'AI' : 'Customer'}:</span> {msg.content}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </details>
                                                        )}

                                                        {conversation.actionItems && conversation.actionItems.length > 0 && (
                                                            <div className="mt-3 pt-3 border-t border-border/50">
                                                                <p className="text-xs text-textMuted font-semibold mb-2 flex items-center gap-1">
                                                                    <WarningCircle size={12} weight="duotone" />
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
                                        <div className="bg-gradient-to-br from-primary/10 to-purple-500/5 border border-primary/20 rounded-2xl p-10 text-center">
                                            <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary/20 to-purple-500/10 flex items-center justify-center">
                                                <Brain size={40} weight="duotone" className="text-primary" />
                                            </div>
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
                        <div className="p-4 border-t border-border/50 flex justify-between items-center bg-surface/30">
                            <p className="text-xs text-textMuted">
                                Customer ID: <span className="font-mono text-textMain">{selectedCustomerForDetails.id}</span>
                            </p>
                            <div className="flex gap-3">
                                <button 
                                    onClick={(e) => { closeDetailsModal(); handleEdit(selectedCustomerForDetails); }}
                                    className="px-4 py-2 bg-transparent border border-border/50 text-textMain rounded-xl text-sm hover:bg-surfaceHover transition-all duration-200 flex items-center gap-2"
                                >
                                    <PencilSimple size={14} weight="bold" />
                                    Edit Customer
                                </button>
                                <button 
                                    onClick={closeDetailsModal}
                                    className="px-5 py-2 bg-gradient-to-r from-primary to-primary/80 text-black font-semibold rounded-xl text-sm hover:shadow-lg hover:shadow-primary/25 transition-all duration-300"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default Customers;
