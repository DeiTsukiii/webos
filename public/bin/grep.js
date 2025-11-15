function escapeRegExp(string, pattern, ignoreCase, showFilenames, filename) {
    const lines = string.split('\n');
    const finalOutput = [];
    
    for (const line of lines) {
        let lineToSearch = line;
        let patternToSearch = pattern;

        if (ignoreCase) {
            lineToSearch = line.toLowerCase();
            patternToSearch = pattern.toLowerCase();
        }

        if (lineToSearch.includes(patternToSearch)) {
            if (showFilenames) {
                finalOutput.push(`${filename}:${line}`);
            } else {
                finalOutput.push(line);
            }
        }
    }

    return finalOutput.join('\n');
}

export async function grepMain(data) {
    const { operands, flags, ctx, token, sudo, stdin } = data;

    if (operands.length < 1) return 'grep: missing pattern';
    if (operands.length < 2 && !stdin) return 'grep: missing file operand';

    const pattern = operands[0];
    const files = operands.slice(1);
    const showFilenames = files.length > 1;
    const ignoreCase = flags.includes('i') || flags.includes('ignore-case');

    const finalOutput = [];

    if (stdin) {
        finalOutput.push(escapeRegExp(stdin, pattern, ignoreCase, false, ''));
        return finalOutput.join('\n');
    }

    await Promise.all(files.map(async filename => {
        const path = ctx.resolvePath(filename);
        
        try {
            const response = await fetch(`/api/readPath?path=${encodeURIComponent(ctx.resolvePath(path))}&token=${encodeURIComponent(token)}&sudo=${encodeURIComponent(JSON.stringify(sudo))}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });

            const data = await response.json();

            if (!data.success) throw new Error(data.message);
            if (data.type === 'd') {
                finalOutput.push(`grep: '${filename}': Is a directory`);
                return;
            }
            
            const content = data.content || '';
            finalOutput.push(escapeRegExp(content, pattern, ignoreCase, showFilenames, filename));

        } catch (error) {
            if (error.message === 'tokenError') window.location.href = '/login';

            finalOutput.push(error.message
                .replaceAll('NoSuchFileOrDirectory', `grep: '${filename}': No such file or directory`)
                .replaceAll('PermsDenied', `grep: '${filename}': Permission denied`)
            );
        }
    }));

    return finalOutput.join('\n');
}