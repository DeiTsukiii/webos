export async function lsMain(data) {
    const { flags, operands, token, ctx, sudo, stdin } = data;

    const output = [];

    const long = flags.includes('l') || flags.includes('long');

    const paths = operands.length ? operands : [ctx.currentPath];

    if (stdin) paths.push(stdin.trim());

    await Promise.all(paths.map(async path => {
        let result = [];

        try {
            const response = await fetch(`/api/ls?path=${encodeURIComponent(ctx.resolvePath(path))}&token=${encodeURIComponent(token)}&sudo=${encodeURIComponent(JSON.stringify(sudo))}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.message);
            }

            let maxOwner = 0;
            let maxCreator = 0;
            let maxSize = 0; 
            let maxDate = 0;

            const processedChildren = data.children.map(child => {
                
                const owner = (child.path.split('/')[1] === 'home' && child.path.split('/')[2]) ? child.path.split('/')[2] : 'root';
                const creator = child.creator;
                const size = 'taille';
                const date = new Date(child.last_update).toLocaleString();

                if (owner.length > maxOwner) maxOwner = owner.length;
                if (creator.length > maxCreator) maxCreator = creator.length;
                if (size.length > maxSize) maxSize = size.length;
                if (date.length > maxDate) maxDate = date.length;

                return { child, owner, creator, size, date };
            });

            processedChildren.forEach(({ child, owner, creator, size, date }) => {
                const name = child.name;

                let color = '\e[97m';
                const exe = child.perms[8] === 'x' ||
                    (ctx.myUsername === child.creator && child.perms[5] === 'x') ||
                    ((child.path + '/').startsWith(`/home/${ctx.myUsername}/`) && child.perms[2] === 'x');
                    
                if (child.type && child.type === 'd') color = '\e[94m';
                else if (child.type && child.type === '-' && exe) color = '\e[92m';

                const perms = `${child.type}${child.perms}.`;

                result.push(long ?
                    `${perms}  ${owner.padEnd(maxOwner)}  ${creator.padEnd(maxCreator)}  ${size.padEnd(maxSize)}  ${date.padEnd(maxDate)}  ${color}${name}\e[0m`:
                    `${color}${name}\e[0m`
                );
            });
        } catch (error) {
            if (error.message === 'tokenError') window.location.href = '/login';

            result = [error.message
                .replaceAll('NoSuchFileOrDirectory', `ls: cannot access '${path}': No such file or directory`)
                .replaceAll('PermsDenied', `ls: cannot open directory '${path}': Permission denied.`)];
        }

        output.push(paths.length > 1 ? `${path}:\n` : '' + (long ? result.join('\n') : result.join('  ')));
    }));

    return output.join('\n\n');
}