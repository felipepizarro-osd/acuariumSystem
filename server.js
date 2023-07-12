const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const five = require("johnny-five");
const board = new five.Board();
const cors = require('cors');
let db = new sqlite3.Database('./arduinoData.db', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
  if (err) {
    console.error(err.message);
  }
  console.log('Connected to the arduinoData database.');
});

db.run(`CREATE TABLE IF NOT EXISTS SensorData (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  temperature REAL,
  ph REAL,
  flow INTEGER,
  createdAt TEXT
)`);

var corsOptions = {
  origin: 'http://localhost:3002', // cambia esto al puerto donde se ejecuta tu aplicación
  optionsSuccessStatus: 200,
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true
};

let temperatureSensor;
let phSensor;
let flowSensor;
let lcd;
let previousTemperatureValue = null;
let previousPhValue = null;
let led2;


board.on("ready", function() {
  console.log("firmata working");
  const led1 = new five.Led(4);
  led2 = new five.Led(7);
  led1.on();
  
  temperatureSensor = new five.Thermometer({
    controller: "DS18B20",
    pin: "2",
  });
  
  phSensor = new five.Sensor({
    pin: "A0",
    freq: 1000,
  });

  flowSensor = new five.Sensor.Digital(3); // Suponiendo que el sensor está en el pin 3.
  lcd = new five.LCD({
    pins: [13, 12, 11, 10, 9, 8], // Actualización de los pines según tu configuración
    backlight: 6,
    rows: 2,
    cols: 16
  });
  lcd.on("ready", function() {
    console.log("LCD ready");
    lcd.cursor(0, 0).print("pH value:");
    lcd.cursor(1, 0).print("Temp value:");
  });
  temperatureSensor.on("change", function() {
    const temperatureValue = temperatureSensor.celsius.toFixed(1);
  
    // Actualizar LCD solo si la temperatura ha cambiado más de 0.1 grados
    if (previousTemperatureValue === null || Math.abs(temperatureValue - previousTemperatureValue) >= 0.1) {
      // Asegúrate de que el valor de la temperatura siempre tenga 5 caracteres
      const temperatureString = ("     " + temperatureValue).slice(0);
      lcd.cursor(0, 0).print("Temp:" + temperatureString + " C  ");
      previousTemperatureValue = temperatureValue;
    }
  });
  phSensor.on("data", function() {
    const phValue = (this.value * (14.0 / 1023.0)).toFixed(1);
    // Actualizar LCD solo si el valor de pH ha cambiado más de 0.1
    if (previousPhValue === null || Math.abs(phValue - previousPhValue) >= 0.1) {
      // Asegúrate de que el valor de pH siempre tenga 5 caracteres
      const phString = ("     " + phValue).slice(0);
      lcd.cursor(1, 0).print("pH  :" + phString + "    ");
      previousPhValue = phValue;
    }
  })
});
const app = express();
app.use(bodyParser.json());
/*app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization'); // permite solicitudes de cualquier origen
  next()
})*/
app.use(cors());
app.get('/api/temperature', async (req, res) => {
  
  if (!temperatureSensor) {
    res.status(500).send("Board not ready yet");
    return;
  }

  // Guardar los datos del sensor en la base de datos SQLite
  db.run(`INSERT INTO SensorData(temperature, createdAt) VALUES(?, ?)`, [temperatureSensor.celsius, new Date()], function(err) {
    if (err) {
      return console.log(err.message);
    }
  });

  res.send({ temperature: temperatureSensor.celsius });
  led2.blink(500);
  setTimeout(() => {
    led2.stop().off();
  }, 5000);
});

// Función para convertir el valor en bruto del sensor de pH a un valor de pH real
function convertToPH(sensorValue) {
  // Valores de referencia de calibración
  const referenceValues = {
    pH7: 7.0,  // Lectura del sensor a pH 7.0
    pH4: 4.0,  // Lectura del sensor a pH 4.0
  };

  const m = (referenceValues.pH7 - referenceValues.pH4) / (sensorValue.pH7 - sensorValue.pH4);
  const b = referenceValues.pH7 - m * sensorValue.pH7;

  const pHValue = m * sensorValue + b;

  return pHValue;
}

app.get('/api/ph', async (req, res) => {
  if (!phSensor) {
    res.status(500).send('Board not ready yet');
    return;
  }

  // Leer el valor en bruto del sensor de pH
  const rawValue = phSensor.value * (14.0/1023.0);

  // Guardar los datos del sensor en la base de datos SQLite
  db.run(`INSERT INTO SensorData(ph, createdAt) VALUES(?, ?)`, [rawValue, new Date()], function(err) {
    if (err) {
      return console.log(err.message);
    }
  });

  res.send({ ph: rawValue });
  led2.blink(500);
  setTimeout(() => {
    led2.stop().off();
  }, 5000);

});

app.get('/api/flow', async (req, res) => {
  if (!flowSensor) {
    res.status(500).send('Board not ready yet');
    return;
  }

  // Leer el valor en bruto del sensor de flujo
  const rawValue = flowSensor.value;

  // Guardar los datos del sensor en la base de datos SQLite
  db.run(`INSERT INTO SensorData(flow, createdAt) VALUES(?, ?)`, [rawValue, new Date()], function(err) {
    if (err) {
      return console.log(err.message);
    }
  });

  res.send({ flow: rawValue });
  led2.blink(500);
  setTimeout(() => {
    led2.stop().off();
  }, 5000);

});
app.get('/api/latest-records', async (req, res) => {
  let limit = req.query.limit; // La cantidad de registros que quieres obtener.
  if(!limit) limit = 10; // Un valor por defecto si no se especifica 'limit' en la petición.

  // Consulta SQLite para obtener los últimos registros
  let sql = `SELECT * FROM SensorData ORDER BY createdAt DESC LIMIT ?`;

  db.all(sql, [limit], (err, rows) => {
    if (err) {
      res.status(400).json({"error":err.message});
      return;
    }
    res.json({
        "message":"success",
        "data":rows
    })
    led2.blink(500);
    setTimeout(() => {
      led2.stop().off();
    }, 5000);
  });
});

app.listen(3000, () => {
  console.log('Server is up on port 3000');
});
