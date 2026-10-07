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

    const itemsInstrucciones = documento.instrucciones.map(function (instr) {
        const clase = instr.es_pauta_alarma ? ' class="pauta-alarma"' : '';
        return '<li' + clase + '>' + SIGSM.escapar(instr.texto_instruccion) + '</li>';
    }).join('');

    const nombreArchivo = documento.archivo.split('/').pop();

    contenedor.innerHTML =
        '<section class="tarjeta">' +
            '<span class="badge">' + SIGSM.escapar(documento.departamento) + '</span>' +
            '<h3>' + SIGSM.escapar(documento.titulo) + '</h3>' +
            '<p>' + SIGSM.escapar(documento.descripcion) + '</p>' +
            '<p class="fecha-documento">Publicado el ' + SIGSM.escapar(documento.fecha_carga) + '</p>' +
            '<ul class="lista-instrucciones">' + itemsInstrucciones + '</ul>' +
            '<a href="../documentos/' + encodeURIComponent(nombreArchivo) + '" target="_blank" class="boton boton-primario">Ver Documento Completo (PDF)</a>' +
        '</section>';

});
