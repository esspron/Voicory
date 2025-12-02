import * as React from 'react';
import { Command } from 'cmdk';
import { MagnifyingGlass, House, User, Gear, SignOut, Phone, BookOpen, Users } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

export function CommandPalette() {
    const [open, setOpen] = React.useState(false);
    const navigate = useNavigate();
    const { logout } = useAuth();

    React.useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((open) => !open);
            }
        };
        document.addEventListener('keydown', down);
        return () => document.removeEventListener('keydown', down);
    }, []);

    const runCommand = React.useCallback((command: () => void) => {
        setOpen(false);
        command();
    }, []);

    return (
        <AnimatePresence>
            {open && (
                <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={() => setOpen(false)}
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -20 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="relative w-full max-w-lg overflow-hidden rounded-xl border border-white/10 bg-[#1A1D21]/95 backdrop-blur-2xl shadow-2xl shadow-black/50"
                    >
                        <Command className="w-full bg-transparent">
                            <div className="flex items-center border-b border-white/10 px-4" cmdk-input-wrapper="">
                                <MagnifyingGlass className="mr-2 h-5 w-5 shrink-0 opacity-50 text-textMuted" />
                                <Command.Input
                                    placeholder="Type a command or search..."
                                    className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-textMuted/60 text-textMain disabled:cursor-not-allowed disabled:opacity-50"
                                />
                            </div>
                            <Command.List className="max-h-[300px] overflow-y-auto overflow-x-hidden p-2 scrollbar-thin scrollbar-thumb-white/10">
                                <Command.Empty className="py-6 text-center text-sm text-textMuted">
                                    No results found.
                                </Command.Empty>
                                <Command.Group heading="Navigation" className="text-xs font-medium text-textMuted px-2 py-1.5 mb-1">
                                    <Command.Item
                                        onSelect={() => runCommand(() => navigate('/'))}
                                        className="relative flex cursor-pointer select-none items-center rounded-lg px-2 py-2 text-sm outline-none aria-selected:bg-primary/10 aria-selected:text-primary data-[disabled]:pointer-events-none data-[disabled]:opacity-50 transition-colors group"
                                    >
                                        <House className="mr-2 h-4 w-4 text-textMuted group-aria-selected:text-primary" />
                                        <span>Overview</span>
                                    </Command.Item>
                                    <Command.Item
                                        onSelect={() => runCommand(() => navigate('/assistants'))}
                                        className="relative flex cursor-pointer select-none items-center rounded-lg px-2 py-2 text-sm outline-none aria-selected:bg-primary/10 aria-selected:text-primary data-[disabled]:pointer-events-none data-[disabled]:opacity-50 transition-colors group"
                                    >
                                        <User className="mr-2 h-4 w-4 text-textMuted group-aria-selected:text-primary" />
                                        <span>Assistants</span>
                                    </Command.Item>
                                    <Command.Item
                                        onSelect={() => runCommand(() => navigate('/phone-numbers'))}
                                        className="relative flex cursor-pointer select-none items-center rounded-lg px-2 py-2 text-sm outline-none aria-selected:bg-primary/10 aria-selected:text-primary data-[disabled]:pointer-events-none data-[disabled]:opacity-50 transition-colors group"
                                    >
                                        <Phone className="mr-2 h-4 w-4 text-textMuted group-aria-selected:text-primary" />
                                        <span>Phone Numbers</span>
                                    </Command.Item>
                                    <Command.Item
                                        onSelect={() => runCommand(() => navigate('/knowledge-base'))}
                                        className="relative flex cursor-pointer select-none items-center rounded-lg px-2 py-2 text-sm outline-none aria-selected:bg-primary/10 aria-selected:text-primary data-[disabled]:pointer-events-none data-[disabled]:opacity-50 transition-colors group"
                                    >
                                        <BookOpen className="mr-2 h-4 w-4 text-textMuted group-aria-selected:text-primary" />
                                        <span>Knowledge Base</span>
                                    </Command.Item>
                                    <Command.Item
                                        onSelect={() => runCommand(() => navigate('/customers'))}
                                        className="relative flex cursor-pointer select-none items-center rounded-lg px-2 py-2 text-sm outline-none aria-selected:bg-primary/10 aria-selected:text-primary data-[disabled]:pointer-events-none data-[disabled]:opacity-50 transition-colors group"
                                    >
                                        <Users className="mr-2 h-4 w-4 text-textMuted group-aria-selected:text-primary" />
                                        <span>Customers</span>
                                    </Command.Item>
                                    <Command.Item
                                        onSelect={() => runCommand(() => navigate('/settings'))}
                                        className="relative flex cursor-pointer select-none items-center rounded-lg px-2 py-2 text-sm outline-none aria-selected:bg-primary/10 aria-selected:text-primary data-[disabled]:pointer-events-none data-[disabled]:opacity-50 transition-colors group"
                                    >
                                        <Gear className="mr-2 h-4 w-4 text-textMuted group-aria-selected:text-primary" />
                                        <span>Settings</span>
                                    </Command.Item>
                                </Command.Group>
                                <Command.Separator className="my-1 h-px bg-white/10" />
                                <Command.Group heading="System" className="text-xs font-medium text-textMuted px-2 py-1.5 mb-1">
                                    <Command.Item
                                        onSelect={() => runCommand(() => logout())}
                                        className="relative flex cursor-pointer select-none items-center rounded-lg px-2 py-2 text-sm outline-none aria-selected:bg-red-500/10 aria-selected:text-red-400 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 transition-colors group"
                                    >
                                        <SignOut className="mr-2 h-4 w-4 text-textMuted group-aria-selected:text-red-400" />
                                        <span>Log out</span>
                                    </Command.Item>
                                </Command.Group>
                            </Command.List>
                        </Command>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
