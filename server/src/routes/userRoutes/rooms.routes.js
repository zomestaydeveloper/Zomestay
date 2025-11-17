const express = require('express');
const { getAvailableRooms } = require('../../controllers/userController/rooms.controller');
const router = express.Router();

router.get('/rooms', getAvailableRooms);

module.exports = router;
