import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { 
    X, 
    UploadSimple, 
    File, 
    CheckCircle, 
    Warning,
    Spinner
} from '@phosphor-icons/react';
import { Button } from '../ui/Button';
import type { LeadImportResult } from '../../types';

interface LeadUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUpload: (file: File, columnMapping: Record<string, string>) => Promise<LeadImportResult>;
}

const LEAD_FIELDS = [
    { key: 'phone_number', label: 'Phone Number', required: true },
    { key: 'first_name', label: 'First Name', required: false },
    { key: 'last_name', label: 'Last Name', required: false },
    { key: 'email', label: 'Email', required: false },
    { key: 'company', label: 'Company', required: false },
    { key: 'property_address', label: 'Property Address', required: false },
    { key: 'property_city', label: 'Property City', required: false },
    { key: 'property_state', label: 'Property State', required: false },
    { key: 'property_zip', label: 'Property ZIP', required: false },
    { key: 'lead_source', label: 'Lead Source', required: false },
    { key: 'listing_price', label: 'Listing Price', required: false },
    { key: 'days_on_market', label: 'Days on Market', required: false },
    { key: 'notes', label: 'Notes', required: false },
] as const;

export function LeadUploadModal({
    isOpen,
    onClose,
    onUpload
}: LeadUploadModalProps) {
    const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'importing' | 'complete'>('upload');
    const [file, setFile] = useState<File | null>(null);
    const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
    const [csvPreview, setCsvPreview] = useState<string[][]>([]);
    const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
    const [importResult, setImportResult] = useState<LeadImportResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    const parseCSVLine = (line: string): string[] => {
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
    };

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        const csvFile = acceptedFiles[0];
        if (!csvFile) return;

        setFile(csvFile);
        setError(null);

        // Parse CSV headers and preview
        try {
            const text = await csvFile.text();
            const lines = text.split('\n').filter(line => line.trim());
            
            if (lines.length < 2) {
                setError('CSV file must have headers and at least one data row');
                return;
            }

            // Parse headers - we've already validated length >= 2
            const headerLine = lines[0] || '';
            const headers = parseCSVLine(headerLine);
            setCsvHeaders(headers);

            // Parse preview (first 5 rows)
            const preview = lines.slice(1, 6).map(line => parseCSVLine(line));
            setCsvPreview(preview);

            // Auto-map columns based on header names
            const autoMapping: Record<string, string> = {};
            headers.forEach(header => {
                const headerLower = header.toLowerCase().replace(/[^a-z0-9]/g, '');
                
                // Try to auto-match
                if (headerLower.includes('phone') || headerLower.includes('mobile') || headerLower.includes('cell')) {
                    autoMapping[header] = 'phone_number';
                } else if (headerLower === 'firstname' || headerLower === 'first') {
                    autoMapping[header] = 'first_name';
                } else if (headerLower === 'lastname' || headerLower === 'last') {
                    autoMapping[header] = 'last_name';
                } else if (headerLower.includes('email')) {
                    autoMapping[header] = 'email';
                } else if (headerLower.includes('company') || headerLower.includes('business')) {
                    autoMapping[header] = 'company';
                } else if (headerLower.includes('address') && !headerLower.includes('city') && !headerLower.includes('state') && !headerLower.includes('zip')) {
                    autoMapping[header] = 'property_address';
                } else if (headerLower.includes('city')) {
                    autoMapping[header] = 'property_city';
                } else if (headerLower.includes('state')) {
                    autoMapping[header] = 'property_state';
                } else if (headerLower.includes('zip') || headerLower.includes('postal')) {
                    autoMapping[header] = 'property_zip';
                } else if (headerLower.includes('source')) {
                    autoMapping[header] = 'lead_source';
                } else if (headerLower.includes('price')) {
                    autoMapping[header] = 'listing_price';
                } else if (headerLower.includes('days') || headerLower.includes('dom')) {
                    autoMapping[header] = 'days_on_market';
                } else if (headerLower.includes('note')) {
                    autoMapping[header] = 'notes';
                }
            });
            
            setColumnMapping(autoMapping);
            setStep('mapping');
        } catch {
            setError('Failed to parse CSV file');
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'text/csv': ['.csv'],
            'application/vnd.ms-excel': ['.csv'],
        },
        maxFiles: 1,
        maxSize: 10 * 1024 * 1024, // 10MB
    });

    const handleMappingChange = (csvHeader: string, leadField: string) => {
        setColumnMapping(prev => ({
            ...prev,
            [csvHeader]: leadField
        }));
    };

    const isPhoneMapped = Object.values(columnMapping).includes('phone_number');

    const handleImport = async () => {
        if (!file) return;
        
        setStep('importing');
        setError(null);
        
        try {
            const result = await onUpload(file, columnMapping);
            setImportResult(result);
            setStep('complete');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Import failed');
            setStep('mapping');
        }
    };

    const handleClose = () => {
        setStep('upload');
        setFile(null);
        setCsvHeaders([]);
        setCsvPreview([]);
        setColumnMapping({});
        setImportResult(null);
        setError(null);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={handleClose}
            />
            
            {/* Modal */}
            <div className="relative bg-surface border border-white/10 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/5">
                    <div>
                        <h2 className="text-lg font-semibold text-textMain">Import Leads</h2>
                        <p className="text-sm text-textMuted mt-0.5">
                            {step === 'upload' && 'Upload a CSV file with your leads'}
                            {step === 'mapping' && 'Map CSV columns to lead fields'}
                            {step === 'preview' && 'Review mapped data before import'}
                            {step === 'importing' && 'Importing leads...'}
                            {step === 'complete' && 'Import complete'}
                        </p>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2 text-textMuted hover:text-textMain hover:bg-white/5 rounded-lg transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {/* Upload Step */}
                    {step === 'upload' && (
                        <div
                            {...getRootProps()}
                            className={`
                                border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all
                                ${isDragActive 
                                    ? 'border-primary bg-primary/5' 
                                    : 'border-white/10 hover:border-primary/50 hover:bg-white/[0.02]'
                                }
                            `}
                        >
                            <input {...getInputProps()} />
                            
                            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                                <UploadSimple size={32} className="text-primary" />
                            </div>
                            
                            <p className="text-textMain font-medium mb-1">
                                {isDragActive ? 'Drop your CSV file here' : 'Drag & drop your CSV file'}
                            </p>
                            <p className="text-sm text-textMuted mb-4">
                                or click to browse
                            </p>
                            
                            <p className="text-xs text-textMuted">
                                Max file size: 10MB • Supported format: .csv
                            </p>
                        </div>
                    )}

                    {/* Mapping Step */}
                    {step === 'mapping' && (
                        <div className="space-y-6">
                            {error && (
                                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                                    {error}
                                </div>
                            )}
                            
                            {/* File Info */}
                            <div className="flex items-center gap-3 p-4 bg-white/5 rounded-xl">
                                <File size={24} className="text-primary" />
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-textMain">{file?.name}</p>
                                    <p className="text-xs text-textMuted">
                                        {csvHeaders.length} columns • {csvPreview.length}+ rows
                                    </p>
                                </div>
                            </div>

                            {/* Mapping Table */}
                            <div className="space-y-3">
                                <p className="text-sm font-medium text-textMain">Column Mapping</p>
                                
                                <div className="space-y-2">
                                    {csvHeaders.map(header => (
                                        <div 
                                            key={header}
                                            className="flex items-center gap-4 p-3 bg-white/5 rounded-xl"
                                        >
                                            <div className="flex-1">
                                                <p className="text-sm text-textMain">{header}</p>
                                                <p className="text-xs text-textMuted">
                                                    Sample: {csvPreview[0]?.[csvHeaders.indexOf(header)] || '-'}
                                                </p>
                                            </div>
                                            
                                            <div className="text-textMuted">→</div>
                                            
                                            <select
                                                value={columnMapping[header] || ''}
                                                onChange={(e) => handleMappingChange(header, e.target.value)}
                                                className="w-48 px-3 py-2 bg-surface border border-white/10 rounded-lg text-sm text-textMain focus:border-primary focus:ring-2 focus:ring-primary/20"
                                            >
                                                <option value="">-- Skip this column --</option>
                                                {LEAD_FIELDS.map(field => (
                                                    <option 
                                                        key={field.key} 
                                                        value={field.key}
                                                        disabled={Object.values(columnMapping).includes(field.key) && columnMapping[header] !== field.key}
                                                    >
                                                        {field.label} {field.required && '*'}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Required Field Warning */}
                            {!isPhoneMapped && (
                                <div className="flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-yellow-400 text-sm">
                                    <Warning size={18} />
                                    Phone Number is required. Please map a column to Phone Number.
                                </div>
                            )}

                            {/* Preview */}
                            <div className="space-y-3">
                                <p className="text-sm font-medium text-textMain">Preview</p>
                                
                                <div className="overflow-x-auto rounded-xl border border-white/10">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="bg-white/5">
                                                {Object.entries(columnMapping)
                                                    .filter(([, mapped]) => mapped)
                                                    .map(([csv, mapped]) => (
                                                        <th key={csv} className="px-3 py-2 text-left text-xs font-medium text-textMuted">
                                                            {LEAD_FIELDS.find(f => f.key === mapped)?.label}
                                                        </th>
                                                    ))
                                                }
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {csvPreview.slice(0, 3).map((row, i) => (
                                                <tr key={i}>
                                                    {Object.entries(columnMapping)
                                                        .filter(([, mapped]) => mapped)
                                                        .map(([csv]) => {
                                                            const colIndex = csvHeaders.indexOf(csv);
                                                            return (
                                                                <td key={csv} className="px-3 py-2 text-textMain">
                                                                    {row[colIndex] || '-'}
                                                                </td>
                                                            );
                                                        })
                                                    }
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Importing Step */}
                    {step === 'importing' && (
                        <div className="flex flex-col items-center justify-center py-12">
                            <Spinner size={48} className="text-primary animate-spin mb-4" />
                            <p className="text-textMain font-medium">Importing leads...</p>
                            <p className="text-sm text-textMuted mt-1">This may take a moment</p>
                        </div>
                    )}

                    {/* Complete Step */}
                    {step === 'complete' && importResult && (
                        <div className="space-y-6">
                            <div className="flex flex-col items-center py-6">
                                <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
                                    <CheckCircle size={32} className="text-green-400" weight="fill" />
                                </div>
                                <h3 className="text-lg font-semibold text-textMain">Import Complete!</h3>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-4">
                                <div className="bg-white/5 rounded-xl p-4 text-center">
                                    <p className="text-2xl font-semibold text-green-400">{importResult.imported}</p>
                                    <p className="text-sm text-textMuted">Imported</p>
                                </div>
                                <div className="bg-white/5 rounded-xl p-4 text-center">
                                    <p className="text-2xl font-semibold text-yellow-400">{importResult.skipped}</p>
                                    <p className="text-sm text-textMuted">Skipped</p>
                                </div>
                                <div className="bg-white/5 rounded-xl p-4 text-center">
                                    <p className="text-2xl font-semibold text-blue-400">{importResult.total}</p>
                                    <p className="text-sm text-textMuted">Total</p>
                                </div>
                            </div>

                            {importResult.errors && importResult.errors.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-sm font-medium text-textMuted">Errors:</p>
                                    <div className="max-h-40 overflow-y-auto space-y-1 text-sm">
                                        {importResult.errors.map((err, i) => (
                                            <p key={i} className="text-red-400">Row {err.row}: {err.error}</p>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-6 border-t border-white/5">
                    {step === 'upload' && (
                        <Button variant="secondary" onClick={handleClose}>
                            Cancel
                        </Button>
                    )}
                    
                    {step === 'mapping' && (
                        <>
                            <Button variant="secondary" onClick={() => setStep('upload')}>
                                Back
                            </Button>
                            <Button 
                                onClick={handleImport}
                                disabled={!isPhoneMapped}
                            >
                                Import {csvPreview.length}+ Leads
                            </Button>
                        </>
                    )}
                    
                    {step === 'complete' && (
                        <Button onClick={handleClose}>
                            Done
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default LeadUploadModal;
