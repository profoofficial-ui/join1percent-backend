import type { Express } from 'express';
import swaggerUi from 'swagger-ui-express';

const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Coursellm API',
    version: '1.3.0',
    description:
      'Coursellm API: JWT auth, courses, bundles, and demo checkout (student signup + paid orders). Later phases add commissions and real payments.',
  },
  servers: [
    {
      url: 'http://localhost:5000',
      description: 'Local development',
    },
  ],
  tags: [
    { name: 'Health', description: 'Service health checks' },
    { name: 'Auth', description: 'Login and current user' },
    { name: 'Courses', description: 'Public course catalogue' },
    { name: 'Admin Courses', description: 'Admin course CRUD (Bearer JWT, admin role)' },
    { name: 'Bundles', description: 'Public sellable plans' },
    { name: 'Admin Bundles', description: 'Admin bundle CRUD (Bearer JWT, admin role)' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', example: '66f0a1b2c3d4e5f678901234' },
          name: { type: 'string', example: 'Coursellm Admin' },
          email: { type: 'string', format: 'email', example: 'admin@coursellm.com' },
          role: { type: 'string', enum: ['admin', 'student'] },
          phone: { type: 'string', example: '' },
          affiliateCode: { type: 'string', example: 'ADMIN' },
          sponsorCode: { type: 'string', nullable: true, example: null },
          planSlug: { type: 'string', nullable: true, example: null },
          walletBalance: { type: 'number', example: 0 },
        },
      },
      CourseLesson: {
        type: 'object',
        properties: {
          id: { type: 'string', example: '1' },
          title: { type: 'string', example: 'Introduction' },
          duration: { type: 'string', example: '12 min' },
          videoUrl: { type: 'string', example: '' },
        },
      },
      Course: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'instagram-mastery', description: 'Stable slug used as public id' },
          title: { type: 'string', example: 'Instagram Mastery' },
          description: { type: 'string' },
          image: { type: 'string' },
          instructor: { type: 'string', example: 'Neha Kapoor' },
          level: { type: 'string', enum: ['Beginner', 'Intermediate', 'Advanced'] },
          duration: { type: 'string', example: '4h 20m' },
          language: { type: 'string', example: 'Hindi + English' },
          category: { type: 'string', example: 'Marketing' },
          videoUrl: { type: 'string' },
          lessons: {
            type: 'array',
            items: { $ref: '#/components/schemas/CourseLesson' },
          },
        },
      },
      CourseInput: {
        type: 'object',
        required: ['title', 'description'],
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          image: { type: 'string' },
          instructor: { type: 'string' },
          level: { type: 'string', enum: ['Beginner', 'Intermediate', 'Advanced'] },
          duration: { type: 'string' },
          language: { type: 'string' },
          category: { type: 'string' },
          videoUrl: { type: 'string' },
          lessons: {
            type: 'array',
            items: { $ref: '#/components/schemas/CourseLesson' },
          },
        },
      },
      Bundle: {
        type: 'object',
        properties: {
          slug: { type: 'string', example: 'gold' },
          name: { type: 'string', example: 'Gold' },
          price: { type: 'number', example: 600 },
          image: { type: 'string' },
          courseIds: {
            type: 'array',
            items: { type: 'string' },
            example: ['instagram-mastery', 'youtube-mastery'],
          },
          tagline: { type: 'string' },
          badge: { type: 'string', example: 'Popular' },
        },
      },
      BundleInput: {
        type: 'object',
        required: ['name', 'price', 'courseIds'],
        properties: {
          slug: { type: 'string', example: 'gold', description: 'Optional; derived from name if omitted' },
          name: { type: 'string' },
          price: { type: 'number' },
          image: { type: 'string' },
          courseIds: { type: 'array', items: { type: 'string' } },
          tagline: { type: 'string' },
          badge: { type: 'string' },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'admin@coursellm.com' },
          password: { type: 'string', format: 'password', example: 'admin' },
        },
      },
      LoginResponse: {
        type: 'object',
        properties: {
          token: { type: 'string' },
          user: { $ref: '#/components/schemas/User' },
        },
      },
      MeResponse: {
        type: 'object',
        properties: {
          user: { $ref: '#/components/schemas/User' },
        },
      },
      ErrorMessage: {
        type: 'object',
        properties: {
          message: { type: 'string', example: 'Invalid email or password.' },
        },
      },
    },
  },
  paths: {
    '/api/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check',
        responses: {
          '200': {
            description: 'API is healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    ok: { type: 'boolean', example: true },
                    service: { type: 'string', example: 'coursellm-api' },
                    phase: { type: 'integer', example: 4 },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login with email and password',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Authenticated',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/LoginResponse' },
              },
            },
          },
          '400': {
            description: 'Missing fields',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorMessage' },
              },
            },
          },
          '401': {
            description: 'Invalid credentials',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorMessage' },
              },
            },
          },
        },
      },
    },
    '/api/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Get the current authenticated user',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Current user',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/MeResponse' },
              },
            },
          },
          '401': {
            description: 'Missing or invalid token',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorMessage' },
              },
            },
          },
        },
      },
    },
    '/api/courses': {
      get: {
        tags: ['Courses'],
        summary: 'List all courses',
        responses: {
          '200': {
            description: 'Course catalogue',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    courses: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Course' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/courses/{id}': {
      get: {
        tags: ['Courses'],
        summary: 'Get one course by slug or Mongo id',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            example: 'instagram-mastery',
          },
        ],
        responses: {
          '200': {
            description: 'Course found',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    course: { $ref: '#/components/schemas/Course' },
                  },
                },
              },
            },
          },
          '404': {
            description: 'Not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorMessage' },
              },
            },
          },
        },
      },
    },
    '/api/admin/courses': {
      get: {
        tags: ['Admin Courses'],
        summary: 'List courses (admin)',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Course catalogue',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    courses: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Course' },
                    },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorMessage' },
              },
            },
          },
          '403': {
            description: 'Admin only',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorMessage' },
              },
            },
          },
        },
      },
      post: {
        tags: ['Admin Courses'],
        summary: 'Create a course',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CourseInput' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Created',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    course: { $ref: '#/components/schemas/Course' },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Validation error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorMessage' },
              },
            },
          },
        },
      },
    },
    '/api/admin/courses/{id}': {
      get: {
        tags: ['Admin Courses'],
        summary: 'Get one course (admin)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'Course found',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    course: { $ref: '#/components/schemas/Course' },
                  },
                },
              },
            },
          },
          '404': {
            description: 'Not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorMessage' },
              },
            },
          },
        },
      },
      patch: {
        tags: ['Admin Courses'],
        summary: 'Update a course',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CourseInput' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Updated',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    course: { $ref: '#/components/schemas/Course' },
                  },
                },
              },
            },
          },
          '404': {
            description: 'Not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorMessage' },
              },
            },
          },
        },
      },
      delete: {
        tags: ['Admin Courses'],
        summary: 'Delete a course',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'Deleted',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    ok: { type: 'boolean' },
                    id: { type: 'string' },
                  },
                },
              },
            },
          },
          '404': {
            description: 'Not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorMessage' },
              },
            },
          },
        },
      },
    },
    '/api/bundles': {
      get: {
        tags: ['Bundles'],
        summary: 'List all bundles',
        responses: {
          '200': {
            description: 'Sellable plans',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    bundles: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Bundle' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/bundles/{id}': {
      get: {
        tags: ['Bundles'],
        summary: 'Get one bundle by slug or Mongo id',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            example: 'gold',
          },
        ],
        responses: {
          '200': {
            description: 'Bundle found',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    bundle: { $ref: '#/components/schemas/Bundle' },
                  },
                },
              },
            },
          },
          '404': {
            description: 'Not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorMessage' },
              },
            },
          },
        },
      },
    },
    '/api/admin/bundles': {
      get: {
        tags: ['Admin Bundles'],
        summary: 'List bundles (admin)',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Sellable plans',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    bundles: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Bundle' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Admin Bundles'],
        summary: 'Create a bundle',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/BundleInput' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Created',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    bundle: { $ref: '#/components/schemas/Bundle' },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Validation error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorMessage' },
              },
            },
          },
        },
      },
    },
    '/api/admin/bundles/{id}': {
      patch: {
        tags: ['Admin Bundles'],
        summary: 'Update a bundle',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/BundleInput' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Updated',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    bundle: { $ref: '#/components/schemas/Bundle' },
                  },
                },
              },
            },
          },
        },
      },
      delete: {
        tags: ['Admin Bundles'],
        summary: 'Delete a bundle',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'Deleted',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    ok: { type: 'boolean' },
                    slug: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
} as const;

export function setupSwagger(app: Express) {
  app.get('/api/docs.json', (_req, res) => {
    res.json(openApiSpec);
  });

  app.use(
    '/api/docs',
    swaggerUi.serve,
    swaggerUi.setup(openApiSpec, {
      customSiteTitle: 'Coursellm API Docs',
      swaggerOptions: {
        persistAuthorization: true,
      },
    })
  );
}
