/**
 * Decode HTML entities in a string
 * @param str - Input string with HTML entities (e.g. &amp;)
 * @returns Decoded string (e.g. &)
 */
export function decodeHtml(str: string | undefined | null): string {
    if (!str) return '';

    return str
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#x27;/g, "'")
        .replace(/&#x2F;/g, '/')
        .replace(/&#x60;/g, '`');
}
