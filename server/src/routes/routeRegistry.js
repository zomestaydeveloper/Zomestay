/**
 * Route Registry
 * 
 * Centralized route registration organized by role
 * Makes it easy to see which routes belong to which role
 */

const express = require('express');

/**
 * Route Registry Configuration
 * Organized by role for easy management and visibility
 */
const routeRegistry = {
  // ==================== COMMON ROUTES (Public - No Auth) ====================
  common: {
    name: 'Common Routes',
    description: 'Public routes accessible without authentication',
    routes: [
      {
        path: '/api/search',
        router: require('./userRoutes/propertySearch.routes'),
        description: 'Property search - Cities, Property Types'
      },
      {
        path: '/api',
        router: require('./userRoutes/rooms.routes'),
        description: 'Available rooms'
      },
      {
        path: '/api/site-config',
        router: require('./siteConfig.routes'),
        description: 'Site configuration (Public GET, Admin POST/PATCH)'
      },
      {
        path: '/api/callback-requests',
        router: require('./userRoutes/requestCallback.routes'),
        description: 'Callback requests (Public POST, Admin GET/PATCH/DELETE)'
      },
      {
        path: '/api',
        router: require('./cancellationRequestRoutes/cancellationRequest.routes'),
        description: 'Cancellation requests (Public GET reasons, User/Agent/Host POST, Admin GET/PATCH)'
      },
      {
        path: '/api',
        router: require('./reviewRoutes/review.routes'),
        description: 'Reviews (Public GET by property, User POST/PUT/DELETE)'
      }
    ]
  },

  // ==================== USER ROUTES (User Auth Required) ====================
  user: {
    name: 'User Routes',
    description: 'Routes requiring User authentication',
    routes: [
      {
        path: '/api',
        router: require('./userRoutes/auth.routes'),
        description: 'User authentication - OTP, Login, Logout'
      },
      {
        path: '/api',
        router: require('./userRoutes/userDetails.routes'),
        description: 'User profile management'
      }
    ]
  },

  // ==================== AGENT ROUTES (Agent Auth Required) ==================
  agent: {
    name: 'Agent Routes',
    description: 'Routes requiring Agent authentication',
    routes: [
      {
        path: '/api',
        router: require('./agentRoutes/auth.routes'),
        description: 'Agent authentication - Register, Login, Profile, Logout'
      },
      {
        path: '/api/properties-for-agent',
        router: require('./agentRoutes/propertyForAgent.routes'),
        description: 'Agent property access'
      },
      {
        path: '/api/agent-discounts',
        router: require('./agentRoutes/agentPropertyDiscount.routes'),
        description: 'Agent discount management'
      }
    ]
  },

  // ============ USER-AGENT COMMON ROUTES (User OR Agent Auth) ==============
  userAgentCommon: {
    name: 'User-Agent Common Routes',
    description: 'Routes accessible by User OR Agent',
    routes: [
      {
        path: '/',
        router: require('./userRoutes/propertyDetials.routes'),
        description: 'Property details, pricing, booking data'
      },
      {
        path: '/api',
        router: require('./userRoutes/payment.routes'),
        description: 'Payment operations - Create order, verify payment'
      },
      {
        path: '/',
        router: require('./bookin_cancellationRoute/bookingCancellation.routes'),
        description: 'Booking cancellation'
      }
    ]
  },

  // ==================== HOST ROUTES (Host Auth Required) ====================
  host: {
    name: 'Host Routes',
    description: 'Routes requiring Host authentication',
    routes: [
      {
        path: '/',
        router: require('./adminRoutes/host.routes'),
        description: 'Host authentication and property management'
      },
      {
        path: '/',
        router: require('./HostRoutes/roomtype_mealplan.routes'),
        description: 'Rate plans management'
      },
      {
        path: '/host/daily-rates',
        router: require('./HostRoutes/dailyRate.routes'),
        description: 'Daily rate plans'
      }
    ]
  },

  // ==================== ADMIN ROUTES (Admin Auth Required) ==================
  admin: {
    name: 'Admin Routes',
    description: 'Routes requiring Admin authentication',
    routes: [
      {
        path: '/',
        router: require('./adminRoutes/auth.routes'),
        description: 'Admin authentication - Signup, Login, Logout'
      },
      {
        path: '/api/travel-agents',
        router: require('./agentRoutes/travelAgent.routes'),
        description: 'Agent management - Approve, suspend, delete'
      },
      {
        path: '/',
        router: require('./allBookings/getallbookings.Routes'),
        description: 'View all bookings'
      },
      {
        path: '/',
        router: require('./adminRoutes/cancellationPolicy.routes'),
        description: 'Cancellation policy management'
      }
    ]
  },

  // =========== HOST-ADMIN COMMON ROUTES (Host OR Admin Auth) ================
  hostAdminCommon: {
    name: 'Host-Admin Common Routes',
    description: 'Routes accessible by Host OR Admin (with scope differences)',
    routes: [
      {
        path: '/',
        router: require('./adminRoutes/property.routes'),
        description: 'Property configuration - Amenities, Facilities, Safety, Property Types, Room Types'
      },
      {
        path: '/',
        router: require('./adminRoutes/avalibility.routes'),
        description: 'Property availability (Host: own, Admin: all)',
        special: true // Needs to be registered with logging middleware
      },
      {
        path: '/',
        router: require('./adminRoutes/specialRate.routes'),
        description: 'Special rates (Host: own, Admin: all)'
      },
      {
        path: '/',
        router: require('./adminRoutes/specialRateApplication.routes'),
        description: 'Special rate applications (Host: own, Admin: all)'
      },
      {
        path: '/',
        router: require('./adminRoutes/mealPlan.routes'),
        description: 'Meal plans (Host: view/create, Admin: full access)'
      },
      {
        path: '/',
        router: require('./adminRoutes/propertyRoomTypes.routes'),
        description: 'Property room types (Host: own, Admin: all)'
      },
      {
        path: '/',
        router: require('./adminRoutes/propertycreation.routes'),
        description: 'Property creation (Host: own, Admin: any)'
      },
      {
        path: '/',
        router: require('./adminRoutes/rateCalendar.routes'),
        description: 'Rate calendar (Host: own, Admin: all)'
      },
      {
        path: '/',
        router: require('./adminRoutes/frontdesk.routes'),
        description: 'Front desk operations (Host: own, Admin: all)'
      },
      {
        path: '/',
        router: require('./adminRoutes/guests.routes'),
        description: 'Guest management (Host: own properties, Admin: all)'
      },
      {
        path: '/',
        router: require('./adminRoutes/payments.routes'),
        description: 'Payment management (Host: own properties, Admin: all)'
      }
    ]
  },

  // ==================== WEBHOOKS (Special Handling) =========================
  webhooks: {
    name: 'Webhooks',
    description: 'Webhook routes with special handling',
    routes: [
      {
        path: '/webhooks',
        router: require('./webhooks/razorpay.routes'),
        description: 'Razorpay payment webhooks (signature verification)',
        priority: 'high' // Must be registered before JSON parser
      }
    ]
  }
};

