const express = require('express');
const router = express.Router();
const branchController = require('../../controllers/branchController');

router.get('/', branchController.getAllBranches);
router.get('/:id', branchController.getBranch);
router.post('/', branchController.createBranch); // Note: Used in onboarding without token
router.put('/:id', branchController.updateBranch);
router.delete('/:id', branchController.deleteBranch);
router.get('/:id/logs', branchController.getBranchLogs);

module.exports = router;
