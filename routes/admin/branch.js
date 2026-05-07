const express = require('express');
const router = express.Router();
const branchController = require('../../controllers/branchController');

router.get('/', branchController.getAllBranches);
router.post('/', branchController.createBranch); // Note: Used in onboarding without token
router.put('/:id', branchController.updateBranch);
router.delete('/:id', branchController.deleteBranch);

module.exports = router;
