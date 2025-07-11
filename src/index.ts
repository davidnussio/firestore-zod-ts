import { NodeFileSystem, NodeRuntime } from "@effect/platform-node/index";
import { PlatformConfigProvider } from "@effect/platform/index";
import { Effect, Layer, Stream } from "effect/index";
import { FirebaseLive, FirestoreRepository } from "./firebase";
import { UserDocSchema } from "./models";

const program = Effect.gen(function* () {
  const repo = yield* FirestoreRepository;

  yield* repo.add("users", UserDocSchema, {
    id: "test-user-123",
    updateTime: new Date(),
    readTime: new Date(),
    account: {
      address: {
        city: "Test City",
        countryRegion: "Test Country",
        postalCode: "12345",
        stateProvince: "Test State",
        street: "123 Test St",
        street2: null,
        phone: null,
      },
      firstName: "Test",
      lastName: "User",
      language: "en",
      phone: null,
    },
    user: {
      uid: "test-user-123",
      email: "user@example.com",
      displayName: "Test User",
      disabled: false,
      emailVerified: true,
      photoUrl: null,
      registred: true,
      acceptedTerms: true,
      acceptedMailing: null,
      accessLevel: 8,
    },
    teams: [],
    teamsId: [],
    createTime: new Date(),
  });

  // return;
  const startQuery = repo
    .getCollection("users")
    .where("user.accessLevel", ">=", 8)
    .orderBy("user.accessLevel", "desc");

  const data = yield* Stream.runCollect(
    repo
      .queryStream(startQuery, UserDocSchema, { limit: 4, maxCount: 50 })
      .pipe(Stream.take(30))
  );

  yield* Effect.log("Data loaded from Firestore:", data.length, "documents");

  for (const user of data) {
    yield* Effect.log("User email:", user.user.email);
  }
});

const MainLive = FirebaseLive.pipe(
  Layer.provide(PlatformConfigProvider.layerDotEnv(".env")),
  Layer.provide(NodeFileSystem.layer)
);

const runnable = program.pipe(Effect.provide(MainLive));

NodeRuntime.runMain(runnable);
