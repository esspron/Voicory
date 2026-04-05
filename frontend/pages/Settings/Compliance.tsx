/**
 * TCPA Compliance Settings Page
 *
 * Full compliance management interface including:
 * - Compliance settings
 * - DNC list management
 * - Consent records
 * - State rules reference
 * - Compliance statistics
 */

import { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  PhoneSlash,
  FileText,
  MapPin,
  ChartBar,
  Plus,
  MagnifyingGlass,
  Trash,
  Download,
  CaretLeft,
  CaretRight,
  CheckCircle,
  XCircle,
  Warning,
  Clock,
  Eye,
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { DNCChecker, ConsentCapture, ComplianceSettings } from '@/components/compliance';
import {
  getDNCList,
  removeFromDNC,
  addToDNC,
  addToDNCBulk,
  exportDNCList,
  getConsents,
  revokeConsent,
  getConsentProofUrl,
  getAllStateRules,
  getComplianceStats,
  getDNCStats,
  getConsentStats,
  formatPhoneNumber,
  dncListToCSV,
  downloadAsFile,
  type DNCEntry,
  type ConsentRecord,
  type StateRule,
  type ComplianceStats,
  type DNCStats,
  type ConsentStats,
} from '@/services/tcpaService';
import { useDebounce } from '@/hooks';

type TabType = 'settings' | 'dnc' | 'consent' | 'states' | 'stats';

const TABS: { id: TabType; label: string; icon: React.ElementType }[] = [
  { id: 'settings', label: 'Settings', icon: ShieldCheck },
  { id: 'dnc', label: 'DNC List', icon: PhoneSlash },
  { id: 'consent', label: 'Consents', icon: FileText },
  { id: 'states', label: 'State Rules', icon: MapPin },
  { id: 'stats', label: 'Statistics', icon: ChartBar },
];

export default function Compliance() {
  const [activeTab, setActiveTab] = useState<TabType>('settings');

  return (
    <div className="min-h-screen bg-background p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
              <ShieldCheck size={24} weight="bold" className="text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-textMain">TCPA Compliance</h1>
              <p className="text-textMuted">Manage Do Not Call lists, consent records, and compliance settings</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 p-1 bg-surface/50 rounded-xl border border-white/5 overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-primary/10 text-primary border border-primary/20'
                    : 'text-textMuted hover:text-textMain hover:bg-white/5'
                }`}
              >
                <Icon size={18} weight={isActive ? 'fill' : 'regular'} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        {activeTab === 'settings' && <SettingsTab />}
        {activeTab === 'dnc' && <DNCTab />}
        {activeTab === 'consent' && <ConsentTab />}
        {activeTab === 'states' && <StatesTab />}
        {activeTab === 'stats' && <StatsTab />}
      </div>
    </div>
  );
}

// ===========================================
// SETTINGS TAB
// ===========================================

function SettingsTab() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <ComplianceSettings />
      </div>
      <div>
        <DNCChecker />
      </div>
    </div>
  );
}

// ===========================================
// DNC LIST TAB
// ===========================================

function DNCTab() {
  const [entries, setEntries] = useState<DNCEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [newReason, setNewReason] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);

  const debouncedSearch = useDebounce(search, 300);
  const limit = 20;

  const loadEntries = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getDNCList({
        limit,
        offset: page * limit,
        search: debouncedSearch || undefined,
      });
      setEntries(result.entries);
      setTotal(result.total);
    } catch (err) {
      setError('Failed to load DNC list');
    } finally {
      setIsLoading(false);
    }
  }, [page, debouncedSearch]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const handleAdd = async () => {
    if (!newPhone.trim()) return;

    setIsAdding(true);
    try {
      await addToDNC({
        phoneNumber: newPhone,
        reason: newReason || 'manual_add',
        source: 'manual',
      });
      setNewPhone('');
      setNewReason('');
      setShowAddModal(false);
      loadEntries();
    } catch (err) {
      setError('Failed to add to DNC list');
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (phoneNumber: string, id: string) => {
    setDeletingId(id);
    try {
      await removeFromDNC(phoneNumber);
      loadEntries();
    } catch (err) {
      setError('Failed to remove from DNC list');
    } finally {
      setDeletingId(null);
    }
  };

  const handleExport = async () => {
    try {
      const data = await exportDNCList();
      const csv = dncListToCSV(data);
      downloadAsFile(csv, `dnc-list-${new Date().toISOString().split('T')[0]}.csv`);
    } catch (err) {
      setError('Failed to export DNC list');
    }
  };

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setError(null);
    setImportSuccess(null);

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(l => l.trim());
      // Skip header row if it looks like a header (non-numeric first column)
      const dataLines = (lines[0]?.toLowerCase() ?? '').includes('phone') ? lines.slice(1) : lines;
      const phoneNumbers = dataLines
        .map(l => (l.split(',')[0] ?? '').replace(/["\s]/g, '').trim())
        .filter(p => p.length > 7);

      if (phoneNumbers.length === 0) {
        setError('No valid phone numbers found in CSV');
        return;
      }

      const result = await addToDNCBulk({ phoneNumbers, reason: 'import', source: 'csv_import' });
      setImportSuccess(`Imported ${result.added} numbers to DNC list`);
      loadEntries();
    } catch (err) {
      setError('Failed to import CSV. Make sure first column contains phone numbers.');
    } finally {
      setIsImporting(false);
      // Reset file input
      e.target.value = '';
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlass size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" />
          <Input
            type="text"
            placeholder="Search phone numbers..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="default" onClick={handleExport}>
            <Download size={18} className="mr-2" />
            Export
          </Button>
          <label className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl border border-white/10 bg-surface/80 text-textMain hover:bg-white/5 cursor-pointer transition-all ${isImporting ? 'opacity-50 cursor-not-allowed' : ''}`}>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={handleImportCSV}
              disabled={isImporting}
              className="hidden"
            />
            {isImporting ? 'Importing...' : 'Import CSV'}
          </label>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus size={18} className="mr-2" />
            Add Number
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-400 text-sm p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
          <Warning size={16} weight="fill" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300">×</button>
        </div>
      )}

      {importSuccess && (
        <div className="flex items-center gap-2 text-green-400 text-sm p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
          <CheckCircle size={16} weight="fill" />
          {importSuccess}
          <button onClick={() => setImportSuccess(null)} className="ml-auto text-green-400 hover:text-green-300">×</button>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="bg-surface/80 backdrop-blur-xl border border-white/5 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-textMain mb-4">Add to DNC List</h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-textMuted">Phone Number</label>
              <Input
                type="tel"
                placeholder="+1 (555) 123-4567"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm text-textMuted">Reason (Optional)</label>
              <select
                value={newReason}
                onChange={(e) => setNewReason(e.target.value)}
                className="mt-1 w-full px-4 py-2.5 bg-surface border border-white/10 rounded-xl text-textMain focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="">Select reason...</option>
                <option value="user_request">User Request</option>
                <option value="opt_out">Opt Out</option>
                <option value="complaint">Complaint</option>
                <option value="manual_add">Manual Add</option>
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="default" onClick={() => setShowAddModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleAdd} loading={isAdding}>
                Add to DNC
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* DNC List Table */}
      <div className="bg-surface/80 backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="p-12 text-center">
            <PhoneSlash size={48} className="mx-auto text-textMuted mb-4" />
            <h3 className="text-lg font-medium text-textMain mb-2">No DNC Entries</h3>
            <p className="text-textMuted mb-4">
              {search ? 'No entries match your search.' : 'Your Do Not Call list is empty.'}
            </p>
            {!search && (
              <Button onClick={() => setShowAddModal(true)}>
                <Plus size={18} className="mr-2" />
                Add First Number
              </Button>
            )}
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left text-sm font-medium text-textMuted p-4">Phone Number</th>
                  <th className="text-left text-sm font-medium text-textMuted p-4">Reason</th>
                  <th className="text-left text-sm font-medium text-textMuted p-4">Source</th>
                  <th className="text-left text-sm font-medium text-textMuted p-4">Added</th>
                  <th className="text-right text-sm font-medium text-textMuted p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="p-4">
                      <span className="font-mono text-textMain">{formatPhoneNumber(entry.phone_number)}</span>
                    </td>
                    <td className="p-4">
                      <Badge variant="default" size="sm">{entry.reason}</Badge>
                    </td>
                    <td className="p-4 text-textMuted">{entry.source}</td>
                    <td className="p-4 text-textMuted text-sm">
                      {new Date(entry.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(entry.phone_number, entry.id)}
                        loading={deletingId === entry.id}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      >
                        <Trash size={16} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t border-white/5">
                <p className="text-sm text-textMuted">
                  Showing {page * limit + 1} to {Math.min((page + 1) * limit, total)} of {total} entries
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => setPage(p => p - 1)}
                    disabled={page === 0}
                  >
                    <CaretLeft size={16} />
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => setPage(p => p + 1)}
                    disabled={page >= totalPages - 1}
                  >
                    <CaretRight size={16} />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ===========================================
