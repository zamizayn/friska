'use strict';
const productsData = require('../data/product');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    for (const categoryName of Object.keys(productsData)) {
      const [categoryRecords] = await queryInterface.sequelize.query(
        `INSERT INTO "Categories" (name, "createdAt", "updatedAt") VALUES ('${categoryName}', NOW(), NOW()) RETURNING id;`
      );
      const categoryId = categoryRecords[0].id;

      const productsToInsert = productsData[categoryName].map(p => ({
        name: p.name,
        price: p.price,
        description: p.description,
        image: p.image,
        categoryId: categoryId,
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      await queryInterface.bulkInsert('Products', productsToInsert);
    }
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Products', null, {});
    await queryInterface.bulkDelete('Categories', null, {});
  }
};
