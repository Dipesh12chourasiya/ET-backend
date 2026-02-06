const asyncHandler = require("express-async-handler");
const Category = require("../model/Category");
const Transaction = require("../model/Transaction");

const categoryController = {
  // ================= CREATE =================
  create: asyncHandler(async (req, res) => {
    const { name, type } = req.body;

    // 🔐 AUTH CHECK (IMPORTANT)
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Unauthorized. User not found." });
    }

    if (!name || !type) {
      return res.status(400).json({ message: "Name and type are required" });
    }

    const normalizedName = name.toLowerCase();
    const normalizedType = type.toLowerCase();

    const validTypes = ["income", "expense"];
    if (!validTypes.includes(normalizedType)) {
      return res.status(400).json({ message: "Invalid category type" });
    }

    const categoryExists = await Category.findOne({
      name: normalizedName,
      user: req.user.id,
    });

    if (categoryExists) {
      return res.status(409).json({
        message: `Category ${normalizedName} already exists`,
      });
    }

    const category = await Category.create({
      name: normalizedName,
      type: normalizedType,
      user: req.user.id, // ✅ now guaranteed
    });

    res.status(201).json(category);
  }),

  // ================= LIST =================
  lists: asyncHandler(async (req, res) => {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const categories = await Category.find({ user: req.user.id });
    res.status(200).json(categories);
  }),

  // ================= UPDATE =================
  update: asyncHandler(async (req, res) => {
    const { categoryId } = req.params;
    const { type, name } = req.body;

    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    if (category.user.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const oldName = category.name;

    if (name) category.name = name.toLowerCase();
    if (type) category.type = type.toLowerCase();

    const updatedCategory = await category.save();

    // Update related transactions
    if (oldName !== updatedCategory.name) {
      await Transaction.updateMany(
        { user: req.user.id, category: oldName },
        { $set: { category: updatedCategory.name } }
      );
    }

    res.json(updatedCategory);
  }),

  // ================= DELETE =================
  delete: asyncHandler(async (req, res) => {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    if (category.user.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const defaultCategory = "uncategorized";

    await Transaction.updateMany(
      { user: req.user.id, category: category.name },
      { $set: { category: defaultCategory } }
    );

    await category.deleteOne();

    res.json({
      message: "Category removed and related transactions updated",
    });
  }),
};

module.exports = categoryController;
