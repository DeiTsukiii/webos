export async function passwdMain(data) {
    const { ctx, token } = data;

    try {
        const oldPassword = await ctx.input('Current password', true);

        const newPassword = await ctx.input('New password', true);
        if (newPassword.length === 0) {
            return 'passwd: New password is empty';
        }

        const retypePassword = await ctx.input('Retype new password', true);

        if (newPassword !== retypePassword) {
            return 'passwd: Passwords do not match';
        }

        const response = await fetch('/api/passwd', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, oldPassword, newPassword })
        });

        const data = await response.json();

        return data.message;

    } catch (error) {
        return `passwd: ${error.message}`;
    }
}