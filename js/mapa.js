// 1. Inicializar el mapa centrado en Montevideo, Uruguay
const mapa = L.map('visualizar').setView([-34.9011, -56.1645], 15);

// 2. Cargar capa de mapa de OpenStreetMap
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap'
}).addTo(mapa);

// 3. Referencias a los elementos del HTML
const ingresarO = document.getElementById('ingresarO');
const ubicar = document.getElementById('ubicar');
const departamento = document.getElementById('departamento');
const direccion = document.getElementById('dir');
const insertlat = document.getElementById('lat');
const insertlng = document.getElementById('lng');

// 4. Configurar iconos personalizados
const ImagenMarcador = L.icon({
  iconUrl: '../img/ambulancia.png',
  iconSize: [38, 45]
});

const ImagenDestino = L.icon({
  iconUrl: '../img/destino.png',
  iconSize: [38, 45]
});

// 5. Crear marcador principal en el mapa
const marcador = L.marker([-34.9011, -56.1645], {
  draggable: true,
  icon: ImagenMarcador
}).addTo(mapa);

// 6. Evento al presionar 'Ingresar Origen'
ingresarO.addEventListener('click', () => {
  let lugarO = marcador.getLatLng();
  insertlat.value = lugarO.lat;
  insertlng.value = lugarO.lng;

  // Añadir marcador de destino en posición de prueba
  L.marker([-34.900362955713476, -56.163353436677056], { 
    draggable: true, 
    icon: ImagenDestino 
  }).addTo(mapa);
});

// 7. Evento al presionar 'Ubicar en Mapa' (Búsqueda por dirección con Geoapify)
ubicar.addEventListener('click', async () => {
  if (!direccion.value) {
    alert("Por favor ingresa una dirección.");
    return;
  }

  const texto = `${direccion.value}, ${departamento.value}, Uruguay`;
  const url = `https://api.geoapify.com/v1/geocode/search?` +
    `text=${encodeURIComponent(texto)}` +
    `&filter=countrycode:uy` +
    `&lang=es&limit=1&format=json&apiKey=4572a7318c164b3b873097a1f7b2c618`;

  try {
    const respuesta = await fetch(url);
    const dato = await respuesta.json();

    if (dato.results && dato.results.length > 0) {
      const resultado = dato.results[0];
      const lat = resultado.lat;
      const lon = resultado.lon;

      // Mover el mapa y añadir el nuevo marcador
      mapa.setView([lat, lon], 16);
      
      L.marker([lat, lon], { 
        draggable: true, 
        icon: ImagenMarcador 
      }).addTo(mapa);

      alert(`Coordenadas halladas:\nLatitud: ${lat}\nLongitud: ${lon}`);
    } else {
      alert("No se encontró la dirección.");
    }
  } catch (error) {
    console.error("Error consultando la API:", error);
    alert("Ocurrió un error al buscar la dirección.");
  }
});

