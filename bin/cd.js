export async function cdMain(data) {
    const { flags, operands, ctx } = data;

    if (operands.length === 0) {
        ctx.currentPath = `/home/${ctx.myUsername}`;
        return '';
    }

    const path = operands[0] ? operands[0] : `/home/${ctx.myUsername}`;

    const newPath = ctx.resolvePath(path);
    const response = await fetch(`/api/checkPath?path=${encodeURIComponent(newPath)}&token=${encodeURIComponent(data.token)}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
    });
    const result = await response.json();

    if (!response.ok || !result.type) return `bash: cd: ${path}: No such file or directory`;

    if (result.type !== 'd') return `bash: cd: ${path}: Not a directory`;


    ctx.currentPath = newPath;
    return '';
}