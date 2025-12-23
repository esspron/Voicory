/**
 * Consent Capture Component
 *
 * Form for recording TCPA consent from contacts
 */

import { useState } from 'react';
import {
  FileText,
  Microphone,
  Globe,
  UserCircle,
  CheckCircle,
  Warning,
  Upload,
  X,
} from '@phosphor-icons/react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { Label } from '@/components/ui/Label';
import {
  recordConsent,
  uploadConsentProof,
  getConsentTemplate,
  type ConsentRecord,
} from '@/services/tcpaService';

interface ConsentCaptureProps {
  onSuccess?: (consent: ConsentRecord) => void;
  onCancel?: () => void;
  defaultPhoneNumber?: string;
  companyName?: string;
  className?: string;
}

const CONSENT_TYPES = [
  {
    value: 'written' as const,
    label: 'Written Consent',
    description: 'Signed document or form',
    icon: FileText,
  },
  {
    value: 'verbal' as const,
    label: 'Verbal Consent',
    description: 'Recorded verbal agreement',
    icon: Microphone,
  },
  {
    value: 'web_form' as const,
    label: 'Web Form',
    description: 'Online form submission',
    icon: Globe,
  },
  {
    value: 'implied' as const,
    label: 'Implied Consent',
    description: 'Based on existing relationship',
    icon: UserCircle,
  },
];

export function ConsentCapture({
  onSuccess,
  onCancel,
  defaultPhoneNumber = '',
  companyName = 'Our Company',
  className = '',
}: ConsentCaptureProps) {
  const [phoneNumber, setPhoneNumber] = useState(defaultPhoneNumber);
  const [consentType, setConsentType] = useState<'written' | 'verbal' | 'implied' | 'web_form'>('web_form');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [consentText, setConsentText] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Load default consent text
  const loadConsentTemplate = async () => {
    try {
      const template = await getConsentTemplate(companyName);
      setConsentText(template);
    } catch (err) {
      console.error('Failed to load consent template:', err);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'audio/mpeg', 'audio/wav'];
      if (!allowedTypes.includes(file.type)) {
        setError('Invalid file type. Allowed: PDF, PNG, JPEG, MP3, WAV');
        return;
      }
      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        setError('File too large. Maximum size is 10MB.');
        return;
      }
      setProofFile(file);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!phoneNumber.trim()) {
      setError('Phone number is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Record consent
      const consent = await recordConsent({
        phoneNumber,
        consentType,
        consentSource: consentType === 'web_form' ? 'web_form' : 'manual_entry',
        consentText: consentText || undefined,
        contactName: contactName || undefined,
        contactEmail: contactEmail || undefined,
        ipAddress: undefined, // Would be captured server-side for web forms
        userAgent: navigator.userAgent,
      });

      // Upload proof file if provided
      if (proofFile) {
        await uploadConsentProof(consent.id, proofFile);
      }

      setSuccess(true);
      onSuccess?.(consent);

      // Reset form after short delay
      setTimeout(() => {
        setPhoneNumber('');
        setContactName('');
        setContactEmail('');
        setConsentText('');
        setProofFile(null);
        setSuccess(false);
      }, 2000);
    } catch (err) {
      setError('Failed to record consent. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className={`bg-surface/80 backdrop-blur-xl border border-white/5 rounded-2xl p-8 text-center ${className}`}>
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
            <CheckCircle size={32} weight="fill" className="text-green-400" />
          </div>
        </div>
        <h3 className="text-xl font-semibold text-textMain mb-2">Consent Recorded</h3>
        <p className="text-textMuted">
          The consent has been successfully captured and stored.
        </p>
      </div>
    );
  }

  return (
    <div className={`bg-surface/80 backdrop-blur-xl border border-white/5 rounded-2xl p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-textMain">Record Consent</h3>
          <p className="text-sm text-textMuted">Capture TCPA-compliant consent from a contact</p>
        </div>
        {onCancel && (
          <button onClick={onCancel} className="text-textMuted hover:text-textMain transition-colors">
            <X size={20} weight="bold" />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Consent Type Selection */}
        <div>
          <Label>Consent Type</Label>
          <div className="grid grid-cols-2 gap-3 mt-2">
            {CONSENT_TYPES.map((type) => {
              const Icon = type.icon;
              const isSelected = consentType === type.value;
              return (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setConsentType(type.value)}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'bg-primary/10 border-primary/30 ring-1 ring-primary/20'
                      : 'bg-surface border-white/5 hover:border-white/10'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      isSelected ? 'bg-primary/20' : 'bg-white/5'
                    }`}>
                      <Icon size={20} weight="bold" className={isSelected ? 'text-primary' : 'text-textMuted'} />
                    </div>
                    <div>
                      <p className={`font-medium ${isSelected ? 'text-textMain' : 'text-textMuted'}`}>
                        {type.label}
                      </p>
                      <p className="text-xs text-textMuted">{type.description}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Contact Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label required>Phone Number</Label>
            <Input
              type="tel"
              placeholder="+1 (555) 123-4567"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="mt-2"
            />
          </div>
          <div>
            <Label>Contact Name</Label>
            <Input
              type="text"
              placeholder="John Doe"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              className="mt-2"
            />
          </div>
        </div>

        <div>
          <Label>Contact Email</Label>
          <Input
            type="email"
            placeholder="john@example.com"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            className="mt-2"
          />
        </div>

        {/* Consent Text */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label>Consent Language</Label>
            <button
              type="button"
              onClick={loadConsentTemplate}
              className="text-xs text-primary hover:text-primary/80 transition-colors"
            >
              Load Template
            </button>
          </div>
          <Textarea
            placeholder="Enter the consent language that was presented to the contact..."
            value={consentText}
            onChange={(e) => setConsentText(e.target.value)}
            rows={4}
          />
        </div>

        {/* Proof Upload */}
        <div>
          <Label>Consent Proof Document (Optional)</Label>
          <p className="text-xs text-textMuted mb-2">
            Upload a signed form, screenshot, or audio recording. Max 10MB.
          </p>
          <div className="relative">
            <input
              type="file"
              id="proof-upload"
              onChange={handleFileChange}
              accept=".pdf,.png,.jpg,.jpeg,.mp3,.wav"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
              proofFile ? 'border-primary/30 bg-primary/5' : 'border-white/10 hover:border-white/20'
            }`}>
              {proofFile ? (
                <div className="flex items-center justify-center gap-3">
                  <FileText size={24} weight="bold" className="text-primary" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-textMain">{proofFile.name}</p>
                    <p className="text-xs text-textMuted">
                      {(proofFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setProofFile(null);
                    }}
                    className="text-textMuted hover:text-red-400 transition-colors"
                  >
                    <X size={16} weight="bold" />
                  </button>
                </div>
              ) : (
                <>
                  <Upload size={24} className="mx-auto text-textMuted mb-2" />
                  <p className="text-sm text-textMuted">
                    Click or drag to upload proof document
                  </p>
                  <p className="text-xs text-textMuted mt-1">
                    PDF, PNG, JPEG, MP3, WAV
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-2 text-red-400 text-sm p-3 bg-red-500/10 rounded-lg">
            <Warning size={16} weight="fill" />
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" loading={isSubmitting}>
            Record Consent
          </Button>
        </div>
      </form>
    </div>
  );
}

export default ConsentCapture;
