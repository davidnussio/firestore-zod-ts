import { NodeFileSystem, NodeRuntime } from "@effect/platform-node/index";
import { PlatformConfigProvider } from "@effect/platform/index";
import { Effect, Layer, Stream } from "effect/index";
import { FirebaseLive, FirestoreRepository } from "./firebase";
import { UserSchema } from "./models/user";

const program = Effect.gen(function* () {
  const repo = yield* FirestoreRepository;

  // const createdUser = yield* repo.add("users", UserSchema, {
  //   account: {
  //     address: {
  //       city: "Test City",
  //       countryRegion: "Test Country",
  //       postalCode: "12345",
  //       stateProvince: "Test State",
  //       street: "123 Test St",
  //       street2: null,
  //       phone: null,
  //     },
  //     firstName: "Test",
  //     lastName: "User",
  //     language: "en",
  //     phone: null,
  //   },
  //   user: {
  //     uid: "test-user-123",
  //     email: "user@example.com",
  //     displayName: "Test User",
  //     disabled: false,
  //     emailVerified: true,
  //     photoUrl: null,
  //     registred: true,
  //     acceptedTerms: true,
  //     acceptedMailing: null,
  //     accessLevel: 8,
  //   },
  //   teams: [],
  //   teamsId: [],
  //   createdAt: new Date(),
  // });

  // yield* Effect.log("Created user:", createdUser.id);

  // return;
  const startQuery = repo
    .getCollection("users")
    .where("user.accessLevel", ">=", 8)
    .orderBy("user.accessLevel", "desc");

  // const data = yield* Stream.runCollect(
  //   repo.queryStream(startQuery, UserSchema, { limit: 4, maxCount: 50 }).pipe(
  //     Stream.tap((n) => Effect.log(`*** processing: ${n.user.email}`)),
  //     Stream.take(60)
  //   )
  // );

  // yield* Effect.log("Data loaded from Firestore:", data.length, "documents");

  const userStream = repo
    .queryStream(startQuery, UserSchema, { limit: 4, maxCount: 50 })
    .pipe(
      Stream.buffer({ capacity: 4 }),
      Stream.tap((n) => Effect.log(`*** processing: ${n.id}`)),
      Stream.take(60)
    );

  const pullData = yield* Stream.toPull(userStream);

  yield* Effect.log("Pulling data from Firestore...");
  while (true) {
    const user = yield* pullData;
    yield* Effect.log(`Processing user: ${user.length}`);
    for (const u of user) {
      yield* Effect.log(`User email: ${u.id}`);
    }
  }
}).pipe(Effect.scoped);

const MainLive = FirebaseLive.pipe(
  Layer.provide(PlatformConfigProvider.layerDotEnv(".env")),
  Layer.provide(NodeFileSystem.layer)
);

const runnable = program.pipe(Effect.provide(MainLive));

NodeRuntime.runMain(runnable);
