function buildOpenApiSpec() {
  return {
    openapi: '3.0.3',
    info: {
      title: 'API REST Node.js',
      version: '1.0.0',
      description: 'Documentacao dos endpoints de autenticacao e eventos.'
    },
    servers: [
      {
        url: 'http://localhost:3000'
      }
    ],
    tags: [
      { name: 'Health' },
      { name: 'Auth' },
      { name: 'Events' }
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'accessToken'
        }
      },
      schemas: {
        ErrorResponse: {
          type: 'object',
          properties: {
            message: { type: 'string' }
          }
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            age: { type: 'integer' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        Event: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            userId: { type: 'string' },
            title: { type: 'string' },
            description: { type: 'string' },
            address: { type: 'string' },
            date: { type: 'string', format: 'date-time' },
            imagePath: {
              type: 'string',
              nullable: true,
              description: 'Object key of the image in MinIO (when provided at creation)'
            },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        Registration: {
          type: 'object',
          properties: {
            userId: { type: 'string' },
            eventId: { type: 'string' },
            status: {
              type: 'integer',
              enum: [1, 2],
              description: '1=Active, 2=Disabled'
            },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        }
      }
    },
    paths: {
      '/': {
        get: {
          tags: ['Health'],
          summary: 'Health check',
          responses: {
            200: {
              description: 'API status',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      mensagem: { type: 'string' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/auth/signup': {
        post: {
          tags: ['Auth'],
          summary: 'Create user account',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name', 'age', 'email', 'password', 'birthdate'],
                  properties: {
                    name: { type: 'string' },
                    age: { type: 'integer' },
                    email: { type: 'string', format: 'email' },
                    password: { type: 'string' },
                    birthdate: { type: 'string', format: 'date' }
                  }
                }
              }
            }
          },
          responses: {
            201: {
              description: 'User created',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      user: { $ref: '#/components/schemas/User' }
                    }
                  }
                }
              }
            },
            400: { description: 'Validation error' }
          }
        }
      },
      '/auth/login': {
        post: {
          tags: ['Auth'],
          summary: 'Authenticate user',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password'],
                  properties: {
                    email: { type: 'string', format: 'email' },
                    password: { type: 'string' }
                  }
                }
              }
            }
          },
          responses: {
            200: { description: 'Authenticated, cookies set' },
            401: { description: 'Invalid credentials' },
            404: { description: 'User not found' }
          }
        }
      },
      '/auth/refresh': {
        post: {
          tags: ['Auth'],
          summary: 'Refresh access and refresh tokens',
          responses: {
            200: { description: 'Token rotated, cookies updated' },
            401: { description: 'Missing or invalid refresh token' }
          }
        }
      },
      '/auth/logout': {
        post: {
          tags: ['Auth'],
          summary: 'Logout user and clear cookies',
          responses: {
            200: { description: 'Logged out' }
          }
        }
      },
      '/events': {
        get: {
          tags: ['Events'],
          summary: 'List events for authenticated user',
          security: [{ cookieAuth: [] }],
          responses: {
            200: {
              description: 'Event list',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      events: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/Event' }
                      }
                    }
                  }
                }
              }
            },
            401: { description: 'Unauthorized' }
          }
        },
        post: {
          tags: ['Events'],
          summary: 'Create event',
          description:
            'Send JSON as usual, or multipart/form-data with the same fields plus an optional image file (field name: image).',
          security: [{ cookieAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['title', 'description', 'address', 'date'],
                  properties: {
                    title: { type: 'string' },
                    description: { type: 'string' },
                    address: { type: 'string' },
                    date: { type: 'string', format: 'date-time' }
                  }
                }
              },
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  required: ['title', 'description', 'address', 'date'],
                  properties: {
                    title: { type: 'string' },
                    description: { type: 'string' },
                    address: { type: 'string' },
                    date: { type: 'string', format: 'date-time' },
                    image: {
                      type: 'string',
                      format: 'binary',
                      description: 'Optional image (jpeg, png, gif, or webp, max 5MB)'
                    }
                  }
                }
              }
            }
          },
          responses: {
            201: {
              description: 'Event created',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      event: { $ref: '#/components/schemas/Event' }
                    }
                  }
                }
              }
            },
            400: { description: 'Validation error' },
            401: { description: 'Unauthorized' },
            503: { description: 'Object storage not configured (when an image is uploaded)' }
          }
        }
      },
      '/events/{id}': {
        get: {
          tags: ['Events'],
          summary: 'Get event by id',
          security: [{ cookieAuth: [] }],
          parameters: [
            {
              in: 'path',
              name: 'id',
              required: true,
              schema: { type: 'string' }
            }
          ],
          responses: {
            200: {
              description: 'Event found',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      event: { $ref: '#/components/schemas/Event' }
                    }
                  }
                }
              }
            },
            401: { description: 'Unauthorized' },
            404: { description: 'Event not found' }
          }
        },
        put: {
          tags: ['Events'],
          summary: 'Update event by id',
          security: [{ cookieAuth: [] }],
          parameters: [
            {
              in: 'path',
              name: 'id',
              required: true,
              schema: { type: 'string' }
            }
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['title', 'description', 'address', 'date'],
                  properties: {
                    title: { type: 'string' },
                    description: { type: 'string' },
                    address: { type: 'string' },
                    date: { type: 'string', format: 'date-time' }
                  }
                }
              }
            }
          },
          responses: {
            200: { description: 'Event updated' },
            401: { description: 'Unauthorized' },
            404: { description: 'Event not found' }
          }
        },
        delete: {
          tags: ['Events'],
          summary: 'Delete event by id',
          security: [{ cookieAuth: [] }],
          parameters: [
            {
              in: 'path',
              name: 'id',
              required: true,
              schema: { type: 'string' }
            }
          ],
          responses: {
            200: { description: 'Event deleted' },
            401: { description: 'Unauthorized' },
            404: { description: 'Event not found' }
          }
        }
      },
      '/events/{id}/register': {
        post: {
          tags: ['Events'],
          summary: 'Register authenticated user in event',
          security: [{ cookieAuth: [] }],
          parameters: [
            {
              in: 'path',
              name: 'id',
              required: true,
              schema: { type: 'string' }
            }
          ],
          responses: {
            200: {
              description: 'Registration active',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      registration: { $ref: '#/components/schemas/Registration' }
                    }
                  }
                }
              }
            },
            401: { description: 'Unauthorized' },
            404: { description: 'Event not found' }
          }
        }
      },
      '/events/{id}/unregister': {
        post: {
          tags: ['Events'],
          summary: 'Disable user registration in event',
          security: [{ cookieAuth: [] }],
          parameters: [
            {
              in: 'path',
              name: 'id',
              required: true,
              schema: { type: 'string' }
            }
          ],
          responses: {
            200: {
              description: 'Registration disabled',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      registration: { $ref: '#/components/schemas/Registration' }
                    }
                  }
                }
              }
            },
            401: { description: 'Unauthorized' },
            404: { description: 'Event or registration not found' }
          }
        }
      }
    }
  };
}

module.exports = {
  buildOpenApiSpec
};
