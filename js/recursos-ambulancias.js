document.addEventListener('DOMContentLoaded', async function () {

    const sesion = await SIGSM.protegerPagina('recursos');
    if (!sesion) return;

    const formulario = document.querySelector('#form-ambulancia');
    const mensaje = document.querySelector('#mensaje-form');
    const tabla = document.querySelector('#tabla-ambulancias');
    let listaAmbulancias = [];

    function claseEstado(estado) {
        if (estado === 'Disponible') return 'pill-verde';
        if (estado === 'Fuera de Servicio') return 'pill-rojo';
        return 'pill-naranja';
    }

    function renderFila(amb) {
        return '<tr>' +
            '<td>' + SIGSM.escapar(amb.matricula) + '</td>' +
            '<td>' + SIGSM.escapar(amb.marca) + '</td>' +
            '<td>' + SIGSM.escapar(amb.modelo) + '</td>' +
            '<td><span class="pill-estado ' + claseEstado(amb.estado) + '">' + SIGSM.escapar(amb.estado) + '</span></td>' +
            '<td>' +
                '<a href="#" class="enlace-accion" data-accion="editar" data-id="' + amb.id_ambulancia + '">Editar</a>' +
                '<a href="#" class="enlace-accion confirmar-borrado enlace-icono" data-accion="borrar" data-id="' + amb.id_ambulancia + '" title="Borrar">' +
                    '<svg class="icono" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>' +
                '</a>' +
            '</td>' +
        '</tr>';
    }

    async function cargarListado() {
        const respuesta = await fetch('../php/recursos-ambulancias.php');
        const resultado = await respuesta.json();
        if (!resultado.exito) return;

        listaAmbulancias = resultado.datos;
        tabla.innerHTML = listaAmbulancias.map(renderFila).join('');
        document.querySelector('#total-ambulancias').textContent = listaAmbulancias.length;
    }

    function activarModoEdicion(amb) {
        document.querySelector('#id_ambulancia_editar').value = amb.id_ambulancia;
        document.querySelector('#matricula').value = amb.matricula;
        document.querySelector('#marca').value = amb.marca;
        document.querySelector('#modelo').value = amb.modelo;
        document.querySelector('#estado').value = amb.estado;

        document.querySelector('#icono-formulario').innerHTML = SIGSM.ICONOS.lapiz;
        document.querySelector('#titulo-formulario').textContent = 'Editar Ambulancia';
        document.querySelector('#boton-formulario').textContent = 'Actualizar Vehículo';
        document.querySelector('#cancelar-edicion').hidden = false;
        formulario.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function volverAModoAlta() {
        formulario.reset();
        document.querySelector('#id_ambulancia_editar').value = '';

        document.querySelector('#icono-formulario').innerHTML = SIGSM.ICONOS.mas;
        document.querySelector('#titulo-formulario').textContent = 'Registrar Nueva Ambulancia';
        document.querySelector('#boton-formulario').textContent = 'Guardar Vehículo';
        document.querySelector('#cancelar-edicion').hidden = true;
        mensaje.textContent = '';
    }

    tabla.addEventListener('click', async function (e) {
        const enlace = e.target.closest('[data-accion]');
        if (!enlace) return;
        e.preventDefault();

        const id = enlace.dataset.id;

        if (enlace.dataset.accion === 'editar') {
            const amb = listaAmbulancias.find(function (a) { return String(a.id_ambulancia) === id; });
            if (amb) activarModoEdicion(amb);
            return;
        }

        if (enlace.dataset.accion === 'borrar') {
            const amb = listaAmbulancias.find(function (a) { return String(a.id_ambulancia) === id; });
            const borrado = await SIGSM.eliminarRecurso({
                url: '../php/recursos-ambulancias.php',
                datos: { eliminar_ambulancia: '1', id_ambulancia: id },
                titulo: 'Eliminar ambulancia',
                mensaje: 'Vas a eliminar la ambulancia ' + (amb ? amb.matricula : '') + '. Esta acción no se puede deshacer.',
                textoExito: 'Ambulancia eliminada.',
            });
            if (borrado) await Promise.all([cargarListado(), SIGSM.cargarResumenRecursos()]);
        }
    });

    formulario.addEventListener('submit', async function (e) {
        e.preventDefault();
        mensaje.textContent = '';

        const datos = new FormData(formulario);
        datos.append('guardar_ambulancia', '1');
        const editando = datos.get('id_ambulancia_editar') !== '';

        try {
            const respuesta = await fetch('../php/recursos-ambulancias.php', {
                method: 'POST',
                body: datos
            });
            const resultado = await respuesta.json();

            if (resultado.exito) {
                volverAModoAlta();
                await Promise.all([cargarListado(), SIGSM.cargarResumenRecursos()]);
                SIGSM.mostrarToast(editando ? 'Cambios guardados.' : 'Ambulancia registrada.');
            } else {
                mensaje.textContent = resultado.error;
            }
        } catch (error) {
            mensaje.textContent = 'No se pudo conectar con el servidor.';
        }
    });

    document.querySelector('#cancelar-edicion').addEventListener('click', volverAModoAlta);

    SIGSM.cargarResumenRecursos();
    cargarListado();

});
