document.addEventListener('DOMContentLoaded', async function () {

    var sesion = await SIGSM.protegerPagina('recursos', ['Administrador', 'Recepción', 'Médico'], 'traslados.html');
    if (!sesion) return;

    var formulario = document.querySelector('#form-personal');
    var mensaje = document.querySelector('#mensaje-form');
    var tabla = document.querySelector('#tabla-personal');
    var listaPersonal = [];

    function renderFila(persona) {
        return '<tr>' +
            '<td><span class="texto-ci">' + SIGSM.escapar(persona.id_ci) + '</span></td>' +
            '<td>' + SIGSM.escapar(persona.nombre + ' ' + persona.apellido) + '</td>' +
            '<td>' + SIGSM.escapar(persona.rol) + '</td>' +
            '<td><span class="pill-estado ' + (persona.estado === 'Activo' ? 'pill-verde' : 'pill-naranja') + '">' + SIGSM.escapar(persona.estado) + '</span></td>' +
            '<td>' +
                '<a href="#" class="enlace-accion" data-accion="editar" data-id="' + persona.id_ci + '" data-tipo="' + persona.tipo + '">Editar</a>' +
                '<a href="#" class="enlace-accion confirmar-borrado enlace-icono" data-accion="borrar" data-id="' + persona.id_ci + '" data-tipo="' + persona.tipo + '" title="Borrar">' +
                    '<svg class="icono" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>' +
                '</a>' +
            '</td>' +
        '</tr>';
    }

    async function cargarListado() {
        var respuesta = await fetch('../php/recursos-personal.php');
        var resultado = await respuesta.json();
        if (!resultado.exito) return;

        listaPersonal = resultado.datos;
        tabla.innerHTML = listaPersonal.map(renderFila).join('');
        document.querySelector('#total-personal').textContent = listaPersonal.length;
    }

    function activarModoEdicion(persona) {
        document.querySelector('#id_ci_editar').value = persona.id_ci;
        document.querySelector('#tipo_editar').value = persona.tipo;

        var campoCi = document.querySelector('#id_ci');
        campoCi.value = persona.id_ci;
        campoCi.readOnly = true;

        document.querySelector('#nombre').value = persona.nombre;
        document.querySelector('#apellido').value = persona.apellido;
        // la tabla muestra "Conductor" genérico para los conductores, pero el <select> necesita el texto exacto de la opción
        document.querySelector('#rol').value = (persona.tipo === 'conductor') ? 'Conductor Profesional' : persona.rol;
        document.querySelector('#estado').value = persona.estado;

        document.querySelector('#icono-formulario').innerHTML = SIGSM.TRAZOS_ICONO.pencil;
        document.querySelector('#titulo-formulario').textContent = 'Editar Personal Operativo';
        document.querySelector('#boton-formulario').textContent = 'Actualizar Personal';
    }

    function volverAModoAlta() {
        formulario.reset();
        document.querySelector('#id_ci_editar').value = '';
        document.querySelector('#tipo_editar').value = '';
        document.querySelector('#id_ci').readOnly = false;

        document.querySelector('#icono-formulario').innerHTML = SIGSM.TRAZOS_ICONO.plus;
        document.querySelector('#titulo-formulario').textContent = 'Registrar Personal Operativo';
        document.querySelector('#boton-formulario').textContent = 'Guardar Personal';
    }

    tabla.addEventListener('click', async function (e) {
        var enlace = e.target.closest('[data-accion]');
        if (!enlace) return;
        e.preventDefault();

        var id = enlace.dataset.id;
        var tipo = enlace.dataset.tipo;

        if (enlace.dataset.accion === 'editar') {
            var persona = listaPersonal.find(function (p) { return String(p.id_ci) === id && p.tipo === tipo; });
            if (persona) activarModoEdicion(persona);
            return;
        }

        if (enlace.dataset.accion === 'borrar') {
            var confirmado = confirm('¿Seguro que querés eliminar este registro? Esta acción no se puede deshacer.');
            if (!confirmado) return;

            var datos = new FormData();
            datos.append('eliminar_personal', '1');
            datos.append('id_ci', id);
            datos.append('tipo', tipo);

            await fetch('../php/recursos-personal.php', { method: 'POST', body: datos });
            await Promise.all([cargarListado(), SIGSM.cargarResumenRecursos()]);
        }
    });

    formulario.addEventListener('submit', async function (e) {
        e.preventDefault();
        mensaje.textContent = '';

        var datos = new FormData(formulario);
        datos.append('guardar_personal', '1');

        try {
            var respuesta = await fetch('../php/recursos-personal.php', {
                method: 'POST',
                body: datos
            });
            var resultado = await respuesta.json();

            if (resultado.exito) {
                volverAModoAlta();
                await Promise.all([cargarListado(), SIGSM.cargarResumenRecursos()]);
            } else {
                mensaje.textContent = resultado.error;
            }
        } catch (error) {
            mensaje.textContent = 'No se pudo conectar con el servidor.';
        }
    });

    SIGSM.cargarResumenRecursos();
    cargarListado();

});
