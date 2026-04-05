// ============================================
// TEAM ROUTES - Org Members & Invites
// Endpoints:
//   GET    /api/team/members           - list members + pending invites
//   POST   /api/team/invite            - invite member by email
//   DELETE /api/team/members/:id       - remove member (org_members row)
//   PUT    /api/team/members/:id/role  - change member role
//   POST   /api/team/invites/:id/resend - resend invite email
//   DELETE /api/team/invites/:id       - cancel invite
// ============================================
const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

// ─── Auth middleware ─────────────────────────────────────────────────────────
async function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing auth token' });
    }
    const token = authHeader.replace('Bearer ', '');
    try {
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (error || !user) return res.status(401).json({ error: 'Invalid token' });
        req.user = user;
        next();
    } catch {
        res.status(401).json({ error: 'Auth error' });
    }
}

// ─── Send invite email via Resend (or log if not configured) ─────────────────
async function sendInviteEmail({ toEmail, inviterEmail, orgName, inviteToken, role }) {
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const appUrl = process.env.FRONTEND_URL || 'https://app.voicory.com';
    const inviteUrl = `${appUrl}/invite?token=${inviteToken}`;

    if (!RESEND_API_KEY) {
        // Log invite URL so it can be communicated manually during dev
        console.log(`[TEAM INVITE] No RESEND_API_KEY set. Invite URL for ${toEmail}: ${inviteUrl}`);
        return { ok: true, simulated: true };
    }

    try {
        const resp = await axios.post('https://api.resend.com/emails', {
            from: 'Voicory <noreply@voicory.com>',
            to: toEmail,
            subject: `${inviterEmail} invited you to join ${orgName || 'a Voicory workspace'}`,
            html: `
                <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
                  <h2 style="color:#7c3aed">You're invited to Voicory</h2>
                  <p><strong>${inviterEmail}</strong> has invited you to join as a <strong>${role}</strong>.</p>
                  <a href="${inviteUrl}" style="display:inline-block;background:#7c3aed;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;margin:16px 0">
                    Accept Invitation
                  </a>
                  <p style="color:#888;font-size:12px">This invite expires in 7 days. If you didn't expect this, ignore this email.</p>
                </div>
            `
        }, {
            headers: {
                Authorization: `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        return { ok: true, data: resp.data };
    } catch (err) {
        console.error('[TEAM INVITE] Email send failed:', err?.response?.data || err.message);
        // Don't fail the whole invite if email fails — record is still created
        return { ok: false, error: err?.response?.data };
    }
}

// ─── GET /api/team/members ────────────────────────────────────────────────────
// Returns: { owner, members: [...], invites: [...] }
router.get('/members', requireAuth, async (req, res) => {
    try {
        const orgId = req.user.id;

        // Fetch accepted members
        const { data: members, error: membersError } = await supabase
            .from('org_members')
            .select('id, user_id, role, created_at, invited_by')
            .eq('org_id', orgId)
            .order('created_at', { ascending: true });

        if (membersError) throw membersError;

        // Fetch pending invites
        const { data: invites, error: invitesError } = await supabase
            .from('org_invites')
            .select('id, email, role, status, created_at, expires_at')
            .eq('org_id', orgId)
            .eq('status', 'pending')
            .order('created_at', { ascending: false });

        if (invitesError) throw invitesError;

        // Enrich members with auth.users data (email, display name) where available
        const enrichedMembers = await Promise.all((members || []).map(async (m) => {
            try {
                const { data: userData } = await supabase.auth.admin.getUserById(m.user_id);
                return {
                    ...m,
                    email: userData?.user?.email || '',
                    name: userData?.user?.user_metadata?.full_name || userData?.user?.email || m.user_id
                };
            } catch {
                return { ...m, email: '', name: m.user_id };
            }
        }));

        // Owner info
        const { data: ownerData } = await supabase.auth.admin.getUserById(orgId);
        const owner = {
            user_id: orgId,
            email: ownerData?.user?.email || '',
            name: ownerData?.user?.user_metadata?.full_name || ownerData?.user?.email || 'Owner',
            role: 'owner'
        };

        res.json({ owner, members: enrichedMembers, invites: invites || [] });
    } catch (err) {
        console.error('GET /team/members error:', err);
        res.status(500).json({ error: 'Failed to fetch team members' });
    }
});

// ─── POST /api/team/invite ────────────────────────────────────────────────────
// Body: { email, role }
router.post('/invite', requireAuth, async (req, res) => {
    try {
        const { email, role = 'member' } = req.body;
        if (!email) return res.status(400).json({ error: 'email is required' });
        if (!['admin', 'member', 'viewer'].includes(role)) {
            return res.status(400).json({ error: 'role must be admin, member, or viewer' });
        }

        const orgId = req.user.id;

        // Check if already a member
        const { data: existingMember } = await supabase
            .from('org_members')
            .select('id')
            .eq('org_id', orgId)
            .eq('user_id', (await supabase.auth.admin.getUserByEmail(email))?.data?.user?.id || 'none')
            .maybeSingle();

        if (existingMember) {
            return res.status(409).json({ error: 'User is already a member of this organization' });
        }

        // Upsert invite (in case they re-invite after expiry)
        const { data: invite, error: inviteError } = await supabase
            .from('org_invites')
            .upsert({
                org_id: orgId,
                email: email.toLowerCase().trim(),
                role,
                invited_by: orgId,
                status: 'pending',
                expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
            }, { onConflict: 'org_id,email', ignoreDuplicates: false })
            .select()
            .single();

        if (inviteError) throw inviteError;

        // Send email
        const emailResult = await sendInviteEmail({
            toEmail: email,
            inviterEmail: req.user.email,
            orgName: req.user.user_metadata?.org_name || '',
            inviteToken: invite.token,
            role
        });

        res.json({ success: true, invite, emailSent: emailResult.ok, simulated: emailResult.simulated || false });
    } catch (err) {
        console.error('POST /team/invite error:', err);
        res.status(500).json({ error: 'Failed to send invite' });
    }
});

// ─── DELETE /api/team/members/:id ─────────────────────────────────────────────
// Removes a member from the org (by org_members.id)
router.delete('/members/:id', requireAuth, async (req, res) => {
    try {
        const orgId = req.user.id;
        const { id } = req.params;

        // Verify the member belongs to this org
        const { data: member, error: fetchError } = await supabase
            .from('org_members')
            .select('id, user_id, org_id')
            .eq('id', id)
            .eq('org_id', orgId)
            .single();

        if (fetchError || !member) {
            return res.status(404).json({ error: 'Member not found' });
        }

        const { error: deleteError } = await supabase
            .from('org_members')
            .delete()
            .eq('id', id)
            .eq('org_id', orgId);

        if (deleteError) throw deleteError;

        res.json({ success: true });
    } catch (err) {
        console.error('DELETE /team/members/:id error:', err);
        res.status(500).json({ error: 'Failed to remove member' });
    }
});

// ─── PUT /api/team/members/:id/role ───────────────────────────────────────────
// Body: { role }
router.put('/members/:id/role', requireAuth, async (req, res) => {
    try {
        const orgId = req.user.id;
        const { id } = req.params;
        const { role } = req.body;

        if (!['admin', 'member', 'viewer'].includes(role)) {
            return res.status(400).json({ error: 'role must be admin, member, or viewer' });
        }

        const { data, error } = await supabase
            .from('org_members')
            .update({ role, updated_at: new Date().toISOString() })
            .eq('id', id)
            .eq('org_id', orgId)
            .select()
            .single();

        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'Member not found' });

        res.json({ success: true, member: data });
    } catch (err) {
        console.error('PUT /team/members/:id/role error:', err);
        res.status(500).json({ error: 'Failed to update role' });
    }
});

// ─── POST /api/team/invites/:id/resend ────────────────────────────────────────
router.post('/invites/:id/resend', requireAuth, async (req, res) => {
    try {
        const orgId = req.user.id;
        const { id } = req.params;

        const { data: invite, error: fetchError } = await supabase
            .from('org_invites')
            .select('*')
            .eq('id', id)
            .eq('org_id', orgId)
            .single();

        if (fetchError || !invite) {
            return res.status(404).json({ error: 'Invite not found' });
        }

        // Refresh token and expiry
        const { data: updated, error: updateError } = await supabase
            .from('org_invites')
            .update({
                status: 'pending',
                expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
            })
            .eq('id', id)
            .eq('org_id', orgId)
            .select()
            .single();

        if (updateError) throw updateError;

        const emailResult = await sendInviteEmail({
            toEmail: invite.email,
            inviterEmail: req.user.email,
            orgName: req.user.user_metadata?.org_name || '',
            inviteToken: updated.token,
            role: invite.role
        });

        res.json({ success: true, emailSent: emailResult.ok });
    } catch (err) {
        console.error('POST /team/invites/:id/resend error:', err);
        res.status(500).json({ error: 'Failed to resend invite' });
    }
});

// ─── DELETE /api/team/invites/:id ─────────────────────────────────────────────
router.delete('/invites/:id', requireAuth, async (req, res) => {
    try {
        const orgId = req.user.id;
        const { id } = req.params;

        const { error } = await supabase
            .from('org_invites')
            .delete()
            .eq('id', id)
            .eq('org_id', orgId);

        if (error) throw error;

        res.json({ success: true });
    } catch (err) {
        console.error('DELETE /team/invites/:id error:', err);
        res.status(500).json({ error: 'Failed to cancel invite' });
    }
});

// ─── POST /api/team/invites/accept ────────────────────────────────────────────
// Called when invited user clicks the link; requires their auth token
// Body: { token }
router.post('/invites/accept', requireAuth, async (req, res) => {
    try {
        const { token } = req.body;
        if (!token) return res.status(400).json({ error: 'token is required' });

        const { data: invite, error: fetchError } = await supabase
            .from('org_invites')
            .select('*')
            .eq('token', token)
            .eq('status', 'pending')
            .single();

        if (fetchError || !invite) {
            return res.status(404).json({ error: 'Invalid or expired invite token' });
        }

        if (new Date(invite.expires_at) < new Date()) {
            await supabase.from('org_invites').update({ status: 'expired' }).eq('id', invite.id);
            return res.status(410).json({ error: 'Invite has expired' });
        }

        // Verify email matches
        if (req.user.email?.toLowerCase() !== invite.email.toLowerCase()) {
            return res.status(403).json({ error: 'This invite was sent to a different email address' });
        }

        // Add as member
        const { error: memberError } = await supabase
            .from('org_members')
            .upsert({
                org_id: invite.org_id,
                user_id: req.user.id,
                role: invite.role,
                invited_by: invite.invited_by
            }, { onConflict: 'org_id,user_id' });

        if (memberError) throw memberError;

        // Mark invite accepted
        await supabase.from('org_invites').update({ status: 'accepted' }).eq('id', invite.id);

        res.json({ success: true, org_id: invite.org_id, role: invite.role });
    } catch (err) {
        console.error('POST /team/invites/accept error:', err);
        res.status(500).json({ error: 'Failed to accept invite' });
    }
});

module.exports = router;
