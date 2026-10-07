// Reemplaza a includes/header.php e includes/sidebar.php: arma el header y el sidebar
// en el cliente a partir de la sesión que devuelve php/auth-sesion.php, y protege
// la página redirigiendo al login si no hay sesión (o si el rol no puede entrar acá).
// OJO: esto es solo UX. La autorización real la hace cada endpoint de /php/.

const SIGSM = (function () {

    const ENLACES_SIDEBAR = [
        { pagina: 'documentacion', href: 'documentacion.html', texto: 'Documentos Médicos (Admin)', badge: 'Mód. 1', soloNoChofer: true },
        { pagina: 'documento_publico', href: 'documento-publico.html', texto: 'Documento QR (Paciente)', badge: null, soloNoChofer: false },
        { pagina: 'traslados', href: 'traslados.html', texto: 'Rutas de Ambulancias', badge: 'Mód. 4', soloNoChofer: false },
        { pagina: 'recursos', href: 'recursos-ambulancias.html', texto: 'ABM Recursos', badge: 'Mód. 5', soloNoChofer: true },
        { pagina: 'encuestas', href: 'encuesta-reporte.html', texto: 'Encuestas y Reportes', badge: 'Mód. 3', soloNoChofer: false },
    ];

    const TRAZOS_ICONO = {
        plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
        pencil: '<path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>',
    };

    function escapar(texto) {
        const div = document.createElement('div');
        div.textContent = texto;
        return div.innerHTML;
    }

    async function cargarResumenRecursos() {
        const respuesta = await fetch('../php/recursos-resumen.php');
        const resultado = await respuesta.json();
        if (!resultado.exito) return;

        document.querySelector('#contador-ambulancias').textContent = '(' + resultado.datos.total_ambulancias + ')';
        document.querySelector('#contador-personal').textContent = '(' + resultado.datos.total_personal + ')';
        document.querySelector('#contador-rutas').textContent = '(' + resultado.datos.total_rutas + ')';
    }

    function renderHeader() {
        const contenedor = document.querySelector('#header');
        if (!contenedor) return;

        contenedor.outerHTML =
            '<header class="topbar">' +
                '<div class="logo">' +
                    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h4l2-6 3 12 2-8 2 2h5"/></svg>' +
                '</div>' +
                '<div class="titulo-sistema">' +
                    '<h1>SIGSM</h1>' +
                    '<p>Sistema Informático de Gestión de Servicios Médicos Hospital de Clínicas</p>' +
                '</div>' +
                '<button type="button" class="btn-cerrar-sesion" id="cerrar-sesion">Cerrar sesión</button>' +
            '</header>';

        document.querySelector('#cerrar-sesion').addEventListener('click', function (e) {
            cerrarSesion(e.currentTarget);
        });
    }

    function renderSidebar(sesion, paginaActual) {
        const contenedor = document.querySelector('#sidebar');
        if (!contenedor) return;

        const esChofer = sesion.rol === 'Chofer';

        const items = ENLACES_SIDEBAR
            .filter(function (item) { return !(esChofer && item.soloNoChofer); })
            .map(function (item) {
                const activo = (item.pagina === paginaActual) ? ' activo' : '';
                const badge = item.badge ? ' <span class="badge">' + item.badge + '</span>' : '';
                return '<li class="' + activo.trim() + '"><a href="' + item.href + '">' + item.texto + badge + '</a></li>';
            })
            .join('');

        contenedor.outerHTML =
            '<aside class="sidebar">' +
                '<p class="sidebar-titulo">COMPONENTES</p>' +
                '<nav><ul>' + items + '</ul></nav>' +
            '</aside>';
    }

    async function cerrarSesion(boton) {
        boton.disabled = true;
        try {
            await fetch('../php/auth-logout.php', { method: 'POST' });
        } finally {
            window.location.href = 'index.html';
        }
    }

    async function protegerPagina(paginaActual, rolesPermitidos, rutaFallback) {
        const respuesta = await fetch('../php/auth-sesion.php');
        const sesion = await respuesta.json();

        if (!sesion.autenticado) {
            window.location.href = 'index.html';
            return null;
        }

        if (rolesPermitidos && rolesPermitidos.length && rolesPermitidos.indexOf(sesion.rol) === -1) {
            window.location.href = rutaFallback || 'traslados.html';
            return null;
        }

        renderHeader();
        renderSidebar(sesion, paginaActual);

        return sesion;
    }

    return {
        protegerPagina: protegerPagina,
        escapar: escapar,
        TRAZOS_ICONO: TRAZOS_ICONO,
        cargarResumenRecursos: cargarResumenRecursos,
    };

})();
