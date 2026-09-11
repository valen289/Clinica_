document.addEventListener('DOMContentLoaded', function () {

    var formulario = document.querySelector('#form-login');
    if (!formulario) return;

    var mensaje = document.querySelector('#mensaje-login');

    formulario.addEventListener('submit', async function (e) {
        e.preventDefault();
        mensaje.textContent = '';

        var datos = new FormData();
        datos.append('usuario', formulario.usuario.value);
        datos.append('contrasenia', formulario.contrasenia.value);

        try {
            var respuesta = await fetch('login.php', {
                method: 'POST',
                body: datos
            });
            var resultado = await respuesta.json();

            if (resultado.exito) {
                window.location.href = 'modulos/recursos/ambulancias.php';
            } else {
                mensaje.textContent = resultado.error;
            }
        } catch (error) {
            mensaje.textContent = 'No se pudo conectar con el servidor.';
        }
    });

});
