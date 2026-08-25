import React from 'react';
import { parseEventRules, type ParsedRulesResult } from '../../utils/ruleUtils';
import { Tag, Sparkles } from 'lucide-react';

interface EventRulesRendererProps {
    rulesText?: string | null;
    variant?: 'modal' | 'page';
    emptyMessage?: string;
}

export const EventRulesRenderer: React.FC<EventRulesRendererProps> = ({
    rulesText,
    variant = 'page',
    emptyMessage = 'Standard community celebration guidelines apply. Please follow coordinator instructions on the event day.'
}) => {
    const parsedRules: ParsedRulesResult = parseEventRules(rulesText);
    const { hasSections, totalCount, sections } = parsedRules;

    if (totalCount === 0) {
        return (
            <div className={`p-4 bg-slate-50 rounded-2xl border border-slate-200 text-slate-500 italic text-center ${
                variant === 'modal' ? 'text-xs' : 'text-sm'
            }`}>
                {emptyMessage}
            </div>
        );
    }

    // CASE 1: 2-Level Categorized Rules (Grouped by Category)
    if (hasSections) {
        return (
            <div className="space-y-5">
                {sections.map((section, sIdx) => {
                    const hasTitle = Boolean(section.title && section.title.trim().length > 0);
                    
                    return (
                        <div 
                            key={sIdx} 
                            className="bg-white rounded-2xl border border-amber-200/80 shadow-2xs overflow-hidden"
                        >
                            {hasTitle && (
                                <div className="bg-gradient-to-r from-amber-100/70 via-orange-50/60 to-amber-50/40 px-4 py-2.5 border-b border-amber-200/60 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-lg bg-amber-500/15 text-amber-800 flex items-center justify-center font-bold text-xs">
                                            <Tag className="w-3.5 h-3.5 text-amber-700" />
                                        </div>
                                        <h4 className="font-bold text-slate-900 text-sm sm:text-base tracking-tight">
                                            {section.title}
                                        </h4>
                                    </div>
                                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-200/70 text-amber-900">
                                        {section.items.length} {section.items.length === 1 ? 'rule' : 'rules'}
                                    </span>
                                </div>
                            )}

                            <div className={`p-3.5 space-y-2.5 ${!hasTitle ? 'pt-3.5' : ''}`}>
                                {section.items.map((item, itemIdx) => (
                                    <div 
                                        key={itemIdx}
                                        className="flex items-start gap-3 p-2.5 rounded-xl bg-amber-50/30 hover:bg-amber-50/70 border border-amber-100 transition-colors"
                                    >
                                        <span className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                                            {itemIdx + 1}
                                        </span>
                                        <span className={`text-slate-800 font-medium leading-relaxed ${
                                            variant === 'modal' ? 'text-xs sm:text-sm' : 'text-sm sm:text-base'
                                        }`}>
                                            {item}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    }

    // CASE 2: Flat 1-Level Rules (Backward-Compatible for existing events)
    const flatItems = sections.flatMap(s => s.items);

    return (
        <div className="space-y-2.5">
            {flatItems.map((rule, idx) => (
                <div 
                    key={idx}
                    className={`flex items-start gap-3 p-3 bg-amber-50/50 hover:bg-amber-50 rounded-xl border border-amber-200/70 transition-colors text-slate-800 ${
                        variant === 'modal' ? 'text-xs sm:text-sm' : 'text-sm sm:text-base'
                    }`}
                >
                    <span className="w-5 h-5 bg-amber-500 text-white rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5">
                        {idx + 1}
                    </span>
                    <span className="leading-snug font-medium">{rule}</span>
                </div>
            ))}
        </div>
    );
};
