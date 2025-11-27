import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowUpRight, ArrowDownRight, PhoneCall, Clock, IndianRupee, MessageSquare } from 'lucide-react';
import { getCallLogs } from '../services/callyyService';
import { getUsageSummary } from '../services/billingService';
import type { CallLog } from '../types';

const StatCard = ({ title, value, change, icon: Icon, trend }: any) => (
    <div className="bg-surface border border-border rounded-xl p-5">
        <div className="flex justify-between items-start">
            <div>
                <p className="text-sm text-textMuted mb-1">{title}</p>
                <h3 className="text-2xl font-bold text-textMain">{value}</h3>
            </div>
            <div className="p-2 bg-surfaceHover rounded-lg text-primary">
                <Icon size={20} />
            </div>
        </div>
        {change && (
            <div className="mt-4 flex items-center text-xs">
                <span className={`flex items-center font-medium ${trend === 'up' ? 'text-emerald-500' : 'text-red-500'}`}>
                    {trend === 'up' ? <ArrowUpRight size={14} className="mr-1" /> : <ArrowDownRight size={14} className="mr-1" />}
                    {change}
                </span>
                <span className="text-textMuted ml-2">vs last week</span>
            </div>
        )}
    </div>
);

const Overview: React.FC = () => {
    const [callLogs, setCallLogs] = useState<CallLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // Usage metrics from billing
    const [totalLLMCost, setTotalLLMCost] = useState(0);
    const [totalMessages, setTotalMessages] = useState(0);
    const [totalTokens, setTotalTokens] = useState(0);

    useEffect(() => {
        const fetchData = async () => {
            try {
                console.log('Fetching call logs...');
                const [logs, usageSummary] = await Promise.all([
                    getCallLogs(),
                    getUsageSummary(7) // Last 7 days
                ]);
                console.log('Fetched logs:', logs);
                console.log('Usage summary:', usageSummary);
                setCallLogs(logs);
                
                // Set usage metrics
                setTotalLLMCost(usageSummary.totalCost || 0);
                setTotalMessages(usageSummary.byModel.reduce((sum, m) => sum + m.count, 0));
                setTotalTokens(usageSummary.totalTokens || 0);
                
                setError(null);
            } catch (err) {
                console.error('Error loading call logs:', err);
                setError(err instanceof Error ? err.message : 'Failed to load data');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // Calculate metrics from real data with week-over-week comparison
    const now = new Date();
    const last7DaysStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last14DaysStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    // Current week (last 7 days)
    const currentWeekLogs = callLogs.filter(log => {
        const logDate = new Date(log.date);
        return logDate >= last7DaysStart;
    });

    // Previous week (8-14 days ago)
    const previousWeekLogs = callLogs.filter(log => {
        const logDate = new Date(log.date);
        return logDate >= last14DaysStart && logDate < last7DaysStart;
    });

    // Current week metrics
    const totalCost = currentWeekLogs.reduce((sum, log) => sum + log.cost, 0);
    const totalCalls = currentWeekLogs.length;
    const avgDuration = currentWeekLogs.length > 0 
        ? Math.round(currentWeekLogs.reduce((sum, log) => {
            const [mins, secs] = log.duration.split('m ');
            return sum + parseInt(mins) * 60 + parseInt(secs);
        }, 0) / currentWeekLogs.length)
        : 0;
    const avgDurationFormatted = `${Math.floor(avgDuration / 60)}m ${avgDuration % 60}s`;

    // Previous week metrics
    const prevTotalCost = previousWeekLogs.reduce((sum, log) => sum + log.cost, 0);
    const prevTotalCalls = previousWeekLogs.length;
    const prevAvgDuration = previousWeekLogs.length > 0
        ? Math.round(previousWeekLogs.reduce((sum, log) => {
            const [mins, secs] = log.duration.split('m ');
            return sum + parseInt(mins) * 60 + parseInt(secs);
        }, 0) / previousWeekLogs.length)
        : 0;

    // Calculate percentage changes
    const costChange = prevTotalCost > 0 
        ? (((totalCost - prevTotalCost) / prevTotalCost) * 100).toFixed(1)
        : null;
    const callsChange = prevTotalCalls > 0
        ? (((totalCalls - prevTotalCalls) / prevTotalCalls) * 100).toFixed(1)
        : null;
    const durationChange = prevAvgDuration > 0
        ? (((avgDuration - prevAvgDuration) / prevAvgDuration) * 100).toFixed(1)
        : null;

    // Determine trends
    const costTrend = costChange ? (parseFloat(costChange) >= 0 ? 'up' : 'down') : 'up';
    const callsTrend = callsChange ? (parseFloat(callsChange) >= 0 ? 'up' : 'down') : 'up';
    const durationTrend = durationChange ? (parseFloat(durationChange) >= 0 ? 'up' : 'down') : 'up';

    // Generate chart data from real call logs (last 7 days)
    const chartData = React.useMemo(() => {
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const today = new Date();
        const last7Days = days.map((name, index) => {
            const date = new Date(today);
            date.setDate(date.getDate() - (6 - index));
            return { name, calls: 0, cost: 0, date: date.toDateString() };
        });

        currentWeekLogs.forEach(log => {
            const logDate = new Date(log.date).toDateString();
            const dayData = last7Days.find(d => d.date === logDate);
            if (dayData) {
                dayData.calls += 1;
                dayData.cost += log.cost;
            }
        });

        return last7Days;
    }, [currentWeekLogs]);

    return (
        <div className="p-8 space-y-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-textMain">Dashboard</h1>
                    <p className="text-textMuted text-sm mt-1">Overview of your voice AI performance across India region.</p>
                </div>
                <select className="bg-surface border border-border text-textMain text-sm rounded-lg px-3 py-2 outline-none focus:border-primary">
                    <option>Last 7 Days</option>
                    <option>Last 30 Days</option>
                </select>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard 
                    title="Total Cost" 
                    value={loading ? "..." : `₹ ${totalLLMCost.toFixed(2)}`}
                    change={costChange ? `${Math.abs(parseFloat(costChange))}%` : null}
                    trend={costTrend} 
                    icon={IndianRupee} 
                />
                <StatCard 
                    title="Total Messages" 
                    value={loading ? "..." : totalMessages.toString()}
                    change={null}
                    trend="up" 
                    icon={MessageSquare} 
                />
                <StatCard 
                    title="Total Calls" 
                    value={loading ? "..." : totalCalls.toString()}
                    change={callsChange ? `${Math.abs(parseFloat(callsChange))}%` : null}
                    trend={callsTrend} 
                    icon={PhoneCall} 
                />
                <StatCard 
                    title="Avg Duration" 
                    value={loading ? "..." : avgDurationFormatted}
                    change={durationChange ? `${Math.abs(parseFloat(durationChange))}%` : null}
                    trend={durationTrend} 
                    icon={Clock} 
                />
            </div>

            {/* Charts Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-surface border border-border rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-textMain mb-6">Usage Trends (Last 7 Days)</h3>
                    <div className="h-64 w-full">
                        {loading ? (
                            <div className="flex items-center justify-center h-full text-textMuted">
                                Loading chart data...
                            </div>
                        ) : callLogs.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full">
                                <PhoneCall size={48} className="text-textMuted opacity-30 mb-3" />
                                <p className="text-textMuted text-sm">No call data to display</p>
                                <p className="text-textMuted text-xs mt-1">Chart will show when you have call logs</p>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#2EC7B7" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#2EC7B7" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#2D3139" vertical={false} />
                                    <XAxis dataKey="name" stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: '#1B1E23', border: '1px solid #2D3139', borderRadius: '8px' }}
                                        itemStyle={{ color: '#EBEBEB' }}
                                    />
                                    <Area type="monotone" dataKey="calls" stroke="#2EC7B7" strokeWidth={2} fillOpacity={1} fill="url(#colorCalls)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-surface border border-border rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-textMain mb-4">Recent Calls</h3>
                    <div className="space-y-4">
                        {loading ? (
                            <div className="text-center py-8 text-textMuted">Loading recent calls...</div>
                        ) : callLogs.length === 0 ? (
                            <div className="text-center py-8">
                                <PhoneCall size={32} className="mx-auto mb-3 text-textMuted opacity-30" />
                                <p className="text-textMuted text-sm font-medium">No calls yet</p>
                                <p className="text-textMuted text-xs mt-2">Recent calls will appear here</p>
                            </div>
                        ) : (
                            callLogs.slice(0, 4).map((log) => (
                                <div key={log.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-surfaceHover transition-colors cursor-pointer border border-transparent hover:border-border">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-2 h-2 rounded-full ${log.status === 'completed' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                        <div>
                                            <p className="text-sm font-medium text-textMain">{log.assistantName}</p>
                                            <p className="text-xs text-textMuted">{log.phoneNumber}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-mono text-textMain">₹{log.cost}</p>
                                        <p className="text-xs text-textMuted">{log.duration}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                    {!loading && callLogs.length > 0 && (
                        <button className="w-full mt-4 text-sm text-primary hover:text-primaryHover font-medium text-center py-2">
                            View All Logs
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Overview;
