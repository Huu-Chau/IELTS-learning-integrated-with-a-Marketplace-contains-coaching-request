<?xml version="1.0" encoding="UTF-8"?>
<plan>
  <task type="auto">
    <name>Configure MinIO Infrastructure</name>
    <files>server/docker-compose.yml, server/.env</files>
    <action>
      1. Add a `minio` service to `docker-compose.yml` using the `minio/minio` image.
      2. Expose ports 9000 (API) and 9001 (Console).
      3. Set default credentials (e.g., MINIO_ROOT_USER=admin, MINIO_ROOT_PASSWORD=password).
      4. Add an init container or command to automatically create an `ielts-audio` bucket on startup.
      5. Add MINIO config variables to `.env`.
    </action>
    <verify>Running `docker-compose up` starts MinIO, and the console is accessible at localhost:9001.</verify>
    <done>MinIO is running locally and the default bucket exists.</done>
  </task>

  <task type="auto">
    <name>Implement Storage Interface and Provider</name>
    <files>server/src/services/storage/IStorageProvider.ts, server/src/services/storage/MinioStorageProvider.ts, server/src/services/storage/StorageService.ts</files>
    <action>
      1. Create `IStorageProvider.ts` with standard methods: `uploadFile(buffer, filename, mimeType)` and `getFileUrl(filename)`.
      2. Install the `minio` npm package: `npm install minio` in the server directory.
      3. Create `MinioStorageProvider.ts` that implements `IStorageProvider` using the `minio` SDK.
      4. Create `StorageService.ts` as a factory/singleton that reads `process.env.STORAGE_PROVIDER` to export the instantiated provider.
    </action>
    <verify>The TypeScript compiler successfully type-checks the provider implementations against the interface.</verify>
    <done>The Repository Pattern is established and the MinIO provider is ready for dependency injection.</done>
  </task>

  <task type="auto">
    <name>Integrate Storage into Speaking Controller</name>
    <files>server/src/controllers/speakingSessionController.ts</files>
    <action>
      1. Update the `SpeakingSession` interface to keep an array of all received audio buffers during the test.
      2. In the `speaking:audio` event, push the incoming buffer to the session array.
      3. In the `speaking:end` event, concatenate all buffers into a single `master_record.webm`.
      4. Call `StorageService.uploadFile()` to push the concatenated buffer to the storage provider.
      5. (Optional/Future: Save the returned URL to the `Attempts.recordingPath` database column using the Prisma/Sequelize model).
    </action>
    <verify>Completing a speaking test successfully uploads a playable `.webm` file to the local MinIO bucket.</verify>
    <done>Master records are securely saved to interchangeable object storage at the end of every session.</done>
  </task>
</plan>
