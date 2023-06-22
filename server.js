const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const five = require("johnny-five");
const board = new five.Board();

// Conectarse a MongoDB
mongoose.connect('mongodb://localhost/arduinoData', { useNewUrlParser: true, useUnifiedTopology: true });

// Definir un modelo de Mongoose para los datos del sensor
const SensorData = mongoose.model('SensorData', new mongoose.Schema({
  temperature: Number,
  ph: Number,
  createdAt: Date,
}));

let temperatureSensor;
let phSensor;
let flowSensor;

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

  servo = new five.Servo(5);
  flowSensor = new five.Sensor.Digital(3); // Suponiendo que el sensor está en el pin 3.
});

const app = express();
app.use(bodyParser.json());

app.post('/api/moveServo', (req, res) => {
    const { position } = req.body;
    
    if (!servo) {
      res.status(500).send("Board not ready yet");
      return;
    }
    
    if (typeof position !== "number" || position < 0 || position > 180) {
      res.status(400).send("Invalid position");
      return;
    }
    if (typeof position == 90){
      servo.stop
    }else{
    servo.to(position); // Mover el servomotor a la posición especificada
    res.send({ success: true });
    }
  });

app.get('/api/temperature', async (req, res) => {
  if (!temperatureSensor) {
    res.status(500).send("Board not ready yet");
    return;
  }

  // Guardar los datos del sensor en MongoDB
  const sensorData = new SensorData({
    temperature: temperatureSensor.celsius,
    createdAt: new Date(),
  });
  await sensorData.save();

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

  // Convertir el valor en bruto a un valor de pH real
  //const pHValue = convertToPH(rawValue);
  console.log(typeof phSensor.value);
  // Guardar los datos del sensor en MongoDB
  const sensorData = new SensorData({
    ph: rawValue,
    createdAt: new Date(),
  });
  await sensorData.save();

  res.send({ ph: rawValue });
});
app.get('/api/flow', async (req, res) => {
  if (!flowSensor) {
    res.status(500).send('Board not ready yet');
    return;
  }

  // Leer el valor en bruto del sensor de flujo
  const rawValue = flowSensor.value;

  // Guardar los datos del sensor en MongoDB
  const sensorData = new SensorData({
    flow: rawValue,
    createdAt: new Date(),
  });
  await sensorData.save();

  res.send({ flow: rawValue });
});

app.listen(3000, () => {
  console.log('Server is up on port 3000');
  
});
