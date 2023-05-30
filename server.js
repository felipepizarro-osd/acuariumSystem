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

board.on("ready", function() {
  temperatureSensor = new five.Thermometer({
    controller: "LM35",
    pin: "A0",
  });

  phSensor = new five.Sensor({
    pin: "A1",
    freq: 1000,
  });

  servo = new five.Servo(10);
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
  
    servo.to(position); // Mover el servomotor a la posición especificada
    res.send({ success: true });
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

app.get('/api/ph', async (req, res) => {
  if (!phSensor) {
    res.status(500).send("Board not ready yet");
    return;
  }

  // Aquí necesitarás convertir el valor en bruto del sensor de pH a un valor de pH real.

  // Guardar los datos del sensor en MongoDB
  const sensorData = new SensorData({
    ph: phSensor.value,
    createdAt: new Date(),
  });
  await sensorData.save();

  res.send({ ph: phSensor.value });
});

app.listen(3000, () => {
  console.log('Server is up on port 3000');
});
