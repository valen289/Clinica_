document.addEventListener('DOMContentLoaded', async function () {

    const sesion = await SIGSM.protegerPagina('documentacion', ['Administrador', 'Recepción', 'Médico'], 'traslados.html');
    if (!sesion) return;

    const formulario = document.querySelector('#form-documento');
    const mensaje = document.querySelector('#mensaje-form');
    const contenedorLista = document.querySelector('#lista-documentos');
    const listaInstrucciones = document.querySelector('#lista-instrucciones');
    const listaAlarmas = document.querySelector('#lista-alarmas');
    const MINIMO_INSTRUCCIONES = 2;
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
                '<button type="button" class="boton boton-escanear" data-accion="escanear" data-id="' + doc.id_documento + '">Simular escaneo</button>' +
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

    // cada campo dinamico es un input con name "instrucciones[]" o "alarmas[]" (PHP los recibe como array)
    function crearCampo(nombre, placeholder, valor) {
        const fila = document.createElement('div');
        fila.className = 'campo-dinamico';

        const input = document.createElement('input');
        input.type = 'text';
        input.name = nombre + '[]';
        input.placeholder = placeholder;
        input.value = valor || '';

        const quitar = document.createElement('button');
        quitar.type = 'button';
        quitar.className = 'boton-quitar-campo';
        quitar.dataset.quitar = nombre;
        quitar.title = 'Quitar';
        quitar.textContent = '×';

        fila.appendChild(input);
        fila.appendChild(quitar);
        return fila;
    }

    function agregarInstruccion(valor) {
        const numero = listaInstrucciones.children.length + 1;
        listaInstrucciones.appendChild(crearCampo('instrucciones', 'Instrucción ' + numero, valor));
        actualizarBotonesQuitar();
    }

    function agregarAlarma(valor) {
        listaAlarmas.appendChild(crearCampo('alarmas', 'Pauta de alarma crítica', valor));
    }

    // las instrucciones minimas no se pueden quitar
    function actualizarBotonesQuitar() {
        const puedeQuitar = listaInstrucciones.children.length > MINIMO_INSTRUCCIONES;
        listaInstrucciones.querySelectorAll('.boton-quitar-campo').forEach(function (boton) {
            boton.hidden = !puedeQuitar;
        });
        Array.from(listaInstrucciones.children).forEach(function (fila, i) {
            fila.querySelector('input').placeholder = 'Instrucción ' + (i + 1);
        });
    }

    function cargarCamposDinamicos(instrucciones, alarmas) {
        listaInstrucciones.innerHTML = '';
        listaAlarmas.innerHTML = '';
        const cantidad = Math.max(MINIMO_INSTRUCCIONES, instrucciones.length);
        for (let i = 0; i < cantidad; i++) agregarInstruccion(instrucciones[i]);
        if (alarmas.length === 0) alarmas = [''];
        alarmas.forEach(agregarAlarma);
    }

    document.querySelector('#agregar-instruccion').addEventListener('click', function () { agregarInstruccion(''); });
    document.querySelector('#agregar-alarma').addEventListener('click', function () { agregarAlarma(''); });

    formulario.addEventListener('click', function (e) {
        const boton = e.target.closest('[data-quitar]');
        if (!boton) return;
        boton.parentElement.remove();
        if (boton.dataset.quitar === 'instrucciones') actualizarBotonesQuitar();
    });

    function activarModoEdicion(doc) {
        document.querySelector('#id_documento_editar').value = doc.id_documento;
        document.querySelector('#titulo').value = doc.titulo;
        document.querySelector('#descripcion').value = doc.descripcion;
        document.querySelector('#departamento').value = doc.departamento;

        const normales = doc.instrucciones.filter(function (i) { return !Number(i.es_pauta_alarma); });
        const alarmas = doc.instrucciones.filter(function (i) { return Number(i.es_pauta_alarma); });
        cargarCamposDinamicos(normales.map(function (i) { return i.texto_instruccion; }), alarmas.map(function (i) { return i.texto_instruccion; }));

        document.querySelector('#label-archivo').textContent = 'Archivo PDF (opcional) — dejar vacío para mantener el actual:';
        document.querySelector('#titulo-formulario').textContent = 'Editar folleto de pautas médicas';
        document.querySelector('#boton-formulario').textContent = 'Guardar cambios';
        document.querySelector('#codigo_qr').value = doc.codigo || '';
        abrirModal();
    }

    function abrirModal() {
        seccionFormulario.hidden = false;
        document.body.classList.add('modal-abierto');
    }

    function cerrarModal() {
        seccionFormulario.hidden = true;
        document.body.classList.remove('modal-abierto');
    }

    function volverAModoAlta() {
        formulario.reset();
        document.querySelector('#id_documento_editar').value = '';

        cargarCamposDinamicos([], []);
        document.querySelector('#label-archivo').textContent = 'Archivo PDF (opcional):';
        document.querySelector('#titulo-formulario').textContent = 'Crear nuevo folleto de pautas médicas';
        document.querySelector('#boton-formulario').textContent = 'Guardar en servidor';
        mensaje.textContent = '';
        document.querySelector('#codigo_qr').value = '';
        cerrarModal();
    }

    document.querySelector('#boton-agregar-folleto').addEventListener('click', function () {
        volverAModoAlta();
        abrirModal();
        document.querySelector('#titulo').focus();
    });

    // cerrar tocando el fondo oscuro o con Escape
    seccionFormulario.addEventListener('click', function (e) {
        if (e.target === seccionFormulario) volverAModoAlta();
    });
    document.addEventListener('keydown', function (e) {
        if (e.key !== 'Escape') return;
        if (!seccionFormulario.hidden) volverAModoAlta();
        if (!modalEscaneo.hidden) cerrarEscaneo();
    });

    // ---- modal "Simular escaneo": QR real generado en el navegador con la URL guardada ----
    const modalEscaneo = document.querySelector('#modal-escaneo');
    const contenedorQr = document.querySelector('#escaneo-qr');

    function abrirEscaneo(doc) {
        const url = doc.url || new URL('documento-publico.html?id=' + doc.id_documento, window.location.href).href;

        contenedorQr.innerHTML = '';
        if (window.QRCode) {
            new QRCode(contenedorQr, { text: url, width: 220, height: 220, correctLevel: QRCode.CorrectLevel.M });
        } else {
            contenedorQr.textContent = 'No se pudo cargar el generador de QR (revisá la conexión).';
        }

        document.querySelector('#escaneo-titulo').textContent = doc.titulo;
        document.querySelector('#escaneo-codigo').textContent = doc.codigo || '';
        document.querySelector('#escaneo-abrir').href = 'documento-publico.html?id=' + doc.id_documento;
        modalEscaneo.hidden = false;
        document.body.classList.add('modal-abierto');
    }

    function cerrarEscaneo() {
        modalEscaneo.hidden = true;
        document.body.classList.remove('modal-abierto');
    }

    document.querySelector('#escaneo-cerrar').addEventListener('click', cerrarEscaneo);
    modalEscaneo.addEventListener('click', function (e) {
        if (e.target === modalEscaneo) cerrarEscaneo();
    });

    document.querySelector('#escaneo-descargar').addEventListener('click', function () {
        const canvas = contenedorQr.querySelector('canvas');
        if (!canvas) return;
        const enlace = document.createElement('a');
        enlace.href = canvas.toDataURL('image/png');
        enlace.download = (document.querySelector('#escaneo-codigo').textContent || 'qr') + '.png';
        enlace.click();
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

        if (enlace.dataset.accion === 'escanear') {
            const doc = listaDocumentos.find(function (d) { return String(d.id_documento) === id; });
            if (doc) abrirEscaneo(doc);
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

        const llenas = Array.from(listaInstrucciones.querySelectorAll('input')).filter(function (i) { return i.value.trim() !== ''; });
        if (llenas.length < MINIMO_INSTRUCCIONES) {
            mensaje.textContent = 'Ingresá al menos ' + MINIMO_INSTRUCCIONES + ' indicaciones clínicas.';
            return;
        }

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

    cargarCamposDinamicos([], []);
    cargarListado();

});
