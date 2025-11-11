export async function clearMain(data) {
    document.getElementById('content').innerHTML = data.ctx.lineActive();

    return '';
}