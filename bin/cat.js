export async function catMain(data) {
    const { operands, token, ctx } = data;

    const output = [];

    if (operands.length === 0) return 'cat: Missing operand';

    operands.reverse();
    await Promise.all(operands.map(async (path) => {
        try {
            const response = await fetch(`/api/checkPath?path=${encodeURIComponent(ctx.resolvePath(path))}&token=${encodeURIComponent(token)}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await response.json();
            if (!response.ok || !data.success) throw new Error(data.message);

            if (data.type !== '-') throw new Error(`cat: ${path}: Is a directory`);

            if (data.content && data.content.length > 0) output.push(data.content);

        } catch (error) {
            if (error.message === 'tokenError') window.location.href = '/login';

            output.push(error.message
                .replaceAll('NoSuchFileOrDirectory', `cat: ${path}: No such file or directory`)
                .replaceAll('PermsDenied', `cat: ${path}: Permission denied.`)
            );
        }
    }));

    return output.join('\n');
}