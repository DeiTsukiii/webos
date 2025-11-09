export async function lsMain(data) {
    const { operands, token, ctx } = data;

    const output = [];
    let result = [];
    try {
        const response = await fetch(`/api/ls?path=${encodeURIComponent(operands && operands[0] ? operands[0] : ctx.currentPath)}&token=${encodeURIComponent(token)}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await response.json();
        if (!response.ok || !data.success) {
            throw new Error(data.message);
        }
        
        data.children.forEach(child => {
            const name = child.name;

            let color = '\e[97m';
            const exe = child.perms[8] === 'x' ||
                ctx.myUsername === child.creator && child.perms[5] === 'x' ||
                child.path.startsWith(`/home/${ctx.myUsername}/`) && child.perms[2] === 'x';
                
            if (child.type && child.type === 'd') color = '\e[94m';
            else if (child.type && child.type === '-' && exe) color = '\e[92m';

            result.push(`${color}${name}\e[0m`);
        });
    } catch (error) {
        result = [error.message];
    }

    return result.join('  ');
}