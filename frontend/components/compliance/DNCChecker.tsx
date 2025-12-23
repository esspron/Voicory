/**
 * DNC Checker Component
 *
 * Quick check if a phone number is on the Do Not Call list
 */

import { useState } from 'react';
import { MagnifyingGlass, CheckCircle, XCircle, Warning } from '@phosphor-icons/react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { checkDNC, formatPhoneNumber, type DNCCheckResult } from '@/services/tcpaService';

interface DNCCheckerProps {
  onResult?: (result: DNCCheckResult) => void;
  className?: string;
}

export function DNCChecker({ onResult, className = '' }: DNCCheckerProps) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState<DNCCheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCheck = async () => {
    if (!phoneNumber.trim()) {
      setError('Please enter a phone number');
      return;
    }

    setIsChecking(true);
    setError(null);
    setResult(null);

    try {
      const checkResult = await checkDNC(phoneNumber);
      setResult(checkResult);
      onResult?.(checkResult);
    } catch (err) {
      setError('Failed to check DNC status. Please try again.');
    } finally {
      setIsChecking(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCheck();
    }
  };

  return (
    <div className={`bg-surface/80 backdrop-blur-xl border border-white/5 rounded-2xl p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-textMain mb-4">DNC Checker</h3>
      <p className="text-sm text-textMuted mb-4">
        Quickly check if a phone number is on your Do Not Call list.
      </p>

      <div className="flex gap-3">
        <Input
          type="tel"
          placeholder="Enter phone number..."
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1"
          leftIcon={<MagnifyingGlass size={18} weight="bold" />}
        />
        <Button
          onClick={handleCheck}
          disabled={isChecking}
          loading={isChecking}
        >
          Check
        </Button>
      </div>

      {error && (
        <div className="mt-4 flex items-center gap-2 text-red-400 text-sm">
          <Warning size={16} weight="fill" />
          {error}
        </div>
      )}

      {result && (
        <div className={`mt-4 p-4 rounded-xl border ${
          result.onDNC 
            ? 'bg-red-500/10 border-red-500/20' 
            : 'bg-green-500/10 border-green-500/20'
        }`}>
          <div className="flex items-center gap-3">
            {result.onDNC ? (
              <XCircle size={24} weight="fill" className="text-red-400" />
            ) : (
              <CheckCircle size={24} weight="fill" className="text-green-400" />
            )}
            <div>
              <p className={`font-medium ${result.onDNC ? 'text-red-400' : 'text-green-400'}`}>
                {result.onDNC ? 'On DNC List' : 'Not on DNC List'}
              </p>
              <p className="text-sm text-textMuted">
                {formatPhoneNumber(phoneNumber)}
              </p>
            </div>
          </div>

          {result.onDNC && result.reason && (
            <div className="mt-3 pt-3 border-t border-white/5">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-textMuted">Reason:</span>
                <Badge variant="default" size="sm">{result.reason}</Badge>
              </div>
              {result.source && (
                <div className="flex items-center gap-2 text-sm mt-1">
                  <span className="text-textMuted">Source:</span>
                  <span className="text-textMain">{result.source}</span>
                </div>
              )}
              {result.addedAt && (
                <div className="flex items-center gap-2 text-sm mt-1">
                  <span className="text-textMuted">Added:</span>
                  <span className="text-textMain">{new Date(result.addedAt).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default DNCChecker;
