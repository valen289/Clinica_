document.addEventListener('DOMContentLoaded', async function () {

    var sesion = await SIGSM.protegerPagina('documentacion', ['Administrador', 'Recepción', 'Médico'], 'traslados.html');
    if (!sesion) return;

    var formulario = document.querySelector('#form-documento');
    var mensaje = document.querySelector('#mensaje-form');
    var contenedorLista = document.querySelector('#lista-documentos');
    var campoArchivo = document.querySelector('#archivo');
    var listaDocumentos = [];

    function nombreArchivo(rutaGuardada) {
        return rutaGuardada.split('/').pop();
    }

    function renderTarjeta(doc) {
        var itemsInstrucciones = doc.instrucciones.map(function (instr) {
            var clase = instr.es_pauta_alarma ? ' class="pauta-alarma"' : '';
            return '<li' + clase + '>' + SIGSM.escapar(instr.texto_instruccion) + '</li>';
        }).join('');

        return '<section class="tarjeta tarjeta-documento">' +
            '<span class="badge">' + SIGSM.escapar(doc.departamento) + '</span>' +
            '<h3>' + SIGSM.escapar(doc.titulo) + '</h3>' +
            '<p>' + SIGSM.escapar(doc.descripcion) + '</p>' +
            '<p class="fecha-documento">Cargado el ' + SIGSM.escapar(doc.fecha_carga) + '</p>' +
            '<ul class="lista-instrucciones">' + itemsInstrucciones + '</ul>' +
            '<a href="../documentos/' + encodeURIComponent(nombreArchivo(doc.archivo)) + '" target="_blank" class="boton boton-secundario">Ver Archivo</a>' +
            '<div class="acciones-tarjeta">' +
                '<a href="#" class="enlace-accion" data-accion="editar" data-id="' + doc.id_documento + '">Editar</a>' +
                '<a href="#" class="enlace-accion confirmar-borrado" data-accion="borrar" data-id="' + doc.id_documento + '">Borrar</a>' +
            '</div>' +
        '</section>';
    }

    async function cargarListado() {
        var respuesta = await fetch('../php/documentacion-listar.php');
        var resultado = await respuesta.json();
        if (!resultado.exito) return;

        listaDocumentos = resultado.datos;
        contenedorLista.innerHTML = listaDocumentos.map(renderTarjeta).join('');
    }

    function activarModoEdicion(doc) {
        document.querySelector('#id_documento_editar').value = doc.id_documento;
        document.querySelector('#titulo').value = doc.titulo;
        document.querySelector('#descripcion').value = doc.descripcion;
        document.querySelector('#departamento').value = doc.departamento;

        // separo las instrucciones ya cargadas: la marcada como pauta de alarma va aparte,
        // las primeras dos normales van a instruccion1/instruccion2
        var instruccion1 = '', instruccion2 = '', pautaAlarma = '', contadorNormales = 0;
        doc.instrucciones.forEach(function (instr) {
            if (instr.es_pauta_alarma) {
                pautaAlarma = instr.texto_instruccion;
            } else {
                contadorNormales++;
                if (contadorNormales === 1) instruccion1 = instr.texto_instruccion;
                else if (contadorNormales === 2) instruccion2 = instr.texto_instruccion;
            }
        });
        document.querySelector('#instruccion1').value = instruccion1;
        document.querySelector('#instruccion2').value = instruccion2;
        document.querySelector('#pauta_alarma').value = pautaAlarma;

        campoArchivo.required = false;
        document.querySelector('#label-archivo').textContent = 'Archivo (PDF) — dejar vacío para mantener el actual:';
        document.querySelector('#titulo-formulario').textContent = 'Editar Documento Médico';
        document.querySelector('#boton-formulario').textContent = 'Actualizar Documento';
    }

    function volverAModoAlta() {
        formulario.reset();
        document.querySelector('#id_documento_editar').value = '';

        campoArchivo.required = true;
        document.querySelector('#label-archivo').textContent = 'Archivo (PDF):';
        document.querySelector('#titulo-formulario').textContent = 'Agregar Documento Médico';
        document.querySelector('#boton-formulario').textContent = 'Agregar Documento Médico';
    }

    contenedorLista.addEventListener('click', async function (e) {
        var enlace = e.target.closest('[data-accion]');
        if (!enlace) return;
        e.preventDefault();

        var id = enlace.dataset.id;

        if (enlace.dataset.accion === 'editar') {
            var doc = listaDocumentos.find(function (d) { return String(d.id_documento) === id; });
            if (doc) activarModoEdicion(doc);
            return;
        }

        if (enlace.dataset.accion === 'borrar') {
            var confirmado = confirm('¿Seguro que querés eliminar este registro? Esta acción no se puede deshacer.');
            if (!confirmado) return;

            var datos = new FormData();
            datos.append('id_documento', id);

            await fetch('../php/documentacion-eliminar.php', { method: 'POST', body: datos });
            await cargarListado();
        }
    });

    formulario.addEventListener('submit', async function (e) {
        e.preventDefault();
        mensaje.textContent = '';

        var datos = new FormData(formulario);

        try {
            var respuesta = await fetch('../php/documentacion-guardar.php', {
                method: 'POST',
                body: datos
            });
            var resultado = await respuesta.json();

            if (resultado.exito) {
                volverAModoAlta();
                await cargarListado();
            } else {
                mensaje.textContent = resultado.error;
            }
        } catch (error) {
            mensaje.textContent = 'No se pudo conectar con el servidor.';
        }
    });

    cargarListado();

});
