// Acceso al portal del paciente: ingreso (portal-ingreso.html), crear cuenta (portal-registro.html)
// y usar un código del hospital (portal-activar.html). Cada página tiene uno de los tres formularios;
// este archivo maneja el que encuentre.
document.addEventListener('DOMContentLoaded', async function () {

    const FORMULARIOS = {
        'form-portal-ingreso': { destino: '../php/portal-login.php', enviando: 'Ingresando...', siguiente: 'portal.html' },
        'form-portal-registro': { destino: '../php/portal-registro.php', enviando: 'Creando tu cuenta...', siguiente: 'portal.html?bienvenida=1' },
        'form-portal-activar': { destino: '../php/portal-activar.php', enviando: 'Guardando...', siguiente: 'portal.html?bienvenida=1' },
    };

    const formulario = document.querySelector('#form-portal-ingreso, #form-portal-registro, #form-portal-activar');
    if (!formulario) return;
    const config = FORMULARIOS[formulario.id];

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
    if (formulario.codigo) {
        formulario.codigo.addEventListener('input', function () {
            const limpio = formulario.codigo.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
            formulario.codigo.value = limpio.length > 4 ? limpio.slice(0, 4) + '-' + limpio.slice(4) : limpio;
        });
    }

    // el número de paciente son solo cifras
    if (formulario.numero_paciente) {
        formulario.numero_paciente.addEventListener('input', function () {
            formulario.numero_paciente.value = formulario.numero_paciente.value.replace(/\D/g, '').slice(0, 6);
        });
    }

    function validar() {
        if (!SIGSM.cedulaValida(campoCi.value)) return 'Revisá la cédula: el número no es válido.';
        if (formulario.id === 'form-portal-ingreso') {
            return formulario.contrasenia.value ? '' : 'Ingresá tu contraseña.';
        }
        if (formulario.numero_paciente && formulario.numero_paciente.value.length !== 6) return 'El número de paciente tiene 6 cifras.';
        if (formulario.codigo && formulario.codigo.value.replace(/[^A-Za-z0-9]/g, '').length !== 8) return 'El código tiene 8 letras y números.';
        if (formulario.contrasenia.value.length < 8) return 'La contraseña tiene que tener al menos 8 caracteres.';
        if (formulario.contrasenia.value !== formulario.confirmacion.value) return 'Las dos contraseñas no coinciden.';
        return '';
    }

    formulario.addEventListener('submit', async function (e) {
        e.preventDefault();
        mensaje.textContent = validar();
        if (mensaje.textContent) return;

        const textoBoton = boton.textContent;
        boton.disabled = true;
        boton.textContent = config.enviando;

        try {
            const respuesta = await fetch(config.destino, { method: 'POST', body: new FormData(formulario) });
            const resultado = await respuesta.json();

            if (resultado.exito) {
                window.location.href = config.siguiente;
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
