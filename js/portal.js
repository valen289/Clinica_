// Portal del paciente: un solo lugar con sus estudios y los documentos de indicaciones que le asignaron.
// Usa las utilidades de shell.js (íconos, fechas, toasts) pero no su menú: el paciente no ve el sistema interno.
document.addEventListener('DOMContentLoaded', async function () {

    const lista = document.querySelector('#lista-portal');
    const aviso = document.querySelector('#aviso-portal');
    const filtros = document.querySelector('#portal-filtros');
    const DIAS_NUEVO = 7;

    const ICONO_TIPO = {
        'Análisis de laboratorio': 'laboratorio',
        'Imagenología': 'imagen',
        'Informe médico': 'documento',
        'Otro': 'documento',
    };

    let items = [];
    let filtroActual = '';

    function irAlIngreso() {
        window.location.href = 'portal-ingreso.html';
    }

    function mostrarAviso(texto, esError) {
        aviso.textContent = texto;
        aviso.classList.toggle('aviso-error', !!esError);
        aviso.hidden = !texto;
    }

    function esNuevo(fecha) {
        const dia = new Date(fecha + 'T00:00:00');
        return !isNaN(dia) && (Date.now() - dia.getTime()) < DIAS_NUEVO * 24 * 60 * 60 * 1000;
    }

    // estudios y documentos en una sola lista, del más nuevo al más viejo
    function armarItems(datos) {
        const estudios = datos.estudios.map(function (e) {
            return { clase: 'estudio', fecha: e.fecha_estudio, dato: e };
        });
        const documentos = datos.documentos.map(function (d) {
            return { clase: 'indicacion', fecha: d.fecha_asignacion, dato: d };
        });
        return estudios.concat(documentos).sort(function (a, b) {
            return a.fecha < b.fecha ? 1 : (a.fecha > b.fecha ? -1 : 0);
        });
    }

    function renderEstudio(e) {
        const disponible = e.estado === 'Disponible' && Number(e.tiene_pdf);
        const accion = disponible
            ? '<a class="boton boton-primario boton-chico" href="../php/estudio-archivo.php?id=' + e.id_estudio + '" target="_blank" rel="noopener">Ver resultado</a>'
            : '<span class="pill-estado pill-naranja">En proceso</span><small>Todavía no está listo. Volvé a consultar en unos días.</small>';

        return '<li class="doc-portal">' +
            '<span class="doc-portal-icono">' + SIGSM.icono(ICONO_TIPO[e.tipo] || 'documento', 20) + '</span>' +
            '<div class="doc-portal-datos">' +
                '<span class="doc-portal-tipo">' + SIGSM.escapar(e.tipo) + '</span>' +
                '<h3>' + SIGSM.escapar(e.titulo) + '</h3>' +
                '<p class="doc-portal-fecha">' + SIGSM.formatearFecha(e.fecha_estudio) + (disponible && esNuevo(e.fecha_estudio) ? ' <span class="chip-nuevo">Nuevo</span>' : '') + '</p>' +
                (e.observaciones ? '<p class="doc-portal-nota">' + SIGSM.escapar(e.observaciones) + '</p>' : '') +
            '</div>' +
            '<div class="doc-portal-accion">' + accion + '</div>' +
        '</li>';
    }

    function renderIndicacion(d) {
        const tipo = 'Indicaciones' + (d.departamento ? ' · ' + d.departamento : '');
        return '<li class="doc-portal">' +
            '<span class="doc-portal-icono icono-indicacion">' + SIGSM.icono('libro', 20) + '</span>' +
            '<div class="doc-portal-datos">' +
                '<span class="doc-portal-tipo">' + SIGSM.escapar(tipo) + '</span>' +
                '<h3>' + SIGSM.escapar(d.titulo) + '</h3>' +
                '<p class="doc-portal-fecha">Te lo indicaron el ' + SIGSM.formatearFecha(d.fecha_asignacion) + (esNuevo(d.fecha_asignacion) ? ' <span class="chip-nuevo">Nuevo</span>' : '') + '</p>' +
                (d.descripcion ? '<p class="doc-portal-nota">' + SIGSM.escapar(d.descripcion) + '</p>' : '') +
            '</div>' +
            '<div class="doc-portal-accion">' +
                '<a class="boton boton-secundario boton-chico" href="documento-publico.html?id=' + d.id_documento + '" target="_blank" rel="noopener">Ver indicaciones</a>' +
            '</div>' +
        '</li>';
    }

    function pintarLista() {
        const visibles = items.filter(function (item) { return !filtroActual || item.clase === filtroActual; });
        lista.innerHTML = visibles.map(function (item) {
            return item.clase === 'estudio' ? renderEstudio(item.dato) : renderIndicacion(item.dato);
        }).join('');

        filtros.querySelectorAll('[data-filtro]').forEach(function (chip) {
            chip.setAttribute('aria-pressed', String(chip.dataset.filtro === filtroActual));
        });

        if (!items.length) {
            mostrarAviso('Todavía no tenés documentos. Cuando el hospital cargue un resultado o una indicación para vos, lo vas a ver acá.', false);
        } else if (!visibles.length) {
            mostrarAviso(filtroActual === 'estudio' ? 'No tenés análisis ni estudios cargados.' : 'No tenés indicaciones asignadas.', false);
        } else {
            mostrarAviso('', false);
        }
    }

    function renderFiltros() {
        const estudios = items.filter(function (i) { return i.clase === 'estudio'; }).length;
        const textos = {
            '': 'Todos (' + items.length + ')',
            'estudio': 'Análisis y estudios (' + estudios + ')',
            'indicacion': 'Indicaciones (' + (items.length - estudios) + ')',
        };
        filtros.querySelectorAll('[data-filtro]').forEach(function (chip) {
            chip.textContent = textos[chip.dataset.filtro];
        });
        filtros.hidden = items.length === 0;
    }

    function renderCuenta(p) {
        const filas = [
            ['Cédula', SIGSM.formatearCedula(p.id_ci)],
            ['Nombre', p.nombre + ' ' + p.apellido],
            ['Fecha de nacimiento', p.fecha_nacimiento ? SIGSM.formatearFecha(p.fecha_nacimiento) : '—'],
            ['Teléfono', p.telefono || '—'],
            ['Email', p.email || '—'],
            ['Dirección', p.direccion || '—'],
            ['Cuenta activa desde', p.cuenta_activada ? SIGSM.formatearFecha(p.cuenta_activada.slice(0, 10)) : '—'],
        ];
        document.querySelector('#datos-portal').innerHTML = filas.map(function (f) {
            return '<div><dt>' + f[0] + '</dt><dd>' + SIGSM.escapar(f[1]) + '</dd></div>';
        }).join('');
    }

    function renderCabecera(p) {
        document.querySelector('#portal-saludo').textContent = 'Hola, ' + p.nombre;
        document.querySelector('#portal-nombre').textContent = p.nombre + ' ' + p.apellido;
        document.querySelector('#portal-avatar').textContent = p.nombre.trim().charAt(0).toUpperCase();
    }

    async function cargar() {
        try {
            const respuesta = await fetch('../php/portal-mis-documentos.php');
            if (respuesta.status === 401) {
                irAlIngreso();
                return;
            }
            const resultado = await respuesta.json();
            if (!resultado.exito) throw new Error(resultado.error);

            renderCabecera(resultado.datos);
            renderCuenta(resultado.datos);
            items = armarItems(resultado.datos);
            renderFiltros();
            pintarLista();
        } catch (error) {
            lista.innerHTML = '';
            mostrarAviso('No pudimos cargar tus documentos. Revisá tu conexión e intentá de nuevo.', true);
        }
    }

    filtros.addEventListener('click', function (e) {
        const chip = e.target.closest('[data-filtro]');
        if (!chip) return;
        filtroActual = chip.dataset.filtro;
        pintarLista();
    });

    // ---- pestañas Mis documentos / Mi cuenta ----
    const pestanias = document.querySelectorAll('[role="tab"]');
    pestanias.forEach(function (pestania) {
        pestania.addEventListener('click', function () {
            pestanias.forEach(function (otra) {
                const activa = otra === pestania;
                otra.setAttribute('aria-selected', String(activa));
                document.querySelector('#' + otra.getAttribute('aria-controls')).hidden = !activa;
            });
        });
    });

    // ---- cambiar contraseña ----
    const formContrasenia = document.querySelector('#form-contrasenia');
    const mensajeContrasenia = document.querySelector('#mensaje-contrasenia');
    const botonContrasenia = document.querySelector('#guardar-contrasenia');

    formContrasenia.addEventListener('submit', async function (e) {
        e.preventDefault();
        mensajeContrasenia.textContent = '';

        if (!formContrasenia.actual.value) {
            mensajeContrasenia.textContent = 'Ingresá tu contraseña actual.';
            return;
        }
        if (formContrasenia.nueva.value.length < 8) {
            mensajeContrasenia.textContent = 'La contraseña nueva tiene que tener al menos 8 caracteres.';
            return;
        }
        if (formContrasenia.nueva.value !== formContrasenia.confirmacion.value) {
            mensajeContrasenia.textContent = 'Las dos contraseñas nuevas no coinciden.';
            return;
        }

        botonContrasenia.disabled = true;
        try {
            const respuesta = await fetch('../php/portal-cambiar-contrasenia.php', { method: 'POST', body: new FormData(formContrasenia) });
            if (respuesta.status === 401) {
                irAlIngreso();
                return;
            }
            const resultado = await respuesta.json();
            if (!resultado.exito) {
                mensajeContrasenia.textContent = resultado.error;
                return;
            }
            formContrasenia.reset();
            SIGSM.mostrarToast('Listo, tu contraseña quedó cambiada.');
        } catch (error) {
            mensajeContrasenia.textContent = 'No se pudo conectar con el servidor.';
        } finally {
            botonContrasenia.disabled = false;
        }
    });

    document.querySelector('#cerrar-sesion').addEventListener('click', async function (e) {
        e.currentTarget.disabled = true;
        try {
            await fetch('../php/auth-logout.php', { method: 'POST' });
        } finally {
            irAlIngreso();
        }
    });

    // recién activó la cuenta: se le da la bienvenida una sola vez
    if (new URLSearchParams(window.location.search).get('bienvenida') === '1') {
        history.replaceState(null, '', window.location.pathname);
        SIGSM.mostrarToast('¡Listo! Tu cuenta quedó activada.');
    }

    cargar();

});
