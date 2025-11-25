import React from 'react';

const Members: React.FC = () => {
    return (
        <div className="max-w-3xl">
            <h1 className="text-2xl font-bold text-textMain mb-6">Members</h1>
            <p className="text-textMuted">Manage members of your organization.</p>
            {/* Placeholder content */}
            <div className="mt-8 p-8 bg-surface border border-border rounded-xl text-center text-textMuted">
                Member management features coming soon.
            </div>
        </div>
    );
};

export default Members;
