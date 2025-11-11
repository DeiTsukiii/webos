export async function mvMain(data) {
    const { ctx, operands, token, sudo } = data;

    if (operands.length < 1) return 'mv: missing file operand';
    else if (operands.length < 2) return `mv: missing destination file operand after '${operands[0]}'`;
    if (operands.length > 2) return 'mv: too many operands';

    const sourcePath = ctx.resolvePath(operands[0]);
    const destPath = ctx.resolvePath(operands[1]);

    try {
        const response = await fetch('/api/movePath', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sourcePath, destPath, token, sudo })
        });

        const data = await response.json();

        if (!data.success) throw new Error(data.message);

    } catch (error) {
        if (error.message === 'tokenError') window.location.href = '/login';
        return `mv: ${error.message
            .replaceAll('NoSuchFileOrDirectory', 'mv: No such file or directory')
            .replaceAll('PermsDenied', 'mv: Permission denied')
            .replaceAll('InvalidDestination', 'mv: Invalid destination')
        }`;
    }

    return '';
}