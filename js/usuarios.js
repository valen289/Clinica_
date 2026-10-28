document.addEventListener('DOMContentLoaded', async function () {

    const sesion = await SIGSM.protegerPagina('usuarios');
    if (!sesion) return;

    // mismo orden y colores en el resumen, el filtro, el formulario y las pills de la tabla
    const ROLES = [
        { rol: 'Administrador', plural: 'Administradores', icono: 'escudo', claseDato: '', clasePill: 'pill-azul' },
        { rol: 'Médico', plural: 'Médicos', icono: 'usuario', claseDato: 'dato-verde', clasePill: 'pill-verde' },
        { rol: 'Recepción', plural: 'Recepción', icono: 'documento', claseDato: 'dato-violeta', clasePill: 'pill-violeta' },
        { rol: 'Chofer', plural: 'Choferes', icono: 'ruta', claseDato: 'dato-ambar', clasePill: 'pill-naranja' },
    ];

    const resumen = document.querySelector('#resumen-usuarios');
    const barraFiltros = document.querySelector('#barra-filtros');
    const buscador = document.querySelector('#buscar-usuario');
    const filtroRol = document.querySelector('#filtro-rol');
    const limpiarFiltros = document.querySelector('#limpiar-filtros');
    const contadorResultados = document.querySelector('#contador-resultados');
    const avisoLista = document.querySelector('#aviso-lista');
    const esqueleto = document.querySelector('#esqueleto-usuarios');
    const tarjetaTabla = document.querySelector('#tarjeta-usuarios');
    const cuerpoTabla = document.querySelector('#lista-usuarios');
    const modal = document.querySelector('#modal-usuario');
    const formulario = document.querySelector('#form-usuario');
    const mensaje = document.querySelector('#mensaje-form');
    const botonGuardar = document.querySelector('#boton-guardar');
    let listaUsuarios = [];

    ROLES.forEach(function (r) {
        filtroRol.appendChild(new Option(r.rol, r.rol));
        formulario.rol.appendChild(new Option(r.rol, r.rol));
    });

    function datosRol(rol) {
        return ROLES.find(function (r) { return r.rol === rol; }) || { clasePill: '' };
    }

    function mostrarAviso(texto, esError) {
        avisoLista.textContent = texto;
        avisoLista.classList.toggle('aviso-error', !!esError);
        avisoLista.hidden = !texto;
    }

    function renderResumen() {
        resumen.innerHTML = ROLES.map(function (r) {
            const cantidad = listaUsuarios.filter(function (u) { return u.rol === r.rol; }).length;
            return '<button type="button" data-filtro-rol="' + r.rol + '" class="dato-resumen ' + r.claseDato + '">' +
                '<span class="dato-icono">' + SIGSM.icono(r.icono, 20) + '</span>' +
                '<span><strong>' + cantidad + '</strong><small>' + r.plural + '</small></span></button>';
        }).join('');
        resumen.hidden = listaUsuarios.length === 0;
    }

    function renderFila(u) {
        const nombreCompleto = u.nombre + ' ' + u.apellido;
        const esVos = String(u.id_funcionario) === String(sesion.id_funcionario);

        return '<tr>' +
            '<td><div class="celda-usuario">' +
                '<span class="usuario-avatar">' + SIGSM.escapar(nombreCompleto.trim().charAt(0).toUpperCase()) + '</span>' +
                '<span><strong>' + SIGSM.escapar(nombreCompleto) + '</strong>' + (esVos ? '<span class="chip-vos">Vos</span>' : '') +
                '<small>' + SIGSM.escapar(u.email) + '</small></span>' +
            '</div></td>' +
            '<td>' + SIGSM.escapar(u.usuario) + '</td>' +
            '<td><span class="texto-ci">' + SIGSM.escapar(u.ci || '—') + '</span></td>' +
            '<td><span class="pill-estado ' + datosRol(u.rol).clasePill + '">' + SIGSM.escapar(u.rol) + '</span></td>' +
        '</tr>';
    }

    function filtrar() {
        const termino = SIGSM.normalizar(buscador.value.trim());
        return listaUsuarios.filter(function (u) {
            if (filtroRol.value && u.rol !== filtroRol.value) return false;
            return !termino || SIGSM.normalizar([u.nombre, u.apellido, u.usuario, u.ci, u.email].join(' ')).indexOf(termino) !== -1;
        });
    }

    function pintarListado() {
        const visibles = filtrar();

        cuerpoTabla.innerHTML = visibles.map(renderFila).join('');
        tarjetaTabla.hidden = visibles.length === 0;
        barraFiltros.hidden = listaUsuarios.length === 0;
        limpiarFiltros.hidden = buscador.value.trim() === '' && filtroRol.value === '';
        contadorResultados.textContent = listaUsuarios.length ? 'Mostrando ' + visibles.length + ' de ' + listaUsuarios.length : '';
        resumen.querySelectorAll('[data-filtro-rol]').forEach(function (dato) {
            dato.classList.toggle('dato-activo', dato.dataset.filtroRol === filtroRol.value);
        });

        mostrarAviso(listaUsuarios.length && !visibles.length ? 'Ningún usuario coincide con los filtros aplicados.' : '', false);
    }

    async function cargarListado() {
        try {
            const respuesta = await fetch('../php/usuarios-listar.php');
            const resultado = await respuesta.json();
            if (!resultado.exito) throw new Error(resultado.error || 'Error al listar');

            listaUsuarios = resultado.datos;
            renderResumen();
            pintarListado();
        } catch (error) {
            tarjetaTabla.hidden = true;
            resumen.hidden = true;
            mostrarAviso('No se pudieron cargar los usuarios. Revisá la conexión e intentá de nuevo.', true);
        } finally {
            esqueleto.hidden = true;
        }
    }

    buscador.addEventListener('input', pintarListado);
    filtroRol.addEventListener('change', pintarListado);

    limpiarFiltros.addEventListener('click', function () {
        buscador.value = '';
        filtroRol.value = '';
        pintarListado();
        buscador.focus();
    });

    // los datos del resumen filtran por rol al tocarlos (y lo sacan si ya estaba)
    resumen.addEventListener('click', function (e) {
        const dato = e.target.closest('[data-filtro-rol]');
        if (!dato) return;
        filtroRol.value = filtroRol.value === dato.dataset.filtroRol ? '' : dato.dataset.filtroRol;
        pintarListado();
    });

    // ---- modal de alta ----
    let instantaneaFormulario = '';
    let avisoDescarte = false;

    function estadoFormulario() {
        return JSON.stringify(Array.from(new FormData(formulario)));
    }

    function abrirModal() {
        formulario.reset();
        mensaje.textContent = '';
        modal.hidden = false;
        document.body.classList.add('modal-abierto');
        instantaneaFormulario = estadoFormulario();
        avisoDescarte = false;
        formulario.nombre.focus();
    }

    function cerrarModal() {
        modal.hidden = true;
        document.body.classList.remove('modal-abierto');
    }

    // el primer intento de cerrar con datos cargados avisa; el segundo descarta
    function intentarCerrarModal() {
        if (!avisoDescarte && estadoFormulario() !== instantaneaFormulario) {
            avisoDescarte = true;
            mensaje.textContent = 'Hay datos sin guardar. Volvé a tocar Cancelar (o fuera del cuadro) para descartarlos.';
            return;
        }
        cerrarModal();
    }

    document.querySelector('#boton-nuevo-usuario').addEventListener('click', abrirModal);
    document.querySelector('#boton-cancelar').addEventListener('click', intentarCerrarModal);
    modal.addEventListener('click', function (e) {
        if (e.target === modal) intentarCerrarModal();
    });

    // atajos: "/" lleva al buscador, Escape cierra el modal
    document.addEventListener('keydown', function (e) {
        const escribiendo = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
        if (e.key === '/' && !escribiendo && modal.hidden) {
            e.preventDefault();
            buscador.focus();
        }
        if (e.key === 'Escape' && !modal.hidden) intentarCerrarModal();
    });

    formulario.addEventListener('submit', async function (e) {
        e.preventDefault();
        mensaje.textContent = '';

        const datos = new FormData(formulario);
        botonGuardar.disabled = true;
        botonGuardar.textContent = 'Creando...';

        try {
            const respuesta = await fetch('../php/usuarios-guardar.php', { method: 'POST', body: datos });
            const resultado = await respuesta.json();

            if (resultado.exito) {
                cerrarModal();
                await cargarListado();
                SIGSM.mostrarToast('Usuario "' + datos.get('usuario') + '" creado.');
            } else {
                mensaje.textContent = resultado.error;
            }
        } catch (error) {
            mensaje.textContent = 'No se pudo conectar con el servidor.';
        } finally {
            botonGuardar.disabled = false;
            botonGuardar.textContent = 'Crear usuario';
        }
    });

    // el acceso "Crear usuario" de Inicio llega con ?nuevo=1 (se saca de la URL para que recargar no lo repita)
    if (new URLSearchParams(window.location.search).get('nuevo') === '1') {
        history.replaceState(null, '', window.location.pathname);
        abrirModal();
    }

    cargarListado();

});
