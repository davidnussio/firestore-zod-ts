import {
  type Chunk,
  Config,
  Effect,
  Layer,
  Option,
  Schema,
  Stream,
} from "effect/index";
import { DateFromSelf } from "effect/Schema";
import { credential } from "firebase-admin";
import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { getAsyncGeneratorFromQuery } from "./firestore";

const FirestoreTimestamp = Schema.instanceOf(Timestamp);

export const FirestoreDate = Schema.transform(
  DateFromSelf,
  FirestoreTimestamp,
  {
    strict: true,
    decode: (date) => Timestamp.fromDate(date),
    encode: (timestamp) => timestamp.toDate(),
  }
);

export const FirebaseSchema = Schema.Struct({
  id: Schema.String,
  createTime: FirestoreDate,
  updateTime: FirestoreDate,
  readTime: FirestoreDate,
});

function addData<A extends FirebaseFirestore.DocumentData, I>(
  collection: FirebaseFirestore.CollectionReference,
  schema: Schema.Schema<A, I, never>,
  data: unknown
) {
  const result = Schema.decodeUnknownOption(schema, { errors: "all" })(data);

  return Option.match(result, {
    onNone: () =>
      Effect.fail(
        new Error(`Validation failed for data: ${JSON.stringify(data)}`)
      ),
    onSome: (validData) => Effect.tryPromise(() => collection.add(validData)),
  });
}

/**
 * Creates an Effect Stream from a Firestore query using the async generator.
 * This function wraps the getAsyncGeneratorFromQuery async generator in an Effect Stream,
 * providing better composability with the Effect ecosystem.
 *
 * @param startQuery - The initial Firestore query
 * @param schema - The Effect Schema to validate each document
 * @param options - Configuration options for pagination (limit, maxCount)
 * @returns A Stream that emits validated documents of type A
 */
export function getDataEffect<A, I = A, R = never>(
  startQuery: FirebaseFirestore.Query,
  schema: Schema.Schema<A, I, R>,
  options?: { limit?: number; maxCount?: number }
): Stream.Stream<A, Error, never> {
  const asyncIterable = getAsyncGeneratorFromQuery(startQuery, schema, options);

  return Stream.fromAsyncIterable(
    asyncIterable,
    (error) => new Error(`Stream error: ${String(error)}`)
  );
}

/**
 * Collects all data from a Firestore query using Effect Stream.
 * This is a convenience function that runs the stream and collects all results.
 *
 * @param startQuery - The initial Firestore query
 * @param schema - The Effect Schema to validate each document
 * @param options - Configuration options for pagination (limit, maxCount)
 * @returns An Effect that resolves to an array of validated documents
 */
export function collectDataEffect<A, I = A, R = never>(
  startQuery: FirebaseFirestore.Query,
  schema: Schema.Schema<A, I, R>,
  options?: { limit?: number; maxCount?: number }
): Stream.Stream<Chunk.Chunk<A>, Error, never> {
  return getDataEffect(startQuery, schema, options).pipe(
    Stream.runCollect,
    Stream.fromEffect
  );
}

export class Firebase extends Effect.Service<Firebase>()("Firebase", {
  effect: Effect.gen(function* () {
    const projectId = yield* Config.string("PROJECT_ID");
    const clientEmail = yield* Config.string("FIREBASE_CLIENT_EMAIL");
    const privateKey = yield* Config.string("FIREBASE_PRIVATE_KEY");

    yield* Effect.log("Initializing Firebase app...", projectId);
    yield* Effect.log("Firebase apps:", getApps().length);

    initializeApp({
      projectId,
      credential: credential.cert({
        projectId,
        clientEmail: clientEmail,
        privateKey: privateKey.replace(/\\n/g, "\n"),
      }),
    });

    return {
      firestore: getFirestore(),
    };
  }),
}) {}

export class FirestoreRepository extends Effect.Service<FirestoreRepository>()(
  "FirestoreRepository",
  {
    effect: Effect.gen(function* () {
      const { firestore } = yield* Firebase;

      yield* Effect.log("Firestore initialized");

      return {
        getCollection: (name: string) => firestore.collection(name),
        queryStream: getDataEffect,
        add: <A extends FirebaseFirestore.DocumentData, I>(
          collectionName: string,
          schema: Schema.Schema<A, I, never>,
          data: I
        ) => addData(firestore.collection(collectionName), schema, data),
      };
    }),
  }
) {}

export const FirebaseLive = Layer.provide(
  FirestoreRepository.Default,
  Firebase.Default
);
