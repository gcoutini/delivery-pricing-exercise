const express = require('express');
const bodyParser = require('body-parser');
const { convert } = require('any-to-any');
const app = express();
const port = 3000;
const fs = require('fs');
const vehicle_list = require('./vehicle-types');
const messages = require('./messages.json');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.post('/quotes', (req, res) => {
  const { pickup_postcode, delivery_postcode, vehicle } = req.body;
  const pickup_base10 = convert(pickup_postcode, 36, 10);
  const delivery_base10 = convert(delivery_postcode, 36, 10);
  const invalidCode = pickup_postcode.length != 7 || delivery_postcode.length != 7;
  const validVehicle = vehicle_list.some((v) => v.type === vehicle);
  const { markup: vehicleMarkup } = vehicle_list.find((v) => v.type === vehicle);

  if (invalidCode) {
    res.status(400).send({ error: messages['400-001'] });
  }
  if (!validVehicle) {
    res.status(400).send({ error: messages['400-002'] });
  }
  let basePrice = Math.floor((pickup_base10 - delivery_base10) / 100000000);
  basePrice = basePrice < 0 ? Math.abs(basePrice) : basePrice;
  basePrice = Math.floor(basePrice + (basePrice * (vehicleMarkup/100)));
  let price_list = [];
  let raw_carrier_data = fs.readFileSync('carrier-data.json');
  let carrier_data = JSON.parse(raw_carrier_data);
  for (let i = 0; i < carrier_data.length; i++) {
    let price = 0;
    price = basePrice + carrier_data[i].base_price;
    for (let j = 0; j < carrier_data[i].services.length; j++) {
      if (carrier_data[i].services[j].vehicles.some((v) => v === vehicle)) {
        price = (carrier_data[i].services[j].markup ? price + ((price * carrier_data[i].services[j].markup)/100) : price);
        price_list.push({ service: carrier_data[i].carrier_name, price: Math.floor(price), delivery_time: carrier_data[i].services[j].delivery_time });
      }
    }
  }
  
  const response = {
    pickup_postcode: pickup_postcode,
    delivery_postcode: delivery_postcode,
    vehicle: vehicle,
    price_list: price_list
  };
  res.send(response);
})

app.listen(port, () => {
  console.log(`Server running on port ${port}`)
});