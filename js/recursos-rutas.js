document.addEventListener('DOMContentLoaded', async function () {

    var sesion = await SIGSM.protegerPagina('recursos', ['Administrador', 'Recepción', 'Médico'], 'traslados.html');
    if (!sesion) return;

    var formulario = document.querySelector('#form-ruta');
    var mensaje = document.querySelector('#mensaje-form');
    var tabla = document.querySelector('#tabla-rutas');
    var listaRutas = [];

    function renderFila(ruta) {
        var distancia = (ruta.distancia !== null) ? SIGSM.escapar(ruta.distancia) + ' km' : '—';
        return '<tr>' +
            '<td>' + SIGSM.escapar(ruta.nombre_ruta) + '</td>' +
            '<td>' + SIGSM.escapar(ruta.origen + ' → ' + ruta.destino) + '</td>' +
            '<td>' + distancia + '</td>' +
            '<td>' + SIGSM.escapar(ruta.descripcion) + '</td>' +
            '<td>' +
                '<a href="#" class="enlace-accion" data-accion="editar" data-id="' + ruta.id_ruta + '">Editar</a>' +
                '<a href="#" class="enlace-accion confirmar-borrado enlace-icono" data-accion="borrar" data-id="' + ruta.id_ruta + '" title="Borrar">' +
                    '<svg class="icono" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>' +
                '</a>' +
            '</td>' +
        '</tr>';
    }

    async function cargarListado() {
        var respuesta = await fetch('../php/recursos-rutas.php');
        var resultado = await respuesta.json();
        if (!resultado.exito) return;

        listaRutas = resultado.datos;
        tabla.innerHTML = listaRutas.map(renderFila).join('');
        document.querySelector('#total-rutas').textContent = listaRutas.length;
    }

    function activarModoEdicion(ruta) {
        document.querySelector('#id_ruta_editar').value = ruta.id_ruta;
        document.querySelector('#nombre_ruta').value = ruta.nombre_ruta;
        document.querySelector('#origen').value = ruta.origen;
        document.querySelector('#destino').value = ruta.destino;
        document.querySelector('#distancia').value = ruta.distancia !== null ? ruta.distancia : '';
        document.querySelector('#descripcion').value = ruta.descripcion;

        document.querySelector('#icono-formulario').innerHTML = SIGSM.TRAZOS_ICONO.pencil;
        document.querySelector('#titulo-formulario').textContent = 'Editar Ruta';
        document.querySelector('#boton-formulario').textContent = 'Actualizar Ruta';
    }

    function volverAModoAlta() {
        formulario.reset();
        document.querySelector('#id_ruta_editar').value = '';

        document.querySelector('#icono-formulario').innerHTML = SIGSM.TRAZOS_ICONO.plus;
        document.querySelector('#titulo-formulario').textContent = 'Registrar Nueva Ruta';
        document.querySelector('#boton-formulario').textContent = 'Guardar Ruta';
    }

    tabla.addEventListener('click', async function (e) {
        var enlace = e.target.closest('[data-accion]');
        if (!enlace) return;
        e.preventDefault();

        var id = enlace.dataset.id;

        if (enlace.dataset.accion === 'editar') {
            var ruta = listaRutas.find(function (r) { return String(r.id_ruta) === id; });
            if (ruta) activarModoEdicion(ruta);
            return;
        }

        if (enlace.dataset.accion === 'borrar') {
            var confirmado = confirm('¿Seguro que querés eliminar este registro? Esta acción no se puede deshacer.');
            if (!confirmado) return;

            var datos = new FormData();
            datos.append('eliminar_ruta', '1');
            datos.append('id_ruta', id);

            await fetch('../php/recursos-rutas.php', { method: 'POST', body: datos });
            await Promise.all([cargarListado(), SIGSM.cargarResumenRecursos()]);
        }
    });

    formulario.addEventListener('submit', async function (e) {
        e.preventDefault();
        mensaje.textContent = '';

        var datos = new FormData(formulario);
        datos.append('guardar_ruta', '1');

        try {
            var respuesta = await fetch('../php/recursos-rutas.php', {
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
