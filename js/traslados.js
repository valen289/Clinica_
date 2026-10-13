document.addEventListener('DOMContentLoaded', async function () {

    const sesion = await SIGSM.protegerPagina('traslados', null);
    if (!sesion) return;

    const formulario = document.querySelector('#form-despacho');
    const mensaje = document.querySelector('#mensaje-form');
    const tabla = document.querySelector('#tabla-traslados');
    const selectRuta = document.querySelector('#id_ruta');
    let rutasCache = [];

    function llenarSelect(select, opciones, campoId, textoFn) {
        while (select.options.length > 1) select.remove(1); // deja solo el placeholder ("Seleccione...")
        opciones.forEach(function (opcion) {
            const elemento = document.createElement('option');
            elemento.value = opcion[campoId];
            elemento.textContent = textoFn(opcion);
            select.appendChild(elemento);
        });
    }

    function claseEstado(estado) {
        if (['En curso', 'Retornando'].indexOf(estado) !== -1) return 'pill-azul';
        if (['Llegado a destino', 'Finalizado'].indexOf(estado) !== -1) return 'pill-verde';
        return 'pill-naranja';
    }

    function renderFilaTraslado(t) {
        const esFinalizado = (t.estado === 'Finalizado');
        return '<tr>' +
            '<td>' + SIGSM.escapar(t.matricula) + '</td>' +
            '<td>' + SIGSM.escapar(t.conductor_nombre + ' ' + t.conductor_apellido) + '</td>' +
            '<td>' + SIGSM.escapar(t.origen + ' → ' + t.destino) + '</td>' +
            '<td>' + SIGSM.escapar(t.fecha) + '</td>' +
            '<td>' + SIGSM.escapar(t.hora_salida) + '</td>' +
            '<td><span class="pill-estado ' + claseEstado(t.estado) + '">' + SIGSM.escapar(t.estado) + '</span></td>' +
            '<td>' +
                (esFinalizado ? '' : '<button type="button" class="enlace-accion" data-accion="avanzar" data-id="' + t.id_traslado + '">Avanzar →</button>') +
            '</td>' +
        '</tr>';
    }

    async function cargarDatos() {
        const respuesta = await fetch('../php/traslados-listar.php');
        const resultado = await respuesta.json();
        if (!resultado.exito) return;

        const datos = resultado.datos;
        rutasCache = datos.rutas;

        llenarSelect(document.querySelector('#id_ambulancia'), datos.ambulancias_disponibles, 'id_ambulancia', function (a) { return a.matricula; });
        llenarSelect(document.querySelector('#id_conductor'), datos.conductores_disponibles, 'id_ci', function (c) { return c.nombre + ' ' + c.apellido; });
        llenarSelect(document.querySelector('#id_acompanante'), datos.acompanantes, 'id_ci', function (a) { return a.nombre + ' ' + a.apellido; });
        llenarSelect(document.querySelector('#id_elemento'), datos.elementos, 'id_elemento', function (e) { return e.tipo; });
        llenarSelect(selectRuta, datos.rutas, 'id_ruta', function (r) { return r.origen + ' → ' + r.destino; });

        tabla.innerHTML = datos.traslados.map(renderFilaTraslado).join('');
    }

    tabla.addEventListener('click', async function (e) {
        const boton = e.target.closest('[data-accion="avanzar"]');
        if (!boton) return;

        const datos = new FormData();
        datos.append('id_traslado', boton.dataset.id);

        await fetch('../php/traslados-avanzar.php', { method: 'POST', body: datos });
        await cargarDatos();
    });

    formulario.addEventListener('submit', async function (e) {
        e.preventDefault();
        mensaje.textContent = '';

        const datos = new FormData(formulario);

        try {
            const respuesta = await fetch('../php/traslados-despachar.php', {
                method: 'POST',
                body: datos
            });
            const resultado = await respuesta.json();

            if (resultado.exito) {
                formulario.reset();
                await cargarDatos();
            } else {
                mensaje.textContent = resultado.error;
            }
        } catch (error) {
            mensaje.textContent = 'No se pudo conectar con el servidor.';
        }
    });

    // ---- Mapa de la ruta (Leaflet + OpenStreetMap + Geoapify) ----

    const GEOAPIFY_API_KEY = '4572a7318c164b3b873097a1f7b2c618';

    const iconoAmbulancia = L.icon({
        iconUrl: '../assets/img/ambulancia.svg',
        iconSize: [38, 45],
        iconAnchor: [19, 45],
    });

    const iconoDestino = L.icon({
        iconUrl: '../assets/img/destino.svg',
        iconSize: [38, 45],
        iconAnchor: [19, 45],
    });

    const mapa = L.map('mapa-ruta').setView([-34.9011, -56.1645], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
    }).addTo(mapa);

    const estadoMapa = document.querySelector('#mapa-estado');
    let marcadorOrigen = null;
    let marcadorDestino = null;
    let lineaRuta = null;

    function limpiarMapa() {
        if (marcadorOrigen) { mapa.removeLayer(marcadorOrigen); marcadorOrigen = null; }
        if (marcadorDestino) { mapa.removeLayer(marcadorDestino); marcadorDestino = null; }
        if (lineaRuta) { mapa.removeLayer(lineaRuta); lineaRuta = null; }
    }

    async function geocodificar(direccion) {
        const texto = direccion + ', Uruguay';
        const url = 'https://api.geoapify.com/v1/geocode/search?' +
            'text=' + encodeURIComponent(texto) +
            '&filter=countrycode:uy' +
            '&lang=es&limit=1&format=json&apiKey=' + GEOAPIFY_API_KEY;

        const respuesta = await fetch(url);
        const dato = await respuesta.json();
        if (!dato.results || dato.results.length === 0) return null;

        return { lat: dato.results[0].lat, lon: dato.results[0].lon };
    }

    async function trazarRuta(origenTexto, destinoTexto) {
        limpiarMapa();
        estadoMapa.className = 'mapa-estado';
        estadoMapa.textContent = 'Buscando la ruta en el mapa…';

        try {
            const [origen, destino] = await Promise.all([
                geocodificar(origenTexto),
                geocodificar(destinoTexto),
            ]);

            if (!origen || !destino) {
                estadoMapa.className = 'mapa-estado mapa-error';
                estadoMapa.textContent = 'No se pudo ubicar el origen y/o el destino de esta ruta en el mapa.';
                return;
            }

            marcadorOrigen = L.marker([origen.lat, origen.lon], { icon: iconoAmbulancia }).addTo(mapa);
            marcadorDestino = L.marker([destino.lat, destino.lon], { icon: iconoDestino }).addTo(mapa);

            const urlRuta = 'https://api.geoapify.com/v1/routing?' +
                'waypoints=' + origen.lat + ',' + origen.lon + '|' + destino.lat + ',' + destino.lon +
                '&mode=drive' +
                '&units=metric' +
                '&lang=es' +
                '&apiKey=' + GEOAPIFY_API_KEY;

            const respuestaRuta = await fetch(urlRuta);
            const routeo = await respuestaRuta.json();

            if (!routeo.features || routeo.features.length === 0) {
                mapa.fitBounds(L.latLngBounds([marcadorOrigen.getLatLng(), marcadorDestino.getLatLng()]), { padding: [40, 40] });
                estadoMapa.className = 'mapa-estado mapa-error';
                estadoMapa.textContent = 'Se ubicaron el origen y el destino, pero no se pudo calcular el trayecto entre ambos.';
                return;
            }

            const routeoDatos = routeo.features[0].properties;
            const puntosRuta = routeo.features[0].geometry.coordinates.map(function (coordenada) {
                return [coordenada[1], coordenada[0]]; // Geoapify da [lon, lat]; Leaflet necesita [lat, lon]
            });

            lineaRuta = L.polyline(puntosRuta, { color: '#2f6fed', weight: 5 }).addTo(mapa);
            mapa.fitBounds(lineaRuta.getBounds(), { padding: [40, 40] });

            const distanciaKm = (routeoDatos.distance / 1000).toFixed(1);
            const tiempoMin = Math.round(routeoDatos.time / 60);
            estadoMapa.className = 'mapa-estado';
            estadoMapa.textContent = 'Distancia: ' + distanciaKm + ' km — Tiempo estimado: ' + tiempoMin + ' min';
        } catch (error) {
            estadoMapa.className = 'mapa-estado mapa-error';
            estadoMapa.textContent = 'No se pudo conectar con el servicio de mapas.';
        }
    }

    selectRuta.addEventListener('change', function () {
        const ruta = rutasCache.find(function (r) { return String(r.id_ruta) === selectRuta.value; });

        if (!ruta) {
            limpiarMapa();
            estadoMapa.className = 'mapa-estado';
            estadoMapa.textContent = 'Seleccioná una ruta en el formulario de despacho para verla en el mapa.';
            return;
        }

        trazarRuta(ruta.origen, ruta.destino);
    });

    cargarDatos();

});
