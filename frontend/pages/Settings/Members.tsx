import {
    Users, UserPlus, Crown, DotsThreeVertical, Trash, PencilSimple,
    EnvelopeSimple, CheckCircle, WarningCircle, ArrowClockwise, X
} from '@phosphor-icons/react';
import React, { useState, useEffect, useCallback } from 'react';

import { Button } from '../../components/ui/Button';
import { authFetch } from '../../lib/api';

// ─── Types ───────────────────────────────────────────────────────────────────

type Role = 'admin' | 'member' | 'viewer';

interface OrgMember {
    id: string;
    user_id: string;
    role: Role;
    email: string;
    name: string;
    created_at: string;
}

interface OrgInvite {
    id: string;
    email: string;
    role: Role;
    status: 'pending' | 'accepted' | 'declined' | 'expired';
    created_at: string;
    expires_at: string;
}

interface OrgOwner {
    user_id: string;
    email: string;
    name: string;
    role: 'owner';
}

interface TeamData {
    owner: OrgOwner;
    members: OrgMember[];
    invites: OrgInvite[];
}

// ─── Role Badge ───────────────────────────────────────────────────────────────

const ROLE_STYLES: Record<string, string> = {
    owner: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    admin: 'bg-red-500/10 text-red-400 border-red-500/20',
    member: 'bg-primary/10 text-primary border-primary/20',
    viewer: 'bg-white/5 text-textMuted border-white/10',
};

const RoleBadge: React.FC<{ role: string }> = ({ role }) => (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium border capitalize ${ROLE_STYLES[role] || ROLE_STYLES.viewer}`}>
        {role}
    </span>
);

// ─── Avatar Initials ──────────────────────────────────────────────────────────

const Avatar: React.FC<{ name: string; email: string }> = ({ name, email }) => {
    const letter = (name || email || '?')[0].toUpperCase();
    return (
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-white/10 text-sm font-bold text-primary flex-shrink-0">
            {letter}
        </div>
    );
};

// ─── Toast ────────────────────────────────────────────────────────────────────

type ToastType = 'success' | 'error';
interface Toast { message: string; type: ToastType }

const ToastBanner: React.FC<Toast & { onClose: () => void }> = ({ message, type, onClose }) => (
    <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg text-sm font-medium ${
        type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
            : 'bg-red-500/10 border-red-500/20 text-red-400'
    }`}>
        {type === 'success'
            ? <CheckCircle size={18} weight="fill" />
            : <WarningCircle size={18} weight="fill" />
        }
        {message}
        <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100"><X size={14} /></button>
    </div>
);

// ─── Invite Modal ─────────────────────────────────────────────────────────────

interface InviteModalProps {
    onClose: () => void;
    onInvited: () => void;
    showToast: (msg: string, type: ToastType) => void;
}