/**
 * Register all routes from registry
 * @param {Express} app - Express app instance
 * @param {Function} loggingMiddleware - Optional logging middleware
 * @returns {Object} - Object with registerWebhooks and registerAll methods
 */
function registerRoutes(app, loggingMiddleware = null) {
  return {
    /**
     * Register webhooks FIRST (before JSON parser)
     * Must be called before express.json() middleware
     */
    registerWebhooks: () => {
      if (routeRegistry.webhooks) {
        routeRegistry.webhooks.routes.forEach(route => {
          if (route.priority === 'high') {
            app.use(route.path, route.router);
            console.log(`  ✅ [WEBHOOKS] ${route.path} - ${route.description}`);
          }
        });
      }
    },

    /**
     * Register all other routes (after JSON parser)
     */
    registerAll: () => {
      console.log('\n📋 Registering Routes by Role:\n');

      // Register all routes except webhooks
      Object.keys(routeRegistry).forEach(role => {
        if (role === 'webhooks') return; // Already registered

        const roleConfig = routeRegistry[role];
        console.log(`\n  📁 ${roleConfig.name.toUpperCase()}`);
        console.log(`     ${roleConfig.description}`);

        roleConfig.routes.forEach(route => {
          // Handle special routes that need middleware
          if (route.special && loggingMiddleware) {
            app.use(route.path, loggingMiddleware, route.router);
            console.log(`     ✅ ${route.path} - ${route.description} (with logging)`);
          } else {
            app.use(route.path, route.router);
            console.log(`     ✅ ${route.path} - ${route.description}`);
          }
        });
      });

      console.log('\n✅ All routes registered successfully\n');
    }
  };
}

/**
 * Get route registry for documentation/debugging
 */
function getRouteRegistry() {
  return routeRegistry;
}

module.exports = {
  registerRoutes,
  getRouteRegistry,
  routeRegistry
};

