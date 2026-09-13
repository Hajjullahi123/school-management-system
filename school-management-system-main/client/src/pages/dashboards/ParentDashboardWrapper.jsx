import React from 'react';
import ParentDashboard from '../parent/ParentDashboard';

const ParentDashboardWrapper = () => (
    <div className="space-y-4">
        <div className="bg-gradient-to-r from-primary to-primary/80 text-white p-5 rounded-xl shadow-md">
            <h1 className="text-xl font-black italic tracking-tighter uppercase">Parent Portal</h1>
            <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest mt-1">Family Academic Monitoring</p>
        </div>
        <ParentDashboard />
    </div>
);

export default ParentDashboardWrapper;
