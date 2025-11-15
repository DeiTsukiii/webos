export async function clearMain(data) {
    document.getElementById('content').innerHTML = `<span class="line active" id="line-wait"><span class="input"><span class="cursor"></span></span></span>`;

    return '';
}