document.addEventListener('DOMContentLoaded', function () {

    var enlacesBorrar = document.querySelectorAll('.confirmar-borrado');

    enlacesBorrar.forEach(function (enlace) {
        enlace.addEventListener('click', function (evento) {
            var confirmado = confirm('¿Seguro que querés eliminar este registro? Esta acción no se puede deshacer.');
            if (!confirmado) {
                evento.preventDefault();
            }
        });
    });

});
