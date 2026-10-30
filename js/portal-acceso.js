// Ingreso y activación del portal del paciente (portal-ingreso.html y portal-activar.html).
// Cada página tiene uno de los dos formularios; este archivo maneja el que encuentre.
document.addEventListener('DOMContentLoaded', async function () {

    const formIngreso = document.querySelector('#form-portal-ingreso');
    const formActivar = document.querySelector('#form-portal-activar');
    const formulario = formIngreso || formActivar;
    if (!formulario) return;

    const mensaje = document.querySelector('#mensaje-acceso');
    const boton = formulario.querySelector('button[type="submit"]');
    const campoCi = formulario.ci;

    // si ya entró, no tiene sentido mostrarle el formulario
    try {
        const respuesta = await fetch('../php/portal-sesion.php');
        const sesion = await respuesta.json();
        if (sesion.autenticado) {
            window.location.href = 'portal.html';
            return;
        }
    } catch (error) { /* sin servidor: el formulario igual queda disponible */ }

    // la cédula se acepta como la escriban y se muestra con puntos y guion
    campoCi.addEventListener('blur', function () {
        if (SIGSM.cedulaValida(campoCi.value)) campoCi.value = SIGSM.formatearCedula(campoCi.value);
    });

    // el código se escribe en mayúsculas y con el guion en el medio, como en la hoja impresa
    if (formActivar) {
        const campoCodigo = formActivar.codigo;
        campoCodigo.addEventListener('input', function () {
            const limpio = campoCodigo.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
            campoCodigo.value = limpio.length > 4 ? limpio.slice(0, 4) + '-' + limpio.slice(4) : limpio;
        });
    }

    function validar() {
        if (!SIGSM.cedulaValida(campoCi.value)) return 'Revisá la cédula: el número no es válido.';
        if (formIngreso) {
            if (!formIngreso.contrasenia.value) return 'Ingresá tu contraseña.';
            return '';
        }
        if (formActivar.codigo.value.replace(/[^A-Za-z0-9]/g, '').length !== 8) return 'El código de activación tiene 8 letras y números.';
        if (formActivar.contrasenia.value.length < 8) return 'La contraseña tiene que tener al menos 8 caracteres.';
        if (formActivar.contrasenia.value !== formActivar.confirmacion.value) return 'Las dos contraseñas no coinciden.';
        return '';
    }

    formulario.addEventListener('submit', async function (e) {
        e.preventDefault();
        mensaje.textContent = validar();
        if (mensaje.textContent) return;

        const textoBoton = boton.textContent;
        boton.disabled = true;
        boton.textContent = formIngreso ? 'Ingresando...' : 'Activando...';

        try {
            const destino = formIngreso ? '../php/portal-login.php' : '../php/portal-activar.php';
            const respuesta = await fetch(destino, { method: 'POST', body: new FormData(formulario) });
            const resultado = await respuesta.json();

            if (resultado.exito) {
                window.location.href = formIngreso ? 'portal.html' : 'portal.html?bienvenida=1';
                return;
            }
            mensaje.textContent = resultado.error;
        } catch (error) {
            mensaje.textContent = 'No se pudo conectar con el servidor. Probá de nuevo en un rato.';
        }

        boton.disabled = false;
        boton.textContent = textoBoton;
    });

});
