export async function touchMain(data) {
    const { ctx, operands, token, sudo } = data;
    const results = [];

    if (operands.length === 0) return 'touch: missing operand';

    await Promise.all(operands.map(async path => {
        const fullPath = ctx.resolvePath(path);

        try {
            const response = await fetch('/api/writePath', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: '-', path: fullPath, token, sudo })
            });

            const data = await response.json();
            if (!data.success) throw new Error(data.message);

        } catch (error) {
            if (error.message === 'tokenError') window.location.href = '/login';
            return ansiToHtml(error.message
                .replaceAll('NoSuchFileOrDirectory', `touch: cannot touch '${path}': No such file or directory`)
                .replaceAll('ParentNotADirectory', `touch: cannot touch '${path}': Not a directory`)
                .replaceAll('PermsDenied', `touch: cannot touch '${path}': Permission denied`)
            )
        }
    }));

    return results.join('\n');
}