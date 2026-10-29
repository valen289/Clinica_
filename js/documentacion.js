document.addEventListener('DOMContentLoaded', async function () {

    const sesion = await SIGSM.protegerPagina('documentacion');
    if (!sesion) return;

    const formulario = document.querySelector('#form-documento');
    const mensaje = document.querySelector('#mensaje-form');
    const contenedorLista = document.querySelector('#lista-documentos');
    const listaInstrucciones = document.querySelector('#lista-instrucciones');
    const listaAlarmas = document.querySelector('#lista-alarmas');
    const MINIMO_INSTRUCCIONES = 2;
    const seccionFormulario = document.querySelector('#seccion-formulario');
    const avisoLista = document.querySelector('#aviso-lista');
    const barraFiltros = document.querySelector('#barra-filtros');
    const buscador = document.querySelector('#buscar-folleto');
    const filtroDepartamento = document.querySelector('#filtro-departamento');
    const filtroEstado = document.querySelector('#filtro-estado');
    const orden = document.querySelector('#orden-folletos');
    const limpiarFiltros = document.querySelector('#limpiar-filtros');
    const contadorResultados = document.querySelector('#contador-resultados');
    const resumen = document.querySelector('#resumen-folletos');
    const CLAVE_FILTROS = 'sigsm_documentacion_filtros';
    const COLORES_ACENTO = ['#2f6fed', '#7c3aed', '#0d9488', '#d97706', '#db2777', '#4f46e5'];
    let listaDocumentos = [];

    // utilidades compartidas (viven en shell.js)
    const icono = SIGSM.icono;
    const textoPlural = SIGSM.textoPlural;
    const formatearFecha = SIGSM.formatearFecha;
    const normalizar = SIGSM.normalizar;
    const mostrarToast = SIGSM.mostrarToast;

    // el filtro reutiliza los departamentos del formulario
    const departamentos = Array.from(document.querySelectorAll('#departamento option')).map(function (o) { return o.value; });
    departamentos.forEach(function (nombre) {
        filtroDepartamento.appendChild(new Option(nombre, nombre));
    });

    function esReciente(fecha) {
        const cargado = new Date(fecha + 'T00:00:00');
        return !isNaN(cargado) && (Date.now() - cargado.getTime()) < 7 * 24 * 60 * 60 * 1000;
    }

    function contarPautas(doc) {
        const normales = doc.instrucciones.filter(function (i) { return !Number(i.es_pauta_alarma); }).length;
        return { normales: normales, alarmas: doc.instrucciones.length - normales };
    }

    function colorAcento(doc) {
        const posicion = departamentos.indexOf(doc.departamento);
        return posicion === -1 ? '#9ca3af' : COLORES_ACENTO[posicion % COLORES_ACENTO.length];
    }

    function botonIcono(accion, id, nombreIcono, titulo, extra) {
        return '<button type="button" class="boton-icono ' + (extra || '') + '" title="' + titulo + '" aria-label="' + titulo + '" data-accion="' + accion + '" data-id="' + id + '">' + icono(nombreIcono) + '</button>';
    }

    function renderTarjeta(doc) {
        const conteo = contarPautas(doc);
        const incompleto = conteo.normales < MINIMO_INSTRUCCIONES;
        const titulo = SIGSM.escapar(doc.titulo);

        const departamento = doc.departamento
            ? '<span class="badge badge-departamento">' + SIGSM.escapar(doc.departamento) + '</span>'
            : '<span class="badge badge-departamento badge-sin-departamento">Sin departamento</span>';
        const etiquetas =
            (esReciente(doc.fecha_carga) ? '<span class="chip-nuevo">Nuevo</span>' : '') +
            (doc.archivo ? '<a class="chip-pdf" href="../documentos/' + encodeURIComponent(doc.archivo.split('/').pop()) + '" target="_blank" rel="noopener" title="Abrir el PDF adjunto">' + icono('documento', 12) + ' PDF</a>' : '') +
            (incompleto ? '<span class="chip-incompleto" title="Tiene menos de ' + MINIMO_INSTRUCCIONES + ' indicaciones">' + icono('incompleto', 12) + ' Incompleto</span>' : '');

        return '<section class="tarjeta tarjeta-folleto" style="--acento:' + colorAcento(doc) + '">' +
            '<div class="folleto-encabezado">' +
                departamento +
                '<span class="fecha-documento">' + SIGSM.escapar(formatearFecha(doc.fecha_carga)) + '</span>' +
            '</div>' +
            '<h3>' + titulo + '</h3>' +
            (etiquetas ? '<div class="folleto-etiquetas">' + etiquetas + '</div>' : '') +
            '<p class="folleto-descripcion">' + SIGSM.escapar(doc.descripcion) + '</p>' +
            '<dl class="folleto-conteos">' +
                '<dt>Instrucciones:</dt><dd>' + textoPlural(conteo.normales, 'pauta', 'pautas') + '</dd>' +
                '<dt class="' + (conteo.alarmas ? 'conteo-alarma' : 'conteo-cero') + '">Pautas de alarma:</dt><dd class="' + (conteo.alarmas ? 'conteo-alarma' : 'conteo-cero') + '">' + textoPlural(conteo.alarmas, 'crítica', 'críticas') + '</dd>' +
            '</dl>' +
            '<div class="folleto-acciones">' +
                '<button type="button" class="boton boton-escanear" data-accion="escanear" data-id="' + doc.id_documento + '">' + icono('qr', 16) + ' Ver QR</button>' +
                '<span class="folleto-iconos">' +
                    botonIcono('editar', doc.id_documento, 'lapiz', 'Editar documento') +
                    botonIcono('copiar', doc.id_documento, 'enlace', 'Copiar enlace del paciente') +
                    botonIcono('borrar', doc.id_documento, 'basura', 'Eliminar documento', 'boton-icono-peligro confirmar-borrado') +
                '</span>' +
            '</div>' +
        '</section>';
    }

    function renderResumen() {
        const total = listaDocumentos.length;
        const conPdf = listaDocumentos.filter(function (d) { return d.archivo; }).length;
        const alarmas = listaDocumentos.reduce(function (suma, d) { return suma + contarPautas(d).alarmas; }, 0);
        const incompletos = listaDocumentos.filter(function (d) { return contarPautas(d).normales < MINIMO_INSTRUCCIONES; }).length;

        function dato(nombreIcono, valor, texto, clase, filtro) {
            const etiqueta = filtro ? 'button' : 'div';
            return '<' + etiqueta + (filtro ? ' type="button" data-filtro-estado="' + filtro + '"' : '') + ' class="dato-resumen ' + clase + '">' +
                '<span class="dato-icono">' + icono(nombreIcono, 20) + '</span>' +
                '<span><strong>' + valor + '</strong><small>' + texto + '</small></span></' + etiqueta + '>';
        }

        resumen.innerHTML =
            dato('libro', total, 'Documentos cargados', '', '') +
            dato('documento', conPdf, 'Con PDF adjunto', 'dato-violeta', 'con-pdf') +
            dato('alarma', alarmas, 'Pautas de alarma', 'dato-rojo', '') +
            dato('incompleto', incompletos, 'Incompletos', 'dato-ambar', 'incompleto');
        resumen.hidden = total === 0;
    }

    function mostrarAviso(texto, esError) {
        avisoLista.textContent = texto;
        avisoLista.classList.toggle('aviso-error', !!esError);
        avisoLista.hidden = !texto;
    }

    function filtrarYOrdenar() {
        const termino = normalizar(buscador.value.trim());
        const departamento = filtroDepartamento.value;
        const estado = filtroEstado.value;

        const visibles = listaDocumentos.filter(function (doc) {
            if (departamento && doc.departamento !== departamento) return false;
            if (estado === 'con-pdf' && !doc.archivo) return false;
            if (estado === 'sin-pdf' && doc.archivo) return false;
            if (estado === 'incompleto' && contarPautas(doc).normales >= MINIMO_INSTRUCCIONES) return false;
            return !termino || normalizar(doc.titulo + ' ' + doc.descripcion).indexOf(termino) !== -1;
        });

        const comparadores = {
            recientes: function (a, b) { return b.id_documento - a.id_documento; },
            antiguos: function (a, b) { return a.id_documento - b.id_documento; },
            titulo: function (a, b) { return a.titulo.localeCompare(b.titulo, 'es'); },
            alarmas: function (a, b) { return contarPautas(b).alarmas - contarPautas(a).alarmas; },
        };
        return visibles.sort(comparadores[orden.value] || comparadores.recientes);
    }

    function hayFiltrosActivos() {
        return buscador.value.trim() !== '' || filtroDepartamento.value !== '' || filtroEstado.value !== '';
    }

    function pintarListado() {
        const visibles = filtrarYOrdenar();

        contenedorLista.innerHTML = visibles.map(renderTarjeta).join('');
        barraFiltros.hidden = listaDocumentos.length === 0;
        limpiarFiltros.hidden = !hayFiltrosActivos();
        contadorResultados.textContent = listaDocumentos.length ? 'Mostrando ' + visibles.length + ' de ' + listaDocumentos.length : '';
        resumen.querySelectorAll('[data-filtro-estado]').forEach(function (dato) {
            dato.classList.toggle('dato-activo', dato.dataset.filtroEstado === filtroEstado.value);
        });
        guardarFiltros();

        if (listaDocumentos.length === 0) {
            mostrarAviso('Todavía no hay documentos cargados. Usá "+ Agregar documento médico" para crear el primero.', false);
        } else if (visibles.length === 0) {
            mostrarAviso('Ningún documento coincide con los filtros aplicados.', false);
        } else {
            mostrarAviso('', false);
        }
    }

    // los filtros se recuerdan entre visitas (si el navegador no deja guardar, simplemente no se recuerdan)
    function guardarFiltros() {
        try {
            localStorage.setItem(CLAVE_FILTROS, JSON.stringify({
                buscar: buscador.value, departamento: filtroDepartamento.value, estado: filtroEstado.value, orden: orden.value,
            }));
        } catch (e) { /* sin almacenamiento */ }
    }

    function restaurarFiltros() {
        try {
            const guardado = JSON.parse(localStorage.getItem(CLAVE_FILTROS) || 'null');
            if (!guardado) return;
            buscador.value = guardado.buscar || '';
            filtroDepartamento.value = guardado.departamento || '';
            filtroEstado.value = guardado.estado || '';
            orden.value = guardado.orden || 'recientes';
        } catch (e) { /* sin almacenamiento */ }
    }

    function mostrarEsqueleto() {
        contenedorLista.innerHTML = '<div class="tarjeta esqueleto"></div>'.repeat(3);
        mostrarAviso('', false);
    }

    async function cargarListado() {
        try {
            const respuesta = await fetch('../php/documentacion-listar.php');
            const resultado = await respuesta.json();
            if (!resultado.exito) throw new Error(resultado.error || 'Error al listar');

            listaDocumentos = resultado.datos;
            renderResumen();
            pintarListado();
        } catch (error) {
            contenedorLista.innerHTML = '';
            resumen.hidden = true;
            mostrarAviso('No se pudieron cargar los documentos. Revisá la conexión e intentá de nuevo.', true);
        }
    }

    function exportarCsv() {
        const filas = filtrarYOrdenar();
        if (!filas.length) { mostrarToast('No hay documentos para exportar.', 'error'); return; }

        const celda = function (v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; };
        const lineas = [['Título', 'Descripción', 'Departamento', 'Fecha', 'Pautas', 'Pautas de alarma', 'Código QR', 'Tiene PDF'].map(celda).join(';')];
        filas.forEach(function (d) {
            const c = contarPautas(d);
            lineas.push([d.titulo, d.descripcion, d.departamento, formatearFecha(d.fecha_carga), c.normales, c.alarmas, d.codigo, d.archivo ? 'Sí' : 'No'].map(celda).join(';'));
        });

        const blob = new Blob(['﻿' + lineas.join('\r\n')], { type: 'text/csv;charset=utf-8' });
        const enlace = document.createElement('a');
        enlace.href = URL.createObjectURL(blob);
        enlace.download = 'documentos-medicos.csv';
        enlace.click();
        URL.revokeObjectURL(enlace.href);
        mostrarToast('Se exportaron ' + filas.length + ' documentos.');
    }

    async function copiarEnlace(doc) {
        const url = new URL('documento-publico.html?id=' + doc.id_documento, window.location.href).href;
        try {
            await navigator.clipboard.writeText(url);
            mostrarToast('Enlace copiado al portapapeles.');
        } catch (e) {
            window.prompt('Copiá el enlace del paciente:', url);
        }
    }

    buscador.addEventListener('input', pintarListado);
    filtroDepartamento.addEventListener('change', pintarListado);
    filtroEstado.addEventListener('change', pintarListado);
    orden.addEventListener('change', pintarListado);
    document.querySelector('#exportar-csv').addEventListener('click', exportarCsv);

    limpiarFiltros.addEventListener('click', function () {
        buscador.value = '';
        filtroDepartamento.value = '';
        filtroEstado.value = '';
        pintarListado();
        buscador.focus();
    });

    // los datos del resumen filtran el listado al tocarlos
    resumen.addEventListener('click', function (e) {
        const dato = e.target.closest('[data-filtro-estado]');
        if (!dato) return;
        filtroEstado.value = filtroEstado.value === dato.dataset.filtroEstado ? '' : dato.dataset.filtroEstado;
        pintarListado();
    });

    // atajos: "/" lleva al buscador, Escape lo vacía
    document.addEventListener('keydown', function (e) {
        const escribiendo = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
        if (e.key === '/' && !escribiendo) {
            e.preventDefault();
            buscador.focus();
        }
        if (e.key === 'Escape' && document.activeElement === buscador && buscador.value) {
            buscador.value = '';
            pintarListado();
        }
    });

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
        document.querySelector('#titulo-formulario').textContent = 'Editar documento de pautas médicas';
        document.querySelector('#boton-formulario').textContent = 'Guardar cambios';
        document.querySelector('#codigo_qr').value = doc.codigo || '';
        abrirModal();
    }

    // foto del formulario al abrirlo, para avisar si se intenta cerrar con cambios sin guardar
    let instantaneaFormulario = '';
    let avisoDescarte = false;

    function estadoFormulario() {
        return JSON.stringify(Array.from(new FormData(formulario)).map(function (par) {
            return [par[0], typeof par[1] === 'string' ? par[1] : par[1].name];
        }));
    }

    function abrirModal() {
        seccionFormulario.hidden = false;
        document.body.classList.add('modal-abierto');
        instantaneaFormulario = estadoFormulario();
        avisoDescarte = false;
    }

    // el primer intento de cerrar con cambios avisa; el segundo descarta
    function intentarCerrarFormulario() {
        if (!avisoDescarte && estadoFormulario() !== instantaneaFormulario) {
            avisoDescarte = true;
            mensaje.textContent = 'Hay cambios sin guardar. Volvé a tocar Cancelar (o fuera del cuadro) para descartarlos.';
            return;
        }
        volverAModoAlta();
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
        document.querySelector('#titulo-formulario').textContent = 'Crear nuevo documento de pautas médicas';
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
        if (e.target === seccionFormulario) intentarCerrarFormulario();
    });
    document.addEventListener('keydown', function (e) {
        if (e.key !== 'Escape') return;
        if (!seccionFormulario.hidden) intentarCerrarFormulario();
        if (!modalEscaneo.hidden) cerrarEscaneo();
        if (!modalBorrar.hidden) cerrarBorrado();
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

    document.querySelector('#boton-cancelar').addEventListener('click', intentarCerrarFormulario);

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

        if (enlace.dataset.accion === 'copiar') {
            const doc = listaDocumentos.find(function (d) { return String(d.id_documento) === id; });
            if (doc) copiarEnlace(doc);
            return;
        }

        if (enlace.dataset.accion === 'borrar') {
            const doc = listaDocumentos.find(function (d) { return String(d.id_documento) === id; });
            if (doc) abrirBorrado(doc);
        }
    });

    // ---- modal de confirmacion de borrado ----
    const modalBorrar = document.querySelector('#modal-borrar');
    const botonBorrar = document.querySelector('#borrar-confirmar');
    const errorBorrar = document.querySelector('#borrar-error');
    let idParaBorrar = null;

    function abrirBorrado(doc) {
        idParaBorrar = doc.id_documento;
        document.querySelector('#borrar-titulo').textContent = doc.titulo;
        errorBorrar.textContent = '';
        modalBorrar.hidden = false;
        document.body.classList.add('modal-abierto');
        document.querySelector('#borrar-cancelar').focus();
    }

    function cerrarBorrado() {
        modalBorrar.hidden = true;
        document.body.classList.remove('modal-abierto');
        idParaBorrar = null;
    }

    document.querySelector('#borrar-cancelar').addEventListener('click', cerrarBorrado);
    modalBorrar.addEventListener('click', function (e) {
        if (e.target === modalBorrar) cerrarBorrado();
    });

    botonBorrar.addEventListener('click', async function () {
        if (idParaBorrar === null) return;
        const datos = new FormData();
        datos.append('id_documento', idParaBorrar);

        botonBorrar.disabled = true;
        try {
            const respuesta = await fetch('../php/documentacion-eliminar.php', { method: 'POST', body: datos });
            const resultado = await respuesta.json();
            if (!resultado.exito) throw new Error(resultado.error || 'Error al eliminar');
            cerrarBorrado();
            await cargarListado();
            mostrarToast('Documento eliminado.');
        } catch (error) {
            errorBorrar.textContent = 'No se pudo eliminar el documento. Intentá de nuevo.';
        } finally {
            botonBorrar.disabled = false;
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
        const editando = datos.get('id_documento_editar') !== '';
        const botonGuardar = document.querySelector('#boton-formulario');
        const textoBoton = botonGuardar.textContent;
        botonGuardar.disabled = true;
        botonGuardar.textContent = 'Guardando...';

        try {
            const respuesta = await fetch('../php/documentacion-guardar.php', {
                method: 'POST',
                body: datos
            });
            const resultado = await respuesta.json();

            if (resultado.exito) {
                volverAModoAlta();
                await cargarListado();
                mostrarToast(editando ? 'Cambios guardados.' : 'Documento creado con su código QR.');
            } else {
                mensaje.textContent = resultado.error;
            }
        } catch (error) {
            mensaje.textContent = 'No se pudo conectar con el servidor.';
        } finally {
            botonGuardar.disabled = false;
            // si guardó bien, volverAModoAlta ya restauró el texto; si falló, el modal sigue abierto
            if (!seccionFormulario.hidden) botonGuardar.textContent = textoBoton;
        }
    });

    // enlaces que llegan desde Inicio: ?estado=incompleto filtra y ?nuevo=1 abre el alta.
    // Se sacan de la URL para que recargar la página no repita la acción.
    function aplicarParametrosUrl() {
        const parametros = new URLSearchParams(window.location.search);
        const estado = parametros.get('estado');
        if (estado && Array.from(filtroEstado.options).some(function (o) { return o.value === estado; })) {
            buscador.value = '';
            filtroDepartamento.value = '';
            filtroEstado.value = estado;
        }
        if (parametros.get('nuevo') === '1') {
            document.querySelector('#boton-agregar-folleto').click();
        }
        if (parametros.toString()) {
            history.replaceState(null, '', window.location.pathname);
        }
    }

    cargarCamposDinamicos([], []);
    restaurarFiltros();
    aplicarParametrosUrl();
    mostrarEsqueleto();
    cargarListado();

});
