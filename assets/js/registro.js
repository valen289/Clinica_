document.addEventListener('DOMContentLoaded', function () {

    var formulario = document.querySelector('#form-registro');
    if (!formulario) return;

    var mensaje = document.querySelector('#mensaje-registro');

    formulario.addEventListener('submit', async function (e) {
        e.preventDefault();
        mensaje.textContent = '';

        var datos = new FormData(formulario);

        try {
            var respuesta = await fetch('registro.php', {
                method: 'POST',
                body: datos
            });
            var resultado = await respuesta.json();

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