const InviteModal: React.FC<InviteModalProps> = ({ onClose, onInvited, showToast }) => {
    const [email, setEmail] = useState('');
    const [role, setRole] = useState<Role>('member');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) return;
        setLoading(true);
        try {
            const res = await authFetch('/api/team/invite', {
                method: 'POST',
                body: JSON.stringify({ email: email.trim(), role })
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to send invite');
            }
            showToast(`Invitation sent to ${email}`, 'success');
            onInvited();
            onClose();
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Failed to send invite';
            showToast(msg, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-surface border border-white/[0.08] rounded-2xl p-6 w-full max-w-md">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-textMain">Invite Team Member</h3>
                    <button onClick={onClose} className="text-textMuted hover:text-textMain transition-colors">
                        <X size={20} />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-textMuted mb-1.5">Email Address</label>
                        <input
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="colleague@company.com"
                            required
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-textMain placeholder-textMuted focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-textMuted mb-1.5">Role</label>
                        <select
                            value={role}
                            onChange={e => setRole(e.target.value as Role)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-textMain focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all"
                        >
                            <option value="admin">Admin — full access</option>
                            <option value="member">Member — standard access</option>
                            <option value="viewer">Viewer — read-only</option>
                        </select>
                    </div>
                    <div className="flex gap-3 pt-2">
                        <Button type="button" variant="ghost" className="flex-1" onClick={onClose}>Cancel</Button>
                        <Button type="submit" className="flex-1 gap-2" disabled={loading}>
                            {loading ? <ArrowClockwise size={16} className="animate-spin" /> : <EnvelopeSimple size={16} />}
                            Send Invite
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ─── Member Row ───────────────────────────────────────────────────────────────

interface MemberRowProps {
    member: OrgMember;
    onRoleChange: (id: string, role: Role) => Promise<void>;
    onRemove: (id: string, name: string) => void;
}

const MemberRow: React.FC<MemberRowProps> = ({ member, onRoleChange, onRemove }) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const [changingRole, setChangingRole] = useState(false);

    const handleRoleChange = async (newRole: Role) => {
        setChangingRole(true);
        await onRoleChange(member.id, newRole);
        setChangingRole(false);
        setMenuOpen(false);
    };

    return (
        <div className="flex items-center justify-between py-3 px-4 hover:bg-white/[0.02] rounded-xl transition-colors group">
            <div className="flex items-center gap-3">
                <Avatar name={member.name} email={member.email} />
                <div>
                    <p className="text-sm font-medium text-textMain">{member.name}</p>
                    <p className="text-xs text-textMuted">{member.email}</p>
                </div>
            </div>
            <div className="flex items-center gap-3">
                <RoleBadge role={member.role} />
                <div className="relative">
                    <button
                        onClick={() => setMenuOpen(v => !v)}
                        className="p-1.5 rounded-lg text-textMuted hover:text-textMain hover:bg-white/5 opacity-0 group-hover:opacity-100 transition-all"
                    >
                        <DotsThreeVertical size={16} weight="bold" />
                    </button>
                    {menuOpen && (
                        <div className="absolute right-0 top-8 bg-surface border border-white/[0.08] rounded-xl shadow-xl z-20 min-w-[180px] py-1 text-sm">
                            <div className="px-3 py-1.5 text-xs text-textMuted font-medium uppercase tracking-wide">Change Role</div>
                            {(['admin', 'member', 'viewer'] as Role[]).map(r => (
                                <button
                                    key={r}
                                    onClick={() => handleRoleChange(r)}
                                    disabled={changingRole || member.role === r}
                                    className={`w-full text-left px-3 py-2 hover:bg-white/5 flex items-center gap-2 transition-colors ${member.role === r ? 'opacity-40' : 'text-textMain'}`}
                                >
                                    <PencilSimple size={14} />
                                    <span className="capitalize">{r}</span>
                                    {member.role === r && <span className="ml-auto text-xs text-textMuted">current</span>}
                                </button>
                            ))}
                            <div className="border-t border-white/[0.06] my-1" />
                            <button
                                onClick={() => { setMenuOpen(false); onRemove(member.id, member.name || member.email); }}
                                className="w-full text-left px-3 py-2 hover:bg-red-500/10 text-red-400 flex items-center gap-2 transition-colors"
                            >
                                <Trash size={14} />
                                Remove Member
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// ─── Invite Row ───────────────────────────────────────────────────────────────

interface InviteRowProps {
    invite: OrgInvite;
    onResend: (id: string) => Promise<void>;
    onCancel: (id: string, email: string) => void;
}

const InviteRow: React.FC<InviteRowProps> = ({ invite, onResend, onCancel }) => {
    const [resending, setResending] = useState(false);

    const handleResend = async () => {
        setResending(true);
        await onResend(invite.id);
        setResending(false);
    };

    return (
        <div className="flex items-center justify-between py-3 px-4 hover:bg-white/[0.02] rounded-xl transition-colors group">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 flex-shrink-0">
                    <EnvelopeSimple size={18} weight="duotone" className="text-textMuted" />
                </div>
                <div>
                    <p className="text-sm font-medium text-textMain">{invite.email}</p>
                    <p className="text-xs text-textMuted">Invite pending · <span className="capitalize">{invite.role}</span></p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    Pending
                </span>
                <button
                    onClick={handleResend}
                    disabled={resending}
                    title="Resend invite"
                    className="p-1.5 rounded-lg text-textMuted hover:text-textMain hover:bg-white/5 opacity-0 group-hover:opacity-100 transition-all"
                >
                    {resending
                        ? <ArrowClockwise size={15} className="animate-spin" />
                        : <ArrowClockwise size={15} />
                    }
                </button>
                <button
                    onClick={() => onCancel(invite.id, invite.email)}
                    title="Cancel invite"
                    className="p-1.5 rounded-lg text-textMuted hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                >
                    <Trash size={15} />
                </button>
            </div>
        </div>
    );
};

// ─── Confirm Dialog ───────────────────────────────────────────────────────────

interface ConfirmProps {
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    danger?: boolean;
}

const ConfirmDialog: React.FC<ConfirmProps> = ({ message, onConfirm, onCancel, danger }) => (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-surface border border-white/[0.08] rounded-2xl p-6 w-full max-w-sm">
            <p className="text-sm text-textMain mb-6">{message}</p>
            <div className="flex gap-3">
                <Button variant="ghost" className="flex-1" onClick={onCancel}>Cancel</Button>
                <Button
                    className={`flex-1 ${danger ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border-red-500/20' : ''}`}
                    onClick={onConfirm}
                >
                    Confirm
                </Button>
            </div>
        </div>
    </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const Members: React.FC = () => {
    const [teamData, setTeamData] = useState<TeamData | null>(null);
    const [loading, setLoading] = useState(true);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [toast, setToast] = useState<Toast | null>(null);
    const [confirm, setConfirm] = useState<{ message: string; onConfirm: () => void } | null>(null);

    const showToast = (message: string, type: ToastType) => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    const fetchTeam = useCallback(async () => {
        try {
            const res = await authFetch('/api/team/members');
            if (!res.ok) throw new Error('Failed to load team');
            const data: TeamData = await res.json();
            setTeamData(data);
        } catch (err) {
            console.error('Failed to fetch team:', err);
            showToast('Failed to load team members', 'error');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchTeam(); }, [fetchTeam]);

    const handleRoleChange = async (memberId: string, newRole: Role) => {
        try {
            const res = await authFetch(`/api/team/members/${memberId}/role`, {
                method: 'PUT',
                body: JSON.stringify({ role: newRole })
            });
            if (!res.ok) throw new Error('Failed to update role');
            showToast('Role updated', 'success');
            await fetchTeam();
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Failed to update role';
            showToast(msg, 'error');
        }
    };

    const handleRemoveMember = (memberId: string, name: string) => {
        setConfirm({
            message: `Remove ${name} from your organization? They will lose access immediately.`,
            onConfirm: async () => {
                setConfirm(null);
                try {
                    const res = await authFetch(`/api/team/members/${memberId}`, { method: 'DELETE' });
                    if (!res.ok) throw new Error('Failed to remove member');
                    showToast(`${name} has been removed`, 'success');
                    await fetchTeam();
                } catch (err: unknown) {
                    const msg = err instanceof Error ? err.message : 'Failed to remove member';
                    showToast(msg, 'error');
                }
            }
        });
    };

    const handleResendInvite = async (inviteId: string) => {
        try {
            const res = await authFetch(`/api/team/invites/${inviteId}/resend`, { method: 'POST' });
            if (!res.ok) throw new Error('Failed to resend invite');
            showToast('Invite resent', 'success');
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Failed to resend invite';
            showToast(msg, 'error');
        }
    };

    const handleCancelInvite = (inviteId: string, email: string) => {
        setConfirm({
            message: `Cancel the invite for ${email}?`,
            onConfirm: async () => {
                setConfirm(null);
                try {
                    const res = await authFetch(`/api/team/invites/${inviteId}`, { method: 'DELETE' });
                    if (!res.ok) throw new Error('Failed to cancel invite');
                    showToast('Invite cancelled', 'success');
                    await fetchTeam();
                } catch (err: unknown) {
                    const msg = err instanceof Error ? err.message : 'Failed to cancel invite';
                    showToast(msg, 'error');
                }
            }
        });
    };

    return (
        <div className="max-w-4xl">
            {/* Toast */}
            {toast && <ToastBanner {...toast} onClose={() => setToast(null)} />}

            {/* Confirm Dialog */}
            {confirm && (
                <ConfirmDialog
                    message={confirm.message}
                    onConfirm={confirm.onConfirm}
                    onCancel={() => setConfirm(null)}
                    danger
                />
            )}

            {/* Invite Modal */}
            {showInviteModal && (
                <InviteModal
                    onClose={() => setShowInviteModal(false)}
                    onInvited={fetchTeam}
                    showToast={showToast}
                />
            )}

            {/* Header */}
            <div className="flex items-start justify-between mb-8">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-violet-500/10 flex items-center justify-center border border-white/10">
                        <Users size={24} weight="duotone" className="text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-textMain">Members</h1>
                        <p className="text-sm text-textMuted">Manage members of your organization</p>
                    </div>
                </div>
                <Button className="gap-2" onClick={() => setShowInviteModal(true)}>
                    <UserPlus size={18} weight="bold" />
                    Invite Member
                </Button>
            </div>

            {loading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse" />
                    ))}
                </div>
            ) : (
                <>
                    {/* Owner Card */}
                    {teamData?.owner && (
                        <div className="bg-surface/50 backdrop-blur-sm border border-white/[0.06] rounded-2xl p-5 mb-4">
                            <div className="flex items-center gap-2 mb-4">
                                <Crown size={16} weight="fill" className="text-yellow-500" />
                                <h3 className="text-sm font-semibold text-textMain">Organization Owner</h3>
                            </div>
                            <div className="flex items-center justify-between px-4">
                                <div className="flex items-center gap-3">
                                    <Avatar name={teamData.owner.name} email={teamData.owner.email} />
                                    <div>
                                        <p className="text-sm font-medium text-textMain">{teamData.owner.name}</p>
                                        <p className="text-xs text-textMuted">{teamData.owner.email}</p>
                                    </div>
                                </div>
                                <RoleBadge role="owner" />
                            </div>
                        </div>
                    )}

                    {/* Members */}
                    {(teamData?.members?.length ?? 0) > 0 && (
                        <div className="bg-surface/50 backdrop-blur-sm border border-white/[0.06] rounded-2xl p-5 mb-4">
                            <h3 className="text-sm font-semibold text-textMain mb-3 px-4">
                                Team Members <span className="text-textMuted font-normal">({teamData!.members.length})</span>
                            </h3>
                            <div className="divide-y divide-white/[0.04]">
                                {teamData!.members.map(member => (
                                    <MemberRow
                                        key={member.id}
                                        member={member}
                                        onRoleChange={handleRoleChange}
                                        onRemove={handleRemoveMember}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Pending Invites */}
                    {(teamData?.invites?.length ?? 0) > 0 && (
                        <div className="bg-surface/50 backdrop-blur-sm border border-white/[0.06] rounded-2xl p-5 mb-4">
                            <h3 className="text-sm font-semibold text-textMain mb-3 px-4">
                                Pending Invites <span className="text-textMuted font-normal">({teamData!.invites.length})</span>
                            </h3>
                            <div className="divide-y divide-white/[0.04]">
                                {teamData!.invites.map(invite => (
                                    <InviteRow
                                        key={invite.id}
                                        invite={invite}
                                        onResend={handleResendInvite}
                                        onCancel={handleCancelInvite}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Empty state — no members and no invites */}
                    {(teamData?.members?.length ?? 0) === 0 && (teamData?.invites?.length ?? 0) === 0 && (
                        <div className="bg-surface/50 backdrop-blur-sm border border-white/[0.06] rounded-2xl p-12 text-center">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
                                <UserPlus size={32} weight="duotone" className="text-primary" />
                            </div>
                            <h3 className="text-lg font-semibold text-textMain mb-2">No team members yet</h3>
                            <p className="text-sm text-textMuted max-w-sm mx-auto mb-6">
                                Invite colleagues to collaborate on your AI voice agents. Assign roles to control access levels.
                            </p>
                            <div className="flex items-center justify-center gap-3 mb-8">
                                <span className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-textMuted">Admin</span>
                                <span className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-textMuted">Member</span>
                                <span className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-textMuted">Viewer</span>
                            </div>
                            <Button className="gap-2 mx-auto" onClick={() => setShowInviteModal(true)}>
                                <UserPlus size={16} />
                                Invite Your First Member
                            </Button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default Members;
