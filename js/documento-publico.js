// Vista pública de un documento de indicaciones: es lo que ve el paciente al escanear el QR.
// El documento se pide por el token de la URL (?t=...), nunca por el id.
document.addEventListener('DOMContentLoaded', function () {

    const contenedor = document.querySelector('#contenido-documento');
    const token = new URLSearchParams(window.location.search).get('t') || '';

    function lista(items, ordenada) {
        if (ordenada) {
            return '<ol class="lista-pasos">' + items.map(function (instr, i) {
                return '<li><span class="numero-paso-doc">' + (i + 1) + '</span><p>' + SIGSM.escapar(instr.texto_instruccion) + '</p></li>';
            }).join('') + '</ol>';
        }
        return '<ul class="lista-alarmas">' + items.map(function (instr) {
            return '<li>' + SIGSM.escapar(instr.texto_instruccion) + '</li>';
        }).join('') + '</ul>';
    }

    function mostrarNoEncontrado() {
        contenedor.innerHTML =
            '<section class="tarjeta doc-no-encontrado">' +
                '<span class="doc-no-encontrado-icono">' + SIGSM.icono('incompleto', 28) + '</span>' +
                '<h1>No encontramos este documento</h1>' +
                '<p>Puede que el código QR esté dañado o que el documento ya no esté disponible. Pedí uno nuevo en el hospital.</p>' +
                '<a href="portal-ingreso.html" class="boton boton-secundario">Ir al portal del paciente</a>' +
            '</section>';
    }

    function mostrarError() {
        contenedor.innerHTML =
            '<section class="tarjeta doc-no-encontrado">' +
                '<span class="doc-no-encontrado-icono">' + SIGSM.icono('alarma', 28) + '</span>' +
                '<h1>No pudimos cargar el documento</h1>' +
                '<p>Revisá tu conexión a internet y volvé a intentar.</p>' +
                '<button type="button" class="boton boton-primario" id="reintentar">Reintentar</button>' +
            '</section>';
        document.querySelector('#reintentar').addEventListener('click', cargar);
    }

    function mostrarDocumento(documento) {
        const normales = documento.instrucciones.filter(function (i) { return !Number(i.es_pauta_alarma); });
        const alarmas = documento.instrucciones.filter(function (i) { return Number(i.es_pauta_alarma); });

        const botonPdf = documento.archivo
            ? '<a href="../documentos/' + encodeURIComponent(documento.archivo.split('/').pop()) + '" target="_blank" rel="noopener" class="boton boton-primario">' + SIGSM.icono('documento', 16) + ' Ver documento completo (PDF)</a>'
            : '';

        const seccionIndicaciones = normales.length
            ? '<section class="tarjeta doc-publico-seccion">' +
                '<h2>Indicaciones</h2>' +
                lista(normales, true) +
              '</section>'
            : '';

        // las pautas de alarma van destacadas: es lo más importante que el paciente tiene que reconocer
        const seccionAlarmas = alarmas.length
            ? '<section class="bloque-alarma-publico" role="note">' +
                '<div class="alarma-titulo">' + SIGSM.icono('alarma', 22) + '<h2>Consultá de inmediato si tenés:</h2></div>' +
                lista(alarmas, false) +
                '<p class="alarma-emergencia">Ante una emergencia llamá al <strong>911</strong> o andá a la puerta de emergencia más cercana.</p>' +
              '</section>'
            : '';

        document.title = documento.titulo + ' - Hospital de Clínicas';

        contenedor.innerHTML =
            '<article class="tarjeta doc-publico">' +
                (documento.departamento ? '<span class="chip-departamento">' + SIGSM.escapar(documento.departamento) + '</span>' : '') +
                '<h1>' + SIGSM.escapar(documento.titulo) + '</h1>' +
                (documento.descripcion ? '<p class="doc-publico-descripcion">' + SIGSM.escapar(documento.descripcion) + '</p>' : '') +
                (documento.fecha_carga ? '<p class="doc-publico-fecha">Publicado el ' + SIGSM.formatearFecha(documento.fecha_carga) + '</p>' : '') +
                '<div class="doc-publico-acciones">' +
                    botonPdf +
                    '<button type="button" class="boton boton-secundario" id="imprimir-documento">Imprimir</button>' +
                '</div>' +
            '</article>' +
            seccionAlarmas +
            seccionIndicaciones;

        document.querySelector('#imprimir-documento').addEventListener('click', function () { window.print(); });
    }

    async function cargar() {
        // un token mal formado ni se consulta: es un QR roto o un enlace inventado
        if (!/^[a-f0-9]{32}$/i.test(token)) {
            mostrarNoEncontrado();
            return;
        }
        contenedor.innerHTML = '<div class="tarjeta esqueleto esqueleto-documento"></div>';
        try {
            const respuesta = await fetch('../php/documento-publico-ver.php?t=' + encodeURIComponent(token));
            const resultado = await respuesta.json();
            if (resultado.exito && resultado.datos) {
                mostrarDocumento(resultado.datos);
            } else {
                mostrarNoEncontrado();
            }
        } catch (error) {
            mostrarError();
        }
    }

    cargar();

});
