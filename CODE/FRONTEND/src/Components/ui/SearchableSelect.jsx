import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SearchableSelect({
    options,
    value,
    onChange,
    placeholder = "Select an option",
    icon: Icon,
    disabled = false,
    className = ""
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const dropdownRef = useRef(null);

    // Filter options based on search
    const filteredOptions = options.filter(opt =>
        opt.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (opt.searchTerms && opt.searchTerms.some(term => term.toLowerCase().includes(searchTerm.toLowerCase())))
    );

    const selectedOption = options.find(opt => opt.value === value);

    // Close when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Reset search when opened
    useEffect(() => {
        if (isOpen) setSearchTerm('');
    }, [isOpen]);

    return (
        <div className={`relative ${className}`} ref={dropdownRef}>
            {/* Trigger Button */}
            <button
                type="button"
                disabled={disabled}
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full flex items-center justify-between bg-white/10 border ${isOpen ? 'border-titan-purple/50 bg-white/15' : 'border-white/10'} rounded-lg py-2.5 px-4 text-left transition-all font-sans text-sm shadow-inner group ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-white/15'}`}
            >
                <div className="flex items-center gap-3 overflow-hidden">
                    {Icon && <Icon size={16} className={`text-white/40 flex-shrink-0 ${isOpen ? 'text-titan-cyan' : 'group-hover:text-titan-cyan'} transition-colors`} />}
                    <span className={`truncate ${!selectedOption ? 'text-white/50' : 'text-white'}`}>
                        {selectedOption ? selectedOption.label : placeholder}
                    </span>
                </div>
                <ChevronDown size={16} className={`text-white/40 flex-shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            <AnimatePresence>
                {isOpen && !disabled && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.15 }}
                        className="absolute z-50 w-full mt-2 bg-[#1a1a1a] border border-white/10 rounded-lg shadow-2xl overflow-hidden"
                    >
                        {/* Search Input */}
                        <div className="p-2 border-b border-white/5 relative">
                            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
                            <input
                                type="text"
                                autoFocus
                                placeholder="Search..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-md py-1.5 pl-8 pr-3 text-white placeholder-white/30 focus:outline-none focus:border-titan-purple/50 text-sm"
                                onClick={(e) => e.stopPropagation()} // Prevent closing when typing
                            />
                        </div>

                        {/* Options List */}
                        <div className="max-h-60 overflow-y-auto custom-scrollbar p-1">
                            {filteredOptions.length > 0 ? (
                                filteredOptions.map((opt) => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => {
                                            onChange(opt.value);
                                            setIsOpen(false);
                                        }}
                                        className={`w-full text-left px-3 py-2 rounded-md text-sm flex items-center justify-between transition-colors ${value === opt.value ? 'bg-titan-purple/20 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'}`}
                                    >
                                        <span className="truncate pr-4">{opt.label}</span>
                                        {value === opt.value && <Check size={14} className="text-titan-cyan flex-shrink-0" />}
                                    </button>
                                ))
                            ) : (
                                <div className="px-3 py-4 text-center text-sm text-white/40">
                                    No results found
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <style dangerouslySetInnerHTML={{
                __html: `
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
            `}} />
        </div>
    );
}
