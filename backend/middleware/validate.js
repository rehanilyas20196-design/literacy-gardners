const { body, param, query, validationResult } = require('express-validator');

function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map((e) => ({ field: e.param, message: e.msg })),
    });
  }
  next();
}

// Team routes
const validateTeamMember = [
  body('name').trim().notEmpty().withMessage('name is required').isLength({ max: 100 }).withMessage('name too long'),
  body('role').trim().notEmpty().withMessage('role is required').isLength({ max: 100 }).withMessage('role too long'),
  body('bio').optional().trim().isLength({ max: 1000 }).withMessage('bio too long'),
  body('initial').trim().notEmpty().withMessage('initial is required').isLength({ max: 5 }).withMessage('initial too long'),
  handleValidationErrors,
];

// Book routes
const validateBook = [
  body('title').trim().notEmpty().withMessage('title is required').isLength({ max: 200 }).withMessage('title too long'),
  body('author_name').trim().notEmpty().withMessage('author_name is required').isLength({ max: 100 }).withMessage('author_name too long'),
  body('category').trim().notEmpty().withMessage('category is required').isLength({ max: 50 }).withMessage('category too long'),
  body('description').optional().trim().isLength({ max: 2000 }).withMessage('description too long'),
  body('price').optional().isNumeric().withMessage('price must be a number'),
  // '' means "no sale price" (the admin form sends an empty string)
  body('sale_price')
    .optional({ nullable: true })
    .if((value) => value !== '')
    .isNumeric()
    .withMessage('sale_price must be a number'),
  body('pages').optional().isInt({ min: 1 }).withMessage('pages must be a positive integer'),
  body('rating').optional().isFloat({ min: 0, max: 5 }).withMessage('rating must be between 0 and 5'),
  body('image').optional({ nullable: true }).isString().isLength({ max: 500 }).withMessage('image too long'),
  body('template').optional({ nullable: true }).isIn(['hardcover', 'paperback', 'spiral']).withMessage('invalid template'),
  handleValidationErrors,
];

// Lead routes
const validateLead = [
  body('name').trim().notEmpty().withMessage('name is required').isLength({ max: 100 }).withMessage('name too long'),
  body('email')
    .trim()
    .notEmpty()
    .withMessage('email is required')
    .isEmail()
    .withMessage('invalid email')
    .normalizeEmail(),
  body('message').optional().trim().isLength({ max: 2000 }).withMessage('message too long'),
  body('type')
    .optional()
    .isIn(['general', 'get-published', 'competition', 'workshop', 'author'])
    .withMessage('invalid type'),
  handleValidationErrors,
];

// Newsletter
const validateNewsletter = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('email is required')
    .isEmail()
    .withMessage('invalid email')
    .normalizeEmail(),
  handleValidationErrors,
];

// Auth routes
const validateRegister = [
  body('name').trim().notEmpty().withMessage('name is required').isLength({ max: 100 }),
  body('email').trim().notEmpty().withMessage('email is required').isEmail().withMessage('invalid email').normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('password must be at least 8 characters'),
  handleValidationErrors,
];

const validateLogin = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('username or email is required')
    .customSanitizer((value) => {
      const v = String(value);
      return v.includes('@') ? v.toLowerCase() : v;
    })
    .isLength({ min: 1 })
    .withMessage('username or email is required'),
  body('password').notEmpty().withMessage('password is required'),
  handleValidationErrors,
];

const validateForgotPassword = [
  body('email').trim().notEmpty().withMessage('email is required').isEmail().withMessage('invalid email').normalizeEmail(),
  handleValidationErrors,
];

const validateResetPassword = [
  body('token').trim().notEmpty().withMessage('token is required').isLength({ min: 16, max: 200 }).withMessage('invalid token'),
  body('password').isLength({ min: 8 }).withMessage('password must be at least 8 characters'),
  handleValidationErrors,
];

// Author registration (account details required for payouts)
const validateRegisterAuthor = [
  body('name').trim().notEmpty().withMessage('name is required').isLength({ max: 100 }),
  body('email').trim().notEmpty().withMessage('email is required').isEmail().withMessage('invalid email').normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('password must be at least 8 characters'),
  body('phone').trim().notEmpty().withMessage('phone is required').isLength({ max: 20 }).withMessage('phone too long'),
  body('account_title').trim().notEmpty().withMessage('account_title is required').isLength({ max: 100 }),
  body('account_number').trim().notEmpty().withMessage('account_number is required').isLength({ max: 40 }),
  body('iban').optional({ nullable: true }).trim().isLength({ max: 40 }).withMessage('iban too long'),
  handleValidationErrors,
];

