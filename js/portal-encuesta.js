// El paciente responde una encuesta desde el portal (portal-encuesta.html?id=1).
// Puede responder cada encuesta una sola vez; las preguntas de texto libre son opcionales.
document.addEventListener('DOMContentLoaded', async function () {

    const contenido = document.querySelector('#contenido-encuesta');
    const aviso = document.querySelector('#aviso-encuesta');
    const idEncuesta = new URLSearchParams(window.location.search).get('id');
    const ETIQUETAS_ESCALA = { 1: 'Muy mala', 2: 'Mala', 3: 'Regular', 4: 'Buena', 5: 'Excelente' };

    document.querySelector('#enlace-volver').innerHTML = SIGSM.icono('volver', 16) + ' Mis documentos';

    function irAlIngreso() {
        window.location.href = 'portal-ingreso.html';
    }

    function mostrarAviso(texto, esError) {
        aviso.textContent = texto;
        aviso.classList.toggle('aviso-error', !!esError);
        aviso.hidden = !texto;
    }

    // cada opción es un radio: se puede responder con el teclado y funciona sin mouse
    function campoPregunta(p, numero) {
        const nombre = 'respuestas[' + p.id_pregunta + ']';
        let control;

        if (p.tipo_pregunta === 'escala') {
            control = '<div class="opciones-escala">' + [1, 2, 3, 4, 5].map(function (valor) {
                return '<label class="opcion-escala">' +
                    '<input type="radio" name="' + nombre + '" value="' + valor + '" required>' +
                    '<span class="opcion-escala-numero">' + valor + '</span>' +
                    '<span class="opcion-escala-texto">' + ETIQUETAS_ESCALA[valor] + '</span>' +
                '</label>';
            }).join('') + '</div>';
        } else if (p.tipo_pregunta === 'si_no') {
            control = '<div class="opciones-si-no">' + ['Sí', 'No'].map(function (valor) {
                return '<label class="opcion-si-no"><input type="radio" name="' + nombre + '" value="' + valor + '" required><span>' + valor + '</span></label>';
            }).join('') + '</div>';
        } else {
            control = '<textarea name="' + nombre + '" maxlength="500" rows="3" placeholder="Escribí tu respuesta (opcional)"></textarea>';
        }

        return '<fieldset class="pregunta-encuesta">' +
            '<legend><span class="pregunta-numero">' + numero + '</span>' + SIGSM.escapar(p.texto_pregunta) + '</legend>' +
            control +
        '</fieldset>';
    }

    function mostrarFormulario(e) {
        document.title = e.titulo + ' - Portal del Paciente';
        contenido.innerHTML =
            '<form class="tarjeta tarjeta-formulario formulario-encuesta" id="form-encuesta" novalidate>' +
                '<h2>' + SIGSM.escapar(e.titulo) + '</h2>' +
                (e.descripcion ? '<p>' + SIGSM.escapar(e.descripcion) + '</p>' : '') +
                '<p class="nota-encuesta">En los reportes del hospital tus respuestas se muestran sin tu nombre.</p>' +
                e.preguntas.map(function (p, i) { return campoPregunta(p, i + 1); }).join('') +
                '<div id="mensaje-encuesta" class="mensaje-error" role="alert"></div>' +
                '<button type="submit" class="boton boton-primario" id="enviar-encuesta">Enviar respuestas</button>' +
            '</form>';

        const formulario = document.querySelector('#form-encuesta');
        // el aviso de "te falta responder" se va apenas elige algo
        formulario.addEventListener('change', function () {
            document.querySelector('#mensaje-encuesta').textContent = '';
        });
        formulario.addEventListener('submit', async function (ev) {
            ev.preventDefault();
            const mensaje = document.querySelector('#mensaje-encuesta');
            const boton = document.querySelector('#enviar-encuesta');

            // las de opciones son obligatorias: se avisa cuál falta y se lleva el foco ahí
            const sinResponder = e.preguntas.find(function (p) {
                return p.tipo_pregunta !== 'texto' && !formulario.querySelector('input[name="respuestas[' + p.id_pregunta + ']"]:checked');
            });
            if (sinResponder) {
                mensaje.textContent = 'Te falta responder: "' + sinResponder.texto_pregunta + '"';
                formulario.querySelector('input[name="respuestas[' + sinResponder.id_pregunta + ']"]').focus();
                return;
            }

            const datos = new FormData(formulario);
            datos.append('id_encuesta', e.id_encuesta);
            boton.disabled = true;
            boton.textContent = 'Enviando...';
            try {
                const respuesta = await fetch('../php/portal-encuesta-responder.php', { method: 'POST', body: datos });
                if (respuesta.status === 401) {
                    irAlIngreso();
                    return;
                }
                const resultado = await respuesta.json();
                if (resultado.exito) {
                    window.location.href = 'portal.html?encuesta=respondida';
                    return;
                }
                mensaje.textContent = resultado.error;
            } catch (error) {
                mensaje.textContent = 'No se pudo conectar con el servidor. Probá de nuevo en un rato.';
            }
            boton.disabled = false;
            boton.textContent = 'Enviar respuestas';
        });
    }

    async function cargar() {
        try {
            const respuesta = await fetch('../php/portal-encuesta-ver.php?id=' + encodeURIComponent(idEncuesta || ''));
            if (respuesta.status === 401) {
                irAlIngreso();
                return;
            }
            const resultado = await respuesta.json();
            const e = resultado.datos;

            if (!e) {
                contenido.innerHTML = '';
                mostrarAviso('No encontramos esta encuesta.', false);
            } else if (Number(e.ya_respondio)) {
                contenido.innerHTML = '';
                mostrarAviso('Ya respondiste esta encuesta. ¡Gracias por tu opinión!', false);
            } else if (!Number(e.disponible)) {
                contenido.innerHTML = '';
                mostrarAviso('Esta encuesta ya cerró.', false);
            } else {
                mostrarFormulario(e);
            }
        } catch (error) {
            contenido.innerHTML = '';
            mostrarAviso('No pudimos cargar la encuesta. Revisá tu conexión e intentá de nuevo.', true);
        }
    }

    document.querySelector('#cerrar-sesion').addEventListener('click', async function (ev) {
        ev.currentTarget.disabled = true;
        try {
            await fetch('../php/auth-logout.php', { method: 'POST' });
        } finally {
            irAlIngreso();
        }
    });

    cargar();

});
