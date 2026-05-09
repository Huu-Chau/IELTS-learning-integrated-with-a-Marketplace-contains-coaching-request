# 1. Architecture Requirements

The project must strictly follow a **3-layer architecture**:
## Layer 1: Routes
Responsibilities:
- Handle HTTP requests and responses
- Use middleware for input validation before entering controller logic
- Call controller layer

## Layer 2: Controllers
Responsibilities:
- Parse request params/query/body
- Call service layer
- Return standardized JSON responses

## Layer 3: Services
Responsibilities:
- Handle business logic
- Contain no direct HTTP-specific logic
- Handle database persistence
- Execute queries against PostgreSQL via Sequelize

## Required flow
`route -> middleware -> controller -> service -> database`

---

# 2. Dependency Injection Requirements

You must implement **dependency injection** explicitly.

## Controller DI rule
The **constructor of each controller** must inject an **interface of the service layer**, not a concrete implementation.

Example principle:
- `TeacherAvailabilityController` depends on `ITeacherAvailabilityService`

---

# 3. Code Style & Conventions

## Data Transfer Objects (DTOs)
- Use **classes** for request payloads (DTOs) located in `src/types/<domain>/`.
- Define explicit **constructors** for these classes.
- Always instantiate DTOs in the **Controller** before passing them to the Service.
- Example: `const payload = new RegisterPayload(username, password, name, role);`

## Type Organization
- Group domain-specific types, enums, and interfaces in `src/types/<domain>/`.
- Use an `index.ts` file in each type folder to export all related symbols.

## Enums
- Use **Enums** for fixed sets of values (e.g., `Role`, `Status`).
- Reference these enums instead of using raw strings in models, services, and controllers.

## Controller Implementation
- **Interface Requirement**: Each controller MUST have an interface (e.g., `IAuthController`) defined in the same file, and the class MUST implement it.
- Controller methods must be **async**.
- Always call `return next();` at the end of a successful controller method.
- Catch errors and either handle them or pass them to `next(error)`.

## Service Implementation
- **Interface Requirement**: Each service MUST have an interface (e.g., `IAuthService`) defined in the same file or in a dedicated directory, and the class MUST implement it.
- Services handle all database interactions via Sequelize models.
