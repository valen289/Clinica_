// Reemplaza a includes/header.php e includes/sidebar.php: arma el header y el sidebar
// en el cliente a partir de la sesión que devuelve php/auth-sesion.php, y protege
// la página redirigiendo al login si no hay sesión (o si el rol no puede entrar acá).
// OJO: esto es solo UX. La autorización real la hace cada endpoint de /php/.
// También junta las utilidades que comparten todas las páginas (íconos, fechas, toasts).

const SIGSM = (function () {

    const ROLES_PERSONAL = ['Administrador', 'Recepción', 'Médico'];

    // menú agrupado por área; "roles: null" = cualquier usuario logueado.
    // Es la única fuente de permisos del lado del cliente: protegerPagina() la usa también.
    const SECCIONES_SIDEBAR = [
        { titulo: 'General', enlaces: [
            { pagina: 'inicio', href: 'inicio.html', texto: 'Inicio', icono: 'inicio', roles: null },
        ] },
        { titulo: 'Atención al paciente', enlaces: [
            { pagina: 'pacientes', href: 'pacientes.html', texto: 'Pacientes', icono: 'usuario', roles: ROLES_PERSONAL },
            { pagina: 'documentacion', href: 'documentacion.html', texto: 'Documentos médicos', icono: 'documento', roles: ROLES_PERSONAL },
        ] },
        { titulo: 'Traslados', enlaces: [
            { pagina: 'traslados', href: 'traslados.html', texto: 'Traslados', icono: 'ruta', roles: null },
            { pagina: 'recursos', href: 'recursos-ambulancias.html', texto: 'Recursos', icono: 'recursos', roles: ROLES_PERSONAL },
        ] },
        { titulo: 'Calidad', enlaces: [
            { pagina: 'encuestas', href: 'encuesta-reporte.html', texto: 'Encuestas y reportes', icono: 'grafico', roles: null },
        ] },
        { titulo: 'Administración', enlaces: [
            { pagina: 'usuarios', href: 'usuarios.html', texto: 'Usuarios', icono: 'usuarios', roles: ['Administrador'] },
        ] },
    ];

    // trazos de iconos (estilo lineal, se dibujan dentro de un <svg viewBox="0 0 24 24">)
    const ICONOS = {
        inicio: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
        actividad: '<path d="M3 12h4l2-6 3 12 2-8 2 2h5"/>',
        reloj: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
        ambulancia: '<path d="M3 17V7a1 1 0 0 1 1-1h10v11"/><path d="M14 10h4l3 3v4h-2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/><path d="M9 17h6"/><path d="M8 9v4M6 11h4"/>',
        check: '<polyline points="20 6 9 17 4 12"/>',
        flecha: '<path d="M5 12h14M13 6l6 6-6 6"/>',
        volver: '<path d="M19 12H5M11 18l-6-6 6-6"/>',
        laboratorio: '<path d="M9 3h6M10 3v6L4.5 18.5A2 2 0 0 0 6.2 21h11.6a2 2 0 0 0 1.7-2.5L14 9V3"/><path d="M7 15h10"/>',
        imagen: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/>',
        calendario: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
        telefono: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/>',
        correo: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 6l-10 7L2 6"/>',
        ubicacion: '<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
        cedula: '<rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="8" cy="12" r="2"/><path d="M14 10h4M14 14h4"/>',
        documento: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h6"/>',
        qr: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h4v-3"/>',
        ruta: '<circle cx="6" cy="19" r="2"/><circle cx="18" cy="5" r="2"/><path d="M8 19h6a4 4 0 0 0 0-8h-4a4 4 0 0 1 0-8h6"/>',
        recursos: '<path d="M3 7l9-4 9 4-9 4-9-4z"/><path d="M3 12l9 4 9-4"/><path d="M3 17l9 4 9-4"/>',
        grafico: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
        usuarios: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
        usuario: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
        escudo: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
        mas: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
        lapiz: '<path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>',
        enlace: '<path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.5 1.5"/><path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.5-1.5"/>',
        basura: '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/>',
        alarma: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
        libro: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M4 19.5V21h16"/>',
        incompleto: '<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/>',
    };

    function icono(nombre, tamanio) {
        const t = tamanio || 18;
        return '<svg viewBox="0 0 24 24" width="' + t + '" height="' + t + '" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICONOS[nombre] + '</svg>';
    }

    function escapar(texto) {
        const div = document.createElement('div');
        div.textContent = texto;
        return div.innerHTML;
    }

    function textoPlural(cantidad, singular, plural) {
        return cantidad + ' ' + (cantidad === 1 ? singular : plural);
    }

    // la fecha viene como 2026-08-15, se muestra como 15/08/2026
    function formatearFecha(fecha) {
        const partes = String(fecha || '').split('-');
        return partes.length === 3 ? partes[2] + '/' + partes[1] + '/' + partes[0] : (fecha || '');
    }

    // cédula uruguaya: mismo algoritmo que php/cedula.php (cada dígito por 2987634, módulo 10)
    function digitoVerificador(cuerpo) {
        const pesos = [2, 9, 8, 7, 6, 3, 4];
        const relleno = String(cuerpo).padStart(7, '0');
        let suma = 0;
        for (let i = 0; i < 7; i++) suma += Number(relleno[i]) * pesos[i];
        return (10 - (suma % 10)) % 10;
    }

    // acepta "1.234.567-2" o "12345672"; devuelve true si el dígito verificador coincide
    function cedulaValida(texto) {
        const digitos = String(texto || '').replace(/\D/g, '');
        if (digitos.length < 7 || digitos.length > 8) return false;
        return digitoVerificador(digitos.slice(0, -1)) === Number(digitos.slice(-1));
    }

    // 12345672 -> "1.234.567-2"
    function formatearCedula(numero) {
        const digitos = String(numero || '').replace(/\D/g, '');
        if (digitos.length < 2) return digitos;
        const cuerpo = digitos.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        return cuerpo + '-' + digitos.slice(-1);
    }

    // años cumplidos a partir de "1980-05-20"; null si no hay fecha
    function calcularEdad(fechaNacimiento) {
        if (!fechaNacimiento) return null;
        const nacimiento = new Date(fechaNacimiento + 'T00:00:00');
        const hoy = new Date();
        let edad = hoy.getFullYear() - nacimiento.getFullYear();
        const yaCumplio = hoy.getMonth() > nacimiento.getMonth() || (hoy.getMonth() === nacimiento.getMonth() && hoy.getDate() >= nacimiento.getDate());
        if (!yaCumplio) edad--;
        return isNaN(edad) ? null : edad;
    }

    // minúsculas y sin tildes, para que la búsqueda de "medico" encuentre "Médico"
    function normalizar(texto) {
        return String(texto || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    }

    // vista pública de un documento (la que abre el QR): se arma con el token, nunca con el id.
    // Absoluta y con el servidor actual, para que el QR funcione aunque el documento se haya creado en otra máquina
    function urlDocumentoPublico(token) {
        return new URL('documento-publico.html?t=' + encodeURIComponent(token || ''), window.location.href).href;
    }

    // color de la pill según el estado del traslado (Traslados e Inicio lo muestran igual)
    function claseEstadoTraslado(estado) {
        if (['En curso', 'Retornando'].indexOf(estado) !== -1) return 'pill-azul';
        if (['Llegado a destino', 'Finalizado'].indexOf(estado) !== -1) return 'pill-verde';
        return 'pill-naranja';
    }

    // el contenedor de toasts se crea solo la primera vez que se usa
    function mostrarToast(texto, tipo) {
        let contenedor = document.querySelector('.toasts');
        if (!contenedor) {
            contenedor = document.createElement('div');
            contenedor.className = 'toasts';
            contenedor.setAttribute('aria-live', 'polite');
            document.body.appendChild(contenedor);
        }

        const toast = document.createElement('div');
        toast.className = 'toast toast-' + (tipo || 'ok');
        toast.setAttribute('role', 'status');
        toast.textContent = texto;
        contenedor.appendChild(toast);
        setTimeout(function () {
            toast.classList.add('toast-saliendo');
            setTimeout(function () { toast.remove(); }, 300);
        }, 3200);
    }

    async function cargarResumenRecursos() {
        const respuesta = await fetch('../php/recursos-resumen.php');
        const resultado = await respuesta.json();
        if (!resultado.exito) return;

        document.querySelector('#contador-ambulancias').textContent = '(' + resultado.datos.total_ambulancias + ')';
        document.querySelector('#contador-personal').textContent = '(' + resultado.datos.total_personal + ')';
        document.querySelector('#contador-rutas').textContent = '(' + resultado.datos.total_rutas + ')';
    }

    function puedeVer(enlace, rol) {
        return !enlace.roles || enlace.roles.indexOf(rol) !== -1;
    }

    function buscarEnlace(pagina) {
        for (const seccion of SECCIONES_SIDEBAR) {
            const enlace = seccion.enlaces.find(function (e) { return e.pagina === pagina; });
            if (enlace) return enlace;
        }
        return null;
    }

    // para no ofrecer accesos a páginas que el rol después no puede abrir
    function puedeEntrar(pagina, rol) {
        const enlace = buscarEnlace(pagina);
        return !enlace || puedeVer(enlace, rol);
    }

    // primera página del menú que el rol puede ver: es a donde va después del login
    function paginaInicial(rol) {
        for (const seccion of SECCIONES_SIDEBAR) {
            const enlace = seccion.enlaces.find(function (e) { return puedeVer(e, rol); });
            if (enlace) return enlace.href;
        }
        return 'index.html';
    }

    function renderHeader(sesion) {
        const contenedor = document.querySelector('#header');
        if (!contenedor) return;

        contenedor.outerHTML =
            '<header class="topbar">' +
                '<a class="marca-topbar" href="' + paginaInicial(sesion.rol) + '">' +
                    '<div class="logo">' +
                        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h4l2-6 3 12 2-8 2 2h5"/></svg>' +
                    '</div>' +
                    '<div class="titulo-sistema">' +
                        '<h1>SIGSM</h1>' +
                        '<p>Hospital de Clínicas · Gestión de Servicios Médicos</p>' +
                    '</div>' +
                '</a>' +
                '<div class="usuario-topbar"><span class="usuario-avatar">' + escapar((sesion.nombre || '?').trim().charAt(0).toUpperCase()) + '</span><span class="usuario-datos"><strong>' + escapar(sesion.nombre || '') + '</strong><small>' + escapar(sesion.rol || '') + '</small></span></div>' +
                '<button type="button" class="btn-cerrar-sesion" id="cerrar-sesion">Cerrar sesión</button>' +
            '</header>';

        document.querySelector('#cerrar-sesion').addEventListener('click', function (e) {
            cerrarSesion(e.currentTarget);
        });
    }

    function renderSidebar(sesion, paginaActual) {
        const contenedor = document.querySelector('#sidebar');
        if (!contenedor) return;

        const secciones = SECCIONES_SIDEBAR
            .map(function (seccion) {
                const items = seccion.enlaces
                    .filter(function (enlace) { return puedeVer(enlace, sesion.rol); })
                    .map(function (enlace) {
                        const esActual = enlace.pagina === paginaActual;
                        const icono = '<svg class="nav-icono" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICONOS[enlace.icono] + '</svg>';
                        return '<li' + (esActual ? ' class="activo"' : '') + '><a href="' + enlace.href + '"' + (esActual ? ' aria-current="page"' : '') + '>' + icono + '<span class="nav-texto">' + enlace.texto + '</span></a></li>';
                    })
                    .join('');

                // una sección sin enlaces visibles para este rol no se muestra
                return items ? '<div class="sidebar-seccion"><p class="sidebar-titulo">' + seccion.titulo + '</p><ul>' + items + '</ul></div>' : '';
            })
            .join('');

        contenedor.outerHTML =
            '<aside class="sidebar">' +
                '<nav aria-label="Menú principal">' + secciones + '</nav>' +
            '</aside>';

        // en celular el menú es una fila deslizable: se corre hasta la página actual para que se vea
        const nav = document.querySelector('.sidebar nav');
        const activo = nav.querySelector('.activo');
        if (activo && nav.scrollWidth > nav.clientWidth) {
            const desplazamiento = activo.getBoundingClientRect().left - nav.getBoundingClientRect().left;
            nav.scrollLeft += desplazamiento - (nav.clientWidth - activo.offsetWidth) / 2;
        }
    }

    async function cerrarSesion(boton) {
        boton.disabled = true;
        try {
            await fetch('../php/auth-logout.php', { method: 'POST' });
        } finally {
            window.location.href = 'index.html';
        }
    }

    async function obtenerSesion() {
        const respuesta = await fetch('../php/auth-sesion.php');
        return respuesta.json();
    }

    // los roles permitidos salen de SECCIONES_SIDEBAR; si el rol no puede entrar, va a su página inicial
    async function protegerPagina(paginaActual) {
        const sesion = await obtenerSesion();

        if (!sesion.autenticado) {
            window.location.href = 'index.html';
            return null;
        }

        const enlace = buscarEnlace(paginaActual);
        if (enlace && !puedeVer(enlace, sesion.rol)) {
            window.location.href = paginaInicial(sesion.rol);
            return null;
        }

        renderHeader(sesion);
        renderSidebar(sesion, paginaActual);

        return sesion;
    }

    return {
        protegerPagina: protegerPagina,
        obtenerSesion: obtenerSesion,
        paginaInicial: paginaInicial,
        puedeEntrar: puedeEntrar,
        claseEstadoTraslado: claseEstadoTraslado,
        urlDocumentoPublico: urlDocumentoPublico,
        escapar: escapar,
        icono: icono,
        ICONOS: ICONOS,
        textoPlural: textoPlural,
        formatearFecha: formatearFecha,
        cedulaValida: cedulaValida,
        digitoVerificador: digitoVerificador,
        formatearCedula: formatearCedula,
        calcularEdad: calcularEdad,
        normalizar: normalizar,
        mostrarToast: mostrarToast,
        cargarResumenRecursos: cargarResumenRecursos,
    };

})();
