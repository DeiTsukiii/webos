function convertNumericMode(mode) {
    const parts = mode.split('').map(Number);
    if (parts.length !== 3 || parts.some(isNaN) || parts.some(n => n < 0 || n > 7)) {
        return null;
    }

    const map = ['---', '--x', '-w-', '-wx', 'r--', 'r-x', 'rw-', 'rwx'];
    
    return parts.map(digit => map[digit]).join('');
}

export async function chmodMain(data) {
    const { ctx, operands, token, sudo } = data;

    if (operands.length < 2) {
        return 'chmod: missing operand';
    }

    const targetPath = operands[0];
    let mode = operands[1];

    if (/^[0-7]{3}$/.test(mode)) {
        mode = convertNumericMode(mode);
        if (!mode) return `chmod: invalid mode: '${operands[1]}'`;
    } else if (!/^([r-][w-][x-]){3}$/.test(mode)) return `chmod: invalid mode: '${operands[1]}'`;

    const path = ctx.resolvePath(targetPath);

    try {
        const response = await fetch('/api/writePath', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path, token, sudo, perms: mode })
        });

        const data = await response.json();

        if (!data.success) throw new Error(data.message);

    } catch (error) {
        return error.message
            .replaceAll('NoSuchFileOrDirectory', `chmod: cannot access '${path}': No such file or directory`)
            .replaceAll('ParentNotADirectory', `chmod: cannot access '${path}': Not a directory`)
            .replaceAll('PermsDenied', `chmod: cannot change mode of '${path}': Permission denied`);
    }

    return '';
}