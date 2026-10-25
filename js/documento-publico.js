document.addEventListener('DOMContentLoaded', async function () {

    const contenedor = document.querySelector('#contenido-documento');
    const id = new URLSearchParams(window.location.search).get('id');

    const respuesta = await fetch('../php/documento-publico-ver.php?id=' + encodeURIComponent(id));
    const resultado = await respuesta.json();
    const documento = resultado.exito ? resultado.datos : null;

    if (!documento) {
        contenedor.innerHTML =
            '<section class="tarjeta">' +
                '<h3>Documento no encontrado</h3>' +
                '<p>El código QR escaneado no corresponde a ningún documento disponible.</p>' +
            '</section>';
        return;
    }
    function lista(items) {
        return '<ul class="lista-instrucciones">' + items.map(function (instr) {
            return '<li>' + SIGSM.escapar(instr.texto_instruccion) + '</li>';
        }).join('') + '</ul>';
    }

    const normales = documento.instrucciones.filter(function (i) { return !Number(i.es_pauta_alarma); });
    const alarmas = documento.instrucciones.filter(function (i) { return Number(i.es_pauta_alarma); });
    const seccionAlarmas = alarmas.length
        ? '<div class="bloque-alarma"><h4>Pautas de alarma: consultá de inmediato si presentás</h4>' + lista(alarmas) + '</div>'
        : '';

    const botonPdf = documento.archivo
        ? '<a href="../documentos/' + encodeURIComponent(documento.archivo.split('/').pop()) + '" target="_blank" class="boton boton-primario">Ver Documento Completo (PDF)</a>'
        : '';

    contenedor.innerHTML =
        '<section class="tarjeta">' +
            '<span class="badge">' + SIGSM.escapar(documento.departamento) + '</span>' +
            '<h3>' + SIGSM.escapar(documento.titulo) + '</h3>' +
            '<p>' + SIGSM.escapar(documento.descripcion) + '</p>' +
            '<p class="fecha-documento">Publicado el ' + SIGSM.escapar(documento.fecha_carga) + '</p>' +
            '<h4 class="titulo-indicaciones">Indicaciones</h4>' + lista(normales) +
            seccionAlarmas +
            botonPdf +
        '</section>';

});
