document.addEventListener('DOMContentLoaded', function () {

    const formulario = document.querySelector('#form-registro');
    if (!formulario) return;

    const mensaje = document.querySelector('#mensaje-registro');

    formulario.addEventListener('submit', async function (e) {
        e.preventDefault();
        mensaje.textContent = '';

        const datos = new FormData(formulario);

        try {
            const respuesta = await fetch('../php/auth-registro.php', {
                method: 'POST',
                body: datos
            });
            const resultado = await respuesta.json();

            if (resultado.exito) {
                alert('Registro exitoso. Ya podés iniciar sesión.');
                window.location.href = 'index.html';
            } else {
                mensaje.textContent = resultado.error;
            }
        } catch (error) {
            mensaje.textContent = 'No se pudo conectar con el servidor.';
        }
    });

});
