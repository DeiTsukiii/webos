export async function mkdirMain(data) {
    const { ctx, operands, token, sudo } = data;

    const results = [];

    if (operands.length === 0) return 'mkdir: missing operand';

    await Promise.all(operands.map(async dir => {
        const fullPath = ctx.resolvePath(dir);

        try {
            const response = await fetch('/api/writePath', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'd', path: fullPath, token, sudo })
            });

            const data = await response.json();
            if (!data.success) throw new Error(data.message);
        } catch (error) {
            if (error.message === 'tokenError') window.location.href = '/login';
            results.push(error.message
                .replaceAll('NoSuchFileOrDirectory', `mkdir: cannot create directory '${dir}': No such file or directory`)
                .replaceAll('ParentNotADirectory', `mkdir: cannot create directory '${dir}': Not a directory`)
                .replaceAll('PermsDenied', `mkdir: cannot create directory '${dir}': Permission denied`)
            );
        }
    }));

    return results.join('\n');
}