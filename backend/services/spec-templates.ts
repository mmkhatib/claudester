import { Priority } from '@/backend/models';

export interface SpecTemplate {
  id: string;
  name: string;
  description: string;
  category: 'web' | 'api' | 'mobile' | 'data' | 'devops' | 'general';
  priority: Priority;
  requirements: any;
  design?: any;
}

/**
 * Predefined spec templates for common project types
 */
export const specTemplates: SpecTemplate[] = [
  {
    id: 'rest-api',
    name: 'REST API Service',
    description: 'Template for building a RESTful API service',
    category: 'api',
    priority: Priority.P1,
    requirements: {
      overview: 'Build a RESTful API service with authentication and CRUD operations',
      functionalRequirements: [
        'User authentication and authorization',
        'CRUD operations for main entities',
        'Input validation and error handling',
        'API documentation (OpenAPI/Swagger)',
        'Rate limiting',
      ],
      nonFunctionalRequirements: [
        'Response time < 200ms for 95% of requests',
        'Support 1000 concurrent users',
        'JSON response format',
        'HTTPS only',
      ],
      technicalStack: {
        backend: 'Node.js + Express/Fastify',
        database: 'PostgreSQL/MongoDB',
        authentication: 'JWT',
        documentation: 'Swagger/OpenAPI 3.0',
      },
    },
    design: {
      architecture: 'Layered architecture (Controller -> Service -> Repository)',
      endpoints: [
        {
          method: 'POST',
          path: '/api/auth/login',
          description: 'User authentication',
        },
        {
          method: 'GET',
          path: '/api/resources',
          description: 'List all resources',
        },
        {
          method: 'POST',
          path: '/api/resources',
          description: 'Create new resource',
        },
        {
          method: 'GET',
          path: '/api/resources/:id',
          description: 'Get resource by ID',
        },
        {
          method: 'PUT',
          path: '/api/resources/:id',
          description: 'Update resource',
        },
        {
          method: 'DELETE',
          path: '/api/resources/:id',
          description: 'Delete resource',
        },
      ],
      dataModels: [],
      errorHandling: 'Centralized error middleware with standard HTTP status codes',
    },
  },
  {
    id: 'react-webapp',
    name: 'React Web Application',
    description: 'Template for a React-based web application',
    category: 'web',
    priority: Priority.P1,
    requirements: {
      overview: 'Build a modern web application using React',
      functionalRequirements: [
        'Responsive user interface',
        'User authentication',
        'Dashboard with data visualization',
        'Form handling and validation',
        'Real-time updates',
      ],
      nonFunctionalRequirements: [
        'Mobile responsive',
        'Accessible (WCAG 2.1 Level AA)',
        'SEO optimized',
        'Fast initial load (< 3s)',
      ],
      technicalStack: {
        frontend: 'React 18 + TypeScript',
        stateManagement: 'Zustand/Redux Toolkit',
        styling: 'Tailwind CSS',
        routing: 'React Router',
        buildTool: 'Vite',
      },
    },
    design: {
      architecture: 'Component-based architecture',
      pages: [
        { path: '/', component: 'HomePage' },
        { path: '/login', component: 'LoginPage' },
        { path: '/dashboard', component: 'DashboardPage' },
        { path: '/profile', component: 'ProfilePage' },
      ],
      components: [
        'Header',
        'Sidebar',
        'Footer',
        'DataTable',
        'Chart',
        'Form',
        'Modal',
      ],
      stateManagement: 'Global state with Zustand stores',
    },
  },
  {
    id: 'microservice',
    name: 'Microservice',
    description: 'Template for a single microservice',
    category: 'api',
    priority: Priority.P1,
    requirements: {
      overview: 'Build an independent microservice',
      functionalRequirements: [
        'Single responsibility domain service',
        'Service discovery integration',
        'Health check endpoints',
        'Metrics and monitoring',
        'Message queue integration',
      ],
      nonFunctionalRequirements: [
        'Horizontally scalable',
        '99.9% uptime',
        'Graceful shutdown',
        'Circuit breaker pattern',
      ],
      technicalStack: {
        framework: 'Node.js + NestJS/Fastify',
        database: 'PostgreSQL/MongoDB',
        messageQueue: 'RabbitMQ/Kafka',
        monitoring: 'Prometheus + Grafana',
      },
    },
  },
  {
    id: 'data-pipeline',
    name: 'Data Processing Pipeline',
    description: 'Template for ETL/data processing pipeline',
    category: 'data',
    priority: Priority.P1,
    requirements: {
      overview: 'Build a data processing pipeline for ETL operations',
      functionalRequirements: [
        'Extract data from multiple sources',
        'Transform and validate data',
        'Load data to target destination',
        'Error handling and retry logic',
        'Monitoring and alerts',
      ],
      nonFunctionalRequirements: [
        'Process 1M records/hour',
        'Data quality validation',
        'Exactly-once processing',
        'Fault tolerant',
      ],
      technicalStack: {
        language: 'Python',
        orchestration: 'Apache Airflow',
        storage: 'S3/Cloud Storage',
        database: 'PostgreSQL/BigQuery',
      },
    },
  },
  {
    id: 'auth-service',
    name: 'Authentication Service',
    description: 'Dedicated authentication and authorization service',
    category: 'api',
    priority: Priority.P0,
    requirements: {
      overview: 'Build a secure authentication service',
      functionalRequirements: [
        'User registration and login',
        'Password reset flow',
        'Multi-factor authentication',
        'OAuth2 provider integration',
        'Role-based access control (RBAC)',
        'Session management',
      ],
      nonFunctionalRequirements: [
        'PCI DSS compliant password storage',
        'Rate limiting on auth endpoints',
        'Audit logging',
        'High availability',
      ],
      technicalStack: {
        framework: 'Node.js + Express',
        authentication: 'JWT + Refresh Tokens',
        passwordHashing: 'bcrypt',
        database: 'PostgreSQL',
      },
    },
  },
  {
    id: 'mobile-app',
    name: 'Mobile Application',
    description: 'Template for React Native mobile app',
    category: 'mobile',
    priority: Priority.P1,
    requirements: {
      overview: 'Build a cross-platform mobile application',
      functionalRequirements: [
        'User authentication',
        'Offline-first data sync',
        'Push notifications',
        'Device camera/gallery integration',
        'In-app purchases (optional)',
      ],
      nonFunctionalRequirements: [
        'iOS and Android support',
        'Smooth 60 FPS animations',
        'App size < 50MB',
        'Battery efficient',
      ],
      technicalStack: {
        framework: 'React Native + TypeScript',
        navigation: 'React Navigation',
        stateManagement: 'Zustand/Redux',
        backend: 'REST API + Firebase',
      },
    },
  },
  {
    id: 'dashboard',
    name: 'Analytics Dashboard',
    description: 'Template for data visualization dashboard',
    category: 'web',
    priority: Priority.P1,
    requirements: {
      overview: 'Build an analytics dashboard with real-time data visualization',
      functionalRequirements: [
        'Real-time data updates',
        'Interactive charts and graphs',
        'Custom date range filtering',
        'Export to PDF/CSV',
        'User customizable widgets',
      ],
      nonFunctionalRequirements: [
        'Handle 100k data points',
        'Real-time updates (< 1s latency)',
        'Mobile responsive',
      ],
      technicalStack: {
        frontend: 'React + TypeScript',
        charts: 'Chart.js/D3.js',
        realtime: 'WebSocket/Server-Sent Events',
        styling: 'Tailwind CSS',
      },
    },
  },
];

/**
 * Get all templates
 */
export function getAllTemplates(): SpecTemplate[] {
  return specTemplates;
}

/**
 * Get template by ID
 */
export function getTemplateById(id: string): SpecTemplate | undefined {
  return specTemplates.find((t) => t.id === id);
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: string): SpecTemplate[] {
  return specTemplates.filter((t) => t.category === category);
}

/**
 * Get all categories
 */
export function getCategories(): string[] {
  return Array.from(new Set(specTemplates.map((t) => t.category)));
}
