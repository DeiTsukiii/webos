export async function cdMain(data) {
    const { flags, operands, ctx, stdin } = data;
    let newPath = ctx.currentPath;

    const path = operands[0] || stdin ? ctx.resolvePath(stdin ? stdin.trim() : operands[0]) : '';

    if (path === '') {
        ctx.currentPath = `/home/${ctx.myUsername}`;
        return '';
    }

    try {
        newPath = ctx.resolvePath(path);
        const response = await fetch(`/api/readPath?path=${encodeURIComponent(newPath)}&token=${encodeURIComponent(data.token)}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        const result = await response.json();

        if (!response.ok || !result.type) throw new Error(`bash: cd: ${path}: No such file or directory`);
        if (result.type !== 'd') throw new Error(`bash: cd: ${path}: Not a directory`);
    } catch (error) {
        if (error.message === 'tokenError') {
            window.location.href = '/login';
            return;
        }
        return error.message
    }

    ctx.currentPath = newPath;
    return '';
}