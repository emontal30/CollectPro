# CollectPro

## Overview

CollectPro is a comprehensive collection and subscription management system designed to streamline financial operations for institutions and individuals. The application provides tools for collection tracking, subscription management, payment processing, and administrative oversight. Built as a progressive web application (PWA), it features a modern Arabic interface with dark mode support and responsive design across all devices.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Technology Stack**: Vanilla JavaScript, HTML5, CSS3 with modern ES6+ features
- **UI Framework**: Custom CSS with Cairo font family for Arabic text
- **Component Structure**: Modular design with separate files for different features (sidebar, authentication, payments, etc.)
- **Progressive Web App**: Service worker implementation for offline functionality and caching
- **Responsive Design**: Mobile-first approach with CSS Grid and Flexbox layouts
- **Dark Mode**: CSS custom properties system for theme switching

### Backend Architecture
- **Server Framework**: Express.js with middleware for security, compression, and CORS
- **API Structure**: RESTful API endpoints organized in `/api` directory
- **Authentication**: Supabase Auth with JWT token-based authentication
- **Session Management**: Client-side session storage with automatic token refresh
- **Email Service**: Nodemailer integration for transactional emails

### Data Storage Solutions
- **Primary Database**: Supabase (PostgreSQL) with real-time subscriptions
- **Client Storage**: LocalStorage and SessionStorage for user preferences and temporary data
- **Caching Strategy**: In-memory caching with performance monitoring
- **Data Models**: 
  - Users table for authentication and profiles
  - Subscriptions table for subscription management
  - Payments table for transaction records
  - Harvests table for collection data
  - Archive table for historical records
  - Messages and notifications tables for communication

### Authentication and Authorization
- **Primary Auth**: Supabase Authentication with email/password
- **OAuth Integration**: Google OAuth for social login
- **Admin Access**: Role-based access control with specific admin email restriction
- **Session Security**: CSRF protection and secure token handling
- **Password Management**: Strength validation and reset functionality

### Build and Deployment
- **Build Tool**: Webpack with optimization for production
- **Asset Optimization**: CSS/JS minification, image compression, and lazy loading
- **Code Splitting**: Dynamic imports for performance optimization
- **Development Server**: Express.js local server with hot reloading
- **Production Deployment**: Vercel with serverless functions

## External Dependencies

### Database and Backend Services
- **Supabase**: PostgreSQL database with real-time features and authentication
  - URL: `https://altnvsolaqphpndyztup.supabase.co`
  - Provides user management, data storage, and real-time subscriptions

### Authentication Services
- **Google OAuth**: Social login integration
  - Client ID configured for web application authentication
  - Scopes: email and profile access

### Email Services
- **Nodemailer**: SMTP email delivery for notifications and transactional emails
- **Email Templates**: Welcome emails, password resets, and subscription notifications

### CDN and Assets
- **Font Awesome**: Icon library for UI components
- **Google Fonts**: Cairo font family for Arabic typography
- **CDN Configuration**: Optimized asset delivery with caching strategies

### Development Tools
- **Webpack**: Module bundling and optimization
- **Babel**: JavaScript transpilation for browser compatibility
- **ESLint**: Code quality and style enforcement
- **Prettier**: Code formatting and consistency

### Security Libraries
- **Helmet**: HTTP header security for Express.js
- **CORS**: Cross-origin resource sharing configuration
- **Compression**: Gzip compression for improved performance

### Monitoring and Analytics
- **Performance Monitor**: Custom performance tracking system
- **Error Logger**: Automatic error reporting and logging
- **Cache Manager**: Intelligent caching with TTL management