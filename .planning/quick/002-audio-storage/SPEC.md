# SPEC: Object-Oriented Audio Storage

## Objective
Implement a production-ready, scalable storage architecture for IELTS Speaking audio records. The system must use the Repository Pattern (Interface-driven design) to allow seamless switching between local S3-compatible storage (MinIO) and cloud storage (GCP/Firebase) via environment variables.

## Enforced Skills
- `@nodejs-backend-patterns` (Repository/Strategy Pattern, Dependency Injection)

## Requirements

### 1. Architectural Design (Repository Pattern)
- Create an `IStorageProvider` interface defining the contract: `uploadAudio(buffer, filename)` and `getPresignedUrl(filename)`.
- Implement `MinioStorageProvider` class that adheres to this interface.
- Implement a `StorageService` factory that instantiates the active provider based on `process.env.STORAGE_PROVIDER` (e.g., `'minio'` or `'gcp'`).

### 2. Infrastructure (MinIO integration)
- Add a `minio` service to the `docker-compose.yml` to provide a local S3-compatible bucket.
- Configure access keys and default bucket creation on startup.

### 3. Application Flow
- Update `SpeakingSessionController.ts`:
  - During the session, continue to collect and transcribe audio chunks.
  - Upon `speaking:end`, stitch the raw audio buffers together into a single webm file.
  - Call `StorageService.uploadAudio()` to save the stitched master record to the active storage provider.
  - Return the generated file path/URL to the client or save it to the existing `recordingPath` column in the `Attempts` PostgreSQL table.

## Scope (v1)
- Storage Interface definition.
- MinIO Docker integration.
- `MinioStorageProvider` implementation.
- Integration into the `speaking:end` socket event.
- *(GCP implementation is out of scope for v1, but the architecture must support adding it later without modifying the controller).*
