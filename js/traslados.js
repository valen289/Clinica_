document.addEventListener('DOMContentLoaded', async function () {

    var sesion = await SIGSM.protegerPagina('traslados', null);
    if (!sesion) return;

    var formulario = document.querySelector('#form-despacho');
    var mensaje = document.querySelector('#mensaje-form');
    var tabla = document.querySelector('#tabla-traslados');

    function llenarSelect(select, opciones, campoId, textoFn) {
        while (select.options.length > 1) select.remove(1); // deja solo el placeholder ("Seleccione...")
        opciones.forEach(function (opcion) {
            var elemento = document.createElement('option');
            elemento.value = opcion[campoId];
            elemento.textContent = textoFn(opcion);
            select.appendChild(elemento);
        });
    }

    function claseEstado(estado) {
        if (['En curso', 'Retornando'].indexOf(estado) !== -1) return 'pill-azul';
        if (['Llegado a destino', 'Finalizado'].indexOf(estado) !== -1) return 'pill-verde';
        return 'pill-naranja';
    }

    function renderFilaTraslado(t) {
        var esFinalizado = (t.estado === 'Finalizado');
        return '<tr>' +
            '<td>' + SIGSM.escapar(t.matricula) + '</td>' +
            '<td>' + SIGSM.escapar(t.conductor_nombre + ' ' + t.conductor_apellido) + '</td>' +
            '<td>' + SIGSM.escapar(t.origen + ' → ' + t.destino) + '</td>' +
            '<td>' + SIGSM.escapar(t.fecha) + '</td>' +
            '<td>' + SIGSM.escapar(t.hora_salida) + '</td>' +
            '<td><span class="pill-estado ' + claseEstado(t.estado) + '">' + SIGSM.escapar(t.estado) + '</span></td>' +
            '<td>' +
                (esFinalizado ? '' : '<button type="button" class="enlace-accion" data-accion="avanzar" data-id="' + t.id_traslado + '">Avanzar →</button>') +
            '</td>' +
        '</tr>';
    }

    async function cargarDatos() {
        var respuesta = await fetch('../php/traslados-listar.php');
        var resultado = await respuesta.json();
        if (!resultado.exito) return;

        var datos = resultado.datos;

        llenarSelect(document.querySelector('#id_ambulancia'), datos.ambulancias_disponibles, 'id_ambulancia', function (a) { return a.matricula; });
        llenarSelect(document.querySelector('#id_conductor'), datos.conductores_disponibles, 'id_ci', function (c) { return c.nombre + ' ' + c.apellido; });
        llenarSelect(document.querySelector('#id_acompanante'), datos.acompanantes, 'id_ci', function (a) { return a.nombre + ' ' + a.apellido; });
        llenarSelect(document.querySelector('#id_elemento'), datos.elementos, 'id_elemento', function (e) { return e.tipo; });
        llenarSelect(document.querySelector('#id_ruta'), datos.rutas, 'id_ruta', function (r) { return r.origen + ' → ' + r.destino; });

        tabla.innerHTML = datos.traslados.map(renderFilaTraslado).join('');
    }

    tabla.addEventListener('click', async function (e) {
        var boton = e.target.closest('[data-accion="avanzar"]');
        if (!boton) return;

        var datos = new FormData();
        datos.append('id_traslado', boton.dataset.id);

        await fetch('../php/traslados-avanzar.php', { method: 'POST', body: datos });
        await cargarDatos();
    });

    formulario.addEventListener('submit', async function (e) {
        e.preventDefault();
        mensaje.textContent = '';

        var datos = new FormData(formulario);

        try {
            var respuesta = await fetch('../php/traslados-despachar.php', {
                method: 'POST',
                body: datos
            });
            var resultado = await respuesta.json();

            if (resultado.exito) {
                formulario.reset();
                await cargarDatos();
            } else {
                mensaje.textContent = resultado.error;
            }
        } catch (error) {
            mensaje.textContent = 'No se pudo conectar con el servidor.';
        }
    });

    cargarDatos();

});
