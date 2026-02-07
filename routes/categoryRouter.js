const express = require("express");
const usersController = require("../controllers/usersCtrl");
const isAuthenticated = require("../middlewares/isAuth");
const categoryController = require("../controllers/categoryCtrl");
const categoryRouter = express.Router();

//!add
categoryRouter.post( "/create", isAuthenticated, categoryController.create );

//! lists
categoryRouter.get( "/lists", isAuthenticated, categoryController.lists);

//! update
categoryRouter.put( "/update/:categoryId", isAuthenticated,categoryController.update);

//! delete
categoryRouter.delete("/delete/:id",isAuthenticated,categoryController.delete);

module.exports = categoryRouter;
