# Reverse Mortgage Calculator - WordPress Integration Guide

## Overview
This guide details the steps to integrate the Reverse Mortgage Calculator React component into a WordPress website with MongoDB database.

## Prerequisites
1. WordPress site with REST API enabled
2. Node.js and npm installed on the server
3. MongoDB database setup
4. WordPress REST API authentication configured

## Required NPM Packages
```bash
npm install @radix-ui/react-separator @radix-ui/react-tooltip react-hook-form @hookform/resolvers/zod zod @tanstack/react-query lucide-react tailwindcss class-variance-authority clsx tailwind-merge mongodb mongoose
```

## Integration Steps

### 1. WordPress Plugin Setup
1. Create a new plugin directory in `wp-content/plugins/rm-calculator`
2. Create the main plugin file `rm-calculator.php`:
```php
<?php
/*
Plugin Name: Reverse Mortgage Calculator
Description: React-based Reverse Mortgage Calculator
Version: 1.0
*/

function enqueue_rm_calculator_scripts() {
    wp_enqueue_script('rm-calculator', plugin_dir_url(__FILE__) . 'build/static/js/main.js', array(), '1.0', true);
    wp_enqueue_style('rm-calculator-styles', plugin_dir_url(__FILE__) . 'build/static/css/main.css');
}
add_action('wp_enqueue_scripts', 'enqueue_rm_calculator_scripts');

function rm_calculator_shortcode() {
    return '<div id="rm-calculator-root"></div>';
}
add_shortcode('rm_calculator', 'rm_calculator_shortcode');
```

### 2. React Component Setup
1. Copy the following component code into your React project:

```jsx
// MortgageCalculator.tsx
[Copy the entire content of mortgage-calculator.tsx provided]
```

2. MongoDB Schema Setup:
```javascript
// models/CalculatorUsage.js
const mongoose = require('mongoose');

const calculatorUsageSchema = new mongoose.Schema({
    userId: String,
    propertyValue: Number,
    appreciationRate: Number,
    requiredMonthlyAmount: Number,
    payoutAdjustmentType: String,
    annualIncreaseRate: Number,
    blockPeriod: Number,
    calculationResult: Object,
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('CalculatorUsage', calculatorUsageSchema);
```

### 3. API Integration
1. Create an API endpoint in WordPress:
```php
// Add to rm-calculator.php
add_action('rest_api_init', function () {
    register_rest_route('rm-calculator/v1', '/calculator-usage', array(
        'methods' => 'POST',
        'callback' => 'handle_calculator_usage',
        'permission_callback' => '__return_true'
    ));
});

function handle_calculator_usage($request) {
    $params = $request->get_params();
    // Connect to MongoDB and save data
    // Return response
    return new WP_REST_Response($params, 200);
}
```

### 4. Database Connection
1. Install MongoDB PHP driver
2. Add MongoDB connection to WordPress:
```php
// Add to wp-config.php
define('MONGODB_URI', 'your_mongodb_connection_string');
```

### 5. Component Integration
1. Add the shortcode to any WordPress page/post:
```
[rm_calculator]
```

2. Update API endpoints in the React component:
```javascript
// Update in MortgageCalculator.tsx
const API_BASE_URL = '/wp-json/rm-calculator/v1';
```

### 6. Styling Integration
1. Include Tailwind CSS configuration:
```javascript
// tailwind.config.js
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

2. Add required CSS to WordPress:
```php
function add_tailwind_css() {
    wp_enqueue_style('tailwind-css', 'https://cdn.tailwindcss.com');
}
add_action('wp_enqueue_scripts', 'add_tailwind_css');
```

## Build and Deployment
1. Build the React application:
```bash
npm run build
```

2. Copy the build files to the WordPress plugin directory:
```bash
cp -r build/* wp-content/plugins/rm-calculator/build/
```

3. Activate the plugin in WordPress admin panel

## Configuration Requirements
1. MongoDB connection string
2. WordPress REST API enabled
3. CORS configuration if needed
4. PHP MongoDB extension installed

## Testing
1. Verify the calculator appears on pages with the shortcode
2. Test calculation functionality
3. Verify data is being saved to MongoDB
4. Check mobile responsiveness

## Troubleshooting
- Check browser console for JavaScript errors
- Verify MongoDB connection string
- Ensure all required npm packages are installed
- Check WordPress error logs
- Verify REST API endpoints are accessible

## Security Considerations
1. Implement proper input validation
2. Secure MongoDB connection
3. Add WordPress nonce verification
4. Implement rate limiting
5. Sanitize all user inputs

For technical support or questions, please contact [Your Support Contact].
