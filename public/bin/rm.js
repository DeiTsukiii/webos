export async function rmMain(data) {
    const { operands, flags, ctx, token, sudo } = data;

    if (operands.length === 0) {
        return 'rm: missing operand';
    }

    const results = [];

    await Promise.all(operands.map(async path => {
        const resolvedPath = ctx.resolvePath(path);

        try {
            const response = await fetch('/api/deletePath', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: resolvedPath, token, sudo, flags })
            });

            const data = await response.json();

            if (!data.success) throw new Error(data.message);

        } catch (error) {
            if (error.message === 'tokenError') window.location.href = '/login';
            results.push(error.message
                .replaceAll('NoSuchFileOrDirectory', `rm: cannot remove '${path}': No such file or directory`)
                .replaceAll('PermsDenied', `rm: cannot remove '${path}': Permission denied`)
                .replaceAll('IsDirectory', `rm: cannot remove '${path}': Is a directory`)
            );
        }
    }));

    return results.join('\n');
}