const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const five = require("johnny-five");
const board = new five.Board();

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

let temperatureSensor;
let phSensor;
let flowSensor;
let lcd;
let tempTimeout;
let phTimeout;

board.on("ready", function() {
  console.log("firmata working");
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
    // Monitor temperature changes
    temperatureSensor.on("change", function() {
      temperatureValue = temperatureSensor.celsius; 
      //console.log("Temp: " + temperatureValue); // log temperature value

      // Clear any existing timeouts and set a new one
      //if (tempTimeout) clearTimeout(tempTimeout);
      tempTimeout = setTimeout(() => {

        // Formatea el valor de temperatura para que siempre tenga 5 caracteres
        let temperatureString = temperatureValue.toFixed(1);
        console.log(temperatureString)

        temperatureString = ("" + temperatureString).slice(-5);  // Asegura 5 caracteres
        lcd.cursor(0, 0).print("Temp:" + temperatureString + "C");
      }, 5000);
      clearTimeout(tempTimeout);
    });
      // Monitor pH changes
  phSensor.on("data", function() {
    phValue = phSensor.value * (14.0 / 1023.0);
    //console.log("pH: " + phValue); // log pH value

    // Clear any existing timeouts and set a new one
    //if (phTimeout) clearTimeout(phTimeout);
    phTimeout = setTimeout(() => {
      // Formatea el valor de pH para que siempre tenga 5 caracteres
      let phString = phValue.toFixed(1);
      console.log(phString)
      phString = ("" + phString).slice(-5);  // Asegura 5 caracteres
      lcd.cursor(1, 0).print("pH  :" + phString + "");
    }, 5000);
    clearTimeout(phTimeout);
    // // Update LCD after 10 seconds
  });

});

const app = express();
app.use(bodyParser.json());

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
});

app.listen(3000, () => {
  console.log('Server is up on port 3000');
});
