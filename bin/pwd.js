export async function pwdMain(data) {
    const { ctx } = data;

    return ctx.currentPath;
}