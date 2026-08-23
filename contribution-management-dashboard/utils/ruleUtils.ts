export interface RuleSection {
    title?: string;
    items: string[];
}

export interface ParsedRulesResult {
    hasSections: boolean;
    totalCount: number;
    sections: RuleSection[];
}

/**
 * Checks whether a given line is a section header (Level 1).
 * Detects:
 * - Markdown headers: ### Heading, ## Heading
 * - Bold headings: **Heading:** or **Heading**
 * - Bracket headings: [Heading]
 * - Lines ending in a colon: "Song Rules:", "Costume Rules:" (not starting with bullet marker)
 * - Non-bullet lines followed by indented/bulleted children
 */
const isSectionHeader = (line: string, rawLine: string, nextRawLine?: string): boolean => {
    const trimmed = line.trim();
    if (!trimmed) return false;

    // Check if current line starts with bullet marker or numeric list marker
    const isBulletOrNumbered = /^[\s•\-\*\+]+/.test(rawLine) || /^\s*\d+[\.\)]\s+/.test(rawLine);

    // Markdown headers: ### Heading or ## Heading or # Heading
    if (/^#{1,4}\s+/.test(trimmed)) {
        return true;
    }

    // Bracketed headers: [Song Rules] or 【Song Rules】
    if (/^\[.+\]$/.test(trimmed) || /^【.+】$/.test(trimmed)) {
        return true;
    }

    // Bold headers: **Song Rules:** or **Song Rules**
    if (/^\*\*.+\*\*:?$/.test(trimmed) && trimmed.length > 4) {
        return true;
    }

    // Lines ending in colon: "Song Rules:", "Costume Rules:", "General Guidelines:"
    // Provided the line itself is not a bullet item and is a concise header (< 100 chars)
    if (!isBulletOrNumbered && trimmed.endsWith(':') && trimmed.length > 1 && trimmed.length < 100) {
        return true;
    }

    // Line without bullet marker where subsequent line is indented or has bullet marker
    if (!isBulletOrNumbered && nextRawLine && trimmed.length < 80 && !trimmed.endsWith('.')) {
        const nextTrimmed = nextRawLine.trim();
        const nextIsIndentedOrBullet = 
            (/^[\s•\-\*\+]+/.test(nextRawLine) && nextTrimmed.length > 0) ||
            /^\s{2,}/.test(nextRawLine) ||
            /^\s*\d+[\.\)]\s+/.test(nextRawLine);

        if (nextIsIndentedOrBullet) {
            return true;
        }
    }

    return false;
};

/**
 * Cleans header title by removing markdown hashes, asterisks, brackets, and trailing colons.
 */
const cleanHeaderTitle = (line: string): string => {
    return line
        .trim()
        .replace(/^#{1,4}\s+/, '')
        .replace(/^\*\*|\*\*$/g, '')
        .replace(/^\[|\]$/g, '')
        .replace(/^【|】$/g, '')
        .replace(/:$/, '')
        .trim();
};

/**
 * Cleans individual rule item by stripping leading bullet characters and numbers.
 */
const cleanRuleItem = (line: string): string => {
    return line
        .trim()
        .replace(/^[\s•\-\*\+]+/, '')
        .replace(/^\d+[\.\)]\s*/, '')
        .trim();
};

/**
 * Parses rules text supporting both:
 * 1. Flat 1-level lists (backward compatible for existing events)
 * 2. 2-level categorized grouped rules (Header -> Sub-rules)
 */
export const parseEventRules = (rulesText?: string | null): ParsedRulesResult => {
    if (!rulesText || !rulesText.trim()) {
        return { hasSections: false, totalCount: 0, sections: [] };
    }

    const lines = rulesText.split(/\r?\n/);
    const sections: RuleSection[] = [];
    let currentSection: RuleSection = { items: [] };

    for (let i = 0; i < lines.length; i++) {
        const rawLine = lines[i];
        const trimmed = rawLine.trim();
        if (!trimmed) continue;

        // Find next non-empty line
        let nextRawLine: string | undefined;
        for (let j = i + 1; j < lines.length; j++) {
            if (lines[j].trim().length > 0) {
                nextRawLine = lines[j];
                break;
            }
        }

        if (isSectionHeader(trimmed, rawLine, nextRawLine)) {
            // Commit previous section if it has content
            if (currentSection.items.length > 0 || (currentSection.title && currentSection.title.length > 0)) {
                sections.push(currentSection);
            }
            currentSection = {
                title: cleanHeaderTitle(trimmed),
                items: []
            };
        } else {
            const cleaned = cleanRuleItem(trimmed);
            if (cleaned.length > 0) {
                currentSection.items.push(cleaned);
            }
        }
    }

    // Commit final section
    if (currentSection.items.length > 0 || (currentSection.title && currentSection.title.length > 0)) {
        sections.push(currentSection);
    }

    const hasSections = sections.some(s => !!s.title && s.title.trim().length > 0);
    const totalCount = sections.reduce((acc, s) => acc + s.items.length, 0);

    return {
        hasSections,
        totalCount,
        sections
    };
};
