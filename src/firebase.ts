import {
  Config,
  Data,
  Effect,
  Layer,
  pipe,
  Redacted,
  Schema,
  Stream,
} from "effect/index";
import type { ParseError } from "effect/ParseResult";
import { DateFromSelf } from "effect/Schema";
import { credential } from "firebase-admin";
import { getApps, initializeApp } from "firebase-admin/app";
import {
  type DocumentData,
  type DocumentReference,
  getFirestore,
  Timestamp,
} from "firebase-admin/firestore";
import {
  type DocumentNotFoundError,
  getAsyncGeneratorFromQuery,
  mapWithSchema,
} from "./firestore";

const FirestoreTimestamp = Schema.instanceOf(Timestamp);

export const FirestoreDate = Schema.transform(
  FirestoreTimestamp,
  DateFromSelf,
  {
    strict: true,
    encode: (date) => Timestamp.fromDate(date),
    decode: (timestamp) => timestamp.toDate(),
  }
);

class NotValidaFirebaseDocumentError extends Data.TaggedError(
  "NotValidaFirebaseDocumentError"
)<{
  message: string;
}> {}

const collectionAddData =
  (collection: FirebaseFirestore.CollectionReference) =>
  (
    validData: FirebaseFirestore.DocumentData
  ): Effect.Effect<
    DocumentReference<DocumentData, DocumentData>,
    NotValidaFirebaseDocumentError
  > =>
    Effect.tryPromise({
      try: () => collection.add(validData),
      catch: (error) =>
        new NotValidaFirebaseDocumentError({
          message: `Error adding data to collection: ${error}`,
        }),
    });

const getDataFromDocRef =
  () =>
  (
    docRef: FirebaseFirestore.DocumentReference
  ): Effect.Effect<
    FirebaseFirestore.DocumentSnapshot<DocumentData, DocumentData>
  > =>
    Effect.tryPromise(() => docRef.get()).pipe(Effect.orDie);

const addData = <
  A extends FirebaseFirestore.DocumentData,
  I extends FirebaseFirestore.WithFieldValue<FirebaseFirestore.DocumentData>
>(
  collection: FirebaseFirestore.CollectionReference,
  schema: Schema.Schema<A, I, never>,
  data: unknown
): Effect.Effect<
  A,
  DocumentNotFoundError | NotValidaFirebaseDocumentError | ParseError,
  never
> => {
  return pipe(
    data,
    Schema.encodeUnknown(schema),
    Effect.flatMap(collectionAddData(collection)),
    Effect.flatMap(getDataFromDocRef()),
    Effect.flatMap(mapWithSchema(schema))
  );
};

export function getDataEffect<A, I = A>(
  startQuery: FirebaseFirestore.Query,
  schema: Schema.Schema<A, I, never>,
  options?: { limit?: number; maxCount?: number }
) {
  const asyncIterable = getAsyncGeneratorFromQuery(startQuery, options);

  return Stream.fromAsyncIterable(
    asyncIterable,
    (error) => new Error(`Stream error: ${error}}`)
  ).pipe(Stream.flatMap(mapWithSchema(schema)));
}

export class Firebase extends Effect.Service<Firebase>()("Firebase", {
  effect: Effect.gen(function* () {
    const projectId = yield* Config.string("PROJECT_ID");
    const clientEmail = yield* Config.string("FIREBASE_CLIENT_EMAIL");
    const privateKey = yield* Config.redacted("FIREBASE_PRIVATE_KEY");

    yield* Effect.log("Initializing Firebase app...", projectId);
    yield* Effect.log("Firebase apps:", getApps().length);

    initializeApp({
      projectId,
      credential: credential.cert({
        projectId,
        clientEmail: clientEmail,
        privateKey: Redacted.value(privateKey).replace(/\\n/g, "\n"),
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
        add: <
          A extends FirebaseFirestore.DocumentData,
          I extends FirebaseFirestore.WithFieldValue<FirebaseFirestore.DocumentData>
        >(
          collectionName: string,
          schema: Schema.Schema<A, I, never>,
          data: A
        ) => addData(firestore.collection(collectionName), schema, data),
      };
    }),
  }
) {}

export const FirebaseLive = Layer.provide(
  FirestoreRepository.Default,
  Firebase.Default
);
