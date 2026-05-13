const { Offer } = require('./models');

async function checkOffer() {
  const offer = await Offer.findOne({ where: { code: 'WELCOME50' } });
  console.log(JSON.stringify(offer, null, 2));
}

checkOffer();
