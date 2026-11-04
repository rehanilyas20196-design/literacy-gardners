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
  body('sale_price').optional().isNumeric().withMessage('sale_price must be a number'),
  body('pages').optional().isInt({ min: 1 }).withMessage('pages must be a positive integer'),
  body('rating').optional().isFloat({ min: 0, max: 5 }).withMessage('rating must be between 0 and 5'),
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
    .isIn(['general', 'get-published', 'competition', 'workshop'])
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
    .isLength({ min: 1 })
    .withMessage('username or email is required'),
  body('password').notEmpty().withMessage('password is required'),
  handleValidationErrors,
];

// Quote routes
const validateQuote = [
  body('name').trim().notEmpty().withMessage('name is required').isLength({ max: 100 }).withMessage('name too long'),
  body('email').trim().notEmpty().withMessage('email is required').isEmail().withMessage('invalid email').normalizeEmail(),
  body('phone').optional().trim().isLength({ max: 20 }).withMessage('phone too long'),
  body('book_title').trim().notEmpty().withMessage('book_title is required').isLength({ max: 200 }).withMessage('book_title too long'),
  body('pages').optional().isInt({ min: 0 }).withMessage('pages must be a non-negative integer'),
  body('estimated_total').optional().isNumeric().withMessage('estimated_total must be a number'),
  body('extra_copies').optional().isInt({ min: 0 }).withMessage('extra_copies must be a non-negative integer'),
  handleValidationErrors,
];
const validateBookId = [
  param('id').isInt({ min: 1 }).withMessage('invalid book id'),
  handleValidationErrors,
];

const validateBookSlug = [
  param('slug').trim().notEmpty().withMessage('slug is required'),
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
  validateQuote,
  validateBookId,
  validateBookSlug,
};
