document.addEventListener('DOMContentLoaded', async function () {

    const formulario = document.querySelector('#form-login');
    if (!formulario) return;

    const mensaje = document.querySelector('#mensaje-login');
    const boton = formulario.querySelector('button[type="submit"]');

    // si ya hay una sesión abierta no tiene sentido volver a loguearse
    try {
        const sesion = await SIGSM.obtenerSesion();
        if (sesion.autenticado) {
            window.location.href = SIGSM.paginaInicial(sesion.rol);
            return;
        }
    } catch (error) { /* sin servidor: el formulario igual queda disponible */ }

    formulario.addEventListener('submit', async function (e) {
        e.preventDefault();
        mensaje.textContent = '';

        const datos = new FormData();
        datos.append('usuario', formulario.usuario.value);
        datos.append('contrasenia', formulario.contrasenia.value);

        const textoBoton = boton.textContent;
        boton.disabled = true;
        boton.textContent = 'Verificando...';

        try {
            const respuesta = await fetch('../php/auth-login.php', {
                method: 'POST',
                body: datos
            });
            const resultado = await respuesta.json();

            if (resultado.exito) {
                window.location.href = SIGSM.paginaInicial(resultado.rol);
                return;
            }
            mensaje.textContent = resultado.error;
        } catch (error) {
            mensaje.textContent = 'No se pudo conectar con el servidor.';
        }

        boton.disabled = false;
        boton.textContent = textoBoton;
    });

});
