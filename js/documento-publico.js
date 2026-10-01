document.addEventListener('DOMContentLoaded', async function () {

    var contenedor = document.querySelector('#contenido-documento');
    var id = new URLSearchParams(window.location.search).get('id');

    var respuesta = await fetch('../php/documento-publico-ver.php?id=' + encodeURIComponent(id));
    var resultado = await respuesta.json();
    var documento = resultado.exito ? resultado.datos : null;

    if (!documento) {
        contenedor.innerHTML =
            '<section class="tarjeta">' +
                '<h3>Documento no encontrado</h3>' +
                '<p>El código QR escaneado no corresponde a ningún documento disponible.</p>' +
            '</section>';
        return;
    }

    var itemsInstrucciones = documento.instrucciones.map(function (instr) {
        var clase = instr.es_pauta_alarma ? ' class="pauta-alarma"' : '';
        return '<li' + clase + '>' + SIGSM.escapar(instr.texto_instruccion) + '</li>';
    }).join('');

    var nombreArchivo = documento.archivo.split('/').pop();

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
