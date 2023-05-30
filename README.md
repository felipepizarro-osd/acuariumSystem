# Proyecto de Monitoreo de Sensores y Control de Servomotor

Este proyecto utiliza un Arduino para recolectar datos de varios sensores y controlar un servomotor. Los datos del sensor se almacenan en una base de datos MongoDB y están disponibles a través de una API RESTful desarrollada con Node.js y Express.

## Requisitos

- Node.js y npm
- MongoDB
- Arduino con firmware StandardFirmataPlus cargado
- Sensores y un servomotor conectados a tu Arduino

## Configuración

1. Instala las dependencias del proyecto con `npm install`.
2. Conecta tu Arduino a tu computadora y carga el firmware StandardFirmataPlus. Puedes encontrar instrucciones para hacerlo [aquí](https://github.com/firmata/arduino).
3. Asegúrate de que tu base de datos MongoDB esté ejecutándose. Si estás ejecutándola localmente, puede ser tan simple como ejecutar `mongod` en la línea de comandos.
4. Ejecuta el servidor con `npm run dev`.

## API

La API proporciona las siguientes rutas:

- GET `/api/temperature`: Devuelve la temperatura actual medida por el sensor de temperatura.
- GET `/api/ph`: Devuelve el nivel de pH actual medido por el sensor de pH.
- POST `/api/servo`: Mueve el servomotor a una posición específica. La posición debe proporcionarse en el cuerpo de la solicitud como un objeto JSON, por ejemplo, `{ "position": 90 }`.

## Problemas conocidos

Si te encuentras con el error "Resource temporarily unavailable Cannot lock port", intenta desconectar y volver a conectar tu Arduino, o reinicia tu computadora.

## Contribuciones

Las contribuciones a este proyecto son bienvenidas. Por favor, abre un problema o una solicitud de extracción si deseas contribuir.