// CONSENT TAB
// ===========================================

function ConsentTab() {
  const [consents, setConsents] = useState<ConsentRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const debouncedSearch = useDebounce(search, 300);
  const limit = 20;

  const loadConsents = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getConsents({
        limit,
        offset: page * limit,
        search: debouncedSearch || undefined,
      });
      setConsents(result.consents);
      setTotal(result.total);
    } catch (err) {
      setError('Failed to load consents');
    } finally {
      setIsLoading(false);
    }
  }, [page, debouncedSearch]);

  useEffect(() => {
    loadConsents();
  }, [loadConsents]);

  const handleRevoke = async (id: string) => {
    setRevokingId(id);
    try {
      await revokeConsent(id, 'Revoked from dashboard');
      loadConsents();
    } catch (err) {
      setError('Failed to revoke consent');
    } finally {
      setRevokingId(null);
    }
  };

  const handleViewProof = async (consentId: string) => {
    try {
      const url = await getConsentProofUrl(consentId);
      if (url) {
        window.open(url, '_blank');
      } else {
        setError('No proof document available');
      }
    } catch (err) {
      setError('Failed to get proof document');
    }
  };

  const totalPages = Math.ceil(total / limit);

  const getConsentTypeBadge = (type: string) => {
    const variants: Record<string, 'default' | 'success' | 'warning' | 'info'> = {
      written: 'success',
      verbal: 'default',
      web_form: 'info',
      implied: 'warning',
    };
    return <Badge variant={variants[type] || 'default'} size="sm">{type}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlass size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" />
          <Input
            type="text"
            placeholder="Search phone or name..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            className="pl-10"
          />
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus size={18} className="mr-2" />
          Record Consent
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-400 text-sm p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
          <Warning size={16} weight="fill" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300">×</button>
        </div>
      )}

      {/* Add Consent Modal */}
      {showAddModal && (
        <ConsentCapture
          onSuccess={() => {
            setShowAddModal(false);
            loadConsents();
          }}
          onCancel={() => setShowAddModal(false)}
        />
      )}

      {/* Consents List */}
      <div className="bg-surface/80 backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        ) : consents.length === 0 ? (
          <div className="p-12 text-center">
            <FileText size={48} className="mx-auto text-textMuted mb-4" />
            <h3 className="text-lg font-medium text-textMain mb-2">No Consent Records</h3>
            <p className="text-textMuted mb-4">
              {search ? 'No consents match your search.' : 'Start recording consent from your contacts.'}
            </p>
            {!search && (
              <Button onClick={() => setShowAddModal(true)}>
                <Plus size={18} className="mr-2" />
                Record First Consent
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="divide-y divide-white/5">
              {consents.map((consent) => (
                <div key={consent.id} className="p-4 hover:bg-white/[0.02]">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-textMain">{formatPhoneNumber(consent.phone_number)}</span>
                        {getConsentTypeBadge(consent.consent_type)}
                        {consent.is_active ? (
                          <Badge variant="success" size="sm">Active</Badge>
                        ) : (
                          <Badge variant="default" size="sm">Revoked</Badge>
                        )}
                      </div>
                      {consent.contact_name && (
                        <p className="text-sm text-textMain">{consent.contact_name}</p>
                      )}
                      <p className="text-xs text-textMuted">
                        Consented on {new Date(consent.consent_date).toLocaleDateString()} via {consent.consent_source}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {consent.consent_proof_path && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewProof(consent.id)}
                        >
                          <Eye size={16} className="mr-1" />
                          Proof
                        </Button>
                      )}
                      {consent.is_active && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRevoke(consent.id)}
                          loading={revokingId === consent.id}
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        >
                          Revoke
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t border-white/5">
                <p className="text-sm text-textMuted">
                  Showing {page * limit + 1} to {Math.min((page + 1) * limit, total)} of {total} records
                </p>
                <div className="flex gap-2">
                  <Button variant="default" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 0}>
                    <CaretLeft size={16} />
                  </Button>
                  <Button variant="default" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1}>
                    <CaretRight size={16} />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ===========================================
// STATE RULES TAB
// ===========================================

function StatesTab() {
  const [rules, setRules] = useState<StateRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    setIsLoading(true);
    try {
      const data = await getAllStateRules();
      setRules(data);
    } catch (err) {
      setError('Failed to load state rules');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredRules = rules.filter(r =>
    r.state_name.toLowerCase().includes(search.toLowerCase()) ||
    r.state_code.toLowerCase().includes(search.toLowerCase())
  );

  const twoPartyConsentStates = ['CA', 'CT', 'FL', 'IL', 'MD', 'MA', 'MI', 'MT', 'NV', 'NH', 'PA', 'WA'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlass size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" />
          <Input
            type="text"
            placeholder="Search states..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-textMuted">
          <MapPin size={16} />
          {rules.length} states configured
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-400 text-sm p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
          <Warning size={16} weight="fill" />
          {error}
        </div>
      )}

      <div className="bg-surface/80 backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-4">
            {[...Array(10)].map((_, i) => (
              <Skeleton key={i} className="h-12 rounded-xl" />
            ))}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left text-sm font-medium text-textMuted p-4">State</th>
                <th className="text-left text-sm font-medium text-textMuted p-4">Call Hours</th>
                <th className="text-left text-sm font-medium text-textMuted p-4">Recording Consent</th>
                <th className="text-left text-sm font-medium text-textMuted p-4">Notes</th>
              </tr>
            </thead>
            <tbody>
              {filteredRules.map((rule) => (
                <tr key={rule.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-textMain">{rule.state_code}</span>
                      <span className="text-textMuted">{rule.state_name}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2 text-textMuted">
                      <Clock size={14} />
                      {rule.call_start_time.slice(0, 5)} - {rule.call_end_time.slice(0, 5)}
                    </div>
                  </td>
                  <td className="p-4">
                    {twoPartyConsentStates.includes(rule.state_code) ? (
                      <Badge variant="warning" size="sm">Two-Party</Badge>
                    ) : (
                      <Badge variant="default" size="sm">One-Party</Badge>
                    )}
                  </td>
                  <td className="p-4 text-sm text-textMuted max-w-xs truncate">
                    {rule.notes || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Legend */}
      <div className="bg-surface/80 backdrop-blur-xl border border-white/5 rounded-2xl p-6">
        <h3 className="font-medium text-textMain mb-4">Recording Consent Legend</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-start gap-3 p-3 bg-surface rounded-lg border border-white/5">
            <Badge variant="warning" size="sm">Two-Party</Badge>
            <div>
              <p className="text-sm text-textMain">Two-Party Consent States</p>
              <p className="text-xs text-textMuted">All parties must consent to recording. You MUST announce recording at start of call.</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-surface rounded-lg border border-white/5">
            <Badge variant="default" size="sm">One-Party</Badge>
            <div>
              <p className="text-sm text-textMain">One-Party Consent States</p>
              <p className="text-xs text-textMuted">Only one party (you) needs to know about recording. Disclosure still recommended.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===========================================
// STATISTICS TAB
// ===========================================

function StatsTab() {
  const [complianceStats, setComplianceStats] = useState<ComplianceStats | null>(null);
  const [dncStats, setDNCStats] = useState<DNCStats | null>(null);
  const [consentStats, setConsentStats] = useState<ConsentStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setIsLoading(true);
    try {
      const [compliance, dnc, consent] = await Promise.all([
        getComplianceStats(30),
        getDNCStats(),
        getConsentStats(),
      ]);
      setComplianceStats(compliance);
      setDNCStats(dnc);
      setConsentStats(consent);
    } catch (err) {
      setError('Failed to load statistics');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-40 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-red-400 text-sm p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
        <Warning size={16} weight="fill" />
        {error}
        <Button onClick={loadStats} variant="default" size="sm" className="ml-auto">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Compliance Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                <CheckCircle size={24} weight="fill" className="text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-textMain">{complianceStats?.compliance_rate}%</p>
                <p className="text-sm text-textMuted">Compliance Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                <CheckCircle size={24} weight="fill" className="text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-textMain">{complianceStats?.compliant || 0}</p>
                <p className="text-sm text-textMuted">Compliant Checks</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
                <XCircle size={24} weight="fill" className="text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-textMain">{complianceStats?.blocked || 0}</p>
                <p className="text-sm text-textMuted">Calls Blocked</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <ChartBar size={24} weight="fill" className="text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-textMain">{complianceStats?.total_checks || 0}</p>
                <p className="text-sm text-textMuted">Total Checks (30d)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* DNC & Consent Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PhoneSlash size={20} className="text-orange-400" />
              DNC List Statistics
            </CardTitle>
            <CardDescription>{dncStats?.total || 0} total entries</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-sm font-medium text-textMuted">By Reason</p>
              {Object.entries(dncStats?.by_reason || {}).map(([reason, count]) => (
                <div key={reason} className="flex items-center justify-between">
                  <span className="text-sm text-textMain capitalize">{reason.replace('_', ' ')}</span>
                  <Badge variant="default" size="sm">{count}</Badge>
                </div>
              ))}
              {Object.keys(dncStats?.by_reason || {}).length === 0 && (
                <p className="text-sm text-textMuted">No DNC entries yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText size={20} className="text-purple-400" />
              Consent Statistics
            </CardTitle>
            <CardDescription>{consentStats?.total || 0} total records</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-textMuted">Active</span>
                <Badge variant="success" size="sm">{consentStats?.active || 0}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-textMuted">Revoked</span>
                <Badge variant="default" size="sm">{consentStats?.revoked || 0}</Badge>
              </div>
              <hr className="border-white/5" />
              <p className="text-sm font-medium text-textMuted">By Type</p>
              {Object.entries(consentStats?.by_type || {}).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <span className="text-sm text-textMain capitalize">{type.replace('_', ' ')}</span>
                  <Badge variant="default" size="sm">{count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Failure Reasons */}
      {complianceStats && Object.keys(complianceStats.failure_reasons).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Warning size={20} className="text-yellow-400" />
              Common Compliance Failures
            </CardTitle>
            <CardDescription>Reasons calls were blocked in the last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(complianceStats.failure_reasons)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 5)
                .map(([reason, count]) => (
                  <div key={reason} className="flex items-center justify-between p-3 bg-surface rounded-lg border border-white/5">
                    <span className="text-sm text-textMain">{reason}</span>
                    <Badge variant="warning" size="sm">{count} calls</Badge>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
