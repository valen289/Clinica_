document.addEventListener('DOMContentLoaded', function () {

    const formulario = document.querySelector('#form-login');
    if (!formulario) return;

    const mensaje = document.querySelector('#mensaje-login');

    formulario.addEventListener('submit', async function (e) {
        e.preventDefault();
        mensaje.textContent = '';

        const datos = new FormData();
        datos.append('usuario', formulario.usuario.value);
        datos.append('contrasenia', formulario.contrasenia.value);

        try {
            const respuesta = await fetch('../php/auth-login.php', {
                method: 'POST',
                body: datos
            });
            const resultado = await respuesta.json();

            if (resultado.exito) {
                window.location.href = 'recursos-ambulancias.html';
            } else {
                mensaje.textContent = resultado.error;
            }
        } catch (error) {
            mensaje.textContent = 'No se pudo conectar con el servidor.';
        }
    });

});
