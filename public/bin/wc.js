function getCounts(text) {
    const lines = (text.match(/\n/g) || []).length;
    
    const words = (text.match(/\S+/g) || []).length;
    
    const bytes = new TextEncoder().encode(text).length;
    
    return { lines, words, bytes };
}

function formatWcLine(counts, flags, filename = "") {
    const hasFlags = flags.includes('l') || flags.includes('w') || flags.includes('c');
    const showLines = flags.includes('l') || !hasFlags;
    const showWords = flags.includes('w') || !hasFlags;
    const showBytes = flags.includes('c') || !hasFlags;

    let output = "";
    if (showLines) output += String(counts.lines).padStart(8);
    if (showWords) output += String(counts.words).padStart(8);
    if (showBytes) output += String(counts.bytes).padStart(8);
    
    if (filename) output += " " + filename;
    
    return output.trim();
}


export async function wcMain(data) {
    const { operands, flags, ctx, token, sudo, stdin } = data;

    const result = [];
    let totals = { lines: 0, words: 0, bytes: 0 };
    let filesProcessed = 0;

    if (stdin) {
        const counts = getCounts(stdin);
        result.push(formatWcLine(counts, flags));
        return result.join('\n');
    }

    if (operands.length === 0) {
        result.push(formatWcLine({ lines: 0, words: 0, bytes: 0 }, flags));
        return result.join('\n');
    }

    await Promise.all(operands.map(async filename => {
        const path = ctx.resolvePath(filename);

        try {
            const response = await fetch(`/api/readPath?path=${encodeURIComponent(ctx.resolvePath(path))}&token=${encodeURIComponent(token)}&sudo=${encodeURIComponent(JSON.stringify(sudo))}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });

            const data = await response.json();

            if (data.exist === false) {
                result.push(`wc: ${filename}: ${data.message || 'No such file or directory'}`);
                return;
            }
            if (data.type === 'd') {
                result.push(`wc: ${filename}: Is a directory`);
                result.push(formatWcLine({ lines: 0, words: 0, bytes: 0 }, flags, filename));
                return;
            }
            
            const content = data.content || '';
            const counts = getCounts(content);
            
            result.push(formatWcLine(counts, flags, filename));
            
            totals.lines += counts.lines;
            totals.words += counts.words;
            totals.bytes += counts.bytes;
            filesProcessed++;

        } catch (error) {
            result.push(`wc: ${filename}: ${error.message}`);
        }
    }));
    
    if (filesProcessed > 1) {
        result.push(formatWcLine(totals, flags, "total"));
    }

    return result.join('\n');
}