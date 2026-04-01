# Middleware Flow

Execution order for every HTTP request to the API.

```
                         Incoming Request
                               │
                               ▼
                ┌──────────────────────────────┐
                │           cors()             │  Allow cross-origin requests
                └──────────────┬───────────────┘
                               │
                               ▼
                ┌──────────────────────────────┐
                │       express.json()         │  Parse JSON body
                └──────────────┬───────────────┘
                               │
                               ▼
                ┌──────────────────────────────┐
                │    express.urlencoded()      │  Parse URL-encoded body
                └──────────────┬───────────────┘
                               │
                               ▼
                ┌──────────────────────────────┐  production  → default (strict)
                │          helmet()            │  development → relaxed CSP
                └──────────────┬───────────────┘              (for Apollo Sandbox)
                               │
                               ▼
                ┌──────────────────────────────┐
                │   app.use('/', router)       │  GET /        healthcheck
                │                              │  GET /docs    Swagger UI
                └──────────────┬───────────────┘
                               │
                               ▼
                ┌──────────────────────────────┐
                │   app.use('/graphql', ...)   │  Apollo Server
                │   buildApolloContext()       │  reads Authorization header
                │                             │  → context.user | null
                └──────────────┬───────────────┘
                               │
                               ▼
                ┌──────────────────────────────┐
                │     RegisterRoutes(app)      │  TSOA generated REST routes
                │                              │
                │  @Security('jwt') routes     │
                │  → expressAuthentication()   │  validates JWT
                │    → throws if invalid       │  sets request.user on success
                └──────────────┬───────────────┘
                               │
                               ▼
                ┌──────────────────────────────┐
                │    Controller / Resolver     │  business logic via service
                └──────────────┬───────────────┘
                               │
                    ┌──────────┴──────────┐
                    │ success             │ error (throw)
                    ▼                     ▼
             Response sent        ┌───────────────────┐
                                  │   errorHandler()  │  postRoutesMiddleware
                                  │                   │
                                  │  ApiError    →    │  known error (4xx/5xx)
                                  │  ValidateError →  │  422 TSOA validation
                                  │  unknown     →    │  500 internal server error
                                  └───────────────────┘
                                          │
                                          ▼
                               Response sent (error shape)
```

---

## Error response shape

```json
{
  "httpCode": 401,
  "errorCode": 401000,
  "message": "Unauthorized"
}
```

## Notes

- `preRoutesMiddleware` registers: cors, express.json, express.urlencoded, helmet
- `postRoutesMiddleware` registers: errorHandler
- Apollo (`/graphql`) is mounted **before** TSOA routes to prevent route conflicts
- The 404 handler fires for any path not matched by router, Apollo, or TSOA
