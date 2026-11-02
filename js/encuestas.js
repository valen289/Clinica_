document.addEventListener('DOMContentLoaded', async function () {

    const sesion = await SIGSM.protegerPagina('encuestas');
    if (!sesion) return;

    // la misma página tiene dos vistas: el listado (encuesta-reporte.html) y el reporte (encuesta-reporte.html?id=1)
    const idReporte = new URLSearchParams(window.location.search).get('id');

    const TIPOS = [
        { valor: 'escala', texto: 'Calificación del 1 al 5' },
        { valor: 'si_no', texto: 'Sí o No' },
        { valor: 'texto', texto: 'Respuesta libre' },
    ];
    const ETIQUETAS_ESCALA = { 1: 'Muy mala', 2: 'Mala', 3: 'Regular', 4: 'Buena', 5: 'Excelente' };

    function textoTipo(valor) {
        const tipo = TIPOS.find(function (t) { return t.valor === valor; });
        return tipo ? tipo.texto : valor;
    }

    // 4.25 -> "4,3"
    function decimal(numero) {
        return Number(numero).toLocaleString('es-UY', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    }

    function porcentaje(parte, total) {
        return total ? Math.round(parte * 100 / total) : 0;
    }

    function estadoEncuesta(e) {
        if (!Number(e.estado)) return { texto: 'Cerrada', clase: 'pill-gris' };
        if (Number(e.vencida)) return { texto: 'Finalizada', clase: 'pill-gris' };
        return { texto: 'Activa', clase: 'pill-verde' };
    }

    function mostrarAviso(elemento, texto, esError) {
        elemento.textContent = texto;
        elemento.classList.toggle('aviso-error', !!esError);
        elemento.hidden = !texto;
    }

    async function ejecutarAccion(accion, idEncuesta) {
        const datos = new FormData();
        datos.append('accion', accion);
        datos.append('id_encuesta', idEncuesta);
        const respuesta = await fetch('../php/encuestas-accion.php', { method: 'POST', body: datos });
        const resultado = await respuesta.json();
        if (!resultado.exito) throw new Error(resultado.error || 'No se pudo completar la acción.');
    }

    // ================= VISTA LISTADO =================
    const listaEncuestas = document.querySelector('#lista-encuestas');
    const resumen = document.querySelector('#resumen-encuestas');
    const avisoLista = document.querySelector('#aviso-lista');
    let encuestas = [];

    function dato(nombreIcono, valor, texto, clase) {
        return '<div class="dato-resumen ' + (clase || '') + '">' +
            '<span class="dato-icono">' + SIGSM.icono(nombreIcono, 20) + '</span>' +
            '<span><strong>' + valor + '</strong><small>' + texto + '</small></span></div>';
    }

    function renderResumen(datos) {
        const activas = encuestas.filter(function (e) { return estadoEncuesta(e).texto === 'Activa'; }).length;
        const totalRespuestas = encuestas.reduce(function (suma, e) { return suma + Number(e.respuestas); }, 0);
        const promedio = datos.promedio_calificacion !== null ? decimal(datos.promedio_calificacion) + '<span class="dato-total">/5</span>' : '—';

        resumen.innerHTML =
            dato('grafico', activas, 'Encuestas activas', '') +
            dato('usuarios', totalRespuestas, 'Respuestas en total', 'dato-violeta') +
            dato('calendario', datos.respuestas_mes, 'Respondidas este mes', 'dato-ambar') +
            dato('check', promedio, 'Calificación promedio', 'dato-verde');
        resumen.hidden = encuestas.length === 0;
    }

    function renderTarjeta(e) {
        const estado = estadoEncuesta(e);
        const respuestas = Number(e.respuestas);
        const meta = [SIGSM.textoPlural(Number(e.preguntas), 'pregunta', 'preguntas'), SIGSM.textoPlural(respuestas, 'respuesta', 'respuestas')];
        if (e.fecha_cierre) meta.push((Number(e.vencida) ? 'cerró el ' : 'cierra el ') + SIGSM.formatearFecha(e.fecha_cierre));

        const botonEstado = Number(e.estado)
            ? '<button type="button" class="boton boton-secundario boton-chico" data-accion="cerrar" data-id="' + e.id_encuesta + '">Cerrar</button>'
            : '<button type="button" class="boton boton-secundario boton-chico" data-accion="reabrir" data-id="' + e.id_encuesta + '">Reabrir</button>';
        // con respuestas no se puede borrar: se perderían los resultados
        const botonBorrar = respuestas === 0
            ? '<button type="button" class="boton-icono boton-icono-peligro" title="Eliminar encuesta" aria-label="Eliminar encuesta" data-accion="borrar" data-id="' + e.id_encuesta + '">' + SIGSM.icono('basura', 16) + '</button>'
            : '';

        return '<section class="tarjeta tarjeta-encuesta">' +
            '<div class="tarjeta-encuesta-encabezado">' +
                '<span class="pill-estado ' + estado.clase + '">' + estado.texto + '</span>' +
                '<span class="fecha-documento">Creada el ' + SIGSM.formatearFecha(e.fecha_creacion) + '</span>' +
            '</div>' +
            '<h3>' + SIGSM.escapar(e.titulo) + '</h3>' +
            (e.descripcion ? '<p class="tarjeta-encuesta-descripcion">' + SIGSM.escapar(e.descripcion) + '</p>' : '') +
            '<p class="tarjeta-encuesta-meta">' + meta.join(' · ') + '</p>' +
            '<div class="tarjeta-encuesta-acciones">' +
                '<a class="boton boton-primario boton-chico" href="encuesta-reporte.html?id=' + e.id_encuesta + '">Ver resultados</a>' +
                botonEstado +
                botonBorrar +
            '</div>' +
        '</section>';
    }

    async function cargarListado() {
        try {
            const respuesta = await fetch('../php/encuestas-listar.php');
            const resultado = await respuesta.json();
            if (!resultado.exito) throw new Error(resultado.error);

            encuestas = resultado.datos.encuestas;
            renderResumen(resultado.datos);
            listaEncuestas.innerHTML = encuestas.map(renderTarjeta).join('');
            mostrarAviso(avisoLista, encuestas.length ? '' : 'Todavía no hay encuestas. Usá "+ Nueva encuesta" para crear la primera.', false);
        } catch (error) {
            listaEncuestas.innerHTML = '';
            mostrarAviso(avisoLista, 'No se pudieron cargar las encuestas. Revisá la conexión e intentá de nuevo.', true);
        }
    }

    listaEncuestas.addEventListener('click', async function (e) {
        const boton = e.target.closest('button[data-accion]');
        if (!boton) return;
        const encuesta = encuestas.find(function (x) { return String(x.id_encuesta) === boton.dataset.id; });
        if (!encuesta) return;

        if (boton.dataset.accion === 'borrar') {
            abrirBorrado(encuesta);
            return;
        }
        boton.disabled = true;
        try {
            await ejecutarAccion(boton.dataset.accion, encuesta.id_encuesta);
            await cargarListado();
            SIGSM.mostrarToast(boton.dataset.accion === 'cerrar' ? 'Encuesta cerrada: los pacientes ya no la ven.' : 'Encuesta reabierta.');
        } catch (error) {
            boton.disabled = false;
            SIGSM.mostrarToast(error.message, 'error');
        }
    });

    // ---- modal nueva encuesta ----
    const modalEncuesta = document.querySelector('#modal-encuesta');
    const formEncuesta = document.querySelector('#form-encuesta');
    const listaPreguntas = document.querySelector('#lista-preguntas');
    const mensajeEncuesta = document.querySelector('#mensaje-encuesta');
    const botonGuardar = document.querySelector('#guardar-encuesta');
    let instantanea = '';
    let avisoDescarte = false;

    // cada pregunta es un texto + su tipo; PHP los recibe como preguntas[] y tipos[]
    function agregarPregunta(texto, tipo) {
        const fila = document.createElement('div');
        fila.className = 'campo-dinamico campo-pregunta';
        fila.innerHTML =
            '<input type="text" name="preguntas[]" maxlength="200" placeholder="Pregunta">' +
            '<select name="tipos[]" aria-label="Tipo de pregunta">' +
                TIPOS.map(function (t) { return '<option value="' + t.valor + '">' + t.texto + '</option>'; }).join('') +
            '</select>' +
            '<button type="button" class="boton-quitar-campo" title="Quitar pregunta" aria-label="Quitar pregunta">×</button>';
        fila.querySelector('input').value = texto || '';
        fila.querySelector('select').value = tipo || 'escala';
        listaPreguntas.appendChild(fila);
        actualizarQuitar();
    }

    // siempre queda al menos una pregunta
    function actualizarQuitar() {
        const filas = listaPreguntas.querySelectorAll('.campo-pregunta');
        filas.forEach(function (fila, i) {
            fila.querySelector('.boton-quitar-campo').hidden = filas.length === 1;
            fila.querySelector('input').placeholder = 'Pregunta ' + (i + 1);
        });
    }

    function estadoFormulario() {
        return JSON.stringify(Array.from(new FormData(formEncuesta)));
    }

    function abrirModal() {
        formEncuesta.reset();
        listaPreguntas.innerHTML = '';
        agregarPregunta('', 'escala');
        mensajeEncuesta.textContent = '';
        const hoy = new Date();
        formEncuesta.fecha_cierre.min = hoy.getFullYear() + '-' + String(hoy.getMonth() + 1).padStart(2, '0') + '-' + String(hoy.getDate()).padStart(2, '0');
        modalEncuesta.hidden = false;
        document.body.classList.add('modal-abierto');
        instantanea = estadoFormulario();
        avisoDescarte = false;
        formEncuesta.titulo.focus();
    }

    function cerrarModal() {
        modalEncuesta.hidden = true;
        document.body.classList.remove('modal-abierto');
    }

    // el primer intento de cerrar con cambios avisa; el segundo descarta
    function intentarCerrarModal() {
        if (!avisoDescarte && estadoFormulario() !== instantanea) {
            avisoDescarte = true;
            mensajeEncuesta.textContent = 'Hay cambios sin guardar. Volvé a tocar Cancelar (o fuera del cuadro) para descartarlos.';
            return;
        }
        cerrarModal();
    }

    document.querySelector('#boton-nueva-encuesta').addEventListener('click', abrirModal);
    document.querySelector('#agregar-pregunta').addEventListener('click', function () {
        agregarPregunta('', 'escala');
        listaPreguntas.lastElementChild.querySelector('input').focus();
    });
    document.querySelector('#cancelar-encuesta').addEventListener('click', intentarCerrarModal);
    modalEncuesta.addEventListener('click', function (e) {
        if (e.target === modalEncuesta) intentarCerrarModal();
    });
    listaPreguntas.addEventListener('click', function (e) {
        const quitar = e.target.closest('.boton-quitar-campo');
        if (!quitar) return;
        quitar.parentElement.remove();
        actualizarQuitar();
    });

    formEncuesta.addEventListener('submit', async function (e) {
        e.preventDefault();
        mensajeEncuesta.textContent = '';

        const conTexto = Array.from(listaPreguntas.querySelectorAll('input')).filter(function (i) { return i.value.trim() !== ''; });
        if (!conTexto.length) {
            mensajeEncuesta.textContent = 'Agregá al menos una pregunta.';
            return;
        }

        botonGuardar.disabled = true;
        botonGuardar.textContent = 'Guardando...';
        try {
            const respuesta = await fetch('../php/encuestas-guardar.php', { method: 'POST', body: new FormData(formEncuesta) });
            const resultado = await respuesta.json();
            if (!resultado.exito) {
                mensajeEncuesta.textContent = resultado.error;
                return;
            }
            cerrarModal();
            await cargarListado();
            SIGSM.mostrarToast('Encuesta creada. Los pacientes ya la pueden responder desde el portal.');
        } catch (error) {
            mensajeEncuesta.textContent = 'No se pudo conectar con el servidor.';
        } finally {
            botonGuardar.disabled = false;
            botonGuardar.textContent = 'Crear encuesta';
        }
    });

    // ---- modal borrar ----
    const modalBorrar = document.querySelector('#modal-borrar');
    const botonConfirmarBorrado = document.querySelector('#borrar-confirmar');
    const errorBorrado = document.querySelector('#borrar-error');
    let idBorrar = null;

    function abrirBorrado(encuesta) {
        idBorrar = encuesta.id_encuesta;
        document.querySelector('#borrar-titulo').textContent = encuesta.titulo;
        errorBorrado.textContent = '';
        modalBorrar.hidden = false;
        document.body.classList.add('modal-abierto');
        document.querySelector('#borrar-cancelar').focus();
    }

    function cerrarBorrado() {
        modalBorrar.hidden = true;
        document.body.classList.remove('modal-abierto');
    }

    document.querySelector('#borrar-cancelar').addEventListener('click', cerrarBorrado);
    modalBorrar.addEventListener('click', function (e) {
        if (e.target === modalBorrar) cerrarBorrado();
    });

    botonConfirmarBorrado.addEventListener('click', async function () {
        botonConfirmarBorrado.disabled = true;
        try {
            await ejecutarAccion('eliminar', idBorrar);
            cerrarBorrado();
            await cargarListado();
            SIGSM.mostrarToast('Encuesta eliminada.');
        } catch (error) {
            errorBorrado.textContent = error.message;
        } finally {
            botonConfirmarBorrado.disabled = false;
        }
    });

    document.addEventListener('keydown', function (e) {
        if (e.key !== 'Escape') return;
        if (!modalEncuesta.hidden) intentarCerrarModal();
        if (!modalBorrar.hidden) cerrarBorrado();
    });

    // ================= VISTA REPORTE =================
    function barra(etiqueta, cantidad, total, clase) {
        const pct = porcentaje(cantidad, total);
        return '<div class="fila-barra">' +
            '<span class="fila-barra-etiqueta">' + etiqueta + '</span>' +
            '<span class="barra-resultado"><span class="barra-relleno ' + (clase || '') + '" style="width:' + pct + '%"></span></span>' +
            '<span class="fila-barra-valor">' + cantidad + ' <small>(' + pct + '%)</small></span>' +
        '</div>';
    }

    function renderPregunta(p, numero) {
        const total = Number(p.total);
        let cuerpo;

        if (!total) {
            cuerpo = '<p class="sin-respuestas">Todavía nadie respondió esta pregunta.</p>';
        } else if (p.tipo_pregunta === 'escala') {
            const redondeado = Math.round(p.promedio);
            cuerpo =
                '<div class="promedio-escala"><strong>' + decimal(p.promedio) + '</strong><span>/ 5 · ' + ETIQUETAS_ESCALA[redondeado] + '</span></div>' +
                [5, 4, 3, 2, 1].map(function (valor) {
                    return barra(valor + ' · ' + ETIQUETAS_ESCALA[valor], p.conteo[valor], total, '');
                }).join('');
        } else if (p.tipo_pregunta === 'si_no') {
            cuerpo = barra('Sí', p.conteo['Sí'], total, 'barra-si') + barra('No', p.conteo['No'], total, 'barra-no');
        } else {
            cuerpo = p.comentarios.length
                ? '<ul class="lista-comentarios">' + p.comentarios.map(function (c) {
                    return '<li><p>' + SIGSM.escapar(c.respuesta_texto) + '</p><small>' + SIGSM.formatearFecha(c.fecha_respuesta) + '</small></li>';
                }).join('') + '</ul>'
                : '<p class="sin-respuestas">Nadie dejó un comentario todavía.</p>';
        }

        return '<section class="tarjeta pregunta-reporte">' +
            '<p class="pregunta-reporte-tipo">Pregunta ' + numero + ' · ' + textoTipo(p.tipo_pregunta) + '</p>' +
            '<h3>' + SIGSM.escapar(p.texto_pregunta) + '</h3>' +
            '<p class="pregunta-reporte-total">' + SIGSM.textoPlural(total, 'respuesta', 'respuestas') + '</p>' +
            cuerpo +
        '</section>';
    }

    async function cargarReporte() {
        const contenido = document.querySelector('#contenido-reporte');
        const aviso = document.querySelector('#aviso-reporte');
        try {
            const respuesta = await fetch('../php/encuesta-reporte.php?id=' + encodeURIComponent(idReporte));
            const resultado = await respuesta.json();
            if (!resultado.exito) throw new Error(resultado.error);

            const e = resultado.datos;
            if (!e) {
                contenido.innerHTML = '';
                mostrarAviso(aviso, 'No encontramos esa encuesta.', false);
                return;
            }

            const estado = estadoEncuesta(e);
            const meta = ['Creada el ' + SIGSM.formatearFecha(e.fecha_creacion) + ' por ' + e.creada_por];
            if (e.fecha_cierre) meta.push((Number(e.vencida) ? 'Cerró el ' : 'Cierra el ') + SIGSM.formatearFecha(e.fecha_cierre));
            const botonEstado = Number(e.estado)
                ? '<button type="button" class="boton boton-secundario boton-chico" data-accion="cerrar">Cerrar encuesta</button>'
                : '<button type="button" class="boton boton-secundario boton-chico" data-accion="reabrir">Reabrir encuesta</button>';

            document.title = 'SIGSM - ' + e.titulo;
            contenido.innerHTML =
                '<section class="tarjeta cabecera-reporte">' +
                    '<div>' +
                        '<span class="pill-estado ' + estado.clase + '">' + estado.texto + '</span>' +
                        '<h2>' + SIGSM.escapar(e.titulo) + '</h2>' +
                        (e.descripcion ? '<p>' + SIGSM.escapar(e.descripcion) + '</p>' : '') +
                        '<p class="cabecera-reporte-meta">' + SIGSM.escapar(meta.join(' · ')) + '</p>' +
                    '</div>' +
                    '<div class="cabecera-reporte-total">' +
                        '<strong>' + e.respuestas + '</strong>' +
                        '<small>' + (e.respuestas === 1 ? 'paciente respondió' : 'pacientes respondieron') + '</small>' +
                        botonEstado +
                    '</div>' +
                '</section>' +
                '<div class="grilla-preguntas">' + e.preguntas.map(function (p, i) { return renderPregunta(p, i + 1); }).join('') + '</div>';

            contenido.querySelector('button[data-accion]').addEventListener('click', async function (ev) {
                const accion = ev.currentTarget.dataset.accion;
                ev.currentTarget.disabled = true;
                try {
                    await ejecutarAccion(accion, e.id_encuesta);
                    await cargarReporte();
                    SIGSM.mostrarToast(accion === 'cerrar' ? 'Encuesta cerrada: los pacientes ya no la ven.' : 'Encuesta reabierta.');
                } catch (error) {
                    SIGSM.mostrarToast(error.message, 'error');
                }
            });
        } catch (error) {
            contenido.innerHTML = '';
            mostrarAviso(aviso, 'No se pudo cargar el reporte. Revisá la conexión e intentá de nuevo.', true);
        }
    }

    if (idReporte) {
        document.querySelector('#vista-reporte').hidden = false;
        document.querySelector('#enlace-volver').innerHTML = SIGSM.icono('volver', 16) + ' Encuestas';
        cargarReporte();
    } else {
        document.querySelector('#vista-listado').hidden = false;
        cargarListado();
    }

});