// Reviews
const validateReview = [
  param('id').isUUID().withMessage('invalid book id'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('rating must be between 1 and 5'),
  body('title').optional({ nullable: true }).trim().isLength({ max: 200 }).withMessage('title too long'),
  body('body').optional({ nullable: true }).trim().isLength({ max: 2000 }).withMessage('body too long'),
  handleValidationErrors,
];

// Checkout order
const validateOrder = [
  body('name').trim().notEmpty().withMessage('name is required').isLength({ max: 100 }),
  body('email').trim().notEmpty().withMessage('email is required').isEmail().withMessage('invalid email').normalizeEmail(),
  body('phone').trim().notEmpty().withMessage('phone is required').isLength({ max: 20 }).withMessage('phone too long'),
  body('address').trim().notEmpty().withMessage('address is required').isLength({ max: 500 }).withMessage('address too long'),
  body('notes').optional({ nullable: true }).trim().isLength({ max: 2000 }).withMessage('notes too long'),
  body('items').isArray({ min: 1 }).withMessage('items must be a non-empty array'),
  body('items.*.slug').trim().notEmpty().withMessage('item slug is required'),
  body('items.*.qty').isInt({ min: 1 }).withMessage('item qty must be a positive integer'),
  body('items.*.price').isNumeric().withMessage('item price must be a number'),
  body('subtotal').isNumeric().withMessage('subtotal must be a number'),
  body('shipping').isNumeric().withMessage('shipping must be a number'),
  body('total').isNumeric().withMessage('total must be a number'),
  body('payment_method').isIn(['cod']).withMessage('invalid payment method'),
  handleValidationErrors,
];

const validateQuote = [
  body('name').trim().notEmpty().withMessage('name is required').isLength({ max: 100 }).withMessage('name too long'),
  body('email').trim().notEmpty().withMessage('email is required').isEmail().withMessage('invalid email').normalizeEmail(),
  body('phone').optional({ nullable: true }).trim().isLength({ max: 20 }).withMessage('phone too long'),
  body('book_title').trim().notEmpty().withMessage('book_title is required').isLength({ max: 200 }).withMessage('book_title too long'),
  body('pages').optional().isInt({ min: 0 }).withMessage('pages must be a non-negative integer'),
  body('estimated_total').optional().isNumeric().withMessage('estimated_total must be a number'),
  body('extra_copies').optional().isInt({ min: 0 }).withMessage('extra_copies must be a non-negative integer'),
  body('manuscript_file').optional({ nullable: true }).trim().isLength({ max: 1000 }).withMessage('manuscript_file too long'),
  body('front_cover_file').optional({ nullable: true }).trim().isLength({ max: 1000 }).withMessage('front_cover_file too long'),
  body('back_cover_file').optional({ nullable: true }).trim().isLength({ max: 1000 }).withMessage('back_cover_file too long'),
  handleValidationErrors,
];

const validateBookId = [
  param('id').isUUID().withMessage('invalid book id'),
  handleValidationErrors,
];

const validateBookSlug = [
  param('slug').trim().notEmpty().withMessage('slug is required'),
  handleValidationErrors,
];

const validateOrderId = [
  param('id').isUUID().withMessage('invalid order id'),
  handleValidationErrors,
];

const validateReviewId = [
  param('id').isUUID().withMessage('invalid review id'),
  handleValidationErrors,
];

const validateStatus = (field = 'status', allowed = []) => [
  body(field).isIn(allowed).withMessage(`invalid ${field}`),
  handleValidationErrors,
];

module.exports = {
  handleValidationErrors,
  validateTeamMember,
  validateBook,
  validateLead,
  validateNewsletter,
  validateRegister,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
  validateRegisterAuthor,
  validateReview,
  validateOrder,
  validateQuote,
  validateBookId,
  validateBookSlug,
  validateOrderId,
  validateReviewId,
  validateStatus,
};
