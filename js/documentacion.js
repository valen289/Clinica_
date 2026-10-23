document.addEventListener('DOMContentLoaded', async function () {

    const sesion = await SIGSM.protegerPagina('documentacion', ['Administrador', 'Recepción', 'Médico'], 'traslados.html');
    if (!sesion) return;

    const formulario = document.querySelector('#form-documento');
    const mensaje = document.querySelector('#mensaje-form');
    const contenedorLista = document.querySelector('#lista-documentos');
    const campoArchivo = document.querySelector('#archivo');
    const seccionFormulario = document.querySelector('#seccion-formulario');
    let listaDocumentos = [];

    function textoPlural(cantidad, singular, plural) {
        return cantidad + ' ' + (cantidad === 1 ? singular : plural);
    }

    function renderTarjeta(doc) {
        const cantidadPautas = doc.instrucciones.filter(function (i) { return !Number(i.es_pauta_alarma); }).length;
        const cantidadAlarmas = doc.instrucciones.length - cantidadPautas;

        return '<section class="tarjeta tarjeta-folleto">' +
            '<div class="folleto-encabezado">' +
                '<span class="badge badge-departamento">' + SIGSM.escapar(doc.departamento) + '</span>' +
                '<span class="fecha-documento">' + SIGSM.escapar(doc.fecha_carga) + '</span>' +
            '</div>' +
            '<h3>' + SIGSM.escapar(doc.titulo) + '</h3>' +
            '<p class="folleto-descripcion">' + SIGSM.escapar(doc.descripcion) + '</p>' +
            '<dl class="folleto-conteos">' +
                '<dt>Instrucciones:</dt><dd>' + textoPlural(cantidadPautas, 'pauta', 'pautas') + '</dd>' +
                '<dt class="conteo-alarma">Pautas de alarma:</dt><dd class="conteo-alarma">' + textoPlural(cantidadAlarmas, 'crítica', 'críticas') + '</dd>' +
            '</dl>' +
            '<div class="folleto-acciones">' +
                '<a href="documento-publico.html?id=' + doc.id_documento + '" target="_blank" class="boton boton-escanear">Simular escaneo</a>' +
                '<a href="#" class="enlace-accion" data-accion="editar" data-id="' + doc.id_documento + '">Editar</a>' +
                '<button type="button" class="boton-icono confirmar-borrado" title="Borrar folleto" data-accion="borrar" data-id="' + doc.id_documento + '">&#128465;</button>' +
            '</div>' +
        '</section>';
    }

    async function cargarListado() {
        const respuesta = await fetch('../php/documentacion-listar.php');
        const resultado = await respuesta.json();
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
        let instruccion1 = '', instruccion2 = '', pautaAlarma = '', contadorNormales = 0;
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
        seccionFormulario.hidden = false;
        seccionFormulario.scrollIntoView({ behavior: 'smooth' });
    }

    function volverAModoAlta() {
        formulario.reset();
        document.querySelector('#id_documento_editar').value = '';

        campoArchivo.required = true;
        document.querySelector('#label-archivo').textContent = 'Archivo (PDF):';
        document.querySelector('#titulo-formulario').textContent = 'Agregar Documento Médico';
        document.querySelector('#boton-formulario').textContent = 'Agregar Documento Médico';
        mensaje.textContent = '';
        seccionFormulario.hidden = true;
    }

    document.querySelector('#boton-agregar-folleto').addEventListener('click', function () {
        volverAModoAlta();
        seccionFormulario.hidden = false;
        seccionFormulario.scrollIntoView({ behavior: 'smooth' });
    });

    document.querySelector('#boton-cancelar').addEventListener('click', volverAModoAlta);

    contenedorLista.addEventListener('click', async function (e) {
        const enlace = e.target.closest('[data-accion]');
        if (!enlace) return;
        e.preventDefault();

        const id = enlace.dataset.id;

        if (enlace.dataset.accion === 'editar') {
            const doc = listaDocumentos.find(function (d) { return String(d.id_documento) === id; });
            if (doc) activarModoEdicion(doc);
            return;
        }

        if (enlace.dataset.accion === 'borrar') {
            const confirmado = confirm('¿Seguro que querés eliminar este registro? Esta acción no se puede deshacer.');
            if (!confirmado) return;

            const datos = new FormData();
            datos.append('id_documento', id);

            await fetch('../php/documentacion-eliminar.php', { method: 'POST', body: datos });
            await cargarListado();
        }
    });

    formulario.addEventListener('submit', async function (e) {
        e.preventDefault();
        mensaje.textContent = '';

        const datos = new FormData(formulario);

        try {
            const respuesta = await fetch('../php/documentacion-guardar.php', {
                method: 'POST',
                body: datos
            });
            const resultado = await respuesta.json();

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
