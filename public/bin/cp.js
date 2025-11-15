export async function cpMain(data) {
    const { operands, flags, ctx, token, sudo } = data;

    if (operands.length < 1) return 'cp: missing source path operand';
    else if (operands.length < 2) return 'cp: missing destination path operand';

    const destOperand = operands[operands.length - 1];
    const sources = operands.slice(0, -1);
    
    const destPath = ctx.resolvePath(destOperand);

    const result = [];

    await Promise.all(sources.map(async source => {
        const sourcePath = ctx.resolvePath(source);

        try {
            const response = await fetch('/api/copyPath', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sourcePath: sourcePath,
                    destPath: destPath,
                    token: token,
                    sudo: sudo,
                    flags: flags
                })
            });

            const data = await response.json();

            if (!data.success) throw new Error(data.message);

        } catch (error) {
            if (error.message ===  'tokenError') window.location.href = '/login';
            result.push(error.message
                .replaceAll('NoSuchFileOrDirectory', `cp: cannot stat '${source}': No such file or directory`)
                .replaceAll('NoSuchFile', `cp: cannot stat '${source}': No such file or directory`)
                .replaceAll('IsADirectory', `cp: -r not specified; omitting directory '${source}'`)
                .replaceAll('PermsDenied', `cp: cannot stat '${source}': Permission denied`)
            );
        }
    }));

    return result.join('\n');
}